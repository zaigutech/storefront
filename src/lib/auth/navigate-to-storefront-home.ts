"use client";

import { resolveBrowseLocaleSlugWithFallback } from "@/lib/browse-locale";
import { buildStorefrontPath } from "@/lib/storefront-path";

/**
 * Hard navigation to storefront home.
 * Use after checkout (or any `/checkout` surface) so the header picks up HttpOnly session cookies —
 * soft `router.push` can restore a cached anonymous `UserMenuServer` shell.
 */
export function navigateToStorefrontHome(channel: string, locale?: string) {
	if (!channel) {
		window.location.assign("/");
		return;
	}

	const resolvedLocale = resolveBrowseLocaleSlugWithFallback(locale);
	window.location.assign(buildStorefrontPath(resolvedLocale, channel));
}
