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

EOS provisions the realm and a confidential client `storefront` (`keycloak/provision-eos.sh`
in the middleware repository, `EOS_STOREFRONT_URLS`). By hand, in the realm used by EOS:

- Client authentication on, Standard flow only, PKCE method `S256`.
- Valid redirect URI `<NEXT_PUBLIC_STOREFRONT_URL>/api/auth/callback`; valid post-logout redirect URIs
  and web origin: the storefront origin (`<NEXT_PUBLIC_STOREFRONT_URL>/*`).
- Copy the secret from **Credentials** into `KEYCLOAK_CLIENT_SECRET`.

## 2. Saleor OpenID Connect plugin

Saleor accepts a Keycloak access token once its built-in OpenID Connect plugin knows the realm's
keys and user info endpoint. saleor-platform configures the plugin
([`docs/operations/oidc-setup.md`](../../../saleor-platform/docs/operations/oidc-setup.md)); the
fields the storefront relies on are:

| Field                       | Value                                                                       |
| --------------------------- | --------------------------------------------------------------------------- |
| JSON Web Key Set URL        | `<Keycloak URL Saleor reaches>/realms/eos/protocol/openid-connect/certs`    |
| User info URL               | `<Keycloak URL Saleor reaches>/realms/eos/protocol/openid-connect/userinfo` |
| Use OAuth scope permissions | off (customers get no Dashboard permission from their token)                |

The plugin's client ID, secret and authorization/token URLs belong to its own sign-in flow, which
signs the Saleor Dashboard in with the `saleor-dashboard` client; checking a storefront token does
not use them.

Keycloak must issue tokens under one fixed issuer (`KC_HOSTNAME`): its user info endpoint rejects a
token whose issuer differs from the one it would issue on that request. With `KC_HOSTNAME` set,
Saleor may reach Keycloak by any address:

| Environment | `KC_HOSTNAME`           | Keycloak URL Saleor reaches                         |
| ----------- | ----------------------- | --------------------------------------------------- |
| Production  | `auth.zaigu.com`        | `https://auth.zaigu.com` (must resolve from Saleor) |
| Local       | `http://localhost:8081` | `http://172.17.0.1:8081` (the Docker host)          |

Check from the Saleor container that the URL answers with the expected issuer:

```bash
docker exec <saleor-api> python -c "import json,urllib.request;print(json.load(urllib.request.urlopen('<Keycloak URL Saleor reaches>/realms/eos/.well-known/openid-configuration'))['issuer'])"
```

On the first request with a customer's token Saleor finds the customer by `sub`, then by email, or
creates one (and links earlier guest orders with that email). EOS creates the same customer from the
registration (`ClientRegistered`) and also finds it by email, so either order ends with one customer.

## 3. Environment

| Variable                     | Example                                                               |
| ---------------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_STOREFRONT_URL` | `https://shop.example.com` (public origin; builds every redirect URI) |
| `KEYCLOAK_ISSUER`            | `https://auth.example.com/realms/eos`                                 |
| `KEYCLOAK_CLIENT_ID`         | `storefront`                                                          |
| `KEYCLOAK_CLIENT_SECRET`     | from the client's Credentials tab                                     |
| `EOS_API_URL`                | `https://api.example.com/api`                                         |
| `EOS_TENANT_ID`              | `00000000-0000-7000-8000-000000000000` (EOS's seed tenant)            |

Name, email and password changes happen in Keycloak's account console (linked from account
settings); Saleor picks up name and email from the token on the next request.
