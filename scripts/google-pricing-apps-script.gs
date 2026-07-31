const PRICING_SHEET = 'Pricing Engine';
const DISCOUNT_SHEET = 'Discount Tiers';
const ZIP_SHEET = 'NYC ZIP Codes';

function doGet(event) {
  const action = String((event && event.parameter && event.parameter.action) || 'config');
  if (action !== 'config') return json_({ error: 'Unsupported action' });
  return json_(buildPricingConfig_());
}

function buildPricingConfig_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const pricingRows = values_(spreadsheet, PRICING_SHEET);
  const discountRows = values_(spreadsheet, DISCOUNT_SHEET);
  const zipRows = values_(spreadsheet, ZIP_SHEET);

  const items = pricingRows.slice(1)
    .filter((row) => row[0] && row[8] !== false)
    .map((row) => ({
      code: String(row[0]),
      category: String(row[1]),
      displayName: String(row[2]),
      pricingType: String(row[3]),
      baseCoverage: Number(row[4]) || 0,
      basePrice: Number(row[5]) || 0,
      incrementSize: Number(row[6]) || 0,
      incrementPrice: Number(row[7]) || 0,
      active: row[8] !== false,
      sortOrder: Number(row[9]) || 0,
      description: String(row[10] || ''),
    }));

  const discountTiers = discountRows.slice(1)
    .filter((row) => row[0] !== '')
    .map((row) => ({
      minSqFt: Number(row[0]) || 0,
      maxSqFt: Number(row[1]) || 999999999,
      discountPercent: Number(row[2]) || 0,
      label: String(row[3] || ''),
    }));

  const locationMultipliers = {};
  zipRows.slice(1).forEach((row) => {
    if (row[0] && row[2] !== false) locationMultipliers[String(row[0]).padStart(5, '0')] = Number(row[1]) || 1;
  });

  return {
    source: 'google-sheet',
    updatedAt: new Date().toISOString(),
    items,
    discountTiers,
    locationMultipliers,
  };
}

function values_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing required sheet: ' + sheetName);
  return sheet.getDataRange().getValues();
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
