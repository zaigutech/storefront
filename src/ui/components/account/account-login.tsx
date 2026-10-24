"use client";

import { usePathname } from "next/navigation";
import { SignInPanel } from "@/ui/components/auth/sign-in-panel";

/** Sign-in for /account when the user is signed out; Keycloak returns to the page they asked for. */
export function AccountLogin() {
	return <SignInPanel returnTo={usePathname()} />;
}
