"use client";

import { type FC } from "react";
import { useTranslations } from "next-intl";
import { SignedInUser, SignInRequired } from "@/checkout/components/contact";

// User type matching what useUser() returns
type User = {
	id: string;
	email: string;
	firstName?: string | null;
	lastName?: string | null;
};

// =============================================================================
// Types
// =============================================================================

interface ContactSectionProps {
	// Auth state
	isSignedIn: boolean;
	user: User | null | undefined;
	checkoutId?: string;
	/** True while resolving session (avoids sign-in prompt flash when auth cookies exist) */
	isLoading?: boolean;
	onSignOut: () => void;
	onSignInClick: () => void;
}

// =============================================================================
// Component
// =============================================================================

export const ContactSection: FC<ContactSectionProps> = ({
	isSignedIn,
	user,
	checkoutId,
	isLoading = false,
	onSignOut,
	onSignInClick,
}) => {
	const t = useTranslations("checkout.contact");

	if (isLoading) {
		return (
			<section className="space-y-4">
				<div className="h-7 w-24 animate-pulse rounded bg-muted" />
				<div className="h-16 animate-pulse rounded-lg bg-muted" />
			</section>
		);
	}

	// No guest checkout: without a customer there is only the way to sign in.
	if (!isSignedIn || !user) {
		return <SignInRequired onSignInClick={onSignInClick} />;
	}

	return (
		<section className="space-y-4">
			<h2 className="text-xl font-semibold">{t("title")}</h2>
			<SignedInUser user={user} checkoutId={checkoutId} onSignOut={onSignOut} />
		</section>
	);
};
