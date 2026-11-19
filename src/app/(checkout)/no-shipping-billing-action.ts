"use server";

import type { CheckoutActionResult } from "@/checkout/lib/checkout-action-types";
import { setNoShippingBillingAddressOnServer } from "@/checkout/lib/server/set-no-shipping-billing";

/** Country-only billing for a checkout that ships nothing — see `@/checkout/lib/no-shipping-billing`. */
export async function setNoShippingBillingAddress(checkoutId: string): Promise<CheckoutActionResult> {
	return setNoShippingBillingAddressOnServer(checkoutId);
}
