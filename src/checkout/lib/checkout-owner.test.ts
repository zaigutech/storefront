import { describe, expect, it } from "vitest";

import { resolveCheckoutOwnership } from "@/checkout/lib/checkout-owner";

const me = { id: "user-1" };

describe("resolveCheckoutOwnership", () => {
	it("accepts a checkout already attached to the signed-in customer", () => {
		expect(resolveCheckoutOwnership({ me, checkout: { id: "c", user: { id: "user-1" } } })).toBe("mine");
	});

	it("attaches a checkout with no user", () => {
		expect(resolveCheckoutOwnership({ me, checkout: { id: "c", user: null } })).toBe("unowned");
	});

	it("refuses a checkout whose user Saleor hides from this customer", () => {
		expect(
			resolveCheckoutOwnership({ me, checkout: { id: "c", user: null } }, [{ path: ["checkout", "user"] }]),
		).toBe("other");
	});

	it("refuses a checkout attached to another customer", () => {
		expect(resolveCheckoutOwnership({ me, checkout: { id: "c", user: { id: "user-2" } } })).toBe("other");
	});

	it("needs a signed-in customer", () => {
		expect(resolveCheckoutOwnership({ me: null, checkout: { id: "c", user: null } })).toBe("signed-out");
	});

	it("reports a checkout that no longer exists", () => {
		expect(resolveCheckoutOwnership({ me, checkout: null })).toBe("missing");
	});
});
