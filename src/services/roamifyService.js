const roamifyClient = require("./roamifyClient");
const {
  pricingFixedMarkup,
  pricingMinimumPrice,
  pricingMultiplier
} = require("../config/env");

function createAppError(message, statusCode, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function mapApiError(error) {
  if (error.response) {
    const statusCode = error.response.status || 500;
    const responseData = error.response.data;
    const apiMessage =
      responseData?.message ||
      responseData?.error ||
      responseData?.details?.message ||
      responseData?.data?.message ||
      responseData?.statusText ||
      "Roamify API request failed";

    return createAppError(apiMessage, statusCode, responseData);
  }

  if (error.request) {
    return createAppError("Roamify API did not respond in time", 504);
  }

  return createAppError(error.message || "Unexpected server error", 500);
}

function toBoolean(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value).toLowerCase() === "true";
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getRetailPrice(basePrice) {
  const wholesalePrice = Number(basePrice);

  if (!Number.isFinite(wholesalePrice)) {
    return 0;
  }

  const markedUpPrice = wholesalePrice * pricingMultiplier + pricingFixedMarkup;
  return roundCurrency(Math.max(markedUpPrice, pricingMinimumPrice));
}

function formatDataLabel(pkg) {
  const data = pkg.data || {};
  const isUnlimited = pkg.isUnlimited ?? data.isUnlimited;

  if (isUnlimited) {
    return "Unlimited";
  }

  const amount = Number(pkg.dataAmount ?? data.dataAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Flexible";
  }

  const unit = String(pkg.dataUnit || data.dataUnit || "MB").toUpperCase();

  if (unit === "MB" && amount >= 1024) {
    return `${formatNumber(amount / 1024)}GB`;
  }

  return `${formatNumber(amount)}${unit}`;
}

function buildFeatureList(pkg) {
  const features = [];
  const day = pkg.day ?? pkg.validity;

  if (day) {
    features.push(`${day} day validity`);
  }

  features.push(pkg.activation === "first-use" ? "Activates on first use" : "Activation details available after purchase");

  if (pkg.withHotspot) {
    features.push("Hotspot supported");
  }

  if (pkg.withUsageCheck) {
    features.push("Usage checks available");
  }

  if (pkg.withThrottle && pkg.throttle?.throttleThreshold) {
    features.push(
      `Throttle after ${pkg.throttle.throttleThreshold}${String(pkg.throttle.throttleThresholdUnit || "").toUpperCase()}`
    );
  }

  if (Array.isArray(pkg.notes) && pkg.notes.length > 0) {
    features.push(String(pkg.notes[0]));
  }

  return features.slice(0, 4);
}

function normalizePlan(group, pkg) {
  const data = pkg.data || {};
  const signals = group.signals || pkg.signals || [];
  const wholesalePrice = Number(pkg.price);

  return {
    id: pkg.packageId || pkg.id,
    slug: group.id,
    countryName: group.countryName,
    countryCode: group.countryCode,
    countrySlug: group.countrySlug,
    geography: group.geography || group.region || "local",
    region: group.region,
    title: pkg.package || pkg.name,
    dataLabel: formatDataLabel(pkg),
    day: pkg.day ?? pkg.validity,
    price: getRetailPrice(wholesalePrice),
    wholesalePrice,
    currency: pkg.currency || "USD",
    activation: pkg.activation,
    image: group.image,
    isUnlimited: Boolean(pkg.isUnlimited ?? data.isUnlimited),
    withHotspot: Boolean(pkg.withHotspot),
    withDataRoaming: Boolean(pkg.withDataRoaming),
    withUsageCheck: Boolean(pkg.withUsageCheck),
    withThrottle: Boolean(pkg.withThrottle),
    networks: Array.isArray(signals)
      ? signals.flatMap((signal) => signal.networks || []).filter(Boolean)
      : [],
    carriers: Array.isArray(signals)
      ? signals.flatMap((signal) => signal.carriers || []).filter(Boolean)
      : [],
    dataAmount: pkg.dataAmount ?? data.dataAmount,
    dataUnit: pkg.dataUnit ?? data.dataUnit,
    features: buildFeatureList(pkg)
  };
}

async function getCountries() {
  try {
    const response = await roamifyClient.get("/api/esim/countries");
    const countries = (response.data?.data?.countries || []).map((country) => ({
      ...country,
      code: country.code || country.countryCode || "",
      name: country.name || country.countryName || ""
    }));

    return countries.sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    throw mapApiError(error);
  }
}

async function getBalance() {
  try {
    const response = await roamifyClient.get("/api/balance");
    return response.data?.data || response.data;
  } catch (error) {
    throw mapApiError(error);
  }
}

function buildPlansQuery(filters = {}) {
  const query = {};

  if (filters.country) {
    query.country = String(filters.country).toUpperCase();
  }

  if (filters.geography) {
    query.geography = filters.geography;
  }

  if (filters.days) {
    query.days = Number(filters.days);
  }

  if (filters.gbs) {
    query.gbs = Number(filters.gbs);
  }

  if (filters.packageId) {
    query.packageId = filters.packageId;
  }

  const isUnlimited = toBoolean(filters.isUnlimited);
  if (isUnlimited !== undefined) {
    query.isUnlimited = isUnlimited;
  }

  return query;
}

async function getPlans(filters = {}) {
  try {
    const response = await roamifyClient.get("/api/esim/packages", {
      params: buildPlansQuery(filters)
    });

    const groups = response.data?.data?.packages || [];
    const plans = groups.flatMap((group) =>
      (group.packages || []).map((pkg) => normalizePlan(group, pkg))
    );

    return plans.sort((left, right) => left.price - right.price || left.day - right.day);
  } catch (error) {
    throw mapApiError(error);
  }
}

async function getPlanById(packageId) {
  const plans = await getPlans({ packageId });
  const plan = plans.find((item) => item.id === packageId);

  if (!plan) {
    throw createAppError("Plan not found", 404);
  }

  return plan;
}

async function createOrder(payload) {
  try {
    const response = await roamifyClient.post("/api/esim/order", payload);
    return response.data?.data || response.data;
  } catch (error) {
    console.error("Roamify order error:", {
      message: error.message,
      response: error.response?.data || null,
      status: error.response?.status || null,
      payload
    });
    throw mapApiError(error);
  }
}

module.exports = {
  createAppError,
  createOrder,
  getBalance,
  getCountries,
  getPlanById,
  getPlans
};
