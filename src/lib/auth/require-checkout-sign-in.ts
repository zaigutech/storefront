import "server-only";

import { redirect } from "next/navigation";

import { hasAuthSession } from "./has-auth-session";
import { signInHref } from "./return-path";

/**
 * There is no guest checkout: every order must belong to a signed-in customer (EOS refuses a
 * paid order without `user`, so a guest's payment would never reach Odoo). Saleor itself cannot
 * turn guest checkout off, so the storefront closes it on the route and on the server actions.
 */

/** Sends a shopper without a session to Keycloak sign-in, which brings them back to `returnTo`. */
export async function requireCheckoutSignIn(returnTo: string): Promise<void> {
	if (!(await hasAuthSession())) {
		redirect(signInHref(returnTo));
	}
}
