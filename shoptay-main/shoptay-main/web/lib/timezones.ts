export interface TimezoneOption {
  value: string;
  label: string;
  country: string;
  currency: string;
  currencySymbol: string;
  currencyCode: string;
}

// Country population data (in millions) - only show countries with population > 10M
const COUNTRY_POPULATIONS: Record<string, number> = {
  Vietnam: 98,
  Japan: 125,
  "South Korea": 52,
  Pakistan: 240,
  Bangladesh: 173,
  Nigeria: 223,
  Ethiopia: 126,
  Iran: 89,
  "Saudi Arabia": 36,
  Argentina: 46,
  Colombia: 52,
  Ukraine: 37,
  Kenya: 55,
  Myanmar: 55,
  Tanzania: 67,
  Algeria: 45,
  Morocco: 37,
  Peru: 34,
  Uzbekistan: 36,
  Iraq: 45,
  Thailand: 71,
  Indonesia: 277,
  Philippines: 120,
  Malaysia: 34,
  China: 1412,
  Taiwan: 23,
  India: 1428,
  "United States": 339,
  Canada: 39,
  Brazil: 215,
  Mexico: 128,
  "United Kingdom": 68,
  France: 68,
  Germany: 84,
  Italy: 58,
  Spain: 48,
  Netherlands: 17,
  Russia: 144,
  Turkey: 86,
  Poland: 37,
  Australia: 26,
  Egypt: 104,
  "South Africa": 60,
};

const COUNTRY_CURRENCY_MAP: Record<string, { currency: string; symbol: string }> = {
  Vietnam:       { currency: "VND", symbol: "₫" },
  Japan:         { currency: "JPY", symbol: "¥" },
  "South Korea": { currency: "KRW", symbol: "₩" },
  Pakistan:      { currency: "PKR", symbol: "Rs" },
  Bangladesh:    { currency: "BDT", symbol: "৳" },
  Nigeria:       { currency: "NGN", symbol: "₦" },
  Ethiopia:      { currency: "ETB", symbol: "Br" },
  Iran:          { currency: "IRR", symbol: "﷼" },
  "Saudi Arabia": { currency: "SAR", symbol: "SR" },
  Argentina:     { currency: "ARS", symbol: "$" },
  Colombia:      { currency: "COP", symbol: "$" },
  Ukraine:       { currency: "UAH", symbol: "₴" },
  Kenya:         { currency: "KES", symbol: "KSh" },
  Myanmar:       { currency: "MMK", symbol: "K" },
  Tanzania:      { currency: "TZS", symbol: "TSh" },
  Algeria:       { currency: "DZD", symbol: "DA" },
  Morocco:       { currency: "MAD", symbol: "DH" },
  Peru:          { currency: "PEN", symbol: "S/" },
  Uzbekistan:    { currency: "UZS", symbol: "so'm" },
  Iraq:          { currency: "IQD", symbol: "ID" },
  Singapore:     { currency: "SGD", symbol: "S$" },
  Thailand:      { currency: "THB", symbol: "฿" },
  Indonesia:     { currency: "IDR", symbol: "Rp" },
  Philippines:   { currency: "PHP", symbol: "₱" },
  Malaysia:      { currency: "MYR", symbol: "RM" },
  China:         { currency: "CNY", symbol: "¥" },
  "Hong Kong":   { currency: "HKD", symbol: "HK$" },
  Taiwan:        { currency: "TWD", symbol: "NT$" },
  India:         { currency: "INR", symbol: "₹" },
  UAE:           { currency: "AED", symbol: "Dh" },
  "United States": { currency: "USD", symbol: "$" },
  Canada:        { currency: "CAD", symbol: "C$" },
  Brazil:        { currency: "BRL", symbol: "R$" },
  Mexico:        { currency: "MXN", symbol: "MX$" },
  "United Kingdom": { currency: "GBP", symbol: "£" },
  France:        { currency: "EUR", symbol: "€" },
  Germany:       { currency: "EUR", symbol: "€" },
  Italy:         { currency: "EUR", symbol: "€" },
  Spain:         { currency: "EUR", symbol: "€" },
  Netherlands:   { currency: "EUR", symbol: "€" },
  Russia:        { currency: "RUB", symbol: "₽" },
  Turkey:        { currency: "TRY", symbol: "₺" },
  Poland:        { currency: "PLN", symbol: "zł" },
  Australia:     { currency: "AUD", symbol: "A$" },
  "New Zealand": { currency: "NZD", symbol: "NZ$" },
  Egypt:         { currency: "EGP", symbol: "E£" },
  "South Africa": { currency: "ZAR", symbol: "R" },
  Iceland:       { currency: "ISK", symbol: "kr" },
};

const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  KRW: 1340,
  CNY: 7.24,
  HKD: 7.79,
  TWD: 31.5,
  SGD: 1.34,
  THB: 35.2,
  MYR: 4.72,
  PHP: 56.5,
  IDR: 15700,
  VND: 24800,
  INR: 83.5,
  AED: 3.67,
  RUB: 92,
  TRY: 32.5,
  PLN: 4.0,
  AUD: 1.53,
  NZD: 1.63,
  BRL: 4.97,
  MXN: 17.2,
  EGP: 30.9,
  ZAR: 18.8,
  ISK: 138,
  PKR: 278,
  BDT: 117,
  NGN: 1540,
  ETB: 57,
  IRR: 42000,
  SAR: 3.75,
  ARS: 890,
  COP: 3900,
  UAH: 40,
  KES: 129,
  MMK: 2100,
  TZS: 2550,
  DZD: 134,
  MAD: 10,
  PEN: 3.7,
  UZS: 12600,
  IQD: 1310,
};

export interface TimezoneWithCurrency extends TimezoneOption {
  currency: string;
  currencySymbol: string;
  currencyCode: string;
}

export const ALL_TIMEZONES: TimezoneOption[] = [
  { value: "Asia/Ho_Chi_Minh", label: "Vietnam (ICT)", country: "Vietnam", currency: "VND", currencySymbol: "₫", currencyCode: "VND" },
  { value: "Asia/Tokyo", label: "Japan (JST)", country: "Japan", currency: "JPY", currencySymbol: "¥", currencyCode: "JPY" },
  { value: "Asia/Seoul", label: "Korea (KST)", country: "South Korea", currency: "KRW", currencySymbol: "₩", currencyCode: "KRW" },
  { value: "Asia/Karachi", label: "Pakistan (PKT)", country: "Pakistan", currency: "PKR", currencySymbol: "Rs", currencyCode: "PKR" },
  { value: "Asia/Dhaka", label: "Bangladesh (BST)", country: "Bangladesh", currency: "BDT", currencySymbol: "৳", currencyCode: "BDT" },
  { value: "Africa/Lagos", label: "Nigeria (WAT)", country: "Nigeria", currency: "NGN", currencySymbol: "₦", currencyCode: "NGN" },
  { value: "Africa/Addis_Ababa", label: "Ethiopia (EAT)", country: "Ethiopia", currency: "ETB", currencySymbol: "Br", currencyCode: "ETB" },
  { value: "Asia/Tehran", label: "Iran (IRST)", country: "Iran", currency: "IRR", currencySymbol: "﷼", currencyCode: "IRR" },
  { value: "Asia/Riyadh", label: "Saudi Arabia (AST)", country: "Saudi Arabia", currency: "SAR", currencySymbol: "SR", currencyCode: "SAR" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (ART)", country: "Argentina", currency: "ARS", currencySymbol: "$", currencyCode: "ARS" },
  { value: "America/Bogota", label: "Colombia (COT)", country: "Colombia", currency: "COP", currencySymbol: "$", currencyCode: "COP" },
  { value: "Europe/Kyiv", label: "Ukraine (EET)", country: "Ukraine", currency: "UAH", currencySymbol: "₴", currencyCode: "UAH" },
  { value: "Africa/Nairobi", label: "Kenya (EAT)", country: "Kenya", currency: "KES", currencySymbol: "KSh", currencyCode: "KES" },
  { value: "Asia/Yangon", label: "Myanmar (MMT)", country: "Myanmar", currency: "MMK", currencySymbol: "K", currencyCode: "MMK" },
  { value: "Africa/Dar_es_Salaam", label: "Tanzania (EAT)", country: "Tanzania", currency: "TZS", currencySymbol: "TSh", currencyCode: "TZS" },
  { value: "Africa/Algiers", label: "Algeria (CET)", country: "Algeria", currency: "DZD", currencySymbol: "DA", currencyCode: "DZD" },
  { value: "Africa/Casablanca", label: "Morocco (WET)", country: "Morocco", currency: "MAD", currencySymbol: "DH", currencyCode: "MAD" },
  { value: "America/Lima", label: "Peru (PET)", country: "Peru", currency: "PEN", currencySymbol: "S/", currencyCode: "PEN" },
  { value: "Asia/Tashkent", label: "Uzbekistan (UZT)", country: "Uzbekistan", currency: "UZS", currencySymbol: "so'm", currencyCode: "UZS" },
  { value: "Asia/Baghdad", label: "Iraq (AST)", country: "Iraq", currency: "IQD", currencySymbol: "ID", currencyCode: "IQD" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", country: "Singapore", currency: "SGD", currencySymbol: "S$", currencyCode: "SGD" },
  { value: "Asia/Bangkok", label: "Thailand (ICT)", country: "Thailand", currency: "THB", currencySymbol: "฿", currencyCode: "THB" },
  { value: "Asia/Jakarta", label: "Indonesia (WIB)", country: "Indonesia", currency: "IDR", currencySymbol: "Rp", currencyCode: "IDR" },
  { value: "Asia/Manila", label: "Philippines (PST)", country: "Philippines", currency: "PHP", currencySymbol: "₱", currencyCode: "PHP" },
  { value: "Asia/Kuala_Lumpur", label: "Malaysia (MYT)", country: "Malaysia", currency: "MYR", currencySymbol: "RM", currencyCode: "MYR" },
  { value: "Asia/Shanghai", label: "China (CST)", country: "China", currency: "CNY", currencySymbol: "¥", currencyCode: "CNY" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)", country: "Hong Kong", currency: "HKD", currencySymbol: "HK$", currencyCode: "HKD" },
  { value: "Asia/Taipei", label: "Taiwan (CST)", country: "Taiwan", currency: "TWD", currencySymbol: "NT$", currencyCode: "TWD" },
  { value: "Asia/Kolkata", label: "India (IST)", country: "India", currency: "INR", currencySymbol: "₹", currencyCode: "INR" },
  { value: "Asia/Dubai", label: "UAE (GST)", country: "UAE", currency: "AED", currencySymbol: "Dh", currencyCode: "AED" },
  { value: "America/New_York", label: "US Eastern (EST)", country: "United States", currency: "USD", currencySymbol: "$", currencyCode: "USD" },
  { value: "America/Chicago", label: "US Central (CST)", country: "United States", currency: "USD", currencySymbol: "$", currencyCode: "USD" },
  { value: "America/Denver", label: "US Mountain (MST)", country: "United States", currency: "USD", currencySymbol: "$", currencyCode: "USD" },
  { value: "America/Los_Angeles", label: "US Pacific (PST)", country: "United States", currency: "USD", currencySymbol: "$", currencyCode: "USD" },
  { value: "America/Anchorage", label: "Alaska (AKST)", country: "United States", currency: "USD", currencySymbol: "$", currencyCode: "USD" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST)", country: "United States", currency: "USD", currencySymbol: "$", currencyCode: "USD" },
  { value: "America/Toronto", label: "Canada Eastern (EST)", country: "Canada", currency: "CAD", currencySymbol: "C$", currencyCode: "CAD" },
  { value: "America/Vancouver", label: "Canada Pacific (PST)", country: "Canada", currency: "CAD", currencySymbol: "C$", currencyCode: "CAD" },
  { value: "America/Sao_Paulo", label: "Brazil (BRT)", country: "Brazil", currency: "BRL", currencySymbol: "R$", currencyCode: "BRL" },
  { value: "America/Mexico_City", label: "Mexico City (CST)", country: "Mexico", currency: "MXN", currencySymbol: "MX$", currencyCode: "MXN" },
  { value: "Europe/London", label: "UK (GMT/BST)", country: "United Kingdom", currency: "GBP", currencySymbol: "£", currencyCode: "GBP" },
  { value: "Europe/Paris", label: "France (CET)", country: "France", currency: "EUR", currencySymbol: "€", currencyCode: "EUR" },
  { value: "Europe/Berlin", label: "Germany (CET)", country: "Germany", currency: "EUR", currencySymbol: "€", currencyCode: "EUR" },
  { value: "Europe/Rome", label: "Italy (CET)", country: "Italy", currency: "EUR", currencySymbol: "€", currencyCode: "EUR" },
  { value: "Europe/Madrid", label: "Spain (CET)", country: "Spain", currency: "EUR", currencySymbol: "€", currencyCode: "EUR" },
  { value: "Europe/Amsterdam", label: "Netherlands (CET)", country: "Netherlands", currency: "EUR", currencySymbol: "€", currencyCode: "EUR" },
  { value: "Europe/Moscow", label: "Moscow (MSK)", country: "Russia", currency: "RUB", currencySymbol: "₽", currencyCode: "RUB" },
  { value: "Europe/Istanbul", label: "Turkey (TRT)", country: "Turkey", currency: "TRY", currencySymbol: "₺", currencyCode: "TRY" },
  { value: "Europe/Warsaw", label: "Poland (CET)", country: "Poland", currency: "PLN", currencySymbol: "zł", currencyCode: "PLN" },
  { value: "Australia/Sydney", label: "Sydney (AEST)", country: "Australia", currency: "AUD", currencySymbol: "A$", currencyCode: "AUD" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST)", country: "Australia", currency: "AUD", currencySymbol: "A$", currencyCode: "AUD" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST)", country: "Australia", currency: "AUD", currencySymbol: "A$", currencyCode: "AUD" },
  { value: "Australia/Perth", label: "Perth (AWST)", country: "Australia", currency: "AUD", currencySymbol: "A$", currencyCode: "AUD" },
  { value: "Pacific/Auckland", label: "New Zealand (NZST)", country: "New Zealand", currency: "NZD", currencySymbol: "NZ$", currencyCode: "NZD" },
  { value: "Africa/Cairo", label: "Egypt (EET)", country: "Egypt", currency: "EGP", currencySymbol: "E£", currencyCode: "EGP" },
  { value: "Africa/Johannesburg", label: "South Africa (SAST)", country: "South Africa", currency: "ZAR", currencySymbol: "R", currencyCode: "ZAR" },
  { value: "Atlantic/Reykjavik", label: "Iceland (GMT)", country: "Iceland", currency: "ISK", currencySymbol: "kr", currencyCode: "ISK" },
];

export function detectUserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  }
  catch (_) { }
  return "Asia/Ho_Chi_Minh";
}

export function getTimezoneInfo(tzValue: string): TimezoneOption {
  return ALL_TIMEZONES.find((t) => t.value === tzValue) || {
    value: tzValue,
    label: tzValue,
    country: "Other",
    currency: "USD",
    currencySymbol: "$",
    currencyCode: "USD",
  };
}

export function filterTimezones(query: string): TimezoneOption[] {
  if (!query.trim()) {
    // Filter by population > 10M when no search query
    return ALL_TIMEZONES.filter((tz) => {
      const pop = COUNTRY_POPULATIONS[tz.country] || 0;
      return pop > 10;
    });
  }
  const q = query.toLowerCase();
  return ALL_TIMEZONES.filter(
    (t) =>
      (t.label.toLowerCase().includes(q) ||
      t.country.toLowerCase().includes(q) ||
      t.value.toLowerCase().includes(q) ||
      t.currency.toLowerCase().includes(q)) &&
      (COUNTRY_POPULATIONS[t.country] || 0) > 10
  );
}

export function convertPrice(usdPrice: number, targetCurrency: string): number {
  const rate = USD_RATES[targetCurrency] || 1;
  const converted = usdPrice * rate;
  if (targetCurrency === "JPY" || targetCurrency === "KRW" || targetCurrency === "IDR" || targetCurrency === "VND" || targetCurrency === "ISK") {
    return Math.round(converted);
  }
  return Math.round(converted * 100) / 100;
}

export function formatPrice(usdPrice: number, currency: string = "USD", symbol: string = ""): string {
  const finalCurrency = currency || "USD";
  let finalSymbol = symbol;
  if (!finalSymbol) {
    const found = ALL_TIMEZONES.find((tz) => tz.currency === finalCurrency);
    finalSymbol = found ? found.currencySymbol : "$";
  }
  const converted = convertPrice(usdPrice, finalCurrency);
  if (finalCurrency === "USD" || finalCurrency === "EUR" || finalCurrency === "GBP" || finalCurrency === "AUD" || finalCurrency === "CAD" || finalCurrency === "NZD" || finalCurrency === "SGD" || finalCurrency === "HKD" || finalCurrency === "TWD" || finalCurrency === "CNY") {
    return finalSymbol + converted.toFixed(2);
  }
  return finalSymbol + Math.round(converted).toLocaleString();
}

export interface CountryGroup {
  country: string;
  flag: string;
  zones: TimezoneOption[];
}

export function getTimezonesGroupedByCountry(): CountryGroup[] {
  const map = new Map<string, TimezoneOption[]>();
  
  // Only include countries with population > 10M
  for (const tz of ALL_TIMEZONES) {
    const pop = COUNTRY_POPULATIONS[tz.country] || 0;
    if (pop <= 10) continue;
    
    const existing = map.get(tz.country) || [];
    existing.push(tz);
    map.set(tz.country, existing);
  }
  
  const flags: Record<string, string> = {
    Vietnam: "🇻🇳", Japan: "🇯🇵", "South Korea": "🇰🇷", Pakistan: "🇵🇰", Bangladesh: "🇧🇩",
    Nigeria: "🇳🇬", Ethiopia: "🇪🇹", Iran: "🇮🇷", "Saudi Arabia": "🇸🇦", Argentina: "🇦🇷",
    Colombia: "🇨🇴", Ukraine: "🇺🇦", Kenya: "🇰🇪", Myanmar: "🇲🇲", Tanzania: "🇹🇿",
    Algeria: "🇩🇿", Morocco: "🇲🇦", Peru: "🇵🇪", Uzbekistan: "🇺🇿", Iraq: "🇮🇶", Singapore: "🇸🇬",
    Thailand: "🇹🇭", Indonesia: "🇮🇩", Philippines: "🇵🇭", Malaysia: "🇲🇾",
    China: "🇨🇳", "Hong Kong": "🇭🇰", Taiwan: "🇹🇼", India: "🇮🇳", UAE: "🇦🇪",
    "United States": "🇺🇸", Canada: "🇨🇦", Brazil: "🇧🇷", Mexico: "🇲🇽",
    "United Kingdom": "🇬🇧", France: "🇫🇷", Germany: "🇩🇪", Italy: "🇮🇹",
    Spain: "🇪🇸", Netherlands: "🇳🇱", Russia: "🇷🇺", Turkey: "🇹🇷",
    Poland: "🇵🇱", Australia: "🇦🇺", "New Zealand": "🇳🇿", Egypt: "🇪🇬",
    "South Africa": "🇿🇦", Iceland: "🇮🇸"
  };
  const result: CountryGroup[] = [];
  for (const [country, zones] of map) {
    result.push({ country, flag: flags[country] || "🌐", zones });
  }
  return result;
}

