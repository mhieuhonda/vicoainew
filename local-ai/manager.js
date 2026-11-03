// Quản lý model chạy trên máy (tiến trình chính): quét cấu hình, tải model, bật/tắt tiến trình model, chat.
const { utilityProcess, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFile } = require("child_process");
const { VENDORS, VENDOR_ORDER, MODELS } = require("./catalog");

const GB = 1e9;
let modelsDir = "";
let getWin = () => null;
const emit = (ch, data) => { const w = getWin(); if (w && !w.isDestroyed()) w.webContents.send(ch, data); };

const byId = (id) => {
  const m = MODELS.find((x) => x.id === id);
  if (!m) throw new Error("Không có model này");
  return m;
};
// Cùng cách đặt tên với node-llama-cpp (hf_<tác giả>_<file>)
const fileOf = (m) => path.join(modelsDir, `hf_${m.repo.split("/")[0]}_${path.basename(m.file)}`);
const isDownloaded = (m) => fs.existsSync(fileOf(m));

/* ---------- Quét cấu hình máy ---------- */
const run = (cmd, args, timeout = 15000) => new Promise((resolve) => {
  execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => resolve(err ? "" : String(stdout)));
});
const PS_GPU = [
  "$ErrorActionPreference='SilentlyContinue';",
  "$v=@(Get-CimInstance Win32_VideoController | ForEach-Object { @{ name=$_.Name; ram=[int64]$_.AdapterRAM; pnp=$_.PNPDeviceID } });",
  "$r=@(Get-ChildItem 'HKLM:\\SYSTEM\\ControlSet001\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}' | ForEach-Object {",
  "  $p=Get-ItemProperty $_.PSPath; if ($p.DriverDesc) { @{ name=$p.DriverDesc; mem=[int64]$p.'HardwareInformation.qwMemorySize' } } });",
  "@{ video=$v; reg=$r } | ConvertTo-Json -Depth 4 -Compress",
].join(" ");
const INTEGRATED = /uhd|iris|intel\(r\) graphics|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics|microsoft basic/i;
const DISCRETE = /nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|arc\(tm\) a\d|arc a\d|arc b\d/i;
const isDiscrete = (name) => DISCRETE.test(name) && !INTEGRATED.test(name);

async function scanGpus() {
  const [ps, smi] = await Promise.all([
    process.platform === "win32" ? run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", PS_GPU]) : "",
    run("nvidia-smi", ["--query-gpu=name,memory.total,memory.free", "--format=csv,noheader,nounits"], 8000),
  ]);
  let info = { video: [], reg: [] };
  try { info = JSON.parse(ps) || info; } catch {}
  const toArr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
  const reg = toArr(info.reg);
  const nv = smi.trim().split(/\r?\n/).filter(Boolean).map((l) => {
    const [name, total, free] = l.split(",").map((s) => s.trim());
    return { name, total: +total * 1048576, free: +free * 1048576 };
  });
  return toArr(info.video).map((v) => {
    const r = reg.find((x) => x.name === v.name && x.mem > 0);
    const n = nv.find((x) => x.name === v.name);
    const vendor = /VEN_10DE/i.test(v.pnp) ? "NVIDIA" : /VEN_1002/i.test(v.pnp) ? "AMD" : /VEN_8086/i.test(v.pnp) ? "Intel" : "";
    const vram = n ? n.total : r ? r.mem : v.ram > 0 ? v.ram : 0; // AdapterRAM tối đa 4 GB nên ưu tiên số khác
    return { name: v.name, vendor, discrete: isDiscrete(v.name), vram, free: n ? n.free : null };
  });
}

async function scan() {
  const [gpus, disk] = await Promise.all([
    scanGpus(),
    fs.promises.mkdir(modelsDir, { recursive: true }).then(() => fs.promises.statfs(modelsDir)).catch(() => null),
  ]);
  const cpus = os.cpus();
  let engine;
  try {
    await ensureWorker();
    engine = { gpu: probeInfo.gpu, device: probeInfo.visible, devices: probeInfo.all };
  } catch (err) {
    engine = { gpu: false, error: err.message };
  }
  const main = gpus.filter((g) => g.discrete).sort((a, b) => b.vram - a.vram)[0] || null;
  return {
    gpus, main,
    ram: os.totalmem(), freeRam: os.freemem(),
    cpu: (cpus[0] && cpus[0].model.trim()) || "", cores: cpus.length,
    disk: disk ? disk.bavail * disk.bsize : null,
    modelsDir, engine,
    os: `${os.type() === "Windows_NT" ? "Windows" : os.type()} ${os.release()}`,
  };
}

/* ---------- Tải model (tải tiếp được khi bị ngắt: file .part + Range) ---------- */
const downloads = new Map(); // id -> { ctrl, received, total }
async function download(m) {
  const dest = fileOf(m);
  if (fs.existsSync(dest)) return dest;
  if (downloads.has(m.id)) throw new Error("Model này đang được tải");
  await fs.promises.mkdir(modelsDir, { recursive: true });
  const part = dest + ".part";
  let start = fs.existsSync(part) ? fs.statSync(part).size : 0;
  const ctrl = new AbortController();
  const st = { ctrl, received: start, total: 0 };
  downloads.set(m.id, st);
  const url = `https://huggingface.co/${m.repo}/resolve/main/${m.file}?download=true`;
  try {
    const res = await fetch(url, { headers: start ? { Range: `bytes=${start}-` } : {}, signal: ctrl.signal });
    if (!res.ok) throw new Error(`Hugging Face trả lỗi ${res.status}`);
    if (start && res.status !== 206) start = st.received = 0; // máy chủ không cho tải tiếp: tải lại từ đầu
    st.total = start + Number(res.headers.get("content-length") || 0);
    const out = fs.createWriteStream(part, { flags: start ? "a" : "w" });
    const reader = res.body.getReader();
    let lastEmit = 0, lastBytes = st.received, lastT = Date.now(), speed = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        st.received += value.length;
        if (!out.write(value)) await new Promise((r) => out.once("drain", r));
        const now = Date.now();
        if (now - lastEmit > 300) {
          speed = (st.received - lastBytes) / ((now - lastT) / 1000) * 0.4 + speed * 0.6;
          lastBytes = st.received; lastT = now; lastEmit = now;
          emit("local:progress", { id: m.id, received: st.received, total: st.total, speed });
        }
      }
    } finally {
      await new Promise((r) => out.end(r));
    }
    if (st.total && st.received < st.total) throw new Error("Tải chưa xong, mạng bị ngắt");
    await fs.promises.rename(part, dest);
    emit("local:progress", { id: m.id, received: st.received, total: st.total, done: true });
    return dest;
  } catch (err) {
    emit("local:progress", { id: m.id, error: ctrl.signal.aborted ? "cancel" : err.message });
    throw ctrl.signal.aborted ? new Error("Đã huỷ tải") : err;
  } finally {
    downloads.delete(m.id);
  }
}

/* ---------- Tiến trình chạy model ---------- */
let worker = null, workerPromise = null, probeInfo = null;
let running = null;  // { id, info }
let loading = null;  // id đang nạp
let nextRid = 1;
const pending = new Map(); // rid -> { resolve, reject }

function status(extra = {}) {
  const s = { running, loading, downloads: [...downloads.entries()].map(([id, d]) => ({ id, received: d.received, total: d.total })), ...extra };
  emit("local:status", s);
  return s;
}
function spawnWorker(env) {
  const child = utilityProcess.fork(path.join(__dirname, "worker.mjs"), [], {
    serviceName: "Vico AI - model trên máy",
    env: { ...process.env, ...env },
    stdio: "ignore",
  });
  // Tiến trình model phải nạp xong node-llama-cpp và gắn bộ nghe tin rồi mới nhận lệnh (tránh mất tin đầu)
  let markReady;
  child.ready = new Promise((r) => (markReady = r));
  child.on("message", (msg) => {
    if (msg.type === "ready") return markReady();
    if (msg.type === "delta") return emit("local:delta", { reqId: msg.id, text: msg.text });
    if (msg.type === "thinking") return emit("local:delta", { reqId: msg.id, thinking: true });
    if (msg.type === "loadProgress") return emit("local:load", { id: loading, progress: msg.progress });
    const p = pending.get(msg.rid);
    if (!p || p.child !== child) return;
    pending.delete(msg.rid);
    if (msg.type === "error") p.reject(new Error(msg.message)); else p.resolve(msg);
  });
  child.on("exit", (code) => {
    for (const [rid, p] of pending) if (p.child === child) { pending.delete(rid); p.reject(new Error("Tiến trình model đã dừng" + (code ? ` (mã ${code}), có thể do thiếu VRAM/RAM` : ""))); }
    if (worker === child) {
      worker = null; workerPromise = null;
      const was = running || loading;
      running = null; loading = null;
      if (was && code) status({ error: "Model bị dừng đột ngột (có thể do thiếu bộ nhớ GPU)." });
    }
  });
  return child;
}
function call(child, msg, timeout = 0) {
  return new Promise((resolve, reject) => {
    const rid = nextRid++;
    pending.set(rid, { resolve, reject, child });
    child.ready.then(() => child.postMessage({ ...msg, rid }));
    if (timeout) setTimeout(() => { if (pending.delete(rid)) reject(new Error("Quá thời gian chờ tiến trình model")); }, timeout);
  });
}
/** Mở tiến trình model. Máy có nhiều GPU (VD: Intel tích hợp + NVIDIA rời) thì chỉ dùng GPU rời cho nhanh. */
function ensureWorker() {
  if (worker) return Promise.resolve(worker);
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    let child = spawnWorker({});
    const p = await call(child, { type: "probe" }, 60000);
    const idx = p.devices.findIndex(isDiscrete);
    if (p.gpu === "vulkan" && p.devices.length > 1 && idx >= 0) {
      child.kill();
      child = spawnWorker({ GGML_VK_VISIBLE_DEVICES: String(idx) });
      const q = await call(child, { type: "probe" }, 60000);
      probeInfo = { gpu: q.gpu, vram: q.vram, visible: p.devices[idx], all: p.devices };
    } else {
      probeInfo = { gpu: p.gpu, vram: p.vram, visible: p.devices[idx >= 0 ? idx : 0] || null, all: p.devices };
    }
    worker = child;
    return child;
  })();
  workerPromise.catch(() => { workerPromise = null; });
  return workerPromise;
}

async function start(id) {
  const m = byId(id);
  if (running && running.id === id) return running;
  if (loading) throw new Error("Đang khởi động một model khác, đợi chút nhé");
  const file = await download(m);
  loading = id;
  status();
  try {
    const child = await ensureWorker();
    const info = await call(child, { type: "load", file, ctxMax: 8192 });
    delete info.type; delete info.rid;
    running = { id, info: { ...info, device: probeInfo.visible } };
    return running;
  } catch (err) {
    running = null;
    throw new Error(/memory|alloc|vram|out of/i.test(err.message) ? "Không đủ bộ nhớ để chạy model này. Thử model nhỏ hơn." : err.message);
  } finally {
    loading = null;
    status();
  }
}
async function stop() {
  if (worker && running) await call(worker, { type: "unload" }).catch(() => {});
  running = null;
  status();
}

function catalog() {
  return {
    vendors: VENDORS, vendorOrder: VENDOR_ORDER, modelsDir,
    models: MODELS.map((m) => ({ ...m, downloaded: isDownloaded(m) })),
    running, loading,
  };
}

function register({ ipcMain, app, getWindow, smoke }) {
  getWin = getWindow;
  // Kiểm tra tự động dùng chung thư mục model của app thật (khỏi tải lại vài trăm MB)
  modelsDir = smoke ? path.join(app.getPath("appData"), "Vico AI", "models") : path.join(app.getPath("userData"), "models");
  ipcMain.handle("local:catalog", () => catalog());
  ipcMain.handle("local:scan", () => scan());
  ipcMain.handle("local:status", () => status());
  ipcMain.handle("local:download", async (_e, id) => { await download(byId(id)); return catalog(); });
  ipcMain.handle("local:cancel", (_e, id) => { const d = downloads.get(id); if (d) d.ctrl.abort(); });
  ipcMain.handle("local:delete", async (_e, id) => {
    const m = byId(id);
    if (running && running.id === id) throw new Error("Dừng model trước khi xoá");
    await fs.promises.rm(fileOf(m), { force: true });
    await fs.promises.rm(fileOf(m) + ".part", { force: true });
    return catalog();
  });
  ipcMain.handle("local:start", (_e, id) => start(id));
  ipcMain.handle("local:stop", () => stop());
  ipcMain.handle("local:chat", async (_e, { reqId, system, messages, maxTokens, thoughtBudget }) => {
    if (!worker || !running) throw new Error("Chưa chạy model nào trên máy. Mở Finetune để chạy model.");
    const r = await call(worker, { type: "chat", id: reqId, system, messages, maxTokens, thoughtBudget });
    return { text: r.text, stopped: r.stopped };
  });
  ipcMain.handle("local:abort", (_e, reqId) => { if (worker) worker.postMessage({ type: "abort", id: reqId }); });
  ipcMain.handle("local:openDir", async () => { await fs.promises.mkdir(modelsDir, { recursive: true }); return shell.openPath(modelsDir); });
  app.on("before-quit", () => { for (const d of downloads.values()) d.ctrl.abort(); if (worker) worker.kill(); });
}

module.exports = { register };
