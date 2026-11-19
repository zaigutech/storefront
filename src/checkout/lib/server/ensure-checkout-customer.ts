import "server-only";

import {
	CheckoutCustomerAttachDocument,
	CheckoutOwnerDocument,
	type CheckoutCustomerAttachMutation,
	type CheckoutCustomerAttachMutationVariables,
	type CheckoutOwnerQuery,
	type CheckoutOwnerQueryVariables,
} from "@/checkout/graphql/generated/operations";
import type { SimpleActionResult } from "@/checkout/lib/checkout-action-types";
import { resolveCheckoutOwnership } from "@/checkout/lib/checkout-owner";
import { getCheckoutServerTranslations } from "@/checkout/lib/server/get-checkout-server-translations";
import { toCheckoutActionResult } from "@/checkout/lib/server/mutation-result";
import { toTypedDocument } from "@/checkout/lib/server/to-typed-document";
import { checkoutGraphqlLanguageCode } from "@/lib/checkout-locale";
import { mutate, sessionQuery } from "@/lib/saleor";

const checkoutOwnerDocument = toTypedDocument<CheckoutOwnerQuery, CheckoutOwnerQueryVariables>(
	CheckoutOwnerDocument,
);
const checkoutCustomerAttachDocument = toTypedDocument<
	CheckoutCustomerAttachMutation,
	CheckoutCustomerAttachMutationVariables
>(CheckoutCustomerAttachDocument);

/**
 * Makes sure the checkout belongs to the signed-in customer before it is completed:
 * attaches an unowned checkout, accepts one already theirs, refuses anyone else's.
 */
export async function ensureCheckoutCustomer(checkoutId: string): Promise<SimpleActionResult> {
	const { server: t } = await getCheckoutServerTranslations();

	const owner = await sessionQuery(checkoutOwnerDocument, { variables: { id: checkoutId } });
	if (!owner.ok) {
		return { ok: false, error: owner.error.message };
	}

	switch (resolveCheckoutOwnership(owner.data, owner.partialErrors)) {
		case "mine":
			return { ok: true };
		case "signed-out":
			return { ok: false, error: t("signInRequired") };
		case "missing":
		case "other":
			return { ok: false, error: t("completeOrderFailed") };
		case "unowned":
			break;
	}

	const attached = await mutate(checkoutCustomerAttachDocument, {
		variables: { checkoutId, languageCode: await checkoutGraphqlLanguageCode() },
	});
	if (!attached.ok) {
		return { ok: false, error: attached.error.message };
	}
	const result = toCheckoutActionResult(attached.data.checkoutCustomerAttach);
	return result.ok ? { ok: true } : result;
}
