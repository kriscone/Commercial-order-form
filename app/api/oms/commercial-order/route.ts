import { NextResponse } from "next/server";
import Stripe from "stripe";
import { isSupportedPaymentConsentVersion } from "@/lib/payment-consent";
import { getCommercialBrand } from "@/lib/oms-brand";
import { getPricingConfig, validateBrandPricingRules } from "@/lib/pricing-config";
import { validateCommercialQuote } from "@/lib/validate-commercial-quote";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid order request origin." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 100_000) {
    return NextResponse.json({ error: "Order details are too large." }, { status: 413 });
  }

  const omsApiUrl = process.env.OMS_API_URL?.replace(/\/$/, "");
  const intakeKey = process.env.OMS_COMMERCIAL_ORDER_API_KEY;
  const brandKey = (process.env.OMS_COMMERCIAL_BRAND_KEY || "floorplanonline").trim().toLowerCase();
  if (!omsApiUrl || !intakeKey || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(brandKey)) {
    return NextResponse.json(
      { error: "Commercial order submission is temporarily unavailable." },
      { status: 503 },
    );
  }

  type CommercialOrderPayload = Record<string, unknown> & {
    request_id?: string;
    payment_method?: string;
    payment_consent_version?: string;
    stripe_setup_intent_id?: string;
    estimated_total_cents?: number;
  };
  let untrustedPayload: unknown;
  try {
    untrustedPayload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid order request." }, { status: 400 });
  }

  if (!untrustedPayload || typeof untrustedPayload !== "object" || Array.isArray(untrustedPayload)) {
    return NextResponse.json({ error: "Invalid order request." }, { status: 400 });
  }
  const payload = untrustedPayload as CommercialOrderPayload;
  if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > 100_000) {
    return NextResponse.json({ error: "Order details are too large." }, { status: 413 });
  }
  // The browser cannot submit orders under a different tenant by changing the
  // request body; the deployment owns this brand key.
  payload.brand_key = brandKey;

  const brand = await getCommercialBrand();
  if (!brand.brandConfig || brand.brandConfig.orderFlow !== "commercial" || brand.brandKey !== brandKey) {
    return NextResponse.json(
      { error: "The configured commercial brand is unavailable." },
      { status: 503 },
    );
  }
  const catalog = brand.brandConfig.catalog;
  try {
    validateBrandPricingRules(catalog);
  } catch {
    return NextResponse.json(
      { error: "A brand pricing rule is incomplete. Update the commercial catalog in OMS before checkout." },
      { status: 503 },
    );
  }
  const hasConfiguredCatalog = Boolean(
    catalog && ((catalog.products?.length ?? 0) > 0 ||
      (catalog.services?.length ?? 0) > 0 ||
      (catalog.addons?.length ?? 0) > 0),
  );
  const orderPayload = payload.order_payload && typeof payload.order_payload === "object"
    ? payload.order_payload as Record<string, unknown>
    : {};
  const submittedLineItems = Array.isArray(orderPayload.line_items)
    ? orderPayload.line_items as unknown[]
    : [];
  const kindMap = { product: "products", service: "services", addon: "addons" } as const;
  const needsSharedPricing = submittedLineItems.some((rawLine) => {
    if (!rawLine || typeof rawLine !== "object" || Array.isArray(rawLine)) return false;
    const line = rawLine as Record<string, unknown>;
    const kind = kindMap[line.item_type as keyof typeof kindMap];
    const key = typeof line.key === "string" ? line.key : "";
    const entry = kind
      ? catalog?.[kind]?.find((candidate) => candidate.key === key && candidate.active !== false)
      : undefined;
    if (entry) {
      const metadata = entry.metadata || {};
      return typeof entry.price !== "number" && !metadata.pricing &&
        typeof metadata.pricingCode === "string" && metadata.pricingCode.trim() !== "";
    }
    return brandKey === "floorplanonline" && !hasConfiguredCatalog && key !== "components-only";
  });
  const useFpoDefaults = brandKey === "floorplanonline" && !hasConfiguredCatalog;
  if (needsSharedPricing && !process.env.GOOGLE_PRICING_SCRIPT_URL && !useFpoDefaults) {
    return NextResponse.json(
      { error: "The shared pricing sheet is not configured for this brand." },
      { status: 503 },
    );
  }

  let pricingConfig;
  try {
    pricingConfig = await getPricingConfig(needsSharedPricing);
  } catch (error) {
    console.error("Commercial pricing could not be verified", error);
    return NextResponse.json(
      { error: "Current pricing could not be verified. Please try again shortly." },
      { status: 503 },
    );
  }
  try {
    validateCommercialQuote(payload, brandKey, brand.brandConfig, pricingConfig);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The order quote could not be verified." },
      { status: 400 },
    );
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const taxCalculationId = orderPayload.tax_calculation_id;
  if (!stripeSecret || typeof taxCalculationId !== "string" || !/^taxcalc_[A-Za-z0-9]+$/.test(taxCalculationId)) {
    return NextResponse.json(
      { error: "A current property tax calculation is required to submit this order." },
      { status: 400 },
    );
  }
  try {
    const stripe = new Stripe(stripeSecret);
    const calculation = await stripe.tax.calculations.retrieve(taxCalculationId);
    const calculationItems = await stripe.tax.calculations.listLineItems(taxCalculationId, { limit: 10 });
    const address = calculation.customer_details.address;
    const sameAddress = (left: unknown, right: unknown) =>
      typeof left === "string" && typeof right === "string" &&
      left.trim().toLowerCase() === right.trim().toLowerCase();
    const taxItems = calculationItems.data;
    if (
      calculation.currency !== "usd" ||
      calculation.amount_total !== payload.estimated_total_cents ||
      calculation.tax_amount_exclusive !== payload.estimated_tax_cents ||
      taxItems.length !== 1 ||
      calculationItems.has_more ||
      taxItems[0].amount !== payload.estimated_subtotal_cents ||
      taxItems[0].reference !== `commercial_services_${brandKey}` ||
      !address ||
      address.country !== "US" ||
      !sameAddress(address.line1, payload.street) ||
      !sameAddress(address.city, payload.city) ||
      !sameAddress(address.state, payload.state) ||
      !sameAddress(address.postal_code?.slice(0, 5), String(payload.zip || "").slice(0, 5))
    ) {
      return NextResponse.json(
        { error: "The property tax calculation does not match this order. Please refresh the quote." },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Commercial order tax verification failed", error);
    return NextResponse.json(
      { error: "Property tax could not be verified. Please refresh the quote and try again." },
      { status: 503 },
    );
  }

  if (payload.payment_method === "stripe") {
    const setupIntentId = payload.stripe_setup_intent_id;
    if (!stripeSecret) {
      return NextResponse.json({ error: "Card authorization could not be verified." }, { status: 503 });
    }
    if (
      typeof setupIntentId !== "string" || !/^seti_[A-Za-z0-9]+$/.test(setupIntentId) ||
      !isSupportedPaymentConsentVersion(payload.payment_consent_version) ||
      typeof payload.request_id !== "string" ||
      !Number.isInteger(payload.estimated_total_cents) || (payload.estimated_total_cents ?? -1) < 0
    ) {
      return NextResponse.json({ error: "Card authorization details are missing." }, { status: 400 });
    }

    try {
      const stripe = new Stripe(stripeSecret);
      const intent = await stripe.setupIntents.retrieve(setupIntentId);
      const intentCustomer = typeof intent.customer === "string" ? intent.customer : intent.customer?.id;
      const intentPaymentMethod = typeof intent.payment_method === "string"
        ? intent.payment_method
        : intent.payment_method?.id;
      const intentMetadata = intent.metadata || {};
      if (
        intent.status !== "succeeded" ||
        intent.usage !== "off_session" ||
        !intentCustomer || !/^cus_[A-Za-z0-9]+$/.test(intentCustomer) ||
        !intentPaymentMethod || !/^pm_[A-Za-z0-9]+$/.test(intentPaymentMethod) ||
        intentMetadata.request_id !== payload.request_id ||
        intentMetadata.brand_key !== brandKey ||
        intentMetadata.estimated_amount_cents !== String(payload.estimated_total_cents) ||
        intentMetadata.payment_consent_version !== payload.payment_consent_version
      ) {
        return NextResponse.json({ error: "Card authorization does not match this order." }, { status: 400 });
      }
      // Use references from the verified Stripe object, never caller-supplied customer data.
      payload.stripe_customer_id = intentCustomer;
      payload.stripe_payment_method_id = intentPaymentMethod;
    } catch (error) {
      console.error("Stripe SetupIntent verification failed", error);
      return NextResponse.json({ error: "Card authorization could not be verified." }, { status: 400 });
    }
  } else if (payload.payment_method !== "invoice") {
    return NextResponse.json({ error: "Select a supported payment method." }, { status: 400 });
  }

  try {
    const response = await fetch(`${omsApiUrl}/commercial-orders/intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Commercial-Order-Key": intakeKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const result = (await response.json().catch(() => ({}))) as {
      data?: {
        request_id?: string;
        commercial_order_request_id?: number;
        status?: string;
      };
      error?: string;
    };
    if (!response.ok || !result.data?.commercial_order_request_id) {
      return NextResponse.json(
        { error: "The order could not be saved. Please try again or contact support." },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    return NextResponse.json(result.data, { status: response.status });
  } catch (error) {
    console.error("OMS commercial order submission failed", error);
    return NextResponse.json(
      { error: "The order could not be saved. Please try again or contact support." },
      { status: 502 },
    );
  }
}
