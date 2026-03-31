const SUPPORTED_QUOTES = ["PKR", "SAR", "AED", "USD", "TRY", "EUR"];
const RATES_URL = `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${SUPPORTED_QUOTES.join(",")}`;
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

let cachedRates = null;
let cacheExpiresAt = 0;

async function fetchRates() {
  const response = await fetch(RATES_URL);

  if (!response.ok) {
    throw new Error(`Currency API failed with status ${response.status}`);
  }

  const payload = await response.json();
  const rates = payload.rates || {};

  cachedRates = {
    ...rates,
    USD: 1
  };
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;

  return cachedRates;
}

async function getRates() {
  if (cachedRates && Date.now() < cacheExpiresAt) {
    return cachedRates;
  }

  return fetchRates();
}

async function convertFromUsd(amount, currency) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return 0;
  }

  if (!currency || currency === "USD") {
    return Math.round((numericAmount + Number.EPSILON) * 100) / 100;
  }

  const rates = await getRates();
  const rate = Number(rates[currency]);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Missing exchange rate for ${currency}`);
  }

  return Math.round((numericAmount * rate + Number.EPSILON) * 100) / 100;
}

module.exports = {
  convertFromUsd
};
