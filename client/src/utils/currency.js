// ====================================================================
// TripMate - Currency Conversion & Localization Utility
// Static illustrative travel exchange rates, formatting, and mappings
// ====================================================================

import exchangeRatesData from '../data/exchangeRates.json';

// Static base rates and metadata loaded from centralized JSON
export const EXCHANGE_RATES = exchangeRatesData.rates || {
  USD: 1,
  INR: 83,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  IDR: 16000
};

export const BASE_CURRENCY = exchangeRatesData.baseCurrency || 'USD';
export const RATES_DISCLAIMER = exchangeRatesData.disclaimer || 'Illustrative static exchange rates for travel planning. Not live financial market rates.';

// Comprehensive Currency Metadata
export const CURRENCY_INFO = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', decimals: 2 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', decimals: 0 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', decimals: 2 },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', flag: '🇦🇪', decimals: 2 },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩', decimals: 0 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', decimals: 0 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦', decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', decimals: 2 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', decimals: 2 },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦', decimals: 2 }
};

export const SUPPORTED_CURRENCY_CODES = Object.keys(EXCHANGE_RATES);

// Country to Currency Mapping
export const COUNTRY_TO_CURRENCY = {
  'India': 'INR',
  'United States': 'USD',
  'USA': 'USD',
  'United Kingdom': 'GBP',
  'UK': 'GBP',
  'France': 'EUR',
  'Germany': 'EUR',
  'Italy': 'EUR',
  'Greece': 'EUR',
  'Spain': 'EUR',
  'Netherlands': 'EUR',
  'Switzerland': 'EUR',
  'Indonesia': 'IDR',
  'United Arab Emirates': 'AED',
  'UAE': 'AED',
  'Dubai': 'AED',
  'Japan': 'JPY',
  'Australia': 'AUD',
  'Canada': 'CAD',
  'Singapore': 'SGD',
  'South Africa': 'ZAR'
};

// Popular Countries List for required dropdown selection
export const POPULAR_COUNTRIES = [
  { name: 'India', code: 'IN', currency: 'INR', flag: '🇮🇳' },
  { name: 'United States', code: 'US', currency: 'USD', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', currency: 'GBP', flag: '🇬🇧' },
  { name: 'France', code: 'FR', currency: 'EUR', flag: '🇫🇷' },
  { name: 'Italy', code: 'IT', currency: 'EUR', flag: '🇮🇹' },
  { name: 'Greece', code: 'GR', currency: 'EUR', flag: '🇬🇷' },
  { name: 'Germany', code: 'DE', currency: 'EUR', flag: '🇩🇪' },
  { name: 'Switzerland', code: 'CH', currency: 'EUR', flag: '🇨🇭' },
  { name: 'United Arab Emirates', code: 'AE', currency: 'AED', flag: '🇦🇪' },
  { name: 'Indonesia', code: 'ID', currency: 'IDR', flag: '🇮🇩' },
  { name: 'Japan', code: 'JP', currency: 'JPY', flag: '🇯🇵' },
  { name: 'Australia', code: 'AU', currency: 'AUD', flag: '🇦🇺' },
  { name: 'Canada', code: 'CA', currency: 'CAD', flag: '🇨🇦' },
  { name: 'Singapore', code: 'SG', currency: 'SGD', flag: '🇸🇬' },
  { name: 'South Africa', code: 'ZA', currency: 'ZAR', flag: '🇿🇦' }
];

/**
 * Returns the default currency for a given country name.
 * Falls back to 'USD' if unrecognized.
 */
export const getCurrencyForCountry = (countryName) => {
  if (!countryName || typeof countryName !== 'string') return 'USD';
  const clean = countryName.trim();
  return COUNTRY_TO_CURRENCY[clean] || 'USD';
};

/**
 * Classifies a destination as 'domestic' or 'international' relative to home country.
 */
export const classifyDestination = (destinationCountry, homeCountry) => {
  if (!destinationCountry || !homeCountry) return 'international';
  const normDest = String(destinationCountry).trim().toLowerCase();
  const normHome = String(homeCountry).trim().toLowerCase();

  // Normalize aliases (e.g. USA vs United States, UK vs United Kingdom, UAE vs United Arab Emirates)
  const isMatch =
    normDest === normHome ||
    (normDest === 'usa' && normHome === 'united states') ||
    (normDest === 'united states' && normHome === 'usa') ||
    (normDest === 'uk' && normHome === 'united kingdom') ||
    (normDest === 'united kingdom' && normHome === 'uk') ||
    (normDest === 'uae' && normHome === 'united arab emirates') ||
    (normDest === 'united arab emirates' && normHome === 'uae');

  return isMatch ? 'domestic' : 'international';
};

/**
 * Core conversion formula:
 * convertedAmount = amount × targetRate ÷ sourceRate
 *
 * Edge cases handled:
 * - 0 or empty -> 0
 * - Same source and target -> exact amount
 * - Unsupported currencies -> returns original amount safely
 * - Non-numeric values -> parsed or returns 0
 */
export const convertCurrency = (amount, sourceCurrency, targetCurrency) => {
  const num = Number(amount);
  if (!num || isNaN(num) || num === 0) return 0;

  const src = String(sourceCurrency || 'USD').trim().toUpperCase();
  const tgt = String(targetCurrency || 'USD').trim().toUpperCase();

  if (src === tgt) return num;

  const srcRate = EXCHANGE_RATES[src];
  const tgtRate = EXCHANGE_RATES[tgt];

  if (srcRate === undefined || tgtRate === undefined || srcRate <= 0) {
    // Unsupported currency: return original amount without mutation
    return num;
  }

  // Pure mathematical conversion without rounding (keep precision intact for reporting)
  return (num * tgtRate) / srcRate;
};

/**
 * Formats a currency amount with symbol, locale grouping, and sensible precision.
 * Separates display rounding from actual calculations.
 */
export const formatCurrency = (amount, currencyCode = 'USD', options = {}) => {
  const num = Number(amount);
  if (isNaN(num)) return '0';

  const code = String(currencyCode || 'USD').trim().toUpperCase();
  const info = CURRENCY_INFO[code] || { symbol: code, decimals: 2 };

  const decimals = options.decimals !== undefined ? options.decimals : info.decimals;

  // Use appropriate locale for formatting
  let locale = 'en-US';
  if (code === 'INR') locale = 'en-IN';
  else if (code === 'EUR') locale = 'de-DE';
  else if (code === 'GBP') locale = 'en-GB';
  else if (code === 'IDR') locale = 'id-ID';
  else if (code === 'JPY') locale = 'ja-JP';

  const formattedNum = num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  if (options.symbolOnly) {
    return `${info.symbol}${formattedNum}`;
  }

  if (options.noSymbol) {
    return formattedNum;
  }

  // Default format: symbol + number (or symbol prefix/suffix according to convention)
  if (code === 'AED') {
    return `${formattedNum} AED`;
  }

  return `${info.symbol}${formattedNum}`;
};

/**
 * Helper to display dual currency values:
 * e.g., ₹4,150 (≈ $50 USD) when source and display currencies differ.
 */
export const formatDualCurrency = (amount, originalCurrency, displayCurrency) => {
  const origCurr = String(originalCurrency || displayCurrency).trim().toUpperCase();
  const dispCurr = String(displayCurrency || originalCurrency).trim().toUpperCase();

  if (origCurr === dispCurr) {
    return formatCurrency(amount, dispCurr);
  }

  const converted = convertCurrency(amount, origCurr, dispCurr);
  const dispStr = formatCurrency(converted, dispCurr);
  const origStr = formatCurrency(amount, origCurr);

  return `${dispStr} (≈ ${origStr} ${origCurr})`;
};

export default {
  EXCHANGE_RATES,
  BASE_CURRENCY,
  RATES_DISCLAIMER,
  CURRENCY_INFO,
  SUPPORTED_CURRENCY_CODES,
  COUNTRY_TO_CURRENCY,
  POPULAR_COUNTRIES,
  getCurrencyForCountry,
  classifyDestination,
  convertCurrency,
  formatCurrency,
  formatDualCurrency
};
