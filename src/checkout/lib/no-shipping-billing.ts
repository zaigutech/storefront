import type { AddressInput, CheckoutAddressValidationRules, CountryCode } from "@/checkout/graphql";

/**
 * Checkouts that ship nothing (packages, services) collect no address.
 *
 * Saleor still refuses `checkoutComplete` without a billing address, whether or
 * not the checkout ships. So the storefront hides the billing form for such a
 * checkout and stores a country-only billing address instead, with Saleor's
 * address validation off. Saleor marks that address `validation_skipped` and
 * does not validate it again when the order is created.
 *
 * The country is the channel's: Saleor taxes a checkout that ships nothing by
 * its billing country, so it must not fall back to a placeholder like US.
 */
export const NO_SHIPPING_BILLING_VALIDATION_RULES: CheckoutAddressValidationRules = {
	checkRequiredFields: false,
	checkFieldsFormat: false,
	enableFieldsNormalization: false,
};

/** Channel default country, else the channel's first shipping-zone country; null when neither is known. */
export function resolveNoShippingBillingCountry({
	channelDefaultCountryCode,
	channelCountryCodes,
}: {
	channelDefaultCountryCode: string | null | undefined;
	channelCountryCodes: readonly string[];
}): CountryCode | null {
	if (channelDefaultCountryCode) {
		return channelDefaultCountryCode as CountryCode;
	}
	return (channelCountryCodes[0] as CountryCode | undefined) ?? null;
}

export function buildNoShippingBillingAddress(country: CountryCode): AddressInput {
	return { country };
}
