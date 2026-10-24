/**
 * Where to land after signing in or out: a path on this storefront, or `/` for anything
 * else, so `returnTo` can never send the customer to another origin.
 */
export function safeReturnPath(value: string | null | undefined): string {
	if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
		return "/";
	}
	return value;
}

/** Starts Keycloak sign-in, or its registration page with `signup`; both come back to `returnTo`. */
export function signInHref(returnTo: string, options?: { signup?: boolean }): string {
	const params = new URLSearchParams({ returnTo });
	if (options?.signup) {
		params.set("signup", "1");
	}
	return `/api/auth/login?${params.toString()}`;
}
