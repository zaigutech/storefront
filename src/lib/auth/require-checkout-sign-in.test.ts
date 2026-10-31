import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

import { hasAuthSession } from "./has-auth-session";
import { requireCheckoutSignIn } from "./require-checkout-sign-in";

vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));

vi.mock("./has-auth-session", () => ({
	hasAuthSession: vi.fn(),
}));

describe("requireCheckoutSignIn", () => {
	beforeEach(() => {
		vi.mocked(redirect).mockReset();
	});

	it("sends a shopper without a session to sign-in, back to the checkout", async () => {
		vi.mocked(hasAuthSession).mockResolvedValue(false);

		await requireCheckoutSignIn("/checkout?checkout=abc&locale=fr");

		expect(redirect).toHaveBeenCalledWith(
			"/api/auth/login?returnTo=%2Fcheckout%3Fcheckout%3Dabc%26locale%3Dfr",
		);
	});

	it("lets a signed-in customer through", async () => {
		vi.mocked(hasAuthSession).mockResolvedValue(true);

		await requireCheckoutSignIn("/checkout");

		expect(redirect).not.toHaveBeenCalled();
	});
});
