import "server-only";

import * as oidc from "openid-client";
import { invariant } from "ts-invariant";

/**
 * The Keycloak realm customers sign in to. Sign-in, sign-up, password reset and email
 * verification all happen on Keycloak's pages; the storefront only runs the Authorization
 * Code flow (PKCE, confidential client) on the server and keeps the tokens in HttpOnly
 * cookies. Saleor's OpenID Connect plugin and EOS both accept the access token as is.
 */
let configuration: Promise<oidc.Configuration> | undefined;

export function getKeycloakConfiguration(): Promise<oidc.Configuration> {
	configuration ??= discover().catch((error: unknown) => {
		// Retry discovery on the next call instead of caching a failure.
		configuration = undefined;
		throw error;
	});
	return configuration;
}

async function discover(): Promise<oidc.Configuration> {
	const issuer = process.env.KEYCLOAK_ISSUER;
	const clientId = process.env.KEYCLOAK_CLIENT_ID;
	const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;
	invariant(issuer, "Missing KEYCLOAK_ISSUER env variable");
	invariant(clientId, "Missing KEYCLOAK_CLIENT_ID env variable");
	invariant(clientSecret, "Missing KEYCLOAK_CLIENT_SECRET env variable");

	const issuerUrl = new URL(issuer);
	return oidc.discovery(
		issuerUrl,
		clientId,
		undefined,
		oidc.ClientSecretPost(clientSecret),
		// Local Keycloak serves plain HTTP; openid-client refuses it unless told otherwise.
		issuerUrl.protocol === "http:" ? { execute: [oidc.allowInsecureRequests] } : undefined,
	);
}

/** Keycloak's pages exist in Simplified Chinese (`zh-Hans`) and English only. */
export function keycloakUiLocale(localeSlug: string | undefined): string {
	return localeSlug === "zh" ? "zh-Hans" : "en";
}

/** The storefront's public origin; Keycloak redirects back to it, so it is registered there. */
export function storefrontUrl(path: string): URL {
	const origin = process.env.NEXT_PUBLIC_STOREFRONT_URL;
	invariant(origin, "Missing NEXT_PUBLIC_STOREFRONT_URL env variable");
	return new URL(path, origin);
}

/** Where Keycloak returns the authorization code (`/api/auth/callback`). */
export const KEYCLOAK_CALLBACK_PATH = "/api/auth/callback";

/**
 * Keycloak's account console, where customers change their name, email and password. Saleor
 * picks up name and email changes from the token on the next request.
 */
export function keycloakAccountConsoleUrl(): string {
	const issuer = process.env.KEYCLOAK_ISSUER;
	const clientId = process.env.KEYCLOAK_CLIENT_ID;
	invariant(issuer, "Missing KEYCLOAK_ISSUER env variable");
	invariant(clientId, "Missing KEYCLOAK_CLIENT_ID env variable");
	// `referrer` adds a "Back to" link; `referrer_uri` must be one of the client's redirect URIs.
	const params = new URLSearchParams({ referrer: clientId, referrer_uri: storefrontUrl("/").href });
	return `${issuer}/account?${params.toString()}`;
}
