export type CommercialBrandConfig = {
  key?: string;
  orderFlow?: "home-diary" | "commercial";
  companyName?: string;
  productName?: string;
  logoSrc?: string;
  orderFormLogoSrc?: string;
  logoAlt?: string;
  supportUrl?: string;
  termsUrl?: string;
  privacyUrl?: string;
  publicPresentationBaseUrl?: string;
  publicGalleryBaseUrl?: string;
  terminology?: {
    story?: string;
    stories?: string;
    diary?: string;
    diaries?: string;
  };
  catalog?: {
    products?: CommercialCatalogEntry[];
    services?: CommercialCatalogEntry[];
    addons?: CommercialCatalogEntry[];
  };
};

export type CommercialCatalogEntry = {
  key: string;
  name: string;
  price?: number;
  active?: boolean;
  metadata?: Record<string, unknown>;
};

export function fallbackBrandName(brandKey: string) {
  if (brandKey === "floorplanonline") return "FloorPlanOnline";
  return brandKey
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Commercial Services";
}

export function brandLogoForForm(brandKey: string, configuredLogo?: string, orderFormLogo?: string) {
  if (orderFormLogo && /^https:\/\//i.test(orderFormLogo)) return orderFormLogo;
  if (orderFormLogo && orderFormLogo.startsWith("/") && !orderFormLogo.startsWith("//")) {
    return orderFormLogo;
  }
  if (configuredLogo && /^https:\/\//i.test(configuredLogo)) return configuredLogo;
  if (configuredLogo && configuredLogo.startsWith("/") && !configuredLogo.startsWith("//")) {
    if (brandKey === "floorplanonline" && configuredLogo === "/brands/floorplanonline-logo.png") {
      return "/floorplanonline-logo.png";
    }
    return brandKey === "floorplanonline" ? configuredLogo : undefined;
  }
  if (brandKey === "floorplanonline") return "/floorplanonline-logo.png";
  return undefined;
}
