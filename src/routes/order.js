const express = require("express");
const {
  createAppError,
  createOrder,
  getBalance,
  getPlanById
} = require("../services/roamifyService");

const router = express.Router();

function validateOrderPayload(body) {
  const { items, referenceId } = body || {};

  if (!Array.isArray(items) || items.length === 0) {
    throw createAppError("Order must include at least one item", 400);
  }

  const normalizedItems = items.map((item) => ({
    packageId: String(item.packageId || "").trim(),
    quantity: Number(item.quantity)
  }));

  for (const item of normalizedItems) {
    if (!item.packageId) {
      throw createAppError("Each item requires a packageId", 400);
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw createAppError("Each item quantity must be a positive integer", 400);
    }
  }

  const payload = { items: normalizedItems };
  const normalizedReferenceId = String(referenceId || "").trim();

  payload.referenceId =
    normalizedReferenceId ||
    `web-${Date.now()}-${normalizedItems[0].packageId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 24)}`;

  return payload;
}

router.post("/", async (request, response, next) => {
  try {
    const payload = validateOrderPayload(request.body);
    const [{ balance }, plan] = await Promise.all([
      getBalance(),
      getPlanById(payload.items[0].packageId)
    ]);

    const estimatedWholesaleTotal = Number(plan.wholesalePrice || 0) * payload.items[0].quantity;

    if (Number.isFinite(balance) && estimatedWholesaleTotal > balance) {
      throw createAppError(
        `Insufficient Roamify balance. Need ${estimatedWholesaleTotal.toFixed(2)} USD wholesale, but account balance is ${Number(balance).toFixed(2)} USD.`,
        400
      );
    }

    const order = await createOrder(payload);
    response.status(201).json({ order });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
