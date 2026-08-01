export type PricingType = "per_1000_sqft" | "per_half_acre" | "flat" | "quantity";

export type PricingItem = {
  code: string;
  category: string;
  displayName: string;
  pricingType: PricingType;
  baseCoverage: number;
  basePrice: number;
  incrementSize: number;
  incrementPrice: number;
  active: boolean;
  sortOrder: number;
  description: string;
};

export type DiscountTier = {
  minSqFt: number;
  maxSqFt: number;
  discountPercent: number;
  label: string;
};

export type PricingConfig = {
  items: PricingItem[];
  discountTiers: DiscountTier[];
  locationMultipliers: Record<string, number>;
  source: "google-sheet" | "fallback";
  updatedAt?: string;
};

const item = (
  code: string,
  category: string,
  displayName: string,
  pricingType: PricingType,
  baseCoverage: number,
  basePrice: number,
  incrementSize: number,
  incrementPrice: number,
  sortOrder: number,
): PricingItem => ({
  code,
  category,
  displayName,
  pricingType,
  baseCoverage,
  basePrice,
  incrementSize,
  incrementPrice,
  active: true,
  sortOrder,
  description: "",
});

const nycZipCodes = [
  "10001", "10002", "10003", "10004", "10005", "10006", "10007", "10009",
  "10010", "10011", "10012", "10013", "10014", "10016", "10017", "10018",
  "10019", "10020", "10021", "10022", "10023", "10024", "10025", "10026",
  "10027", "10028", "10029", "10030", "10031", "10032", "10033", "10034",
  "10035", "10036", "10037", "10038", "10039", "10040", "10044", "10065",
  "10069", "10075", "10103", "10104", "10105", "10106", "10107", "10110",
  "10111", "10112", "10115", "10118", "10119", "10120", "10121", "10123",
  "10128", "10151", "10152", "10153", "10154", "10155", "10158", "10162",
  "10165", "10166", "10167", "10168", "10169", "10170", "10171", "10172",
  "10173", "10174", "10175", "10176", "10177", "10270", "10271", "10278",
  "10279", "10280", "10281", "10282",
];

export const fallbackPricingConfig: PricingConfig = {
  source: "fallback",
  items: [
    item("market", "all_inclusive", "Market", "per_1000_sqft", 2000, 799, 1000, 200, 10),
    item("plan", "all_inclusive", "Plan", "per_1000_sqft", 2000, 1099, 1000, 300, 20),
    item("build", "all_inclusive", "Build", "per_1000_sqft", 2000, 1999, 1000, 500, 30),
    item("walkthrough", "core_tour", "3D Walkthrough Tour", "per_1000_sqft", 2000, 499, 1000, 200, 10),
    item("floorplan", "core_tour", "FloorPlan Tour", "per_1000_sqft", 2000, 399, 1000, 150, 20),
    item("photo", "core_tour", "Photo Tour", "flat", 2000, 349, 0, 0, 30),
    item("photos_only", "ala_carte", "Photos Only", "flat", 2000, 299, 0, 0, 10),
    item("scan_3d", "ala_carte", "3D Tour/Scan", "per_1000_sqft", 2000, 399, 1000, 100, 20),
    item("floorplan_planner", "ala_carte", "2D/3D Floor Plans + Space Planner", "per_1000_sqft", 2000, 299, 1000, 100, 30),
    item("additional_photos", "addon", "Additional Pro photos (5)", "quantity", 0, 50, 1, 50, 5),
    item("item_tagging", "addon", "Item Tagging", "per_1000_sqft", 2000, 100, 1000, 25, 10),
    item("site_plan", "addon", "Site Plan + 3D Site Planning Tool", "per_half_acre", 21780, 300, 21780, 100, 20),
    item("aerial_mini", "addon", "Aerial Mini Shoot", "flat", 0, 199, 0, 0, 30),
    item("aerial_full", "addon", "Aerial Full Shoot", "flat", 0, 299, 0, 0, 40),
    item("aerial_model", "addon", "Aerial Photo/Video + 3D Aerial Model", "per_half_acre", 21780, 999, 21780, 200, 50),
    item("cad", "addon", "CAD Files (DWG)", "per_1000_sqft", 2000, 80, 1000, 50, 60),
    item("roof", "addon", "Roof Plan", "per_1000_sqft", 2000, 120, 1000, 60, 70),
    item("rcp", "addon", "Reflected Ceiling Plan", "per_1000_sqft", 2000, 120, 1000, 60, 80),
    item("elevations", "addon", "Exterior Elevations", "per_1000_sqft", 2000, 120, 1000, 60, 90),
    item("model_3d", "addon", "3D Model", "per_1000_sqft", 2000, 250, 1000, 150, 100),
    item("video_bundle", "addon", "Cinematic Video Bundle", "flat", 0, 300, 0, 0, 110),
    item("video_portrait", "addon", "Cinematic Video (Vertical)", "flat", 0, 150, 0, 0, 120),
    item("video_horizontal", "addon", "Cinematic Video (Horizontal)", "flat", 0, 150, 0, 0, 130),
  ],
  discountTiers: [
    { minSqFt: 0, maxSqFt: 10000, discountPercent: 0, label: "Up to 10,000 sq ft" },
    { minSqFt: 10000, maxSqFt: 30000, discountPercent: 0.2, label: "Over 10,000 to 30,000 sq ft" },
    { minSqFt: 30000, maxSqFt: 50000, discountPercent: 0.3, label: "Over 30,000 to 50,000 sq ft" },
    { minSqFt: 50000, maxSqFt: 100000, discountPercent: 0.45, label: "Over 50,000 to 100,000 sq ft" },
    { minSqFt: 100000, maxSqFt: 999999999, discountPercent: 0.55, label: "Over 100,000 sq ft" },
  ],
  locationMultipliers: Object.fromEntries(nycZipCodes.map((zip) => [zip, 2])),
};

const locationMultiplierExemptCodes = new Set([
  "cad",
  "roof",
  "rcp",
  "elevations",
  "model_3d",
  "video_bundle",
  "video_portrait",
  "video_horizontal",
]);

export function locationMultiplierForItem(
  pricingItem: PricingItem | undefined,
  locationMultiplier = 1,
) {
  return pricingItem && locationMultiplierExemptCodes.has(pricingItem.code)
    ? 1
    : locationMultiplier;
}

export function pricingAreaForItem(
  pricingItem: PricingItem | undefined,
  buildingSquareFeet: number,
  landAreaAcres: number,
) {
  if (pricingItem?.pricingType === "per_half_acre") {
    return Math.max(0, landAreaAcres || 0) * 43_560;
  }
  return buildingSquareFeet;
}

export function priceForItem(
  pricingItem: PricingItem | undefined,
  squareFeet: number,
  tiers: DiscountTier[],
  locationMultiplier = 1,
) {
  if (!pricingItem) return 0;
  const sqft = Math.max(0, squareFeet || 0);
  let subtotal = pricingItem.basePrice;

  if (pricingItem.pricingType === "per_1000_sqft") {
    const incrementCount = Math.max(
      0,
      Math.ceil((sqft - pricingItem.baseCoverage) / pricingItem.incrementSize),
    );
    for (let index = 0; index < incrementCount; index += 1) {
      const incrementEnd = pricingItem.baseCoverage + (index + 1) * pricingItem.incrementSize;
      const tier = tiers.find(
        (candidate) => incrementEnd > candidate.minSqFt && incrementEnd <= candidate.maxSqFt,
      );
      subtotal += pricingItem.incrementPrice * (1 - (tier?.discountPercent ?? 0));
    }
  } else if (pricingItem.pricingType === "per_half_acre") {
    const increments = Math.max(
      0,
      Math.ceil((sqft - pricingItem.baseCoverage) / pricingItem.incrementSize),
    );
    subtotal += increments * pricingItem.incrementPrice;
  }

  return Math.round(
    subtotal * locationMultiplierForItem(pricingItem, locationMultiplier),
  );
}

export function normalizeZipCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}
