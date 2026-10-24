"use server";

import { refresh } from "next/cache";
import {
	AccountAddressCreateDocument,
	AccountAddressUpdateDocument,
	AccountAddressDeleteDocument,
	AccountSetDefaultAddressDocument,
	type AddressInput,
	type CountryCode,
	AddressTypeEnum,
} from "@/gql/graphql";
import { mutate } from "@/lib/saleor";
import { getFormString, getFormStringOptional } from "@/ui/components/account/form-utils";
import type { AccountActionResult } from "@/ui/components/account/account-action-result";

export async function createAddress(formData: FormData): Promise<AccountActionResult> {
	const input = extractAddressInput(formData);

	const result = await mutate(AccountAddressCreateDocument, {
		variables: { input },
	});

	if (!result.ok) {
		return { success: false, error: result.error.message };
	}

	const errors = result.data.accountAddressCreate?.errors;
	if (errors?.length) {
		return errors[0].message
			? { success: false, error: errors[0].message }
			: { success: false, errorKey: "createAddressFailed" };
	}

	revalidateAccountLayout();
	return { success: true };
}

export async function updateAddress(formData: FormData): Promise<AccountActionResult> {
	const id = getFormString(formData, "id");
	const input = extractAddressInput(formData);

	const result = await mutate(AccountAddressUpdateDocument, {
		variables: { id, input },
	});

	if (!result.ok) {
		return { success: false, error: result.error.message };
	}

	const errors = result.data.accountAddressUpdate?.errors;
	if (errors?.length) {
		return errors[0].message
			? { success: false, error: errors[0].message }
			: { success: false, errorKey: "updateAddressFailed" };
	}

	revalidateAccountLayout();
	return { success: true };
}

export async function deleteAddress(formData: FormData): Promise<AccountActionResult> {
	const id = getFormString(formData, "id");

	const result = await mutate(AccountAddressDeleteDocument, {
		variables: { id },
	});

	if (!result.ok) {
		return { success: false, error: result.error.message };
	}

	const errors = result.data.accountAddressDelete?.errors;
	if (errors?.length) {
		return errors[0].message
			? { success: false, error: errors[0].message }
			: { success: false, errorKey: "deleteAddressFailed" };
	}

	revalidateAccountLayout();
	return { success: true };
}

export async function setDefaultAddress(formData: FormData): Promise<AccountActionResult> {
	const id = getFormString(formData, "id");
	const type = getFormString(formData, "type");

	const addressType = type === "BILLING" ? AddressTypeEnum.Billing : AddressTypeEnum.Shipping;

	const result = await mutate(AccountSetDefaultAddressDocument, {
		variables: { id, type: addressType },
	});

	if (!result.ok) {
		return { success: false, error: result.error.message };
	}

	const errors = result.data.accountSetDefaultAddress?.errors;
	if (errors?.length) {
		return errors[0].message
			? { success: false, error: errors[0].message }
			: { success: false, errorKey: "setDefaultAddressFailed" };
	}

	revalidateAccountLayout();
	return { success: true };
}

/**
 * Account UI reads profile data from the layout-level AccountProvider (client context).
 *
 * Account data is auth-gated and rendered per user at request time — it is never in the
 * shared cache. `refresh()` re-renders this user's account route (layout provider included)
 * in the action response. The previous `revalidatePath(..., "layout")` purged the shared
 * account shells for every locale × channel × visitor on each profile edit.
 */
function revalidateAccountLayout() {
	refresh();
}

function extractAddressInput(formData: FormData): AddressInput {
	return {
		firstName: getFormStringOptional(formData, "firstName"),
		lastName: getFormStringOptional(formData, "lastName"),
		companyName: getFormStringOptional(formData, "companyName"),
		streetAddress1: getFormStringOptional(formData, "streetAddress1"),
		streetAddress2: getFormStringOptional(formData, "streetAddress2"),
		city: getFormStringOptional(formData, "city"),
		postalCode: getFormStringOptional(formData, "postalCode"),
		countryArea: getFormStringOptional(formData, "countryArea"),
		country: getFormStringOptional(formData, "country") as CountryCode | undefined,
		phone: getFormStringOptional(formData, "phone"),
	};
}
