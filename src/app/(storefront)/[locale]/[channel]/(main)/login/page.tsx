import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AuthFormSection } from "@/ui/components/auth/auth-form-section";
import { AccountUnavailable } from "@/ui/components/account/account-unavailable";
import { SignInPanel } from "@/ui/components/auth/sign-in-panel";
import { CurrentUserDocument } from "@/gql/graphql";
import { fetchAuthenticatedUserIfSession } from "@/lib/auth/fetch-authenticated-user";
import { resolveSessionUser } from "@/lib/auth/resolve-session-user";
import { buildStorefrontPath } from "@/lib/storefront-path";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "account.metadata" });
	return {
		title: t("loginTitle"),
		description: t("loginDescription"),
	};
}

type LoginPageProps = {
	params: Promise<{ locale: string; channel: string }>;
};

export default function LoginPage({ params }: LoginPageProps) {
	return (
		<Suspense fallback={<LoginSkeleton />}>
			<LoginContent params={params} />
		</Suspense>
	);
}

function LoginSkeleton() {
	return (
		<AuthFormSection>
			<div className="mx-auto my-16 w-full max-w-md">
				<div className="rounded-lg border border-border bg-card p-8 shadow-sm">
					<div className="flex flex-col items-center gap-4">
						<div className="h-7 w-40 animate-pulse rounded bg-secondary" />
						<div className="h-12 w-full animate-pulse rounded-md bg-foreground/10" />
						<div className="h-4 w-48 animate-pulse rounded bg-secondary" />
					</div>
				</div>
			</div>
		</AuthFormSection>
	);
}

async function LoginContent({ params }: { params: LoginPageProps["params"] }) {
	// Uncaught — keeps the cookie read inside this Suspense boundary.
	await cookies();

	const { locale, channel } = await params;
	const home = buildStorefrontPath(locale, channel);
	const auth = await resolveSessionUser(() => fetchAuthenticatedUserIfSession(CurrentUserDocument));

	if (auth.status === "authenticated") {
		redirect(home);
	}

	if (auth.status === "unavailable") {
		return <AccountUnavailable locale={locale} />;
	}

	return (
		<AuthFormSection>
			<SignInPanel returnTo={home} />
		</AuthFormSection>
	);
}
