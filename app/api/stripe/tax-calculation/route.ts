import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getCommercialBrand } from "@/lib/oms-brand";

type TaxCalculationRequest = {
  amountCents?: number;
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid tax calculation request origin." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4_000) {
    return NextResponse.json({ error: "Tax calculation details are too large." }, { status: 413 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid tax calculation request." }, { status: 400 });
  }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json({ error: "Invalid tax calculation request." }, { status: 400 });
  }
  if (new TextEncoder().encode(JSON.stringify(rawBody)).byteLength > 4_000) {
    return NextResponse.json({ error: "Tax calculation details are too large." }, { status: 413 });
  }

  const body = rawBody as TaxCalculationRequest;
  const amountCents = Number(body.amountCents);
  const line1 = typeof body.line1 === "string" ? body.line1.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const state = typeof body.state === "string" ? body.state.trim().toUpperCase() : "";
  const postalCode = typeof body.postalCode === "string" ? body.postalCode.trim() : "";

  if (!Number.isSafeInteger(amountCents) || amountCents < 1) {
    return NextResponse.json(
      { error: "A positive whole-cent taxable amount is required." },
      { status: 400 },
    );
  }
  if (!/^\d{5}$/.test(postalCode)) {
    return NextResponse.json(
      { error: "A valid five-digit property ZIP code is required." },
      { status: 400 },
    );
  }
  if (!line1 || !city || !/^[A-Z]{2}$/.test(state)) {
    return NextResponse.json(
      { error: "A complete property address is required." },
      { status: 400 },
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe Tax is not configured." },
      { status: 503 },
    );
  }

  try {
    const brand = await getCommercialBrand();
    if (!brand.brandConfig || brand.brandConfig.orderFlow !== "commercial") {
      return NextResponse.json(
        { error: "The configured commercial brand is unavailable." },
        { status: 503 },
      );
    }
    const stripe = new Stripe(secretKey);
    const calculation = await stripe.tax.calculations.create({
      currency: "usd",
      customer_details: {
        address: {
          country: "US",
          line1,
          city,
          state,
          postal_code: postalCode,
        },
        address_source: "shipping",
      },
      line_items: [
        {
          amount: amountCents,
          reference: `commercial_services_${brand.brandKey}`,
          tax_behavior: "exclusive",
          // The business treats the complete commercial order as taxable.
          tax_code: "txcd_99999999",
        },
      ],
    });

    return NextResponse.json({
      calculationId: calculation.id,
      taxAmountCents: calculation.tax_amount_exclusive,
      totalAmountCents: calculation.amount_total,
    });
  } catch (error) {
    console.error("Stripe Tax calculation failed", error);
    return NextResponse.json(
      { error: "Sales tax could not be calculated." },
      { status: 502 },
    );
  }
}
