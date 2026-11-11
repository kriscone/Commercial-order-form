"use client";

import { useEffect, useMemo, useState } from "react";
import { StripePaymentSetup } from "@/app/components/stripe-card-setup";
import { COMMERCIAL_PAYMENT_CONSENT_VERSION } from "@/lib/payment-consent";
import { brandLogoForForm, fallbackBrandName, type CommercialBrandConfig } from "@/lib/brand-config";
import {
  fallbackPricingConfig,
  inferLandAreaUnit,
  landAreaToAcres,
  locationMultiplierForItem,
  normalizeZipCode,
  normalizeAcreShorthand,
  pricingAreaForItem,
  priceForItem,
  type PricingConfig,
} from "@/lib/pricing";

type PackageId = string;
type PaymentMethod = "stripe" | "invoice";
type LandAreaUnit = "acres" | "square_feet";
type TourOptionId = string;

type CatalogEntry = {
  key: string;
  name: string;
  description?: string;
  price?: number;
  active?: boolean;
  metadata?: Record<string, any>;
};

type CommercialCatalog = {
  products: CatalogEntry[];
  services: CatalogEntry[];
  addons: CatalogEntry[];
};

type ActivePackage = {
  id: string;
  pricingCode: string;
  name: string;
  description: string;
  eyebrow: string;
  includes: string[];
  recommended?: boolean;
  price?: number;
  metadata?: Record<string, any>;
};

type ActiveTourOption = {
  id: string;
  pricingCode: string;
  name: string;
  detail: string;
  includes: string[];
  price?: number;
  metadata?: Record<string, any>;
};

type ActiveSelectableItem = {
  id: string;
  pricingCode: string;
  name: string;
  detail: string;
  type: string;
  price?: number;
  requirements?: string[];
  metadata?: Record<string, any>;
};

const propertyTypes = [
  "Office",
  "Retail",
  "Industrial",
  "Multifamily",
  "Hospitality",
  "Healthcare",
  "Mixed-use",
  "Special-purpose",
];

const packages = [
  {
    id: "market" as const,
    pricingCode: "market",
    name: "Market",
    eyebrow: "Capture & showcase",
    description:
      "Professional property capture for marketing, leasing and stakeholder review.",
    includes: [
      "Professional Photos + 3D Tour",
      "iGUIDE scan & 2D floor plan",
      "Aerial Mini Shoot (5 photos)",
      "Cinematic Video (horizontal + vertical)",
      "FloorPlanOnline Tour + 12 months hosting",
    ],
  },
  {
    id: "plan" as const,
    pricingCode: "plan",
    name: "Plan",
    eyebrow: "Visualize & collaborate",
    description:
      "Adds interactive planning, site context and flexible floor plan files to the Market package.",
    includes: [
      "Everything in Market",
      "Additional Snapshot Photos",
      "Item tagging of mechanicals",
      "Interactive 2D/3D floor plan + 3D Space Planner",
      "Site Plan + 3D site planning tool",
      "DXF file download",
      "Aerial full shoot",
    ],
    recommended: true,
  },
  {
    id: "build" as const,
    pricingCode: "build",
    name: "Build",
    eyebrow: "Document & execute",
    description:
      "A complete commercial documentation package with aerial modeling and advanced drawing deliverables.",
    includes: [
      "Everything in Plan",
      "Full aerial Photo/Video shoot + 3D aerial model",
      "CAD files (DWG)",
      "3D Model (Revit or DWG)",
      "Roof Plan",
      "Reflected Ceiling Plan",
    ],
  },
];

const customTourOptions = [
  {
    id: "walkthrough" as const,
    pricingCode: "walkthrough",
    name: "3D Walkthrough Tour",
    detail:
      "Pro photos + floor plans + 3D tour; additional Pro photos as size increases",
    includes: [
      "Everything in the FloorPlan Tour",
      "3D property scan and guided walkthrough with 24/7 online access",
      "Online measuring tools and VR-ready viewing",
      "Downloadable offline 3D Tour",
    ],
  },
  {
    id: "floorplan-tour" as const,
    pricingCode: "floorplan",
    name: "FloorPlan Tour",
    detail:
      "Interactive floor plan tour; additional Pro photos as size increases",
    includes: [
      "Everything in the Photo Tour",
      "2D point-and-click floor plans with photo hotspots",
      "3D Space Planner for commercial layouts",
      "Area report and DXF file download",
      "Shareable plans for owners, tenants, prospects, and project teams",
    ],
  },
  {
    id: "photo-tour" as const,
    pricingCode: "photo",
    name: "Photo Tour",
    detail: "25 professional photos; fixed photo count",
    includes: [
      "Tour and Brandkeeper for added exposure on property portals",
      "Professional photography with Blue Sky editing",
      "Editable slideshow video",
      "Brochure builder",
      "Shareable hosted property presentation",
    ],
  },
  {
    id: "components-only" as const,
    pricingCode: "",
    name: "À la carte options",
    detail: "Choose individual core services instead of a foundation tour",
    includes: [],
  },
];

const customDeliverables = [
  {
    id: "photography",
    pricingCode: "photos_only",
    name: "Photos only",
    detail: "Up to 25 professional photos",
    type: "flat",
  },
  {
    id: "tour",
    pricingCode: "scan_3d",
    name: "3D Tour / Scan",
    detail: "iGUIDE 3D scan with a 2D floor plan",
    type: "scaled",
  },
  {
    id: "planner",
    pricingCode: "floorplan_planner",
    name: "2D/3D floor plans + space planner",
    detail: "Interactive plans, space planning tools and DXF file download",
    type: "scaled",
  },
  {
    id: "tagging",
    pricingCode: "item_tagging",
    name: "Item Tagging",
    detail:
      "We tag HVAC, plumbing, gas, electrical panels, technology racks and other important property components.",
    type: "scaled",
  },
  {
    id: "site-plan",
    pricingCode: "site_plan",
    name: "Site Plan + 3D site planning tool",
    detail:
      "A detailed exterior site plan added as a level in the 3D Walkthrough and Space Planner. Includes high-quality JPGs for marketing and covers up to 1/2 acre.",
    type: "half-acre",
  },
  {
    id: "aerial-mini",
    pricingCode: "aerial_mini",
    name: "Aerial mini shoot",
    detail:
      "Five aerial images captured during the regular appointment, subject to flight restrictions and weather.",
    type: "flat",
  },
  {
    id: "aerial-full",
    pricingCode: "aerial_full",
    name: "Aerial Full Shoot",
    detail:
      "Fifteen aerial images from an FAA-licensed and insured UAV pilot—ideal for larger sites and view properties.",
    type: "flat",
  },
  {
    id: "aerial-model",
    pricingCode: "aerial_model",
    name: "Full Aerial Photo/Video Shoot + 3D Aerial Model",
    detail:
      "Aerial video, 15 aerial photos and a 3D property model from an FAA-licensed UAV pilot. Allow 2–4 business days for the video and model.",
    type: "half-acre",
  },
  {
    id: "cad",
    pricingCode: "cad",
    name: "CAD files (DWG)",
    detail:
      "Drafted DWG floor plans and LiDAR point-cloud data for every floor, giving architects, designers and contractors a head start. Generally available two days after the original iGUIDE is published.",
    type: "scaled",
  },
  {
    id: "roof-plan",
    pricingCode: "roof",
    name: "Roof Plan",
    detail:
      "Drafted roof plan in DWG format showing slopes and roof edges of the primary structure. Requires iGUIDE Premium or an Advanced Drawing Package.",
    type: "scaled",
  },
  {
    id: "reflected-ceiling",
    pricingCode: "rcp",
    name: "Reflected Ceiling Plan",
    detail:
      "Drafted DWG ceiling plan with bulkheads, lighting and ceiling-height indicators. Requires iGUIDE Premium or an Advanced Drawing Package.",
    type: "scaled",
  },
  {
    id: "3d-model",
    pricingCode: "model_3d",
    name: "3D Model (Revit or DWG)",
    detail:
      "A drafted Revit or DWG model with walls, doors, windows and basic structural elements. Requires iGUIDE Premium or an Advanced Drawing Package.",
    type: "scaled",
  },
  {
    id: "exterior-elevations",
    pricingCode: "elevations",
    name: "Exterior Elevations",
    detail:
      "Drafted DWG exterior elevations showing the front, rear and side building façades.",
    type: "scaled",
  },
  {
    id: "cinematic-video",
    pricingCode: "video_bundle",
    name: "Cinematic Video Bundle",
    detail:
      "We turn the property photos into horizontal and vertical videos hosted on Vimeo for separate use.",
    type: "flat",
  },
  {
    id: "cinematic-portrait",
    pricingCode: "video_portrait",
    name: "Cinematic Video (Vertical)",
    detail:
      "We convert the property photos into a vertical video hosted on Vimeo for separate use.",
    type: "flat",
  },
  {
    id: "cinematic-horizontal",
    pricingCode: "video_horizontal",
    name: "Cinematic Video (Horizontal)",
    detail:
      "We convert the property photos into a horizontal video hosted on Vimeo for separate use.",
    type: "flat",
  },
];

const aLaCarteIds = ["photography", "tour", "planner"];
const aLaCarteDeliverables = customDeliverables.filter((item) =>
  aLaCarteIds.includes(item.id),
);
const customAddons = customDeliverables.filter(
  (item) => !aLaCarteIds.includes(item.id),
);
const floorPlanAddonIds = new Set([
  "site-plan",
  "cad",
  "roof-plan",
  "reflected-ceiling",
  "3d-model",
  "exterior-elevations",
]);
const exclusiveAddonGroups = [
  ["aerial-mini", "aerial-full", "aerial-model"],
  ["cinematic-video", "cinematic-portrait", "cinematic-horizontal"],
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function Home() {
  const [propertyType, setPropertyType] = useState("Office");
  const [squareFeet, setSquareFeet] = useState(10000);
  const [landAreaValue, setLandAreaValue] = useState(0.5);
  const [landAreaUnit, setLandAreaUnit] = useState<LandAreaUnit>("acres");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [propertyCity, setPropertyCity] = useState("");
  const [propertyState, setPropertyState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(
    fallbackPricingConfig,
  );
  const [brandCatalog, setBrandCatalog] = useState<CommercialCatalog | null>(null);
  const [catalogBrandKey, setCatalogBrandKey] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [brandConfig, setBrandConfig] = useState<CommercialBrandConfig | null>(null);
  const [packageId, setPackageId] = useState<PackageId>("custom");
  const [customTour, setCustomTour] =
    useState<TourOptionId>("walkthrough");
  const [selectedCustom, setSelectedCustom] = useState<string[]>([]);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [additionalPhotoPacks, setAdditionalPhotoPacks] = useState(0);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("stripe");
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripePreparing, setStripePreparing] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [salesTax, setSalesTax] = useState(0);
  const [taxCalculationId, setTaxCalculationId] = useState("");
  const [taxStatus, setTaxStatus] = useState<
    "idle" | "loading" | "ready" | "unavailable"
  >("idle");
  const [submitted, setSubmitted] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [submittedOrderId, setSubmittedOrderId] = useState<number | null>(null);
  const [orderRequestId] = useState(() => crypto.randomUUID());
  const landAreaAcres = landAreaToAcres(landAreaValue, landAreaUnit);

  function changeLandAreaUnit(nextUnit: LandAreaUnit) {
    if (nextUnit === landAreaUnit) return;
    setLandAreaValue((currentValue) =>
      nextUnit === "square_feet"
        ? Math.round(currentValue * 43_560)
        : Number((currentValue / 43_560).toFixed(3)),
    );
    setLandAreaUnit(nextUnit);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/pricing")
      .then((response) => {
        if (!response.ok) throw new Error("Commercial catalog unavailable");
        return response.json();
      })
      .then((config: PricingConfig & { brandCatalog?: CommercialCatalog; brandKey?: string; brandConfig?: CommercialBrandConfig | null }) => {
        const brandKey = String(config.brandKey || "").trim().toLowerCase();
        if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(brandKey)) {
          throw new Error("Commercial brand is not configured");
        }
        if (active && config.items?.length && config.discountTiers?.length) {
          setPricingConfig(config);
        }
        if (active && config.brandCatalog) {
          setBrandCatalog(config.brandCatalog);
          const firstPrimaryService = config.brandCatalog.services?.find(
            (item) => item.active !== false && item.metadata?.selectionMode === "primary",
          );
          if (firstPrimaryService) setCustomTour(firstPrimaryService.key);
        }
        if (active) setCatalogBrandKey(brandKey);
        if (active && config.brandConfig) setBrandConfig(config.brandConfig);
      })
      .catch(() => {
        if (active) setCatalogError("The commercial catalog could not be loaded. Refresh this page or contact support before placing an order.");
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const brandName = brandConfig?.companyName?.trim() || fallbackBrandName(catalogBrandKey);
  const brandProductName = brandConfig?.productName?.trim() || brandName;
  const brandLogo = brandLogoForForm(catalogBrandKey, brandConfig?.logoSrc, brandConfig?.orderFormLogoSrc);
  const catalogReady = !catalogLoading && !catalogError && Boolean(catalogBrandKey);

  useEffect(() => {
    document.title = `${brandProductName} Commercial | Order Property Media & Plans`;
  }, [brandProductName]);

  const pricingByCode = useMemo(
    () => new Map(pricingConfig.items.map((item) => [item.code, item])),
    [pricingConfig.items],
  );

  const hasConfiguredCatalog = Boolean(
    brandCatalog && (
      (brandCatalog.products?.length ?? 0) > 0 ||
      (brandCatalog.services?.length ?? 0) > 0 ||
      (brandCatalog.addons?.length ?? 0) > 0
    ),
  );
  const isFpoBrand = catalogBrandKey === "floorplanonline";
  const useFpoDefaults = isFpoBrand && !hasConfiguredCatalog;
  function hasPricingSource(item: { id: string; pricingCode: string; price?: number; metadata?: Record<string, any> }) {
    return typeof item.price === "number" ||
      Boolean(item.metadata?.pricing) ||
      Boolean(item.pricingCode) ||
      (useFpoDefaults && item.id === "components-only");
  }
  const activePackages: ActivePackage[] = (hasConfiguredCatalog
    ? (brandCatalog?.products || []).filter((entry) => entry.active !== false).map((entry) => {
        const fallback = catalogBrandKey === "floorplanonline"
          ? packages.find((item) => item.id === entry.key)
          : undefined;
        return {
          ...(fallback || { id: entry.key, pricingCode: entry.key, eyebrow: "Commercial product", includes: [] }),
          id: entry.key,
          pricingCode: entry.metadata?.pricingCode || "",
          name: entry.name,
          description: entry.description || fallback?.description || "",
          eyebrow: entry.metadata?.eyebrow || fallback?.eyebrow || "Commercial product",
          recommended: entry.metadata?.recommended === true || fallback?.recommended,
          includes: entry.metadata?.includes || fallback?.includes || [],
          price: entry.price,
          metadata: entry.metadata,
        };
      })
    : useFpoDefaults ? packages : []).filter(hasPricingSource);
  const configuredServices = brandCatalog?.services?.filter((entry) => entry.active !== false) || [];
  const activeTourOptions: ActiveTourOption[] = (hasConfiguredCatalog
    ? configuredServices.filter((entry) => entry.metadata?.selectionMode === "primary").map((entry) => {
        const fallback = catalogBrandKey === "floorplanonline"
          ? customTourOptions.find((item) => item.id === entry.key)
          : undefined;
        return {
          ...(fallback || { id: entry.key, pricingCode: entry.key, name: entry.name, detail: entry.description || "", includes: [] }),
          id: entry.key,
          pricingCode: entry.metadata?.pricingCode || "",
          name: entry.name,
          detail: entry.description || fallback?.detail || "",
          includes: entry.metadata?.includes || fallback?.includes || [],
          price: entry.price,
          metadata: entry.metadata,
        };
      })
    : useFpoDefaults ? customTourOptions : []).filter(hasPricingSource);
  const activeAlacarteDeliverables: ActiveSelectableItem[] = (hasConfiguredCatalog
    ? configuredServices.filter((entry) => entry.metadata?.selectionMode === "alacarte").map((entry) => {
        const fallback = catalogBrandKey === "floorplanonline"
          ? customDeliverables.find((item) => item.id === entry.key)
          : undefined;
        return {
          ...(fallback || { id: entry.key, pricingCode: entry.key, name: entry.name, detail: entry.description || "", type: "scaled" }),
          id: entry.key,
          pricingCode: entry.metadata?.pricingCode || "",
          name: entry.name,
          detail: entry.description || fallback?.detail || "",
          type: entry.metadata?.pricingType || fallback?.type || "scaled",
          price: entry.price,
          requirements: entry.metadata?.requires || [],
          metadata: entry.metadata,
        };
      })
    : useFpoDefaults ? aLaCarteDeliverables : []).filter(hasPricingSource);
  const activeCustomAddons: ActiveSelectableItem[] = (hasConfiguredCatalog
    ? (brandCatalog?.addons || []).filter((entry) => entry.active !== false).map((entry) => {
        const fallback = catalogBrandKey === "floorplanonline"
          ? customDeliverables.find((item) => item.id === entry.key)
          : undefined;
        return {
          ...(fallback || { id: entry.key, pricingCode: entry.key, name: entry.name, detail: entry.description || "", type: "scaled" }),
          id: entry.key,
          pricingCode: entry.metadata?.pricingCode || "",
          name: entry.name,
          detail: entry.description || fallback?.detail || "",
          type: entry.metadata?.pricingType || fallback?.type || "scaled",
          price: entry.price,
          requirements: entry.metadata?.requires || [],
          metadata: entry.metadata,
        };
      })
    : useFpoDefaults ? customAddons : []).filter(hasPricingSource);
  const activeAlacarteIds = activeAlacarteDeliverables.map((item) => item.id);

  function priceForCatalogEntry(entry: { price?: number; pricingCode: string; metadata?: Record<string, any> }) {
    if (typeof entry.price === "number") return entry.price;
    const rule = entry.metadata?.pricing;
    if (rule && typeof rule === "object" && typeof rule.pricingType === "string") {
      const basePrice = Number(rule.basePrice);
      const incrementSize = Number(rule.incrementSize ?? 0);
      const incrementPrice = Number(rule.incrementPrice);
      if (!Number.isFinite(basePrice) || basePrice < 0 ||
          ((rule.pricingType === "per_1000_sqft" || rule.pricingType === "per_half_acre") &&
            (incrementSize <= 0 || !Number.isFinite(incrementPrice) || incrementPrice < 0))) {
        throw new Error(`Pricing for "${entry.pricingCode || "catalog item"}" is incomplete.`);
      }
      const pricingItem = {
        code: "brand_catalog_item",
        category: "brand_catalog",
        displayName: "Brand catalog item",
        pricingType: rule.pricingType,
        baseCoverage: Number(rule.baseCoverage ?? 0),
        basePrice,
        incrementSize,
        incrementPrice: Number.isFinite(incrementPrice) ? incrementPrice : 0,
        active: true,
        sortOrder: 0,
        description: "",
      } as const;
      const ruleTiers = Array.isArray(rule.discountTiers) ? rule.discountTiers : [];
      const multiplier = Number(rule.locationMultipliers?.[zipCode] ?? 1);
      return priceForItem(
        pricingItem as any,
        pricingAreaForItem(pricingItem as any, squareFeet, landAreaAcres),
        ruleTiers,
        multiplier,
      );
    }
    return priceForCode(entry.pricingCode);
  }
  function supportsMultipleUnits(item: ActiveSelectableItem, isAddon = false) {
    return isAddon && (
      item.metadata?.allowQuantity === true ||
      item.metadata?.pricing?.pricingType === "quantity"
    );
  }
  function catalogRateDescription(entry: {
    id: string;
    price?: number;
    pricingCode: string;
    type?: string;
    metadata?: Record<string, any>;
  }) {
    if (typeof entry.price === "number") return `${money(entry.price)} fixed`;
    const rule = entry.metadata?.pricing;
    if (rule && typeof rule === "object") {
      const multiplier = Number(rule.locationMultipliers?.[zipCode] ?? 1);
      const basePrice = Number(rule.basePrice ?? 0) * multiplier;
      const incrementPrice = Number(rule.incrementPrice ?? 0) * multiplier;
      const baseCoverage = Number(rule.baseCoverage ?? 0);
      const incrementSize = Number(rule.incrementSize ?? 0);
      if (rule.pricingType === "flat") return `${money(basePrice)} flat`;
      if (rule.pricingType === "quantity") return `${money(basePrice)} per unit`;
      if (rule.pricingType === "per_half_acre") {
        return `${money(basePrice)} through ${baseCoverage.toLocaleString()} sq ft + ${money(incrementPrice)} per additional ${incrementSize.toLocaleString()} sq ft`;
      }
      if (rule.pricingType === "per_1000_sqft") {
        return `${money(basePrice)} base through ${baseCoverage.toLocaleString()} sq ft + ${money(incrementPrice)} per additional ${incrementSize.toLocaleString()} sq ft`;
      }
    }
    const pricingItem = pricingByCode.get(entry.pricingCode);
    if (!pricingItem) return "Price varies by project scope";
    const multiplier = locationMultiplierForItem(pricingItem, locationMultiplier);
    if (pricingItem.pricingType === "flat") return `${money(pricingItem.basePrice * multiplier)} flat`;
    if (pricingItem.pricingType === "quantity") return `${money(pricingItem.basePrice * multiplier)} per unit`;
    const incrementLabel = pricingItem.pricingType === "per_half_acre"
      ? "additional 1/2 acre"
      : `additional ${pricingItem.incrementSize.toLocaleString()} sq ft`;
    const baseLabel = pricingItem.pricingType === "per_half_acre"
      ? `${pricingItem.baseCoverage.toLocaleString()} sq ft`
      : `${pricingItem.baseCoverage.toLocaleString()} sq ft`;
    const description = `${money(pricingItem.basePrice * multiplier)} base through ${baseLabel} + ${money(pricingItem.incrementPrice * multiplier)} per ${incrementLabel}`;
    return isFpoBrand && entry.id === "tagging"
      ? `${description} · available with 3D tour options only`
      : description;
  }
  const locationMultiplier = pricingConfig.locationMultipliers[zipCode] ?? 1;
  const selectedPackage = activePackages.find((item) => item.id === packageId);
  const selectedTourOption = activeTourOptions.find((option) => option.id === customTour);
  const selectedAlacarteServices = activeAlacarteDeliverables.filter((item) => selectedCustom.includes(item.id));
  const photoPackCatalogItem = activeCustomAddons.find((item) => item.id === "additional-pro-photos");
  const selectableCustomAddons = isFpoBrand
    ? activeCustomAddons.filter((item) => item.id !== "additional-pro-photos")
    : activeCustomAddons;
  const canAddPhotoPacks = catalogBrandKey === "floorplanonline" && (
    useFpoDefaults
      ? customTour === "photo-tour" || (customTour === "components-only" && selectedCustom.includes("photography"))
      : Boolean(photoPackCatalogItem && selectedTourOption?.metadata?.allowsPhotoPacks === true &&
          (customTour !== "components-only" || selectedCustom.includes("photography")))
  );
  const selectedPricingEntries = packageId === "custom"
    ? [
        selectedTourOption && !(isFpoBrand && customTour === "components-only") ? selectedTourOption : undefined,
        ...activeAlacarteDeliverables.filter((item) => selectedCustom.includes(item.id)),
        ...activeCustomAddons.filter((item) => selectedCustom.includes(item.id)),
        canAddPhotoPacks && additionalPhotoPacks > 0 ? photoPackCatalogItem : undefined,
      ].filter((item): item is ActiveTourOption | ActiveSelectableItem => Boolean(item))
    : [
        selectedPackage,
        ...activeAlacarteDeliverables.filter((item) => selectedCustom.includes(item.id)),
        ...activeCustomAddons.filter((item) => selectedCustom.includes(item.id)),
      ].filter((item): item is ActivePackage | ActiveSelectableItem => Boolean(item));
  const hasLocationRate = selectedPricingEntries.some((entry) => {
    if (typeof entry.price === "number") return false;
    const rule = entry.metadata?.pricing;
    if (rule && typeof rule === "object") {
      return Number(rule.locationMultipliers?.[zipCode] ?? 1) > 1;
    }
    const pricingItem = pricingByCode.get(entry.pricingCode);
    return locationMultiplierForItem(pricingItem, locationMultiplier) > 1;
  }) || (useFpoDefaults && canAddPhotoPacks && additionalPhotoPacks > 0 && locationMultiplier > 1);
  const hasFloorPlanService =
    selectedPackage?.metadata?.provides?.includes("floorplan") ||
    selectedTourOption?.metadata?.provides?.includes("floorplan") ||
    selectedAlacarteServices.some((item) => item.metadata?.provides?.includes("floorplan")) ||
    (isFpoBrand && packageId !== "custom") ||
    (isFpoBrand && (
      customTour === "walkthrough" ||
      customTour === "floorplan-tour" ||
      (customTour === "components-only" &&
        selectedCustom.some((id) => id === "tour" || id === "planner"))
    ));
  const has3DTourService =
    selectedPackage?.metadata?.provides?.includes("3d-tour") ||
    selectedTourOption?.metadata?.provides?.includes("3d-tour") ||
    selectedAlacarteServices.some((item) => item.metadata?.provides?.includes("3d-tour")) ||
    (isFpoBrand && packageId !== "custom") ||
    (isFpoBrand && (
      customTour === "walkthrough" ||
      (customTour === "components-only" && selectedCustom.includes("tour"))
    ));
  const providedCapabilities = new Set<string>();
  for (const service of [selectedPackage, selectedTourOption, ...selectedAlacarteServices]) {
    for (const capability of service?.metadata?.provides || []) {
      if (typeof capability === "string") providedCapabilities.add(capability);
    }
  }
  // Keep arbitrary brand-defined requirements usable while preserving the
  // existing FPO fallback capability rules above.
  if (hasFloorPlanService) providedCapabilities.add("floorplan");
  if (has3DTourService) providedCapabilities.add("3d-tour");
  const unavailableRequirementIds = new Set(
    [...activeAlacarteDeliverables, ...activeCustomAddons]
      .filter((item) => (item.requirements || []).some((requirement) => !providedCapabilities.has(requirement)))
      .map((item) => item.id),
  );
  const unavailableRequirementKey = Array.from(unavailableRequirementIds).sort().join("|");
  const floorPlanDependentIds = useMemo(() => {
    const ids = new Set<string>();
    if (isFpoBrand) floorPlanAddonIds.forEach((id) => ids.add(id));
    for (const item of [...(brandCatalog?.services || []), ...(brandCatalog?.addons || [])]) {
      if (item.active !== false && item.metadata?.requires?.includes("floorplan")) ids.add(item.key);
    }
    return ids;
  }, [brandCatalog, isFpoBrand]);
  const threeDTourDependentIds = useMemo(() => {
    const ids = new Set<string>();
    if (isFpoBrand) ids.add("tagging");
    for (const item of [...(brandCatalog?.services || []), ...(brandCatalog?.addons || [])]) {
      if (item.active !== false && item.metadata?.requires?.includes("3d-tour")) ids.add(item.key);
    }
    return ids;
  }, [brandCatalog, isFpoBrand]);
  const showAlacarteServices = isFpoBrand
    ? customTour === "components-only"
    : activeAlacarteDeliverables.length > 0;

  useEffect(() => {
    if (hasFloorPlanService) return;
    setSelectedCustom((current) => current.filter((id) => !floorPlanDependentIds.has(id)));
  }, [hasFloorPlanService, floorPlanDependentIds]);

  useEffect(() => {
    if (has3DTourService) return;
    setSelectedCustom((current) => current.filter((id) => !threeDTourDependentIds.has(id)));
  }, [has3DTourService, threeDTourDependentIds]);

  useEffect(() => {
    if (!unavailableRequirementKey) return;
    setSelectedCustom((current) => {
      const next = current.filter((id) => !unavailableRequirementIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [unavailableRequirementKey]);

  function priceForCode(code: string) {
    const pricingItem = pricingByCode.get(code);
    return priceForItem(
      pricingItem,
      pricingAreaForItem(pricingItem, squareFeet, landAreaAcres),
      pricingConfig.discountTiers,
      locationMultiplier,
    );
  }

  const estimate = useMemo(() => {
    const sqft = Math.max(0, squareFeet || 0);
    const largeVenue = sqft > 10000;
    let requiresReview = false;
    const lineItems: Array<{
      label: string;
      price: number;
      kind: "package" | "addon";
      key: string;
      item_type: "product" | "service" | "addon";
      quantity: number;
      unit_price_cents: number;
      line_total_cents: number;
      catalog_snapshot: unknown;
    }> = [];

    if (packageId === "custom") {
      const selectedTour = activeTourOptions.find(
        (option) => option.id === customTour,
      );
      if (selectedTour) {
        const tourPrice = priceForCatalogEntry(selectedTour);
        lineItems.push({
          label: selectedTour.name,
          price: tourPrice,
          kind: "package",
          key: selectedTour.id,
          item_type: "service",
          quantity: 1,
          unit_price_cents: Math.round(tourPrice * 100),
          line_total_cents: Math.round(tourPrice * 100),
          catalog_snapshot: selectedTour,
        });
      }
      if (canAddPhotoPacks) {
        const legacyPhotoPackPrice =
          (pricingByCode.get("additional_photos")?.basePrice ?? 50) * locationMultiplier;
        const photoPackUnitPrice = photoPackCatalogItem
          ? priceForCatalogEntry(photoPackCatalogItem)
          : legacyPhotoPackPrice;
        const photoPackUnitPriceCents = Math.round(photoPackUnitPrice * 100);
        const photoPackPriceCents = photoPackUnitPriceCents * additionalPhotoPacks;
        if (additionalPhotoPacks > 0) {
          lineItems.push({
            label: `${photoPackCatalogItem?.name || "Additional Pro photos"} · ${additionalPhotoPacks} ${
              additionalPhotoPacks === 1 ? "pack" : "packs"
            }`,
            price: photoPackPriceCents / 100,
            kind: "addon",
            key: "additional-pro-photos",
            item_type: "addon",
            quantity: additionalPhotoPacks,
            unit_price_cents: photoPackUnitPriceCents,
            line_total_cents: photoPackPriceCents,
            catalog_snapshot: photoPackCatalogItem || { key: "additional-pro-photos", name: "Additional Pro photos" },
          });
        }
      }
      selectedCustom.forEach((id) => {
        const addonItem = activeCustomAddons.find((entry) => entry.id === id);
        const item = activeAlacarteDeliverables.find((entry) => entry.id === id) || addonItem;
        if (!item) return;
        const itemPrice = priceForCatalogEntry(item);
        const quantity = supportsMultipleUnits(item, Boolean(addonItem))
          ? Math.min(10000, Math.max(1, Math.floor(addonQuantities[id] || 1)))
          : 1;
        const lineTotalCents = Math.round(itemPrice * 100) * quantity;
        lineItems.push({
          label: item.name,
          price: lineTotalCents / 100,
          kind: activeAlacarteIds.includes(item.id) ? "package" : "addon",
          key: item.id,
          item_type: activeAlacarteIds.includes(item.id) ? "service" : "addon",
          quantity,
          unit_price_cents: Math.round(itemPrice * 100),
          line_total_cents: lineTotalCents,
          catalog_snapshot: item,
        });
      });
    } else {
      if (selectedPackage) {
        const packagePrice = priceForCatalogEntry(selectedPackage);
        lineItems.push({
          label: `${selectedPackage.name} package`,
          price: packagePrice,
          kind: "package",
          key: selectedPackage.id,
          item_type: "product",
          quantity: 1,
          unit_price_cents: Math.round(packagePrice * 100),
          line_total_cents: Math.round(packagePrice * 100),
          catalog_snapshot: selectedPackage,
        });
      }
      selectedCustom.forEach((id) => {
        const addonItem = activeCustomAddons.find((entry) => entry.id === id);
        const item = activeAlacarteDeliverables.find((entry) => entry.id === id) || addonItem;
        if (!item || (isFpoBrand && item.id === "additional-pro-photos")) return;
        const itemPrice = priceForCatalogEntry(item);
        const quantity = supportsMultipleUnits(item, Boolean(addonItem))
          ? Math.min(10000, Math.max(1, Math.floor(addonQuantities[id] || 1)))
          : 1;
        const lineTotalCents = Math.round(itemPrice * 100) * quantity;
        lineItems.push({
          label: item.name,
          price: lineTotalCents / 100,
          kind: addonItem ? "addon" : "package",
          key: item.id,
          item_type: addonItem ? "addon" : "service",
          quantity,
          unit_price_cents: Math.round(itemPrice * 100),
          line_total_cents: lineTotalCents,
          catalog_snapshot: item,
        });
      });
    }

    return {
      amount: lineItems.reduce((totalCents, item) => totalCents + item.line_total_cents, 0) / 100,
      requiresReview,
      largeVenue,
      lineItems,
    };
  }, [
    additionalPhotoPacks,
    customTour,
    canAddPhotoPacks,
    landAreaAcres,
    packageId,
    selectedCustom,
    addonQuantities,
    squareFeet,
    pricingByCode,
    pricingConfig.discountTiers,
    locationMultiplier,
    activePackages,
    activeTourOptions,
    activeAlacarteDeliverables,
    activeCustomAddons,
    activeAlacarteIds,
    isFpoBrand,
  ]);
  const taxableSubtotal = estimate.amount;
  const orderTotal = taxableSubtotal + salesTax;

  useEffect(() => {
    if (
      checkoutStep !== 2 ||
      !propertyAddress.trim() ||
      !propertyCity.trim() ||
      !/^[A-Za-z]{2}$/.test(propertyState) ||
      zipCode.length !== 5 ||
      taxableSubtotal <= 0
    ) {
      setSalesTax(0);
      setTaxCalculationId("");
      setTaxStatus("idle");
      return;
    }

    let active = true;
    setTaxStatus("loading");
    const timeout = window.setTimeout(() => {
      fetch("/api/stripe/tax-calculation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: Math.round(taxableSubtotal * 100),
          line1: propertyAddress.trim(),
          city: propertyCity.trim(),
          state: propertyState.toUpperCase(),
          postalCode: zipCode,
        }),
      })
        .then(async (response) => {
          const data = (await response.json()) as {
            calculationId?: string;
            error?: string;
            taxAmountCents?: number;
          };
          if (!response.ok || typeof data.taxAmountCents !== "number") {
            throw new Error(data.error ?? "Sales tax could not be calculated.");
          }
          if (!active) return;
          setSalesTax(data.taxAmountCents / 100);
          setTaxCalculationId(data.calculationId ?? "");
          setTaxStatus("ready");
        })
        .catch(() => {
          if (!active) return;
          setSalesTax(0);
          setTaxCalculationId("");
          setTaxStatus("unavailable");
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [
    checkoutStep,
    propertyAddress,
    propertyCity,
    propertyState,
    taxableSubtotal,
    zipCode,
  ]);

  function choosePaymentMethod(nextMethod: PaymentMethod) {
    setPaymentMethod(nextMethod);
    setStripeClientSecret("");
    setStripePublishableKey("");
    setStripeError("");
  }

  function toggleCustom(id: string) {
    const item = activeCustomAddons.find((entry) => entry.id === id);
    const isDeselecting = selectedCustom.includes(id);
    if (id === "photography" && selectedCustom.includes(id)) {
      setAdditionalPhotoPacks(0);
    }
    if (item && supportsMultipleUnits(item, activeCustomAddons.some((addon) => addon.id === item.id))) {
      setAddonQuantities((current) => {
        if (isDeselecting) {
          const next = { ...current };
          delete next[id];
          return next;
        }
        return { ...current, [id]: current[id] || 1 };
      });
    }
    setSelectedCustom((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      const catalogExclusiveGroup = activeCustomAddons.find((item) => item.id === id)?.metadata?.exclusiveGroup;
      const configuredExclusiveIds = typeof catalogExclusiveGroup === "string"
        ? activeCustomAddons
            .filter((item) => item.metadata?.exclusiveGroup === catalogExclusiveGroup)
            .map((item) => item.id)
        : undefined;
      const legacyExclusiveIds = isFpoBrand
        ? exclusiveAddonGroups.find((group) => group.includes(id))
        : undefined;
      const exclusiveIds = configuredExclusiveIds || legacyExclusiveIds;
      const compatibleSelections = exclusiveIds
        ? current.filter((item) => !exclusiveIds.includes(item))
        : current;
      return [...compatibleSelections, id];
    });
  }

  function chooseCustomTour(id: TourOptionId) {
    setCustomTour(id);
    const selectedOption = activeTourOptions.find((option) => option.id === id);
    const supportsPhotoPacks = catalogBrandKey === "floorplanonline" && (
      useFpoDefaults
        ? id === "photo-tour"
        : Boolean(photoPackCatalogItem && selectedOption?.metadata?.allowsPhotoPacks === true)
    );
    if (!supportsPhotoPacks) {
      setAdditionalPhotoPacks(0);
    }
    if (isFpoBrand && id !== "components-only") {
      setSelectedCustom((current) =>
        current.filter((item) => !activeAlacarteIds.includes(item)),
      );
    }
  }

  function renderCustomDeliverable(item: ActiveSelectableItem) {
    const itemPrice = priceForCatalogEntry(item);
    const quantityEnabled = supportsMultipleUnits(
      item,
      activeCustomAddons.some((addon) => addon.id === item.id),
    );
    const requires3DTour = item.requirements?.includes("3d-tour") === true ||
      (isFpoBrand && item.id === "tagging");
    const requiresFloorPlan = item.requirements?.includes("floorplan") === true ||
      (isFpoBrand && floorPlanAddonIds.has(item.id));
    const isDisabled =
      unavailableRequirementIds.has(item.id) ||
      (requiresFloorPlan && !hasFloorPlanService) ||
      (requires3DTour && !has3DTourService);
    return (
      <React.Fragment key={item.id}>
        <label
          className={`${selectedCustom.includes(item.id) ? "selected" : ""} ${
            isDisabled ? "disabled" : ""
          }`}
          aria-disabled={isDisabled}
        >
          <input
            type="checkbox"
            checked={selectedCustom.includes(item.id)}
            disabled={isDisabled}
            onChange={() => toggleCustom(item.id)}
          />
          <span>
            <strong>{item.name}</strong>
            <small>{item.detail}</small>
            {isDisabled && (
              <small className="addon-requirement">
                {requires3DTour
                  ? "Requires a 3D Walkthrough Tour or 3D Tour/Scan."
                  : requiresFloorPlan
                    ? "Requires a floor plan service."
                    : "Requires a 3D tour or floor plan selection."}
              </small>
            )}
            <small className="component-rate">
              {catalogRateDescription(item)}
            </small>
          </span>
          <b>{money(itemPrice * (quantityEnabled && selectedCustom.includes(item.id) ? addonQuantities[item.id] || 1 : 1))}</b>
        </label>
        {quantityEnabled && selectedCustom.includes(item.id) && (
          <div className="addon-quantity">
            <label htmlFor={`addon-quantity-${item.id}`}>Quantity</label>
            <input
              id={`addon-quantity-${item.id}`}
              type="number"
              min="1"
              max="10000"
              step="1"
              value={addonQuantities[item.id] || 1}
              onChange={(event) => setAddonQuantities((current) => ({
                ...current,
                [item.id]: Math.min(10000, Math.max(1, Math.floor(Number(event.target.value) || 1))),
              }))}
            />
          </div>
        )}
      </React.Fragment>
    );
  }

  function reviewOrder(event: React.MouseEvent<HTMLButtonElement>) {
    if (!catalogReady) return;
    const form = event.currentTarget.form;
    if (!form?.reportValidity()) return;
    setCheckoutStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToOrder() {
    setCheckoutStep(1);
    setStripeClientSecret("");
    setStripePublishableKey("");
    setStripeError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function preparePaymentAuthorization(
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    if (!catalogReady) return;
    const form = event.currentTarget.form;
    if (!form?.reportValidity()) return;
    if (taxStatus !== "ready" || !taxCalculationId) {
      setStripeError("A current tax estimate is required before payment details can be saved. Check the property address and retry.");
      return;
    }
    if (orderTotal < 0.01) {
      setStripeError("Select at least one priced service or add-on before continuing.");
      return;
    }

    const formData = new FormData(form);
    const selection =
      packageId === "custom"
        ? `Build your own - ${
            activeTourOptions.find((option) => option.id === customTour)?.name
          }`
        : `${activePackages.find((pkg) => pkg.id === packageId)?.name} package`;

    setStripePreparing(true);
    setStripeError("");
    try {
      const response = await fetch("/api/stripe/setup-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingName,
          billingEmail,
          company: formData.get("company"),
          project: formData.get("project"),
          propertyType,
          squareFeet,
          landAreaAcres,
          zipCode,
          selection,
          estimatedAmountCents: Math.round(orderTotal * 100),
          salesTaxCents: Math.round(salesTax * 100),
          taxCalculationId,
          requestId: orderRequestId,
          paymentConsentVersion: COMMERCIAL_PAYMENT_CONSENT_VERSION,
        }),
      });
      const data = (await response.json()) as {
        clientSecret?: string;
        error?: string;
        publishableKey?: string;
      };
      if (!response.ok || !data.clientSecret || !data.publishableKey) {
        throw new Error(data.error ?? "Secure payment entry could not be started.");
      }
      setStripeClientSecret(data.clientSecret);
      setStripePublishableKey(data.publishableKey);
    } catch (error) {
      setStripeError(
        error instanceof Error
          ? error.message
          : "Secure payment entry could not be started.",
      );
    } finally {
      setStripePreparing(false);
    }
  }

  async function persistCommercialOrder(
    form: HTMLFormElement | null,
    stripeSetupIntentId?: string,
  ) {
    if (!catalogReady) {
      setSubmissionError(catalogError || "The commercial catalog is not ready. Refresh this page before submitting.");
      return;
    }
    if (!form) {
      setSubmissionError("We could not read the order details. Please return to the form and try again.");
      return;
    }

    const formData = new FormData(form);
    const value = (name: string) => String(formData.get(name) ?? "").trim();
    const primaryContactEmail = value("contact-emails").split(",").map((email) => email.trim()).find(Boolean) || "";
    const selectedPackage = activePackages.find((item) => item.id === packageId);
    const customTourLabel = activeTourOptions.find((item) => item.id === customTour)?.name;
    const payload = {
      request_id: orderRequestId,
      company: value("company"),
      project: value("project"),
      contact_name: value("contact"),
      contact_email: primaryContactEmail,
      contact_phone: value("phone"),
      property_type: propertyType,
      street: value("address"),
      city: value("city"),
      state: value("state").toUpperCase(),
      zip: value("zip"),
      building_sq_ft: squareFeet,
      land_area_acres: landAreaAcres,
      estimated_subtotal_cents: Math.round(taxableSubtotal * 100),
      estimated_tax_cents: Math.round(salesTax * 100),
      estimated_total_cents: Math.round(orderTotal * 100),
      payment_method: paymentMethod,
      payment_consent_version: paymentMethod === "stripe" ? COMMERCIAL_PAYMENT_CONSENT_VERSION : undefined,
      stripe_setup_intent_id: stripeSetupIntentId,
      order_payload: {
        form: Object.fromEntries(formData.entries()),
        billing_name: billingName.trim(),
        billing_email: billingEmail.trim(),
        payment_method: paymentMethod,
        package_id: packageId,
        package_name: selectedPackage?.name,
        custom_tour_id: packageId === "custom" ? customTour : null,
        custom_tour_name: packageId === "custom" ? customTourLabel : null,
        selected_custom_deliverables: selectedCustom,
        additional_photo_packs: additionalPhotoPacks,
        line_items: estimate.lineItems,
        catalog_snapshot: {
          product: packageId === "custom" ? null : activePackages.find((item) => item.id === packageId) || null,
          primary_service: packageId === "custom" ? activeTourOptions.find((item) => item.id === customTour) || null : null,
          services: activeAlacarteDeliverables.filter((item) => selectedCustom.includes(item.id)),
          addons: activeCustomAddons.filter((item) => selectedCustom.includes(item.id)),
        },
        property_type: propertyType,
        square_feet: squareFeet,
        land_area_acres: landAreaAcres,
        estimated_subtotal: taxableSubtotal,
        estimated_sales_tax: salesTax,
        estimated_total: orderTotal,
        tax_calculation_id: taxCalculationId,
      },
    };

    setSubmittingOrder(true);
    setSubmissionError("");
    try {
      const response = await fetch("/api/oms/commercial-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        commercial_order_request_id?: number;
        error?: string;
      };
      if (!response.ok || !result.commercial_order_request_id) {
        throw new Error(result.error ?? "The order could not be saved.");
      }
      setSubmittedOrderId(result.commercial_order_request_id);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "The order could not be saved. Please try again.",
      );
    } finally {
      setSubmittingOrder(false);
    }
  }

  function completePaymentAuthorization(setupIntentId?: string) {
    const form = document.querySelector<HTMLFormElement>("form.order-layout");
    return persistCommercialOrder(form, setupIntentId);
  }

  function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checkoutStep !== 2 || paymentMethod !== "invoice") return;
    if (!catalogReady) {
      setSubmissionError(catalogError || "The commercial catalog is not ready. Refresh this page before submitting.");
      return;
    }
    if (taxStatus !== "ready" || !taxCalculationId) {
      setSubmissionError("A current property tax estimate is required. Check the property address and refresh the quote.");
      return;
    }
    if (orderTotal < 0.01) {
      setSubmissionError("Select at least one priced service or add-on before submitting.");
      return;
    }
    void persistCommercialOrder(event.currentTarget);
  }

  if (submitted) {
    return (
      <main className="success-page">
        <section className="success-card">
          <div className="brand-mark" aria-hidden="true">
            {brandName}
          </div>
          <p className="kicker">Commercial project request received</p>
          <h1>Your property is ready for scope review.</h1>
          <p>
            We captured your {propertyType.toLowerCase()} project at{" "}
            {squareFeet.toLocaleString()} square feet. {paymentMethod === "stripe"
              ? "Your payment method was securely verified and saved with Stripe; no charge was made."
              : "Your request for invoice payment was recorded."} A commercial
            project specialist will confirm access, deliverables and final
            pricing.
          </p>
          {submittedOrderId && <p>OMS request reference: <strong>{submittedOrderId}</strong></p>}
          <div className="success-total">
            <span>Current estimated total</span>
            <strong>{money(orderTotal)}</strong>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="order-intro" id="top">
        <div className="brand-lockup">
          {brandLogo ? <img className="brand-logo" src={brandLogo} alt={brandConfig?.logoAlt || brandName} /> :
            <span className="brand-wordmark">{brandName}</span>}
        </div>
        {catalogLoading && <p role="status" className="fine-print">Loading the {brandName} commercial catalog…</p>}
        {catalogError && <p role="alert" className="stripe-error">{catalogError}</p>}
        <div className="order-intro-copy">
          <p className="kicker">Commercial media & property documentation</p>
          <h1>Build your commercial property order</h1>
          <p>
            Build a visual record for marketing, planning and operations—from
            professional photography to interactive floor plans, 3D tours, CAD
            files and item tagging.
          </p>
        </div>
        <div className="order-assurance">
          <span>One property per order</span>
          <span>Card or invoice</span>
          <span>No charge at submission</span>
        </div>
      </section>

      <div className="checkout-progress" aria-label="Order progress">
        <span className={checkoutStep === 1 ? "active" : "complete"}>
          1 · Build request
        </span>
        <span className={checkoutStep === 2 ? "active" : ""}>
          2 · Review & payment
        </span>
      </div>

      <form className="order-layout" onSubmit={submitOrder}>
        <div className="form-column">
          <section
            className={`form-section ${
              checkoutStep === 1 ? "" : "checkout-step-hidden"
            }`}
          >
            <div className="section-heading">
              <span>01</span>
              <div>
                <p className="kicker">Project details</p>
                <h2>Tell us about the property</h2>
                <p>
                  We currently scope and price one commercial property parcel
                  per order.
                </p>
              </div>
            </div>

            <div className="field-grid">
              <label>
                Company name
                <input required name="company" placeholder="Acme Properties" />
              </label>
              <label>
                Project name
                <input
                  required
                  name="project"
                  placeholder="Downtown leasing package"
                />
              </label>
              <label className="field-full">
                Property street address
                <input
                  required
                  name="address"
                  autoComplete="street-address"
                  value={propertyAddress}
                  onChange={(event) => setPropertyAddress(event.target.value)}
                  placeholder="123 Main Street"
                />
              </label>
              <label>
                City
                <input
                  required
                  name="city"
                  autoComplete="address-level2"
                  value={propertyCity}
                  onChange={(event) => setPropertyCity(event.target.value)}
                  placeholder="City"
                />
              </label>
              <label>
                State
                <input
                  required
                  name="state"
                  autoComplete="address-level1"
                  maxLength={2}
                  pattern="[A-Za-z]{2}"
                  title="Enter the two-letter state abbreviation"
                  value={propertyState}
                  onChange={(event) =>
                    setPropertyState(
                      event.target.value.replace(/[^A-Za-z]/g, "").toUpperCase(),
                    )
                  }
                  placeholder="TX"
                />
              </label>
              <label>
                ZIP code
                <input
                  required
                  name="zip"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  maxLength={5}
                  value={zipCode}
                  onChange={(event) =>
                    setZipCode(normalizeZipCode(event.target.value))
                  }
                  placeholder="00000"
                />
                {hasLocationRate && (
                  <small className="nyc-pricing-message">
                    Location-based pricing applies to eligible items for this ZIP code.
                  </small>
                )}
              </label>
            </div>

            <fieldset>
              <legend>Property category</legend>
              <div className="category-grid">
                {propertyTypes.map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={propertyType === type ? "selected" : ""}
                    onClick={() => setPropertyType(type)}
                    aria-pressed={propertyType === type}
                  >
                    <span className="category-icon" aria-hidden="true">
                      {type.slice(0, 2).toUpperCase()}
                    </span>
                    {type}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="field-grid metrics">
              <label>
                Approximate project area
                <div className="input-suffix">
                  <input
                    required
                    type="number"
                    min="1000"
                    step="500"
                    value={squareFeet}
                    onChange={(event) =>
                      setSquareFeet(Number(event.target.value))
                    }
                  />
                  <span>sq ft</span>
                </div>
              </label>
              <label>
                Land Area in Scope
                <div className="land-area-control">
                  <input
                    required
                    name="land-area"
                    type="number"
                    min={landAreaUnit === "acres" ? "0.1" : "1"}
                    step={landAreaUnit === "acres" ? "0.01" : "1"}
                    value={landAreaValue}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      setLandAreaValue(nextValue);
                      setLandAreaUnit((currentUnit) =>
                        inferLandAreaUnit(nextValue, currentUnit),
                      );
                    }}
                    onBlur={() => {
                      if (landAreaUnit === "acres") {
                        setLandAreaValue((currentValue) =>
                          normalizeAcreShorthand(currentValue),
                        );
                      }
                    }}
                  />
                  <select
                    className="land-unit-select"
                    name="land-area-unit"
                    aria-label="Land area unit"
                    value={landAreaUnit}
                    onChange={(event) =>
                      changeLandAreaUnit(event.target.value as LandAreaUnit)
                    }
                  >
                    <option value="acres">Acres</option>
                    <option value="square_feet">Square feet</option>
                  </select>
                </div>
                <small>
                  Used for site plans and acreage-based aerial work. Enter 50
                  for 0.50 acres; values over 100 switch to square feet.
                </small>
              </label>
              <label>
                Occupancy
                <select name="occupancy" defaultValue="occupied">
                  <option value="occupied">Occupied</option>
                  <option value="vacant">Vacant</option>
                  <option value="partial">Partially occupied</option>
                  <option value="construction">Under construction</option>
                </select>
              </label>
              <label>
                Number of buildings
                <input type="number" name="buildings" min="1" defaultValue="1" />
              </label>
              <label>
                Floors in scope
                <input type="number" name="floors" min="1" defaultValue="1" />
              </label>
            </div>
          </section>

          <section
            className={`form-section ${
              checkoutStep === 1 ? "" : "checkout-step-hidden"
            }`}
          >
            <div className="section-heading">
              <span>02</span>
              <div>
                <p className="kicker">Deliverables</p>
                <h2>Choose the right level of detail</h2>
                <p>
                  Pricing includes the first 2,000 sq ft, then scales in 1,000
                  sq ft increments. Volume discounts begin over 10,000 sq ft.
                </p>
              </div>
            </div>

            <div
              className="package-mode-toggle"
              role="group"
              aria-label="Choose an order type"
            >
              <button
                type="button"
                className={packageId === "custom" ? "selected" : ""}
                onClick={() => setPackageId("custom")}
                aria-pressed={packageId === "custom"}
              >
                <strong>Build Your Own</strong>
                <small>Choose a core tour, services, and add-ons</small>
              </button>
              <button
                type="button"
                className={packageId !== "custom" ? "selected" : ""}
                onClick={() => setPackageId(activePackages[0]?.id || "custom")}
                aria-pressed={packageId !== "custom"}
              >
                <strong>Packages</strong>
                <small>Choose a complete commercial package</small>
              </button>
            </div>

            {packageId !== "custom" && (
            <div className="package-grid all-inclusive-grid">
              {activePackages.map((pkg) => {
                const packagePrice = priceForCatalogEntry(pkg);
                return (
                  <button
                    type="button"
                    key={pkg.id}
                    className={`package-card ${packageId === pkg.id ? "selected" : ""}`}
                    onClick={() => setPackageId(pkg.id)}
                    aria-pressed={packageId === pkg.id}
                  >
                    {pkg.recommended && (
                      <span className="recommendation">Most versatile</span>
                    )}
                    <span className="package-eyebrow">{pkg.eyebrow}</span>
                    <span className="package-title">
                      <strong>{pkg.name}</strong>
                      <strong>{money(packagePrice)}</strong>
                    </span>
                    <span className="package-description">
                      {pkg.description}
                    </span>
                    <span className="package-list">
                      {pkg.includes.map((item) => (
                        <span key={item}>✓ {item}</span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
            )}

            {packageId !== "custom" && (activeAlacarteDeliverables.length > 0 || selectableCustomAddons.length > 0) && (
              <div className="custom-builder">
                {activeAlacarteDeliverables.length > 0 && (
                  <div className="custom-subsection">
                    <div className="custom-subsection-heading">
                      <div>
                        <span>Optional services</span>
                        <p>Add services to the selected commercial package.</p>
                      </div>
                    </div>
                    <div className="custom-deliverables">
                      {activeAlacarteDeliverables.map(renderCustomDeliverable)}
                    </div>
                  </div>
                )}
                {selectableCustomAddons.length > 0 && (
                  <div className="custom-subsection">
                    <div className="custom-subsection-heading">
                      <div>
                        <span>Add-ons</span>
                        <p>Add optional deliverables to the selected package.</p>
                      </div>
                    </div>
                    <div className="custom-deliverables">
                      {selectableCustomAddons.map(renderCustomDeliverable)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {packageId === "custom" && (
              <div className="custom-builder">
                <div className="custom-subsection">
                  <div className="custom-subsection-heading">
                    <div>
                      <span>Choose a primary service</span>
                      <p>
                        Select a primary service and any optional services or add-ons that fit the project.
                      </p>
                    </div>
                  </div>
                  <div className="tour-option-grid">
                    {activeTourOptions.map((option) => {
                      const isAlacartePlaceholder = isFpoBrand && option.id === "components-only";
                      const optionPrice = isAlacartePlaceholder ? 0 : priceForCatalogEntry(option);
                      return (
                        <button
                          type="button"
                          key={option.id}
                          className={`${customTour === option.id ? "selected" : ""} ${
                            isAlacartePlaceholder
                              ? "alacarte-option"
                              : ""
                          }`}
                          onClick={() => chooseCustomTour(option.id)}
                          aria-pressed={customTour === option.id}
                        >
                          <span>
                            <strong>{option.name}</strong>
                            <small>{option.detail}</small>
                          </span>
                          {option.includes.length > 0 && (
                            <ul className="tour-includes">
                              {option.includes.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          )}
                          <b>
                            {isAlacartePlaceholder
                              ? "Click to See Services"
                              : money(optionPrice)}
                          </b>
                          {!isAlacartePlaceholder && (
                            <em>
                              {catalogRateDescription(option)}
                            </em>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {showAlacarteServices && (
                  <div className="custom-subsection">
                    <div className="custom-subsection-heading">
                      <div>
                        <span>{isFpoBrand ? "Choose à la carte services" : "Optional services"}</span>
                        <p>
                          {isFpoBrand
                            ? "Select any combination of the three core property media services."
                            : "Select any additional services for this project."}
                        </p>
                      </div>
                    </div>
                    <div className="custom-deliverables">
                      {activeAlacarteDeliverables.map(renderCustomDeliverable)}
                    </div>
                  </div>
                )}

                <div className="custom-subsection">
                  <div className="custom-subsection-heading">
                    <div>
                      <span>Add-ons</span>
                      <p>
                        Available with any primary tour or à la carte selection.
                        Prices reflect the current property size.
                      </p>
                    </div>
                  </div>
                  <div className="custom-deliverables">
                    {canAddPhotoPacks && (
                      <div className="photo-pack-addon">
                        <span>
                          <strong>{photoPackCatalogItem?.name || "Additional Pro photos"}</strong>
                          <small>{photoPackCatalogItem?.detail || "Add photos in groups of 5."}</small>
                          <small className="component-rate">
                            {money(photoPackCatalogItem
                              ? priceForCatalogEntry(photoPackCatalogItem)
                              : (pricingByCode.get("additional_photos")?.basePrice ?? 50) * locationMultiplier)} per pack
                          </small>
                        </span>
                        <label>
                          Packs
                          <div className="photo-pack-stepper">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={additionalPhotoPacks}
                              onChange={(event) =>
                                setAdditionalPhotoPacks(
                                  Math.max(
                                    0,
                                    Math.floor(Number(event.target.value) || 0),
                                  ),
                                )
                              }
                            />
                            <span className="photo-pack-stepper-controls">
                              <button
                                type="button"
                                aria-label="Add one photo pack"
                                onClick={() =>
                                  setAdditionalPhotoPacks((count) => count + 1)
                                }
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                aria-label="Remove one photo pack"
                                disabled={additionalPhotoPacks === 0}
                                onClick={() =>
                                  setAdditionalPhotoPacks((count) =>
                                    Math.max(0, count - 1),
                                  )
                                }
                              >
                                ▼
                              </button>
                            </span>
                          </div>
                        </label>
                        <b>
                          {money(additionalPhotoPacks * (photoPackCatalogItem
                            ? priceForCatalogEntry(photoPackCatalogItem)
                            : (pricingByCode.get("additional_photos")?.basePrice ?? 50) * locationMultiplier))}
                        </b>
                      </div>
                    )}
                    {selectableCustomAddons.map(renderCustomDeliverable)}
                  </div>
                </div>
              </div>
            )}

            {estimate.largeVenue && (
              <div className="pricing-note">
                <strong>Marginal large-property discounts applied.</strong>
                <span>
                  Each additional 1,000 sq ft is discounted only by the tier it
                  falls within: 20% from 10,000–30,000 sq ft, 30% from
                  30,000–50,000 sq ft, 45% from 50,000–100,000 sq ft, and 55%
                  above 100,000 sq ft.
                </span>
              </div>
            )}
          </section>

          <section
            className={`form-section ${
              checkoutStep === 1 ? "" : "checkout-step-hidden"
            }`}
          >
            <div className="section-heading">
              <span>03</span>
              <div>
                <p className="kicker">Site logistics</p>
                <h2>Help us plan a smooth capture</h2>
                <p>
                  Commercial access, security and operating conditions can
                  affect the final schedule.
                </p>
              </div>
            </div>
            <div className="field-grid">
              <label>
                On-site contact
                <input required name="contact" placeholder="Full name" />
              </label>
              <label>
                Mobile phone
                <input required name="phone" type="tel" placeholder="(555) 555-0100" />
              </label>
              <label className="field-full">
                Email for main on-site contact
                <input
                  required
                  multiple
                  name="contact-emails"
                  type="email"
                  placeholder="name@company.com, second@company.com"
                />
                <small>The first address receives the Digital Twin invite. You can add other addresses separated by commas.</small>
              </label>
              <label>
                Preferred service date
                <input name="date" type="date" />
              </label>
              <label>
                Access window
                <select name="access-window" defaultValue="business">
                  <option value="business">Business hours</option>
                  <option value="before">Before opening</option>
                  <option value="after">After closing</option>
                  <option value="weekend">Weekend</option>
                  <option value="coordinate">Coordinate with contact</option>
                </select>
              </label>
              <label className="field-full">
                Access, security or site instructions
                <textarea
                  name="instructions"
                  placeholder="Loading entrance, escort, COI, PPE, tenant notifications, restricted areas…"
                />
              </label>
            </div>
          </section>

          <section
            className={`form-section ${
              checkoutStep === 2 ? "" : "checkout-step-hidden"
            }`}
          >
            <div className="section-heading">
              <span>04</span>
              <div>
                <p className="kicker">Order summary & payment</p>
                <h2>Confirm your service request</h2>
                <p>
                  Pay securely by credit card or ACH transfer, or request
                  invoice billing for a qualifying account. No charge is made
                  when this request is submitted.
                </p>
              </div>
            </div>
            <div className="payment-toggle">
              <button
                type="button"
                className={paymentMethod === "stripe" ? "selected" : ""}
                onClick={() => choosePaymentMethod("stripe")}
                aria-pressed={paymentMethod === "stripe"}
              >
                <span>Credit Card / ACH</span>
                <small>Pay with Credit Card or ACH transfer.</small>
              </button>
              <button
                type="button"
                className={paymentMethod === "invoice" ? "selected" : ""}
                onClick={() => choosePaymentMethod("invoice")}
                aria-pressed={paymentMethod === "invoice"}
              >
                <span>Invoice Billing</span>
                <small>Qualifying accounts may pay via invoice.</small>
              </button>
            </div>
            <p className="billing-details-intro">
              {paymentMethod === "invoice"
                ? "Provide the billing contact and accounts-payable details for invoice review."
                : "Enter the payment contact before opening the secure Stripe payment form."}
            </p>
            <div className="field-grid">
              <label>
                Billing contact
                <input
                  required={checkoutStep === 2}
                  name="billing-name"
                  placeholder="Full name"
                  value={billingName}
                  disabled={paymentMethod === "stripe" && Boolean(stripeClientSecret)}
                  onChange={(event) => setBillingName(event.target.value)}
                />
              </label>
              <label>
                Billing email
                <input
                  required={checkoutStep === 2}
                  name="billing-email"
                  type="email"
                  placeholder="billing@company.com"
                  value={billingEmail}
                  disabled={paymentMethod === "stripe" && Boolean(stripeClientSecret)}
                  onChange={(event) => setBillingEmail(event.target.value)}
                />
              </label>
              {paymentMethod === "invoice" && (
                <>
                  <label>
                    PO number
                    <input name="po" placeholder="Optional" />
                  </label>
                  <label>
                    Accounts payable email
                    <input name="ap-email" type="email" placeholder="Optional" />
                  </label>
                </>
              )}
            </div>
            {paymentMethod === "stripe" && (
              <div className="stripe-authorization-section">
                {!stripeClientSecret ? (
                  <>
                    <div className="stripe-explainer">
                      <strong>Secure Credit Card / ACH verification</strong>
                      <p>
                        Stripe will let you choose a credit card or ACH transfer
                        and securely save that payment method for the final
                        confirmed project amount. This does not place a hold or
                        charge the current estimate.
                      </p>
                    </div>
                    {stripeError && <p className="stripe-error">{stripeError}</p>}
                    <button
                      type="button"
                      className="primary-button"
                      disabled={!catalogReady || stripePreparing || taxStatus !== "ready" || !taxCalculationId}
                      onClick={preparePaymentAuthorization}
                    >
                      {stripePreparing
                        ? "Opening secure payment entry…"
                        : "Continue to Secure Payment Entry"}
                    </button>
                  </>
                ) : stripePublishableKey ? (
                  <StripePaymentSetup
                    billingName={billingName}
                    billingEmail={billingEmail}
                    companyName={brandName}
                    clientSecret={stripeClientSecret}
                    onComplete={completePaymentAuthorization}
                    publishableKey={stripePublishableKey}
                  />
                ) : (
                  <p className="stripe-error">
                    Secure payment entry is temporarily unavailable. Please request
                    an invoice.
                  </p>
                )}
              </div>
            )}
            <button
              className="text-button checkout-back-button"
              type="button"
              onClick={returnToOrder}
            >
              ← Back to edit services
            </button>
          </section>
        </div>

        <aside className="summary-card">
          <p className="kicker">Live project estimate</p>
          <h2>{propertyType}</h2>
          <div className="summary-metric">
            <span>Area in scope</span>
            <strong>{squareFeet.toLocaleString()} sq ft</strong>
          </div>
          <div className="summary-metric">
            <span>Land area in scope</span>
            <strong>
              {landAreaValue.toLocaleString()} {landAreaUnit === "acres" ? "acres" : "sq ft"}
            </strong>
          </div>
          <div className="summary-metric">
            <span>Selection</span>
            <strong>
              {packageId === "custom"
                ? `Build your own · ${
                    activeTourOptions.find(
                      (option) => option.id === customTour,
                    )?.name
                  }`
                : activePackages.find((pkg) => pkg.id === packageId)?.name}
            </strong>
          </div>
          <div className="summary-metric">
            <span>Payment</span>
            <strong>
              {paymentMethod === "stripe"
                ? "Credit Card / ACH"
                : "Invoice Billing requested"}
            </strong>
          </div>
          <div className="summary-metric">
            <span>Location pricing</span>
            <strong>
              {hasLocationRate
                ? catalogBrandKey === "floorplanonline"
                  ? "Location-adjusted rates"
                  : "Regional rate applied"
                : "Standard"}
            </strong>
          </div>
          <div className="summary-divider" />
          <div className="summary-breakdown">
            <span className="summary-breakdown-title">Order details</span>
            {estimate.lineItems.length > 0 ? (
              estimate.lineItems.map((lineItem, index) => (
                <div
                  className={`summary-line-item ${lineItem.kind}`}
                  key={`${lineItem.kind}-${lineItem.label}-${index}`}
                >
                  <span>{lineItem.label}</span>
                  <strong>{money(lineItem.price)}</strong>
                </div>
              ))
            ) : (
              <p className="summary-empty">
                Select services to see itemized pricing.
              </p>
            )}
          </div>
          <div className="summary-line-item tax">
            <span>Sales tax</span>
            <strong>
              {taxStatus === "loading"
                ? "Calculating…"
                : taxStatus === "ready"
                  ? money(salesTax)
                  : taxStatus === "unavailable"
                    ? "Unable to calculate"
                    : "Calculated at review"}
            </strong>
          </div>
          <div className="summary-divider summary-total-divider" />
          <div className="summary-total">
            <span>
              {taxStatus === "ready"
                ? "Current estimated total"
                : "Current estimate before tax"}
            </span>
            <strong>{money(orderTotal)}</strong>
          </div>
          {estimate.requiresReview && (
            <p className="review-flag">
              Final total requires scope confirmation.
            </p>
          )}
          {submissionError && <p className="stripe-error" role="alert">{submissionError}</p>}
          {taxStatus === "unavailable" && (
            <p className="stripe-error" role="status">
              Tax could not be calculated. Check the property address or refresh the page before submitting.
            </p>
          )}
          {checkoutStep === 1 ? (
            <button
              className="primary-button"
              type="button"
              disabled={!catalogReady}
              onClick={reviewOrder}
            >
              Review Order
            </button>
          ) : paymentMethod === "invoice" ? (
            <button
              className="primary-button"
              type="submit"
              disabled={!catalogReady || taxStatus !== "ready" || submittingOrder}
            >
              {submittingOrder ? "Submitting Service Request…" : "Submit Service Request"}
            </button>
          ) : (
            <p className="summary-action-note">
              Complete secure payment verification to submit this request.
            </p>
          )}
          <p className="fine-print">
            No charge is made when you submit. We will confirm the time and
            other additional charges, if any, for travel, access complexity and
            scope-based item tagging. Final pricing is based on total measured
            building and land area, as applicable.
          </p>
          {brandConfig?.supportUrl && (
            <p className="fine-print">
              Need help? <a href={brandConfig.supportUrl} target="_blank" rel="noreferrer">
                Contact {brandName} support
              </a>.
            </p>
          )}
          {(brandConfig?.termsUrl || brandConfig?.privacyUrl) && (
            <p className="fine-print">
              {brandConfig.termsUrl && <a href={brandConfig.termsUrl} target="_blank" rel="noreferrer">Terms of Use</a>}
              {brandConfig.termsUrl && brandConfig.privacyUrl && " · "}
              {brandConfig.privacyUrl && <a href={brandConfig.privacyUrl} target="_blank" rel="noreferrer">Privacy Policy</a>}
            </p>
          )}
        </aside>
      </form>
    </main>
  );
}
