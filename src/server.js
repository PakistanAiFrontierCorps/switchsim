const path = require("path");
const express = require("express");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const balanceRouter = require("./routes/balance");
const countriesRouter = require("./routes/countries");
const orderRouter = require("./routes/order");
const plansRouter = require("./routes/plans");
const {
  port,
  pricingFixedMarkup,
  pricingMinimumPrice,
  pricingMultiplier,
  roamifyAccessToken,
  roamifyBaseUrl
} = require("./config/env");

const app = express();
const publicDir = path.join(__dirname, "..", "public");

app.use(express.json());
app.use(express.static(publicDir));

app.get("/healthz", (_request, response) => {
  response.status(200).json({ ok: true });
});

app.get("/api/config-status", (_request, response) => {
  response.json({
    configured: Boolean(roamifyAccessToken),
    environment: roamifyBaseUrl.includes("api-dev.") ? "development" : "production",
    pricing: {
      multiplier: pricingMultiplier,
      fixedMarkup: pricingFixedMarkup,
      minimumPrice: pricingMinimumPrice
    }
  });
});

app.use("/api/countries", countriesRouter);
app.use("/api/plans", plansRouter);
app.use("/api/balance", balanceRouter);
app.use("/api/order", orderRouter);

app.get("*", (request, response, next) => {
  if (request.path.startsWith("/api/")) {
    return next();
  }

  return response.sendFile(path.join(publicDir, "index.html"));
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
