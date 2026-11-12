import { fallbackPricingConfig, type PricingConfig } from "@/lib/pricing";
import type { CommercialBrandConfig } from "@/lib/brand-config";

export function validateBrandPricingRules(catalog?: CommercialBrandConfig["catalog"]): void {
  for (const item of [
    ...(catalog?.products || []),
    ...(catalog?.services || []),
    ...(catalog?.addons || []),
  ]) {
    if (item.active === false || !item.metadata?.pricing) continue;
    const rule = item.metadata.pricing;
    if (!rule || typeof rule !== "object" ||
        !["per_1000_sqft", "per_half_acre", "flat", "quantity"].includes(String(rule.pricingType)) ||
        rule.basePrice === null || rule.basePrice === undefined || rule.basePrice === "" ||
        !Number.isFinite(Number(rule.basePrice)) || Number(rule.basePrice) < 0) {
      throw new Error(`Brand pricing rule for ${item.key} is incomplete.`);
    }
    if (["per_1000_sqft", "per_half_acre"].includes(String(rule.pricingType)) &&
        (!Number.isFinite(Number(rule.incrementSize)) || Number(rule.incrementSize) <= 0 ||
          rule.incrementPrice === null || rule.incrementPrice === undefined || rule.incrementPrice === "" ||
          !Number.isFinite(Number(rule.incrementPrice)) || Number(rule.incrementPrice) < 0)) {
      throw new Error(`Area pricing rule for ${item.key} needs a positive increment size and non-negative increment price.`);
    }
  }
}

export function catalogNeedsSharedPricing(catalog?: CommercialBrandConfig["catalog"]): boolean {
  const entries = [
    ...(catalog?.products || []),
    ...(catalog?.services || []),
    ...(catalog?.addons || []),
  ];
  return entries.some((entry) => {
    const metadata = entry.metadata || {};
    return entry.active !== false && typeof entry.price !== "number" &&
      !metadata.pricing && typeof metadata.pricingCode === "string" &&
      metadata.pricingCode.trim() !== "";
  });
}

export async function getPricingConfig(failClosed = false): Promise<PricingConfig> {
  const scriptUrl = process.env.GOOGLE_PRICING_SCRIPT_URL;
  if (!scriptUrl) return fallbackPricingConfig;

  try {
    const response = await fetch(`${scriptUrl}?action=config`, {
      cache: "no-store",
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`Pricing script returned ${response.status}`);
    const config = await response.json() as PricingConfig;
    if (!config || !Array.isArray(config.items) ||
        !Array.isArray(config.discountTiers) ||
        !config.locationMultipliers || typeof config.locationMultipliers !== "object") {
      throw new Error("Pricing script returned an invalid configuration");
    }
    return config;
  } catch (error) {
    if (failClosed) throw error;
    console.error("Google pricing script unavailable; using fallback pricing.", error);
    return fallbackPricingConfig;
  }
}
