"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import * as oidc from "openid-client";
import { getKeycloakConfiguration, storefrontUrl } from "@/lib/auth/keycloak";
import { safeReturnPath } from "@/lib/auth/return-path";
import { clearSession, getIdToken } from "@/lib/auth/session";
import { mutate } from "@/lib/saleor";
import {
	CheckoutAddLineDocument,
	CheckoutDeleteLinesDocument,
	CheckoutLinesUpdateDocument,
} from "@/gql/graphql";
import { emitCommerceEvent } from "@/lib/analytics/emit.server";
import * as Checkout from "@/lib/checkout";

// Private state (session/cart cookies) lives in dynamic holes that read cookies at
// request time — it is never in the shared cache, so there is nothing global to
// invalidate. `refresh()` re-renders the acting user's route in the action response;
// `revalidatePath` here would purge shared static shells for every visitor (a
// sitewide regeneration bill per cart click). Cross-tab sync is client-side via
// `bumpChromeVersion()` — see src/lib/chrome-sync.ts and the `paper-vercel-cost` rule.

/**
 * Ends the session here and returns Keycloak's end-session URL; the caller navigates there,
 * which ends the Keycloak session too (otherwise the next sign-in skips the password) and
 * comes back to `returnTo`.
 */
export async function logout(returnTo: string): Promise<string> {
	const cookieStore = await cookies();

	for (const cookie of cookieStore.getAll()) {
		if (!cookie.name.startsWith("checkoutId-") || !cookie.value) {
			continue;
		}
		await Checkout.detachCustomer(cookie.value);
	}

	const idToken = getIdToken(cookieStore);
	clearSession(cookieStore);

	const configuration = await getKeycloakConfiguration();
	return oidc.buildEndSessionUrl(configuration, {
		post_logout_redirect_uri: storefrontUrl(safeReturnPath(returnTo)).href,
		...(idToken ? { id_token_hint: idToken } : { client_id: configuration.clientMetadata().client_id }),
	}).href;
}

export async function saveCheckoutId(channel: string, checkoutId: string) {
	await Checkout.saveIdToCookie(channel, checkoutId);
}

/**
 * Clear the checkout cookie after a successful order.
 * Call after checkoutComplete succeeds — typically after navigating to order confirmation.
 * Never revalidates `/checkout` (that remounts the flow and resets the step mid-payment).
 */
export async function clearCheckout(channel: string) {
	"use server";
	await Checkout.clearCheckoutCookie(channel);
	refresh();
}

export async function deleteCartLine(checkoutId: string, lineId: string) {
	const result = await mutate(CheckoutDeleteLinesDocument, {
		variables: {
			checkoutId,
			lineIds: [lineId],
		},
	});

	if (result.ok) {
		const checkout = result.data.checkoutLinesDelete?.checkout;
		if (checkout && checkout.lines.length === 0) {
			await Checkout.clearCheckoutCookie(checkout.channel.slug);
		}
	}

	refresh();
}

export async function updateCartLineQuantity(checkoutId: string, lineId: string, quantity: number) {
	if (quantity < 1) {
		return deleteCartLine(checkoutId, lineId);
	}

	await mutate(CheckoutLinesUpdateDocument, {
		variables: {
			checkoutId,
			lines: [{ lineId, quantity }],
		},
	});

	refresh();
}

/** Add a variant to the channel cart. Private refresh only — never busts the shared cache. */
export async function addVariantToCart(input: {
	channel: string;
	localeSlug: string;
	variantId: string;
	value?: number;
	currency?: string;
}) {
	const checkout = await Checkout.findOrCreate({
		checkoutId: await Checkout.getIdFromCookies(input.channel),
		channel: input.channel,
		localeSlug: input.localeSlug,
	});

	if (!checkout) {
		console.error("Add to cart: Failed to create checkout");
		return;
	}

	await Checkout.saveIdToCookie(input.channel, checkout.id);

	const addResult = await mutate(CheckoutAddLineDocument, {
		variables: {
			id: checkout.id,
			productVariantId: decodeURIComponent(input.variantId),
		},
	});

	if (!addResult.ok) {
		console.error("Add to cart failed:", addResult.error.message);
		return;
	}

	if (addResult.data.checkoutLinesAdd?.errors?.length) {
		console.error("Add to cart failed:", addResult.data.checkoutLinesAdd.errors);
		return;
	}

	emitCommerceEvent({
		name: "product_added_to_cart",
		channel: input.channel,
		value: input.value ?? 0,
		currency: input.currency ?? "",
	});

	refresh();
}
