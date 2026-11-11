import "server-only";

import {
	CheckoutBillingAddressUpdateDocument,
	type CheckoutBillingAddressUpdateMutation,
	type CheckoutBillingAddressUpdateMutationVariables,
} from "@/checkout/graphql/generated/operations";
import type { CheckoutActionResult } from "@/checkout/lib/checkout-action-types";
import {
	NO_SHIPPING_BILLING_VALIDATION_RULES,
	buildNoShippingBillingAddress,
	resolveNoShippingBillingCountry,
} from "@/checkout/lib/no-shipping-billing";
import { fetchChannelCountriesOnServer } from "@/checkout/lib/server/fetch-channel-countries";
import { fetchCheckoutOnServer } from "@/checkout/lib/server/fetch-checkout";
import { getCheckoutServerTranslations } from "@/checkout/lib/server/get-checkout-server-translations";
import { toCheckoutActionResult } from "@/checkout/lib/server/mutation-result";
import { toTypedDocument } from "@/checkout/lib/server/to-typed-document";
import { checkoutGraphqlLanguageCode } from "@/lib/checkout-locale";
import { mutate } from "@/lib/saleor";

const checkoutBillingAddressUpdateDocument = toTypedDocument<
	CheckoutBillingAddressUpdateMutation,
	CheckoutBillingAddressUpdateMutationVariables
>(CheckoutBillingAddressUpdateDocument);

/**
 * Stores a country-only billing address on a checkout that ships nothing
 * (see `@/checkout/lib/no-shipping-billing`). The server re-reads the checkout,
 * so a client cannot skip address validation on a checkout that ships.
 */
export async function setNoShippingBillingAddressOnServer(checkoutId: string): Promise<CheckoutActionResult> {
	const { server: t } = await getCheckoutServerTranslations();

	const fetched = await fetchCheckoutOnServer(checkoutId);
	const checkout = fetched.ok ? fetched.checkout : null;
	if (!checkout) {
		return { ok: false, error: t("noSaleorResponse") };
	}
	if (checkout.isShippingRequired) {
		return { ok: false, error: t("billingCountryUnavailable") };
	}

	const { countries, defaultCountryCode } = await fetchChannelCountriesOnServer(checkout.channel.slug);
	const country = resolveNoShippingBillingCountry({
		channelDefaultCountryCode: defaultCountryCode,
		channelCountryCodes: countries,
	});
	if (!country) {
		console.error(
			`[setNoShippingBillingAddress] No country for channel "${checkout.channel.slug}": ` +
				"set SALEOR_APP_TOKEN (reads channel.defaultCountry) or assign a shipping zone to the channel.",
		);
		return { ok: false, error: t("billingCountryUnavailable") };
	}

	if (checkout.billingAddress?.country.code === country) {
		return { ok: true, checkout };
	}

	const result = await mutate(checkoutBillingAddressUpdateDocument, {
		variables: {
			checkoutId,
			billingAddress: buildNoShippingBillingAddress(country),
			saveAddress: false,
			validationRules: NO_SHIPPING_BILLING_VALIDATION_RULES,
			languageCode: await checkoutGraphqlLanguageCode(),
		},
	});

	if (!result.ok) {
		return { ok: false, error: result.error.message };
	}

	return toCheckoutActionResult(result.data.checkoutBillingAddressUpdate);
}
