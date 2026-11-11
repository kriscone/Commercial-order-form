# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## OMS Commercial Order Intake

The commercial checkout posts submitted invoice and saved payment method
requests to the server route `/api/oms/commercial-order`. Configure
`OMS_API_URL` as the OMS API base ending in `/api/v1` and
`OMS_COMMERCIAL_ORDER_API_KEY` as a server-only shared key. Configure the same
value on OMS as `COMMERCIAL_ORDER_API_KEY`. Configure
`OMS_COMMERCIAL_BRAND_KEY` on each form deployment (FloorPlanOnline uses
`floorplanonline`). OMS resolves that brand's configured account. Set
`COMMERCIAL_ORDER_MEMBER_ID` on OMS only when an installation should be pinned
to one account; leave it unset when multiple commercial brands share an OMS API.
Each resolved account must inherit a brand configured with
`orderFlow: "commercial"`.
The form loads its logo, company name, products, services, and add-ons from the
selected OMS brand. It uses built-in commercial choices only for
`floorplanonline` while that brand's catalog is empty. Other brands must
configure their own catalog in OMS Brand Settings. For logos on this separate
form deployment, use an HTTPS `logoSrc` reachable by the browser or add the
asset to the form's public directory.
The OMS SPA's FloorPlanOnline Brand Settings form starts with an editable
catalog based on this form's current products, services, add-ons, and shared
pricing codes. Save it from the FPO account to make that catalog the live
checkout source; each item can instead use a fixed price or a brand-owned
pricing rule.
At order submission the server recalculates shared pricing-code items from the
current pricing source and validates fixed and brand-rule prices against the
selected OMS catalog. It also verifies that the Stripe Tax calculation matches
the quote and property address; submission is blocked until that calculation is
current.
The legacy OMS variables `FPO_COMMERCIAL_ORDER_API_KEY` and
`FPO_COMMERCIAL_MEMBER_ID` remain supported as fallbacks. Never expose the
shared key through a `NEXT_PUBLIC_` variable.

OMS stores commercial requests in `commercial_order_requests` with their full
scoping and pricing payload, plus normalized product, service, and add-on quote
rows in `commercial_order_items`. Card details are handled by Stripe and are
never sent to OMS. The form server verifies the succeeded SetupIntent and its
matching customer, payment method, request ID, and estimate before forwarding
the order. OMS stores only Stripe reference IDs needed for follow-up, and the
order list response omits those references. The order reference is shown after
OMS confirms it has saved the request.

The first on-site contact email becomes the HomeDiary owner account and invite
address; additional on-site emails stay on the commercial request for staff.
The preferred date, occupancy, floor count, access window and instructions,
building count, and PO number are retained on the commercial request and the
applicable OMS order fields/notes. Billing contact details remain separate.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
