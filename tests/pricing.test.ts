import assert from "node:assert/strict";
import test from "node:test";
import { fallbackPricingConfig, priceForItem } from "../lib/pricing.ts";

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

test("NYC multiplier doubles the complete service price", () => {
  const standard = priceForItem(market, 30_001, tiers, 1);
  const nyc = priceForItem(market, 30_001, tiers, 2);
  assert.equal(nyc, standard * 2);
});
