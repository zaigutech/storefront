import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import * as oidc from "openid-client";

import { ensureEosClient } from "@/lib/auth/eos";
import { getKeycloakConfiguration, KEYCLOAK_CALLBACK_PATH, storefrontUrl } from "@/lib/auth/keycloak";
import { persistSession } from "@/lib/auth/session";
import { takeSignInAttempt } from "@/lib/auth/sign-in-attempt";

/**
 * Keycloak's redirect after sign-in or sign-up: redeems the code, registers a first-time
 * customer with EOS, then stores the session. A failed sign-in lands on `returnTo` signed out.
 */
export async function GET(request: NextRequest) {
	const store = await cookies();
	const attempt = takeSignInAttempt(store);
	if (!attempt) {
		return NextResponse.redirect(storefrontUrl("/"));
	}

	try {
		// The public URL, not the request's: behind a proxy the request URL is the internal one,
		// and the redirect_uri must match the one sent to Keycloak.
		const callbackUrl = storefrontUrl(KEYCLOAK_CALLBACK_PATH);
		callbackUrl.search = request.nextUrl.search;
		const tokens = await oidc.authorizationCodeGrant(await getKeycloakConfiguration(), callbackUrl, {
			pkceCodeVerifier: attempt.codeVerifier,
			expectedState: attempt.state,
		});
		await ensureEosClient(tokens.access_token);
		persistSession(store, tokens);
	} catch (error) {
		console.error("[auth] Keycloak sign-in failed", error);
	}

	return NextResponse.redirect(storefrontUrl(attempt.returnTo));
}
