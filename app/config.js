/* =========================================================
   CẤU HÌNH KẾT NỐI CHATBOT - Vico AI
   Phần này sẽ được cài đặt sau. Hiện tại web chạy ở chế độ DEMO
   (trả lời mẫu) để xem giao diện.
   ========================================================= */
const VICO_CONFIG = {
  apiUrl: "https://api.kiyo.vn",   // máy chủ Vico (Cloudflare Worker, sau WAF của zone kiyo.vn). Để trống = chế độ demo, tài khoản lưu trên máy
  apiKey: "",   // API key
  model: "",    // Tên model
};

/* Chủ đề: máy chủ thêm chỉ dẫn riêng của từng chủ đề (vico-api/src/prompts.js). Muốn thêm chủ đề thì thêm cả hai nơi. */
const VICO_TOPICS = [
  { id: "general", label: "Chung", icon: "chat", desc: "Trò chuyện thông thường", placeholder: "Nhắn tin cho Vico AI..." },
  { id: "web", label: "Website", icon: "web", desc: "Thiết kế & code trang web", placeholder: "Mô tả trang web bạn muốn làm..." },
  { id: "app", label: "Ứng dụng", icon: "app", desc: "Ứng dụng mobile, desktop", placeholder: "Mô tả ứng dụng bạn muốn làm..." },
  { id: "slide", label: "Slide", icon: "slide", desc: "Dàn ý bài thuyết trình", placeholder: "Chủ đề bài thuyết trình của bạn..." },
  { id: "code", label: "Lập trình", icon: "code", desc: "Code, sửa lỗi, thuật toán", placeholder: "Hỏi về code, lỗi, thuật toán..." },
  { id: "writing", label: "Viết bài", icon: "pen", desc: "Bài viết, email, kịch bản", placeholder: "Bạn muốn viết gì?" },
  { id: "study", label: "Học tập", icon: "study", desc: "Giải bài, giải thích kiến thức", placeholder: "Câu hỏi bài tập, kiến thức..." },
  { id: "translate", label: "Dịch", icon: "translate", desc: "Dịch Việt ⇄ Anh và ngôn ngữ khác", placeholder: "Nhập nội dung cần dịch..." },
];

/* Mức suy luận (reasoning): từ nhanh nhất tới thông minh nhất.
   Khi kết nối API thật, map `id` sang tham số suy luận của model đang dùng. */
const VICO_REASONING = [
  { id: "low",        label: "Thấp",       desc: "Trả lời nhanh nhất, hợp câu hỏi đơn giản" },
  { id: "medium",     label: "Vừa",        desc: "Cân bằng giữa tốc độ và chất lượng", recommended: true },
  { id: "high",       label: "Cao",        desc: "Suy nghĩ kỹ hơn cho bài toán khó" },
  { id: "max",        label: "Rất cao",    desc: "Phân tích sâu, lập luận nhiều bước" },
  { id: "ultrathink", label: "Ultrathink", desc: "Suy luận tối đa: chậm hơn nhưng thông minh nhất" },
];

/* Chế độ làm việc (nút bộ não cạnh khung chat). Không chọn = chế độ thường. */
const VICO_MODES = [
  { id: "best", label: "Kết quả tốt nhất", short: "Tốt nhất", icon: "target",
    desc: "AI sẽ tự phản biện lại lập luận của nó đến khi nào được kết quả tốt nhất",
    thinking: "Đang tự phản biện…" },
  { id: "deep", label: "Deep Research", short: "Deep Research", icon: "search",
    desc: "Tìm hiểu từ nhiều nguồn rồi tổng hợp thành báo cáo chi tiết",
    thinking: "Đang nghiên cứu…" },
  { id: "ultradeep", label: "Ultra Deep Research", short: "Ultra Deep", icon: "telescope",
    desc: "Nghiên cứu chuyên sâu tối đa: nhiều vòng tìm kiếm, đối chiếu và kiểm chứng",
    thinking: "Đang nghiên cứu chuyên sâu…" },
];

/* Credit: tài khoản mới được tặng `signupBonus` (không hết hạn) và mỗi ngày có `dailyFree`
   credit miễn phí, làm mới lúc 0 giờ, phần chưa dùng không cộng dồn sang ngày sau.
   Khi gửi tin, trừ credit ngày trước rồi mới trừ credit tặng. */
const VICO_CREDITS = {
  signupBonus: 1000,
  dailyFree: 300,
  // Credit tính theo token AI tạo ra (máy chủ tính, xem vico-api CREDITS): 70 token = 1 credit, nhân hệ số
  tokensPerCredit: 70,
  levelMult: { low: 1, medium: 1, high: 1.75, max: 2, ultrathink: 3 }, // mức suy luận
  modeMult: { best: 4, deep: 4, ultradeep: 4 },                          // chế độ đặc biệt (nhân thêm với mức suy luận)
};

/* Bản desktop: khi đã build xong, điền link file cài đặt vào `url`.
   Để trống = nút tải hiện "Sắp ra mắt". */
const VICO_DESKTOP = {
  version: "1.0.0",
  downloads: {
    windows: { label: "Windows", ext: ".exe",      url: "download.html#VicoAI-Setup-1.0.0.exe" },
    mac:     { label: "macOS",   ext: ".dmg",      url: "" },
    linux:   { label: "Linux",   ext: ".AppImage", url: "" },
  },
};

/* Model dùng được trong Group AI (bản desktop). Tên/ID lấy từ trang chính thức:
   developers.openai.com/api/docs/models và platform.claude.com/docs/en/about-claude/models.
   `efforts` = các mức suy luận model chấp nhận (theo trang của từng model). */
const VICO_PROVIDERS = {
  vico:      { name: "Vico AI",   needsKey: false },
  openai:    { name: "OpenAI",    needsKey: true, keyUrl: "https://platform.openai.com/api-keys", keyHint: "sk-..." },
  anthropic: { name: "Anthropic", needsKey: true, keyUrl: "https://platform.claude.com/",         keyHint: "sk-ant-..." },
};
const EFFORT_ALL = ["low", "medium", "high", "xhigh", "max"];
const VICO_MODELS = [
  { id: "vico-lite-2.6", provider: "vico", name: "Vico Lite 2.6", desc: "Model của Vico AI, không cần API key (tính credit Vico)" },

  { id: "gpt-6.1-sol",   provider: "openai", name: "GPT-6.1 Sol",   desc: "Gần bằng GPT-6 Astra với chi phí thấp hơn: code phức tạp, công việc chuyên môn", efforts: EFFORT_ALL },
  { id: "gpt-6-astra",   provider: "openai", name: "GPT-6 Astra",   desc: "Mạnh nhất của OpenAI: suy luận phức tạp, code, nghiên cứu, soạn tài liệu", efforts: EFFORT_ALL },
  { id: "gpt-6-sol",     provider: "openai", name: "GPT-6 Sol",     desc: "Cho code phức tạp và quy trình agent", efforts: EFFORT_ALL },
  { id: "gpt-6-luna",    provider: "openai", name: "GPT-6 Luna",    desc: "Hiệu quả nhất, cho tác vụ tập trung, khối lượng lớn", efforts: EFFORT_ALL },
  { id: "gpt-5.6-sol",   provider: "openai", name: "GPT-5.6 Sol",   desc: "Model chủ lực của dòng GPT-5.6", efforts: EFFORT_ALL },
  { id: "gpt-5.6-terra", provider: "openai", name: "GPT-5.6 Terra", desc: "Cân bằng giữa trí tuệ và chi phí", efforts: EFFORT_ALL },
  { id: "gpt-5.6-luna",  provider: "openai", name: "GPT-5.6 Luna",  desc: "Tiết kiệm, cho khối lượng công việc lớn", efforts: EFFORT_ALL },
  { id: "gpt-5.5",       provider: "openai", name: "GPT-5.5",       desc: "Model chủ lực cho công việc chuyên môn phức tạp", efforts: ["low", "medium", "high", "xhigh"] },
  { id: "gpt-5.4-mini",  provider: "openai", name: "GPT-5.4 Mini",  desc: "Nhanh, tiết kiệm, cho khối lượng lớn", efforts: ["low", "medium", "high", "xhigh"] },

  { id: "claude-fable-5-1",  provider: "anthropic", name: "Claude Fable 5.1",  desc: "Cho suy luận khó và tác vụ agent dài hơi (chậm hơn)", efforts: EFFORT_ALL },
  { id: "claude-opus-5-5",   provider: "anthropic", name: "Claude Opus 5.5",   desc: "Cho lập trình dài hơi và công việc tri thức", efforts: EFFORT_ALL },
  { id: "claude-sonnet-5-5", provider: "anthropic", name: "Claude Sonnet 5.5", desc: "Kết hợp tốt nhất giữa tốc độ và trí tuệ", efforts: EFFORT_ALL },
  { id: "claude-haiku-5-5",  provider: "anthropic", name: "Claude Haiku 5.5",  desc: "Nhanh nhất, cho tác vụ khối lượng lớn", efforts: EFFORT_ALL },
];

/* Giới hạn phía giao diện (máy chủ sau này nên kiểm tra lại các giới hạn này) */
const VICO_LIMITS = {
  perMinute: 15,        // số tin tối đa mỗi phút
  maxAttachments: 5,    // số file đính kèm mỗi tin
  imageMaxMB: 10,       // ảnh lớn hơn sẽ bị từ chối; ảnh lớn được thu nhỏ còn cạnh dài 1600px
  pdfMaxMB: 15,
  textMaxKB: 500,       // file văn bản / code
  projectDocsKB: 1000,  // tổng dung lượng tài liệu của một dự án
};
VICO_CREDITS.referralBonus = 200; // mỗi bên được tặng khi dùng mã giới thiệu

/* Gói dùng (không bán lẻ credit). Pro: thanh toán bằng thẻ tín dụng, dùng thử 7 ngày.
   Chưa nối cổng thanh toán: hết dùng thử vẫn giữ Pro và CHƯA trừ tiền (billingReady = false).
   Khi có cổng thanh toán (VD Stripe), trừ tiền ở VicoAuth.chargeHook và bật billingReady. */
/* Thông tin pháp lý: điền thông tin đơn vị vận hành trước khi ra mắt chính thức (hiện trong Điều khoản / Chính sách).
   Đổi terms / privacy (ngày) khi sửa nội dung trang terms.html / privacy.html -> người dùng phải đồng ý lại (máy chủ: LEGAL trong vico-api). */
const VICO_LEGAL = {
  operator: "",          // tên cá nhân / hộ kinh doanh / công ty vận hành Vico AI
  taxCode: "",           // mã số thuế / mã số doanh nghiệp (nếu có)
  address: "",
  email: "",             // email liên hệ, khiếu nại, yêu cầu về dữ liệu cá nhân
  terms: "2026-10-18",
  privacy: "2026-10-18",
  minAge: 16,
  usdToVnd: 26300,        // chỉ để quy đổi hiển thị: pháp luật VN không cho niêm yết giá bằng ngoại tệ
};
const vnd = (n) => Math.round(n).toLocaleString("vi-VN") + " ₫";

const VICO_PLANS = {
  free: { name: "Free", dailyCredits: 300 },
  pro: { name: "Pro", priceVnd: 790000, priceUsd: 30, dailyCredits: 700, monthlyBonus: 9000, trialDays: 7, cycleDays: 30 },
  billingReady: false,
};

/** Hệ số credit của mức suy luận + chế độ (hai hệ số nhân với nhau). */
function creditMult(reasoningId, modeId) {
  return (VICO_CREDITS.levelMult[reasoningId] || 1) * (VICO_CREDITS.modeMult[modeId] || 1);
}
/** Credit cho số token AI tạo ra (tối thiểu 1). */
function creditsForTokens(tokens, reasoningId, modeId) {
  return Math.max(1, Math.ceil((Math.max(0, tokens) / VICO_CREDITS.tokensPerCredit) * creditMult(reasoningId, modeId)));
}
/** Credit tạm giữ khi gửi tin (giá của 70 token); trả lời xong máy chủ tính lại theo số token thật. */
function creditCost(reasoningId, modeId) {
  return creditsForTokens(VICO_CREDITS.tokensPerCredit, reasoningId, modeId);
}

/** Ngữ cảnh của người dùng gửi kèm cho AI: hướng dẫn tuỳ chỉnh, bộ nhớ, dự án, tài liệu dự án.
    Quy tắc và chỉ dẫn theo chủ đề / chế độ do máy chủ thêm (không nằm trong app).
    opts.local = true: model chạy trên máy / API key riêng của người dùng (bản desktop thêm quy tắc từ local-prompts.js). */
function buildSystemPrompt(topicId, project, modeId, opts = {}) {
  // Dự án chỉ là bối cảnh: AI vẫn phải trả lời đúng tin nhắn của người dùng, không tự đổi sang làm theo tên/mục tiêu dự án
  const p = project &&
    `Bối cảnh để tham khảo (không phải yêu cầu): người dùng đang ở dự án "${project.name}", mục tiêu: ${project.goal}. ` +
    "Chỉ dùng bối cảnh này khi tin nhắn của người dùng liên quan tới dự án.";
  // Cá nhân hoá (hướng dẫn tuỳ chỉnh, bộ nhớ) và tài liệu dự án do features.js cung cấp
  const personal = typeof personalPrompt === "function" ? personalPrompt() : "";
  const docs = project && typeof projectDocsPrompt === "function" ? projectDocsPrompt(project) : "";
  const rules = opts.local && typeof VICO_LOCAL_RULES === "function" ? VICO_LOCAL_RULES(topicId, modeId) : [];
  return [...rules, personal, p, docs].filter(Boolean).join("\n\n");
}

// File mẫu cho chế độ demo (khi người dùng nhờ tạo web/code/file)
const DEMO_FILES = "Mình gửi bạn 2 file mẫu, rê chuột vào để tải xuống hoặc bấm vào để xem trước:\n\n" +
  "```html file=\"index.html\"\n<!doctype html>\n<html lang=\"vi\">\n<head>\n  <meta charset=\"utf-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n" +
  "  <title>Quán cà phê Vico</title>\n  <link rel=\"stylesheet\" href=\"style.css\" />\n</head>\n<body>\n  <header>\n    <h1>Quán cà phê Vico</h1>\n" +
  "    <p>Cà phê rang xay mỗi sáng</p>\n    <a class=\"btn\" href=\"#dat-ban\">Đặt bàn</a>\n  </header>\n</body>\n</html>\n```\n\n" +
  "```css file=\"style.css\"\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  background: #faf6f1;\n  color: #3b2a1e;\n}\n" +
  "header {\n  min-height: 100vh;\n  display: grid;\n  place-content: center;\n  text-align: center;\n}\n" +
  ".btn {\n  padding: 12px 24px;\n  border-radius: 999px;\n  background: #6f4e37;\n  color: #fff;\n  text-decoration: none;\n}\n```";

/**
 * Gửi lịch sử hội thoại tới AI và trả về câu trả lời (string).
 * @param {{role: "user"|"assistant", content: string}[]} messages
 * @param {string} topicId  id chủ đề trong VICO_TOPICS
 * @param {{name: string, goal: string}|null} project  dự án đang chọn (nếu có)
 * @param {string} reasoning  id mức suy luận trong VICO_REASONING
 * @param {string|null} modeId  id chế độ làm việc trong VICO_MODES (null = thường)
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]  bấm "Dừng" sẽ huỷ signal này -> ném lỗi AbortError
 * @param {(chunk: string) => void} [opts.onDelta]  có thì gửi từng đoạn chữ (streaming), vẫn trả về toàn bộ câu trả lời
 * File đính kèm nằm trong messages[i].attachments; dùng VicoAttach.toApiParts(message) để lấy dữ liệu (base64/text).
 * @returns {Promise<string>}
 */
async function askVico(messages, topicId = "general", project = null, reasoning = "medium", modeId = null, opts = {}) {
  const systemPrompt = buildSystemPrompt(topicId, project, modeId);

  if (!VICO_CONFIG.apiUrl) {
    // ---- Chế độ demo ----
    const level = Math.max(0, VICO_REASONING.findIndex((x) => x.id === reasoning));
    const mi = VICO_MODES.findIndex((x) => x.id === modeId);
    await sleepAbortable(500 + level * 450 + (mi + 1) * 500 + Math.random() * 400, opts.signal);
    const reply = demoReply(messages, topicId, project, level, mi);
    if (!opts.onDelta) return reply;
    // Giả lập chữ chạy dần như API streaming
    for (const piece of reply.match(/\s*\S+/g) || []) {
      await sleepAbortable(14 + Math.random() * 22, opts.signal);
      opts.onDelta(piece);
    }
    return reply;
  }

  // ---- Máy chủ Vico: /api/chat (máy chủ trừ credit, chọn API theo điều hướng, lỗi thì tự chuyển API khác và hoàn credit) ----
  const charge = VicoAuth.claimCharge ? VicoAuth.claimCharge() : null;
  const chatNow = typeof current === "function" ? current() : null;
  const list = [];
  for (const m of messages.slice(-30)) {
    let content = m.content || "";
    if (m.attachments && m.attachments.length && typeof VicoAttach !== "undefined") {
      const parts = await VicoAttach.toApiParts(m).catch(() => []);
      const extra = parts.filter((p) => p.name).map((p) => p.type === "text"
        ? `\n\n[File đính kèm: ${p.name}]\n\`\`\`\n${String(p.text).slice(0, 50000)}\n\`\`\``
        : `\n\n[Người dùng gửi kèm file ${p.name} (${p.type}); hiện máy chủ chưa đọc được loại file này]`);
      content += extra.join("");
    }
    list.push({ role: m.role, content });
  }
  let data;
  try {
    data = await VicoAuth.call("/api/chat", {
      method: "POST", signal: opts.signal,
      body: {
        messages: list, context: systemPrompt, topic: topicId, mode: modeId, reasoning,
        attachments: (messages[messages.length - 1].attachments || []).length,
        chatId: chatNow && chatNow.id, chatTitle: chatNow && chatNow.title,
        charge: charge && { id: charge.id, cost: charge.cost, note: charge.note },
      },
    });
  } catch (err) {
    if (err && err.name === "AbortError") throw err;
    if (err && err.data && err.data.user) { if (charge) charge.settled = true; VicoAuth.apply(err.data); }
    if (err && err.status === 402) throw new Error("Không đủ credit");
    if (!err || !err.status || err.status >= 500) throw new Error("Lỗi kết nối: Vico AI chưa trả lời được, vui lòng thử lại sau ít phút.");
    throw new Error(err.message || "Lỗi kết nối");
  }
  if (charge) charge.settled = true; // máy chủ đã chốt credit theo token: bấm Dừng lúc chữ đang chạy không hoàn nữa
  VicoAuth.apply(data);
  if (data.charged && typeof renderCredits === "function") renderCredits(data.charged); // hiệu ứng "−X" theo số credit thật
  if (VicoAuth.sync) VicoAuth.sync(true); // lịch sử credit: thay khoản tạm giữ bằng dòng tính theo token
  const reply = String(data.text || "");
  if (!opts.onDelta) return reply;
  // Máy chủ trả cả câu: cho chữ chạy dần như streaming
  const pieces = reply.match(/\s*\S+/g) || [];
  const step = Math.max(1, Math.ceil(pieces.length / 250));
  for (let i = 0; i < pieces.length; i += step) {
    await sleepAbortable(12, opts.signal);
    opts.onDelta(pieces.slice(i, i + step).join(""));
  }
  return reply;
}

/** Chờ ms mili giây; huỷ được bằng AbortSignal (ném AbortError). */
function sleepAbortable(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) return reject(new DOMException("Đã dừng", "AbortError"));
    const t = setTimeout(resolve, ms);
    if (signal) signal.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Đã dừng", "AbortError")); }, { once: true });
  });
}

function demoReply(messages, topicId, project, level, mi) {
    const lastMsg = messages[messages.length - 1];
    const last = lastMsg.content || "(chỉ gửi file)";
    const files = (lastMsg.attachments || []).map((a) => a.name);
    const t = VICO_TOPICS.find((x) => x.id === topicId);
    const rl = VICO_REASONING[level];
    const mode = mi >= 0 ? ` Chế độ: **${VICO_MODES[mi].label}**.` : "";
    const proj = project ? ` Dự án: **${project.name}**.` : "";
    const att = files.length ? `\n\nBạn có gửi kèm ${files.length} file: ${files.map((f) => `**${f}**`).join(", ")}.` : "";
    return `Xin chào! Mình là **Vico AI**. Chủ đề: **${t ? t.label : "Chung"}**. Suy luận: **${rl.label}**.${mode}${proj} Bạn vừa hỏi:\n\n> ${last.replace(/\n/g, "\n> ")}${att}\n\nHiện tại mình đang chạy ở **chế độ demo**, chưa được kết nối tới mô hình AI. Khi cấu hình kết nối được cài đặt trong \`config.js\`, mình sẽ trả lời thật nhé!` +
      (/file|tệp|code|html|css|web|trang|tạo/i.test(last) || ["web", "code", "app"].includes(topicId) ? "\n\n" + DEMO_FILES : "");
}

/* ---------- Thuê máy chủ (cloud.js) ----------
   Giá GPU / CPU / RAM theo bảng giá Modal (modal.com/pricing, kiểm tra 2026-10-16), tính theo giây.
   apiUrl để trống = chế độ demo (giao diện chạy đủ, kết quả mô phỏng, không tạo máy thật).
   Khi có máy chủ điều phối, nối vào các đường dẫn:
     POST   {apiUrl}/sessions              { gpu, gpuCount, cpu, ram }        -> { id }
     POST   {apiUrl}/sessions/{id}/execute { code }   (trả về luồng chữ: từng dòng kết quả)
     DELETE {apiUrl}/sessions/{id}
     POST   {apiUrl}/finetune              { model, method, gpu, gpuCount, epochs, lr, rank, seqLen, data } -> { id }
     GET    {apiUrl}/finetune/{id}         -> { status, step, totalSteps, loss, log[] }
     DELETE {apiUrl}/finetune/{id}
*/
const VICO_CLOUD = {
  apiUrl: "",
  provider: "Modal",
  freeCreditsUsd: 30,               // gói Starter của Modal: 30 USD credit miễn phí mỗi tháng, dùng được mọi loại GPU
  creditsPerUsd: 130,               // quy đổi giá thuê GPU sang credit Vico: 1 USD = 130 credit
  cpuPerCoreSec: 0.0000131,         // 1 nhân = 1 nhân vật lý (tương đương 2 vCPU)
  ramPerGiBSec: 0.00000222,
  limits: { cpu: [1, 64], ram: [1, 128], ftGpus: 2 },
  gpus: [
    { id: "T4", name: "NVIDIA T4", vram: 16, perSec: 0.000164, arch: "Turing", note: "Rẻ nhất, hợp để học và thử nghiệm" },
    { id: "L4", name: "NVIDIA L4", vram: 24, perSec: 0.000222, arch: "Ada Lovelace", note: "Tiết kiệm, nhanh hơn T4 nhiều" },
    { id: "A10", name: "NVIDIA A10", vram: 24, perSec: 0.000306, arch: "Ampere", note: "Cân bằng giá và tốc độ" },
    { id: "L40S", name: "NVIDIA L40S", vram: 48, perSec: 0.000542, arch: "Ada Lovelace", note: "48 GB VRAM, hợp model tầm trung" },
    { id: "A100-40GB", name: "NVIDIA A100 40GB", vram: 40, perSec: 0.000583, arch: "Ampere", note: "GPU huấn luyện quen thuộc" },
    { id: "A100-80GB", name: "NVIDIA A100 80GB", vram: 80, perSec: 0.000694, arch: "Ampere", note: "80 GB cho model lớn" },
    { id: "RTX-PRO-6000", name: "NVIDIA RTX PRO 6000", vram: 96, perSec: 0.000842, arch: "Blackwell", note: "96 GB VRAM" },
    { id: "H100", name: "NVIDIA H100", vram: 80, perSec: 0.001097, arch: "Hopper", note: "Rất nhanh cho huấn luyện" },
    { id: "H200", name: "NVIDIA H200", vram: 141, perSec: 0.001261, arch: "Hopper", note: "141 GB bộ nhớ HBM3e" },
    { id: "B200", name: "NVIDIA B200", vram: 180, perSec: 0.001736, arch: "Blackwell", note: "Thế hệ Blackwell" },
    { id: "B300", name: "NVIDIA B300", vram: 288, perSec: 0.001972, arch: "Blackwell Ultra", note: "Mạnh nhất, 288 GB" },
  ],
  vendors: {
    openai: { name: "OpenAI", color: "#10a37f", mark: "O" },
    google: { name: "Google", color: "#4285f4", mark: "G" },
    meta: { name: "Meta", color: "#0866ff", mark: "M" },
    qwen: { name: "Alibaba Qwen", color: "#615ced", mark: "Q" },
    microsoft: { name: "Microsoft", color: "#00a4ef", mark: "Ms" },
    mistral: { name: "Mistral AI", color: "#fa520f", mark: "Mi" },
    deepseek: { name: "DeepSeek", color: "#4d6bfe", mark: "D" },
    ibm: { name: "IBM", color: "#0f62fe", mark: "I" },
    liquid: { name: "Liquid AI", color: "#7c3aed", mark: "L" },
    hf: { name: "Hugging Face", color: "#f59e0b", mark: "H" },
  },
  // Repo trọng số gốc trên Hugging Face (đã kiểm tra 2026-10-16). gated: phải đồng ý giấy phép trên Hugging Face trước khi tải.
  ftModels: [
    { id: "gpt-oss-20b", vendor: "openai", name: "gpt-oss 20B", repo: "openai/gpt-oss-20b", params: 20.91, license: "Apache 2.0" },
    { id: "gpt-oss-120b", vendor: "openai", name: "gpt-oss 120B", repo: "openai/gpt-oss-120b", params: 116.83, license: "Apache 2.0" },
    { id: "gemma-4-31b", vendor: "google", name: "Gemma 4 31B", repo: "google/gemma-4-31B-it", params: 31.27, license: "Apache 2.0" },
    { id: "gemma-4-12b", vendor: "google", name: "Gemma 4 12B", repo: "google/gemma-4-12B-it", params: 11.96, license: "Apache 2.0" },
    { id: "gemma-4-e4b", vendor: "google", name: "Gemma 4 E4B", repo: "google/gemma-4-E4B-it", params: 8.0, license: "Apache 2.0" },
    { id: "gemma-4-e2b", vendor: "google", name: "Gemma 4 E2B", repo: "google/gemma-4-E2B-it", params: 5.12, license: "Apache 2.0" },
    { id: "gemma-3-4b", vendor: "google", name: "Gemma 3 4B", repo: "google/gemma-3-4b-it", params: 4.3, license: "Gemma", gated: true },
    { id: "llama-3.1-8b", vendor: "meta", name: "Llama 3.1 8B", repo: "meta-llama/Llama-3.1-8B-Instruct", params: 8.03, license: "Llama 3.1", gated: true },
    { id: "llama-3.2-3b", vendor: "meta", name: "Llama 3.2 3B", repo: "meta-llama/Llama-3.2-3B-Instruct", params: 3.21, license: "Llama 3.2", gated: true },
    { id: "llama-3.2-1b", vendor: "meta", name: "Llama 3.2 1B", repo: "meta-llama/Llama-3.2-1B-Instruct", params: 1.24, license: "Llama 3.2", gated: true },
    { id: "qwen3.8-27b", vendor: "qwen", name: "Qwen3.8 27B", repo: "Qwen/Qwen3.8-27B", params: 27.78, license: "Apache 2.0" },
    { id: "qwen3.5-9b", vendor: "qwen", name: "Qwen3.5 9B", repo: "Qwen/Qwen3.5-9B", params: 9.65, license: "Apache 2.0" },
    { id: "qwen3.5-4b", vendor: "qwen", name: "Qwen3.5 4B", repo: "Qwen/Qwen3.5-4B", params: 4.66, license: "Apache 2.0" },
    { id: "qwen3.5-2b", vendor: "qwen", name: "Qwen3.5 2B", repo: "Qwen/Qwen3.5-2B", params: 2.27, license: "Apache 2.0" },
    { id: "qwen3.5-0.8b", vendor: "qwen", name: "Qwen3.5 0.8B", repo: "Qwen/Qwen3.5-0.8B", params: 0.87, license: "Apache 2.0" },
    { id: "phi-4", vendor: "microsoft", name: "Phi-4 14B", repo: "microsoft/phi-4", params: 14.66, license: "MIT" },
    { id: "phi-4-mini", vendor: "microsoft", name: "Phi-4 mini", repo: "microsoft/Phi-4-mini-instruct", params: 3.84, license: "MIT" },
    { id: "ministral-3-14b", vendor: "mistral", name: "Ministral 3 14B", repo: "mistralai/Ministral-3-14B-Instruct-2512", params: 13.95, license: "Apache 2.0" },
    { id: "ministral-3-8b", vendor: "mistral", name: "Ministral 3 8B", repo: "mistralai/Ministral-3-8B-Instruct-2512", params: 8.92, license: "Apache 2.0" },
    { id: "ministral-3-3b", vendor: "mistral", name: "Ministral 3 3B", repo: "mistralai/Ministral-3-3B-Instruct-2512", params: 3.85, license: "Apache 2.0" },
    { id: "deepseek-r1-qwen3-8b", vendor: "deepseek", name: "DeepSeek R1 0528 Qwen3 8B", repo: "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B", params: 8.19, license: "MIT" },
    { id: "granite-4.2-8b", vendor: "ibm", name: "Granite 4.2 8B", repo: "ibm-granite/granite-4.2-8b", params: 8.79, license: "Apache 2.0" },
    { id: "granite-4.2-3b", vendor: "ibm", name: "Granite 4.2 3B", repo: "ibm-granite/granite-4.2-3b", params: 3.66, license: "Apache 2.0" },
    { id: "lfm2.5-1.2b", vendor: "liquid", name: "LFM2.5 1.2B", repo: "LiquidAI/LFM2.5-1.2B-Instruct", params: 1.17, license: "LFM Open" },
    { id: "smollm3-3b", vendor: "hf", name: "SmolLM3 3B", repo: "HuggingFaceTB/SmolLM3-3B", params: 3.08, license: "Apache 2.0" },
  ],
  // VRAM cần (GB) theo cách tinh chỉnh, p = tỷ tham số. Ước tính thường dùng: full ~16 byte/tham số (bf16 + AdamW),
  // LoRA giữ model bf16 (~2 byte) + adapter, QLoRA nén model 4-bit (~0,6 byte). Cộng thêm phần kích hoạt / đệm.
  ftMethods: [
    { id: "lora", name: "LoRA 16-bit", desc: "Giữ nguyên model, học thêm adapter nhỏ. Chất lượng tốt, phổ biến nhất.", need: (p) => p * 2.2 + 4 },
    { id: "qlora", name: "QLoRA 4-bit", desc: "Nén model 4-bit rồi học adapter. Tốn ít VRAM nhất.", need: (p) => p * 0.7 + 3 },
    { id: "full", name: "Full fine-tune", desc: "Cập nhật toàn bộ trọng số. Mạnh nhất nhưng tốn nhiều VRAM và tiền nhất.", need: (p) => p * 16 + 6 },
  ],
};

/* ---------- Gói dữ liệu train có sẵn (Thuê máy chủ > Finetune) ----------
   type: code | chat · lang: vi | en | mix (Việt/Anh).
   samples: mẫu viết sẵn trong app (xem trước + chạy demo). sources: bộ dữ liệu công khai trên Hugging Face
   (đã kiểm tra 2026-10-17, không bị khoá) - máy chủ lấy ngẫu nhiên đủ số mẫu bạn chọn từ các nguồn này khi train thật. */
const VICO_TRAIN_PACKS = (() => {
  const SRC = {
    viMulti: { repo: "5CD-AI/Vietnamese-Multi-turn-Chat-Alpaca", note: "Hội thoại nhiều lượt tiếng Việt", license: "Apache 2.0" },
    viSelf: { repo: "bkai-foundation-models/vi-self-chat-sharegpt-format", note: "30.399 hội thoại tiếng Việt (ShareGPT)", license: "chưa ghi" },
    viAlpaca: { repo: "saillab/alpaca-vietnamese-cleaned", note: "Câu lệnh – trả lời tiếng Việt đã làm sạch (100K–1M mẫu)", license: "chưa ghi" },
    enChat: { repo: "HuggingFaceH4/ultrachat_200k", note: "515.311 hội thoại tiếng Anh chất lượng cao", license: "MIT" },
    enviChat: { repo: "longphann/sharegpt_instructions_small_en_vi_answers", note: "424 mẫu hỏi tiếng Anh – trả lời tiếng Việt", license: "chưa ghi" },
    viCode: { repo: "PeterPaker123/vietnamese-code-dataset", note: "8.934 bài lập trình giải thích bằng tiếng Việt", license: "chưa ghi" },
    viCodeCot: { repo: "5CD-AI/Vietnamese-mabryCodes-tiny-cot-alpaca-gg-translated", note: "Bài code có suy luận từng bước, dịch sang tiếng Việt", license: "chưa ghi" },
    enCode18k: { repo: "iamtarun/python_code_instructions_18k_alpaca", note: "18.612 bài Python tiếng Anh", license: "chưa ghi" },
    enCode122k: { repo: "TokenBender/code_instructions_122k_alpaca_style", note: "Khoảng 122 nghìn bài code nhiều ngôn ngữ", license: "Apache 2.0" },
  };
  const F = "```";
  const CHAT_VI = [
    ["Chào bạn, hôm nay mình hơi mệt.", "Chào bạn! Nghe bạn nói mệt mình cũng thấy thương ghê. Bạn mệt vì công việc, học hành hay thiếu ngủ vậy? Nếu được, bạn thử nghỉ tay vài phút, uống một cốc nước ấm rồi kể mình nghe nhé."],
    ["Gợi ý giúp mình món ăn tối nhanh gọn cho 2 người.", "Bạn thử món trứng chiên cà chua với canh rau cải nhé: chỉ khoảng 20 phút. Chuẩn bị 4 quả trứng, 2 quả cà chua, một bó rau cải và hành lá. Cà chua xào mềm rồi đổ trứng đã đánh vào, nêm chút nước mắm; rau cải nấu với nước sôi và chút muối là xong."],
    ["Viết giúp mình lời chúc sinh nhật cho mẹ.", "Mẹ ơi, chúc mừng sinh nhật mẹ! Cảm ơn mẹ vì bao năm tháng tảo tần, luôn là chỗ dựa vững chắc nhất của con. Con chúc mẹ thật nhiều sức khoẻ, lúc nào cũng vui vẻ và an yên. Con yêu mẹ nhiều lắm!"],
    ["Làm sao để bớt trì hoãn công việc?", "Bạn có thể thử ba cách đơn giản:\n1. Chia việc lớn thành những bước nhỏ làm được trong 10–15 phút.\n2. Dùng phương pháp Pomodoro: tập trung 25 phút, nghỉ 5 phút.\n3. Làm việc khó nhất vào đầu ngày, lúc đầu óc còn tỉnh táo.\nQuan trọng là bắt đầu, dù chỉ một chút."],
    ["Giải thích lãi suất kép dễ hiểu giúp mình.", "Lãi suất kép là \"lãi mẹ đẻ lãi con\": tiền lãi kỳ này được cộng vào gốc để tính lãi cho kỳ sau. Ví dụ gửi 10 triệu với lãi 6%/năm: sau năm đầu có 10,6 triệu, năm thứ hai lãi được tính trên 10,6 triệu nên thành khoảng 11,24 triệu. Thời gian càng dài, khoản tiền tăng càng nhanh."],
    ["Mình nên học tiếng Anh giao tiếp bắt đầu từ đâu?", "Bạn nên bắt đầu từ nghe và nói những câu thông dụng hằng ngày: chào hỏi, giới thiệu bản thân, hỏi đường, gọi món. Mỗi ngày nghe 15 phút podcast chậm, nhại lại theo người nói và tập nói một mình trước gương. Đừng ngại sai, cứ nói nhiều là sẽ quen."],
    ["Cửa hàng mình bán áo, khách chê giá cao thì trả lời sao cho khéo?", "Bạn có thể trả lời: \"Dạ em hiểu ạ. Áo bên em dùng vải cotton 100% dày dặn, đường may kỹ nên mặc lâu vẫn giữ form. Nếu anh/chị lấy từ 2 áo, em xin giảm 10% và miễn phí giao hàng ạ.\" Nhấn vào giá trị sản phẩm rồi đưa ra một ưu đãi nhỏ sẽ dễ chốt đơn hơn."],
    ["Tóm tắt giúp mình ý chính của câu \"Có công mài sắt có ngày nên kim\".", "Câu tục ngữ khuyên chúng ta kiên trì: dù việc khó đến đâu, nếu bền bỉ cố gắng từng chút một thì cuối cùng cũng sẽ thành công."],
  ];
  const CHAT_EN = [
    ["Hi! Can you help me plan a weekend trip?", "Of course! Tell me where you're starting from, your budget and what you enjoy most, like beaches, food or hiking, and I'll suggest a simple two-day plan."],
    ["How do I politely decline a meeting?", "You could write: \"Thank you for the invitation. Unfortunately I have a conflict at that time. Could we find another slot, or could you share the notes afterwards?\" It's short, polite and keeps the door open."],
    ["Explain photosynthesis in one paragraph.", "Photosynthesis is the process plants use to turn sunlight into food. Using chlorophyll in their leaves, they absorb light energy and combine carbon dioxide from the air with water from the soil to make glucose, releasing oxygen as a by-product."],
    ["Give me three tips to sleep better.", "1. Keep a fixed bedtime and wake-up time, even on weekends.\n2. Avoid screens for 30 minutes before bed.\n3. Keep your bedroom cool, dark and quiet."],
    ["What's a good way to start learning to cook?", "Start with five simple dishes you actually like to eat, such as fried rice, an omelette, pasta, a salad and a soup. Cook each one a few times until it feels easy, then change one ingredient at a time to experiment."],
  ];
  const CODE_VI = [
    ["Viết hàm Python kiểm tra một số có phải số nguyên tố không.",
      "Ý tưởng: số nguyên tố là số lớn hơn 1 và chỉ chia hết cho 1 và chính nó. Ta chỉ cần thử chia đến căn bậc hai của n.\n\n" + F + "python\ndef la_so_nguyen_to(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i += 1\n    return True\n\nprint(la_so_nguyen_to(17))  # True\n" + F + "\n\nĐộ phức tạp là O(√n), đủ nhanh cho các số vừa phải."],
    ["Đảo ngược một chuỗi trong JavaScript thế nào?",
      "Cách ngắn gọn nhất là tách chuỗi thành mảng ký tự, đảo mảng rồi nối lại:\n\n" + F + "javascript\nconst daoChuoi = (s) => [...s].reverse().join(\"\");\nconsole.log(daoChuoi(\"Xin chào\")); // \"oàhc niX\"\n" + F + "\n\nDùng `[...s]` thay cho `s.split(\"\")` để giữ đúng các ký tự có dấu và emoji."],
    ["Câu lệnh SQL lấy 5 khách hàng mua nhiều tiền nhất.",
      "Ta cộng tổng tiền theo từng khách, sắp xếp giảm dần rồi lấy 5 dòng đầu:\n\n" + F + "sql\nSELECT khach_hang_id, SUM(tong_tien) AS tong_chi_tieu\nFROM don_hang\nGROUP BY khach_hang_id\nORDER BY tong_chi_tieu DESC\nLIMIT 5;\n" + F],
    ["Code Python bị lỗi IndexError: list index out of range, nghĩa là gì?",
      "Lỗi này xảy ra khi bạn truy cập vị trí không tồn tại trong danh sách. Ví dụ danh sách có 3 phần tử thì chỉ số hợp lệ là 0, 1, 2; gọi `ds[3]` sẽ báo lỗi. Hãy kiểm tra điều kiện vòng lặp, thường là dùng `range(len(ds))` thay vì `range(len(ds) + 1)`, hoặc kiểm tra `if i < len(ds)` trước khi truy cập."],
    ["Viết nút bấm HTML đổi màu nền trang khi click.",
      "Dùng một nút và một đoạn JavaScript nhỏ đổi thuộc tính `background` của trang:\n\n" + F + "html\n<button id=\"doiMau\">Đổi màu</button>\n<script>\n  const mau = [\"#fef3c7\", \"#dcfce7\", \"#dbeafe\", \"#fce7f3\"];\n  let i = 0;\n  document.getElementById(\"doiMau\").onclick = () => {\n    i = (i + 1) % mau.length;\n    document.body.style.background = mau[i];\n  };\n</script>\n" + F],
    ["Giải thích async/await trong JavaScript ngắn gọn.",
      "`async/await` giúp viết code bất đồng bộ trông như code tuần tự. Hàm có `async` luôn trả về Promise; bên trong, `await` tạm dừng hàm cho tới khi Promise xong rồi lấy kết quả.\n\n" + F + "javascript\nasync function layDuLieu() {\n  const res = await fetch(\"/api/san-pham\");\n  return res.json();\n}\n" + F + "\n\nNhớ bọc trong `try/catch` để bắt lỗi mạng."],
  ];
  const CODE_EN = [
    ["Write a Python function that returns the n-th Fibonacci number.",
      "An iterative version avoids deep recursion:\n\n" + F + "python\ndef fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint(fib(10))  # 55\n" + F],
    ["How do I remove duplicates from an array in JavaScript?",
      "Use a Set, which only keeps unique values:\n\n" + F + "javascript\nconst unique = (arr) => [...new Set(arr)];\nconsole.log(unique([1, 2, 2, 3])); // [1, 2, 3]\n" + F],
    ["Write a SQL query to count orders per day.",
      F + "sql\nSELECT DATE(created_at) AS day, COUNT(*) AS orders\nFROM orders\nGROUP BY DATE(created_at)\nORDER BY day;\n" + F],
    ["What does the Python error 'KeyError' mean?",
      "A KeyError means you tried to read a dictionary key that doesn't exist. Use `d.get(key)` to return None instead, or check `if key in d` first."],
  ];
  const MIX = [
    ["Dịch sang tiếng Anh: \"Cảm ơn bạn đã giúp đỡ mình rất nhiều.\"", "Thank you so much for helping me."],
    ["What is \"phở\"? Trả lời bằng tiếng Việt giúp mình.", "Phở là món ăn truyền thống của Việt Nam, gồm bánh phở mềm, nước dùng ninh từ xương bò hoặc gà, ăn kèm thịt thái mỏng, hành, rau thơm, chanh và ớt."],
    ["Giải thích từ \"deadline\" và cho ví dụ.", "\"Deadline\" nghĩa là hạn chót phải hoàn thành một việc. Ví dụ: \"The deadline for the report is Friday\" - hạn nộp báo cáo là thứ Sáu."],
  ];
  const MIX_CODE = [
    ["Explain this function in Vietnamese: def avg(xs): return sum(xs) / len(xs)", "Hàm `avg` tính trung bình cộng của danh sách `xs`: cộng tất cả phần tử bằng `sum(xs)` rồi chia cho số phần tử `len(xs)`. Lưu ý nếu danh sách rỗng sẽ báo lỗi chia cho 0, nên cần kiểm tra trước."],
    ["Đặt tên biến tiếng Anh cho \"tổng số lượng sản phẩm\".", "Bạn có thể dùng `totalProductCount` (camelCase, hợp JavaScript/Java) hoặc `total_product_count` (snake_case, hợp Python)."],
  ];
  const pack = (title, desc, sources, samples) => ({ title, desc, sources: sources.map((k) => SRC[k]), samples });
  return {
    chat: {
      vi: pack("Gói Chat tiếng Việt", "Dạy AI trò chuyện tự nhiên, lễ phép và gần gũi theo văn phong người Việt: hỏi đáp đời sống, tư vấn, viết lời chúc, chăm sóc khách hàng.", ["viMulti", "viSelf", "viAlpaca"], CHAT_VI),
      en: pack("Gói Chat tiếng Anh", "Dạy AI trò chuyện tiếng Anh trôi chảy, lịch sự, trả lời rõ ràng cho các câu hỏi hằng ngày.", ["enChat"], CHAT_EN),
      mix: pack("Gói Chat Việt/Anh", "AI hiểu cả hai thứ tiếng: trả lời đúng ngôn ngữ người dùng hỏi, dịch qua lại tự nhiên, giải thích từ tiếng Anh bằng tiếng Việt.", ["viMulti", "viSelf", "enChat", "enviChat"], [...CHAT_VI.slice(0, 4), ...CHAT_EN.slice(0, 3), ...MIX]),
    },
    code: {
      vi: pack("Gói Code tiếng Việt", "Dạy AI viết code và giải thích bằng tiếng Việt dễ hiểu: Python, JavaScript, SQL, HTML, sửa lỗi và giải thích từng bước.", ["viCode", "viCodeCot"], CODE_VI),
      en: pack("Gói Code tiếng Anh", "Dạy AI viết code theo yêu cầu tiếng Anh, nhiều ngôn ngữ lập trình, trả lời ngắn gọn kèm ví dụ.", ["enCode18k", "enCode122k"], CODE_EN),
      mix: pack("Gói Code Việt/Anh", "AI nhận yêu cầu tiếng Việt hoặc tiếng Anh, viết code chuẩn và giải thích bằng tiếng Việt, đặt tên biến tiếng Anh đúng chuẩn.", ["viCode", "viCodeCot", "enCode18k", "enCode122k"], [...CODE_VI.slice(0, 4), ...CODE_EN.slice(0, 2), ...MIX_CODE]),
    },
    sizes: [1000, 5000, 20000],
  };
})();
