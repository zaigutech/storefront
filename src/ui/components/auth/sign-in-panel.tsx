import { useTranslations } from "next-intl";
import { signInHref } from "@/lib/auth/return-path";
import { buttonClassName } from "@/ui/components/ui/button";

/**
 * Sign-in and sign-up both happen on Keycloak's pages; this only starts them. Plain anchors:
 * the round trip through Keycloak is a hard navigation anyway.
 */
export function SignInPanel({ returnTo }: { returnTo: string }) {
	const t = useTranslations("account.login");

	return (
		<div className="mx-auto my-16 w-full max-w-md">
			<div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
				<h1 className="text-balance text-h1">{t("title")}</h1>
				<a
					href={signInHref(returnTo)}
					className={buttonClassName({ asLink: true, className: "mt-6 h-12 w-full text-base font-semibold" })}
				>
					{t("submit")}
				</a>
				<p className="mt-4 text-sm text-muted-foreground">
					{t("noAccount")}{" "}
					<a
						href={signInHref(returnTo, { signup: true })}
						className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
					>
						{t("signUp")}
					</a>
				</p>
			</div>
		</div>
	);
}
