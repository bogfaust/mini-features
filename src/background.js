// Префиксы адресов, которые не нужно сохранять для восстановления
const SKIP_PREFIXES = ["chrome://", "chrome-extension://", "about:", "edge://", "devtools://"];

// Максимальный размер стека закрытых вкладок (на каждое окно)
const MAX_STACK = 50;

function shouldSkip(url) {
  if (!url) return true;
  return SKIP_PREFIXES.some((prefix) => url.startsWith(prefix));
}

// Очередь операций: не даёт перезаписать данные при одновременном закрытии нескольких вкладок
let queue = Promise.resolve();
function enqueue(task) {
  queue = queue.then(task).catch((e) => console.error("Queue error:", e));
}

// В Manifest V3 service worker выгружается из памяти, поэтому обычная Map теряется.
// Храним tabId -> url в chrome.storage.session.
async function setTabUrl(tabId, url) {
  const { tabUrls = {} } = await chrome.storage.session.get("tabUrls");
  if (tabUrls[tabId] === url) return;
  tabUrls[tabId] = url;
  await chrome.storage.session.set({ tabUrls });
}

async function takeTabUrl(tabId) {
  const { tabUrls = {} } = await chrome.storage.session.get("tabUrls");
  const url = tabUrls[tabId];
  delete tabUrls[tabId];
  await chrome.storage.session.set({ tabUrls });
  return url;
}

async function isEnabled() {
  const { tabRestoreEnabled } = await chrome.storage.sync.get("tabRestoreEnabled");
  return tabRestoreEnabled !== undefined ? tabRestoreEnabled : true;
}

// Запоминаем адреса уже открытых вкладок (при установке и запуске браузера)
async function seedTabs() {
  const tabs = await chrome.tabs.query({});
  const tabUrls = {};
  for (const tab of tabs) {
    if (tab.url) tabUrls[tab.id] = tab.url;
  }
  await chrome.storage.session.set({ tabUrls });
}

chrome.runtime.onInstalled.addListener(() => enqueue(seedTabs));
chrome.runtime.onStartup.addListener(() => enqueue(seedTabs));

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || (changeInfo.status === "complete" ? tab.url : null);
  if (url) enqueue(() => setTabUrl(tabId, url));
});

// Стеки закрытых вкладок хранятся отдельно для каждого окна: { windowId: [url, ...] }
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  enqueue(async () => {
    const url = await takeTabUrl(tabId);

    // Если закрывается всё окно целиком, его вкладки сохранять не нужно
    if (removeInfo.isWindowClosing) return;
    if (shouldSkip(url) || !(await isEnabled())) return;

    const { stacks = {} } = await chrome.storage.session.get("stacks");
    const stack = stacks[removeInfo.windowId] || [];
    stack.push(url);
    if (stack.length > MAX_STACK) stack.shift();
    stacks[removeInfo.windowId] = stack;
    await chrome.storage.session.set({ stacks });
  });
});

// Окно закрыто: его стек больше не нужен
chrome.windows.onRemoved.addListener((windowId) => {
  enqueue(async () => {
    const { stacks = {} } = await chrome.storage.session.get("stacks");
    if (!(windowId in stacks)) return;
    delete stacks[windowId];
    await chrome.storage.session.set({ stacks });
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "restore") return;

  enqueue(async () => {
    if (!(await isEnabled())) return;

    // Восстанавливаем только то, что было закрыто в текущем (активном) окне
    const win = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });
    const { stacks = {} } = await chrome.storage.session.get("stacks");
    const stack = stacks[win.id] || [];
    if (!stack.length) return;

    const url = stack.pop();
    stacks[win.id] = stack;
    await chrome.storage.session.set({ stacks });
    await chrome.tabs.create({ url, windowId: win.id });
  });
});

// ---------- Звук при заблокированном действии ----------

const OFFSCREEN_URL = 'src/offscreen.html';
let creatingOffscreen = null;

// Создаём offscreen-документ, если его ещё нет (Chrome закрывает его после паузы в воспроизведении)
async function ensureOffscreen() {
  const url = chrome.runtime.getURL(OFFSCREEN_URL);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [url],
  });
  if (contexts.length) return;

  // Если несколько сообщений пришли одновременно, документ создаём только один раз
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Play a sound when a blocked key or button is pressed",
      })
      .finally(() => { creatingOffscreen = null; });
  }
  await creatingOffscreen;
}

async function playBlockSound() {
  const { soundEnabled = true, soundVolume = 30 } =
    await chrome.storage.sync.get(["soundEnabled", "soundVolume"]);
  if (!soundEnabled) return;

  await ensureOffscreen();
  await chrome.runtime.sendMessage({ action: "offscreenPlay", volume: soundVolume });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== "playBlockSound") return;
  playBlockSound().catch((e) => console.error("Sound error:", e));
});
