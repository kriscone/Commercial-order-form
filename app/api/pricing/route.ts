import { fallbackPricingConfig } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  const scriptUrl = process.env.GOOGLE_PRICING_SCRIPT_URL;
  if (!scriptUrl) {
    return Response.json(fallbackPricingConfig, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const response = await fetch(`${scriptUrl}?action=config`, {
      cache: "no-store",
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`Pricing script returned ${response.status}`);
    const config = await response.json();
    return Response.json({ ...config, source: "google-sheet" }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Google pricing script unavailable; using fallback pricing.", error);
    return Response.json(fallbackPricingConfig, {
      headers: { "Cache-Control": "no-store", "X-Pricing-Fallback": "1" },
    });
  }
}
