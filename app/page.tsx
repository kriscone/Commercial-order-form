"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fallbackPricingConfig,
  normalizeZipCode,
  priceForItem,
  type PricingConfig,
} from "@/lib/pricing";

type PackageId = "market" | "plan" | "build" | "custom";
type PaymentMethod = "card" | "invoice";
type TourOptionId =
  | "walkthrough"
  | "photo-tour"
  | "floorplan-tour"
  | "components-only";

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

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Home() {
  const [propertyType, setPropertyType] = useState("Office");
  const [squareFeet, setSquareFeet] = useState(10000);
  const [zipCode, setZipCode] = useState("");
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(
    fallbackPricingConfig,
  );
  const [packageId, setPackageId] = useState<PackageId>("custom");
  const [customTour, setCustomTour] =
    useState<TourOptionId>("walkthrough");
  const [selectedCustom, setSelectedCustom] = useState<string[]>([]);
  const [additionalPhotoPacks, setAdditionalPhotoPacks] = useState(0);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("invoice");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/pricing")
      .then((response) => response.json())
      .then((config: PricingConfig) => {
        if (active && config.items?.length && config.discountTiers?.length) {
          setPricingConfig(config);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const pricingByCode = useMemo(
    () => new Map(pricingConfig.items.map((item) => [item.code, item])),
    [pricingConfig.items],
  );
  const locationMultiplier = pricingConfig.locationMultipliers[zipCode] ?? 1;
  const isNycPricing = locationMultiplier > 1;
  const canAddPhotoPacks =
    customTour === "photo-tour" ||
    (customTour === "components-only" &&
      selectedCustom.includes("photography"));
  const hasFloorPlanService =
    customTour === "walkthrough" ||
    customTour === "floorplan-tour" ||
    (customTour === "components-only" &&
      selectedCustom.some((id) => id === "tour" || id === "planner"));
  const has3DTourService =
    customTour === "walkthrough" ||
    (customTour === "components-only" && selectedCustom.includes("tour"));

  useEffect(() => {
    if (hasFloorPlanService) return;
    setSelectedCustom((current) =>
      current.filter((id) => !floorPlanAddonIds.has(id)),
    );
  }, [hasFloorPlanService]);

  useEffect(() => {
    if (has3DTourService) return;
    setSelectedCustom((current) =>
      current.filter((id) => id !== "tagging"),
    );
  }, [has3DTourService]);

  function priceForCode(code: string) {
    return priceForItem(
      pricingByCode.get(code),
      squareFeet,
      pricingConfig.discountTiers,
      locationMultiplier,
    );
  }

  const estimate = useMemo(() => {
    const sqft = Math.max(0, squareFeet || 0);
    const largeVenue = sqft > 10000;
    let amount = 0;
    let requiresReview = false;

    if (packageId === "custom") {
      const selectedTour = customTourOptions.find(
        (option) => option.id === customTour,
      );
      if (selectedTour) {
        amount += priceForItem(
          pricingByCode.get(selectedTour.pricingCode),
          sqft,
          pricingConfig.discountTiers,
          locationMultiplier,
        );
      }
      if (canAddPhotoPacks) {
        amount +=
          additionalPhotoPacks *
          (pricingByCode.get("additional_photos")?.basePrice ?? 50) *
          locationMultiplier;
      }
      selectedCustom.forEach((id) => {
        const item = customDeliverables.find((entry) => entry.id === id);
        if (!item) return;
        amount += priceForItem(
          pricingByCode.get(item.pricingCode),
          sqft,
          pricingConfig.discountTiers,
          locationMultiplier,
        );
      });
    } else {
      const selectedPackage = packages.find((pkg) => pkg.id === packageId);
      if (selectedPackage) {
        amount = priceForItem(
          pricingByCode.get(selectedPackage.pricingCode),
          sqft,
          pricingConfig.discountTiers,
          locationMultiplier,
        );
      }
    }

    return { amount: Math.round(amount), requiresReview, largeVenue };
  }, [
    additionalPhotoPacks,
    customTour,
    canAddPhotoPacks,
    packageId,
    selectedCustom,
    squareFeet,
    pricingByCode,
    pricingConfig.discountTiers,
    locationMultiplier,
  ]);

  function toggleCustom(id: string) {
    if (id === "photography" && selectedCustom.includes(id)) {
      setAdditionalPhotoPacks(0);
    }
    setSelectedCustom((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function chooseCustomTour(id: TourOptionId) {
    setCustomTour(id);
    if (id !== "photo-tour") {
      setAdditionalPhotoPacks(0);
    }
    if (id !== "components-only") {
      setSelectedCustom((current) =>
        current.filter((item) => !aLaCarteIds.includes(item)),
      );
    }
  }

  function renderCustomDeliverable(
    item: (typeof customDeliverables)[number],
  ) {
    const pricingItem = pricingByCode.get(item.pricingCode);
    const requires3DTour = item.id === "tagging";
    const isDisabled =
      (floorPlanAddonIds.has(item.id) && !hasFloorPlanService) ||
      (requires3DTour && !has3DTourService);
    return (
      <label
        key={item.id}
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
                : "Requires a 3D tour or floor plan selection."}
            </small>
          )}
          <small className="component-rate">
            {item.id === "tagging"
              ? `${money((pricingItem?.basePrice ?? 0) * locationMultiplier)} base through 2,000 sq ft + ${money((pricingItem?.incrementPrice ?? 0) * locationMultiplier)}/additional 1,000 sq ft - available with 3D Tour options only`
              : item.type === "flat"
              ? `${money((pricingItem?.basePrice ?? 0) * locationMultiplier)} flat`
              : item.type === "half-acre"
                ? `${money((pricingItem?.basePrice ?? 0) * locationMultiplier)} covers up to 1/2 acre + ${money((pricingItem?.incrementPrice ?? 0) * locationMultiplier)}/additional 1/2 acre`
                : `${money((pricingItem?.basePrice ?? 0) * locationMultiplier)} base through 2,000 sq ft + ${money((pricingItem?.incrementPrice ?? 0) * locationMultiplier)}/additional 1,000 sq ft before marginal discounts`}
          </small>
        </span>
        <b>{money(priceForCode(item.pricingCode))}</b>
      </label>
    );
  }

  function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (submitted) {
    return (
      <main className="success-page">
        <section className="success-card">
          <div className="brand-mark" aria-hidden="true">
            FPO
          </div>
          <p className="kicker">Commercial project request received</p>
          <h1>Your property is ready for scope review.</h1>
          <p>
            We captured your {propertyType.toLowerCase()} project at{" "}
            {squareFeet.toLocaleString()} square feet. A commercial project
            specialist will confirm access, deliverables and final pricing
            before payment or invoicing.
          </p>
          <div className="success-total">
            <span>Current estimate</span>
            <strong>{money(estimate.amount)}</strong>
          </div>
          <button className="primary-button" onClick={() => setSubmitted(false)}>
            Edit request
          </button>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="order-intro" id="top">
        <div className="fpo-lockup">
          <img
            className="fpo-logo"
            src="/floorplanonline-logo.png"
            alt="FloorPlanOnline for Commercial Spaces"
          />
        </div>
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

      <form className="order-layout" onSubmit={submitOrder}>
        <div className="form-column">
          <section className="form-section">
            <div className="section-heading">
              <span>01</span>
              <div>
                <p className="kicker">Project details</p>
                <h2>Tell us about the property</h2>
                <p>
                  We currently scope and price one commercial property per
                  order.
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
                Property address
                <input
                  required
                  name="address"
                  placeholder="Street, city and state"
                />
              </label>
              <label>
                ZIP code
                <input
                  required
                  name="zip"
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  maxLength={5}
                  value={zipCode}
                  onChange={(event) =>
                    setZipCode(normalizeZipCode(event.target.value))
                  }
                  placeholder="00000"
                />
                {isNycPricing && (
                  <small className="nyc-pricing-message">
                    NYC pricing applies: all services are priced at 2×.
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

          <section className="form-section">
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
                onClick={() => setPackageId("plan")}
                aria-pressed={packageId !== "custom"}
              >
                <strong>All Inclusive</strong>
                <small>Choose Market, Plan, or Build</small>
              </button>
            </div>

            {packageId !== "custom" && (
            <div className="package-grid all-inclusive-grid">
              {packages.map((pkg) => {
                const packagePrice = priceForCode(pkg.pricingCode);
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

            {packageId === "custom" && (
              <div className="custom-builder">
                <div className="custom-subsection">
                  <div className="custom-subsection-heading">
                    <div>
                      <span>Choose a primary tour</span>
                      <p>
                        Select one of the three main tour products, or choose
                        à la carte services below.
                      </p>
                    </div>
                  </div>
                  <div className="tour-option-grid">
                    {customTourOptions.map((option) => {
                      const optionPrice =
                        option.id === "components-only"
                          ? 0
                          : priceForCode(option.pricingCode);
                      const pricingItem = pricingByCode.get(option.pricingCode);
                      return (
                        <button
                          type="button"
                          key={option.id}
                          className={`${customTour === option.id ? "selected" : ""} ${
                            option.id === "components-only"
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
                            {option.id === "components-only"
                              ? "Click to See Services"
                              : money(optionPrice)}
                          </b>
                          {option.id !== "components-only" && (
                            <em>
                              {pricingItem?.incrementPrice
                                ? `${money(pricingItem.basePrice * locationMultiplier)} base through 2,000 sq ft + ${money(pricingItem.incrementPrice * locationMultiplier)}/additional 1,000 sq ft before marginal discounts`
                                : `${money((pricingItem?.basePrice ?? 0) * locationMultiplier)} flat`}
                            </em>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {customTour === "components-only" && (
                  <div className="custom-subsection">
                    <div className="custom-subsection-heading">
                      <div>
                        <span>Choose à la carte services</span>
                        <p>
                          Select any combination of the three core property
                          media services.
                        </p>
                      </div>
                    </div>
                    <div className="custom-deliverables">
                      {aLaCarteDeliverables.map(renderCustomDeliverable)}
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
                          <strong>Additional Pro photos</strong>
                          <small>
                            Add photos in groups of 5 at $10 per photo.
                          </small>
                          <small className="component-rate">
                            {money(
                              (pricingByCode.get("additional_photos")?.basePrice ??
                                50) * locationMultiplier,
                            )} per 5-photo pack
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
                          {money(
                            additionalPhotoPacks *
                              (pricingByCode.get("additional_photos")?.basePrice ??
                                50) *
                              locationMultiplier,
                          )}
                        </b>
                      </div>
                    )}
                    {customAddons.map(renderCustomDeliverable)}
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

          <section className="form-section">
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

          <section className="form-section">
            <div className="section-heading">
              <span>04</span>
              <div>
                <p className="kicker">Billing</p>
                <h2>Choose card or invoice</h2>
                <p>
                  Complex scopes are confirmed before a charge is processed or
                  an invoice is issued.
                </p>
              </div>
            </div>
            <div className="payment-toggle">
              <button
                type="button"
                className={paymentMethod === "card" ? "selected" : ""}
                onClick={() => setPaymentMethod("card")}
                aria-pressed={paymentMethod === "card"}
              >
                <span>Card</span>
                <small>Secure payment after scope confirmation</small>
              </button>
              <button
                type="button"
                className={paymentMethod === "invoice" ? "selected" : ""}
                onClick={() => setPaymentMethod("invoice")}
                aria-pressed={paymentMethod === "invoice"}
              >
                <span>Invoice</span>
                <small>Send to your billing contact or AP team</small>
              </button>
            </div>
            <div className="field-grid">
              <label>
                Billing contact
                <input required name="billing-name" placeholder="Full name" />
              </label>
              <label>
                Billing email
                <input
                  required
                  name="billing-email"
                  type="email"
                  placeholder="billing@company.com"
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
            <span>Selection</span>
            <strong>
              {packageId === "custom"
                ? `Build your own · ${
                    customTourOptions.find(
                      (option) => option.id === customTour,
                    )?.name
                  }`
                : packages.find((pkg) => pkg.id === packageId)?.name}
            </strong>
          </div>
          <div className="summary-metric">
            <span>Payment</span>
            <strong>{paymentMethod === "card" ? "Card" : "Invoice"}</strong>
          </div>
          <div className="summary-metric">
            <span>Location pricing</span>
            <strong>{isNycPricing ? "NYC · 2×" : "Standard"}</strong>
          </div>
          <div className="summary-divider" />
          <div className="summary-total">
            <span>Current estimate</span>
            <strong>{money(estimate.amount)}</strong>
          </div>
          {estimate.requiresReview && (
            <p className="review-flag">
              Final total requires scope confirmation.
            </p>
          )}
          <button className="primary-button" type="submit">
            Confirm Service Request
          </button>
          <p className="fine-print">
            No charge is made when you submit. We will confirm the time and
            other additional charges, if any, for travel, access complexity and
            scope-based item tagging. Final pricing is based on total measured
            area.
          </p>
          <div className="summary-source">
            <span>Pricing basis</span>
            <strong>
              {pricingConfig.source === "google-sheet"
                ? "Live Google pricing sheet"
                : "Built-in pricing fallback"}
            </strong>
            <small>
              {isNycPricing
                ? "NYC 2× location multiplier included"
                : "Enter a project ZIP to confirm location pricing"}
            </small>
          </div>
        </aside>
      </form>
    </main>
  );
}
