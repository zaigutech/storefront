import type { CheckoutOwnerQuery } from "@/checkout/graphql/generated/operations";

/**
 * Who owns a checkout, from the signed-in customer's point of view.
 *
 * Saleor 3.23 refuses `checkoutCustomerAttach` on any checkout that already has a
 * user — the same user included — so completion must not attach blindly. Saleor
 * also completes any checkout by ID, so an attached checkout must be checked to
 * belong to the signed-in customer before it becomes their order.
 */
export type CheckoutOwnership = "signed-out" | "mine" | "unowned" | "other" | "missing";

export function resolveCheckoutOwnership(
	data: CheckoutOwnerQuery,
	partialErrors: ReadonlyArray<{ path?: readonly (string | number)[] }> = [],
): CheckoutOwnership {
	const meId = data.me?.id;
	if (!meId) {
		return "signed-out";
	}
	if (!data.checkout) {
		return "missing";
	}

	const ownerId = data.checkout.user?.id;
	if (ownerId) {
		return ownerId === meId ? "mine" : "other";
	}

	// A null user next to a permission error on it is someone else's checkout.
	const userForbidden = partialErrors.some(
		(error) => error.path?.[0] === "checkout" && error.path?.[1] === "user",
	);
	return userForbidden ? "other" : "unowned";
}
