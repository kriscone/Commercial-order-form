"use client";

import { useMemo, useState } from "react";

type PackageId = "market" | "plan" | "build" | "custom";
type PaymentMethod = "card" | "invoice";

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
    name: "Market",
    eyebrow: "Capture & showcase",
    base: 799,
    increment: 220,
    description:
      "Professional photography and an immersive 3D tour for marketing, leasing and stakeholder review.",
    includes: ["Professional photography", "3D tour", "12 months of hosting"],
  },
  {
    id: "plan" as const,
    name: "Plan",
    eyebrow: "Visualize & collaborate",
    base: 1499,
    increment: 400,
    description:
      "Adds interactive 2D/3D floor plans and the HomeDiary space planner to your capture package.",
    includes: [
      "Everything in Market",
      "2D/3D floor plans",
      "Interactive space planner",
    ],
    recommended: true,
  },
  {
    id: "build" as const,
    name: "Build",
    eyebrow: "Document & execute",
    base: 2499,
    increment: 650,
    description:
      "A documentation-ready package with floor plans, planning tools and CAD deliverables.",
    includes: ["Everything in Plan", "CAD / DWG files", "Item-tagging setup"],
  },
];

const customDeliverables = [
  {
    id: "photography",
    name: "Professional photography",
    detail: "Commercial HDR photography",
    type: "flat",
    base: 395,
    increment: 0,
  },
  {
    id: "tour",
    name: "3D tour",
    detail: "iGUIDE capture and hosted walkthrough",
    type: "scaled",
    base: 549,
    increment: 150,
  },
  {
    id: "planner",
    name: "2D/3D plans + space planner",
    detail: "Interactive plans with planning tools",
    type: "scaled",
    base: 349,
    increment: 70,
  },
  {
    id: "cad",
    name: "CAD files",
    detail: "Drafted DWG files",
    type: "scaled",
    base: 50,
    increment: 50,
  },
  {
    id: "tagging",
    name: "Item tagging",
    detail: "Equipment and asset cataloging",
    type: "quote",
    base: 0,
    increment: 0,
  },
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function incrementCount(squareFeet: number) {
  return Math.max(0, Math.ceil((squareFeet - 1000) / 1000));
}

export default function Home() {
  const [propertyType, setPropertyType] = useState("Office");
  const [squareFeet, setSquareFeet] = useState(10000);
  const [packageId, setPackageId] = useState<PackageId>("plan");
  const [selectedCustom, setSelectedCustom] = useState<string[]>([
    "photography",
    "tour",
    "planner",
  ]);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("invoice");
  const [submitted, setSubmitted] = useState(false);

  const estimate = useMemo(() => {
    const sqft = Math.max(0, squareFeet || 0);
    const increments = incrementCount(sqft);
    const largeVenue = sqft > 20000;
    let amount = 0;
    let requiresReview = false;

    if (packageId === "custom") {
      selectedCustom.forEach((id) => {
        const item = customDeliverables.find((entry) => entry.id === id);
        if (!item) return;
        if (item.type === "quote") {
          requiresReview = true;
          return;
        }
        amount += item.base + item.increment * increments;
      });
      if (largeVenue) requiresReview = true;
    } else {
      const selectedPackage = packages.find((pkg) => pkg.id === packageId);
      if (selectedPackage) {
        if (largeVenue && packageId === "build") {
          amount = Math.max(7500, 14849 + (sqft - 20000) * 0.4);
        } else if (largeVenue) {
          amount =
            selectedPackage.base + selectedPackage.increment * increments;
          requiresReview = true;
        } else {
          amount =
            selectedPackage.base + selectedPackage.increment * increments;
        }
      }
    }

    return { amount, requiresReview, largeVenue, increments };
  }, [packageId, selectedCustom, squareFeet]);

  function toggleCustom(id: string) {
    setSelectedCustom((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
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
            HD
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
      <header className="site-header">
        <a className="brand" href="#top" aria-label="HomeDiary Commercial home">
          <span className="brand-mark">HD</span>
          <span>
            <strong>HomeDiary</strong>
            <small>Commercial</small>
          </span>
        </a>
        <div className="header-meta">
          <span>One property</span>
          <span className="header-dot" />
          <span>National service</span>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker">Commercial property capture & documentation</p>
          <h1>One property. Every space. Ready for what comes next.</h1>
          <p className="hero-text">
            Build a visual record for marketing, planning and operations—from
            professional photography to interactive floor plans, 3D tours, CAD
            files and item tagging.
          </p>
          <div className="hero-proof">
            <span>8 property categories</span>
            <span>5 core deliverables</span>
            <span>Card or invoice</span>
          </div>
        </div>
        <div className="hero-graphic" aria-hidden="true">
          <div className="building building-one" />
          <div className="building building-two" />
          <div className="building building-three" />
          <div className="grid-floor" />
          <div className="scan-line" />
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
                  placeholder="Street, city, state and ZIP"
                />
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
                  Pricing includes a 1,000 sq ft base and scales in 1,000 sq ft
                  increments through 20,000 sq ft.
                </p>
              </div>
            </div>

            <div className="package-grid">
              {packages.map((pkg) => {
                const packagePrice =
                  squareFeet > 20000 && pkg.id === "build"
                    ? Math.max(7500, 14849 + (squareFeet - 20000) * 0.4)
                    : pkg.base + pkg.increment * incrementCount(squareFeet);
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
              <button
                type="button"
                className={`package-card custom-card ${packageId === "custom" ? "selected" : ""}`}
                onClick={() => setPackageId("custom")}
                aria-pressed={packageId === "custom"}
              >
                <span className="package-eyebrow">À la carte</span>
                <span className="package-title">
                  <strong>Build your own</strong>
                  <strong>Flexible</strong>
                </span>
                <span className="package-description">
                  Select only the capture and documentation services your
                  project needs.
                </span>
              </button>
            </div>

            {packageId === "custom" && (
              <div className="custom-deliverables">
                {customDeliverables.map((item) => (
                  <label
                    key={item.id}
                    className={
                      selectedCustom.includes(item.id) ? "selected" : ""
                    }
                  >
                    <input
                      type="checkbox"
                      checked={selectedCustom.includes(item.id)}
                      onChange={() => toggleCustom(item.id)}
                    />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <b>
                      {item.type === "quote"
                        ? "Scope review"
                        : item.type === "flat"
                          ? money(item.base)
                          : `from ${money(item.base)}`}
                    </b>
                  </label>
                ))}
              </div>
            )}

            {estimate.largeVenue && (
              <div className="pricing-note">
                <strong>Large-property pricing applied.</strong>
                <span>
                  The 20,000 sq ft breakpoint and declining large-venue rate are
                  reflected in the estimate. Final travel and site complexity
                  are confirmed before payment.
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
                ? "Build your own"
                : packages.find((pkg) => pkg.id === packageId)?.name}
            </strong>
          </div>
          <div className="summary-metric">
            <span>Payment</span>
            <strong>{paymentMethod === "card" ? "Card" : "Invoice"}</strong>
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
            Request scope confirmation
          </button>
          <p className="fine-print">
            No charge is made when you submit. Travel, access complexity and
            scope-based item tagging are confirmed first.
          </p>
          <div className="summary-source">
            <span>Pricing basis</span>
            <strong>National 2026</strong>
            <small>Excludes NYC and select high-cost markets</small>
          </div>
        </aside>
      </form>
    </main>
  );
}
