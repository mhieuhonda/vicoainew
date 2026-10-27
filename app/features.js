/* =========================================================
   TÍNH NĂNG THÊM - Vico AI (nạp sau app.js)
   Cài đặt, cá nhân hoá & bộ nhớ, lịch sử credit, mã giới thiệu,
   file đính kèm (ảnh/PDF/văn bản), nói để nhập, tìm lịch sử, phím tắt.
   ========================================================= */

/* ---------- Cài đặt & bộ nhớ theo tài khoản ---------- */
const SETTINGS_DEFAULT = { ...settings };
let memories = [];
function loadPrefs() {
  settings = { ...SETTINGS_DEFAULT, ...loadKey(uk("vico_settings"), {}) };
  memories = loadKey(uk("vico_memory"), []);
  updateSend();
}
const savePrefs = () => saveKey(uk("vico_settings"), settings);
const saveMemories = () => saveKey(uk("vico_memory"), memories);
loadPrefs();

/** Phần cá nhân hoá gửi kèm cho AI (config.js gọi trong buildSystemPrompt). */
function personalPrompt() {
  const parts = [];
  if (settings.replyLang === "vi") parts.push("Luôn trả lời bằng tiếng Việt.");
  if (settings.replyLang === "en") parts.push("Always reply in English.");
  if (settings.aboutMe.trim()) parts.push("Thông tin người dùng muốn bạn biết:\n" + settings.aboutMe.trim());
  if (settings.replyStyle.trim()) parts.push("Cách người dùng muốn bạn trả lời:\n" + settings.replyStyle.trim());
  if (settings.memoryOn && memories.length) parts.push("Những điều cần ghi nhớ về người dùng:\n" + memories.map((m) => "- " + m.text).join("\n"));
  return parts.join("\n\n");
}

/* Giao diện theo hệ thống */
const darkMq = matchMedia("(prefers-color-scheme: dark)");
function applyThemePref() {
  const pref = loadKey("vico_theme_pref", null);
  if (pref === "system") setTheme(darkMq.matches ? "dark" : "light");
}
darkMq.addEventListener("change", applyThemePref);
applyThemePref();
$("#themeToggle").addEventListener("click", () => saveKey("vico_theme_pref", document.documentElement.dataset.theme));

/* ---------- Khung Cài đặt ---------- */
const stModal = $("#settingsModal");
let stTab = "general";
const settingsExtras = { general: [], personal: [], credit: [], data: [] };
/** Bản desktop (desktop.js) thêm mục cài đặt riêng: registerSettingsSection("general", () => ({ html, bind })) */
function registerSettingsSection(tab, render) { settingsExtras[tab].push(render); }

function openSettings(tab = "general") {
  closePops();
  stModal.hidden = false;
  showSettingsTab(tab);
}
const closeSettings = () => (stModal.hidden = true);
stModal.addEventListener("click", (e) => {
  const t = e.target.closest("[data-st]");
  if (t) showSettingsTab(t.dataset.st);
  if (e.target.closest("[data-close]")) closeSettings();
});
stModal.addEventListener("mousedown", (e) => { if (e.target === stModal) closeSettings(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !stModal.hidden) closeSettings(); });
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-open-settings]");
  if (b) openSettings(b.dataset.openSettings);
});

const toggleRow = (key, title, desc) => `
  <label class="st-row st-toggle">
    <span><b>${title}</b>${desc ? `<small>${desc}</small>` : ""}</span>
    <input type="checkbox" data-set="${key}" ${settings[key] ? "checked" : ""} /><i class="sw"></i>
  </label>`;
const needLogin = (what) => `<div class="st-empty"><p>Đăng nhập để ${what}.</p><button class="btn-primary sm" data-login>Đăng nhập</button></div>`;

function showSettingsTab(tab) {
  stTab = tab;
  stModal.querySelectorAll("[data-st]").forEach((b) => b.setAttribute("aria-selected", b.dataset.st === tab));
  const body = $("#stBody");
  const extras = settingsExtras[tab].map((r) => r());
  body.innerHTML = ({ general: stGeneral, personal: stPersonal, credit: stCredit, data: stData })[tab]() +
    extras.map((x) => x.html).join("");
  body.scrollTop = 0;
  bindSettings(body);
  extras.forEach((x) => x.bind && x.bind(body));
}

function stGeneral() {
  const pref = loadKey("vico_theme_pref", document.documentElement.dataset.theme);
  const seg = (v, label) => `<button type="button" class="${pref === v ? "on" : ""}" data-theme-pref="${v}">${label}</button>`;
  return `
    <h4>Chung</h4>
    <div class="st-row"><span><b>Giao diện</b></span><div class="st-seg">${seg("light", "Sáng")}${seg("dark", "Tối")}${seg("system", "Theo máy")}</div></div>
    <div class="st-row"><span><b>Ngôn ngữ trả lời</b><small>AI trả lời theo ngôn ngữ này</small></span>
      <select data-set-select="replyLang">
        <option value="auto"${settings.replyLang === "auto" ? " selected" : ""}>Tự động theo câu hỏi</option>
        <option value="vi"${settings.replyLang === "vi" ? " selected" : ""}>Tiếng Việt</option>
        <option value="en"${settings.replyLang === "en" ? " selected" : ""}>English</option>
      </select></div>
    ${toggleRow("stream", "Hiện chữ chạy dần", "Câu trả lời hiện dần từng chữ thay vì chờ xong mới hiện")}
    ${toggleRow("enterToSend", "Nhấn Enter để gửi", "Tắt: Enter để xuống dòng, Ctrl + Enter để gửi")}
    ${toggleRow("notify", "Thông báo khi AI trả lời xong", "Hiện thông báo của máy khi bạn đang ở cửa sổ khác")}
    <h4>Phím tắt</h4>
    <div class="st-keys">
      <span><kbd>Enter</kbd> Gửi tin</span><span><kbd>Shift</kbd>+<kbd>Enter</kbd> Xuống dòng</span>
      <span><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>O</kbd> Phiên chat mới</span><span><kbd>Ctrl</kbd>+<kbd>K</kbd> Tìm đoạn chat</span>
      <span><kbd>Esc</kbd> Dừng câu trả lời</span><span><kbd>@</kbd> Gọi AI trong Group AI</span>
    </div>`;
}

function stPersonal() {
  return `
    <h4>Hướng dẫn tuỳ chỉnh</h4>
    <label class="st-field"><span>Vico AI nên biết gì về bạn?</span>
      <textarea data-set-text="aboutMe" rows="3" maxlength="1500" placeholder="Ví dụ: Mình là sinh viên năm 2 ngành CNTT, đang học lập trình web.">${escapeHtml(settings.aboutMe)}</textarea></label>
    <label class="st-field"><span>Bạn muốn Vico AI trả lời thế nào?</span>
      <textarea data-set-text="replyStyle" rows="3" maxlength="1500" placeholder="Ví dụ: Ngắn gọn, đi thẳng vào ý chính, có ví dụ code khi cần.">${escapeHtml(settings.replyStyle)}</textarea></label>
    <small class="st-saved" id="stSaved"></small>
    <h4>Bộ nhớ</h4>
    ${toggleRow("memoryOn", "Dùng bộ nhớ", "AI dùng những điều dưới đây trong mọi đoạn chat")}
    <form class="st-mem-add" id="memAdd"><input id="memInput" maxlength="300" placeholder="Thêm điều AI nên nhớ, ví dụ: Mình thích giao diện tối giản" /><button class="btn-primary sm">Thêm</button></form>
    <div class="st-mems">${memories.length ? memories.map((m, i) => `
      <div class="st-mem"><span>${escapeHtml(m.text)}</span><button class="icon-btn" data-mem-del="${i}" title="Xoá">${icon("trash", 15)}</button></div>`).join("")
      : `<p class="st-muted">Chưa có gì trong bộ nhớ.</p>`}</div>
    ${memories.length ? `<button class="btn-ghost sm danger-text" id="memClear">Xoá toàn bộ bộ nhớ</button>` : ""}`;
}

function stCredit() {
  if (!user) return `<h4>Credit</h4>` + needLogin("xem credit");
  user = VicoAuth.current();
  const log = VicoAuth.history();
  // Credit đã dùng trong 7 ngày gần nhất
  const days = [...Array(7)].map((_, k) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - k));
    return { start: +d, end: +d + 86400000, label: k === 6 ? "Hôm nay" : d.toLocaleDateString("vi-VN", { weekday: "short" }), used: 0 };
  });
  log.forEach((e) => {
    if (e.kind !== "spend" && e.kind !== "refund") return;
    const d = days.find((x) => e.t >= x.start && e.t < x.end);
    if (d) d.used -= e.amount; // spend âm, refund dương
  });
  const max = Math.max(1, ...days.map((d) => d.used));
  const KIND = { spend: "Sử dụng", refund: "Hoàn lại", bonus: "Tặng", daily: "Làm mới", referral: "Giới thiệu", plan: "Gói" };
  return `
    <h4>Credit</h4>
    <div class="st-credit-sum">
      <div><small>Tổng</small><b>${fmt(user.total)}</b></div>
      <div><small>Credit ngày</small><b>${fmt(user.daily)} / ${fmt(user.dailyMax)}</b></div>
      <div><small>Credit tặng</small><b>${fmt(user.bonus)}</b></div>
    </div>
    <div class="st-chart" aria-label="Credit đã dùng 7 ngày gần nhất">${days.map((d) => `
      <div class="st-bar"><span class="st-bar-v">${d.used ? fmt(d.used) : ""}</span><span class="st-bar-track"><i style="height:${d.used ? Math.max(4, (d.used / max) * 100) : 0}%"></i></span><small>${d.label}</small></div>`).join("")}</div>
    ${typeof planCardHtml === "function" ? planCardHtml() : ""}
    <h4>Mã giới thiệu</h4>
    <div class="st-ref">
      <div class="st-ref-code"><code>${user.refCode}</code><button class="btn-ghost sm" data-copy-ref>Sao chép</button></div>
      <small>Bạn bè nhập mã này khi tạo tài khoản thì cả hai được tặng ${fmt(VICO_CREDITS.referralBonus)} credit. Đã giới thiệu: ${fmt(user.referrals)} người.</small>
      ${user.referredBy ? `<small>Bạn đã dùng mã giới thiệu ${user.referredBy}.</small>`
        : `<form class="st-mem-add" id="refForm"><input id="refInput" maxlength="12" placeholder="Nhập mã giới thiệu của bạn bè" /><button class="btn-primary sm">Áp dụng</button></form>`}
    </div>
    <h4>Lịch sử</h4>
    <div class="st-log">${log.length ? log.slice(0, 80).map((e) => `
      <div class="st-log-row"><span class="st-log-kind k-${e.kind}">${KIND[e.kind] || e.kind}</span>
        <span class="st-log-note">${escapeHtml(e.note || "")}<small>${new Date(e.t).toLocaleString("vi-VN")}</small></span>
        <b class="${e.amount < 0 ? "neg" : "pos"}">${e.amount > 0 ? "+" : ""}${fmt(e.amount)}</b></div>`).join("")
      : `<p class="st-muted">Chưa có giao dịch nào.</p>`}</div>`;
}

function stData() {
  return `
    <h4>Dữ liệu</h4>
    <p class="st-muted" id="stStorage">Đang tính dung lượng…</p>
    <div class="st-row"><span><b>Xuất toàn bộ dữ liệu</b><small>Đoạn chat, dự án, cài đặt, bộ nhớ (file JSON)</small></span><button class="btn-ghost sm" id="dataExport">Xuất</button></div>
    <div class="st-row"><span><b>Nhập dữ liệu</b><small>Khôi phục từ file đã xuất (gộp với dữ liệu hiện có)</small></span><button class="btn-ghost sm" id="dataImport">Nhập</button><input type="file" id="dataImportInput" accept=".json,application/json" hidden /></div>
    <div class="st-row"><span><b>Xoá toàn bộ đoạn chat</b><small>Không thể khôi phục</small></span><button class="btn-ghost sm danger-text" id="dataClear">Xoá</button></div>
    ${VicoAuth.exportData && user ? `<h4>Dữ liệu trên máy chủ Vico</h4>
    <p class="st-muted">Theo Chính sách quyền riêng tư, bạn có quyền xem, tải về và yêu cầu xoá dữ liệu cá nhân. Tin nhắn trên máy chủ được tự xoá sau 12 tháng.</p>
    <div class="st-row"><span><b>Tải dữ liệu của tôi</b><small>Tài khoản, lịch sử credit, tin nhắn lưu trên máy chủ (file JSON)</small></span><button class="btn-ghost sm" id="srvExport">Tải về</button></div>
    <div class="st-row"><span><b>Xoá tài khoản</b><small>Xoá vĩnh viễn tài khoản, credit, gói Pro và mọi tin nhắn trên máy chủ</small></span><button class="btn-ghost sm danger-text" id="srvDelete">Xoá tài khoản</button></div>` : ""}
    <p class="st-muted st-legal"><a href="terms.html" target="_blank" rel="noopener">Điều khoản sử dụng</a> · <a href="privacy.html" target="_blank" rel="noopener">Chính sách quyền riêng tư</a></p>`;
}

let savedTimer;
function bindSettings(body) {
  body.querySelectorAll("[data-set]").forEach((inp) => (inp.onchange = async () => {
    const key = inp.dataset.set;
    if (key === "notify" && inp.checked) {
      if (!("Notification" in window)) { inp.checked = false; return showToast("Máy không hỗ trợ thông báo.", "warn"); }
      const perm = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (perm !== "granted") { inp.checked = false; return showToast("Bạn chưa cho phép thông báo trong trình duyệt.", "warn"); }
    }
    settings[key] = inp.checked;
    savePrefs();
  }));
  body.querySelectorAll("[data-set-select]").forEach((sel) => (sel.onchange = () => { settings[sel.dataset.setSelect] = sel.value; savePrefs(); }));
  body.querySelectorAll("[data-set-text]").forEach((ta) => (ta.oninput = () => {
    settings[ta.dataset.setText] = ta.value;
    savePrefs();
    const s = $("#stSaved");
    if (s) { s.textContent = "Đã lưu"; clearTimeout(savedTimer); savedTimer = setTimeout(() => (s.textContent = ""), 1200); }
  }));
  body.querySelectorAll("[data-theme-pref]").forEach((b) => (b.onclick = () => {
    const v = b.dataset.themePref;
    saveKey("vico_theme_pref", v);
    if (v === "system") applyThemePref(); else setTheme(v);
    showSettingsTab("general");
  }));
  const login = body.querySelector("[data-login]");
  if (login) login.onclick = () => { closeSettings(); openAuth("login"); };
  // Bộ nhớ
  const memAdd = body.querySelector("#memAdd");
  if (memAdd) memAdd.onsubmit = (e) => {
    e.preventDefault();
    const t = $("#memInput").value.trim();
    if (!t) return;
    memories.push({ text: t, t: Date.now() });
    saveMemories();
    showSettingsTab("personal");
    setTimeout(() => $("#memInput") && $("#memInput").focus(), 30);
  };
  body.querySelectorAll("[data-mem-del]").forEach((b) => (b.onclick = () => { memories.splice(+b.dataset.memDel, 1); saveMemories(); showSettingsTab("personal"); }));
  const memClear = body.querySelector("#memClear");
  if (memClear) memClear.onclick = () => { if (confirm("Xoá toàn bộ bộ nhớ?")) { memories = []; saveMemories(); showSettingsTab("personal"); } };
  // Credit
  const copyRef = body.querySelector("[data-copy-ref]");
  if (copyRef) copyRef.onclick = () => copyText(user.refCode);
  const refForm = body.querySelector("#refForm");
  if (refForm) refForm.onsubmit = async (e) => {
    e.preventDefault();
    try {
      user = await VicoAuth.redeemReferral($("#refInput").value);
      renderAuth();
      showToast(`Đã áp dụng mã! Bạn được tặng ${fmt(VICO_CREDITS.referralBonus)} credit.`, "success");
      showSettingsTab("credit");
    } catch (err) { showToast(err.message, "warn"); }
  };
  if (typeof bindPlanCard === "function") bindPlanCard(body); // gói Pro (pro.js)
  // Dữ liệu
  const st = body.querySelector("#stStorage");
  if (st) {
    const n = chats.length, msgs = chats.reduce((s, c) => s + c.messages.length, 0);
    (navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve({}))
      .then((e) => { st.textContent = `${fmt(n)} đoạn chat · ${fmt(msgs)} tin nhắn` + (e.usage ? ` · đang dùng ${fmtSize(e.usage)} trên máy` : ""); })
      .catch(() => { st.textContent = `${fmt(n)} đoạn chat · ${fmt(msgs)} tin nhắn`; });
  }
  const exp = body.querySelector("#dataExport");
  if (exp) exp.onclick = () => {
    const data = { app: "vico-ai", version: 1, exportedAt: new Date().toISOString(), user: user ? user.username : null, chats, projects, settings, memories, groups: loadKey(uk("vico_groups"), []) };
    downloadFile({ name: `vico-ai-du-lieu-${new Date().toISOString().slice(0, 10)}.json`, content: JSON.stringify(data, null, 2) });
  };
  const imp = body.querySelector("#dataImport"), impIn = body.querySelector("#dataImportInput");
  if (imp) {
    imp.onclick = () => impIn.click();
    impIn.onchange = async () => {
      const f = impIn.files[0];
      impIn.value = "";
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (data.app !== "vico-ai" || !Array.isArray(data.chats)) throw new Error("File không phải dữ liệu Vico AI");
        const have = new Set(chats.map((c) => c.id));
        const add = data.chats.filter((c) => c && c.id && Array.isArray(c.messages) && !have.has(c.id));
        chats.push(...add);
        chats.sort((a, b) => (b.messages.at(-1)?.ts || 0) - (a.messages.at(-1)?.ts || 0));
        save();
        if (Array.isArray(data.projects)) {
          const hp = new Set(projects.map((p) => p.id));
          projects.push(...data.projects.filter((p) => p && p.id && !hp.has(p.id)));
          saveKey(uk("vico_projects"), projects);
          renderProjects();
        }
        renderHistory();
        showToast(`Đã nhập ${fmt(add.length)} đoạn chat.`, "success");
        showSettingsTab("data");
      } catch (err) { showToast("Không nhập được: " + err.message, "warn"); }
    };
  }
  const sx = body.querySelector("#srvExport");
  if (sx) sx.onclick = async () => {
    sx.disabled = true;
    try {
      const data = await VicoAuth.exportData();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      a.download = `vico-du-lieu-${user.username}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (err) { showToast(err.message, "warn"); }
    sx.disabled = false;
  };
  const sd = body.querySelector("#srvDelete");
  if (sd) sd.onclick = async () => {
    if (!confirm("Xoá vĩnh viễn tài khoản " + user.username + "? Credit, gói Pro và toàn bộ tin nhắn trên máy chủ sẽ bị xoá, không thể khôi phục.")) return;
    const pw = prompt("Nhập mật khẩu để xác nhận xoá tài khoản:");
    if (!pw) return;
    try {
      await VicoAuth.deleteAccount(pw);
      user = null;
      $("#settingsModal").hidden = true;
      onAuthChanged();
      showToast("Đã xoá tài khoản và dữ liệu trên máy chủ.", "success");
    } catch (err) { showToast(err.message, "warn"); }
  };
  const clr = body.querySelector("#dataClear");
  if (clr) clr.onclick = () => {
    if (!confirm("Xoá toàn bộ đoạn chat? Không thể khôi phục.")) return;
    chats.forEach((c) => c.messages.forEach((m) => (m.attachments || []).forEach((a) => VicoDB.del("files", a.id).catch(() => {}))));
    chats = [];
    currentId = null;
    save();
    newChat();
    showToast("Đã xoá toàn bộ đoạn chat.");
    showSettingsTab("data");
  };
}

/* Đổi tài khoản: nạp cài đặt, bộ nhớ, tài liệu dự án của tài khoản mới */
const baseAuthChangedF = onAuthChanged;
onAuthChanged = () => {
  baseAuthChangedF();
  loadPrefs();
  loadProjectDocsCache();
};

/* ---------- File đính kèm: ảnh, PDF, văn bản / code ---------- */
const TEXT_EXT = /\.(txt|md|csv|json|html?|css|js|mjs|ts|jsx|tsx|py|java|c|cpp|h|cs|go|rs|php|rb|sql|xml|ya?ml|log|ini|toml|sh|ps1|bat)$/i;
const attachInput = $("#attachInput"), chipsBox = $("#attachChips");
const newId = () => "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function kindOf(f) {
  if (/^image\/(png|jpe?g|webp|gif)$/i.test(f.type)) return "image";
  if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) return "pdf";
  if (/^text\//.test(f.type) || /json|xml|javascript/.test(f.type) || TEXT_EXT.test(f.name)) return "text";
  return null;
}
// Ảnh lớn được thu nhỏ (cạnh dài tối đa 1600px) cho nhẹ; luôn tạo ảnh xem trước nhỏ để hiện trong chat
function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob), img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Không đọc được ảnh")); };
    img.src = url;
  });
}
function drawTo(img, max, type) {
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * k));
  c.height = Math.max(1, Math.round(img.naturalHeight * k));
  const ctx = c.getContext("2d");
  if (type === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
async function prepareImage(file) {
  const { img, url } = await loadImage(file);
  try {
    const thumb = drawTo(img, 240, "image/jpeg").toDataURL("image/jpeg", 0.72);
    const big = Math.max(img.naturalWidth, img.naturalHeight) > 1600 || file.size > 1.5 * 1048576;
    if (!big || file.type === "image/gif") return { blob: file, thumb };
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise((r) => drawTo(img, 1600, type).toBlob(r, type, 0.86));
    return { blob: blob || file, thumb };
  } finally { URL.revokeObjectURL(url); }
}
async function addFiles(list) {
  for (const f of [...list]) {
    if (pendingAttachments.length >= VICO_LIMITS.maxAttachments) { showToast(`Mỗi tin đính kèm tối đa ${VICO_LIMITS.maxAttachments} file.`, "warn"); break; }
    const kind = kindOf(f);
    if (!kind) { showToast(`Chưa hỗ trợ loại file "${f.name}". Hãy gửi ảnh, PDF hoặc file văn bản/code.`, "warn"); continue; }
    const limit = kind === "image" ? VICO_LIMITS.imageMaxMB * 1048576 : kind === "pdf" ? VICO_LIMITS.pdfMaxMB * 1048576 : VICO_LIMITS.textMaxKB * 1024;
    if (f.size > limit) { showToast(`"${f.name}" quá lớn (tối đa ${fmtSize(limit)}).`, "warn"); continue; }
    const item = { id: newId(), name: f.name || "anh-dan.png", type: f.type || "text/plain", size: f.size, kind, loading: true };
    pendingAttachments.push(item);
    renderChips();
    try {
      let blob = f;
      if (kind === "image") { const r = await prepareImage(f); blob = r.blob; item.thumb = r.thumb; item.type = blob.type || item.type; item.size = blob.size; }
      await VicoDB.put("files", item.id, blob);
      item.loading = false;
    } catch (err) {
      pendingAttachments = pendingAttachments.filter((x) => x !== item);
      showToast(`Không đính kèm được "${f.name}": ${err.message}`, "warn");
    }
    renderChips();
  }
  updateSend();
}
const chipLabel = (a) => (a.kind === "pdf" ? "PDF" : fileType(a.name).label);
const chipColor = (a) => (a.kind === "pdf" ? "#dc2626" : fileType(a.name).color);
function renderChips() {
  chipsBox.hidden = !pendingAttachments.length;
  chipsBox.innerHTML = pendingAttachments.map((a, i) => `
    <div class="chip${a.loading ? " loading" : ""}" title="${escapeHtml(a.name)}">
      ${a.thumb ? `<img src="${a.thumb}" alt="" />` : `<span class="file-icon sm"><i style="background:${chipColor(a)}">${escapeHtml(chipLabel(a))}</i></span>`}
      <span class="chip-text"><b>${escapeHtml(a.name)}</b><small>${a.loading ? "Đang xử lý…" : fmtSize(a.size)}</small></span>
      <button type="button" class="chip-x" data-chip="${i}" title="Bỏ file này" aria-label="Bỏ ${escapeHtml(a.name)}">×</button>
    </div>`).join("");
  updateSend();
}
chipsBox.addEventListener("click", (e) => {
  const x = e.target.closest("[data-chip]");
  if (!x) return;
  const [a] = pendingAttachments.splice(+x.dataset.chip, 1);
  if (a) VicoDB.del("files", a.id).catch(() => {});
  renderChips();
});
/** Bỏ các file đang chờ gửi. deleteBlobs=false khi file đã được gửi đi (vẫn cần giữ). */
function clearAttachments(deleteBlobs = true) {
  if (deleteBlobs) pendingAttachments.forEach((a) => VicoDB.del("files", a.id).catch(() => {}));
  pendingAttachments = [];
  renderChips();
}
$("#attachBtn").onclick = () => attachInput.click();
attachInput.onchange = () => { addFiles(attachInput.files); attachInput.value = ""; };
els.input.addEventListener("paste", (e) => {
  const files = [...(e.clipboardData ? e.clipboardData.files : [])];
  if (files.length) { e.preventDefault(); addFiles(files); }
});
// Kéo thả file vào cửa sổ
const dropOverlay = $("#dropOverlay");
let dragDepth = 0;
const hasFiles = (e) => [...(e.dataTransfer ? e.dataTransfer.types : [])].includes("Files");
addEventListener("dragenter", (e) => { if (!hasFiles(e)) return; dragDepth++; dropOverlay.hidden = false; });
addEventListener("dragleave", (e) => { if (!hasFiles(e)) return; if (--dragDepth <= 0) { dragDepth = 0; dropOverlay.hidden = true; } });
addEventListener("dragover", (e) => { if (hasFiles(e)) e.preventDefault(); });
addEventListener("drop", (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  dropOverlay.hidden = true;
  addFiles(e.dataTransfer.files);
});

/** Hàng file đính kèm trong tin nhắn đã gửi (app.js gọi khi hiển thị tin). */
function attachRow(atts) {
  return `<div class="msg-atts">${atts.map((a) => {
    const data = `data-att="${a.id}" data-name="${escapeHtml(a.name)}" data-kind="${a.kind}" data-type="${escapeHtml(a.type)}"`;
    return a.kind === "image" && a.thumb
      ? `<button class="att-img" ${data} title="${escapeHtml(a.name)}"><img src="${a.thumb}" alt="${escapeHtml(a.name)}" /></button>`
      : `<button class="att-file" ${data} title="${escapeHtml(a.name)}"><span class="file-icon sm"><i style="background:${chipColor(a)}">${escapeHtml(chipLabel(a))}</i></span>
          <span class="att-text"><b>${escapeHtml(a.name)}</b><small>${fmtSize(a.size)}</small></span></button>`;
  }).join("")}</div>`;
}
els.messages.addEventListener("click", (e) => {
  const b = e.target.closest("[data-att]");
  if (b) openAttachment(b.dataset);
});

/* Khung xem ảnh / PDF */
const lightbox = $("#lightbox");
let lbUrl = null, lbBlob = null, lbName = "";
async function openAttachment({ att, name, kind, type }) {
  let blob;
  try { blob = await VicoDB.get("files", att); } catch {}
  if (!blob) return showToast("File này không còn trên máy (có thể dữ liệu trình duyệt đã bị xoá).", "warn");
  if (kind === "text") return openFilePreview({ name, content: await blob.text(), size: blob.size });
  if (lbUrl) URL.revokeObjectURL(lbUrl);
  lbUrl = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type }));
  lbBlob = blob;
  lbName = name;
  $("#lbName").textContent = `${name} · ${fmtSize(blob.size)}`;
  $("#lbStage").innerHTML = kind === "image" ? `<img src="${lbUrl}" alt="${escapeHtml(name)}" />` : `<iframe src="${lbUrl}" title="${escapeHtml(name)}"></iframe>`;
  lightbox.hidden = false;
}
function closeLightbox() {
  lightbox.hidden = true;
  $("#lbStage").innerHTML = "";
  if (lbUrl) URL.revokeObjectURL(lbUrl);
  lbUrl = lbBlob = null;
}
lightbox.addEventListener("click", (e) => { if (e.target === lightbox || e.target.closest("[data-close]") || e.target.id === "lbStage") closeLightbox(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !lightbox.hidden) closeLightbox(); });
$("#lbDownload").onclick = () => {
  if (!lbBlob) return;
  const url = URL.createObjectURL(lbBlob), a = document.createElement("a");
  a.href = url; a.download = lbName; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/** Dữ liệu file đính kèm dạng gửi được cho API (dùng khi kết nối AI thật):
    ảnh/PDF -> base64, văn bản -> nội dung. Ví dụ: const parts = await VicoAttach.toApiParts(message) */
const VicoAttach = {
  async toApiParts(message) {
    const parts = message.content ? [{ type: "text", text: message.content }] : [];
    for (const a of message.attachments || []) {
      const blob = await VicoDB.get("files", a.id).catch(() => null);
      if (!blob) continue;
      if (a.kind === "text") { parts.push({ type: "text", name: a.name, text: await blob.text() }); continue; }
      const base64 = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
      });
      parts.push({ type: a.kind, name: a.name, mediaType: blob.type || a.type, base64 });
    }
    return parts;
  },
};

/* ---------- Nói để nhập (tiếng Việt) ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const micBtn = $("#micBtn");
// Bản desktop (Electron) không có dịch vụ nhận giọng nói của trình duyệt nên ẩn nút micro
if (SR && !document.documentElement.classList.contains("is-desktop")) {
  micBtn.hidden = false;
  let rec = null, baseText = "";
  micBtn.onclick = () => {
    if (rec) return rec.stop();
    rec = new SR();
    rec.lang = "vi-VN";
    rec.interimResults = true;
    rec.continuous = true;
    baseText = els.input.value ? els.input.value.replace(/\s*$/, " ") : "";
    rec.onresult = (e) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      els.input.value = baseText + txt;
      autoGrow(); updateSend();
    };
    rec.onerror = (e) => {
      const msg = { "not-allowed": "Bạn chưa cho phép dùng micro.", "no-speech": "Không nghe thấy gì, thử lại nhé.", network: "Nhận giọng nói cần kết nối mạng." }[e.error];
      if (msg) showToast(msg, "warn");
    };
    rec.onend = () => { rec = null; micBtn.classList.remove("on"); els.input.focus(); };
    micBtn.classList.add("on");
    rec.start();
  };
}

/* ---------- Tìm đoạn chat & phím tắt ---------- */
const historySearch = $("#historySearch");
historySearch.addEventListener("input", () => { historyQuery = historySearch.value.trim(); renderHistory(); });
historySearch.addEventListener("keydown", (e) => e.stopPropagation());
function focusHistorySearch() {
  if (!els.sidebar.classList.contains("expanded")) {
    if (isMobile()) openSidebar();
    else if (!$("#historyBtn").parentElement.classList.contains("open")) togglePop($("#historyBtn").parentElement);
  }
  setTimeout(() => { historySearch.focus(); historySearch.select(); }, 30);
}
const anyModalOpen = () => [...document.querySelectorAll(".modal")].some((m) => !m.hidden);
document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && k === "o") { e.preventDefault(); newChat(); }
  else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && k === "k") { e.preventDefault(); focusHistorySearch(); }
  else if (e.key === "Escape" && busy && activeAbort && !anyModalOpen()) stopGenerating();
});

/* ---------- Tài liệu tham khảo của dự án ---------- */
let projectDocsCache = {};
async function loadProjectDocsCache() {
  const cache = {};
  for (const p of projects) {
    try { cache[p.id] = (await VicoDB.get("projectDocs", p.id)) || []; } catch { cache[p.id] = []; }
  }
  projectDocsCache = cache;
}
loadProjectDocsCache();
/** Phần tài liệu dự án gửi kèm cho AI (config.js gọi trong buildSystemPrompt). */
function projectDocsPrompt(project) {
  const docs = projectDocsCache[project.id] || [];
  if (!docs.length) return "";
  let budget = 60000, out = "Tài liệu tham khảo của dự án (dùng khi liên quan đến câu hỏi):";
  for (const d of docs) {
    if (budget <= 0) break;
    const text = d.text.slice(0, budget);
    budget -= text.length;
    out += `\n\n=== ${d.name} ===\n${text}${text.length < d.text.length ? "\n…(đã cắt bớt)" : ""}`;
  }
  return out;
}
// Danh sách tài liệu đang sửa trong khung dự án (app.js gọi khi mở / lưu / xoá dự án)
let docsDraft = [];
function projDocsOpen(project) {
  docsDraft = project ? (projectDocsCache[project.id] || []).map((d) => ({ ...d })) : [];
  renderDocsDraft();
}
async function projDocsSave(projectId) {
  projectDocsCache[projectId] = docsDraft;
  try { await VicoDB.put("projectDocs", projectId, docsDraft); }
  catch (err) { showToast("Không lưu được tài liệu: " + err.message, "warn"); }
}
async function projDocsDelete(projectId) {
  delete projectDocsCache[projectId];
  try { await VicoDB.del("projectDocs", projectId); } catch {}
}
function renderDocsDraft() {
  const total = docsDraft.reduce((s, d) => s + d.size, 0);
  $("#projDocList").innerHTML = docsDraft.map((d, i) => `
    <div class="proj-doc"><span class="file-icon sm"><i style="background:${fileType(d.name).color}">${escapeHtml(fileType(d.name).label)}</i></span>
      <span class="att-text"><b>${escapeHtml(d.name)}</b><small>${fmtSize(d.size)}</small></span>
      <button type="button" class="icon-btn" data-doc-del="${i}" title="Bỏ tài liệu">${icon("trash", 15)}</button></div>`).join("");
  $("#projDocHint").textContent = docsDraft.length
    ? `${docsDraft.length} tài liệu · ${fmtSize(total)} / ${fmtSize(VICO_LIMITS.projectDocsKB * 1024)}`
    : "Thêm file văn bản hoặc code (.txt, .md, .csv, .json, code…) để AI hiểu dự án rõ hơn.";
}
$("#projDocList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-doc-del]");
  if (b) { docsDraft.splice(+b.dataset.docDel, 1); renderDocsDraft(); }
});
$("#projDocAdd").onclick = () => $("#projDocInput").click();
$("#projDocInput").onchange = async () => {
  const input = $("#projDocInput");
  for (const f of [...input.files]) {
    const total = docsDraft.reduce((s, d) => s + d.size, 0);
    if (total + f.size > VICO_LIMITS.projectDocsKB * 1024) { showToast(`Tổng tài liệu của dự án tối đa ${fmtSize(VICO_LIMITS.projectDocsKB * 1024)}.`, "warn"); break; }
    docsDraft = docsDraft.filter((d) => d.name !== f.name); // thay bản cũ cùng tên
    docsDraft.push({ name: f.name, size: f.size, text: await f.text() });
  }
  input.value = "";
  renderDocsDraft();
};
