import { NextResponse } from "next/server";
import Stripe from "stripe";

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
  paymentMethod?: "card" | "bank";
};

function metadataValue(value: unknown) {
  return String(value ?? "").slice(0, 450);
}

export async function POST(request: Request) {
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
    const body = (await request.json()) as SetupRequest;
    const billingName = body.billingName?.trim();
    const billingEmail = body.billingEmail?.trim();
    const paymentMethod = body.paymentMethod === "bank" ? "bank" : "card";

    if (!billingName || !billingEmail || !billingEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid billing name and email are required." },
        { status: 400 },
      );
    }

    const stripe = new Stripe(secretKey);
    const orderMetadata = {
      source: "fpo_commercial_order_form",
      company: metadataValue(body.company),
      project: metadataValue(body.project),
      property_type: metadataValue(body.propertyType),
      building_sq_ft: metadataValue(body.squareFeet),
      land_area_acres: metadataValue(body.landAreaAcres),
      zip_code: metadataValue(body.zipCode),
      selection: metadataValue(body.selection),
      estimated_amount_cents: metadataValue(body.estimatedAmountCents),
      payment_method: paymentMethod,
    };

    const customer = await stripe.customers.create({
      name: billingName,
      email: billingEmail,
      description: `FloorPlanOnline commercial request: ${metadataValue(body.project)}`,
      metadata: orderMetadata,
    });

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: "off_session",
      payment_method_types: [
        paymentMethod === "bank" ? "us_bank_account" : "card",
      ],
      payment_method_options:
        paymentMethod === "bank"
          ? { us_bank_account: { verification_method: "instant" } }
          : undefined,
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
