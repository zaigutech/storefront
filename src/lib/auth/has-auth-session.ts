import "server-only";

import { getSessionAccessToken } from "./session";

/** True when the request carries a usable Keycloak session (refreshing the access token if needed). */
export async function hasAuthSession(): Promise<boolean> {
	return (await getSessionAccessToken()) !== null;
}
