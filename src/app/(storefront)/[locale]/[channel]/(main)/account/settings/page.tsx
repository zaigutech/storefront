import { keycloakAccountConsoleUrl } from "@/lib/auth/keycloak";
import { AccountSettingsPage } from "@/ui/components/account/settings-page";

export default function AccountSettings() {
	return <AccountSettingsPage accountConsoleUrl={keycloakAccountConsoleUrl()} />;
}
