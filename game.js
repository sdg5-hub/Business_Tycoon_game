(() => {
  const WEATHER = ["Sunny", "Cloudy", "Rainy"];
  const RESTOCK_PACKS = [10, 25, 50, 100];
  const BASE_MARKET_PRICE = 0.2275;
  const SCORE_KEY = "lemonade_highscores_v1";
  const ACHIEVEMENTS = [10, 50, 100];

  const initialState = () => ({
    day: 2,
    level: 1,
    weather: "Rainy",
    cash: 14.55,
    stock: 26,
    maxStock: 50,
    price: 1.0,
    reputation: 7,
    autoBuy: false,
    online: true,
    stands: 1,
    adLevel: 0,
    sweetness: 0,
    paletteSeed: Math.random(),
    achievements: [],
    roomCode: "",
    logs: ["Day 2 boot sequence complete. Market is live."],
    pressure: 1
  });

  const state = initialState();

  const el = {
    statusLine: document.getElementById("statusLine"),
    progressFill: document.getElementById("progressFill"),
    dayTitle: document.getElementById("dayTitle"),
    runDayBtn: document.getElementById("runDayBtn"),
    cashValue: document.getElementById("cashValue"),
    stockValue: document.getElementById("stockValue"),
    standsValue: document.getElementById("standsValue"),
    adValue: document.getElementById("adValue"),
    sweetValue: document.getElementById("sweetValue"),
    priceInput: document.getElementById("priceInput"),
    priceWarning: document.getElementById("priceWarning"),
    repValue: document.getElementById("repValue"),
    marketPrice: document.getElementById("marketPrice"),
    autoBuyToggle: document.getElementById("autoBuyToggle"),
    soundToggle: document.getElementById("soundToggle"),
    restockButtons: Array.from(document.querySelectorAll("[data-restock]")),
    navButtons: Array.from(document.querySelectorAll(".nav-item")),
    viewPanels: Array.from(document.querySelectorAll(".view-panel")),
    strategyBtn: document.getElementById("strategyBtn"),
    strategyModal: document.getElementById("strategyModal"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    newGameBtn: document.getElementById("newGameBtn"),
    buyStandBtn: document.getElementById("buyStandBtn"),
    buySweetBtn: document.getElementById("buySweetBtn"),
    buyAdBtn: document.getElementById("buyAdBtn"),
    standUpgradeText: document.getElementById("standUpgradeText"),
    achievementList: document.getElementById("achievementList"),
    logList: document.getElementById("logList"),
    businessCapacity: document.getElementById("businessCapacity"),
    businessPressure: document.getElementById("businessPressure"),
    createRoomBtn: document.getElementById("createRoomBtn"),
    joinRoomBtn: document.getElementById("joinRoomBtn"),
    roomCodeInput: document.getElementById("roomCodeInput"),
    multiplayerStatus: document.getElementById("multiplayerStatus"),
    highscoreList: document.getElementById("highscoreList"),
    saveScoreBtn: document.getElementById("saveScoreBtn"),
    clearScoresBtn: document.getElementById("clearScoresBtn")
  };

  function marketPrice() {
    return BASE_MARKET_PRICE * (1 + (state.day - 2) * 0.02 + state.pressure * 0.06);
  }

  function weatherIcon(name) {
    if (name === "Sunny") return "☀️";
    if (name === "Cloudy") return "☁️";
    return "🌧️";
  }

  function toMoney(value) {
    return `$${value.toFixed(2)}`;
  }

  function packCost(units) {
    return units * marketPrice();
  }

  function warningText(price) {
    if (price < 0.25) return "Very low. Great traffic, weak margin. Sweet spot: $0.30–$0.60";
    if (price <= 0.6) return "Sweet spot. Balanced profit and demand. Sweet spot: $0.30–$0.60";
    if (price <= 1.0) return "Getting expensive. Demand softens as pressure rises.";
    return "Too high for current market. Customers heavily deterred.";
  }

  function repDeltaForPrice(price) {
    if (price >= 0.3 && price <= 0.6) return 0.35;
    if (price > 1.0) return -0.55;
    if (price < 0.2) return -0.2;
    return -0.05;
  }

  function baseDemand(weather) {
    const weatherBase = weather === "Sunny" ? 28 : weather === "Cloudy" ? 19 : 11;
    const standBoost = 1 + (state.stands - 1) * 0.42;
    const adBoost = 1 + state.adLevel * 0.14;
    const sweetBoost = 1 + state.sweetness * 0.12;
    const repBoost = 1 + state.reputation * 0.018;
    const pressurePenalty = Math.max(0.34, 1 - state.pressure * 0.09);
    return weatherBase * standBoost * adBoost * sweetBoost * repBoost * pressurePenalty;
  }

  function demandForDay() {
    const weatherBase = baseDemand(state.weather);
    const priceFactor = Math.max(0.12, Math.min(2.0, 0.72 / state.price));
    const noise = Math.random() * 6 - 3;
    return Math.max(0, Math.round(weatherBase * priceFactor + noise));
  }

  function addLog(message) {
    state.logs.unshift(`Day ${state.day}: ${message}`);
    state.logs = state.logs.slice(0, 80);
  }

  function achievementCheck() {
    for (const milestone of ACHIEVEMENTS) {
      if (state.day >= milestone && !state.achievements.includes(milestone)) {
        state.achievements.push(milestone);
        addLog(`Achievement unlocked: SURVIVED DAY ${milestone}`);
      }
    }
  }

  function getHighscores() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SCORE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setHighscores(scores) {
    localStorage.setItem(SCORE_KEY, JSON.stringify(scores.slice(0, 12)));
  }

  function scoreValue() {
    return Math.round(state.cash * 12 + state.day * 25 + state.reputation * 18 + state.stands * 80 + state.adLevel * 30);
  }

  function saveCurrentScore() {
    const scores = getHighscores();
    scores.push({
      score: scoreValue(),
      day: state.day,
      cash: Number(state.cash.toFixed(2)),
      stands: state.stands,
      stamp: new Date().toISOString()
    });
    scores.sort((a, b) => b.score - a.score);
    setHighscores(scores);
    renderHighscores();
    addLog(`Saved score ${scoreValue()} to highscores.`);
  }

  function renderHighscores() {
    const scores = getHighscores();
    if (!scores.length) {
      el.highscoreList.innerHTML = "<div>No highscores yet. Save a run.</div>";
      return;
    }

    el.highscoreList.innerHTML = scores
      .map((row, i) => `<div>#${i + 1} • Score ${row.score} • Day ${row.day} • Cash ${toMoney(row.cash)} • Stands ${row.stands}</div>`)
      .join("");
  }

  function renderAchievements() {
    if (!state.achievements.length) {
      el.achievementList.innerHTML = "<div>No milestones yet.</div>";
      return;
    }

    el.achievementList.innerHTML = state.achievements
      .map((d) => `<div>Unlocked: SURVIVED DAY ${d}</div>`)
      .join("");
  }

  function renderLog() {
    el.logList.innerHTML = state.logs.map((line) => `<div>${line}</div>`).join("");
  }

  function updateRestockButtons() {
    for (const btn of el.restockButtons) {
      const units = Number(btn.dataset.restock);
      const cost = packCost(units);
      const overflow = state.stock + units > state.maxStock;
      const poor = cost > state.cash;
      btn.disabled = overflow || poor;
      btn.title = overflow ? "Cannot exceed max stock" : poor ? "Not enough cash" : `Buy ${units} for ${toMoney(cost)}`;
      btn.textContent = `+${units} (${toMoney(cost)})`;
    }
  }

  function updateUpgradeButtons() {
    const standCost = 24 + state.stands * 15;
    const sweetCost = 14 + state.sweetness * 10;
    const adCost = 18 + state.adLevel * 12;

    el.standUpgradeText.textContent = state.day <= 3
      ? "Unlocks after Day 3."
      : `Cost ${toMoney(standCost)} • Adds +1 stand and +20 max stock.`;

    el.buyStandBtn.disabled = state.day <= 3 || state.cash < standCost;
    el.buyStandBtn.textContent = `Buy Stand (${toMoney(standCost)})`;

    el.buySweetBtn.disabled = state.cash < sweetCost;
    el.buySweetBtn.textContent = `Buy Sweeter Mix (${toMoney(sweetCost)})`;

    el.buyAdBtn.disabled = state.cash < adCost;
    el.buyAdBtn.textContent = `Buy Ad Campaign (${toMoney(adCost)})`;
  }

  function updateView() {
    el.statusLine.textContent = `Level ${state.level} • Day ${state.day} • ${weatherIcon(state.weather)} ${state.weather.toUpperCase()} • ${state.stands} Location${state.stands > 1 ? "s" : ""} • ${state.online ? "ONLINE" : "OFFLINE"}`;
    el.dayTitle.textContent = `START DAY ${state.day}`;
    el.runDayBtn.textContent = `▶ RUN DAY ${state.day}`;
    el.cashValue.textContent = toMoney(state.cash);
    el.stockValue.textContent = `${state.stock}/${state.maxStock}`;
    el.standsValue.textContent = String(state.stands);
    el.adValue.textContent = String(state.adLevel);
    el.sweetValue.textContent = state.sweetness ? `Lvl ${state.sweetness}` : "Base";
    el.repValue.textContent = String(Math.max(0, Math.round(state.reputation)));
    el.marketPrice.textContent = `${toMoney(marketPrice())}/unit`;
    el.priceWarning.textContent = warningText(state.price);

    const progress = Math.min(100, 6 + state.level * 15 + (state.day % 10) * 6);
    el.progressFill.style.width = `${progress}%`;
    el.progressFill.parentElement.setAttribute("aria-valuenow", String(progress));

    el.businessCapacity.textContent = `${state.stands} stand(s), stock cap ${state.maxStock}, sweetness ${state.sweetness}, ad level ${state.adLevel}.`;
    el.businessPressure.textContent = `Market pressure ${state.pressure.toFixed(2)}x. Rising demand volatility and higher ingredient costs.`;

    updateRestockButtons();
    updateUpgradeButtons();
    renderAchievements();
    renderLog();
    renderHighscores();
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
    if (state.stock + units > state.maxStock || cost > state.cash) return;
    state.cash -= cost;
    state.stock += units;
    addLog(`Restocked ${units} units for ${toMoney(cost)}.`);
    updateView();
  }

  function autoBuyIfEnabled() {
    if (!state.autoBuy) return;
    const room = state.maxStock - state.stock;
    if (room <= 0) return;
    const desired = Math.min(room, 25 + state.stands * 3);
    const cost = desired * marketPrice();
    if (cost <= state.cash) {
      state.cash -= cost;
      state.stock += desired;
      addLog(`Auto-buy filled ${desired} units for ${toMoney(cost)}.`);
    }
  }

  function buyStandUpgrade() {
    const cost = 24 + state.stands * 15;
    if (state.day <= 3 || state.cash < cost) return;
    state.cash -= cost;
    state.stands += 1;
    state.maxStock += 20;
    addLog(`Bought new stand for ${toMoney(cost)}.`);
    updateView();
  }

  function buySweetUpgrade() {
    const cost = 14 + state.sweetness * 10;
    if (state.cash < cost) return;
    state.cash -= cost;
    state.sweetness += 1;
    addLog(`Upgraded sweetness to level ${state.sweetness}.`);
    updateView();
  }

  function buyAdUpgrade() {
    const cost = 18 + state.adLevel * 12;
    if (state.cash < cost) return;
    state.cash -= cost;
    state.adLevel += 1;
    addLog(`Boosted advertising to level ${state.adLevel}.`);
    updateView();
  }

  function runDay() {
    autoBuyIfEnabled();

    const demand = demandForDay();
    const sold = Math.min(demand, state.stock);
    const waste = Math.max(0, Math.round((state.stock - sold) * 0.06));
    const revenue = sold * state.price;

    state.stock = Math.max(0, state.stock - sold - waste);
    state.cash += revenue;
    state.reputation = Math.max(0, Math.min(20, state.reputation + repDeltaForPrice(state.price) + state.sweetness * 0.02));

    addLog(`Sold ${sold}/${demand} cups, wasted ${waste}, earned ${toMoney(revenue)}.`);

    state.day += 1;
    state.pressure += 0.06;

    if (state.day % 8 === 0) {
      state.level += 1;
      state.maxStock += 5;
      addLog(`Level up reached: Level ${state.level}.`);
    }

    achievementCheck();

    if (state.cash <= 0 && state.stock <= 0) {
      addLog("Business collapsed. New Game to restart. Score auto-saved.");
      saveCurrentScore();
    }

    state.weather = WEATHER[Math.floor(Math.random() * WEATHER.length)];
    updateView();
  }

  function setView(view) {
    el.navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
    el.viewPanels.forEach((panel) => panel.classList.toggle("active", panel.id === `view-${view}`));
  }

  function openStrategyModal() {
    el.strategyModal.classList.add("open");
    el.strategyModal.setAttribute("aria-hidden", "false");
  }

  function closeStrategyModal() {
    el.strategyModal.classList.remove("open");
    el.strategyModal.setAttribute("aria-hidden", "true");
  }

  function newGame() {
    const next = initialState();
    Object.assign(state, next);
    el.priceInput.value = state.price.toFixed(2);
    addLog("New game started.");
    updateView();
    setView("dashboard");
  }

  function randomRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 6; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function bind() {
    el.priceInput.addEventListener("change", setPriceFromInput);
    el.priceInput.addEventListener("input", setPriceFromInput);
    el.runDayBtn.addEventListener("click", runDay);

    el.restockButtons.forEach((btn) => btn.addEventListener("click", () => restock(Number(btn.dataset.restock))));

    el.autoBuyToggle.addEventListener("change", (event) => {
      state.autoBuy = Boolean(event.target.checked);
    });

    el.soundToggle.addEventListener("click", () => {
      state.online = !state.online;
      el.soundToggle.textContent = state.online ? "ONLINE" : "MUTED";
      el.soundToggle.setAttribute("aria-pressed", String(!state.online));
      updateView();
    });

    el.navButtons.forEach((btn) => btn.addEventListener("click", () => setView(btn.dataset.view)));

    el.strategyBtn.addEventListener("click", openStrategyModal);
    el.closeModalBtn.addEventListener("click", closeStrategyModal);
    el.strategyModal.addEventListener("click", (event) => {
      if (event.target instanceof HTMLElement && event.target.dataset.closeModal === "true") closeStrategyModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && el.strategyModal.classList.contains("open")) closeStrategyModal();
    });

    el.newGameBtn.addEventListener("click", newGame);
    el.buyStandBtn.addEventListener("click", buyStandUpgrade);
    el.buySweetBtn.addEventListener("click", buySweetUpgrade);
    el.buyAdBtn.addEventListener("click", buyAdUpgrade);

    el.createRoomBtn.addEventListener("click", () => {
      state.roomCode = randomRoomCode();
      el.multiplayerStatus.textContent = `Room created: ${state.roomCode}. Share code to invite.`;
      addLog(`Multiplayer room ${state.roomCode} opened.`);
    });

    el.joinRoomBtn.addEventListener("click", () => {
      const code = el.roomCodeInput.value.trim().toUpperCase();
      if (code.length < 4) {
        el.multiplayerStatus.textContent = "Enter a valid room code.";
        return;
      }
      state.roomCode = code;
      el.multiplayerStatus.textContent = `Joined room: ${code}. Rival sync pending.`;
      addLog(`Joined multiplayer room ${code}.`);
    });

    el.saveScoreBtn.addEventListener("click", saveCurrentScore);
    el.clearScoresBtn.addEventListener("click", () => {
      localStorage.removeItem(SCORE_KEY);
      renderHighscores();
      addLog("Highscores cleared.");
    });
  }

  function init() {
    bind();
    el.priceInput.value = state.price.toFixed(2);
    updateView();
  }

  init();
})();
