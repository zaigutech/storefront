import type { useTranslations } from "next-intl";

/** Keys under `account.errors` returned by account server actions for client-side translation. */
export type AccountActionErrorKey =
	| "createAddressFailed"
	| "updateAddressFailed"
	| "deleteAddressFailed"
	| "setDefaultAddressFailed";

export type AccountActionResult =
	| { success: true }
	| { success: false; errorKey: AccountActionErrorKey }
	| { success: false; error: string };

type AccountTranslator = ReturnType<typeof useTranslations<"account">>;

export function resolveAccountActionError(
	t: AccountTranslator,
	result: Extract<AccountActionResult, { success: false }>,
): string {
	if ("errorKey" in result) {
		return t(`errors.${result.errorKey}`);
	}
	return result.error;
}
