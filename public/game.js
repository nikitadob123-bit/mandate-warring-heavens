"use strict";

const Core = window.MandateCore;
const $ = id => document.getElementById(id);
const DEMO_MAX_CHAPTER = 3;
const BOOSTY_URL = "https://boosty.to/7thdimension/purchase/2906702?ssource=DIRECT&share=subscription_link";
const LOCAL_SAVE_KEY = "mandateLocalSave";
const LOCAL_USERS_KEY = "mandateLocalUsersV12";
const LOCAL_SESSION_KEY = "mandateLocalSessionV12";
const LOCAL_ACCOUNT_SAVES_KEY = "mandateLocalAccountSavesV12";
const SETTINGS_KEY = "mandateSettingsV2";

const SCREEN_IDS = ["bootScreen", "mainMenu", "accessScreen", "faqScreen", "loadScreen", "settingsScreen", "createScreen", "gameScreen"];
const NAV_GROUPS = [
  { title: "ВОЕННЫЙ ПУТЬ", items: [
    { id: "campaign", icon: "令", label: "Кампания" },
    { id: "chronicles", icon: "記", label: "Операции" },
    { id: "battle", icon: "戰", label: "Сражения" },
    { id: "duels", icon: "劍", label: "Дуэли" }
  ] },
  { title: "АРМИЯ", items: [
    { id: "map", icon: "圖", label: "Карта царств" },
    { id: "army", icon: "軍", label: "Войска" },
    { id: "inventory", icon: "甲", label: "Снаряжение" },
    { id: "market", icon: "市", label: "Рынок" },
    { id: "intel", icon: "影", label: "Разведка" }
  ] },
  { title: "ДВОР И ВЛАСТЬ", items: [
    { id: "relations", icon: "縁", label: "Отношения", premium: true },
    { id: "estate", icon: "城", label: "Владения", premium: true },
    { id: "edicts", icon: "詔", label: "Указы", premium: true }
  ] },
  { title: "ЛЕТОПИСЬ", items: [
    { id: "annals", icon: "書", label: "Летопись" },
    { id: "profile", icon: "王", label: "Профиль" }
  ] }
];
const NAV_ITEMS = NAV_GROUPS.flatMap(group => group.items);
const PAGE_KICKERS = {
  campaign: "ПУТЬ ПОЛКОВОДЦА", chronicles: "ВОЕННЫЕ ХРОНИКИ", battle: "ТАКТИЧЕСКАЯ КАРТА", duels: "ЧЕСТЬ ГЕНЕРАЛА",
  map: "СЕМЬ ЦАРСТВ", army: "ПОД ТВОИМ ЗНАМЕНЕМ", inventory: "ЛИЧНОЕ СНАРЯЖЕНИЕ", market: "ВОЕННЫЙ РЫНОК", intel: "ТАЙНАЯ КАНЦЕЛЯРИЯ",
  relations: "УЗЫ И ОБЕЩАНИЯ", estate: "ЗЕМЛЯ И ВЛАСТЬ", edicts: "ВОЛЯ ПРАВИТЕЛЯ", annals: "БАМБУКОВЫЕ СВИТКИ", profile: "КАРТОЧКА ПОЛКОВОДЦА"
};

let S = null;
let token = localStorage.getItem("mandateToken") || "";
let account = safeJson(localStorage.getItem("mandateAccount"), null);
let accessState = { active: false, reason: "unchecked", discord: null, grant: null };
let premiumRuntime = false;
let selectedOrigin = Core.ORIGINS[0].id;
let selectedRelation = "Го Чжэнь";
let marketFilter = "all";
let toastTimer = 0;
let confirmResolver = null;
let enemyTurnRunning = false;
let settings = { sound: true, motion: true, autosave: true, compact: false, ...safeJson(localStorage.getItem(SETTINGS_KEY), {}) };

function safeJson(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function jsArg(value) {
  return JSON.stringify(String(value)).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU").format(Math.max(0, Math.round(Number(value) || 0)));
}

function absoluteDay(state = S) {
  return (Number(state?.year) || 217) * 360 + (Number(state?.day) || 1);
}

function notify(message, type = "normal") {
  const toast = $("toast");
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast ${type === "bad" ? "bad" : type === "good" ? "good" : ""}`.trim();
  playUiSound(type === "bad" ? 125 : type === "good" ? 520 : 310);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

function playUiSound(frequency = 310) {
  if (!settings.sound) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = playUiSound.context || (playUiSound.context = new AudioContext());
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(.025, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .08);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + .085);
  } catch { /* Audio is an optional enhancement. */ }
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function applySettings() {
  document.body.classList.toggle("no-motion", !settings.motion);
  document.body.classList.toggle("compact", !!settings.compact);
  if ($("settingSound")) $("settingSound").checked = !!settings.sound;
  if ($("settingMotion")) $("settingMotion").checked = !!settings.motion;
  if ($("settingAutosave")) $("settingAutosave").checked = !!settings.autosave;
  if ($("settingCompact")) $("settingCompact").checked = !!settings.compact;
}

function saveSettings() {
  settings = {
    sound: $("settingSound")?.checked ?? settings.sound,
    motion: $("settingMotion")?.checked ?? settings.motion,
    autosave: $("settingAutosave")?.checked ?? settings.autosave,
    compact: $("settingCompact")?.checked ?? settings.compact
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applySettings();
  notify("Настройки сохранены", "good");
}

function openScreen(id) {
  for (const screenId of SCREEN_IDS) $(screenId)?.classList.toggle("hidden", screenId !== id);
  document.body.classList.toggle("game-active", id === "gameScreen");
  if (id !== "gameScreen") {
    $("mobileBottomNav")?.classList.add("hidden");
    toggleMobileMenu(false);
  }
  if (id === "accessScreen") renderAccessScreen();
  if (id === "settingsScreen") applySettings();
  window.scrollTo(0, 0);
}

function openMainMenu() {
  if (S) localSave();
  openScreen("mainMenu");
  updateMainMenu();
}

function updateMainMenu() {
  const saved = readLocalSave();
  const hasSave = !!saved;
  if ($("continueBtn")) { $("continueBtn").classList.remove("disabled"); $("continueBtn").disabled = false; }
  if ($("continueHint")) $("continueHint").textContent = hasSave
    ? `Глава ${saved.chapter}/42 · ур. ${saved.level}`
    : (token || isPremium() ? "Проверить облачную летопись" : "Сохранений пока нет");
  if ($("menuSavePreview")) $("menuSavePreview").textContent = hasSave
    ? `${saved.name} · ${Core.RANKS[saved.rankIndex]?.name || "Рекрут"} · «${Core.CHAPTERS[saved.chapter - 1]?.name || "Пепел старой империи"}»`
    : "Новая летопись ждёт своего полководца";
  const badge = $("menuAccessBadge");
  if (badge) { badge.textContent = isPremium() ? "👑 ПОЛНАЯ ВЕРСИЯ" : "⚔ ДЕМО · ГЛАВЫ 1–3"; badge.classList.toggle("good", isPremium()); }
  updateAccountButton();
}

async function runBootSequence() {
  const stages = [
    [10, "Пробуждение летописи…"],
    [28, "Проверка целостности сохранений…"],
    [48, "Развёртывание карт семи царств…"],
    [68, "Сбор военного совета…"],
    [86, "Проверка знамени полководца…"],
    [100, "Мандат готов"]
  ];
  for (const [percent, label] of stages) {
    if ($("bootProgress")) $("bootProgress").style.width = `${percent}%`;
    if ($("bootPercent")) $("bootPercent").textContent = `${percent}%`;
    if ($("bootStage")) $("bootStage").textContent = label;
    await delay(settings.motion ? 190 : 18);
  }
  await delay(settings.motion ? 240 : 20);
}

async function bootApp() {
  applySettings();
  restoreLocalSession();
  renderOrigins();
  updateAccountButton();
  const accessPromise = refreshPremiumRuntime(true);
  await Promise.all([runBootSequence(), accessPromise]);
  handleDiscordReturn();
  openMainMenu();
}

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body != null) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Ошибка сервера ${response.status}`);
  return data;
}

async function backendAvailable() {
  if (["file:", "content:"].includes(location.protocol)) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const response = await fetch("/health", { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch { return false; }
}

function setPremiumRuntime(value) {
  premiumRuntime = !!value;
  localStorage.setItem("mandatePremium", premiumRuntime ? "true" : "false");
  updateMainMenu();
}

function isPremium() { return premiumRuntime === true; }

async function refreshPremiumRuntime(silent = true) {
  if (!token || account?.local) {
    accessState = { active: false, reason: account?.local ? "local_account" : "not_logged_in", discord: null, grant: null };
    setPremiumRuntime(false);
    return false;
  }
  try {
    accessState = await api("/api/access");
    setPremiumRuntime(!!accessState.active);
    return premiumRuntime;
  } catch (error) {
    accessState = { active: false, reason: "check_failed", error: error.message };
    setPremiumRuntime(false);
    if (!silent) notify("Не удалось проверить подписку", "bad");
    return false;
  }
}

async function renderAccessScreen() {
  const active = await refreshPremiumRuntime(true);
  const title = $("accessTitle"), detail = $("accessDetail");
  if (!title || !detail) return;
  if (active) {
    title.textContent = "Полная версия активна";
    title.className = "good";
    const discordName = accessState.discord?.discord_username ? ` (${escapeHtml(accessState.discord.discord_username)})` : "";
    detail.innerHTML = `<b class="good">● Роль подписчика подтверждена${discordName}</b><p>Открыты полная кампания, отношения, владения, указы и облако.</p>`;
  } else {
    title.textContent = account ? "Демо-аккаунт" : "Гостевой режим";
    title.className = "";
    const reason = accessState.discord ? "Discord связан, но нужная роль пока не найдена." : "Войди и свяжи Discord после оформления подписки.";
    detail.innerHTML = `<b class="bad">● Полная версия не подтверждена</b><p>${reason}</p>`;
  }
}

function openPurchase() { $("purchaseModal")?.classList.remove("hidden"); }
function closePurchase() { $("purchaseModal")?.classList.add("hidden"); }

async function linkDiscord() {
  if (!account) { closePurchase(); openAuth(); $("authMsg").textContent = "Сначала войди в игровой аккаунт."; return; }
  if (account.local) { notify("Связывание Discord доступно в опубликованной версии", "bad"); return; }
  if (S) localSave();
  try {
    const data = await api("/api/discord/link");
    location.href = data.url;
  } catch (error) { notify(error.message, "bad"); }
}

async function recheckDiscord() {
  if (!token) { openAuth(); return; }
  try {
    const result = await api("/api/discord/recheck", { method: "POST", body: "{}" });
    await refreshPremiumRuntime(true);
    notify(result.active ? "Роль найдена — полная версия открыта" : "Роль подписчика пока не найдена", result.active ? "good" : "bad");
    renderAccessScreen();
    if (S?.lastPage === "profile") render("profile");
  } catch (error) { notify(error.message, "bad"); }
}

async function unlinkDiscord() {
  if (!token) return;
  if (!(await confirmAction("Отвязать Discord?", "Полный доступ будет закрыт до нового связывания.", "Отвязать"))) return;
  try {
    await api("/api/discord/unlink", { method: "POST", body: "{}" });
    await refreshPremiumRuntime(true);
    notify("Discord отвязан");
    if (S?.lastPage === "profile") render("profile");
  } catch (error) { notify(error.message, "bad"); }
}

function handleDiscordReturn() {
  const params = new URLSearchParams(location.search);
  const status = params.get("discord_access");
  if (!status) return;
  history.replaceState({}, document.title, location.pathname + location.hash);
  setTimeout(async () => {
    await refreshPremiumRuntime(true);
    notify(status === "active" ? "Discord связан · подписка подтверждена" : status === "linked" ? "Discord связан · роль пока не найдена" : "Связать Discord не удалось", status === "active" ? "good" : "bad");
  }, 250);
}

function updateAccountButton() {
  const button = $("accountBtn");
  if (button) button.textContent = account ? `王 ${account.username}` : "Войти";
}

function openAuth() {
  if (account) {
    confirmAction(`Аккаунт: ${account.username}`, isPremium() ? "Полная версия активна. Выйти из аккаунта?" : "Аккаунт подключён. Локальный прогресс останется на устройстве после выхода.", "Выйти").then(accepted => { if (accepted) logout(); });
    return;
  }
  $("authOverlay")?.classList.remove("hidden");
}
function closeAuth() { $("authOverlay")?.classList.add("hidden"); if ($("authMsg")) $("authMsg").textContent = ""; }
function authTab(tab) {
  $("loginForm")?.classList.toggle("hidden", tab !== "login");
  $("registerForm")?.classList.toggle("hidden", tab !== "register");
  $("loginTab")?.classList.toggle("active", tab === "login");
  $("registerTab")?.classList.toggle("active", tab === "register");
}

function localUsers() { return safeJson(localStorage.getItem(LOCAL_USERS_KEY), {}); }
function localSaves() { return safeJson(localStorage.getItem(LOCAL_ACCOUNT_SAVES_KEY), {}); }
function simpleHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < String(value).length; index += 1) { hash ^= String(value).charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16);
}

function localAccountRegister(username, email, password) {
  username = String(username || "").trim(); email = String(email || "").trim().toLowerCase();
  if (username.length < 3) throw new Error("Имя пользователя — минимум 3 символа");
  if (!email.includes("@")) throw new Error("Укажите корректный email");
  if (String(password || "").length < 6) throw new Error("Пароль — минимум 6 символов");
  const users = localUsers();
  if (Object.values(users).some(user => user.username.toLowerCase() === username.toLowerCase() || user.email === email)) throw new Error("Такой пользователь уже есть на устройстве");
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  users[id] = { id, username, email, passwordHash: simpleHash(password), createdAt: new Date().toISOString() };
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users)); localStorage.setItem(LOCAL_SESSION_KEY, id);
  account = { id, username, local: true }; token = "";
  localStorage.setItem("mandateAccount", JSON.stringify(account)); localStorage.removeItem("mandateToken");
}

function localAccountLogin(loginValue, password) {
  const loginText = String(loginValue || "").trim().toLowerCase();
  const user = Object.values(localUsers()).find(entry => entry.username.toLowerCase() === loginText || entry.email === loginText);
  if (!user || user.passwordHash !== simpleHash(password || "")) throw new Error("Неверный логин или пароль");
  localStorage.setItem(LOCAL_SESSION_KEY, user.id);
  account = { id: user.id, username: user.username, local: true }; token = "";
  localStorage.setItem("mandateAccount", JSON.stringify(account)); localStorage.removeItem("mandateToken");
}

function restoreLocalSession() {
  if (account) return;
  const id = localStorage.getItem(LOCAL_SESSION_KEY);
  const user = localUsers()[id];
  if (user) { account = { id: user.id, username: user.username, local: true }; localStorage.setItem("mandateAccount", JSON.stringify(account)); }
}

async function register(event) {
  event?.preventDefault();
  const username = $("regName").value, email = $("regEmail").value, password = $("regPass").value;
  $("authMsg").textContent = "";
  try {
    if (await backendAvailable()) {
      const data = await api("/api/register", { method: "POST", body: JSON.stringify({ username, email, password }) });
      token = data.token; account = data.user;
      localStorage.setItem("mandateToken", token); localStorage.setItem("mandateAccount", JSON.stringify(account));
      await refreshPremiumRuntime(true);
      notify("Облачный аккаунт создан", "good");
    } else {
      localAccountRegister(username, email, password);
      notify("Локальный аккаунт создан", "good");
    }
    updateAccountButton(); closeAuth(); updateMainMenu();
  } catch (error) { $("authMsg").textContent = error.message; }
}

async function login(event) {
  event?.preventDefault();
  const loginValue = $("loginId").value, password = $("loginPass").value;
  $("authMsg").textContent = "";
  try {
    if (await backendAvailable()) {
      try {
        const data = await api("/api/login", { method: "POST", body: JSON.stringify({ login: loginValue, password }) });
        token = data.token; account = data.user;
        localStorage.setItem("mandateToken", token); localStorage.setItem("mandateAccount", JSON.stringify(account)); localStorage.removeItem(LOCAL_SESSION_KEY);
        await refreshPremiumRuntime(true);
        notify("Вход выполнен · локальный прогресс сохранён", "good");
      } catch (serverError) {
        localAccountLogin(loginValue, password);
        setPremiumRuntime(false);
        notify("Вход выполнен в локальный аккаунт", "good");
      }
    } else {
      localAccountLogin(loginValue, password); setPremiumRuntime(false); notify("Вход выполнен на этом устройстве", "good");
    }
    updateAccountButton(); closeAuth(); updateMainMenu();
  } catch (error) { $("authMsg").textContent = error.message; }
}

function logout() {
  token = ""; account = null; accessState = { active: false };
  localStorage.removeItem("mandateToken"); localStorage.removeItem("mandateAccount"); localStorage.removeItem(LOCAL_SESSION_KEY);
  setPremiumRuntime(false); updateAccountButton(); notify("Вы вышли из аккаунта");
  if (S?.lastPage === "profile") render("profile");
}

function localSave() {
  if (!S) return null;
  S = Core.migrateSave(S);
  S._meta.updatedAt = new Date().toISOString();
  localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(S));
  if (account?.local) {
    const saves = localSaves(); saves[account.id] = { save: S, updatedAt: S._meta.updatedAt };
    localStorage.setItem(LOCAL_ACCOUNT_SAVES_KEY, JSON.stringify(saves));
  }
  return S;
}

function readLocalSave() {
  const accountSave = account?.local ? localSaves()[account.id]?.save : null;
  const raw = accountSave || safeJson(localStorage.getItem(LOCAL_SAVE_KEY), null);
  return Core.migrateSave(raw);
}

async function readCloudSave() {
  if (!token || !isPremium()) return null;
  try {
    const data = await api("/api/save");
    const save = Core.migrateSave(data.save);
    if (save && data.updated_at) save._meta.updatedAt = new Date(data.updated_at).toISOString();
    return save;
  } catch { return null; }
}

function maybeAutosave() { if (settings.autosave) localSave(); }

async function cloudSave() {
  if (!S) return;
  localSave();
  await refreshPremiumRuntime(true);
  if (!isPremium()) { notify("Демо сохранено локально · облако доступно в полной версии"); return; }
  if (!token) { notify("Сохранено локально · войди для облачной копии"); return; }
  try {
    await api("/api/save", { method: "PUT", body: JSON.stringify({ save: S }) });
    notify("Летопись сохранена локально и в облаке", "good");
  } catch (error) { notify(`Локальная копия сохранена · ${error.message}`, "bad"); }
}

async function openLoadScreen() {
  openScreen("loadScreen");
  $("saveSlots").innerHTML = `<div class="loading-card">Чтение бамбуковых свитков…</div>`;
  await refreshPremiumRuntime(true);
  const local = readLocalSave();
  const cloud = await readCloudSave();
  const card = (save, source) => {
    const isCloud = source === "cloud";
    if (!save) return `<article class="save-card ${source}"><p class="overline">${isCloud ? "ОБЛАЧНАЯ ЛЕТОПИСЬ" : "ЛОКАЛЬНАЯ ЛЕТОПИСЬ"}</p><h2>Пустой слот</h2><p>${isCloud ? (isPremium() ? "В аккаунте пока нет сохранения." : "Облако доступно в полной версии.") : "Начни новую кампанию, чтобы создать летопись."}</p>${!isCloud ? `<button class="game-button primary" onclick="newCampaign()">Создать героя</button>` : ""}</article>`;
    const rank = Core.RANKS[save.rankIndex]?.name || "Рекрут";
    return `<article class="save-card ${source}"><p class="overline">${isCloud ? "ОБЛАЧНАЯ ЛЕТОПИСЬ" : "ЛОКАЛЬНАЯ ЛЕТОПИСЬ"}</p><h2>${escapeHtml(save.name)}</h2><p>${escapeHtml(rank)} · ${escapeHtml(save.origin)}</p><div class="save-meta"><span>Глава ${save.chapter}/42</span><span>Уровень ${save.level}</span><span>${save.year} год · день ${save.day}</span></div><div class="save-actions"><button class="game-button primary" onclick="loadSave('${source}')">Загрузить</button><button class="game-button secondary" onclick="deleteSave('${source}')">Удалить</button></div></article>`;
  };
  $("saveSlots").innerHTML = card(local, "local") + card(cloud, "cloud");
}

async function loadSave(source) {
  await refreshPremiumRuntime(true);
  const save = source === "cloud" ? await readCloudSave() : readLocalSave();
  if (!save) return notify("Сохранение не найдено", "bad");
  if (!isPremium() && save.chapter > DEMO_MAX_CHAPTER) { openPurchase(); return notify("Эта летопись продолжена дальше демо", "bad"); }
  S = save; enterGame();
}

async function deleteSave(source) {
  const accepted = await confirmAction("Удалить сохранение?", source === "cloud" ? "Облачную летопись нельзя будет восстановить." : "Локальная летопись будет удалена с этого устройства.", "Удалить");
  if (!accepted) return;
  if (source === "cloud") {
    try { await api("/api/save", { method: "DELETE" }); notify("Облачное сохранение удалено"); } catch (error) { notify(error.message, "bad"); }
  } else {
    localStorage.removeItem(LOCAL_SAVE_KEY);
    if (account?.local) { const saves = localSaves(); delete saves[account.id]; localStorage.setItem(LOCAL_ACCOUNT_SAVES_KEY, JSON.stringify(saves)); }
    if (S) S = null;
    notify("Локальное сохранение удалено");
  }
  openLoadScreen();
}

function renderOrigins() {
  const glyphs = ["土", "門", "刃", "孤", "策"];
  $("origins").innerHTML = Core.ORIGINS.map((origin, index) => `<button class="origin-card ${origin.id === selectedOrigin ? "active" : ""}" type="button" onclick="pickOrigin('${origin.id}')"><span class="origin-glyph">${glyphs[index]}</span><b>${escapeHtml(origin.name)}</b><small>${escapeHtml(origin.desc)}</small><em>${escapeHtml(origin.perk)}</em></button>`).join("");
  renderOriginSummary();
}

function renderOriginSummary() {
  const origin = Core.ORIGINS.find(entry => entry.id === selectedOrigin) || Core.ORIGINS[0];
  const bonuses = Object.entries(origin.bonuses || {}).map(([key, value]) => `+${value} ${key}`).join(" · ");
  $("originSummary").innerHTML = `<b class="gold">${escapeHtml(origin.name)}</b> — ${escapeHtml(origin.perk)}. <span class="muted">${escapeHtml([bonuses, origin.influence ? `+${origin.influence} влияния` : "", origin.gold ? `+${origin.gold} серебра` : ""].filter(Boolean).join(" · "))}</span>`;
}

function pickOrigin(id) { selectedOrigin = id; renderOrigins(); playUiSound(370); }

async function newCampaign() {
  await refreshPremiumRuntime(true);
  openScreen("createScreen");
  notify(isPremium() ? "Полная летопись открыта" : "Демо включает главы 1–3");
}

function startCampaign() {
  const origin = Core.ORIGINS.find(entry => entry.id === selectedOrigin) || Core.ORIGINS[0];
  S = Core.createNewState({ name: $("heroName").value, home: $("heroHome").value, origin: origin.id });
  S.hp = Core.heroStats(S).maxHp;
  if (!isPremium()) S.flags.demoAtCreation = true;
  localSave();
  enterGame();
}

async function continueCampaign() {
  await refreshPremiumRuntime(true);
  const local = readLocalSave();
  const cloud = await readCloudSave();
  let save = local;
  if (cloud && (!local || new Date(cloud._meta?.updatedAt || 0) > new Date(local._meta?.updatedAt || 0))) save = cloud;
  if (!save) { notify("Сохранений пока нет"); return openLoadScreen(); }
  if (!isPremium() && save.chapter > DEMO_MAX_CHAPTER) { openPurchase(); return notify("Продолжение этой летописи требует полной версии", "bad"); }
  S = save; enterGame();
}

function updateRank() {
  const storyRank = [...Core.RANKS].map((rank, index) => ({ ...rank, index })).reverse().find(rank => S.chapter >= rank.chapter)?.index || 0;
  S.rankIndex = Math.max(Number(S.rankIndex) || 0, storyRank);
}

function enterGame() {
  S = Core.migrateSave(S);
  if (!S) return openMainMenu();
  if (isPremium() && S.flags.demoComplete && S.chapter === DEMO_MAX_CHAPTER) { S.chapter = DEMO_MAX_CHAPTER + 1; delete S.flags.demoComplete; S.annals.push("Полная летопись открыта: поход продолжается с четвёртой главы."); }
  updateRank();
  buildGameNavigation();
  openScreen("gameScreen");
  $("mobileBottomNav")?.classList.remove("hidden");
  const desired = NAV_ITEMS.some(item => item.id === S.lastPage) ? S.lastPage : "campaign";
  render(desired);
}

function exitGame() { localSave(); openMainMenu(); }

function buildGameNavigation() {
  $("gameNav").innerHTML = NAV_GROUPS.map(group => `<div class="nav-group-title">${group.title}</div>${group.items.map(item => `<button type="button" data-page="${item.id}" class="${item.premium && !isPremium() ? "locked" : ""}" onclick="render('${item.id}')"><span class="nav-icon">${item.icon}</span><span>${item.label}</span>${item.premium && !isPremium() ? `<span class="nav-lock">FULL</span>` : ""}</button>`).join("")}`).join("");
  const quick = ["campaign", "battle", "army", "relations", "profile"].map(id => NAV_ITEMS.find(item => item.id === id));
  $("mobileBottomNav").innerHTML = quick.map(item => `<button type="button" data-mobile-page="${item.id}" onclick="render('${item.id}')"><span>${item.icon}</span>${item.label}</button>`).join("");
}

function toggleMobileMenu(force) {
  const side = $("gameSide"); if (!side) return;
  const open = typeof force === "boolean" ? force : !side.classList.contains("open");
  side.classList.toggle("open", open);
  $("sideBackdrop")?.classList.toggle("hidden", !open);
}

function topUI() {
  updateRank();
  S.army = (S.units || []).reduce((sum, unit) => sum + unit.count, 0);
  const hero = Core.heroStats(S);
  const rank = Core.RANKS[S.rankIndex] || Core.RANKS[0];
  $("playerBlock").innerHTML = `<div class="player-name">${escapeHtml(S.name)}</div><div class="player-rank">${escapeHtml(rank.name)} · УРОВЕНЬ ${S.level}</div><div class="player-mini-bars"><div class="mini-bar"><span style="width:${Core.clamp((S.hp || hero.maxHp) / hero.maxHp * 100, 0, 100)}%"></span></div><div class="mini-bar energy"><span style="width:${Core.clamp(S.energy / S.maxEnergy * 100, 0, 100)}%"></span></div></div>`;
  $("resources").innerHTML = [
    ["氣", `${S.energy}/${S.maxEnergy}`, "Энергия"], ["銀", formatNumber(S.gold), "Серебро"], ["糧", formatNumber(S.supply), "Снабжение"],
    ["諜", formatNumber(S.intel), "Разведданные"], ["軍", formatNumber(S.army), "Армия"]
  ].map(([icon, value, title]) => `<span class="resource-pill" title="${title}"><i>${icon}</i>${value}</span>`).join("");
  const chapter = Core.CHAPTERS[S.chapter - 1];
  $("chapterLine").textContent = `Глава ${S.chapter}/42 · ${chapter?.name || "Летопись"} · ${S.year} год, день ${S.day}`;
}

function render(pageId) {
  const navItem = NAV_ITEMS.find(item => item.id === pageId) || NAV_ITEMS[0];
  if (navItem.premium && !isPremium()) {
    topUI();
    $("pageTitle").textContent = navItem.label;
    $("pageKicker").textContent = PAGE_KICKERS[pageId] || "ПОЛНАЯ ВЕРСИЯ";
    $("page").innerHTML = `<div class="premium-lock"><div><div class="empty-glyph">令</div><h2>Раздел полной версии</h2><p>${escapeHtml(navItem.label)} открывается после подтверждения активной роли Boosty в Discord. Текущая демо-летопись и локальный прогресс сохраняются.</p><button class="game-button primary" onclick="openPurchase()">Открыть полный доступ</button></div></div>`;
    return;
  }
  S.lastPage = pageId;
  topUI();
  $("pageTitle").textContent = navItem.label;
  $("pageKicker").textContent = PAGE_KICKERS[pageId] || "MANDATE";
  document.querySelectorAll("#gameNav [data-page]").forEach(button => button.classList.toggle("active", button.dataset.page === pageId));
  document.querySelectorAll("[data-mobile-page]").forEach(button => button.classList.toggle("active", button.dataset.mobilePage === pageId));
  toggleMobileMenu(false);
  const pageFunction = window[`page_${pageId}`];
  if (typeof pageFunction === "function") Promise.resolve(pageFunction()).catch(error => { console.error(error); notify("Ошибка отрисовки раздела", "bad"); });
  else $("page").innerHTML = `<div class="empty-state"><div><h2>Раздел готовится</h2></div></div>`;
  maybeAutosave();
  $("page").scrollTop = 0;
}

function gainXP(amount) {
  S.xp += Math.max(0, Number(amount) || 0);
  let threshold = 100 + S.level * 12;
  while (S.xp >= threshold) {
    S.xp -= threshold; S.level += 1;
    S.stats["Сила"] += S.level % 2 ? 1 : 0; S.stats["Стойкость"] += 1;
    if (S.level % 3 === 0) S.stats["Тактика"] += 1;
    if (S.level % 4 === 0) S.stats["Разведка"] += 1;
    if (S.level % 5 === 0) S.stats["Харизма"] += 1;
    threshold = 100 + S.level * 12;
    notify(`Новый уровень: ${S.level}`, "good");
  }
}

function advanceDay(days = 1) {
  S.day += days;
  while (S.day > 360) { S.day -= 360; S.year += 1; }
}

function addAnnal(text) {
  S.annals.push(`${S.year} год, день ${S.day} — ${text}`);
  if (S.annals.length > 600) S.annals = S.annals.slice(-600);
}

function confirmAction(title, text, acceptLabel = "Подтвердить") {
  if (confirmResolver) confirmResolver(false);
  $("confirmTitle").textContent = title; $("confirmText").textContent = text; $("confirmAccept").textContent = acceptLabel;
  $("confirmModal").classList.remove("hidden");
  return new Promise(resolve => { confirmResolver = resolve; });
}

function resolveConfirm(value) {
  $("confirmModal")?.classList.add("hidden");
  const resolver = confirmResolver; confirmResolver = null; if (resolver) resolver(!!value);
}

function openStoryModal(kicker, title, text) {
  $("storyKicker").textContent = kicker; $("storyTitle").textContent = title;
  $("storyText").innerHTML = String(text).split(/\n\n+/).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("");
  $("storyModal").classList.remove("hidden");
}

function closeStoryModal() { $("storyModal")?.classList.add("hidden"); }

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch { notify("Полный экран недоступен в этом браузере", "bad"); }
}

function page_campaign() {
  const chapter = Core.CHAPTERS[S.chapter - 1];
  const rank = Core.RANKS[S.rankIndex] || Core.RANKS[0];
  const hero = Core.heroStats(S);
  const completedHere = S.completedOps.filter(id => Core.OPERATIONS[id - 1]?.chapter === S.chapter).length;
  const demoComplete = !isPremium() && S.flags.demoComplete;
  const activeBattle = S.activeBattle?.status === "active";
  $("page").innerHTML = `
    <section class="panel chapter-panel" data-chapter="${S.chapter}">
      <div class="chapter-copy">
        <p class="eyebrow">ГЛАВА ${S.chapter} ИЗ 42 · ${escapeHtml(chapter.terrain).toUpperCase()}</p>
        <h2>${escapeHtml(chapter.name)}</h2>
        <p class="lead">${escapeHtml(chapter.summary)}</p>
        <div class="war-brief"><span class="tag">Противник: ${escapeHtml(chapter.enemy)}</span><span class="tag">Рекомендуемый ур. ${chapter.recommended}</span><span class="tag">Награда ${formatNumber(chapter.reward)} 銀</span><span class="tag">Операции ${completedHere}/10</span></div>
        ${demoComplete ? `<div class="premium-lock" style="min-height:210px"><div><h2>Демо-летопись завершена</h2><p>Три первые главы пройдены. Этот прогресс останется на месте и продолжится с главы 4 после открытия полной версии.</p><button class="game-button primary" onclick="openPurchase()">Продолжить полную кампанию</button></div></div>` : activeBattle ? `<div class="choice-list"><button class="choice-button" onclick="render('battle')"><span class="choice-glyph">戰</span><span><b>Вернуться на поле боя</b><small>Сражение ${escapeHtml(S.activeBattle.objective)} ещё не закончено</small></span></button></div>` : `
        <div class="choice-list">
          <button class="choice-button" onclick="chapterAction('aggressive')"><span class="choice-glyph">攻</span><span><b>Сокрушительный удар</b><small>+14% к атаке, но строй уязвим</small></span><span class="choice-cost">12 氣 · 10 糧</span></button>
          <button class="choice-button" onclick="chapterAction('tactical')"><span class="choice-glyph">策</span><span><b>Разведка и манёвр</b><small>Ослабить армию врага до боя</small></span><span class="choice-cost">5 諜 · 12 氣</span></button>
          <button class="choice-button" onclick="chapterAction('diplomatic')"><span class="choice-glyph">和</span><span><b>Военная дипломатия</b><small>Шанс выиграть главу без битвы; провал ведёт к тяжёлому бою</small></span><span class="choice-cost">10 氣</span></button>
        </div>`}
      </div>
    </section>
    <div class="card-grid four">
      <article class="game-card"><h3>${escapeHtml(rank.name)}</h3><div class="bar-label"><span>Опыт уровня</span><span>${Math.round(S.xp)}/${100 + S.level * 12}</span></div><div class="progress gold"><span style="width:${Core.clamp(S.xp / (100 + S.level * 12) * 100, 0, 100)}%"></span></div><p>${escapeHtml(rank.perk)} · предел командования ${formatNumber(rank.command)}</p></article>
      <article class="game-card"><h3>Боевая мощь</h3><div class="metric-value">${formatNumber(Core.armyPower(S))}</div><div class="metric-label">Суммарная сила отрядов</div><p>Тактика героя: ${hero.tactics} · дух: ${hero.morale}</p></article>
      <article class="game-card"><h3>Состояние армии</h3><div class="metric-value">${formatNumber(S.army)}</div><div class="metric-label">Воинов под знаменем</div><p>Снабжение ${formatNumber(S.supply)} · средний дух ${Math.round(S.armyMorale || 60)}</p></article>
      <article class="game-card"><h3>Стратегический резерв</h3><div class="metric-value">${formatNumber(S.intel)}</div><div class="metric-label">Разведданных</div><p>Следующая разведка может раскрыть рельеф и ослабить врага.</p><button class="game-button secondary" onclick="render('intel')">Открыть разведку</button></article>
    </div>`;
}

async function chapterAction(type) {
  if (!isPremium() && S.flags.demoComplete) { openPurchase(); return; }
  if (S.activeBattle?.status === "active") return render("battle");
  if (S.energy < (type === "diplomatic" ? 10 : 12)) return notify("Не хватает энергии", "bad");
  if (type === "tactical" && S.intel < 5) return notify("Для манёвра нужно 5 разведданных", "bad");
  if (type === "tactical") S.intel -= 5;
  if (type === "diplomatic") {
    S.energy -= 10;
    const hero = Core.heroStats(S);
    const score = hero.charisma + S.influence / 4 + S.reputation / 6 + Math.random() * 24;
    const difficulty = 24 + S.chapter * 1.55;
    if (score >= difficulty) {
      const reward = Math.round(Core.CHAPTERS[S.chapter - 1].reward * .72);
      S.gold += reward; S.reputation += 4; S.influence += 2; gainXP(24 + S.chapter);
      addAnnal(`Глава «${Core.CHAPTERS[S.chapter - 1].name}» завершена военной дипломатией.`);
      completeChapter("diplomatic"); localSave(); render("campaign");
      return openStoryModal("ПОБЕДА БЕЗ СРАЖЕНИЯ", "Враг отводит знамёна", `Твой ультиматум расколол совет противника. Ты получаешь ${reward} серебра и сохраняешь армию для следующего похода.`);
    }
    addAnnal("Переговоры сорваны. Армии переходят к оружию.");
    notify("Переговоры провалились — готовься к бою", "bad");
    return startBattle("campaign", { plan: "balanced", energyCost: 4, supplyCost: 12, objective: "Прорыв после сорванных переговоров" });
  }
  startBattle("campaign", { plan: type, energyCost: 12, supplyCost: 10 });
}

function completeChapter(method) {
  const chapter = Core.CHAPTERS[S.chapter - 1];
  S.flags.completedChapters = Array.isArray(S.flags.completedChapters) ? S.flags.completedChapters : [];
  if (!S.flags.completedChapters.includes(S.chapter)) S.flags.completedChapters.push(S.chapter);
  addAnnal(`Завершена глава «${chapter.name}» (${method === "diplomatic" ? "переговоры" : "победа в сражении"}).`);
  if (S.chapter >= 42) { S.flags.finished = true; return; }
  if (!isPremium() && S.chapter >= DEMO_MAX_CHAPTER) { S.flags.demoComplete = true; return; }
  S.chapter += 1; updateRank(); advanceDay(2);
}

function page_chronicles() {
  const operations = Core.OPERATIONS.filter(operation => operation.chapter === S.chapter);
  $("page").innerHTML = `<section class="panel"><div class="panel-title"><div><p class="eyebrow">10 ОПЕРАЦИЙ ТЕКУЩЕЙ ГЛАВЫ</p><h2>Хроники: ${escapeHtml(Core.CHAPTERS[S.chapter - 1].name)}</h2><p>Малые операции дают ресурсы, разведданные и преимущество в сюжетном сражении.</p></div><span class="tag">${S.completedOps.filter(id => Core.OPERATIONS[id - 1]?.chapter === S.chapter).length}/10</span></div><div class="operation-grid">${operations.map(operation => {
    const done = S.completedOps.includes(operation.id);
    return `<article class="operation-card"><div class="operation-number">${String(operation.id % 10 || 10).padStart(2, "0")}</div><div><h3>${escapeHtml(operation.name)}</h3><p>${escapeHtml(operation.type)} · сложность ${operation.power} · ${operation.energy} 氣 · ${operation.gold} 銀 · ${operation.xp} XP</p></div><button class="game-button ${done ? "secondary" : ""}" ${done ? "disabled" : ""} onclick="runOperation(${operation.id})">${done ? "Выполнено" : operation.tacticalBattle ? "На поле" : "Начать"}</button></article>`;
  }).join("")}</div></section>`;
}

function runOperation(id) {
  const operation = Core.OPERATIONS[id - 1];
  if (!operation || operation.chapter !== S.chapter || S.completedOps.includes(id)) return;
  if (!isPremium() && operation.chapter > DEMO_MAX_CHAPTER) { openPurchase(); return; }
  if (S.energy < operation.energy) return notify("Не хватает энергии", "bad");
  if (operation.tacticalBattle) return startBattle("operation", { operationId: id, plan: S.flags.scoutedChapter === S.chapter ? "tactical" : "balanced", energyCost: operation.energy, supplyCost: Math.max(4, Math.round(operation.energy * .7)), objective: operation.name });
  S.energy -= operation.energy;
  const hero = Core.heroStats(S);
  const score = hero.tactics + hero.scout * .45 + Core.armyPower(S) / 18 + S.intel * .4 + Math.random() * 20;
  if (score >= operation.power * 1.9) {
    S.gold += operation.gold; gainXP(operation.xp); S.completedOps.push(id);
    if (operation.type === "Разведка") S.intel += 5;
    if (operation.type === "Сопровождение") S.supply += 12;
    addAnnal(`Успешно проведена операция «${operation.name}».`); notify("Операция завершена", "good");
  } else {
    gainXP(Math.ceil(operation.xp / 3)); S.armyMorale = Math.max(20, S.armyMorale - 3);
    addAnnal(`Операция «${operation.name}» сорвана.`); notify("Операция сорвана, но опыт сохранён", "bad");
  }
  advanceDay(); localSave(); render("chronicles");
}

function startBattle(kind = "raid", options = {}) {
  if (S.activeDuel?.status === "active") {
    notify("Сначала заверши текущую дуэль", "bad");
    return render("duels");
  }
  if (S.activeBattle?.status === "active") return render("battle");
  const energyCost = Number(options.energyCost ?? (kind === "training" ? 4 : 12));
  const supplyCost = Number(options.supplyCost ?? (kind === "training" ? 0 : 10));
  if (S.energy < energyCost) return notify("Не хватает энергии", "bad");
  if (S.supply < supplyCost) return notify("Не хватает армейского снабжения", "bad");
  S.energy -= energyCost; S.supply -= supplyCost;
  let plan = options.plan || "balanced";
  if (S.flags.scoutedChapter === S.chapter && plan === "balanced") plan = "tactical";
  S.activeBattle = Core.createBattle(S, { chapter: S.chapter, kind, operationId: options.operationId, plan, objective: options.objective });
  if (S.flags.sabotagedChapter === S.chapter) {
    S.activeBattle.units.filter(unit => unit.side === "enemy").forEach(unit => { unit.count = Math.max(1, Math.round(unit.count * .86)); unit.maxCount = unit.count; unit.morale = Math.max(20, unit.morale - 12); });
    S.activeBattle.log.push("Диверсия разведки ослабила врага до начала боя.");
    delete S.flags.sabotagedChapter;
  }
  if (S.flags.scoutedChapter === S.chapter) delete S.flags.scoutedChapter;
  addAnnal(`Начато сражение: ${S.activeBattle.objective}.`);
  localSave(); render("battle");
}

function page_battle() {
  const battle = S.activeBattle;
  if (!battle) {
    const power = Core.armyPower(S);
    $("page").innerHTML = `<div class="dashboard-grid"><section class="panel"><div class="panel-title"><div><p class="eyebrow">ВОЕННЫЙ СОВЕТ</p><h2>Выбрать сражение</h2><p>Каждый отряд действует отдельно на сетке 7×5. Дальность, скорость, контртипы, мораль и рельеф влияют на исход.</p></div></div><div class="choice-list"><button class="choice-button" onclick="startBattle('training',{energyCost:4,supplyCost:0,objective:'Учебный бой у лагеря'})"><span class="choice-glyph">習</span><span><b>Учебное сражение</b><small>Без постоянных потерь · освоить управление</small></span><span class="choice-cost">4 氣</span></button><button class="choice-button" onclick="startBattle('raid',{energyCost:12,supplyCost:12,objective:'Пограничный рейд'})"><span class="choice-glyph">襲</span><span><b>Пограничный рейд</b><small>Реальные потери · серебро и опыт</small></span><span class="choice-cost">12 氣 · 12 糧</span></button><button class="choice-button" onclick="chapterAction('tactical')"><span class="choice-glyph">戰</span><span><b>Сюжетное сражение</b><small>Начать битву текущей главы с тактическим планом</small></span><span class="choice-cost">5 諜</span></button></div></section><aside class="panel"><p class="eyebrow">ГОТОВНОСТЬ</p><h2>${formatNumber(power)}</h2><p class="muted">Боевая мощь армии</p><div class="stat-grid"><div class="stat-chip"><b>${formatNumber(S.army)}</b><small>ВОИНОВ</small></div><div class="stat-chip"><b>${formatNumber(S.supply)}</b><small>СНАБЖЕНИЕ</small></div><div class="stat-chip"><b>${Math.round(S.armyMorale || 60)}</b><small>ДУХ</small></div><div class="stat-chip"><b>${S.battleHistory.filter(row => row.result === "victory").length}</b><small>ПОБЕД</small></div></div></aside></div>`;
    return;
  }
  if (battle.status !== "active") return renderBattleResult(battle);
  const selected = battle.units.find(unit => unit.id === battle.selectedUnitId);
  let cells = "";
  for (let y = 0; y < 5; y += 1) for (let x = 0; x < 7; x += 1) {
    const unit = Core.battleUnitAt(battle, x, y);
    const distance = selected ? Math.abs(selected.x - x) + Math.abs(selected.y - y) : 99;
    const abilityRange = selected?.type === "cavalry" ? 2 : ["archers", "scouts"].includes(selected?.type) ? 1 : 0;
    const possible = selected && ((battle.command === "move" && !unit && distance <= (selected.speed >= 7 ? 3 : selected.speed >= 4 ? 2 : 1)) || (unit?.side === "enemy" && ["attack", "ability"].includes(battle.command) && distance <= selected.range + (battle.command === "ability" ? abilityRange : 0)));
    const tokenHtml = unit ? `<div class="unit-token ${unit.side === "enemy" ? "enemy" : ""} ${unit.acted ? "acted" : ""} ${unit.routed ? "routed" : ""}"><div class="token-title">${escapeHtml(unit.name)}</div><div class="token-glyph">${Core.UNITS[unit.type]?.glyph || "軍"}</div><div><div class="token-count"><span>${formatNumber(unit.count)}</span><span>${Math.round(unit.morale)}士</span></div><div class="token-morale"><span style="width:${unit.morale}%"></span></div></div></div>` : "";
    cells += `<button class="battle-cell ${unit?.id === battle.selectedUnitId ? "selected" : ""} ${possible ? "possible" : ""}" type="button" onclick="battleCellClick(${x},${y})" aria-label="Клетка ${x + 1}, ${y + 1}">${tokenHtml}</button>`;
  }
  const selectedHtml = selected ? `<h3>${escapeHtml(selected.name)}</h3><p class="muted">${selected.count} бойцов · ${escapeHtml(selected.formation)}</p><div class="selected-unit-stats"><span>Атака <b>${selected.attack}</b></span><span>Защита <b>${selected.defense}</b></span><span>Дальность <b>${selected.range}</b></span><span>Скорость <b>${selected.speed}</b></span><span>Дух <b>${Math.round(selected.morale)}</b></span><span>${selected.acted ? "Приказ выполнен" : "Ждёт приказ"}</span></div>` : `<h3>Отряд не выбран</h3><p class="muted">Нажми на свой отряд, затем выбери приказ и цель.</p>`;
  $("page").innerHTML = `<div class="panel-title"><div><p class="eyebrow">РАУНД ${battle.round} · ${escapeHtml(battle.terrainName)}</p><h2>${escapeHtml(battle.objective)}</h2></div><div class="tag-row"><span class="tag">Синие — твоя армия</span><span class="tag">Красные — противник</span></div></div><div class="battle-layout"><section class="battle-stage"><div class="battlefield-scroll"><div class="battlefield terrain-${battle.terrain}">${cells}</div></div></section><aside class="battle-sidebar"><div class="battle-card">${selectedHtml}</div><div class="battle-card"><h3>Приказы</h3><div class="battle-command-bar"><button class="${battle.command === "move" ? "active" : ""}" onclick="setBattleCommand('move')">移 Манёвр</button><button class="${battle.command === "attack" ? "active" : ""}" onclick="setBattleCommand('attack')">攻 Атака</button><button onclick="battleDefendSelected()">守 Оборона</button><button class="${battle.command === "ability" ? "active" : ""}" onclick="setBattleCommand('ability')">技 ${selected ? escapeHtml(Core.UNITS[selected.type]?.ability || "Навык") : "Навык"}</button></div><button class="game-button primary" style="width:100%;margin-top:8px" onclick="endPlayerTurn()" ${enemyTurnRunning ? "disabled" : ""}>${enemyTurnRunning ? "Ход противника…" : "Завершить ход"}</button><button class="game-button secondary" style="width:100%" onclick="retreatBattle()">Отступить</button></div><div class="battle-card"><h3>Журнал боя</h3><ol class="battle-log">${[...battle.log].slice(-8).reverse().map(row => `<li>${escapeHtml(row)}</li>`).join("")}</ol></div></aside></div>`;
}

function setBattleCommand(command) {
  if (!S.activeBattle || enemyTurnRunning) return;
  const selected = S.activeBattle.units.find(unit => unit.id === S.activeBattle.selectedUnitId && unit.side === "player");
  if (command === "ability" && selected && ["spearmen", "guards"].includes(selected.type)) {
    const result = Core.battleAbility(S.activeBattle, selected.id, null);
    if (!result.ok) return notify("Особый приказ уже использован", "bad");
    S.activeBattle.selectedUnitId = null;
    checkBattleOutcome(); localSave(); render("battle");
    return;
  }
  S.activeBattle.command = command; render("battle");
}

function battleCellClick(x, y) {
  const battle = S.activeBattle;
  if (!battle || battle.status !== "active" || enemyTurnRunning) return;
  const clicked = Core.battleUnitAt(battle, x, y);
  if (clicked?.side === "player") {
    if (clicked.acted) return notify("Этот отряд уже выполнил приказ");
    battle.selectedUnitId = clicked.id; return render("battle");
  }
  const selected = battle.units.find(unit => unit.id === battle.selectedUnitId && unit.side === "player");
  if (!selected) return notify("Сначала выбери свой отряд");
  let result = { ok: false };
  if (clicked?.side === "enemy" && battle.command === "attack") result = Core.battleAttack(battle, selected.id, clicked.id);
  else if (clicked?.side === "enemy" && battle.command === "ability") result = Core.battleAbility(battle, selected.id, clicked.id);
  else if (!clicked && battle.command === "move") result = Core.battleMove(battle, selected.id, x, y);
  if (!result.ok) return notify(result.reason === "range" ? "Цель вне досягаемости" : result.reason === "used" ? "Навык уже использован" : "Приказ нельзя выполнить", "bad");
  battle.selectedUnitId = null; checkBattleOutcome(); localSave(); render("battle");
}

function battleDefendSelected() {
  const battle = S.activeBattle;
  if (!battle?.selectedUnitId) return notify("Выбери отряд");
  const result = Core.battleDefend(battle, battle.selectedUnitId);
  if (!result.ok) return notify("Отряд уже действовал", "bad");
  battle.selectedUnitId = null; localSave(); render("battle");
}

async function endPlayerTurn() {
  const battle = S.activeBattle;
  if (!battle || battle.status !== "active" || enemyTurnRunning) return;
  enemyTurnRunning = true; render("battle"); await delay(settings.motion ? 430 : 30);
  Core.runEnemyTurn(battle); enemyTurnRunning = false; checkBattleOutcome(); localSave(); render("battle");
}

function checkBattleOutcome() {
  const battle = S.activeBattle; if (!battle) return;
  battle.status = Core.battleStatus(battle);
  if (battle.status !== "active") battle.log.push(battle.status === "victory" ? "Вражеское знамя падает. Победа!" : "Твой строй рассеян. Битва проиграна.");
}

function renderBattleResult(battle) {
  const victory = battle.status === "victory";
  const survivors = battle.units.filter(unit => unit.side === "player").reduce((sum, unit) => sum + unit.count, 0);
  const enemyLeft = battle.units.filter(unit => unit.side === "enemy").reduce((sum, unit) => sum + unit.count, 0);
  const chapterReward = battle.kind === "campaign" ? (Core.CHAPTERS[battle.chapter - 1]?.reward || 0) : 0;
  $("page").innerHTML = `<section class="panel battle-result"><div><div class="result-glyph">${victory ? "勝" : "敗"}</div><p class="eyebrow">${victory ? "ПОБЕДА" : "ПОРАЖЕНИЕ"}</p><h2>${victory ? "Поле осталось за тобой" : "Армия отступает"}</h2><p class="muted">Раундов: ${battle.round} · выжило: ${formatNumber(survivors)} · врагов осталось: ${formatNumber(enemyLeft)}</p>${victory ? `<div class="tag-row" style="justify-content:center;margin:18px"><span class="tag">+${battle.rewards.gold + chapterReward} серебра</span><span class="tag">+${battle.rewards.xp} опыта</span><span class="tag">+${battle.rewards.reputation} репутации</span></div>` : `<p>Поражение не стирает прогресс: выжившие отряды сохранят опыт, но потеряют боевой дух.</p>`}<button class="game-button primary" onclick="claimBattleResult()">Записать исход в летопись</button></div></section>`;
}

function claimBattleResult() {
  const battle = S.activeBattle; if (!battle || battle.status === "active") return;
  const victory = battle.status === "victory";
  if (battle.kind !== "training") {
    for (const fighter of battle.units.filter(unit => unit.side === "player" && unit.sourceUid)) {
      const source = S.units.find(unit => unit.uid === fighter.sourceUid);
      if (source) { source.count = fighter.count; source.morale = Core.clamp(fighter.morale + (victory ? 8 : -5), 10, 100); source.xp += victory ? 45 + battle.chapter * 2 : 18; }
    }
    S.units = S.units.filter(unit => unit.count > 0);
  }
  if (victory) {
    const rewardScale = battle.kind === "training" ? .18 : 1;
    S.gold += Math.round(battle.rewards.gold * rewardScale); gainXP(Math.round(battle.rewards.xp * rewardScale)); S.reputation += Math.round(battle.rewards.reputation * rewardScale); S.armyMorale = Core.clamp((S.armyMorale || 60) + 6, 0, 100);
    if (battle.operationId && !S.completedOps.includes(battle.operationId)) S.completedOps.push(battle.operationId);
    if (battle.kind === "campaign") {
      S.gold += Core.CHAPTERS[battle.chapter - 1]?.reward || 0;
      completeChapter("battle");
    }
    addAnnal(`Победа в сражении «${battle.objective}» за ${battle.round} раундов.`);
  } else {
    S.reputation = Math.max(0, S.reputation - 2); S.armyMorale = Core.clamp((S.armyMorale || 60) - 9, 0, 100); S.hp = Math.max(1, (S.hp || Core.heroStats(S).maxHp) - 20);
    addAnnal(`Поражение в сражении «${battle.objective}».`);
  }
  S.battleHistory.push({ id: battle.id, chapter: battle.chapter, objective: battle.objective, result: victory ? "victory" : "defeat", rounds: battle.round, date: `${S.year}-${S.day}` });
  const returnPage = battle.kind === "campaign" ? "campaign" : battle.operationId ? "chronicles" : "battle";
  S.activeBattle = null; S.army = S.units.reduce((sum, unit) => sum + unit.count, 0); advanceDay(); localSave(); render(returnPage);
  notify(victory ? "Победа записана в летопись" : "Армия сохранила уцелевшие отряды", victory ? "good" : "bad");
}

async function retreatBattle() {
  if (!(await confirmAction("Отступить с поля боя?", "Отряды сохранят текущие потери, а репутация и боевой дух снизятся.", "Отступить"))) return;
  S.activeBattle.status = "defeat"; S.activeBattle.log.push("Отдан приказ об отступлении."); render("battle");
}

function page_duels() {
  if (S.activeDuel) return renderActiveDuel();
  $("page").innerHTML = `<section class="panel"><div class="panel-title"><div><p class="eyebrow">ШЕСТЬ ГЕНЕРАЛОВ</p><h2>Поединки перед армиями</h2><p>Здоровье, атака, защита, точность и стойка зависят от характеристик и экипировки героя.</p></div><span class="tag">Побед ${Object.values(S.duelResults).filter(row => row === "victory").length}/6</span></div><div class="general-grid">${Object.entries(Core.GENERALS).map(([id, general]) => {
    const unlocked = S.chapter >= general.unlock || S.duelResults[id];
    const result = S.duelResults[id];
    return `<article class="general-card ${unlocked ? "" : "locked"}"><span class="edition-rank">${escapeHtml(general.kingdom)} · глава ${general.unlock}</span><h3>${escapeHtml(general.name)}</h3><div class="general-title">${escapeHtml(general.title)}</div><p>${escapeHtml(general.style)}</p><div class="tag-row"><span class="tag">HP ${general.maxHp}</span><span class="tag">ATK ${general.attack}</span><span class="tag">Техника ${general.technique}</span></div><button class="game-button ${result === "victory" ? "secondary" : "primary"}" ${unlocked ? "" : "disabled"} onclick="startDuel('${id}')">${!unlocked ? `Откроется в главе ${general.unlock}` : result === "victory" ? "Повторить дуэль" : "Вызвать на поединок"}</button></article>`;
  }).join("")}</div></section>`;
}

function startDuel(generalId) {
  if (S.activeBattle?.status === "active") {
    notify("Сначала заверши текущее сражение", "bad");
    return render("battle");
  }
  if (S.activeDuel?.status === "active") return render("duels");
  const general = Core.GENERALS[generalId];
  if (!general || (S.chapter < general.unlock && !S.duelResults[generalId])) return notify("Этот генерал ещё не встретился в сюжете", "bad");
  if (S.energy < 8) return notify("Для дуэли нужно 8 энергии", "bad");
  S.energy -= 8; S.activeDuel = Core.createDuel(S, generalId); addAnnal(`Начата дуэль с ${general.name}.`); localSave(); render("duels");
}

function renderActiveDuel() {
  const duel = S.activeDuel, general = Core.GENERALS[duel.generalId];
  if (duel.status !== "active") {
    const victory = duel.status === "victory";
    $("page").innerHTML = `<section class="panel battle-result"><div><div class="result-glyph">${victory ? "勝" : "敗"}</div><p class="eyebrow">ДУЭЛЬ ЗАВЕРШЕНА</p><h2>${victory ? `${escapeHtml(general.name)} признаёт поражение` : "Тебя уносят с поля поединка"}</h2><p>${victory ? `Награда: ${general.rewardGold} серебра${general.rewardItem ? ` и ${Core.ITEMS[general.rewardItem].name}` : ""}.` : "Можно восстановить силы и потребовать реванш позже."}</p><button class="game-button primary" onclick="finishDuel()">Записать исход</button></div></section>`;
    return;
  }
  const percent = (value, max) => Core.clamp(value / max * 100, 0, 100);
  $("page").innerHTML = `<section class="duel-arena"><div class="panel-title"><div><p class="eyebrow">РАУНД ${duel.round} · ФАЗА ${duel.phase}</p><h2>Поединок перед двумя армиями</h2></div><button class="game-button secondary" onclick="abandonDuel()">Прервать</button></div><div class="duel-fighters"><article class="fighter"><h2>${escapeHtml(S.name)}</h2><p class="muted">${escapeHtml(Core.RANKS[S.rankIndex].name)}</p><div class="fighter-glyph">劍</div><div class="duel-bars"><div><div class="bar-label"><span>Здоровье</span><span>${duel.hero.hp}/${duel.hero.maxHp}</span></div><div class="progress"><span style="width:${percent(duel.hero.hp, duel.hero.maxHp)}%"></span></div></div><div><div class="bar-label"><span>Выносливость</span><span>${Math.round(duel.hero.stamina)}</span></div><div class="progress gold"><span style="width:${duel.hero.stamina}%"></span></div></div><div><div class="bar-label"><span>Концентрация</span><span>${Math.round(duel.hero.focus)}</span></div><div class="progress good"><span style="width:${duel.hero.focus}%"></span></div></div></div></article><div class="duel-versus">対</div><article class="fighter enemy"><h2>${escapeHtml(general.name)}</h2><p class="muted">${escapeHtml(general.title)}</p><div class="fighter-glyph">${duel.phase === 3 ? "怒" : "將"}</div><div class="duel-bars"><div><div class="bar-label"><span>Здоровье</span><span>${duel.enemy.hp}/${duel.enemy.maxHp}</span></div><div class="progress"><span style="width:${percent(duel.enemy.hp, duel.enemy.maxHp)}%"></span></div></div><div><div class="bar-label"><span>Выносливость</span><span>${Math.round(duel.enemy.stamina)}</span></div><div class="progress gold"><span style="width:${duel.enemy.stamina}%"></span></div></div></div></article></div><div class="duel-actions"><button onclick="duelAction('strike')">斬 Сильный удар<small>14 выносливости</small></button><button onclick="duelAction('feint')">虛 Ложный выпад<small>Ослабляет стойку</small></button><button onclick="duelAction('guard')">守 Защита<small>Снижает ответный урон</small></button><button onclick="duelAction('technique')">技 Боевой приём<small>35 фокуса · 20 выносливости</small></button><button onclick="duelAction('recover')">息 Восстановиться<small>Риск получить больше урона</small></button></div><div class="duel-log">${[...duel.log].slice(-9).reverse().map(row => `<p>${escapeHtml(row)}</p>`).join("")}</div></section>`;
}

function duelAction(action) {
  if (!S.activeDuel || S.activeDuel.status !== "active") return;
  Core.resolveDuelRound(S.activeDuel, action); localSave(); render("duels");
}

function finishDuel() {
  const duel = S.activeDuel; if (!duel || duel.status === "active") return;
  const general = Core.GENERALS[duel.generalId], victory = duel.status === "victory", firstVictory = S.duelResults[duel.generalId] !== "victory";
  if (victory) {
    S.duelResults[duel.generalId] = "victory";
    if (firstVictory) {
      S.gold += general.rewardGold; gainXP(35 + general.unlock * 2); S.reputation += 8;
      if (general.rewardItem) S.inventory.push(Core.itemInstance(general.rewardItem));
      const relation = S.relations[general.relation]; if (relation) { relation.affection = Core.clamp(relation.affection + 12, 0, 100); relation.trust = Core.clamp(relation.trust + 10, 0, 100); }
    }
    addAnnal(`Победа в дуэли над ${general.name}, ${general.title}.`);
  } else {
    if (S.duelResults[duel.generalId] !== "victory") S.duelResults[duel.generalId] = "defeat";
    S.hp = Math.max(1, Math.round(Core.heroStats(S).maxHp * .35)); advanceDay(); addAnnal(`Поражение в дуэли с ${general.name}.`);
  }
  S.activeDuel = null; localSave(); render("duels"); notify(victory ? "Генерал признал твою победу" : "Поражение стало частью опыта", victory ? "good" : "bad");
}

async function abandonDuel() {
  if (!(await confirmAction("Прервать дуэль?", "Поединок будет засчитан как поражение, но герой останется жив.", "Отступить"))) return;
  S.activeDuel.status = "defeat"; finishDuel();
}

function page_map() {
  $("page").innerHTML = `<section class="map-board"><div class="kingdom-grid">${Core.KINGDOMS.map((kingdom, index) => {
    const status = kingdom.name === S.home ? "Родное царство" : index === 3 && S.chapter >= 15 ? "Главный противник" : S.chapter >= 30 && index < 3 ? "Подчинено" : index === (S.chapter % 7) ? "Идёт война" : "Нейтрально";
    return `<article class="kingdom-card" style="--realm:${kingdom.color}"><span class="edition-rank">${escapeHtml(status)}</span><h3>${escapeHtml(kingdom.name)}</h3><div class="tag-row"><span class="tag">${escapeHtml(kingdom.region)}</span><span class="tag">${escapeHtml(kingdom.army)}</span></div><p>${escapeHtml(kingdom.desc)}</p><div class="bar-label"><span>Военная угроза</span><span>${Math.min(100, 25 + index * 8 + S.chapter)}%</span></div><div class="progress"><span style="width:${Math.min(100, 25 + index * 8 + S.chapter)}%"></span></div></article>`;
  }).join("")}</div></section>`;
}

function page_army() {
  S.army = S.units.reduce((sum, unit) => sum + unit.count, 0);
  const rank = Core.RANKS[S.rankIndex] || Core.RANKS[0];
  const averageMorale = S.units.length ? Math.round(S.units.reduce((sum, unit) => sum + unit.morale, 0) / S.units.length) : 0;
  $("page").innerHTML = `<section class="panel"><div class="panel-title"><div><p class="eyebrow">ШТАБ АРМИИ</p><h2>${formatNumber(S.army)} воинов под знаменем</h2><p>Предел командования ${escapeHtml(rank.name)}: ${formatNumber(rank.command)}. Улучшения меняют не только название, но и все боевые параметры отряда.</p></div><div class="tag-row"><span class="tag">Мощь ${formatNumber(Core.armyPower(S))}</span><span class="tag">Средний дух ${averageMorale}</span><span class="tag">Снабжение ${formatNumber(S.supply)}</span></div></div><div class="unit-grid">${S.units.length ? S.units.map(renderUnitCard).join("") : `<div class="empty-state"><div><div class="empty-glyph">軍</div><h2>Армия распущена</h2><p>Набери первый отряд ниже.</p></div></div>`}</div></section><section class="panel"><div class="panel-title"><div><p class="eyebrow">НАБОР</p><h2>Новые подразделения</h2></div></div><div class="recruit-grid">${Object.entries(Core.UNITS).map(([type, def]) => `<article class="recruit-option"><div class="unit-head"><div class="unit-glyph">${def.glyph}</div><div><h3>${escapeHtml(def.name)}</h3><p>${escapeHtml(def.role)}</p></div></div><p class="muted">${escapeHtml(def.counters)} · ${escapeHtml(def.ability)}</p><button class="game-button" style="width:100%" onclick="recruitUnit('${type}',50)">Нанять 50 · ${def.cost} 銀</button></article>`).join("")}</div></section>`;
}

function renderUnitCard(unit) {
  const def = Core.UNITS[unit.type] || Core.UNITS.spearmen;
  const stats = Core.unitStats(unit, S);
  const nextTier = Math.min(5, unit.tier + 1);
  const formationIndex = ["Линия", "Клин", "Каре", "Рассыпной строй"].indexOf(unit.formation);
  return `<article class="unit-card"><div class="unit-head"><div class="unit-glyph">${def.glyph}</div><div><h3>${escapeHtml(def.tiers[unit.tier - 1] || def.name)}</h3><p>Ступень ${unit.tier}/5 · ветеранство ${unit.veterancy}/5</p></div><div class="unit-count">${formatNumber(unit.count)}<small>БОЙЦОВ</small></div></div><div class="unit-stats"><span><b>${stats.attack}</b><small>АТАКА</small></span><span><b>${stats.defense}</b><small>ЗАЩИТА</small></span><span><b>${stats.range}</b><small>ДАЛЬНОСТЬ</small></span><span><b>${stats.speed}</b><small>СКОРОСТЬ</small></span><span><b>${stats.morale}</b><small>ДУХ</small></span><span><b>${stats.discipline}</b><small>ДИСЦИПЛИНА</small></span></div><div class="tag-row"><span class="tag">${escapeHtml(unit.formation)}</span><span class="tag">Сила ${formatNumber(stats.power)}</span><span class="tag">${escapeHtml(def.ability)}</span></div><div class="button-row" style="margin-top:13px"><button class="game-button" onclick="trainUnit('${unit.uid}')">Тренировать</button><button class="game-button" onclick="upgradeUnit('${unit.uid}')" ${unit.tier >= 5 ? "disabled" : ""}>${unit.tier >= 5 ? "Максимум" : `До «${escapeHtml(def.tiers[nextTier - 1])}»`}</button><button class="game-button secondary" onclick="cycleFormation('${unit.uid}',${formationIndex})">Сменить строй</button><button class="game-button secondary" onclick="replenishUnit('${unit.uid}')">Пополнить +25</button></div></article>`;
}

function recruitUnit(type, requestedAmount) {
  const def = Core.UNITS[type]; if (!def) return;
  const rank = Core.RANKS[S.rankIndex] || Core.RANKS[0];
  const capacity = Math.max(0, rank.command - S.army);
  const amount = Math.min(requestedAmount, capacity);
  if (amount <= 0) return notify(`Предел командования: ${formatNumber(rank.command)}`, "bad");
  const cost = Math.ceil(def.cost * amount / 50), supply = Math.ceil(amount * .18);
  if (S.gold < cost) return notify("Недостаточно серебра", "bad");
  if (S.supply < supply) return notify(`Для набора нужно ${supply} снабжения`, "bad");
  S.gold -= cost; S.supply -= supply;
  const existing = S.units.find(unit => unit.type === type && unit.tier === 1);
  if (existing) existing.count += amount; else S.units.push(Core.unitInstance(type, amount));
  S.army += amount; addAnnal(`Нанято ${amount} бойцов: ${def.name}.`); localSave(); render("army"); notify(`${def.name}: +${amount}`, "good");
}

function trainUnit(uid) {
  const unit = S.units.find(entry => entry.uid === uid); if (!unit) return;
  if (S.energy < 5 || S.gold < 35) return notify("Тренировка требует 5 энергии и 35 серебра", "bad");
  S.energy -= 5; S.gold -= 35; unit.xp += 75; unit.morale = Core.clamp(unit.morale + 7, 0, 100);
  const threshold = (unit.veterancy + 1) * 120;
  if (unit.xp >= threshold && unit.veterancy < 5) { unit.xp -= threshold; unit.veterancy += 1; notify(`Ветеранство отряда повышено до ${unit.veterancy}`, "good"); }
  gainXP(5); addAnnal(`${Core.UNITS[unit.type].name} прошли усиленную тренировку.`); localSave(); render("army");
}

function upgradeUnit(uid) {
  const unit = S.units.find(entry => entry.uid === uid); if (!unit || unit.tier >= 5) return;
  const requiredLevel = unit.tier * 4;
  if (S.level < requiredLevel) return notify(`Нужен уровень героя ${requiredLevel}`, "bad");
  const cost = Math.round(110 * unit.tier + unit.count * .9);
  if (S.gold < cost) return notify(`Улучшение стоит ${cost} серебра`, "bad");
  S.gold -= cost; unit.tier += 1; unit.morale = Core.clamp(unit.morale + 10, 0, 100); unit.xp = 0;
  addAnnal(`${Core.UNITS[unit.type].name} улучшены до ступени ${unit.tier}.`); localSave(); render("army"); notify("Ступень войск повышена", "good");
}

function cycleFormation(uid, currentIndex) {
  const unit = S.units.find(entry => entry.uid === uid); if (!unit) return;
  const formations = ["Линия", "Клин", "Каре", "Рассыпной строй"];
  unit.formation = formations[(currentIndex + 1 + formations.length) % formations.length];
  localSave(); render("army"); notify(`Новый строй: ${unit.formation}`);
}

function replenishUnit(uid) {
  const unit = S.units.find(entry => entry.uid === uid); if (!unit) return;
  const def = Core.UNITS[unit.type], cost = Math.ceil(def.cost * .55), supply = 6;
  if (S.gold < cost || S.supply < supply) return notify(`Нужно ${cost} серебра и ${supply} снабжения`, "bad");
  S.gold -= cost; S.supply -= supply; unit.count += 25; S.army += 25; unit.morale = Core.clamp(unit.morale - 2, 0, 100);
  localSave(); render("army"); notify(`${def.name}: пополнение +25`, "good");
}

function page_inventory() {
  const hero = Core.heroStats(S), bonuses = Core.itemBonuses(S);
  const slotNames = { weapon: "Оружие", armor: "Доспех", mount: "Боевой конь", talisman: "Реликвия" };
  const slots = Object.keys(slotNames).map(slot => {
    const item = S.inventory.find(entry => entry.uid === S.equipment[slot]), def = Core.itemDef(item);
    return `<button class="equipment-slot ${item ? "equipped" : ""}" onclick="${item ? `unequipSlot('${slot}')` : "render('inventory')"}"><small>${slotNames[slot]}</small><b>${item ? escapeHtml(def.name) : "Пусто"}</b>${item ? `<span class="rarity-label">ур. ${item.level} · ${Core.RARITIES[def.rarity]?.name || "Обычный"}</span>` : ""}</button>`;
  }).join("");
  $("page").innerHTML = `<div class="equipment-layout"><section class="panel"><div class="panel-title"><div><p class="eyebrow">ЭКИПИРОВАНО</p><h2>Снаряжение героя</h2></div></div><div class="equipment-paperdoll">${slots}</div><div class="stat-grid" style="margin-top:14px"><div class="stat-chip"><b>${hero.attack}</b><small>АТАКА</small></div><div class="stat-chip"><b>${hero.defense}</b><small>ЗАЩИТА</small></div><div class="stat-chip"><b>${hero.maxHp}</b><small>ЗДОРОВЬЕ</small></div><div class="stat-chip"><b>${hero.precision}%</b><small>ТОЧНОСТЬ</small></div><div class="stat-chip"><b>${hero.initiative}</b><small>ИНИЦИАТИВА</small></div><div class="stat-chip"><b>${hero.duelGuard}</b><small>СТОЙКА</small></div></div>${Object.keys(bonuses).length ? `<p class="muted">Бонусы экипировки: ${Object.entries(bonuses).map(([key, value]) => `${Core.STAT_LABELS[key] || key} +${value}`).join(" · ")}</p>` : ""}</section><section class="panel"><div class="panel-title"><div><p class="eyebrow">ИНВЕНТАРЬ ${S.inventory.length}</p><h2>Предметы и реликвии</h2></div></div><div class="item-grid">${S.inventory.map(renderItemCard).join("")}</div></section></div>`;
}

function renderItemCard(item) {
  const def = Core.itemDef(item), rarity = Core.RARITIES[def.rarity] || Core.RARITIES.common;
  const equipped = Object.values(S.equipment).includes(item.uid);
  const statHtml = Object.entries(def.stats || {}).map(([key, value]) => `<span>${Core.STAT_LABELS[key] || key} +${Math.round(value * (1 + (item.level - 1) * .08))}</span>`).join("");
  const effectHtml = def.effect ? Object.entries(def.effect).map(([key, value]) => `<span>${key === "energy" ? "Энергия" : key === "hp" ? "Здоровье" : "Снабжение"} +${value}</span>`).join("") : "";
  const action = ["weapon", "armor", "mount", "talisman"].includes(def.slot) ? `<button class="game-button" onclick="equipItem('${item.uid}')">${equipped ? "Надето" : "Надеть"}</button><button class="game-button secondary" onclick="upgradeItem('${item.uid}')">Улучшить</button>` : def.slot === "consumable" ? `<button class="game-button" onclick="useItem('${item.uid}')">Использовать</button>` : def.slot === "gift" ? `<button class="game-button secondary" onclick="render('relations')">Подарить</button>` : "";
  return `<article class="item-card rarity-${def.rarity}"><span class="rarity-label">${rarity.name} · ${Core.ITEM_SLOT_NAMES[def.slot] || "Предмет"}${item.quantity > 1 ? ` · ×${item.quantity}` : ""}</span><h3>${escapeHtml(def.name)}</h3><p>${escapeHtml(def.desc)}</p><div class="item-stats">${statHtml || effectHtml || `<span>Без числовых бонусов</span>`}</div><div class="bar-label"><span>Уровень ${item.level}</span><span>Прочность ${Math.round(item.durability)}%</span></div><div class="progress gold"><span style="width:${item.durability}%"></span></div><div class="item-actions">${action}</div></article>`;
}

function equipItem(uid) {
  const item = S.inventory.find(entry => entry.uid === uid), def = Core.itemDef(item); if (!item || !["weapon", "armor", "mount", "talisman"].includes(def.slot)) return;
  if (S.level < def.level) return notify(`Нужен уровень ${def.level}`, "bad");
  S.equipment[def.slot] = uid; localSave(); render("inventory"); notify(`${def.name} экипирован`, "good");
}

function unequipSlot(slot) { if (S.equipment[slot]) { S.equipment[slot] = null; localSave(); render("inventory"); } }

function useItem(uid) {
  const item = S.inventory.find(entry => entry.uid === uid), def = Core.itemDef(item); if (!item || def.slot !== "consumable") return;
  const hero = Core.heroStats(S);
  if (def.effect.energy) S.energy = Core.clamp(S.energy + def.effect.energy, 0, S.maxEnergy);
  if (def.effect.hp) S.hp = Core.clamp((S.hp || hero.maxHp) + def.effect.hp, 0, hero.maxHp);
  if (def.effect.supply) S.supply += def.effect.supply;
  item.quantity -= 1; if (item.quantity <= 0) S.inventory = S.inventory.filter(entry => entry.uid !== uid);
  localSave(); render("inventory"); notify(`${def.name} использован`, "good");
}

function upgradeItem(uid) {
  const item = S.inventory.find(entry => entry.uid === uid), def = Core.itemDef(item); if (!item || !def.stats || item.level >= 10) return notify("Предмет уже достиг предела", "bad");
  const cost = Math.max(25, Math.round((def.price || 50) * (.22 + item.level * .1)));
  if (S.gold < cost) return notify(`Улучшение стоит ${cost} серебра`, "bad");
  S.gold -= cost; item.level += 1; item.durability = 100; localSave(); render("inventory"); notify(`${def.name}: уровень ${item.level}`, "good");
}

function page_market() {
  const tabs = [["all", "Все"], ["weapon", "Оружие"], ["armor", "Доспехи"], ["mount", "Кони"], ["talisman", "Реликвии"], ["consumable", "Припасы"], ["gift", "Подарки"], ["artifacts", "Божественные"]];
  const goods = Object.entries(Core.ITEMS).filter(([, def]) => marketFilter === "all" || (marketFilter === "artifacts" ? ["legendary", "heavenly"].includes(def.rarity) : def.slot === marketFilter));
  $("page").innerHTML = `<section class="panel"><div class="panel-title"><div><p class="eyebrow">РЫНОК СЕМИ ЦАРСТВ</p><h2>Снаряжение, припасы и реликвии</h2><p>Каждый предмет имеет уровень, редкость, слот и точные числовые бонусы.</p></div><span class="tag">${formatNumber(S.gold)} серебра</span></div><div class="market-tabs">${tabs.map(([id, label]) => `<button class="${marketFilter === id ? "active" : ""}" onclick="setMarketFilter('${id}')">${label}</button>`).join("")}</div><div class="item-grid">${goods.map(([id, def]) => renderMarketItem(id, def)).join("")}</div></section>`;
}

function renderMarketItem(id, def) {
  const rarity = Core.RARITIES[def.rarity] || Core.RARITIES.common;
  const stats = Object.entries(def.stats || {}).map(([key, value]) => `<span>${Core.STAT_LABELS[key] || key} +${value}</span>`).join("");
  return `<article class="item-card rarity-${def.rarity}"><span class="rarity-label">${rarity.name} · ${Core.ITEM_SLOT_NAMES[def.slot] || "Предмет"}</span><h3>${escapeHtml(def.name)}</h3><p>${escapeHtml(def.desc)}</p><div class="item-stats">${stats || `<span>Особое применение</span>`}</div><div class="tag-row"><span class="tag">Уровень ${def.level}</span><span class="tag">${formatNumber(def.price)} 銀</span></div><div class="item-actions"><button class="game-button ${S.level < def.level ? "secondary" : ""}" onclick="buyItem('${id}')">${S.level < def.level ? `Нужен ур. ${def.level}` : "Купить"}</button></div></article>`;
}

function setMarketFilter(filter) { marketFilter = filter; render("market"); }

function buyItem(id) {
  const def = Core.ITEMS[id]; if (!def) return;
  if (S.level < def.level) return notify(`Нужен уровень героя ${def.level}`, "bad");
  if (S.gold < def.price) return notify("Недостаточно серебра", "bad");
  S.gold -= def.price;
  const stack = def.stackable ? S.inventory.find(item => item.id === id) : null;
  if (stack) stack.quantity += 1; else S.inventory.push(Core.itemInstance(id));
  addAnnal(`Приобретён предмет «${def.name}».`); localSave(); render("market"); notify(`${def.name} приобретён`, "good");
}

function page_intel() {
  const scouted = S.flags.scoutedChapter === S.chapter, sabotaged = S.flags.sabotagedChapter === S.chapter;
  $("page").innerHTML = `<div class="card-grid"><article class="game-card"><p class="eyebrow">ИНФОРМАТОРЫ</p><h3>Расширить сеть</h3><div class="metric-value">+12 諜</div><p>Надёжный источник сведений при дворе и в приграничных городах.</p><button class="game-button" onclick="intelAction('informants')">Заплатить 60 銀</button></article><article class="game-card"><p class="eyebrow">ПЕРЕХВАТ</p><h3>Поймать гонца</h3><div class="metric-value">+8 諜</div><p>Шанс получить припасы или редкий подарок вместе с донесением.</p><button class="game-button" onclick="intelAction('courier')">10 氣</button></article><article class="game-card"><p class="eyebrow">РЕКОГНОСЦИРОВКА</p><h3>Изучить поле боя</h3><div class="metric-value">${scouted ? "ГОТОВО" : "+ план"}</div><p>Следующая битва главы начнётся с тактическим преимуществом.</p><button class="game-button ${scouted ? "secondary" : ""}" ${scouted ? "disabled" : ""} onclick="intelAction('scout')">8 氣 · 6 諜</button></article><article class="game-card"><p class="eyebrow">ДИВЕРСИЯ</p><h3>Сорвать снабжение врага</h3><div class="metric-value">${sabotaged ? "ГОТОВО" : "−14%"}</div><p>Уменьшает численность и мораль вражеских отрядов перед следующей битвой.</p><button class="game-button ${sabotaged ? "secondary" : ""}" ${sabotaged ? "disabled" : ""} onclick="intelAction('sabotage')">8 氣 · 12 諜</button></article><article class="game-card"><p class="eyebrow">ДОСЬЕ</p><h3>Генералы семи царств</h3><div class="metric-value">${Object.keys(Core.GENERALS).length}</div><p>Изучи стиль, характеристики и награды будущих противников.</p><button class="game-button" onclick="render('duels')">Открыть досье</button></article><article class="game-card"><p class="eyebrow">РЕЗЕРВ</p><h3>Разведданные</h3><div class="metric-value">${formatNumber(S.intel)}</div><p>Расходуются на сюжетные планы, диверсии и разведку поля.</p></article></div>`;
}

function intelAction(action) {
  if (action === "informants") {
    if (S.gold < 60) return notify("Недостаточно серебра", "bad"); S.gold -= 60; S.intel += 12; addAnnal("Расширена сеть информаторов.");
  } else if (action === "courier") {
    if (S.energy < 10) return notify("Не хватает энергии", "bad"); S.energy -= 10; S.intel += 8; gainXP(6);
    if (Math.random() > .66) { const reward = Math.random() > .5 ? "provisions" : "silk_gift"; S.inventory.push(Core.itemInstance(reward)); notify(`У гонца найдено: ${Core.ITEMS[reward].name}`, "good"); }
    addAnnal("Перехвачен вражеский гонец."); advanceDay();
  } else if (action === "scout") {
    if (S.energy < 8 || S.intel < 6) return notify("Нужно 8 энергии и 6 разведданных", "bad"); S.energy -= 8; S.intel -= 6; S.flags.scoutedChapter = S.chapter; addAnnal("Разведчики изучили поле следующего сражения.");
  } else if (action === "sabotage") {
    if (S.energy < 8 || S.intel < 12) return notify("Нужно 8 энергии и 12 разведданных", "bad"); S.energy -= 8; S.intel -= 12; S.flags.sabotagedChapter = S.chapter; S.reputation += 1; addAnnal("Тайная группа уничтожила часть вражеского снабжения.");
  }
  localSave(); render("intel"); if (action !== "courier") notify("Приказ разведке выполнен", "good");
}

function page_relations() {
  const unlockedNames = Object.entries(Core.RELATIONS).filter(([name, def]) => S.chapter >= def.unlock || (S.relations[name]?.affection || 0) > 0).map(([name]) => name);
  if (!unlockedNames.includes(selectedRelation)) selectedRelation = unlockedNames[0] || "Го Чжэнь";
  const relation = S.relations[selectedRelation], def = Core.RELATIONS[selectedRelation], stage = Core.relationStage(relation);
  const duelLocked = def.requiresDuel && S.duelResults[def.requiresDuel] !== "victory";
  const gifts = S.inventory.filter(item => Core.itemDef(item).slot === "gift");
  $("page").innerHTML = `<div class="relation-layout"><aside class="relation-roster">${Object.entries(Core.RELATIONS).map(([name, character]) => {
    const data = S.relations[name], unlocked = S.chapter >= character.unlock || (data?.affection || 0) > 0;
    return `<button class="relation-card ${name === selectedRelation ? "selected" : ""} ${unlocked ? "" : "locked"}" ${unlocked ? `onclick="selectRelation(${jsArg(name)})"` : "disabled"}><span class="relation-avatar">${unlocked ? escapeHtml(name[0]) : "?"}</span><span><h3>${unlocked ? escapeHtml(name) : "Неизвестно"}</h3><p>${unlocked ? escapeHtml(Core.relationStage(data).name) : `Откроется в главе ${character.unlock}`}</p>${unlocked ? `<span class="progress"><span style="width:${data.affection}%"></span></span>` : ""}</span></button>`;
  }).join("")}</aside><section class="relation-detail"><div class="relation-portrait"><div><p class="eyebrow">${escapeHtml(def.role)}</p><h2>${escapeHtml(selectedRelation)}</h2><p>${escapeHtml(def.tone)}</p><div class="tag-row"><span class="tag">${escapeHtml(stage.name)}</span>${relation.romance ? `<span class="tag">Нерушимая клятва</span>` : ""}${duelLocked ? `<span class="tag">Нужна победа в дуэли</span>` : ""}</div></div></div><div class="relation-bars"><div><div class="bar-label"><span>Близость</span><span>${relation.affection}/100</span></div><div class="progress"><span style="width:${relation.affection}%"></span></div></div><div><div class="bar-label"><span>Доверие</span><span>${relation.trust}/100</span></div><div class="progress good"><span style="width:${relation.trust}%"></span></div></div><div><div class="bar-label"><span>Напряжение</span><span>${relation.tension}/100</span></div><div class="progress gold"><span style="width:${relation.tension}%"></span></div></div></div><div class="relation-actions"><button onclick="relationAction(${jsArg(selectedRelation)},'talk')">話 Поговорить<small>2 энергии · раз в день</small></button><button onclick="relationAction(${jsArg(selectedRelation)},'train')">劍 Тренироваться<small>6 энергии · доверие и опыт</small></button><button onclick="relationAction(${jsArg(selectedRelation)},'mission')">軍 Совместная операция<small>10 энергии · риск и награда</small></button><button ${relation.affection < 60 || relation.trust < 45 || duelLocked ? "disabled" : ""} onclick="relationAction(${jsArg(selectedRelation)},'date')">灯 Свидание<small>Нужно 60 близости и 45 доверия</small></button><button ${relation.affection < 85 || relation.trust < 65 || duelLocked || relation.romance ? "disabled" : ""} onclick="commitRelationship(${jsArg(selectedRelation)})">誓 Дать клятву<small>Стадия любви · необратимая сцена</small></button><button onclick="render('annals')">書 История связи<small>${relation.scenes.length} сцен в летописи</small></button></div><div class="panel" style="margin-top:13px"><div class="panel-title"><div><p class="eyebrow">ПОДАРКИ</p><h2>Знаки внимания</h2></div></div>${gifts.length ? `<div class="button-row">${gifts.map(item => { const itemDef = Core.itemDef(item); return `<button class="game-button" onclick="giveGift(${jsArg(selectedRelation)},'${item.uid}')">${escapeHtml(itemDef.name)}${item.quantity > 1 ? ` ×${item.quantity}` : ""}</button>`; }).join("")}</div>` : `<p class="muted">В инвентаре нет подарков. Южный шёлк, трактаты и нефрит продаются на рынке.</p>`}</div></section></div>`;
}

function selectRelation(name) { selectedRelation = name; render("relations"); }

function relationAction(name, action) {
  const relation = S.relations[name], def = Core.RELATIONS[name]; if (!relation || !def) return;
  const today = absoluteDay();
  if (relation.lastActionDay[action] === today) return notify("Это действие уже выполнено сегодня", "bad");
  const costs = { talk: 2, train: 6, mission: 10, date: 8 }, cost = costs[action] || 0;
  if (S.energy < cost) return notify("Не хватает энергии", "bad");
  if (action === "date" && (relation.affection < 60 || relation.trust < 45)) return notify("Отношения ещё не достигли стадии свиданий", "bad");
  if (["date"].includes(action) && def.requiresDuel && S.duelResults[def.requiresDuel] !== "victory") return notify("Сначала победи этого генерала в дуэли", "bad");
  S.energy -= cost; relation.lastActionDay[action] = today;
  let affection = 0, trust = 0, tension = 0;
  if (action === "talk") { affection = 3; trust = 2; }
  if (action === "train") { affection = 3; trust = 5; gainXP(8); }
  if (action === "mission") {
    const success = Core.heroStats(S).tactics + relation.trust * .2 + Math.random() * 20 > 22 + S.chapter;
    if (success) { affection = 5; trust = 7; S.gold += 35 + S.chapter * 3; S.reputation += 2; }
    else { affection = 1; trust = 2; tension = 6; }
  }
  if (action === "date") { affection = 6; trust = 5; tension = -4; }
  relation.affection = Core.clamp(relation.affection + affection, 0, 100); relation.trust = Core.clamp(relation.trust + trust, 0, 100); relation.tension = Core.clamp(relation.tension + tension, 0, 100);
  const scene = Core.relationScene(name, action, relation.affection);
  if (!relation.scenes.includes(scene.title)) relation.scenes.push(scene.title);
  addAnnal(`${name}: ${scene.title}. Близость +${affection}, доверие +${trust}.`); localSave(); render("relations"); openStoryModal(Core.relationStage(relation).name.toUpperCase(), scene.title, scene.text);
}

function giveGift(name, uid) {
  const relation = S.relations[name], def = Core.RELATIONS[name], item = S.inventory.find(entry => entry.uid === uid), itemDef = Core.itemDef(item);
  if (!relation || !item || itemDef.slot !== "gift") return;
  if (relation.lastActionDay.gift === absoluteDay()) return notify("Сегодня подарок уже был вручён", "bad");
  const preferred = def.preference === item.id, multiplier = preferred ? 1.5 : 1;
  const affection = Math.round((itemDef.relation?.affection || 4) * multiplier), trust = Math.round((itemDef.relation?.trust || 1) * multiplier);
  relation.affection = Core.clamp(relation.affection + affection, 0, 100); relation.trust = Core.clamp(relation.trust + trust, 0, 100);
  item.quantity -= 1; if (item.quantity <= 0) S.inventory = S.inventory.filter(entry => entry.uid !== uid);
  relation.lastActionDay.gift = absoluteDay();
  const scene = Core.relationScene(name, "gift", relation.affection); if (!relation.scenes.includes(scene.title)) relation.scenes.push(scene.title);
  addAnnal(`${name} принимает подарок «${itemDef.name}».`); localSave(); render("relations"); openStoryModal(preferred ? "ИДЕАЛЬНЫЙ ПОДАРОК" : "ЗНАК ВНИМАНИЯ", scene.title, `${scene.text}\n\nБлизость +${affection}, доверие +${trust}.`);
}

function commitRelationship(name) {
  const relation = S.relations[name], def = Core.RELATIONS[name]; if (!relation || relation.affection < 85 || relation.trust < 65 || relation.romance) return;
  if (def.requiresDuel && S.duelResults[def.requiresDuel] !== "victory") return notify("Эта клятва откроется после победы в дуэли", "bad");
  relation.romance = true; relation.affection = 100; relation.tension = 0;
  const scene = Core.relationScene(name, "date", 100); if (!relation.scenes.includes(scene.title)) relation.scenes.push(scene.title);
  addAnnal(`${name}: заключена нерушимая личная клятва.`); S.reputation += 3; localSave(); render("relations"); openStoryModal("НЕРУШИМАЯ СВЯЗЬ", scene.title, scene.text);
}

const ESTATE_BUILDINGS = {
  barracks: { name: "Казармы", desc: "Ускоряют подготовку ветеранов.", glyph: "軍" },
  forge: { name: "Великая кузница", desc: "Укрепляет оружие и доспехи.", glyph: "鍛" },
  granary: { name: "Военный амбар", desc: "Увеличивает запас снабжения при отдыхе.", glyph: "糧" },
  academy: { name: "Академия стратегов", desc: "Даёт разведданные и опыт тактики.", glyph: "策" },
  stables: { name: "Императорские конюшни", desc: "Поддерживают конницу и быстрые марши.", glyph: "騎" },
  gardens: { name: "Сад посольств", desc: "Укрепляет влияние и отношения.", glyph: "縁" }
};

function page_estate() {
  S.flags.buildings = S.flags.buildings || {};
  const estateName = S.estate < 10 ? "Военный двор" : S.estate < 25 ? "Укреплённое поместье" : S.estate < 45 ? "Городская резиденция" : S.estate < 65 ? "Военная столица" : "Владение Великого генерала";
  const cost = 120 + S.estate * 28;
  $("page").innerHTML = `<section class="panel chapter-panel" data-chapter="城"><div class="chapter-copy"><p class="eyebrow">УРОВЕНЬ ВЛАДЕНИЯ ${S.estate}/85</p><h2>${estateName}</h2><p class="lead">Земля снабжает походы, обучает офицеров и превращает военную славу в настоящую власть.</p><div class="bar-label"><span>Развитие владения</span><span>${S.estate}/85</span></div><div class="progress gold"><span style="width:${S.estate / 85 * 100}%"></span></div><div class="button-row" style="margin-top:18px"><button class="game-button primary" onclick="developEstate()" ${S.estate >= 85 ? "disabled" : ""}>${S.estate >= 85 ? "Достигнут предел" : `Развить · ${formatNumber(cost)} 銀`}</button></div></div></section><section class="panel"><div class="panel-title"><div><p class="eyebrow">ПОСТРОЙКИ</p><h2>Военная столица</h2><p>Каждое здание развивается отдельно и даёт постоянные хозяйственные бонусы.</p></div></div><div class="card-grid">${Object.entries(ESTATE_BUILDINGS).map(([id, building]) => {
    const level = Number(S.flags.buildings[id]) || 0, buildingCost = 160 + level * 140;
    return `<article class="game-card"><div class="unit-head"><div class="unit-glyph">${building.glyph}</div><div><h3>${building.name}</h3><p>Уровень ${level}/10</p></div></div><p>${building.desc}</p><div class="progress gold"><span style="width:${level * 10}%"></span></div><button class="game-button" style="width:100%;margin-top:12px" onclick="upgradeBuilding('${id}')" ${level >= 10 ? "disabled" : ""}>${level >= 10 ? "Максимум" : `Улучшить · ${buildingCost} 銀`}</button></article>`;
  }).join("")}</div></section>`;
}

function developEstate() {
  if (S.estate >= 85) return;
  const cost = 120 + S.estate * 28;
  if (S.gold < cost) return notify("Недостаточно серебра", "bad");
  S.gold -= cost; S.estate += 1; S.influence += 2; S.supply += 8; addAnnal(`Владение достигло уровня ${S.estate}.`); localSave(); render("estate"); notify("Владение расширено", "good");
}

function upgradeBuilding(id) {
  const building = ESTATE_BUILDINGS[id]; if (!building) return;
  S.flags.buildings = S.flags.buildings || {};
  const level = Number(S.flags.buildings[id]) || 0, cost = 160 + level * 140;
  if (level >= 10) return;
  if (S.estate < (level + 1) * 3) return notify(`Нужен уровень владения ${(level + 1) * 3}`, "bad");
  if (S.gold < cost) return notify("Недостаточно серебра", "bad");
  S.gold -= cost; S.flags.buildings[id] = level + 1;
  if (id === "granary") S.supply += 30;
  if (id === "academy") { S.intel += 6; gainXP(10); }
  if (id === "gardens") S.influence += 4;
  if (id === "barracks") S.armyMorale = Core.clamp(S.armyMorale + 4, 0, 100);
  addAnnal(`${building.name}: уровень ${level + 1}.`); localSave(); render("estate"); notify(`${building.name} улучшены`, "good");
}

function page_edicts() {
  $("page").innerHTML = `<section class="panel"><div class="panel-title"><div><p class="eyebrow">60 ГОСУДАРСТВЕННЫХ УКАЗОВ</p><h2>Воля полководца</h2><p>Указы дают постоянные стратегические усиления и повышают влияние при дворе.</p></div><span class="tag">Издано ${S.edicts.length}/60</span></div><div class="card-grid">${Core.EDICTS.map(edict => {
    const issued = S.edicts.includes(edict.id);
    return `<article class="game-card"><span class="edition-rank">УКАЗ ${String(edict.id).padStart(2, "0")}</span><h3>${escapeHtml(edict.name)}</h3><p>${escapeHtml(edict.desc)}</p><div class="tag-row"><span class="tag">${formatNumber(edict.cost)} 銀</span><span class="tag">+3 влияния</span></div><button class="game-button ${issued ? "secondary" : ""}" style="width:100%;margin-top:12px" ${issued ? "disabled" : ""} onclick="issueEdict(${edict.id})">${issued ? "Издан" : "Скрепить печатью"}</button></article>`;
  }).join("")}</div></section>`;
}

function issueEdict(id) {
  const edict = Core.EDICTS[id - 1]; if (!edict || S.edicts.includes(id)) return;
  if (S.gold < edict.cost) return notify("Недостаточно серебра", "bad");
  S.gold -= edict.cost; S.edicts.push(id); S.influence += 3;
  if (edict.bonus === "supply") S.supply += 20;
  if (edict.bonus === "income") S.gold += 30;
  if (edict.bonus === "recruits") S.armyMorale = Core.clamp(S.armyMorale + 2, 0, 100);
  addAnnal(`Издан «${edict.name}».`); localSave(); render("edicts"); notify("Указ вступил в силу", "good");
}

function page_annals() {
  const relationScenes = Object.values(S.relations).reduce((sum, relation) => sum + (relation.scenes?.length || 0), 0);
  $("page").innerHTML = `<div class="dashboard-grid"><section class="panel"><div class="panel-title"><div><p class="eyebrow">ЛИЧНАЯ ЛЕТОПИСЬ</p><h2>${escapeHtml(S.name)}</h2><p>Все победы, поражения, встречи и решения сохраняются в хронологическом порядке.</p></div><span class="tag">${S.annals.length} записей</span></div><div class="annals-list">${[...S.annals].reverse().map(row => `<div class="annal-entry">${escapeHtml(row)}</div>`).join("")}</div></section><aside><div class="panel"><h2>Итоги пути</h2><div class="stat-grid"><div class="stat-chip"><b>${S.completedOps.length}</b><small>ОПЕРАЦИЙ</small></div><div class="stat-chip"><b>${S.battleHistory.filter(row => row.result === "victory").length}</b><small>ПОБЕД</small></div><div class="stat-chip"><b>${Object.values(S.duelResults).filter(row => row === "victory").length}</b><small>ДУЭЛЕЙ</small></div><div class="stat-chip"><b>${relationScenes}</b><small>СЦЕН СВЯЗИ</small></div></div></div><div class="panel"><h2>Завершение</h2><p class="muted">Финал определяется решениями 42 глав, репутацией, отношениями, указами и состоянием армии.</p></div></aside></div>`;
}

async function page_profile() {
  const hero = Core.heroStats(S), rank = Core.RANKS[S.rankIndex] || Core.RANKS[0];
  $("page").innerHTML = `<div class="profile-layout"><section class="panel profile-hero"><div class="profile-seal">王</div><div><p class="eyebrow">${escapeHtml(S.home)} · ${escapeHtml(S.origin)}</p><h2>${escapeHtml(S.name)}</h2><p class="gold">${escapeHtml(rank.name)} · уровень ${S.level}</p><p class="muted">Репутация ${S.reputation} · влияние ${S.influence} · владение ${S.estate}/85</p></div></section><section class="panel"><div class="panel-title"><div><p class="eyebrow">ХАРАКТЕРИСТИКИ</p><h2>Личная мощь</h2></div></div><div class="stat-grid"><div class="stat-chip"><b>${hero.attack}</b><small>АТАКА</small></div><div class="stat-chip"><b>${hero.defense}</b><small>ЗАЩИТА</small></div><div class="stat-chip"><b>${hero.maxHp}</b><small>HP</small></div><div class="stat-chip"><b>${hero.precision}%</b><small>ТОЧНОСТЬ</small></div><div class="stat-chip"><b>${hero.tactics}</b><small>ТАКТИКА</small></div><div class="stat-chip"><b>${hero.scout}</b><small>РАЗВЕДКА</small></div><div class="stat-chip"><b>${hero.charisma}</b><small>ХАРИЗМА</small></div><div class="stat-chip"><b>${hero.duelGuard}</b><small>СТОЙКА</small></div></div></section><section class="panel"><div class="panel-title"><div><p class="eyebrow">АККАУНТ</p><h2>${account ? escapeHtml(account.username) : "Гостевая летопись"}</h2></div></div><p class="${isPremium() ? "good" : "muted"}">${isPremium() ? "● Полная версия и облако активны" : account ? "● Демо-аккаунт · облако закрыто" : "● Локальное сохранение без аккаунта"}</p><div class="button-row"><button class="game-button primary" onclick="cloudSave()">Сохранить летопись</button>${account ? `<button class="game-button" onclick="recheckDiscord()">Проверить Discord</button><button class="game-button secondary" onclick="logout()">Выйти</button>` : `<button class="game-button" onclick="openAuth()">Войти</button>`}</div></section><section class="panel"><div class="panel-title"><div><p class="eyebrow">УПРАВЛЕНИЕ</p><h2>Лагерь и игра</h2></div></div><div class="button-row"><button class="game-button" onclick="restAtCamp()">Отдых до следующего дня</button><button class="game-button" onclick="toggleFullscreen()">Полный экран</button><button class="game-button secondary" onclick="localSave();openScreen('settingsScreen')">Настройки</button><button class="game-button secondary" onclick="exitGame()">Главное меню</button></div></section></div>`;
}

function restAtCamp() {
  const hero = Core.heroStats(S), buildings = S.flags.buildings || {};
  S.energy = S.maxEnergy; S.hp = hero.maxHp; S.supply += (buildings.granary || 0) * 3; S.intel += Math.floor((buildings.academy || 0) / 2); S.gold += S.estate > 0 ? Math.floor(S.estate * .8) : 0;
  S.units.forEach(unit => { unit.morale = Core.clamp(unit.morale + 8, 0, 100); });
  advanceDay(); addAnnal("День отдыха восстановил героя и боевой дух армии."); localSave(); render("profile"); notify("Силы восстановлены", "good");
}

Object.assign(window, {
  openScreen, openMainMenu, saveSettings, toggleFullscreen, openAuth, closeAuth, authTab, register, login, logout,
  openPurchase, closePurchase, linkDiscord, recheckDiscord, unlinkDiscord, openLoadScreen, loadSave, deleteSave,
  pickOrigin, newCampaign, startCampaign, continueCampaign, enterGame, exitGame, cloudSave, localSave, render, toggleMobileMenu,
  chapterAction, runOperation, startBattle, setBattleCommand, battleCellClick, battleDefendSelected, endPlayerTurn, retreatBattle, claimBattleResult,
  startDuel, duelAction, finishDuel, abandonDuel,
  recruitUnit, trainUnit, upgradeUnit, cycleFormation, replenishUnit, equipItem, unequipSlot, useItem, upgradeItem, setMarketFilter, buyItem,
  intelAction, selectRelation, relationAction, giveGift, commitRelationship,
  developEstate, upgradeBuilding, issueEdict, restAtCamp,
  closeStoryModal, resolveConfirm,
  page_campaign, page_chronicles, page_battle, page_duels, page_map, page_army, page_inventory, page_market, page_intel, page_relations, page_estate, page_edicts, page_annals, page_profile
});

document.addEventListener("DOMContentLoaded", bootApp);
document.addEventListener("click", event => { if (event.target.closest("button, .game-button")) playUiSound(280); });
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (!$("storyModal").classList.contains("hidden")) closeStoryModal();
  else if (!$("purchaseModal").classList.contains("hidden")) closePurchase();
  else if (!$("authOverlay").classList.contains("hidden")) closeAuth();
  else toggleMobileMenu(false);
});
window.addEventListener("beforeunload", () => { if (S) localSave(); });
window.addEventListener("resize", () => { if (window.innerWidth > 900) toggleMobileMenu(false); });
