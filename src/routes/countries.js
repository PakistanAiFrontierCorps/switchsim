const express = require("express");
const { getCountries } = require("../services/roamifyService");

const router = express.Router();

router.get("/", async (_request, response, next) => {
  try {
    const countries = await getCountries();
    response.json({ countries });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
