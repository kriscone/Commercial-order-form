import { NextResponse } from "next/server";
import Stripe from "stripe";
import { COMMERCIAL_PAYMENT_CONSENT_VERSION } from "@/lib/payment-consent";
import { getCommercialBrand, getCommercialBrandName } from "@/lib/oms-brand";

type SetupRequest = {
  billingName?: string;
  billingEmail?: string;
  company?: string;
  project?: string;
  propertyType?: string;
  squareFeet?: number;
  landAreaAcres?: number;
  zipCode?: string;
  selection?: string;
  estimatedAmountCents?: number;
  salesTaxCents?: number;
  taxCalculationId?: string;
  requestId?: string;
  paymentConsentVersion?: string;
};

function metadataValue(value: unknown) {
  return String(value ?? "").slice(0, 450);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid payment setup request origin." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 20_000) {
    return NextResponse.json({ error: "Payment setup details are too large." }, { status: 413 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey =
    process.env.STRIPE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  try {
    const rawBody = await request.json();
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json({ error: "Invalid payment setup request." }, { status: 400 });
    }
    if (new TextEncoder().encode(JSON.stringify(rawBody)).byteLength > 20_000) {
      return NextResponse.json({ error: "Payment setup details are too large." }, { status: 413 });
    }
    const body = rawBody as SetupRequest;
    const billingName = typeof body.billingName === "string" ? body.billingName.trim() : "";
    const billingEmail = typeof body.billingEmail === "string" ? body.billingEmail.trim() : "";
    const estimatedAmountCents = Number(body.estimatedAmountCents);

    if (!billingName || !billingEmail || !billingEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid billing name and email are required." },
        { status: 400 },
      );
    }
    if (
      !body.requestId || !/^[0-9a-f-]{36}$/i.test(body.requestId) ||
      body.paymentConsentVersion !== COMMERCIAL_PAYMENT_CONSENT_VERSION ||
      !Number.isSafeInteger(estimatedAmountCents) || estimatedAmountCents < 1
    ) {
      return NextResponse.json(
        { error: "A valid order reference and estimate are required." },
        { status: 400 },
      );
    }

    const brand = await getCommercialBrand();
    if (!brand.brandConfig || brand.brandConfig.orderFlow !== "commercial") {
      return NextResponse.json(
        { error: "The configured commercial brand is unavailable." },
        { status: 503 },
      );
    }
    const brandName = getCommercialBrandName(brand.brandKey, brand.brandConfig);
    const stripe = new Stripe(secretKey);
    const orderMetadata = {
      source: "commercial_order_form",
      brand_key: brand.brandKey,
      request_id: metadataValue(body.requestId),
      company: metadataValue(body.company),
      project: metadataValue(body.project),
      property_type: metadataValue(body.propertyType),
      building_sq_ft: metadataValue(body.squareFeet),
      land_area_acres: metadataValue(body.landAreaAcres),
      zip_code: metadataValue(body.zipCode),
      selection: metadataValue(body.selection),
      estimated_amount_cents: metadataValue(estimatedAmountCents),
      payment_method: "card_or_ach",
      sales_tax_cents: metadataValue(body.salesTaxCents),
      tax_calculation_id: metadataValue(body.taxCalculationId),
      payment_consent_version: COMMERCIAL_PAYMENT_CONSENT_VERSION,
    };

    const customer = await stripe.customers.create({
      name: billingName,
      email: billingEmail,
      description: `${brandName} commercial request: ${metadataValue(body.project)}`,
      metadata: orderMetadata,
    });

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: "off_session",
      payment_method_types: ["card", "us_bank_account"],
      payment_method_options: {
        us_bank_account: { verification_method: "instant" },
      },
      metadata: orderMetadata,
    });

    if (!setupIntent.client_secret) {
      throw new Error("Stripe did not return a client secret.");
    }

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      publishableKey,
    });
  } catch (error) {
    console.error("Stripe SetupIntent creation failed", error);
    return NextResponse.json(
      { error: "Stripe could not start payment verification." },
      { status: 500 },
    );
  }
}
