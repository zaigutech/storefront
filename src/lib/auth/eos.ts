import "server-only";

import { invariant } from "ts-invariant";

import { getSessionAccessToken } from "./session";

/**
 * Makes the signed-in customer a client of the tenant selling in this Saleor channel before they
 * can buy there: EOS refuses a paid order from anyone who is no client of its tenant. One
 * storefront serves every tenant and a session spans their channels, so this runs per checkout,
 * not once at sign-in. EOS creates the person and, from that registration, their Saleor customer
 * and Odoo partner; name and email come from the token.
 */
export async function ensureEosClient(channelId: string): Promise<void> {
	const accessToken = await getSessionAccessToken();
	invariant(accessToken, "Checkout reached without a session");

	// EOS owns the topology: the channel names the tenant, which the storefront never configures.
	const { tenantId } = (await eosRequest(
		accessToken,
		null,
		"GET",
		`/channels/${encodeURIComponent(channelId)}/tenant`,
	)) as { tenantId: string };

	// `client` says whether the customer is a client of the tenant the request named. A staff member has
	// joined that tenant already but is no client of it until registered here.
	const me = (await eosRequest(accessToken, tenantId, "GET", "/auth/me")) as { client: boolean };
	if (me.client) {
		return;
	}
	// 409: a concurrent render of the same checkout registered the customer first.
	await eosRequest(accessToken, tenantId, "POST", "/auth/register", { tenantId }, 409);
}

async function eosRequest(
	accessToken: string,
	tenantId: string | null,
	method: string,
	path: string,
	body?: unknown,
	alreadyDoneStatus?: number,
): Promise<unknown> {
	const apiUrl = process.env.EOS_API_URL;
	invariant(apiUrl, "Missing EOS_API_URL env variable");

	const response = await fetch(`${apiUrl}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			// EOS binds the request to this tenant only if the caller is a member of it.
			...(tenantId === null ? {} : { "X-Tenant-Id": tenantId }),
			...(body === undefined ? {} : { "Content-Type": "application/json" }),
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
		cache: "no-store",
	});
	if (response.status === alreadyDoneStatus) {
		return undefined;
	}
	if (!response.ok) {
		// EOS answers with RFC 9457 problems.
		throw new Error(`EOS ${method} ${path} failed: HTTP ${response.status} ${await response.text()}`);
	}
	const text = await response.text();
	return text ? (JSON.parse(text) as unknown) : undefined;
}
