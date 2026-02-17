(() => {
  const WEATHER = ["Sunny", "Cloudy", "Rainy"];
  const MARKET_PRICE = 0.2275;
  const RESTOCK_PACKS = [10, 25, 50, 100];

  const state = {
    day: 2,
    level: 1,
    weather: "Rainy",
    cash: 14.55,
    stock: 26,
    maxStock: 50,
    price: 1.0,
    reputation: 7,
    autoBuy: false,
    online: true
  };

  const el = {
    statusLine: document.getElementById("statusLine"),
    progressFill: document.getElementById("progressFill"),
    dayTitle: document.getElementById("dayTitle"),
    runDayBtn: document.getElementById("runDayBtn"),
    cashValue: document.getElementById("cashValue"),
    stockValue: document.getElementById("stockValue"),
    priceInput: document.getElementById("priceInput"),
    priceWarning: document.getElementById("priceWarning"),
    repValue: document.getElementById("repValue"),
    marketPrice: document.getElementById("marketPrice"),
    autoBuyToggle: document.getElementById("autoBuyToggle"),
    soundToggle: document.getElementById("soundToggle"),
    restockButtons: Array.from(document.querySelectorAll("[data-restock]")),
    strategyBtn: document.getElementById("strategyBtn"),
    strategyModal: document.getElementById("strategyModal"),
    closeModalBtn: document.getElementById("closeModalBtn")
  };

  function weatherIcon(name) {
    if (name === "Sunny") return "☀️";
    if (name === "Cloudy") return "☁️";
    return "🌧️";
  }

  function toMoney(value) {
    return `$${value.toFixed(2)}`;
  }

  function packCost(units) {
    return units * MARKET_PRICE;
  }

  function warningText(price) {
    if (price < 0.25) {
      return "Very low. Customers love it, but margins are thin. Sweet spot: $0.30–$0.60";
    }

    if (price <= 0.6) {
      return "Sweet spot. Strong demand expected. Sweet spot: $0.30–$0.60";
    }

    return "A bit high. Some customers deterred. Sweet spot: $0.30–$0.60";
  }

  function repDeltaForPrice(price) {
    if (price >= 0.3 && price <= 0.6) return 0.4;
    if (price > 1.0) return -0.45;
    if (price < 0.2) return -0.15;
    return 0;
  }

  function baseDemand(weather) {
    if (weather === "Sunny") return 34;
    if (weather === "Cloudy") return 25;
    return 17;
  }

  function demandForDay() {
    const weatherBase = baseDemand(state.weather);

    // Price factor rewards competitive pricing and suppresses expensive pricing.
    const priceFactor = Math.max(0.22, Math.min(1.85, 0.9 / state.price));
    const repFactor = 1 + state.reputation * 0.02;
    const noise = Math.random() * 6 - 3;

    return Math.max(0, Math.round(weatherBase * priceFactor * repFactor + noise));
  }

  function updateRestockButtons() {
    for (const btn of el.restockButtons) {
      const units = Number(btn.dataset.restock);
      const cost = packCost(units);
      const overflow = state.stock + units > state.maxStock;
      const poor = cost > state.cash;
      btn.disabled = overflow || poor;
      btn.title = overflow
        ? "Cannot exceed max stock"
        : poor
          ? "Not enough cash"
          : `Buy ${units} units for ${toMoney(cost)}`;
    }
  }

  function updateView() {
    el.statusLine.textContent = `Level ${state.level} • Day ${state.day} • ${weatherIcon(state.weather)} ${state.weather.toUpperCase()} • 1 Location • ${state.online ? "ONLINE" : "OFFLINE"}`;
    el.dayTitle.textContent = `START DAY ${state.day}`;
    el.runDayBtn.textContent = `▶ RUN DAY ${state.day}`;
    el.cashValue.textContent = toMoney(state.cash);
    el.stockValue.textContent = `${state.stock}/${state.maxStock}`;
    el.repValue.textContent = `${Math.max(0, Math.round(state.reputation))}`;
    el.marketPrice.textContent = `${toMoney(MARKET_PRICE)}/unit`;
    el.priceWarning.textContent = warningText(state.price);

    const progress = Math.min(100, 8 + state.level * 17 + (state.day % 8) * 6);
    el.progressFill.style.width = `${progress}%`;
    el.progressFill.parentElement.setAttribute("aria-valuenow", String(progress));

    updateRestockButtons();
  }

  function setPriceFromInput() {
    const parsed = Number(el.priceInput.value);
    if (!Number.isFinite(parsed)) return;

    state.price = Math.max(0.05, Math.min(5, parsed));
    el.priceInput.value = state.price.toFixed(2);
    updateView();
  }

  function restock(units) {
    const cost = packCost(units);
    if (state.stock + units > state.maxStock) return;
    if (cost > state.cash) return;

    state.cash -= cost;
    state.stock += units;
    updateView();
  }

  function autoBuyIfEnabled() {
    if (!state.autoBuy) return;

    const room = state.maxStock - state.stock;
    if (room <= 0) return;

    const desired = Math.min(room, 25);
    const cost = packCost(desired);

    if (cost <= state.cash) {
      state.cash -= cost;
      state.stock += desired;
    }
  }

  function runDay() {
    autoBuyIfEnabled();

    const demand = demandForDay();
    const sold = Math.min(demand, state.stock);
    const revenue = sold * state.price;

    state.stock -= sold;
    state.cash += revenue;
    state.reputation = Math.max(0, Math.min(20, state.reputation + repDeltaForPrice(state.price)));

    state.day += 1;
    if (state.day % 8 === 0) {
      state.level += 1;
      state.maxStock += 10;
    }

    state.weather = WEATHER[Math.floor(Math.random() * WEATHER.length)];
    updateView();
  }

  function bind() {
    el.priceInput.addEventListener("change", setPriceFromInput);
    el.priceInput.addEventListener("input", setPriceFromInput);

    el.runDayBtn.addEventListener("click", runDay);

    for (const btn of el.restockButtons) {
      btn.addEventListener("click", () => restock(Number(btn.dataset.restock)));
    }

    el.autoBuyToggle.addEventListener("change", (event) => {
      state.autoBuy = Boolean(event.target.checked);
    });

    // Sound toggle is a UI stub by request (no audio playback).
    el.soundToggle.addEventListener("click", () => {
      state.online = !state.online;
      el.soundToggle.textContent = state.online ? "ONLINE" : "MUTED";
      el.soundToggle.setAttribute("aria-pressed", String(!state.online));
      updateView();
    });

    el.strategyBtn.addEventListener("click", openStrategyModal);
    el.closeModalBtn.addEventListener("click", closeStrategyModal);
    el.strategyModal.addEventListener("click", (event) => {
      if (event.target instanceof HTMLElement && event.target.dataset.closeModal === "true") {
        closeStrategyModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && el.strategyModal.classList.contains("open")) {
        closeStrategyModal();
      }
    });
  }

  function openStrategyModal() {
    el.strategyModal.classList.add("open");
    el.strategyModal.setAttribute("aria-hidden", "false");
  }

  function closeStrategyModal() {
    el.strategyModal.classList.remove("open");
    el.strategyModal.setAttribute("aria-hidden", "true");
  }

  function initRestockLabels() {
    for (const amount of RESTOCK_PACKS) {
      const btn = el.restockButtons.find((item) => Number(item.dataset.restock) === amount);
      if (btn) {
        btn.textContent = `+${amount} (${toMoney(packCost(amount))})`;
      }
    }
  }

  function init() {
    initRestockLabels();
    bind();
    updateView();
  }

  init();
})();
