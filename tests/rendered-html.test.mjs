import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: pathname.startsWith("/api/") ? "application/json" : "text/html" },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the commercial order form", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Build your commercial property order/i);
  assert.match(html, /ZIP code/i);
  assert.match(html, /Confirm Service Request/i);
  assert.match(html, /FloorPlanOnline/i);
  assert.doesNotMatch(html, /loading skeleton|react-loading-skeleton/i);
});

test("pricing endpoint provides items, marginal tiers and ZIP multipliers", async () => {
  const response = await render("/api/pricing");
  assert.equal(response.status, 200);
  const config = await response.json();
  assert.ok(config.items.some((item) => item.code === "market"));
  assert.deepEqual(
    config.discountTiers.map((tier) => tier.discountPercent),
    [0, 0.2, 0.3, 0.45, 0.55],
  );
  assert.equal(config.locationMultipliers["10001"], 2);
});
