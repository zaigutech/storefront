"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { useCheckoutTransition } from "@/checkout/hooks/use-checkout-transition";
import { useCheckoutData } from "@/checkout/providers/checkout-data";
import { PageNotFound } from "@/checkout/views/page-not-found";
import {
	SaleorCheckout,
	CheckoutLoadingFallback,
	PaymentCompletingScreen,
} from "@/checkout/views/saleor-checkout";
import { EmptyCartPage } from "@/checkout/views/empty-cart-page";
import { useCheckoutContent } from "@/lib/content";

export const RootViews = () => {
	const { emptySession } = useCheckoutContent();
	const t = useTranslations("checkout.errors");
	const { loadState, checkout } = useCheckoutData();
	const transition = useCheckoutTransition();

	// After checkoutComplete, cookie deletion re-renders this RSC tree with `not_found` while
	// navigation to `/order/{hmac}` is still in flight — keep the processing screen up.
	if (transition === "completing") {
		return <PaymentCompletingScreen isShippingRequired={checkout?.isShippingRequired ?? true} />;
	}

	if (loadState === "none") {
		return <PageNotFound title={emptySession.title} message={emptySession.message} />;
	}

	if (loadState === "not_found") {
		return <PageNotFound title={t("sessionExpiredTitle")} message={t("sessionExpiredMessage")} />;
	}

	if (loadState === "error") {
		return <PageNotFound title={t("loadFailedTitle")} message={t("loadFailedMessage")} />;
	}

	if (loadState === "empty") {
		return <EmptyCartPage />;
	}

	return (
		<Suspense fallback={<CheckoutLoadingFallback />}>
			<SaleorCheckout />
		</Suspense>
	);
};
