# Deploy the Google pricing endpoint

The spreadsheet now contains three API-ready tabs: `Pricing Engine`, `Discount Tiers`, and `NYC ZIP Codes`.

1. Open the Commercial Pricing spreadsheet.
2. Choose **Extensions → Apps Script**.
3. Replace the editor contents with `google-pricing-apps-script.gs`, then save.
4. Choose **Deploy → New deployment → Web app**. Execute as the spreadsheet owner and allow access to **Anyone** so the public order form can read pricing.
5. Copy the `/exec` URL into `GOOGLE_PRICING_SCRIPT_URL` in the site’s runtime environment.

The form requests `/api/pricing`, which proxies the Apps Script endpoint. If Google is temporarily unavailable or the URL has not been configured, the form uses the matching built-in pricing snapshot and labels it as a fallback.

After changing prices, tiers, or ZIP multipliers in the three machine-readable tabs, the order form will pick up the changes without a code deployment. Responses are cached for no more than one minute.
