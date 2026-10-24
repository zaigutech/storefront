"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail, Calendar, ExternalLink } from "lucide-react";
import { resolveLocaleFromSlug } from "@/config/locale";
import { buttonClassName } from "@/ui/components/ui/button";
import { useAccountUser } from "@/ui/components/account/account-context";

/** Name, email and password belong to the Keycloak account; the console edits them. */
export function AccountSettingsPage({ accountConsoleUrl }: { accountConsoleUrl: string }) {
	const t = useTranslations("account.settings");
	const tFields = useTranslations("account.fields");
	const params = useParams<{ locale: string }>();
	const user = useAccountUser();
	const intlLocale = resolveLocaleFromSlug(params.locale).bcp47;

	const memberSince = new Date(user.dateJoined).toLocaleDateString(intlLocale, {
		month: "long",
		year: "numeric",
	});

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-balance text-h1">{t("title")}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
			</div>

			<div className="divide-y rounded-lg border">
				<div className="p-4 sm:p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">{tFields("email")}</p>
							<div className="flex items-center gap-2">
								<Mail className="h-4 w-4 text-muted-foreground" />
								<p className="font-medium">{user.email}</p>
							</div>
						</div>
					</div>
				</div>

				<div className="p-4 sm:p-6">
					<p className="text-sm text-muted-foreground">{t("manageAccountHint")}</p>
					<a
						href={accountConsoleUrl}
						className={buttonClassName({ variant: "outline-solid", asLink: true, className: "mt-3 gap-2" })}
					>
						{t("manageAccount")}
						<ExternalLink className="h-4 w-4" />
					</a>
				</div>

				<div className="p-4 sm:p-6">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Calendar className="h-4 w-4" />
						<span>{t("memberSince", { date: memberSince })}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
