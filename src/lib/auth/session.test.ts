import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { isExpiring } from "./session";

function jwtWithExp(exp: unknown): string {
	const payload = Buffer.from(JSON.stringify({ sub: "s", exp })).toString("base64url");
	return `header.${payload}.signature`;
}

describe("isExpiring", () => {
	const now = 1_800_000_000;

	it("is false while the token has more than the skew left", () => {
		expect(isExpiring(jwtWithExp(now + 31), now)).toBe(false);
	});

	it("is true within the refresh skew and after expiry", () => {
		expect(isExpiring(jwtWithExp(now + 30), now)).toBe(true);
		expect(isExpiring(jwtWithExp(now - 1), now)).toBe(true);
	});

	it("treats an unreadable token as expired", () => {
		expect(isExpiring("not-a-jwt", now)).toBe(true);
		expect(isExpiring("a.%%%.c", now)).toBe(true);
		expect(isExpiring(jwtWithExp("soon"), now)).toBe(true);
	});
});
