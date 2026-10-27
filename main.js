// Vico AI desktop: tiến trình chính (cửa sổ, thư mục, terminal, khay hệ thống, cập nhật, công cụ cho Agent)
const { app, BrowserWindow, protocol, net, ipcMain, dialog, shell, nativeTheme, safeStorage, Tray, Menu, globalShortcut, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const { pathToFileURL } = require("url");

const APP_DIR = path.join(__dirname, "app");
const SMOKE = process.argv.includes("--smoke");

// Giao thức app:// nạp giao diện từ thư mục app/ (an toàn hơn file://, localStorage & crypto hoạt động)
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

// Kiểm tra dùng thư mục dữ liệu tạm, không đụng dữ liệu của app thật
if (SMOKE) app.setPath("userData", path.join(os.tmpdir(), "vico-ai-smoke-" + Date.now()));
else if (!app.requestSingleInstanceLock()) app.quit();

/** @type {BrowserWindow} */
let win;
let workspaceRoot = null;          // thư mục người dùng đã mở
let termCwd = os.homedir();        // thư mục hiện tại của terminal
const procs = new Map();           // lệnh đang chạy: id -> ChildProcess
let tray = null;
let quitting = false;              // true khi thoát hẳn (không thu xuống khay)

/* Cài đặt riêng của bản desktop (theo máy, không theo tài khoản) */
const DESKTOP_DEFAULT = { closeToTray: false, globalShortcut: true, openAtLogin: false };
const settingsFile = () => path.join(app.getPath("userData"), "desktop-settings.json");
let desktopSettings = { ...DESKTOP_DEFAULT };
function loadDesktopSettings() {
  try { desktopSettings = { ...DESKTOP_DEFAULT, ...JSON.parse(fs.readFileSync(settingsFile(), "utf8")) }; } catch {}
}
const sendCommand = (cmd) => { if (win && !win.isDestroyed()) win.webContents.send("app:command", cmd); };
function showWindow() {
  if (!win) return createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

const TITLEBAR = {
  light: { color: "#ffffff", symbolColor: "#4b5563" },
  dark: { color: "#212121", symbolColor: "#d1d5db" },
};

function createWindow() {
  const dark = nativeTheme.shouldUseDarkColors;
  win = new BrowserWindow({
    width: 1320, height: 860, minWidth: 900, minHeight: 600,
    title: "Vico AI",
    show: false,
    backgroundColor: dark ? "#212121" : "#ffffff",
    icon: path.join(__dirname, "build", "icon.png"),
    titleBarStyle: "hidden",
    titleBarOverlay: { ...TITLEBAR[dark ? "dark" : "light"], height: 56 },
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: !SMOKE,
      spellcheck: false,
      plugins: true, // trình xem PDF có sẵn của Chromium (xem file PDF đính kèm)
    },
  });
  win.removeMenu();
  win.loadURL("app://vico/index.html" + (SMOKE ? "?smoke=1" : "")); // smoke: không tự phát intro
  if (!SMOKE) win.once("ready-to-show", () => win.show());

  // Link ngoài mở bằng trình duyệt mặc định, không mở cửa sổ mới trong app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    // Điều khoản / Chính sách: mở bản mới nhất trên web Vico bằng trình duyệt
    const legal = /^app:\/\/[^/]+\/(terms|privacy)\.html(#[\w-]*)?$/.exec(url);
    if (legal) shell.openExternal(`https://vico.kiyo.vn/${legal[1]}${legal[2] || ""}`);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("app://")) { e.preventDefault(); if (/^https?:\/\//.test(url)) shell.openExternal(url); }
  });
  // Tải file AI gửi: hỏi nơi lưu, mặc định vào thư mục Downloads
  win.webContents.session.on("will-download", (_e, item) => {
    item.setSaveDialogOptions({
      title: "Lưu file",
      defaultPath: path.join(app.getPath("downloads"), item.getFilename()),
    });
  });
  // Thu xuống khay thay vì thoát (bật trong Cài đặt > Bản desktop)
  win.on("close", (e) => {
    if (quitting || SMOKE || !desktopSettings.closeToTray || !tray) return;
    e.preventDefault();
    win.hide();
    if (!desktopSettings.trayHintShown) {
      tray.displayBalloon({ title: "Vico AI vẫn đang chạy", content: "Bấm biểu tượng Vico AI ở khay hệ thống để mở lại, hoặc Ctrl + Shift + Space." });
      desktopSettings.trayHintShown = true;
      saveDesktopSettings();
    }
  });
  win.on("closed", () => { killAll(); win = null; });
}

app.on("second-instance", showWindow);
app.on("before-quit", () => (quitting = true));

/* ---------- Khay hệ thống & phím tắt toàn cục ---------- */
function setupTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "build", "tray.png")).resize({ width: 16, height: 16, quality: "best" });
  tray = new Tray(icon);
  tray.setToolTip("Vico AI");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Mở Vico AI", click: showWindow },
    { label: "Chat mới", click: () => { showWindow(); sendCommand("new-chat"); } },
    { label: "Kiểm tra cập nhật", click: () => { showWindow(); checkForUpdates(true); } },
    { type: "separator" },
    { label: "Thoát", click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on("click", () => (win && win.isVisible() && win.isFocused() ? win.hide() : showWindow()));
}
let shortcutError = "";
function applyShortcut() {
  globalShortcut.unregisterAll();
  shortcutError = "";
  if (!desktopSettings.globalShortcut) return;
  const ok = globalShortcut.register("CommandOrControl+Shift+Space", () => {
    if (win && win.isVisible() && win.isFocused()) return win.hide();
    showWindow();
    sendCommand("focus-input");
  });
  if (!ok) shortcutError = "Phím tắt đang được ứng dụng khác dùng";
}
function applyLoginItem() {
  if (!app.isPackaged) return; // chỉ áp dụng cho bản đã cài
  app.setLoginItemSettings({ openAtLogin: !!desktopSettings.openAtLogin });
}
function saveDesktopSettings() {
  try { fs.writeFileSync(settingsFile(), JSON.stringify(desktopSettings)); } catch {}
}
ipcMain.handle("desktop:settings", () => ({ ...desktopSettings, shortcutError, packaged: app.isPackaged }));
ipcMain.handle("desktop:set", (_e, key, value) => {
  if (!(key in DESKTOP_DEFAULT)) throw new Error("Cài đặt không hợp lệ");
  desktopSettings[key] = !!value;
  saveDesktopSettings();
  if (key === "globalShortcut") applyShortcut();
  if (key === "openAtLogin") applyLoginItem();
  return { ...desktopSettings, shortcutError, packaged: app.isPackaged };
});
app.on("will-quit", () => globalShortcut.unregisterAll());

/* ---------- Tự cập nhật (electron-updater) ----------
   Địa chỉ máy chủ cập nhật đặt ở "vicoUpdateUrl" trong package.json (để trống = chưa bật).
   Máy chủ chỉ cần chứa latest.yml + file cài đặt do "npm run dist" tạo ra. */
const UPDATE_URL = require("./package.json").vicoUpdateUrl || "";
let updater = null;
const sendUpdate = (status) => { if (win && !win.isDestroyed()) win.webContents.send("update:status", status); };
function setupUpdater() {
  if (!UPDATE_URL || !app.isPackaged) return;
  ({ autoUpdater: updater } = require("electron-updater"));
  updater.setFeedURL({ provider: "generic", url: UPDATE_URL });
  updater.autoDownload = true;
  updater.on("checking-for-update", () => sendUpdate({ state: "checking" }));
  updater.on("update-available", (i) => sendUpdate({ state: "available", version: i.version }));
  updater.on("update-not-available", () => sendUpdate({ state: "latest" }));
  updater.on("download-progress", (p) => sendUpdate({ state: "downloading", percent: Math.round(p.percent) }));
  updater.on("update-downloaded", (i) => sendUpdate({ state: "ready", version: i.version }));
  updater.on("error", (err) => sendUpdate({ state: "error", message: err.message }));
  setTimeout(() => updater.checkForUpdates().catch(() => {}), 10000); // tự kiểm tra sau khi mở 10 giây
}
async function checkForUpdates(manual) {
  if (!UPDATE_URL) { if (manual) sendUpdate({ state: "off" }); return { state: "off" }; }
  if (!app.isPackaged || !updater) { if (manual) sendUpdate({ state: "dev" }); return { state: "dev" }; }
  try { await updater.checkForUpdates(); return { state: "checking" }; }
  catch (err) { sendUpdate({ state: "error", message: err.message }); return { state: "error", message: err.message }; }
}
ipcMain.handle("update:check", () => checkForUpdates(true));
ipcMain.handle("update:install", () => { if (updater) { quitting = true; updater.quitAndInstall(); } });

app.whenReady().then(() => {
  protocol.handle("app", (req) => {
    const { host, pathname } = new URL(req.url);
    // Trang HTML AI gửi: CSP riêng để chạy được script, khung xem vẫn sandbox nên không đụng được dữ liệu app
    if (host === "preview") {
      const page = previews.get(pathname.slice(1));
      if (page == null) return new Response("Không còn bản xem trước này", { status: 404 });
      return new Response(page, { headers: {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'",
      } });
    }
    const file = path.normalize(path.join(APP_DIR, decodeURIComponent(pathname)));
    if (!file.startsWith(APP_DIR)) return new Response("Forbidden", { status: 403 });
    // Smoke kiểm tra giao diện ở chế độ demo (không tạo tài khoản thật trên máy chủ), trừ khi VICO_SMOKE_SERVER=1
    if (SMOKE && !process.env.VICO_SMOKE_SERVER && path.basename(file) === "config.js") {
      const code = fs.readFileSync(file, "utf8").replace(/(VICO_CONFIG = \{\s*apiUrl: )"[^"]*"/, '$1""');
      return new Response(code, { headers: { "content-type": "text/javascript; charset=utf-8" } });
    }
    return net.fetch(pathToFileURL(file).toString());
  });
  loadDesktopSettings();
  createWindow();
  if (SMOKE) return runSmoke();
  setupTray();
  applyShortcut();
  setupUpdater();
});
app.on("window-all-closed", () => { if (!tray || quitting || !desktopSettings.closeToTray) app.quit(); });

/* ---------- Cửa sổ ---------- */
ipcMain.handle("app:info", () => ({ version: app.getVersion(), platform: process.platform, home: os.homedir() }));
const previews = new Map();         // id -> HTML đang xem trước (giữ 5 bản gần nhất)
ipcMain.handle("preview:set", (_e, html) => {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  previews.set(id, String(html || ""));
  while (previews.size > 5) previews.delete(previews.keys().next().value);
  return `app://preview/${id}`;
});
ipcMain.handle("window:theme", (_e, theme) => {
  try { win.setTitleBarOverlay(TITLEBAR[theme === "dark" ? "dark" : "light"]); } catch {}
});

/* ---------- Thư mục ---------- */
// Chỉ cho đọc file bên trong thư mục người dùng đã chọn
function insideRoot(rel = "") {
  if (!workspaceRoot) throw new Error("Chưa mở thư mục nào");
  const full = path.resolve(workspaceRoot, rel);
  if (full !== workspaceRoot && !full.startsWith(workspaceRoot + path.sep)) throw new Error("Đường dẫn nằm ngoài thư mục đã mở");
  return full;
}
ipcMain.handle("folder:open", async () => {
  if (SMOKE) { // kiểm tra tự động: dùng thư mục tạm có sẵn 1 file, không mở hộp thoại
    workspaceRoot = termCwd = fs.mkdtempSync(path.join(os.tmpdir(), "vico-smoke-ws-"));
    fs.writeFileSync(path.join(workspaceRoot, "readme.txt"), "xin chào");
    return { root: workspaceRoot, name: path.basename(workspaceRoot) };
  }
  const r = await dialog.showOpenDialog(win, { title: "Chọn thư mục cho Vico AI", properties: ["openDirectory"] });
  if (r.canceled || !r.filePaths[0]) return null;
  workspaceRoot = path.resolve(r.filePaths[0]);
  termCwd = workspaceRoot;
  return { root: workspaceRoot, name: path.basename(workspaceRoot) || workspaceRoot };
});
// Chọn thư mục cho dự án (chỉ hỏi, chưa mở)
ipcMain.handle("folder:pick", async () => {
  if (SMOKE) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vico-smoke-proj-"));
    return { root: dir, name: path.basename(dir) };
  }
  const r = await dialog.showOpenDialog(win, { title: "Chọn thư mục lưu dự án", properties: ["openDirectory", "createDirectory"] });
  if (r.canceled || !r.filePaths[0]) return null;
  const root = path.resolve(r.filePaths[0]);
  return { root, name: path.basename(root) || root };
});
// Mở thư mục đã gắn với dự án (người dùng đã chọn trước đó bằng hộp thoại)
ipcMain.handle("folder:set", async (_e, root) => {
  root = path.resolve(String(root || ""));
  let st;
  try { st = await fs.promises.stat(root); } catch { throw new Error(`Không tìm thấy thư mục ${root}`); }
  if (!st.isDirectory()) throw new Error(`${root} không phải thư mục`);
  workspaceRoot = termCwd = root;
  return { root, name: path.basename(root) || root };
});
ipcMain.handle("folder:list", async (_e, rel = "") => {
  const dir = insideRoot(rel);
  const items = await fs.promises.readdir(dir, { withFileTypes: true });
  return items
    .filter((d) => d.name !== ".git")
    .map((d) => ({ name: d.name, dir: d.isDirectory(), rel: path.relative(workspaceRoot, path.join(dir, d.name)) }))
    .sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
});
ipcMain.handle("folder:read", async (_e, rel) => {
  const file = insideRoot(rel);
  const st = await fs.promises.stat(file);
  const MAX = 300 * 1024;
  const buf = Buffer.alloc(Math.min(st.size, MAX));
  const fh = await fs.promises.open(file, "r");
  try { await fh.read(buf, 0, buf.length, 0); } finally { await fh.close(); }
  if (buf.includes(0)) return { binary: true, size: st.size };
  return { content: buf.toString("utf8"), size: st.size, truncated: st.size > MAX };
});
ipcMain.handle("folder:reveal", (_e, rel = "") => shell.openPath(insideRoot(rel)));

/* ---------- Model chạy trên máy (mục Finetune): xem local-ai/manager.js ---------- */
require("./local-ai/manager").register({ ipcMain, app, getWindow: () => win, smoke: SMOKE });

/* ---------- API key (mã hoá bằng safeStorage của hệ điều hành) & gọi model ---------- */
const PROVIDERS = { openai: require("./providers/openai"), anthropic: require("./providers/anthropic") };
const keysFile = () => path.join(app.getPath("userData"), "api-keys.json");
function readKeys() {
  try { return JSON.parse(fs.readFileSync(keysFile(), "utf8")); } catch { return {}; }
}
function getKey(provider) {
  const enc = readKeys()[provider];
  if (!enc) return null;
  try { return safeStorage.decryptString(Buffer.from(enc, "base64")); } catch { return null; }
}
function checkProvider(provider) {
  if (!PROVIDERS[provider]) throw new Error("Nhà cung cấp không hợp lệ");
}
ipcMain.handle("keys:status", () => {
  const k = readKeys();
  return Object.fromEntries(Object.keys(PROVIDERS).map((p) => [p, !!k[p]]));
});
ipcMain.handle("keys:save", async (_e, provider, key) => {
  checkProvider(provider);
  key = String(key || "").trim();
  if (!key) throw new Error("Hãy nhập API key");
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Máy không hỗ trợ mã hoá để lưu key an toàn");
  await PROVIDERS[provider].testKey(key); // chỉ lưu key dùng được
  const k = readKeys();
  k[provider] = safeStorage.encryptString(key).toString("base64");
  fs.writeFileSync(keysFile(), JSON.stringify(k));
  return true;
});
ipcMain.handle("keys:remove", (_e, provider) => {
  checkProvider(provider);
  const k = readKeys();
  delete k[provider];
  fs.writeFileSync(keysFile(), JSON.stringify(k));
  return true;
});
const aiRequests = new Map();      // yêu cầu đang chạy: reqId -> AbortController (để nút Dừng huỷ được)
ipcMain.handle("ai:chat", async (_e, { provider, model, system, prompt, effort, reqId }) => {
  checkProvider(provider);
  const apiKey = getKey(provider);
  if (!apiKey) throw new Error(`Chưa có API key ${provider === "openai" ? "OpenAI" : "Anthropic"}. Mở Group AI để nhập key.`);
  const ctrl = new AbortController();
  if (reqId) aiRequests.set(reqId, ctrl);
  try {
    return await PROVIDERS[provider].chat({ apiKey, model, system, prompt, effort, signal: ctrl.signal });
  } finally {
    if (reqId) aiRequests.delete(reqId);
  }
});
ipcMain.handle("ai:abort", (_e, reqId) => { const c = aiRequests.get(reqId); if (c) c.abort(); });

/* ---------- Terminal ---------- */
let nextId = 1;
const send = (ch, data) => { if (win && !win.isDestroyed()) win.webContents.send(ch, data); };
ipcMain.handle("term:cwd", () => termCwd);
ipcMain.handle("term:run", (_e, command) => {
  const cmd = String(command || "").trim();
  if (!cmd) return null;
  // "cd" đổi thư mục hiện tại cho các lệnh sau (mỗi lệnh chạy một tiến trình riêng)
  const cd = cmd.match(/^(?:cd|chdir|set-location|sl)\s+(.+)$/i);
  if (cd) {
    const target = path.resolve(termCwd, cd[1].trim().replace(/^["']|["']$/g, "").replace(/^~(?=$|[\\/])/, os.homedir()));
    if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) return { error: `Không tìm thấy thư mục: ${target}` };
    termCwd = target;
    return { cwd: termCwd };
  }
  const id = nextId++;
  const child = spawnShell(cmd, termCwd);
  procs.set(id, child);
  child.stdout.on("data", (d) => send("term:data", { id, data: d.toString("utf8") }));
  child.stderr.on("data", (d) => send("term:data", { id, data: d.toString("utf8"), err: true }));
  child.on("error", (err) => send("term:data", { id, data: err.message + "\n", err: true }));
  child.on("close", (code) => { procs.delete(id); send("term:exit", { id, code }); });
  return { id, cwd: termCwd };
});
/** Chạy một lệnh PowerShell (Windows) hoặc shell mặc định, xuất ra UTF-8. */
function spawnShell(cmd, cwd) {
  return process.platform === "win32"
    ? spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command",
        "[Console]::OutputEncoding=[Text.Encoding]::UTF8; $OutputEncoding=[Text.Encoding]::UTF8; " + cmd],
        { cwd, windowsHide: true, env: process.env })
    : spawn(process.env.SHELL || "/bin/bash", ["-lc", cmd], { cwd, env: process.env });
}
function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
  else child.kill("SIGTERM");
}
ipcMain.handle("term:kill", (_e, id) => killTree(procs.get(id)));
function killAll() {
  for (const c of [...procs.values(), ...agentProcs.values()]) killTree(c);
  procs.clear();
  agentProcs.clear();
}
app.on("before-quit", killAll);

/* ---------- Công cụ cho Agent ----------
   Chỉ làm việc trong thư mục người dùng đã mở. Giao diện luôn hỏi người dùng trước khi ghi file / chạy lệnh.
   Mỗi lần ghi file lưu một điểm khôi phục (nội dung cũ, hoặc "chưa có file") để Hoàn tác. */
const agentProcs = new Map();      // reqId -> ChildProcess (lệnh Agent đang chạy)
const cpDir = () => path.join(app.getPath("userData"), "checkpoints");
const CP_MAX = 20 * 1024 * 1024;
async function makeCheckpoint(full, rel) {
  let existed = false, data = null;
  try {
    const st = await fs.promises.stat(full);
    if (st.isDirectory()) throw new Error("Đường dẫn là một thư mục, không ghi đè được");
    if (st.size > CP_MAX) throw new Error("File lớn hơn 20 MB, không tạo được điểm khôi phục nên không ghi");
    existed = true;
    data = (await fs.promises.readFile(full)).toString("base64");
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  await fs.promises.mkdir(cpDir(), { recursive: true });
  await fs.promises.writeFile(path.join(cpDir(), id + ".json"), JSON.stringify({ id, full, rel, existed, data, t: Date.now() }));
  // Giữ 200 điểm khôi phục gần nhất (tên bắt đầu bằng thời gian nên sắp xếp được)
  const all = (await fs.promises.readdir(cpDir())).filter((f) => f.endsWith(".json")).sort();
  for (const f of all.slice(0, -200)) await fs.promises.rm(path.join(cpDir(), f), { force: true });
  return { id, existed };
}
ipcMain.handle("agent:write", async (_e, rel, content) => {
  rel = String(rel || "");
  const full = insideRoot(rel);
  if (full === workspaceRoot) throw new Error("Cần đường dẫn tới một file");
  const text = String(content ?? "");
  const cp = await makeCheckpoint(full, rel);
  await fs.promises.mkdir(path.dirname(full), { recursive: true });
  await fs.promises.writeFile(full, text, "utf8");
  return { checkpoint: cp.id, created: !cp.existed, bytes: Buffer.byteLength(text) };
});
ipcMain.handle("agent:undo", async (_e, id) => {
  if (!/^[a-z0-9]+$/.test(String(id))) throw new Error("Điểm khôi phục không hợp lệ");
  const file = path.join(cpDir(), id + ".json");
  let cp;
  try { cp = JSON.parse(await fs.promises.readFile(file, "utf8")); } catch { throw new Error("Không còn điểm khôi phục này"); }
  if (cp.existed) await fs.promises.writeFile(cp.full, Buffer.from(cp.data, "base64"));
  else await fs.promises.rm(cp.full, { force: true });
  await fs.promises.rm(file, { force: true });
  return { restored: cp.existed, path: cp.rel };
});
ipcMain.handle("agent:run", (_e, command, reqId) => new Promise((resolve) => {
  if (!workspaceRoot) return resolve({ error: "Chưa mở thư mục nào" });
  const cmd = String(command || "").trim();
  if (!cmd) return resolve({ error: "Lệnh trống" });
  const LIMIT = 100 * 1024, TIMEOUT = 120000;
  let stdout = "", stderr = "", timedOut = false;
  const cap = (s) => (s.length > LIMIT ? s.slice(0, LIMIT) + "\n… (kết quả quá dài, đã cắt)" : s);
  const child = spawnShell(cmd, workspaceRoot);
  if (reqId) agentProcs.set(reqId, child);
  const timer = setTimeout(() => { timedOut = true; killTree(child); }, TIMEOUT);
  child.stdout.on("data", (d) => { if (stdout.length <= LIMIT) stdout = cap(stdout + d.toString("utf8")); });
  child.stderr.on("data", (d) => { if (stderr.length <= LIMIT) stderr = cap(stderr + d.toString("utf8")); });
  child.on("error", (err) => { stderr += err.message; });
  child.on("close", (code) => {
    clearTimeout(timer);
    if (reqId) agentProcs.delete(reqId);
    const nl = (t) => t.replace(/\r\n?/g, "\n");
    resolve({ code, stdout: nl(stdout), stderr: nl(stderr), timedOut });
  });
}));
ipcMain.handle("agent:kill", (_e, reqId) => killTree(agentProcs.get(reqId)));

/* ---------- Kiểm tra nhanh (npm run smoke): chạy ẩn, chụp màn hình, tự thoát ---------- */
async function runSmoke() {
  const out = process.env.VICO_SMOKE_OUT || path.join(__dirname, "smoke"); // bản đã đóng gói: __dirname nằm trong app.asar
  fs.mkdirSync(out, { recursive: true });
  const wc = win.webContents;
  const errors = [];
  wc.on("console-message", (e, lvl, msg) => {
    const level = e.level ?? lvl, message = e.message ?? msg;
    if (level === "error" || level === 3) errors.push(message);
  });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // Cửa sổ ẩn vẽ chậm một nhịp: chụp mồi một lần rồi mới chụp thật
  const shot = async (name) => { await wait(500); await wc.capturePage(); await wait(500); fs.writeFileSync(path.join(out, name), (await wc.capturePage()).toPNG()); };
  const run = (label, fn) => wc.executeJavaScript(`(${fn})()`).catch((e) => { errors.push(label + ": " + e.message); return null; });
  await new Promise((r) => wc.once("did-finish-load", r));
  await wait(1500);
  const result = {};
  if (process.env.VICO_SMOKE_ONLY === "intro") {
    win.showInactive(); await wait(800);
    await run("ciOpen", `() => window.VicoChatIntro.open()`);
    for (const [t, name] of [[2600, "ci-1-hero.png"], [9000, "ci-2-chat.png"], [16500, "ci-3-code.png"], [24500, "ci-4-research.png"], [33000, "ci-5-group.png"], [41000, "ci-6-cta.png"]]) {
      await wait(t - (result._t || 0)); result._t = t;
      fs.writeFileSync(path.join(out, name), (await wc.capturePage()).toPNG());
    }
    result.chatIntro = await run("ci", `async () => ({ scene: (document.querySelector(".ci-scene.on") || {}).dataset?.scene, aiText: (document.querySelector(".ci-ai") || {}).innerText, sources: document.querySelectorAll(".ci-sources li.done").length, group: document.querySelectorAll(".ci-gmsg").length })`);
    await run("ciStart", `() => document.querySelector("[data-start]").click()`);
    await wait(600);
    result.chatIntro.closed = await run("ciClosed", `() => !document.querySelector(".ci-overlay") && localStorage.getItem("vico_chat_intro_seen") === "1"`);
    await run("ciApp", `() => document.querySelector("#toggleSidebar").click()`); await wait(500);
    fs.writeFileSync(path.join(out, "ci-7-app.png"), (await wc.capturePage()).toPNG());
    fs.writeFileSync(path.join(out, "result.json"), JSON.stringify({ result, errors }, null, 2));
    return app.quit();
  }
  if (process.env.VICO_SMOKE_ONLY === "grouptag") {
    await run("seen", `async () => { localStorage.setItem("vico_group_intro_seen", "1"); user = await VicoAuth.signUp({ username: "smoketag", email: "smoketag@smoke.test", password: "matkhau-dai-123", consent: true }); onAuthChanged(); }`);
    result.groupTag = (await run("groupTag", groupTagChecks.toString())) || {};
    result.groupChain = (await run("groupChain", groupChainChecks.toString())) || {};
    fs.writeFileSync(path.join(out, "result.json"), JSON.stringify({ result, errors }, null, 2));
    return app.quit();
  }
  // Giới thiệu Group AI: lần đầu bấm Group AI (cửa sổ phải hiện thì requestAnimationFrame mới chạy)
  win.showInactive();
  await wait(500);
  await run("introOpen", `() => { document.querySelector("#groupBtn").click(); }`);
  for (const [t, name] of [[3200, "intro-1-picker.png"], [9000, "intro-2-members.png"], [17000, "intro-3-typing.png"], [30000, "intro-4-plan.png"], [45000, "intro-5-research.png"], [60000, "intro-6-code.png"], [75000, "intro-7-review.png"]]) {
    await wait(t - (result._introT || 0)); result._introT = t;
    fs.writeFileSync(path.join(out, name), (await wc.capturePage()).toPNG());
  }
  result.intro = await run("intro", `async () => {
    const q = (s) => document.querySelector(s), w = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 160 && q("#giEnd") && q("#giEnd").hidden; i++) await w(500);
    const r = { members: [...document.querySelectorAll(".gi-member b")].map((b) => b.textContent), userMsg: (q(".gi-user") || {}).textContent,
      bots: [...document.querySelectorAll(".gi-msg.bot .gi-who b")].map((b) => b.textContent), preview: !!q(".gi-preview"), end: q("#giEnd") && !q("#giEnd").hidden };
    q("#giStart").click(); await w(600);
    r.setupOpened = !q("#gsModal").hidden; r.seen = localStorage.getItem("vico_group_intro_seen") === "1";
    q("#gsModal").hidden = true;
    return r;
  }`);
  fs.writeFileSync(path.join(out, "intro-8-end.png"), (await wc.capturePage()).toPNG());
  delete result._introT;
  win.hide();
  Object.assign(result, (await run("checks", smokeChecks.toString())) || {});
  await shot("window.png"); // đoạn chat họp bàn của "Hội đồng phản biện"
  result.agent = (await run("agent", agentChecks.toString())) || {};
  await shot("agent.png");
  result.settings = (await run("settings", settingsChecks.toString())) || {};
  await shot("settings.png");
  await run("closeSettings", `() => { document.querySelector("#settingsModal").hidden = true; }`);
  result.codePanel = (await run("codePanel", codePanelChecks.toString())) || {};
  await shot("codepanel.png");
  result.projectFolder = (await run("projectFolder", projectFolderChecks.toString())) || {};
  await shot("projectfolder.png");
  result.finetune = (await run("finetune", finetuneChecks.toString())) || {};
  await shot("localchat.png");
  await run("ftPage", `async () => { document.querySelector("#finetuneBtn").click(); await new Promise((r) => setTimeout(r, 600)); document.querySelector("#ftPage").scrollTop = 0; }`);
  await shot("finetune.png");
  await run("ftScroll", `async () => { const p = document.querySelector("#ftPage"); p.scrollTop = document.querySelector("#ftAll").offsetTop - 80; await new Promise((r) => setTimeout(r, 300)); }`);
  await shot("finetune-all.png");
  result.groupLocal = (await run("groupLocal", groupLocalChecks.toString())) || {};
  result.groupNav = (await run("groupNav", groupNavChecks.toString())) || {};
  await shot("groupnav.png");
  await run("groupNavDone", `() => { document.querySelector("#toggleSidebar").click(); const x = document.querySelector("#groupChip [data-exit]"); if (x) x.click(); const s = document.getElementById("noAnim"); if (s) s.remove(); }`);
  result.groupTag = (await run("groupTag", groupTagChecks.toString())) || {};
  result.groupChain = (await run("groupChain", groupChainChecks.toString())) || {};
  result.cloud = (await run("cloud", cloudChecks.toString())) || {};
  await shot("cloud.png");
  // Màn tạo nhóm (các mẫu), bảng chọn model (mở sẵn ô nhập key OpenAI) và màn thiết lập AI
  await run("templates", `async () => {
    const q = (s) => document.querySelector(s), w = (ms) => new Promise((r) => setTimeout(r, ms));
    q("#groupBtn").click(); await w(200); q("#gsNew").click(); await w(300);
  }`);
  await shot("templates.png");
  await run("picker", `async () => {
    const q = (s) => document.querySelector(s), w = (ms) => new Promise((r) => setTimeout(r, ms));
    q("#gsAdd").click(); await w(200); q('[data-key="openai"]').click(); await w(200);
  }`);
  await shot("picker.png");
  result.memberView = await run("member", `async () => {
    const q = (s) => document.querySelector(s), w = (ms) => new Promise((r) => setTimeout(r, ms));
    q('[data-model="vico-lite-2.6"]').click(); await w(200);
    q('[data-role="Marketing"]').click(); q('[data-prefix="!"]').click(); await w(100);
    return q('#gsTitle').textContent + ' | ' + q('#gsPreview').textContent;
  }`);
  await shot("member.png");
  fs.writeFileSync(path.join(out, "result.json"), JSON.stringify({ result, errors }, null, 2));
  app.quit();
}
async function smokeChecks() {
  const q = (s) => document.querySelector(s), qc = (s) => { const e = document.querySelector(s); if (!e) throw new Error("không thấy " + s); return e; }, qa = (s) => [...document.querySelectorAll(s)], wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const NL = String.fromCharCode(10);
  const clean = (e) => String(e.message).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
  const idle = async () => { await wait(300); for (let i = 0; i < 200 && busy; i++) await wait(250); };
  const heads = () => qa(".msg.bot.agent .agent-head").map((e) => e.textContent);
  const r = {
    desktop: document.documentElement.classList.contains("is-desktop"),
    hasApi: !!window.vicoDesktop,
    downloadHidden: getComputedStyle(q("#desktopBtn")).display === "none",
    libs: { hljs: !!window.hljs, katex: !!window.katex, features: typeof openSettings === "function", db: typeof VicoDB === "object" },
  };
  // Terminal: chạy lệnh thật, kiểm tra tiếng Việt hiển thị đúng
  q("#termInput").value = 'Write-Output "xin chào Vico"';
  q("#termForm").requestSubmit();
  for (let i = 0; i < 40 && !q("#termOut").textContent.includes("xin chào Vico" + NL); i++) await wait(250);
  r.terminal = q("#termOut").textContent.includes("xin chào Vico" + NL);
  // Tài khoản thử
  user = await VicoAuth.signUp({ username: "smoke_" + Date.now().toString(36), email: Date.now() + "@smoke.test", password: "Smoke-" + Math.random().toString(36).slice(2) });
  onAuthChanged();
  const md = renderMarkdown("$x^2$" + NL + NL + "```js" + NL + "const a = 1" + NL + "```");
  r.markdown = md.includes("katex") && md.includes("hljs-keyword");

  // Group AI "Lần lượt": mẫu Team phát triển -> Lưu & bắt đầu
  qc("#groupBtn").click(); await wait(300);
  r.setupOpen = !q("#gsModal").hidden;
  r.templates = qa(".gs-tpl b").map((e) => e.textContent);
  qc('[data-tpl="dev"]').click(); await wait(100);
  r.costLine = (q(".gs-cost") || {}).textContent;
  qc("#gsSaveStart").click(); await wait(400);
  r.groupChip = q("#groupChip").textContent.replace(/\s+/g, " ").trim();
  r.sendTitle = q("#sendBtn").title;
  // Gọi riêng @dev: @dev phải trả lời đầu tiên, các AI khác làm theo
  sendMessage("@dev sửa lỗi nút đặt bàn giúp mình");
  await idle();
  r.agents = heads();
  r.credits = q("#creditTotal").textContent;
  r.creditNotes = [...new Set(VicoAuth.history().filter((l) => l.kind === "spend").map((l) => l.note))];
  r.actions = qa(".msg.bot.agent .msg-actions .ma").length > 0;
  // Xuất biên bản (chặn hộp thoại lưu file, chỉ lấy nội dung)
  let exported = null;
  const realDownload = downloadFile;
  downloadFile = (f) => (exported = f);
  qc("#groupChip .gc-export").click();
  downloadFile = realDownload;
  r.minutes = exported && { name: exported.name, title: exported.content.split(NL)[0], members: exported.content.includes("@dev: Lập trình") };
  // Dừng giữa chừng: nút gửi thành nút Dừng, dừng xong không còn bận
  sendMessage("viết kế hoạch ra mắt sản phẩm");
  for (let i = 0; i < 60 && !q("#messages .stream-caret"); i++) await wait(100);
  r.stopButton = q("#sendBtn").classList.contains("stop");
  const before = current().messages.length;
  stopGenerating();
  await idle();
  r.afterStop = { busy, added: current().messages.length - before, stoppedKept: current().messages.some((m) => m.stopped) };
  // API key sai phải bị từ chối và không được lưu
  for (const p of ["openai", "anthropic"]) {
    try { await window.vicoDesktop.saveKey(p, p === "openai" ? "sk-invalid-smoke-test" : "sk-ant-invalid-smoke-test"); r["key_" + p] = "ĐÃ LƯU (sai!)"; }
    catch (e) { r["key_" + p] = clean(e); }
  }
  r.keyStatus = await window.vicoDesktop.keyStatus();
  // Gợi ý cách gọi khi gõ "@d"
  const inp = q("#input");
  inp.value = "@d"; inp.setSelectionRange(2, 2); inp.dispatchEvent(new Event("input"));
  await wait(50);
  r.mentionBox = !q(".mention-box").hidden && q(".mention-box").textContent.includes("@dev");
  inp.value = ""; inp.dispatchEvent(new Event("input"));

  // Chat thường: AI gửi file -> ô file; xem trước HTML qua app://preview, script trong trang chạy được
  qc("#groupChip [data-exit]").click(); await wait(200);
  sendMessage("tạo giúp mình trang web");
  for (let i = 0; i < 60 && !q(".file-tile"); i++) await wait(250);
  await idle();
  r.fileTiles = qa(".file-tile .file-name").map((e) => e.textContent);
  // Bản desktop: bấm ô file mở panel Code, "Xem trước" trong panel mở cửa sổ xem trang
  qc(".file-tile .file-open").click(); await wait(200);
  r.tileOpensPanel = q("#workspace").dataset.tab === "code" && ((q(".cp-tab") || {}).textContent || "").includes("index.html") && q("#fileModal").hidden;
  qc('[data-cp="preview"]').click(); await wait(200);
  qc('#fvTabs [data-tab="preview"]').click();
  for (let i = 0; i < 20 && !q("#fvFrame").src; i++) await wait(100);
  r.filePreview = q("#fvFrame").src.startsWith("app://preview/") && !q("#fvFrame").hasAttribute("srcdoc");
  const seen = [];
  const got = new Promise((res) => {
    const h = (e) => { seen.push(String(e.data).slice(0, 40)); if (e.data === "vico-script-ok") { removeEventListener("message", h); res(true); } };
    addEventListener("message", h);
    setTimeout(() => res(false), 6000);
  });
  await wait(300); // để bản xem trước của file nạp xong trước khi thay bằng trang thử script
  q("#fvFrame").src = await window.vicoDesktop.previewUrl('<!doctype html><script>parent.postMessage("vico-script-ok", "*")</script>');
  r.previewScript = await got;
  if (!r.previewScript) r.previewDebug = { src: q("#fvFrame").src, hidden: q("#fvFrame").hidden, seen };
  qc("#fileModal [data-close]").click();

  // Group AI "Họp bàn": Hội đồng phản biện 2 vòng -> 4 + 4 lượt + tổng kết
  qc("#groupBtn").click(); await wait(300);
  qc("#gsNew").click(); await wait(200);
  qc('[data-tpl="council"]').click(); await wait(100);
  qc("#gsSaveStart").click(); await wait(400);
  sendMessage("có nên mở quán cà phê gần trường học không?");
  await idle();
  const saved = current().messages.filter((m) => m.agentInfo);
  r.meeting = {
    turns: heads().length,
    dividers: qa(".round-div").map((e) => e.textContent),
    summaryBy: saved.length ? saved[saved.length - 1].agentInfo.handle + (saved[saved.length - 1].summary ? " (tổng kết)" : "") : null,
  };
  // Mở lại đoạn chat: vạch chia và thanh thao tác vẫn đúng
  openChat(current().id); await wait(200);
  r.meetingReload = { dividers: qa(".round-div").length, actionsMatch: qa("#messages > .msg").length === current().messages.length };
  return r;
}
async function agentChecks() {
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)], wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, ms = 15000) => { for (let t = 0; t < ms && !fn(); t += 100) await wait(100); return !!fn(); };
  const askCard = (label) => qa('.tool-card[data-state="ask"]').find((c) => !label || c.querySelector(".tc-head b").textContent === label);
  const r = {};
  q("#groupChip [data-exit]").click(); await wait(200);
  q("#agentBtn").click(); await wait(100);
  r.agentOn = q("#agentBtn").classList.contains("on");
  r.placeholder = q("#input").placeholder;
  // Chưa mở thư mục: gửi tin sẽ mở thư mục trước (chế độ kiểm tra dùng thư mục tạm)
  sendMessage("ghi chú lại thư mục này giúp mình");
  await waitFor(() => q("#wsName").textContent, 3000);
  r.folderOpened = !!q("#wsName").textContent;
  // Xem thư mục được tự cho phép (chỉ đọc) -> Ghi file chờ duyệt -> Chạy lệnh chờ duyệt
  sendMessage("ghi chú lại thư mục này giúp mình");
  r.askWrite = await waitFor(() => askCard("Ghi file"));
  r.stopButtonWhileAsk = q("#sendBtn").classList.contains("stop");
  askCard("Ghi file").querySelector('[data-tc="allow"]').click();
  r.askRun = await waitFor(() => askCard("Chạy lệnh"));
  askCard("Chạy lệnh").querySelector('[data-tc="allow"]').click();
  await waitFor(() => !busy, 30000);
  const msgs = current().messages;
  r.tools = msgs.filter((m) => m.tools).flatMap((m) => m.tools.map((t) => t.tool + ":" + t.status));
  const run = msgs.flatMap((m) => m.tools || []).find((t) => t.tool === "run_command");
  r.runOutput = !!run && /vico-agent-demo\.md/.test(run.output || "");
  r.lastReply = msgs[msgs.length - 1].content.slice(0, 30);
  r.fileInTree = qa(".ws-node .nm").some((e) => e.textContent === "vico-agent-demo.md");
  r.terminalEcho = q("#termOut").textContent.includes("[Agent]");
  r.noRegenEdit = !q('.ma[data-act="regen"]') && !q('.ma[data-act="edit"]');
  r.creditNote = VicoAuth.history().some((l) => /^Agent · bước/.test(l.note || ""));
  // Hoàn tác: file do Agent tạo bị xoá
  const realConfirm = window.confirm;
  window.confirm = () => true;
  q('[data-tc="undo"]').click();
  await waitFor(() => qa(".tc-st").some((e) => e.textContent.includes("đã hoàn tác")), 5000);
  window.confirm = realConfirm;
  await wait(400);
  r.undone = !qa(".ws-node .nm").some((e) => e.textContent === "vico-agent-demo.md") && qa(".tc-st").some((e) => e.textContent.includes("đã hoàn tác"));
  // Từ chối: Agent dừng và nói rõ
  sendMessage("làm lại lần nữa");
  await waitFor(() => askCard("Ghi file"));
  askCard("Ghi file").querySelector('[data-tc="deny"]').click();
  await waitFor(() => !busy, 15000);
  const all = current().messages;
  r.denyReply = all[all.length - 1].content.slice(0, 30);
  r.deniedCards = qa('.tool-card[data-state="denied"]').length;
  // Dừng khi đang chờ duyệt
  sendMessage("thử dừng giữa chừng");
  await waitFor(() => askCard("Ghi file"));
  stopGenerating();
  await waitFor(() => !busy, 5000);
  r.stopWhileAsk = { busy, stoppedCards: qa('.tool-card[data-state="stopped"]').length };
  // Mở lại đoạn chat: thẻ công cụ vẫn đúng, thứ tự tin khớp
  openChat(current().id); await wait(200);
  r.reload = { cards: qa(".tool-card").length, indexOk: qa("#messages > .msg").length === current().messages.length };
  return r;
}
async function settingsChecks() {
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)], wait = (ms) => new Promise((r) => setTimeout(r, ms));
  openSettings("general"); await wait(400);
  const r = { sections: qa("#stBody h4").map((e) => e.textContent) };
  r.agentModels = qa('[data-aset-select="agentModel"] option').map((o) => o.textContent);
  r.toggles = qa("#stBody [data-dset]").map((i) => i.dataset.dset + ":" + i.checked);
  q("#upBtn").click(); await wait(400);
  r.updateStatus = q("#upStatus").textContent;
  q("#stBody").scrollTop = q("#stBody").scrollHeight;
  return r;
}
async function finetuneChecks() {
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)], wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, ms = 15000) => { for (let t = 0; t < ms && !fn(); t += 150) await wait(150); return !!fn(); };
  const r = {};
  q("#settingsModal").hidden = true;
  if (q("#agentBtn").classList.contains("on")) q("#agentBtn").click(); // tắt Agent từ bước kiểm tra trước
  q("#finetuneBtn").click(); await wait(100);
  r.pageOpen = !q("#ftPage").hidden && document.documentElement.classList.contains("ft-open");
  r.scanningShown = !!q(".ft-scanning");
  r.scanDone = await waitFor(() => !q(".ft-scanning") && q(".ft-tier"), 90000);
  r.tier = (q(".ft-tier b") || {}).textContent;
  r.tierNote = (q(".ft-tier small") || {}).textContent;
  r.specs = qa(".ft-spec").map((e) => e.querySelector("small").textContent + ": " + e.querySelector("b").textContent);
  r.suggest = qa("#ftSuggest .ft-card").map((c) => c.querySelector(".ft-vendor").textContent + " / " + c.querySelector(".ft-name").textContent);
  r.allCount = qa("#ftAll .ft-card").length;
  const c0 = q("#ftAll .ft-card").getBoundingClientRect();
  r.cardSize = Math.round(c0.width) + "x" + Math.round(c0.height);
  r.notEnough = qa("#ftAll .ft-card").filter((c) => c.querySelector(".ft-run:disabled")).map((c) => c.querySelector(".ft-name").textContent).length;
  q('.ft-chips [data-f="fit"]').click(); await wait(50);
  r.fitFilter = qa("#ftAll .ft-card").length;
  q('.ft-chips [data-f="all"]').click(); await wait(50);
  // Chạy Qwen3.5 0.8B (file đã có sẵn trong thư mục model)
  const card = q('#ftAll .ft-card[data-id="qwen3.5-0.8b"]');
  r.downloaded = card.querySelector(".ft-specs").textContent.includes("Đã tải");
  card.querySelector('[data-act="run"]').click();
  r.started = await waitFor(() => q("#ftRunning:not([hidden])"), 180000);
  r.running = (q("#ftRunning b") || {}).textContent;
  r.runningInfo = (q("#ftRunning small") || {}).textContent;
  r.picker = { name: q("#mpName").textContent };
  // Chat bằng model trên máy: không trừ credit, có ghi tên model dưới câu trả lời
  q('#ftRunning [data-act="chat"]').click(); await wait(200);
  r.pageClosed = q("#ftPage").hidden;
  newChat(); await wait(100);
  r.sendTitle = q("#sendBtn").title;
  // Model nhỏ: độ thông minh / chế độ làm việc không áp dụng (đặt mức cao nhất để chắc bị bỏ qua)
  const prevReason = reasoning;
  reasoning = "max"; updateSend();
  r.smallUi = { cmSmall: els.form.classList.contains("cm-small"), dim: +getComputedStyle(q("#reasonBtn")).opacity < 0.6 };
  q("#reasonBtn").click(); await wait(100);
  r.smallUi.reasonBlocked = !q("#reasonPicker").classList.contains("open");
  q("#modeBtn").click(); await wait(100);
  r.smallUi.modeBlocked = !q("#modePicker").classList.contains("open");
  r.smallUi.plainTyping = !typingHtml().includes("thinking-label");
  const before = VicoAuth.current().total;
  sendMessage("Thủ đô của Việt Nam là gì? Trả lời một câu.");
  await wait(300);
  await waitFor(() => !busy, 180000);
  const last = current().messages[current().messages.length - 1];
  r.localReply = last.content.slice(0, 120);
  r.modelNote = last.model;
  r.noCreditSpent = VicoAuth.current().total === before;
  r.smallModelNoSystem = VicoLocal.lastSystemLen === 0; // model nhỏ: không gửi system prompt
  r.smallNoThinking = VicoLocal.lastThought === 0; // độ thông minh "max" vẫn không bật phần suy nghĩ
  reasoning = prevReason; updateSend();
  // Đổi lại Vico Lite 2.6
  q("#mpBtn").click(); await wait(100);
  r.pickerItems = qa("#mpMenu .mp-item b").map((e) => e.textContent);
  r.pickerGroups = qa("#mpMenu .mp-group").map((e) => e.textContent);
  q('#mpMenu [data-mp="vico"]').click(); await wait(200);
  r.afterSwitch = { name: q("#mpName").textContent, title: q("#sendBtn").title, cmSmall: els.form.classList.contains("cm-small") };
  q("#mpBtn").click(); await wait(100);
  q('#mpMenu [data-mp="local:qwen3.5-0.8b"]').click(); await wait(300);
  r.backToLocal = q("#mpName").textContent;
  return r;
}
async function groupLocalChecks() {
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)], wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, ms = 15000) => { for (let t = 0; t < ms && !fn(); t += 150) await wait(150); return !!fn(); };
  const r = {};
  q("#ftBack").click(); await wait(100);
  q("#groupBtn").click(); await wait(300);
  q("#gsNew").click(); await wait(200);
  q("#gsName").value = "Nhóm trên máy"; q("#gsName").dispatchEvent(new Event("input"));
  q("#gsAdd").click(); await wait(200);
  r.localSection = qa(".gs-prov b").map((e) => e.textContent).includes("Model trên máy");
  r.localModels = qa('.gs-model[data-model^="local:"] b').map((e) => e.textContent);
  q('.gs-model[data-model="local:qwen3.5-0.8b"]').click(); await wait(200);
  q('[data-role="Nghiên cứu"]').click(); await wait(50);
  q("#gsOk").click(); await wait(200);
  r.costLine = (q(".gs-cost") || {}).textContent;
  q("#gsSaveStart").click(); await wait(400);
  sendMessage("Chào nhóm, giới thiệu ngắn về Hà Nội");
  await wait(300);
  await waitFor(() => !busy, 180000);
  const agents = current().messages.filter((m) => m.agentInfo);
  r.reply = agents.map((m) => `${m.agentInfo.handle} (${m.agentInfo.model}): ${m.content.slice(0, 60)}`);
  r.sentRaw = VicoLocal.lastMessage === "Chào nhóm, giới thiệu ngắn về Hà Nội" && VicoLocal.lastSystemLen === 0;
  r.onTopic = agents.some((m) => /Hà Nội/i.test(m.content));
  q("#groupChip [data-exit]").click(); await wait(200);
  await window.vicoDesktop.localStop();
  await wait(300);
  r.stopped = !document.querySelector("#ftRunning:not([hidden])");
  return r;
}
async function cloudChecks() {
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)], wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, ms = 15000) => { for (let t = 0; t < ms && !fn(); t += 150) await wait(150); return !!fn(); };
  const r = {};
  r.railOrder = qa(".rail-top > .rail-btn, .rail-top > .pop-wrap > .rail-btn").map((b) => b.id);
  q("#cloudBtn").click(); await wait(300);
  r.services = qa(".cl-service h3").map((e) => e.textContent);
  r.soon = qa(".cl-service.soon").length;
  q('[data-go="train"]').click(); await wait(200);
  q("#clStart").click();
  r.ready = await waitFor(() => q(".nb-chip.ready"), 10000);
  q(".nb-cell.code [data-act='run']").click();
  await waitFor(() => q(".nb-o.table"), 8000);
  r.smi = (q(".nb-o.table") || {}).textContent ? q(".nb-o.table").textContent.split("\n")[5].trim() : null;
  VicoCloud.open("ft"); await wait(300);
  r.ftSuggest = qa("#ftSug .cl-mname").map((e) => e.textContent);
  q("#finetuneBtn").click(); await wait(200);
  r.cloudClosedByFinetune = q("#clPage").hidden && !q("#ftPage").hidden;
  q("#ftBack").click(); await wait(100);
  VicoCloud.open("home"); await wait(200);
  return r;
}
async function projectFolderChecks() {
  const q = (s) => document.querySelector(s), wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, ms = 15000) => { for (let t = 0; t < ms && !fn(); t += 150) await wait(150); return !!fn(); };
  const r = {};
  // Ô chọn model đầu trang
  q("#mpBtn").click(); await wait(100);
  r.picker = { name: q("#mpName").textContent, groups: [...document.querySelectorAll("#mpMenu .mp-group")].map((e) => e.textContent), items: [...document.querySelectorAll("#mpMenu .mp-item b")].map((e) => e.textContent) };
  q('#mpMenu [data-mp="addkey:openai"]').click(); await wait(300);
  r.keyModal = !q("#keyModal").hidden && q("#kdTitle").textContent;
  q("#kdClose").click(); await wait(100);
  // Tạo dự án có thư mục + AI làm việc
  openProjectModal(null); await wait(100);
  r.modelOptions = [...q("#projModel").options].map((o) => o.textContent).slice(0, 4);
  q("#projName").value = "Dự án thư mục"; q("#projGoal").value = "Làm web giới thiệu";
  q("#pfPick").click(); await wait(400);
  r.pickedPath = q("#pfPath").textContent;
  q("#projModel").value = "vico";
  q("#projectForm").requestSubmit(); await wait(800);
  const p = currentProject();
  r.saved = { folder: !!(p && p.folder), autoSave: p && p.autoSave, model: p && p.model };
  r.chip = q("#folderChip").innerText;
  r.wsName = q("#wsName").textContent;
  // AI (demo) tạo file -> tự lưu vào thư mục dự án
  sendMessage("tạo file html cho trang web");
  await wait(300);
  await waitFor(() => !busy, 30000);
  await wait(1200);
  const list = await window.vicoDesktop.listFolder("");
  r.savedFiles = list.map((e) => e.name);
  selectProject(null); await wait(200);
  return r;
}
async function codePanelChecks() {
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)], wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const NL = String.fromCharCode(10), F = "```";
  const r = {};
  if (q("#agentBtn").classList.contains("on")) q("#agentBtn").click();
  // Thanh bên mở rộng: nút "Tải bản desktop" vẫn phải ẩn
  q("#toggleSidebar").click(); await wait(200);
  r.desktopBtnHiddenExpanded = getComputedStyle(q("#desktopBtn")).display === "none";
  q("#toggleSidebar").click(); await wait(100);
  // Đoạn chat có code: 2 khối python không tên, 1 file có tên, 1 lệnh PowerShell
  const id = "cp" + Date.now().toString(36);
  chats.unshift({ id, title: "Thử panel code", topic: "general", projectId: null, messages: [
    { role: "user", content: "viết code giúp mình", ts: Date.now() },
    { role: "assistant", ts: Date.now(), content: "Code đây:" + NL + NL + F + "python" + NL + "print('xin chào')" + NL + "for i in range(3):" + NL + "    print(i)" + NL + F + NL + NL +
      "Thêm hàm:" + NL + NL + F + "python" + NL + "def tong(a, b):" + NL + "    return a + b" + NL + F + NL + NL +
      F + "html file=\"trang.html\"" + NL + "<h1>Chào</h1>" + NL + F + NL + NL + "Chạy thử:" + NL + NL + F + "powershell" + NL + "python main.py" + NL + F },
    { role: "user", content: "sửa main.py", ts: Date.now() },
    { role: "assistant", ts: Date.now(), content: F + "python" + NL + "print('bản 2')" + NL + F },
  ] });
  save();
  openChat(id); await wait(400);
  r.chips = qa("#messages .code-chip b").map((e) => e.textContent);
  r.rawCodeInChat = qa("#messages .msg.bot .content pre").filter((p) => !p.dataset.decorated).length;
  r.shellKeptInline = !!q("#messages .code-bar .code-btn.run");
  r.panelFiles = qa(".cp-file").map((e) => e.querySelector(".cp-fname").textContent + (e.querySelector("small") ? " (" + e.querySelector("small").textContent + ")" : ""));
  // Bấm chip bản 1 của main.py -> panel mở đúng bản
  qa("#messages .code-chip")[0].click(); await wait(150);
  r.openFromChip = { tab: q("#workspace").dataset.tab, file: q(".cp-tab").textContent.replace(/^(PY|HTML)/, "").trim(), ver: (q(".cp-vers span") || {}).textContent, lines: q(".cp-gutter").textContent.split(NL).length, hl: !!q(".cp-code .hljs-keyword, .cp-code .hljs-built_in, .cp-code .hljs-string") };
  q('[data-cp="next"]').click(); await wait(100);
  r.nextVer = (q(".cp-vers span") || {}).textContent;
  // Sửa và lưu -> thêm "bản bạn sửa"
  q('[data-cp="edit"]').click(); await wait(100);
  const ta = q(".cp-editarea");
  ta.value = "print('mình sửa')"; q('[data-cp="save"]').click(); await wait(200);
  r.afterEdit = { ver: (q(".cp-vers span") || {}).textContent, code: q(".cp-code pre").textContent, saved: (current().fileEdits || {})["main.py"] && current().fileEdits["main.py"].length };
  // Lưu vào thư mục đang mở (thư mục tạm của bước Agent)
  q('[data-cp="savefs"]').click(); await wait(500);
  const list = await window.vicoDesktop.listFolder("");
  r.savedToFolder = list.some((e) => e.name === "main.py");
  // Tab Thư mục & Terminal vẫn dùng được
  q('[data-wstab="pc"]').click(); await wait(100);
  r.pcTab = q(".ws-term").offsetParent !== null && q(".ws-code").offsetParent === null;
  q('[data-wstab="code"]').click(); await wait(100);
  return r;
}
async function groupChainChecks() {
  const q = (s) => document.querySelector(s), wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, ms = 30000) => { for (let t = 0; t < ms && !fn(); t += 150) await wait(150); return !!fn(); };
  const r = {};
  q("#groupBtn").click(); await wait(300);
  if (q("#gsNew")) { q("#gsNew").click(); await wait(200); }
  q('[data-tpl="dev"]').click(); await wait(200);
  q("#gsName").value = "Nhóm thử chuỗi"; q("#gsName").dispatchEvent(new Event("input"));
  q("#gsSaveStart").click(); await wait(400);
  const prevUrl = VICO_CONFIG.apiUrl, prevAsk = window.askVico, seen = {};
  const LONG = " Chi tiết: đã kiểm tra lại bố cục, màu sắc, khoảng cách, trạng thái nút và hiển thị trên điện thoại để chắc chắn đúng yêu cầu.";
  VICO_CONFIG.apiUrl = "smoke";
  window.askVico = async (messages) => {
    const p = messages[messages.length - 1].content, who = (p.match(/Bạn là (@\w+)/) || [])[1];
    const n = (seen[who] = (seen[who] || 0) + 1);
    if (who === "@lead") return ["@dev làm trang chủ theo kế hoạch." + LONG, "@dev sửa màu nút cho đậm hơn." + LONG, "@dev chỉnh khoảng cách lưới sản phẩm." + LONG, "Tốt rồi, app có thể deploy. Cảm ơn @dev."][n - 1] || "[IM LẶNG]";
    if (who === "@dev") return ["Bản 1 xong, @lead xem giúp." + LONG, "Bản 2 đã sửa màu nút, @lead xem lại." + LONG, "Bản 3 đã chỉnh lưới, @lead duyệt giúp." + LONG, "[IM LẶNG]"][n - 1] || "[IM LẶNG]";
    if (who === "@qa") return "[IM LẶNG]";
    return "không được gọi mà vẫn trả lời";
  };
  try {
    sendMessage("@lead làm web bán nội thất");
    await wait(300);
    await waitFor(() => !busy, 90000);
    const msgs = current().messages.filter((m) => m.agentInfo);
    r.order = msgs.map((m) => m.agentInfo.handle);
    r.devCalls = seen["@dev"] || 0;
    r.qaChecks = seen["@qa"] || 0;
    r.silentHidden = !msgs.some((m) => /IM LẶNG/.test(m.content));
    r.domMatches = document.querySelectorAll("#messages .msg.bot").length === msgs.length;
  } finally {
    VICO_CONFIG.apiUrl = prevUrl; window.askVico = prevAsk;
    const x = q("#groupChip [data-exit]"); if (x) x.click();
  }
  return r;
}
async function groupTagChecks() {
  const q = (s) => document.querySelector(s), wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, ms = 30000) => { for (let t = 0; t < ms && !fn(); t += 150) await wait(150); return !!fn(); };
  const r = {};
  // Nhóm mẫu "Team phát triển": lead, design, dev, qa (qa là giám sát)
  q("#groupBtn").click(); await wait(300);
  if (q("#gsNew")) { q("#gsNew").click(); await wait(200); }
  q('[data-tpl="dev"]').click(); await wait(200);
  q("#gsName").value = "Nhóm thử tag"; q("#gsName").dispatchEvent(new Event("input"));
  q("#gsSaveStart").click(); await wait(400);
  // Giả lập câu trả lời của từng AI (đọc "Bạn là @handle" trong bản chép hội thoại gửi cho AI)
  const prevUrl = VICO_CONFIG.apiUrl, prevAsk = window.askVico;
  const seen = {};
  VICO_CONFIG.apiUrl = "smoke";
  window.askVico = async (messages) => {
    const p = messages[messages.length - 1].content, who = (p.match(/Bạn là (@\w+)/) || [])[1];
    seen[who] = (seen[who] || 0) + 1;
    if (who === "@lead") return seen[who] === 1
      ? "KẾ-HOẠCH-123: @dev hãy dựng trang chủ, trang danh mục lọc theo phòng, trang chi tiết sản phẩm và giỏ hàng theo phong cách tối giản Bắc Âu, chạy tốt trên điện thoại. Mình sẽ kiểm tra lại khi bạn xong."
      : "Mình đã xem lại: app làm tốt, có thể deploy.";
    if (who === "@dev") {
      if (seen[who] === 1) { r.devSawPlan = p.includes("KẾ-HOẠCH-123"); return "Theo KẾ-HOẠCH-123 mình đã code xong trang chủ, danh mục và giỏ hàng, tách riêng HTML, CSS và JS, lưu giỏ hàng vào localStorage. @lead xem giúp mình nhé."; }
      r.devSawQa = p.includes("thiếu responsive");
      return "Đã sửa responsive.";
    }
    if (who === "@qa") { const last = p.split("Các thành viên khác đã trả lời yêu cầu này:")[1] || ""; return /localStorage/.test(last) && !/thiếu responsive/.test(last) ? "Phát hiện điểm bất thường: trang danh mục thiếu responsive trên điện thoại. @dev sửa lại giúp." : "[IM LẶNG]"; }
    return "AI không được gọi mà vẫn trả lời: " + who;
  };
  try {
    sendMessage("@lead hãy giao việc cho lập trình để code cho tôi 1 web bán nội thất");
    await wait(300);
    await waitFor(() => !busy, 60000);
    const msgs = current().messages.filter((m) => m.agentInfo);
    r.order = msgs.map((m) => m.agentInfo.handle);
    r.designSilent = !msgs.some((m) => m.agentInfo.handle === "@design");
    r.qaChecks = seen["@qa"] || 0;
    r.devTurns = seen["@dev"] || 0;
    r.qaVisible = msgs.filter((m) => m.agentInfo.handle === "@qa").map((m) => m.content.slice(0, 40));
    r.domMatches = document.querySelectorAll("#messages .msg.bot").length === msgs.length;
  } finally {
    VICO_CONFIG.apiUrl = prevUrl; window.askVico = prevAsk;
    const x = q("#groupChip [data-exit]"); if (x) x.click();
  }
  return r;
}
async function groupNavChecks() {
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)], wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const r = {};
  r.items = qa("#groupNav .gn-item").map((b) => b.title);
  r.order = [...q(".rail-top").children].map((e) => e.id || e.className).slice(0, 6);
  // Thanh thu gọn: bấm nhóm thứ 2 -> vào group chat của nhóm đó
  const b = qa("#groupNav .gn-item")[1];
  const g = { id: b.dataset.gid, name: b.title.split(" · ")[0] };
  b.click(); await wait(250);
  r.entered = {
    chip: q("#groupChip").textContent.includes(g.name),
    active: (q("#groupNav .gn-item.on") || {}).dataset?.gid === g.id,
    placeholder: q("#input").placeholder,
    freshChat: currentId === null,
  };
  // Thanh mở rộng: tên nhóm + số AI; nút sửa mở khung sửa nhóm
  document.head.insertAdjacentHTML("beforeend", "<style id=\"noAnim\">*{transition:none!important;animation:none!important}</style>"); // ảnh chụp không dính hiệu ứng
  if (!q("#sidebar").classList.contains("expanded")) q("#toggleSidebar").click();
  await wait(250);
  r.expanded = qa("#groupNav .gn-item").map((x) => x.querySelector(".gn-name").textContent + " · " + x.querySelector(".gn-count").textContent);
  qa("#groupNav .gn-edit")[0].click(); await wait(250);
  r.editOpen = !q("#gsModal").hidden ? q("#gsTitle").textContent + " · " + q("#gsName").value : false;
  q("#gsClose").click(); await wait(100);
  return r;
}
