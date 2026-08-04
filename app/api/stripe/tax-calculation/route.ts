import { NextResponse } from "next/server";
import Stripe from "stripe";

type TaxCalculationRequest = {
  amountCents?: number;
  postalCode?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TaxCalculationRequest;
    const amountCents = Math.round(Number(body.amountCents));
    const postalCode = String(body.postalCode ?? "").trim();

    if (!Number.isFinite(amountCents) || amountCents < 1) {
      return NextResponse.json(
        { error: "A positive taxable amount is required." },
        { status: 400 },
      );
    }
    if (!/^\d{5}$/.test(postalCode)) {
      return NextResponse.json(
        { error: "A valid five-digit property ZIP code is required." },
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

    const stripe = new Stripe(secretKey);
    const calculation = await stripe.tax.calculations.create({
      currency: "usd",
      customer_details: {
        address: {
          country: "US",
          postal_code: postalCode,
        },
        address_source: "shipping",
      },
      line_items: [
        {
          amount: amountCents,
          reference: "fpo_commercial_services",
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
