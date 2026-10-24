"use client";

import { useCallback } from "react";

import { logout } from "@/app/actions";
import { resolveBrowseLocaleSlugWithFallback } from "@/lib/browse-locale";
import { bumpChromeVersion } from "@/lib/chrome-sync";
import { buildStorefrontPath } from "@/lib/storefront-path";

export type LogoutOptions = {
	locale?: string;
	channel?: string;
	/** Override post-logout destination (a path). Defaults to canonical browse home or `/`. */
	redirectTo?: string;
	/** Come back to the current URL (e.g. checkout in-flow sign-out). */
	stayOnPage?: boolean;
};

/** Ends the session here and at Keycloak, then lands on the destination with a fresh document. */
export function useLogout() {
	return useCallback(async (options?: LogoutOptions) => {
		const destination = options?.stayOnPage
			? `${window.location.pathname}${window.location.search}`
			: (options?.redirectTo ??
				(options?.channel
					? buildStorefrontPath(resolveBrowseLocaleSlugWithFallback(options.locale), options.channel)
					: "/"));

		let target = destination;
		try {
			target = await logout(destination);
		} catch {
			// Checkout detach / Keycloak discovery failed — the destination still reloads signed out
			// when the cookies were cleared.
		}

		// Other tabs re-render their auth chrome on next focus; this tab hard-navigates.
		bumpChromeVersion();
		window.location.assign(target);
	}, []);
}
