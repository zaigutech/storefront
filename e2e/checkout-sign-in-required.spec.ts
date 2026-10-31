import { expect, test } from "@playwright/test";

import { openCheckoutWithCart } from "./helpers/checkout-flow";

/** No guest checkout: an anonymous shopper never sees the checkout form, only Keycloak sign-in. */
test("anonymous shopper is sent to sign-in instead of checkout", async ({ page }) => {
	const signIn = page.waitForRequest((request) => {
		const url = new URL(request.url());
		return (
			url.pathname === "/api/auth/login" && (url.searchParams.get("returnTo") ?? "").startsWith("/checkout")
		);
	});

	await openCheckoutWithCart(page);

	await signIn;
	await expect(page.getByRole("textbox", { name: /adresse e-mail|email address/i })).toHaveCount(0);
});
