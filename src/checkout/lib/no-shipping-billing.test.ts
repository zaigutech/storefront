import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AddressFragment } from "@/checkout/graphql";
import { setCheckoutTransport, type CheckoutTransport } from "@/checkout/lib/checkout-transport";
import { resolveNoShippingBillingCountry } from "@/checkout/lib/no-shipping-billing";
import { updateCheckoutBilling } from "@/checkout/lib/payment/update-billing";

describe("resolveNoShippingBillingCountry", () => {
	it("prefers the channel default country", () => {
		expect(
			resolveNoShippingBillingCountry({ channelDefaultCountryCode: "CN", channelCountryCodes: ["US"] }),
		).toBe("CN");
	});

	it("falls back to the first channel country", () => {
		expect(
			resolveNoShippingBillingCountry({ channelDefaultCountryCode: null, channelCountryCodes: ["CN", "US"] }),
		).toBe("CN");
	});

	it("returns null rather than guessing a country", () => {
		expect(
			resolveNoShippingBillingCountry({ channelDefaultCountryCode: null, channelCountryCodes: [] }),
		).toBeNull();
	});
});

describe("updateCheckoutBilling without a shipping address", () => {
	const updateBillingAddress = vi.fn<CheckoutTransport["updateBillingAddress"]>();
	const setNoShippingBillingAddress = vi.fn<NonNullable<CheckoutTransport["setNoShippingBillingAddress"]>>();

	const params = {
		checkoutId: "checkout-1",
		sameAsBilling: false,
		hasShippingAddress: false,
		billingData: {
			countryCode: "US" as const,
			formData: { postalCode: "518000" },
			selectedAddressId: null,
		},
		shippingAddress: null,
		userAddresses: [] as AddressFragment[],
		authenticated: true,
	};

	beforeEach(() => {
		updateBillingAddress.mockReset();
		setNoShippingBillingAddress.mockReset();
		setCheckoutTransport({
			fetchCheckout: vi.fn(),
			attachCustomer: vi.fn(),
			updateBillingAddress,
			setNoShippingBillingAddress,
			initializePaymentGateways: vi.fn(),
			initializeTransaction: vi.fn(),
			processTransaction: vi.fn(),
			completeCheckout: vi.fn(),
		});
	});

	it("stores the country-only billing address and ignores the form", async () => {
		setNoShippingBillingAddress.mockResolvedValue({ ok: true, checkout: {} as never });

		await expect(updateCheckoutBilling(params)).resolves.toEqual({ ok: true });
		expect(setNoShippingBillingAddress).toHaveBeenCalledWith("checkout-1");
		expect(updateBillingAddress).not.toHaveBeenCalled();
	});

	it("surfaces the server error as a billing section error", async () => {
		setNoShippingBillingAddress.mockResolvedValue({ ok: false, error: "No billing country" });

		await expect(updateCheckoutBilling(params)).resolves.toEqual({
			ok: false,
			errors: { billing: "No billing country" },
		});
	});
});
