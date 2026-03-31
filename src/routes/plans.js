const express = require("express");
const { getPlanById, getPlans } = require("../services/roamifyService");

const router = express.Router();

router.get("/", async (request, response, next) => {
  try {
    const plans = await getPlans(request.query);
    response.json({ plans });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (request, response, next) => {
  try {
    const plan = await getPlanById(request.params.id, request.query);
    response.json({ plan });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
