"use client";

import { type FC } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/ui/components/ui/button";

export interface SignInRequiredProps {
	onSignInClick: () => void;
}

/** There is no guest checkout — a shopper without a session is asked to sign in. */
export const SignInRequired: FC<SignInRequiredProps> = ({ onSignInClick }) => {
	const t = useTranslations("checkout");

	return (
		<section className="space-y-4">
			<h2 className="text-xl font-semibold">{t("contact.title")}</h2>
			<div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
				<p className="text-sm text-muted-foreground">{t("contact.signInRequired")}</p>
				<Button type="button" onClick={onSignInClick}>
					{t("actions.logIn")}
				</Button>
			</div>
		</section>
	);
};
