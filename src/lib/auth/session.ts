import "server-only";

import { io } from "next/cache";
import { cookies } from "next/headers";
import * as oidc from "openid-client";
import { cache } from "react";

import { getKeycloakConfiguration } from "./keycloak";

const ACCESS_TOKEN_COOKIE = "kc_access_token";
const REFRESH_TOKEN_COOKIE = "kc_refresh_token";
const ID_TOKEN_COOKIE = "kc_id_token";

/** Refresh this long before the access token expires, so it never expires in flight. */
const EXPIRY_SKEW_SECONDS = 30;

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function cookieOptions(maxAge: number | undefined) {
	return {
		httpOnly: true,
		sameSite: "lax" as const,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		// Keycloak sends `refresh_expires_in: 0` when the refresh token has no fixed lifetime.
		...(maxAge ? { maxAge } : {}),
	};
}

/** Stores the tokens of a code exchange or refresh. Throws in a read-only context (RSC render). */
export function persistSession(store: CookieStore, tokens: oidc.TokenEndpointResponse): void {
	const refreshMaxAge = typeof tokens.refresh_expires_in === "number" ? tokens.refresh_expires_in : undefined;
	store.set(ACCESS_TOKEN_COOKIE, tokens.access_token, cookieOptions(tokens.expires_in));
	if (tokens.refresh_token) {
		store.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, cookieOptions(refreshMaxAge));
	}
	if (tokens.id_token) {
		store.set(ID_TOKEN_COOKIE, tokens.id_token, cookieOptions(refreshMaxAge));
	}
}

/** Forgets the session here; Keycloak's own session ends only through its end-session endpoint. */
export function clearSession(store: CookieStore): void {
	store.delete(ACCESS_TOKEN_COOKIE);
	store.delete(REFRESH_TOKEN_COOKIE);
	store.delete(ID_TOKEN_COOKIE);
}

/** The ID token, sent as `id_token_hint` so Keycloak signs out without a confirmation page. */
export function getIdToken(store: CookieStore): string | undefined {
	return store.get(ID_TOKEN_COOKIE)?.value;
}

/** True when the JWT's `exp` is within {@link EXPIRY_SKEW_SECONDS} or unreadable. */
export function isExpiring(jwt: string, nowSeconds = Date.now() / 1000): boolean {
	const payload = jwt.split(".")[1];
	if (!payload) return true;
	try {
		const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
		return typeof exp !== "number" || exp - EXPIRY_SKEW_SECONDS <= nowSeconds;
	} catch {
		return true;
	}
}

/**
 * The signed-in customer's access token, refreshed when it is about to expire; `null` when
 * signed out. A refreshed token is written back when the context allows it (Server Action,
 * Route Handler); during an RSC render the write is skipped and the token serves this request.
 */
export const getSessionAccessToken = cache(async (): Promise<string | null> => {
	const store = await cookies();
	// The expiry check reads the clock; `Date.now()` in a prerender makes the route blocking.
	await io();
	const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
	if (accessToken && !isExpiring(accessToken)) {
		return accessToken;
	}

	const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
	if (!refreshToken) {
		return null;
	}

	try {
		const tokens = await oidc.refreshTokenGrant(await getKeycloakConfiguration(), refreshToken);
		writeIfAllowed(() => persistSession(store, tokens));
		return tokens.access_token;
	} catch (error) {
		if (error instanceof oidc.ResponseBodyError) {
			// Keycloak ended the session (idle or max lifetime, signed out elsewhere).
			writeIfAllowed(() => clearSession(store));
		} else {
			console.error("[auth] Keycloak token refresh failed", error);
		}
		return null;
	}
});

function writeIfAllowed(write: () => void): void {
	try {
		write();
	} catch {
		// Read-only context (RSC render).
	}
}
