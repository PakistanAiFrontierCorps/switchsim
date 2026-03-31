const state = {
  countries: [],
  allPlans: [],
  filteredPlans: [],
  selectedCountryCode: "US",
  selectedPlan: null
};

const elements = {
  countryInput: document.querySelector("#country-search"),
  heroStatus: document.querySelector("#hero-status"),
  plansGrid: document.querySelector("#plans-grid"),
  plansMeta: document.querySelector("#plans-meta"),
  searchForm: document.querySelector("#search-form"),
  destinationPill: document.querySelector("#selected-destination"),
  durationFilter: document.querySelector("#duration-filter"),
  dataFilter: document.querySelector("#data-filter"),
  planTypeFilter: document.querySelector("#plan-type-filter"),
  sortFilter: document.querySelector("#sort-filter"),
  planTemplate: document.querySelector("#plan-card-template"),
  orderModal: document.querySelector("#order-modal"),
  modalPlanTitle: document.querySelector("#modal-plan-title"),
  orderSummary: document.querySelector("#order-summary"),
  orderQuantity: document.querySelector("#order-quantity"),
  orderReference: document.querySelector("#order-reference"),
  orderStatus: document.querySelector("#order-status"),
  orderForm: document.querySelector("#order-form"),
  orderSubmit: document.querySelector("#order-submit"),
  closeModal: document.querySelector("#close-modal"),
  contactForm: document.querySelector("#contact-form"),
  contactStatus: document.querySelector("#contact-status")
};

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detailMessage =
      payload.details?.message ||
      payload.details?.error ||
      payload.details?.data?.message ||
      payload.details?.statusText;
    throw new Error(detailMessage || payload.error || "Request failed");
  }

  return payload;
}

function setStatus(node, message, tone = "") {
  node.textContent = message;
  node.classList.remove("success", "error");
  if (tone) node.classList.add(tone);
}

function renderLoadingCards() {
  elements.plansGrid.innerHTML = "";
  for (let index = 0; index < 3; index++) {
    const card = document.createElement("div");
    card.className = "loading-card";
    elements.plansGrid.append(card);
  }
}

function renderEmptyState(message) {
  elements.plansGrid.innerHTML = `<div class="empty-state">${message}</div>`;
}

function formatPrice(plan) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: plan.currency || "USD",
    maximumFractionDigits: 2
  }).format(plan.price);
}

function getPlanDuration(plan) {
  return Number(plan.day) || 0;
}

function getPlanDataValue(plan) {
  if (plan.isUnlimited) return Number.POSITIVE_INFINITY;

  const amount = Number(plan.dataAmount);
  const unit = String(plan.dataUnit || "").toUpperCase();

  if (!Number.isFinite(amount)) return 0;
  if (unit === "GB") return amount * 1024;

  return amount;
}

function getCountryByInput(value) {
  return state.countries.find((country) => country.code === value);
}

function renderPlans(plans) {
  elements.plansGrid.innerHTML = "";

  // LIMIT TO 7 PLANS ONLY
  plans = plans.slice(0, 7);

  if (!plans.length) {
    renderEmptyState("No plans match your current filters.");
    return;
  }

  plans.forEach((plan, index) => {
    const fragment = elements.planTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".plan-card");
    const badge = fragment.querySelector(".plan-badge");
    const location = fragment.querySelector(".plan-location");
    const size = fragment.querySelector(".plan-size");
    const title = fragment.querySelector(".plan-title");
    const price = fragment.querySelector(".plan-price");
    const featureList = fragment.querySelector(".plan-features");
    const buyButton = fragment.querySelector(".buy-button");

    if (index === 0 && elements.sortFilter.value === "recommended") {
      card.classList.add("featured");
      badge.textContent = "Best match";
    } else if (plan.isUnlimited) {
      badge.textContent = "Unlimited";
    } else {
      badge.textContent = plan.geography;
    }

    location.textContent = `${plan.countryName} | ${plan.day} days`;
    size.textContent = plan.dataLabel;
    title.textContent = plan.title;
    price.textContent = formatPrice(plan);

    featureList.innerHTML = "";
    plan.features.forEach((feature) => {
      const item = document.createElement("li");
      item.textContent = feature;
      featureList.append(item);
    });

    buyButton.addEventListener("click", () => openOrderModal(plan.id));
    elements.plansGrid.append(card);
  });
}

function populateFilters(plans) {
  const selectedDuration = elements.durationFilter.value;
  const selectedData = elements.dataFilter.value;

  const durations = [...new Set(plans.map((plan) => getPlanDuration(plan)).filter(Boolean))].sort(
    (a, b) => a - b
  );

  const dataOptions = [...new Map(
    plans.map((plan) => {
      const key = plan.isUnlimited ? "unlimited" : `${plan.dataAmount}-${plan.dataUnit}`;
      return [key, { key, label: plan.dataLabel }];
    })
  ).values()];

  elements.durationFilter.innerHTML = '<option value="">Any duration</option>';
  durations.forEach((duration) => {
    const option = document.createElement("option");
    option.value = String(duration);
    option.textContent = `${duration} days`;
    elements.durationFilter.append(option);
  });

  elements.dataFilter.innerHTML = '<option value="">Any data</option>';
  dataOptions.forEach((optionData) => {
    const option = document.createElement("option");
    option.value = optionData.key;
    option.textContent = optionData.label;
    elements.dataFilter.append(option);
  });

  if ([...elements.durationFilter.options].some((o) => o.value === selectedDuration))
    elements.durationFilter.value = selectedDuration;

  if ([...elements.dataFilter.options].some((o) => o.value === selectedData))
    elements.dataFilter.value = selectedData;
}

function getRecommendedScore(plan) {
  const durationScore = getPlanDuration(plan) * 8;
  const dataScore = plan.isUnlimited ? 5000 : getPlanDataValue(plan);
  const priceScore = Number.isFinite(plan.price) && plan.price > 0 ? plan.price : 1;
  return (dataScore + durationScore) / priceScore;
}

function sortPlans(plans, sortValue) {
  const sortedPlans = [...plans];

  switch (sortValue) {
    case "price-asc":
      return sortedPlans.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sortedPlans.sort((a, b) => b.price - a.price);
    case "duration-asc":
      return sortedPlans.sort((a, b) => getPlanDuration(a) - getPlanDuration(b));
    case "duration-desc":
      return sortedPlans.sort((a, b) => getPlanDuration(b) - getPlanDuration(a));
    case "data-asc":
      return sortedPlans.sort((a, b) => getPlanDataValue(a) - getPlanDataValue(b));
    case "data-desc":
      return sortedPlans.sort((a, b) => getPlanDataValue(b) - getPlanDataValue(a));
    case "recommended":
    default:
      return sortedPlans.sort((a, b) => getRecommendedScore(b) - getRecommendedScore(a));
  }
}

function applyPlanFilters() {
  const selectedDuration = elements.durationFilter.value;
  const selectedData = elements.dataFilter.value;
  const selectedType = elements.planTypeFilter.value;
  const sortValue = elements.sortFilter.value;

  const filteredPlans = state.allPlans.filter((plan) => {
    if (selectedDuration && String(getPlanDuration(plan)) !== selectedDuration) return false;

    if (selectedType === "unlimited" && !plan.isUnlimited) return false;
    if (selectedType === "fixed" && plan.isUnlimited) return false;

    if (selectedData) {
      const planDataKey = plan.isUnlimited ? "unlimited" : `${plan.dataAmount}-${plan.dataUnit}`;
      if (planDataKey !== selectedData) return false;
    }

    return true;
  });

  state.filteredPlans = sortPlans(filteredPlans, sortValue);
  renderPlans(state.filteredPlans);
  elements.plansMeta.textContent = `Showing ${state.filteredPlans.length} plans out of ${state.allPlans.length} for ${elements.destinationPill.textContent}.`;
}

async function loadCountries() {
  const data = await request("/api/countries");
  // LIMIT COUNTRIES TO 10
  state.countries = (data.countries || []).slice(0, 10);

  const optionsMarkup = state.countries
    .map((country) => `<option value="${country.code}">${country.name}</option>`)
    .join("");

  elements.countryInput.innerHTML = '<option value="">Select a country</option>' + optionsMarkup;

  const defaultCountry =
    state.countries.find((country) => country.code === state.selectedCountryCode) || state.countries[0];

  if (defaultCountry) {
    state.selectedCountryCode = defaultCountry.code;
    elements.countryInput.value = defaultCountry.code;
    elements.destinationPill.textContent = defaultCountry.name;
  }
}

async function loadPlans(countryCode = state.selectedCountryCode) {
  renderLoadingCards();
  setStatus(elements.heroStatus, `Loading live plans for ${countryCode}...`);

  const data = await request(`/api/plans?country=${encodeURIComponent(countryCode)}`);
  const plans = data.plans || [];
  const selectedCountry =
    state.countries.find((country) => country.code === countryCode) ||
    state.countries.find((country) => country.code === elements.countryInput.value);

  state.selectedCountryCode = countryCode;

  if (selectedCountry) elements.destinationPill.textContent = selectedCountry.name;

  state.allPlans = plans;
  populateFilters(plans);
  applyPlanFilters();
  setStatus(
    elements.heroStatus,
    `Loaded ${plans.length} plans for ${elements.destinationPill.textContent}. Filter by duration, data, or plan type.`
  );
}

function buildOrderSummary(plan) {
  const networkText = plan.networks.length ? plan.networks.join(", ") : "Carrier info available after selection";

  elements.orderSummary.innerHTML = `
    <p><strong>Destination:</strong> ${plan.countryName}</p>
    <p><strong>Plan:</strong> ${plan.title}</p>
    <p><strong>Package ID:</strong> ${plan.id}</p>
    <p><strong>Allowance:</strong> ${plan.dataLabel}</p>
    <p><strong>Price:</strong> ${formatPrice(plan)}</p>
    <p><strong>Networks:</strong> ${networkText}</p>
  `;
}

async function openOrderModal(planId) {
  try {
    elements.orderSubmit.disabled = true;
    setStatus(elements.orderStatus, "Loading plan details...");

    const data = await request(
      `/api/plans/${encodeURIComponent(planId)}?country=${encodeURIComponent(state.selectedCountryCode)}`
    );
    state.selectedPlan = data.plan;
    elements.modalPlanTitle.textContent = state.selectedPlan.title;
    elements.orderQuantity.value = 1;
    elements.orderReference.value = "";
    buildOrderSummary(state.selectedPlan);
    setStatus(elements.orderStatus, "Review your order before placing it.");

    if (typeof elements.orderModal.showModal === "function") elements.orderModal.showModal();
    else elements.orderModal.setAttribute("open", "open");
  } catch (error) {
    setStatus(elements.heroStatus, error.message, "error");
  } finally {
    elements.orderSubmit.disabled = false;
  }
}

function closeOrderModal() {
  if (typeof elements.orderModal.close === "function") elements.orderModal.close();
  else elements.orderModal.removeAttribute("open");
}

async function handleSearchSubmit(event) {
  event.preventDefault();

  const country = getCountryByInput(elements.countryInput.value);

  if (!country) {
    setStatus(elements.heroStatus, "Select a country first.", "error");
    return;
  }

  try {
    await loadPlans(country.code);
  } catch (error) {
    renderEmptyState(error.message);
    setStatus(elements.heroStatus, error.message, "error");
  }
}

async function handleCountryChange() {
  const country = getCountryByInput(elements.countryInput.value);
  if (!country) return;

  try {
    await loadPlans(country.code);
  } catch (error) {
    renderEmptyState(error.message);
    setStatus(elements.heroStatus, error.message, "error");
  }
}

async function handleOrderSubmit(event) {
  event.preventDefault();
  if (!state.selectedPlan) {
    setStatus(elements.orderStatus, "Select a plan first.", "error");
    return;
  }

  try {
    elements.orderSubmit.disabled = true;
    setStatus(elements.orderStatus, "Creating order...");

    const payload = {
      items: [
        { packageId: state.selectedPlan.id, quantity: Number(elements.orderQuantity.value) }
      ]
    };

    if (elements.orderReference.value.trim()) payload.referenceId = elements.orderReference.value.trim();

    const data = await request("/api/order", { method: "POST", body: JSON.stringify(payload) });

    const orderId = data.order.id || data.order.referenceId || "created";
    setStatus(elements.orderStatus, `Order created successfully. Reference: ${orderId}`, "success");
  } catch (error) {
    setStatus(elements.orderStatus, error.message, "error");
  } finally {
    elements.orderSubmit.disabled = false;
  }
}

function handleContactSubmit(event) {
  event.preventDefault();
  elements.contactForm.reset();
  setStatus(
    elements.contactStatus,
    "Message captured locally. Hook this form to your CRM or email service next.",
    "success"
  );
}

async function init() {
  try {
    const config = await request("/api/config-status");
    if (!config.configured) {
      setStatus(
        elements.heroStatus,
        "Add your Roamify token to .env before live plans and ordering will work.",
        "error"
      );
      renderEmptyState("Waiting for backend configuration.");
      return;
    }

    if (config.environment === "development") {
      setStatus(
        elements.heroStatus,
        "Backend is using Roamify development mode. Pricing may be test data until the production base URL is used.",
        "error"
      );
    }

    await loadCountries();
    await loadPlans(state.selectedCountryCode);
  } catch (error) {
    renderEmptyState("The app could not load initial data.");
    setStatus(elements.heroStatus, error.message, "error");
  }
}

// EVENT LISTENERS
elements.searchForm.addEventListener("submit", handleSearchSubmit);
elements.countryInput.addEventListener("change", handleCountryChange);
elements.durationFilter.addEventListener("change", applyPlanFilters);
elements.dataFilter.addEventListener("change", applyPlanFilters);
elements.planTypeFilter.addEventListener("change", applyPlanFilters);
elements.sortFilter.addEventListener("change", applyPlanFilters);
elements.orderForm.addEventListener("submit", handleOrderSubmit);
elements.closeModal.addEventListener("click", closeOrderModal);
elements.orderModal.addEventListener("click", (event) => {
  const bounds = elements.orderForm.getBoundingClientRect();
  const clickedInside =
    event.clientX >= bounds.left &&
    event.clientX <= bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY <= bounds.bottom;
  if (!clickedInside) closeOrderModal();
});
elements.contactForm.addEventListener("submit", handleContactSubmit);

init();
