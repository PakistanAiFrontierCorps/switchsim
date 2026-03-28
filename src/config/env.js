const dotenv = require("dotenv");

dotenv.config();

const requiredKeys = ["ROAMIFY_ACCESS_TOKEN"];

for (const key of requiredKeys) {
  if (!process.env[key]) {
    console.warn(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  roamifyBaseUrl: process.env.ROAMIFY_BASE_URL || "https://api.getroamify.com",
  roamifyAccessToken: process.env.ROAMIFY_ACCESS_TOKEN || "",
  pricingMultiplier: Number(process.env.PRICING_MULTIPLIER) || 1,
  pricingFixedMarkup: Number(process.env.PRICING_FIXED_MARKUP) || 0,
  pricingMinimumPrice: Number(process.env.PRICING_MINIMUM_PRICE) || 0
};
