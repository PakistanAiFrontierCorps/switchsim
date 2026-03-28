const express = require("express");
const { getBalance } = require("../services/roamifyService");

const router = express.Router();

router.get("/", async (_request, response, next) => {
  try {
    const balance = await getBalance();
    response.json({ balance });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
