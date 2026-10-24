import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("openid-client", () => ({}));

import { saveSignInAttempt, takeSignInAttempt } from "./sign-in-attempt";

function cookieStore() {
	const values = new Map<string, string>();
	const store = {
		get: (name: string) => (values.has(name) ? { name, value: values.get(name)! } : undefined),
		set: vi.fn((name: string, value: string, options?: { maxAge?: number }) => {
			if (options?.maxAge === 0) values.delete(name);
			else values.set(name, value);
		}),
	};
	return store as unknown as Parameters<typeof saveSignInAttempt>[0] & typeof store;
}

describe("sign-in attempt", () => {
	const attempt = { state: "st", codeVerifier: "cv", returnTo: "/checkout?checkout=abc" };

	it("is read back once, so a code is redeemed at most once", () => {
		const store = cookieStore();
		saveSignInAttempt(store, attempt);

		expect(takeSignInAttempt(store)).toEqual(attempt);
		expect(takeSignInAttempt(store)).toBeNull();
	});

	it("is scoped to the callback route", () => {
		const store = cookieStore();
		saveSignInAttempt(store, attempt);

		expect(store.set).toHaveBeenCalledWith(
			"kc_sign_in",
			JSON.stringify(attempt),
			expect.objectContaining({ httpOnly: true, path: "/api/auth/callback" }),
		);
	});

	it("rejects a tampered cookie", () => {
		const store = cookieStore();
		store.set("kc_sign_in", JSON.stringify({ state: "st" }));

		expect(takeSignInAttempt(store)).toBeNull();
	});
});
