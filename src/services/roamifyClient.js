const axios = require("axios");
const { roamifyAccessToken, roamifyBaseUrl } = require("../config/env");

const roamifyClient = axios.create({
  baseURL: roamifyBaseUrl,
  timeout: 20000,
  headers: {
    Authorization: `Bearer ${roamifyAccessToken}`,
    "Content-Type": "application/json"
  }
});

module.exports = roamifyClient;
