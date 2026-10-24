# Keycloak sign-in

Customers sign in, sign up and reset their password on Keycloak's pages. The storefront runs the
OIDC Authorization Code flow on the server (`/api/auth/login` → Keycloak → `/api/auth/callback`)
and keeps the Keycloak tokens in HttpOnly cookies. The same access token authenticates the customer
to Saleor and to EOS; neither the browser nor Saleor ever sees a password.

```
browser ──/api/auth/login──▶ Keycloak pages ──code──▶ /api/auth/callback
                                                        ├─ token exchange (client secret)
                                                        ├─ EOS: GET /auth/me, first time POST /auth/register
                                                        └─ Set-Cookie (access, refresh, id token)
storefront server ──Authorization: Bearer <Keycloak access token>──▶ Saleor (OpenID Connect plugin)
```

## 1. Keycloak client

EOS provisions the realm and a confidential client `eos-storefront` (`scripts/provision-keycloak.sh`
in the EOS repository, `EOS_STOREFRONT_URLS`). By hand, in the realm used by EOS:

- Client authentication on, Standard flow only, PKCE method `S256`.
- Valid redirect URI `<NEXT_PUBLIC_STOREFRONT_URL>/api/auth/callback`; valid post-logout redirect URIs
  and web origin: the storefront origin (`<NEXT_PUBLIC_STOREFRONT_URL>/*`).
- Copy the secret from **Credentials** into `KEYCLOAK_CLIENT_SECRET`.

## 2. Saleor OpenID Connect plugin

Saleor accepts a Keycloak access token once its built-in OpenID Connect plugin knows the realm's
keys and user info endpoint. Dashboard → **Configuration → Plugins → OpenID Connect**, global
configuration, active:

| Field                       | Value                                                 |
| --------------------------- | ----------------------------------------------------- |
| JSON Web Key Set URL        | `<KEYCLOAK_ISSUER>/protocol/openid-connect/certs`     |
| User info URL               | `<KEYCLOAK_ISSUER>/protocol/openid-connect/userinfo`  |
| Use OAuth scope permissions | off (customers only; staff keep signing in to Saleor) |

Leave the authorization, token and logout URLs empty: the storefront, not Saleor, runs the flow.
Saleor must reach Keycloak at the issuer's own URL, because Keycloak's user info endpoint rejects a
token whose issuer does not match the URL it is called on.

On the first request with a customer's token Saleor finds the customer by `sub`, then by email, or
creates one (and links earlier guest orders with that email). EOS creates the same customer from the
registration (`ClientRegistered`) and also finds it by email, so either order ends with one customer.

## 3. Environment

| Variable                     | Example                                                               |
| ---------------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_STOREFRONT_URL` | `https://shop.example.com` (public origin; builds every redirect URI) |
| `KEYCLOAK_ISSUER`            | `https://auth.example.com/realms/eos`                                 |
| `KEYCLOAK_CLIENT_ID`         | `eos-storefront`                                                      |
| `KEYCLOAK_CLIENT_SECRET`     | from the client's Credentials tab                                     |
| `EOS_API_URL`                | `https://api.example.com/api`                                         |
| `EOS_TENANT_ID`              | the tenant whose clients shop here                                    |

Name, email and password changes happen in Keycloak's account console (linked from account
settings); Saleor picks up name and email from the token on the next request.
