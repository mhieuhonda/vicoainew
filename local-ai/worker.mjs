// Tiến trình chạy model trên máy (Electron utilityProcess).
// Tách riêng khỏi app: model lỗi hoặc thiếu VRAM chỉ làm dừng tiến trình này, Vico AI vẫn chạy.
// Nhận / gửi tin qua process.parentPort: probe, load, unload, chat (chữ chạy dần), abort.
import { getLlama, LlamaChatSession } from "node-llama-cpp";

const port = process.parentPort;
const send = (m) => port.postMessage(m);
let llama = null, model = null, context = null, session = null;
const aborts = new Map();
let queue = Promise.resolve();

async function ensureLlama() {
  // build: "never" = chỉ dùng bản dựng sẵn đi kèm app (Vulkan/CPU), không tự biên dịch
  if (!llama) llama = await getLlama({ gpu: "auto", build: "never", progressLogs: false, logLevel: "error" });
  return llama;
}
async function probe() {
  const l = await ensureLlama();
  return { gpu: l.gpu, devices: await l.getGpuDeviceNames(), vram: await l.getVramState() };
}
async function unload() {
  session = null;
  if (context) { await context.dispose(); context = null; }
  if (model) { await model.dispose(); model = null; }
}
async function load({ file, ctxMax }) {
  await unload();
  const l = await ensureLlama();
  let last = -1;
  model = await l.loadModel({
    modelPath: file,
    gpuLayers: "auto", // đặt được bao nhiêu lớp lên GPU thì đặt, phần còn lại chạy CPU
    onLoadProgress: (p) => { const v = Math.floor(p * 100); if (v >= last + 5) { last = v; send({ type: "loadProgress", progress: v }); } },
  });
  context = await model.createContext({ contextSize: { min: 2048, max: ctxMax || 8192 } });
  session = new LlamaChatSession({ contextSequence: context.getSequence() });
  return {
    gpu: l.gpu,
    gpuLayers: model.gpuLayers,
    totalLayers: (model.fileInsights && model.fileInsights.totalLayers) || null,
    contextSize: context.contextSize,
    vram: await l.getVramState(),
  };
}
async function chat({ id, system, messages, maxTokens, thoughtBudget }) {
  if (!session) throw new Error("Chưa nạp model");
  const ctrl = new AbortController();
  aborts.set(id, ctrl);
  try {
    const list = messages.slice();
    const last = list.pop();
    const history = system ? [{ type: "system", text: system }] : [];
    for (const m of list) history.push(m.role === "user" ? { type: "user", text: m.content } : { type: "model", response: [m.content] });
    session.setChatHistory(history);
    let thinking = false;
    const text = await session.prompt(last ? last.content : "", {
      signal: ctrl.signal,
      stopOnAbortSignal: true,
      maxTokens: maxTokens || 4096,
      budgets: thoughtBudget == null ? undefined : { thoughtTokens: thoughtBudget },
      onResponseChunk: (c) => {
        if (c.type === "segment") { // phần "suy nghĩ" của model suy luận: không hiện, chỉ báo đang nghĩ
          if (!thinking) { thinking = true; send({ type: "thinking", id }); }
          return;
        }
        if (c.text) send({ type: "delta", id, text: c.text });
      },
    });
    return { text: text.trim(), stopped: ctrl.signal.aborted };
  } finally {
    aborts.delete(id);
  }
}

port.on("message", (e) => {
  const msg = e.data;
  if (msg.type === "abort") { const c = aborts.get(msg.id); if (c) c.abort(); return; }
  // Các việc còn lại chạy lần lượt (một model, một ngữ cảnh)
  queue = queue.then(async () => {
    try {
      let result = {};
      if (msg.type === "probe") result = await probe();
      else if (msg.type === "load") result = await load(msg);
      else if (msg.type === "unload") await unload();
      else if (msg.type === "chat") result = await chat(msg);
      send({ type: "result", rid: msg.rid, ...result });
    } catch (err) {
      send({ type: "error", rid: msg.rid, message: String((err && err.message) || err) });
    }
  });
});
send({ type: "ready" });
