import { fallbackBrandName, type CommercialBrandConfig } from "@/lib/brand-config";

export function getCommercialBrandKey() {
  const key = (process.env.OMS_COMMERCIAL_BRAND_KEY || "floorplanonline").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(key)) {
    throw new Error("OMS_COMMERCIAL_BRAND_KEY must be a valid brand key");
  }
  return key;
}

export async function getCommercialBrand() {
  const brandKey = getCommercialBrandKey();
  const omsApiUrl = process.env.OMS_API_URL?.replace(/\/$/, "");
  if (!omsApiUrl) return { brandKey, brandConfig: null as CommercialBrandConfig | null };
  try {
    const response = await fetch(`${omsApiUrl}/brands/${encodeURIComponent(brandKey)}/configuration`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return { brandKey, brandConfig: null as CommercialBrandConfig | null };
    const result = await response.json();
    const config = result?.data?.brand_config;
    if (result?.data?.brand_key !== brandKey || !config || typeof config !== "object") {
      return { brandKey, brandConfig: null as CommercialBrandConfig | null };
    }
    // Keep local logo paths relative to this form deployment. The OMS SPA and
    // commercial form have separate public asset roots; resolving `/...` here
    // against the API host points at the wrong server.
    const brandConfig = { ...config } as CommercialBrandConfig;
    return { brandKey, brandConfig };
  } catch {
    return { brandKey, brandConfig: null as CommercialBrandConfig | null };
  }
}

export function getCommercialBrandName(brandKey: string, config?: CommercialBrandConfig | null) {
  return config?.companyName?.trim() || fallbackBrandName(brandKey);
}
