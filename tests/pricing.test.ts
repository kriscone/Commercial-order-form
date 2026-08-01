import assert from "node:assert/strict";
import test from "node:test";
import {
  fallbackPricingConfig,
  landAreaToAcres,
  priceForItem,
  pricingAreaForItem,
} from "../lib/pricing.ts";

const market = fallbackPricingConfig.items.find((item) => item.code === "market");
const tiers = fallbackPricingConfig.discountTiers;

test("marginal discounts apply only to increments in each band", () => {
  assert.equal(priceForItem(market, 10_000, tiers), 2_399);
  assert.equal(priceForItem(market, 10_001, tiers), 2_559);
  assert.equal(priceForItem(market, 30_000, tiers), 5_599);
  assert.equal(priceForItem(market, 30_001, tiers), 5_739);
});

test("tier boundaries never reduce the total price", () => {
  for (const boundary of [10_000, 30_000, 50_000, 100_000]) {
    const before = priceForItem(market, boundary, tiers);
    const after = priceForItem(market, boundary + 1, tiers);
    assert.ok(after >= before, `${boundary + 1} sq ft should not cost less than ${boundary} sq ft`);
  }
});

test("NYC multiplier doubles onsite services", () => {
  const standard = priceForItem(market, 30_001, tiers, 1);
  const nyc = priceForItem(market, 30_001, tiers, 2);
  assert.equal(nyc, standard * 2);
});

test("NYC multiplier does not affect production-only deliverables", () => {
  for (const code of [
    "cad",
    "roof",
    "rcp",
    "elevations",
    "model_3d",
    "video_bundle",
    "video_portrait",
    "video_horizontal",
  ]) {
    const pricingItem = fallbackPricingConfig.items.find(
      (candidate) => candidate.code === code,
    );
    assert.equal(
      priceForItem(pricingItem, 30_001, tiers, 2),
      priceForItem(pricingItem, 30_001, tiers, 1),
      `${code} should remain at standard pricing`,
    );
  }
});

test("NYC multiplier still applies to site plans and aerial work", () => {
  for (const code of ["site_plan", "aerial_mini", "aerial_full", "aerial_model"]) {
    const pricingItem = fallbackPricingConfig.items.find(
      (candidate) => candidate.code === code,
    );
    assert.equal(
      priceForItem(pricingItem, 50_000, tiers, 2),
      priceForItem(pricingItem, 50_000, tiers, 1) * 2,
      `${code} should use NYC pricing`,
    );
  }
});

test("half-acre services use land area instead of building area", () => {
  const sitePlan = fallbackPricingConfig.items.find(
    (candidate) => candidate.code === "site_plan",
  );
  assert.equal(pricingAreaForItem(sitePlan, 100_000, 0.5), 21_780);
  assert.equal(priceForItem(sitePlan, pricingAreaForItem(sitePlan, 100_000, 0.5), tiers), 300);
  assert.equal(priceForItem(sitePlan, pricingAreaForItem(sitePlan, 2_000, 1.5), tiers), 500);
});

test("land area accepts acres or square feet", () => {
  assert.equal(landAreaToAcres(1.5, "acres"), 1.5);
  assert.equal(landAreaToAcres(21_780, "square_feet"), 0.5);
  assert.equal(landAreaToAcres(43_560, "square_feet"), 1);
});

test("item tagging uses the $25 additional 1,000 sq ft rate", () => {
  const tagging = fallbackPricingConfig.items.find(
    (item) => item.code === "item_tagging",
  );
  assert.equal(tagging?.basePrice, 100);
  assert.equal(tagging?.incrementPrice, 25);
});
