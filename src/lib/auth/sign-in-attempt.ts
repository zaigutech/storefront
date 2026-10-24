import "server-only";

import type { cookies } from "next/headers";

import { KEYCLOAK_CALLBACK_PATH } from "./keycloak";

/** The PKCE verifier, state and destination of a sign-in in progress, read once by the callback. */
export type SignInAttempt = {
	state: string;
	codeVerifier: string;
	returnTo: string;
};

const SIGN_IN_ATTEMPT_COOKIE = "kc_sign_in";

/** Long enough to sign up on Keycloak's pages, short enough that an abandoned attempt expires. */
const SIGN_IN_ATTEMPT_MAX_AGE = 15 * 60;

type CookieStore = Awaited<ReturnType<typeof cookies>>;

const attemptCookieOptions = {
	httpOnly: true,
	sameSite: "lax" as const,
	secure: process.env.NODE_ENV === "production",
	path: KEYCLOAK_CALLBACK_PATH,
};

export function saveSignInAttempt(store: CookieStore, attempt: SignInAttempt): void {
	store.set(SIGN_IN_ATTEMPT_COOKIE, JSON.stringify(attempt), {
		...attemptCookieOptions,
		maxAge: SIGN_IN_ATTEMPT_MAX_AGE,
	});
}

/** Returns the attempt and deletes it, so an authorization code is redeemed at most once. */
export function takeSignInAttempt(store: CookieStore): SignInAttempt | null {
	const raw = store.get(SIGN_IN_ATTEMPT_COOKIE)?.value;
	if (!raw) return null;
	store.set(SIGN_IN_ATTEMPT_COOKIE, "", { ...attemptCookieOptions, maxAge: 0 });
	try {
		const attempt = JSON.parse(raw) as Partial<SignInAttempt>;
		if (
			typeof attempt.state === "string" &&
			typeof attempt.codeVerifier === "string" &&
			typeof attempt.returnTo === "string"
		) {
			return { state: attempt.state, codeVerifier: attempt.codeVerifier, returnTo: attempt.returnTo };
		}
	} catch {
		// Tampered or truncated cookie.
	}
	return null;
}
