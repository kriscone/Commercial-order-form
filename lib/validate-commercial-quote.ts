import {
  locationMultiplierForItem,
  normalizeZipCode,
  priceForItem,
  pricingAreaForItem,
  type DiscountTier,
  type PricingConfig,
} from "@/lib/pricing";
import type { CommercialBrandConfig } from "@/lib/brand-config";

type CommercialLineItem = {
  item_type?: string;
  key?: string;
  quantity?: number;
  unit_price_cents?: number;
  line_total_cents?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

const fpoDefaultPricingCodes: Record<string, string> = {
  market: "market",
  plan: "plan",
  build: "build",
  walkthrough: "walkthrough",
  "floorplan-tour": "floorplan",
  "photo-tour": "photo",
  photography: "photos_only",
  tour: "scan_3d",
  planner: "floorplan_planner",
  tagging: "item_tagging",
  "site-plan": "site_plan",
  "aerial-mini": "aerial_mini",
  "aerial-full": "aerial_full",
  "aerial-model": "aerial_model",
  cad: "cad",
  "roof-plan": "roof",
  "reflected-ceiling": "rcp",
  "3d-model": "model_3d",
  "exterior-elevations": "elevations",
  "cinematic-video": "video_bundle",
  "cinematic-portrait": "video_portrait",
  "cinematic-horizontal": "video_horizontal",
  "additional-pro-photos": "additional_photos",
};

function configuredRulePriceCents(
  rule: Record<string, unknown>,
  squareFeet: number,
  landAreaAcres: number,
  zipCode: string,
): number {
  const pricingType = rule.pricingType;
  const basePrice = Number(rule.basePrice);
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new Error("A configured pricing rule is missing a valid base price.");
  }
  const area = pricingType === "per_half_acre"
    ? Math.max(0, landAreaAcres) * 43_560
    : Math.max(0, squareFeet);
  const baseCoverage = Number(rule.baseCoverage ?? 0);
  const incrementSize = Number(rule.incrementSize ?? 0);
  const incrementPrice = Number(rule.incrementPrice ?? 0);
  let subtotal = basePrice;

  if (pricingType === "per_1000_sqft" || pricingType === "per_half_acre") {
    if (incrementSize <= 0 || !Number.isFinite(incrementPrice) || incrementPrice < 0) {
      throw new Error("A configured area pricing rule needs a positive increment size and a valid increment price.");
    }
    const increments = incrementSize > 0
      ? Math.max(0, Math.ceil((area - baseCoverage) / incrementSize))
      : 0;
    for (let index = 0; index < increments; index += 1) {
      let discount = 0;
      if (pricingType === "per_1000_sqft") {
        const incrementEnd = baseCoverage + (index + 1) * incrementSize;
        const tiers = Array.isArray(rule.discountTiers) ? rule.discountTiers as DiscountTier[] : [];
        const tier = tiers.find((candidate) =>
          incrementEnd > Number(candidate.minSqFt) && incrementEnd <= Number(candidate.maxSqFt),
        );
        discount = Number(tier?.discountPercent ?? 0);
      }
      subtotal += incrementPrice * (1 - discount);
    }
  }

  const multipliers = rule.locationMultipliers && typeof rule.locationMultipliers === "object"
    ? rule.locationMultipliers as Record<string, number>
    : {};
  const multiplier = Number(multipliers[zipCode] ?? 1);
  return Math.round(Math.round(subtotal * multiplier) * 100);
}

function expectedPriceCents(
  line: CommercialLineItem,
  brandKey: string,
  brandConfig: CommercialBrandConfig | null,
  pricingConfig: PricingConfig,
  squareFeet: number,
  landAreaAcres: number,
  zipCode: string,
): number {
  const itemType = line.item_type;
  const key = String(line.key || "");
  const catalog = brandConfig?.catalog;
  const catalogKind = itemType === "product" ? "products" : itemType === "service" ? "services" : "addons";
  const configuredEntries = catalog?.[catalogKind] || [];
  const entry = configuredEntries.find((candidate) => candidate.key === key && candidate.active !== false);
  const hasAnyCatalogEntries = Boolean(
    catalog && (catalog.products?.length || catalog.services?.length || catalog.addons?.length),
  );

  if (entry && typeof entry.price === "number") return Math.round(entry.price * 100);
  const metadata = asRecord(entry?.metadata);
  const pricingRule = asRecord(metadata?.pricing);
  if (entry && pricingRule) {
    return configuredRulePriceCents(
      pricingRule,
      squareFeet,
      landAreaAcres,
      zipCode,
    );
  }

  let pricingCode = entry
    ? String(metadata?.pricingCode || "")
    : "";
  if (!entry && brandKey === "floorplanonline" && !hasAnyCatalogEntries) {
    if (key === "components-only") return 0;
    pricingCode = fpoDefaultPricingCodes[key] || "";
  }
  if (!pricingCode) {
    throw new Error(`No server-side price is configured for selected item "${key}".`);
  }

  const pricingItem = pricingConfig.items.find((candidate) => candidate.code === pricingCode && candidate.active);
  if (!pricingItem) {
    throw new Error(`Selected item "${key}" has no active server-side pricing rule.`);
  }
  const area = pricingAreaForItem(pricingItem, squareFeet, landAreaAcres);
  const locationMultiplier = Number(pricingConfig.locationMultipliers[zipCode] ?? 1);
  return Math.round(priceForItem(
    pricingItem,
    area,
    pricingConfig.discountTiers,
    locationMultiplierForItem(pricingItem, locationMultiplier),
  ) * 100);
}

export function validateCommercialQuote(
  payload: Record<string, unknown>,
  brandKey: string,
  brandConfig: CommercialBrandConfig | null,
  pricingConfig: PricingConfig,
): void {
  const lineItems = asRecord(payload.order_payload)?.line_items;
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    throw new Error("The commercial quote is missing its priced line items.");
  }
  const squareFeet = Math.max(0, Number(payload.building_sq_ft) || 0);
  const landAreaAcres = Math.max(0, Number(payload.land_area_acres) || 0);
  const zipCode = normalizeZipCode(String(payload.zip || ""));
  let subtotalCents = 0;

  for (const rawLine of lineItems as unknown[]) {
    const line = asRecord(rawLine) as CommercialLineItem | null;
    if (!line) throw new Error("The commercial quote contains an invalid line item.");
    const quantity = Number(line.quantity);
    const unitPriceCents = Number(line.unit_price_cents);
    const lineTotalCents = Number(line.line_total_cents);
    if (!Number.isInteger(quantity) || quantity < 1 || !Number.isInteger(unitPriceCents) ||
        unitPriceCents < 0 || !Number.isInteger(lineTotalCents)) {
      throw new Error("The commercial quote contains invalid line item amounts.");
    }
    const expectedCents = expectedPriceCents(
      line,
      brandKey,
      brandConfig,
      pricingConfig,
      squareFeet,
      landAreaAcres,
      zipCode,
    );
    const isPhotoPack = brandKey === "floorplanonline" && line.key === "additional-pro-photos";
    const catalogKind = line.item_type === "product" ? "products" :
      line.item_type === "service" ? "services" : "addons";
    const catalogItem = brandConfig?.catalog?.[catalogKind]?.find((candidate) =>
      candidate.key === line.key && candidate.active !== false,
    );
    const catalogMetadata = asRecord(catalogItem?.metadata);
    const catalogRule = asRecord(catalogMetadata?.pricing);
    const allowsQuantity = line.item_type === "addon" && (
      catalogMetadata?.allowQuantity === true || catalogRule?.pricingType === "quantity"
    );
    if ((!isPhotoPack && !allowsQuantity && quantity !== 1) ||
        (isPhotoPack && quantity > 1000) ||
        (allowsQuantity && quantity > 10000) ||
        unitPriceCents !== expectedCents ||
        lineTotalCents !== expectedCents * quantity) {
      throw new Error(`The quoted price for "${String(line.key || "item")}" no longer matches current pricing.`);
    }
    subtotalCents += lineTotalCents;
  }

  const declaredSubtotalCents = Number(payload.estimated_subtotal_cents);
  if (!Number.isSafeInteger(declaredSubtotalCents) || subtotalCents !== declaredSubtotalCents) {
    throw new Error("The quoted subtotal does not match current commercial pricing.");
  }
}
