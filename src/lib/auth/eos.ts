import "server-only";

import { invariant } from "ts-invariant";

/**
 * Makes the signed-in customer a client of the storefront's EOS tenant on their first sign-in.
 * EOS creates the person and, from that registration, their Saleor customer and Odoo partner;
 * name and email come from the token.
 */
export async function ensureEosClient(accessToken: string): Promise<void> {
	const tenantId = process.env.EOS_TENANT_ID;
	invariant(tenantId, "Missing EOS_TENANT_ID env variable");

	const me = (await eosRequest(accessToken, "GET", "/auth/me")) as { tenantId: string };
	if (me.tenantId) {
		return;
	}
	await eosRequest(accessToken, "POST", "/auth/register", { tenantId });
}

async function eosRequest(
	accessToken: string,
	method: string,
	path: string,
	body?: unknown,
): Promise<unknown> {
	const apiUrl = process.env.EOS_API_URL;
	invariant(apiUrl, "Missing EOS_API_URL env variable");

	const response = await fetch(`${apiUrl}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			...(body === undefined ? {} : { "Content-Type": "application/json" }),
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
		cache: "no-store",
	});
	if (!response.ok) {
		// EOS answers with RFC 9457 problems.
		throw new Error(`EOS ${method} ${path} failed: HTTP ${response.status} ${await response.text()}`);
	}
	const text = await response.text();
	return text ? (JSON.parse(text) as unknown) : undefined;
}
