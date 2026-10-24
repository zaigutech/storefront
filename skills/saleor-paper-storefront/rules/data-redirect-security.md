---
name: data-redirect-security
description: Redirect security for sign-in and sign-out: returnTo, safeReturnPath, storefrontUrl, Keycloak redirect_uri and post_logout_redirect_uri, Host/Origin/X-Forwarded spoofing, NEXT_PUBLIC_STOREFRONT_URL. Use when touching where the customer lands after Keycloak or any URL built from request data.
---

# Redirect Security

Where a customer lands after signing in or out is attacker-influenced input (`?returnTo=`). An open redirect there turns the storefront's trusted origin and Keycloak's login page into a phishing hop.

## Rule

- `returnTo` is a **path**, never a URL: pass it through `safeReturnPath()` (`src/lib/auth/return-path.ts`), which keeps only same-origin paths and falls back to `/`. Do not duplicate its checks elsewhere.
- Absolute URLs the storefront hands to Keycloak (`redirect_uri`, `post_logout_redirect_uri`, the account console's `referrer_uri`) and the callback's own redirects are built with `storefrontUrl()` from `NEXT_PUBLIC_STOREFRONT_URL`, never from the request.
- Keycloak checks `redirect_uri` and `post_logout_redirect_uri` against the client's registered redirect URIs; keep those to the storefront origin. That is the second guard, not the only one.

## Never Trust These For Redirect Origins

- `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto`, `Origin`, `Referer`
- `request.nextUrl.origin` (behind a proxy it is the internal URL, and it breaks the `redirect_uri` match)
- `headers().get(...)` or any helper derived from request headers

## Required Tests

When changing `safeReturnPath()`, keep tests proving it accepts same-origin paths (with query) and rejects absolute URLs, protocol-relative `//host` and `/\host`, non-http schemes and empty input.
