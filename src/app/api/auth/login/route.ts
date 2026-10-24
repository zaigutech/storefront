import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import * as oidc from "openid-client";

import {
	getKeycloakConfiguration,
	KEYCLOAK_CALLBACK_PATH,
	keycloakUiLocale,
	storefrontUrl,
} from "@/lib/auth/keycloak";
import { safeReturnPath } from "@/lib/auth/return-path";
import { saveSignInAttempt } from "@/lib/auth/sign-in-attempt";
import { BROWSE_LOCALE_COOKIE } from "@/lib/browse-locale";

/**
 * Sends the customer to Keycloak's sign-in page (`?signup=1`: its registration page), in the
 * browse locale; `/api/auth/callback` finishes the flow and lands on `returnTo`.
 */
export async function GET(request: NextRequest) {
	const params = request.nextUrl.searchParams;
	const codeVerifier = oidc.randomPKCECodeVerifier();
	const state = oidc.randomState();

	const authorizationUrl = oidc.buildAuthorizationUrl(await getKeycloakConfiguration(), {
		redirect_uri: storefrontUrl(KEYCLOAK_CALLBACK_PATH).href,
		scope: "openid email profile",
		code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
		code_challenge_method: "S256",
		state,
		ui_locales: keycloakUiLocale(request.cookies.get(BROWSE_LOCALE_COOKIE)?.value),
		...(params.has("signup") ? { prompt: "create" } : {}),
	});

	saveSignInAttempt(await cookies(), {
		state,
		codeVerifier,
		returnTo: safeReturnPath(params.get("returnTo")),
	});
	return NextResponse.redirect(authorizationUrl);
}
