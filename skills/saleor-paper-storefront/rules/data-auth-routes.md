---
name: data-auth-routes
description: Keycloak BFF auth and PPR-safe account routes: /api/auth/login + callback, HttpOnly cookies, getSessionAccessToken, resolveSessionUser, header chrome refresh. Use when touching login/session, account pages, or fixing 'uncached data outside Suspense' on routes that read cookies.
---

# Authenticated Route Segments (PPR / Cache Components)

**CRITICAL** when `cacheComponents: true` and routes read session cookies. Reference implementation: `src/app/(storefront)/[locale]/[channel]/(main)/account/`. The PPR boundary model and the generic "uncached data outside `<Suspense>`" fix menu live in [`data-caching.md`](data-caching.md); this rule covers what's auth-specific.

> **Fork upgrades:** apply migration `2026-06-account-ppr-auth` in [`../migrations/manifest.json`](../migrations/manifest.json) when catching up from pre–June 2026 Paper.

Anything that calls `cookies()`, `headers()`, or authenticated GraphQL is **dynamic**. In an async **page** without a Suspense boundary it fails the build (`Uncached data was accessed outside of <Suspense>`). Fix at the **route segment that owns the dynamic work** — never by wrapping `<main>{children}</main>` (hides the issue and blocks route `loading.tsx`).

## BFF auth (session lifecycle)

Customers sign in, sign up and reset passwords on **Keycloak's pages**; the storefront never sees a password. The OIDC Authorization Code flow (PKCE, confidential client, `openid-client`) runs in **Next.js API routes**, and the Keycloak tokens are **HttpOnly** cookies. Saleor accepts the Keycloak access token through its OpenID Connect plugin, so `sessionQuery` / `mutate` send it as the bearer (setup: `docs/configuration/keycloak.md`).

| Route                    | Purpose                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `GET /api/auth/login`    | Redirect to Keycloak (`?signup=1`: registration page), browse locale as `ui_locales`          |
| `GET /api/auth/callback` | Redeem the code, register a first-time customer with EOS (`ensureEosClient`), set cookies     |
| `logout()` server action | Detach checkout + clear cookies; returns Keycloak's end-session URL, which the client follows |

Link to sign-in with `signInHref(returnTo)` (plain anchor or `window.location.assign`); `returnTo` is a same-origin path (`safeReturnPath`). `getSessionAccessToken()` refreshes the access token near expiry; during an RSC render the refreshed token serves the request without being written back. Account name, email and password are edited in Keycloak's account console (`keycloakAccountConsoleUrl()`). Commerce (cart, checkout lines) stays on **server actions** — do not proxy all GraphQL. The header user menu (`UserMenuServer`) calls `getHeaderUser()` inside Suspense — same server session as account pages, no client `me` fetch.

## Keeping header chrome fresh (Router Cache)

HttpOnly cookies are the source of truth, and the header auth/cart chrome renders inside **cookie-gated dynamic holes** — the served document is always cookie-correct, and none of that content is in the shared cache. Freshness triggers are therefore **local to the acting user**; nothing here invalidates shared cache (see [`paper-vercel-cost.md`](paper-vercel-cost.md)):

| Trigger                       | When                                        | Mechanism                                                                                                                                   |
| ----------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Same-tab mutation             | Add-to-cart, cart line edits, profile edits | Server action calls `refresh()` (`next/cache`) — re-renders this user's route in the action response                                        |
| Cross-tab                     | Login/logout/cart change in another tab     | Mutators call `bumpChromeVersion()`; `HeaderChromeSync` compares on `storage`/`visibilitychange`/`pageshow` and refreshes once when visible |
| Cross-surface / auth boundary | Login, logout, checkout → storefront        | **Hard navigation** (the Keycloak round trip is one) — a fresh document needs no invalidation                                               |

**Do NOT `router.refresh()` on in-store soft navigation.** The header lives in the shared layout (preserved across sibling navigations), and every session/cart mutation already refreshes this user's chrome via the action's `refresh()`. A per-pathname refresh forces a server round-trip on every soft nav and defeats instant navigation to prerendered shells — most visibly returning to the homepage, which has no loading skeleton to mask the wait.

**Do NOT revalidate on first paint or tab focus.** The removed `HeaderAuthRefresh` design called a Server Action that `revalidatePath`-ed the entire locale/channel layout on every hard load and every refocus — a **sitewide shared-cache purge per visitor**, billed at traffic scale (invocations, ISR writes, defeated CDN). First paint is already cookie-correct; cross-tab staleness is what the version bump exists for.

**Hard navigation is required** when leaving `/checkout` or after login/logout — soft `router.push`/`<Link>` can restore a cached anonymous `UserMenuServer`. Sign-in always is one (Keycloak redirects back); otherwise use `useLogout({ channel })`, `navigateToStorefrontHome()`, or `StorefrontHomeLink` (plain anchor).

## Account architecture

Browse layouts use per-chrome slots; account uses a **layout-shell auth gate** (one Suspense + async shell; session checks only inside the shell):

```
account/layout.tsx
└── Suspense fallback={<AccountSkeleton />}
    └── AccountShell (async)
        ├── no session / invalid user → <AccountLogin />   (SignInPanel → Keycloak)
        └── user → AccountProvider
            ├── AccountNav (static client)
            └── {children}   (sync pages + nested Suspense islands)

header.tsx → Suspense → HeaderChromeSync (client; cross-tab version listener only, NO mount/per-nav work)
                          └── UserMenuServer (async; cookies() + getHeaderUser() or sign-in link)
```

```tsx
// Layout shell — gate inside the async shell, not the page
async function AccountShell({ children }: { children: ReactNode }) {
	if (!(await hasAuthSession())) return <AccountLogin />;
	const user = await getCurrentUser(); // React.cache — deduped per request
	if (!user) return <AccountLogin />;
	return <AccountProvider user={user}>{/* nav + children */}</AccountProvider>;
}

// Sync page → fetch user once via context, secondary fetches in nested Suspense
export default function AccountOverviewPage() {
	return (
		<div>
			<AccountOverviewWelcome /> {/* useAccountUser() — from layout context */}
			<Suspense fallback={<RecentOrdersSectionSkeleton />}>
				<RecentOrdersSection />
			</Suspense>
		</div>
	);
}
```

**Moving a logged-in area to PPR-safe patterns:** layout owns the auth gate; pages stay sync (`<Suspense><AsyncContent/></Suspense>`); fetch the profile once in the layout and expose via `AccountProvider`/`useAccountUser()` (avoids `cookies()` per page); secondary fetches in nested Suspense; sign-in via `AccountLogin`. When UI reads user from layout context, mutations must `revalidatePath("/account", "layout")` **+** `router.refresh()` (page-only revalidation leaves stale context). Verify with `STOREFRONT_CHANNELS=aud,default-channel pnpm run build`.

## Anti-patterns

❌ `cookies()` / `getCurrentUser()` in an async page without a page/layout Suspense boundary
❌ Browser → Saleor or Keycloak for tokens or `me` — use the `/api/auth/*` routes + server `getHeaderUser()`
❌ `connection()` in the account layout — can break PPR with `CartProvider` in the parent tree
❌ Wrapping only `<main>` in Suspense as a workaround — use the layout shell that owns the fetch
❌ `key={pathname}` without `router.refresh()` on header auth — remounting RSC children doesn't bust the Router Cache
❌ Client-side sessionStorage retry/recover gates or looping `router.refresh()` from effects — fix cache boundaries server-side
❌ Treating all `me === null` as signed out — use `resolveSessionUser` (`guest`/`authenticated`/`unavailable`); show the login link only on `guest`
❌ `<Link>` from checkout → storefront when the session may have changed — use a plain `<a href>` / `navigateToStorefrontHome()`

## Key files

| Concern            | File                                                                                      | Note                                                            |
| ------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Session / tokens   | `src/lib/auth/session.ts`, `has-auth-session.ts`                                          | Keycloak cookies; refresh near expiry                           |
| User profile       | `account/get-current-user.ts`                                                             | `React.cache()` — deduped per request                           |
| Header user        | `src/lib/auth/get-header-user.ts`                                                         | guest / authenticated / unavailable                             |
| Session resolution | `src/lib/auth/resolve-session-user.ts`                                                    | Classifies the `me` fetch; one server retry on transient errors |
| Auth failure codes | `src/lib/auth/session-auth-state.ts`                                                      | `isDefinitiveAuthFailure` — Saleor JWT codes + message fallback |
| OIDC flow          | `src/lib/auth/keycloak.ts`, `sign-in-attempt.ts`, `/api/auth/login`, `/api/auth/callback` | Discovery, PKCE + state cookie, code exchange                   |
| EOS registration   | `src/lib/auth/eos.ts`                                                                     | First sign-in joins the tenant as a client                      |
| Profile            | `account-context.tsx`                                                                     | `useAccountUser()`                                              |
| Sign-in UI         | `account-login.tsx`, `sign-in-panel.tsx`                                                  | Anchors to `signInHref()`                                       |
| Chrome refresh     | `user-menu-server.tsx`, `header-chrome-sync.tsx`, `src/lib/chrome-sync.ts`                | Header auth chrome + cross-tab sync                             |
| Layouts            | `(main)/layout.tsx`, `account/layout.tsx`, `account/actions.ts`                           | Browse chrome vs account auth gate; `refresh()` after mutations |

Related: [`data-caching.md`](data-caching.md) (page-boundary model), [`checkout-management.md`](checkout-management.md) (checkout sign-in round trip), [`data-redirect-security.md`](data-redirect-security.md) (`returnTo`).
