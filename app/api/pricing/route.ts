import { catalogNeedsSharedPricing, getPricingConfig, validateBrandPricingRules } from "@/lib/pricing-config";
import type { PricingConfig } from "@/lib/pricing";
import { getCommercialBrand } from "@/lib/oms-brand";

export const dynamic = "force-dynamic";

export async function GET() {
  const brand = await getCommercialBrand();
  const catalog = brand.brandConfig?.catalog;
  try {
    validateBrandPricingRules(catalog);
  } catch {
    return Response.json(
      { error: "A brand pricing rule is incomplete. Update the commercial catalog in OMS before checkout." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const hasConfiguredCatalog = Boolean(
    catalog && ((catalog.products?.length ?? 0) > 0 ||
      (catalog.services?.length ?? 0) > 0 ||
      (catalog.addons?.length ?? 0) > 0),
  );
  const hasActiveCatalogItems = Boolean(
    catalog && [...(catalog.products || []), ...(catalog.services || []), ...(catalog.addons || [])]
      .some((item) => item.active !== false),
  );
  if (!brand.brandConfig || brand.brandConfig.orderFlow !== "commercial" ||
      (brand.brandKey !== "floorplanonline" && !hasActiveCatalogItems)) {
    return Response.json(
      { error: "A commercial brand catalog must be configured in OMS before checkout." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const useFpoDefaults = brand.brandKey === "floorplanonline" && !hasConfiguredCatalog;
  const needsSharedPricing = catalogNeedsSharedPricing(catalog) || useFpoDefaults;
  if (needsSharedPricing && !process.env.GOOGLE_PRICING_SCRIPT_URL && !useFpoDefaults) {
    return Response.json(
      { error: "The shared pricing sheet is not configured for this brand." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  let config: PricingConfig;
  try {
    config = await getPricingConfig(needsSharedPricing);
  } catch (error) {
    console.error("Commercial pricing configuration is unavailable", error);
    return Response.json(
      { error: "Current commercial pricing could not be verified." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json({
    ...config,
    brandCatalog: brand.brandConfig?.catalog,
    brandKey: brand.brandKey,
    brandConfig: brand.brandConfig,
    useFpoDefaults,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
