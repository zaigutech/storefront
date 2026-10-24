import { describe, expect, it } from "vitest";

import { safeReturnPath, signInHref } from "./return-path";

describe("safeReturnPath", () => {
	it("keeps a path on this storefront, query included", () => {
		expect(safeReturnPath("/en/default-channel/account")).toBe("/en/default-channel/account");
		expect(safeReturnPath("/checkout?checkout=abc")).toBe("/checkout?checkout=abc");
	});

	it("falls back to / for anything that could leave the origin", () => {
		expect(safeReturnPath(null)).toBe("/");
		expect(safeReturnPath("")).toBe("/");
		expect(safeReturnPath("https://evil.example.com/")).toBe("/");
		expect(safeReturnPath("//evil.example.com/")).toBe("/");
		expect(safeReturnPath("/\\evil.example.com/")).toBe("/");
		expect(safeReturnPath("javascript:alert(1)")).toBe("/");
	});
});

describe("signInHref", () => {
	it("starts sign-in with the return path", () => {
		expect(signInHref("/checkout?checkout=abc")).toBe(
			"/api/auth/login?returnTo=%2Fcheckout%3Fcheckout%3Dabc",
		);
	});

	it("asks for Keycloak's registration page on sign-up", () => {
		expect(signInHref("/en/c/account", { signup: true })).toBe(
			"/api/auth/login?returnTo=%2Fen%2Fc%2Faccount&signup=1",
		);
	});
});
