import type { ReactNode } from "react";

/** Shared page shell for the sign-in panel (login page, signed-out /account). */
export function AuthFormSection({ children }: { children: ReactNode }) {
	return <section className="container-content py-8 pb-24">{children}</section>;
}
