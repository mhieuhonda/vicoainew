const $ = (s) => document.querySelector(s);

const els = {
  sidebar: $("#sidebar"), overlay: $("#overlay"), history: $("#history"),
  messages: $("#messages"), welcome: $("#welcome"), chat: $("#chat"),
  form: $("#composer"), input: $("#input"), send: $("#sendBtn"),
};

// Tài khoản đang đăng nhập (null = khách). Chat & dự án lưu riêng theo từng tài khoản.
let user = VicoAuth.current();
const uk = (k) => (user ? `${k}:${user.id}` : k);

let chats = load();
let currentId = null;
let busy = false;
let topic = "general";
let activeAbort = null;          // AbortController của câu trả lời đang chạy (nút Dừng)
let pendingAttachments = [];     // file đang đính kèm trong ô chat (features.js quản lý)
// Cài đặt của người dùng (features.js nạp/lưu theo tài khoản)
let settings = { stream: true, enterToSend: true, notify: false, replyLang: "auto", aboutMe: "", replyStyle: "", memoryOn: true };
let projects = loadKey(uk("vico_projects"), []);
let currentProjectId = loadKey(uk("vico_project"), null);
if (!projects.some((p) => p.id === currentProjectId)) currentProjectId = null;

/* ---------- Storage ---------- */
function load() {
  try { return JSON.parse(localStorage.getItem(uk("vico_chats"))) || []; } catch { return []; }
}
function save() {
  try { localStorage.setItem(uk("vico_chats"), JSON.stringify(chats)); } catch {}
}
function loadKey(k, def) {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; } catch { return def; }
}
function saveKey(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}
const currentProject = () => projects.find((p) => p.id === currentProjectId);
const current = () => chats.find((c) => c.id === currentId);

/* ---------- Render ---------- */
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Markdown tối giản: code block, inline code, đậm, nghiêng, trích dẫn, xuống dòng
/* ---------- File AI gửi ----------
   Khối code có tên file (```html file="index.html") hiện thành ô file vuông:
   rê chuột để tải xuống, bấm vào để xem trước. Nội dung gốc giữ trong sentFiles. */
const sentFiles = new Map();
let fileSeq = 0;
const unescapeHtml = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" }[e]));
function parseFence(info) {
  info = unescapeHtml(info.trim());
  const fm = info.match(/(?:^|\s)(?:file|filename|title)\s*[=:]\s*(?:"([^"]+)"|'([^']+)'|(\S+))/i);
  const lang = (info.match(/^[\w+#.-]+/) || [""])[0];
  return { lang: /^(file|filename|title)$/i.test(lang) ? "" : lang.toLowerCase(), file: fm ? fm[1] || fm[2] || fm[3] : "" };
}
const safeFileName = (n) => (n.split(/[\\/]/).pop() || "").replace(/[<>:"|?*\u0000-\u001f]/g, "_").slice(0, 120) || "file.txt";
const FILE_TYPES = {
  html: ["HTML", "#e34f26", "Trang web"], htm: ["HTML", "#e34f26", "Trang web"], css: ["CSS", "#2965f1", "Stylesheet"],
  js: ["JS", "#c99a06", "JavaScript"], mjs: ["JS", "#c99a06", "JavaScript"], ts: ["TS", "#3178c6", "TypeScript"],
  jsx: ["JSX", "#0891b2", "React"], tsx: ["TSX", "#3178c6", "React"], json: ["JSON", "#6b7280", "JSON"],
  md: ["MD", "#475569", "Markdown"], txt: ["TXT", "#6b7280", "Văn bản"], csv: ["CSV", "#16a34a", "Bảng CSV"],
  py: ["PY", "#3776ab", "Python"], java: ["JAVA", "#b07219", "Java"], c: ["C", "#555555", "C"], cpp: ["C++", "#f34b7d", "C++"],
  cs: ["C#", "#178600", "C#"], go: ["GO", "#00add8", "Go"], php: ["PHP", "#777bb4", "PHP"], sql: ["SQL", "#e38c00", "SQL"],
  sh: ["SH", "#4eaa25", "Shell"], ps1: ["PS1", "#2b5797", "PowerShell"], bat: ["BAT", "#4b5563", "Batch"],
  xml: ["XML", "#0060ac", "XML"], yml: ["YAML", "#cb171e", "YAML"], yaml: ["YAML", "#cb171e", "YAML"], svg: ["SVG", "#e8a33d", "Ảnh SVG"],
};
function fileType(name) {
  const ext = (name.includes(".") ? name.split(".").pop() : "").toLowerCase();
  const t = FILE_TYPES[ext];
  return t ? { label: t[0], color: t[1], kind: t[2], ext } : { label: (ext || "file").toUpperCase().slice(0, 4), color: "#6b7280", kind: "Tệp", ext };
}
function fmtSize(n) {
  if (n < 1024) return n + " B";
  return n < 1048576 ? (n / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " KB"
    : (n / 1048576).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " MB";
}
const DL_ICON = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/></svg>`;
function fileTile(name, content) {
  const id = "f" + ++fileSeq, t = fileType(name), size = new Blob([content]).size;
  sentFiles.set(id, { name, content, size });
  const n = escapeHtml(name);
  return `<div class="file-tile" data-file="${id}">
    <button class="file-open" title="Xem ${n}">
      <span class="file-icon"><i style="background:${t.color}">${escapeHtml(t.label)}</i></span>
      <span class="file-name">${n}</span>
      <span class="file-meta">${t.kind} · ${fmtSize(size)}</span>
    </button>
    <button class="file-dl" title="Tải xuống ${n}" aria-label="Tải xuống ${n}">${DL_ICON}</button>
  </div>`;
}

// renderMarkdown nằm trong markdown.js

/** Thêm một tin nhắn vào khung chat. msg/idx có thì hiện thanh thao tác (sao chép, sửa, 👍…) */
function addMessageEl(role, content, extraClass = "", msg = null, idx = -1) {
  const div = document.createElement("div");
  div.className = `msg ${role === "user" ? "user" : "bot"}`;
  const atts = msg && msg.attachments && msg.attachments.length ? attachRow(msg.attachments) : "";
  div.innerHTML = `<div class="msg-body">${atts}<div class="content ${extraClass}"></div><div class="msg-actions"></div></div>`;
  const c = div.querySelector(".content");
  if (role === "user") {
    c.textContent = content;
    c.classList.toggle("empty", !content);
  } else c.innerHTML = content;
  if (msg) renderActions(div, msg, idx);
  els.messages.appendChild(div);
  scrollBottom();
  return div;
}

function botHtml(m) {
  return renderMarkdown(m.content) + (m.stopped ? '<p class="stopped-note">Đã dừng</p>' : "") +
    (m.model ? `<p class="model-note">${escapeHtml(m.model)}</p>` : "");
}
function renderChat() {
  const chat = current();
  els.messages.innerHTML = "";
  els.welcome.style.display = chat && chat.messages.length ? "none" : "";
  if (chat) chat.messages.forEach((m, i) => addMessageEl(m.role, m.role === "user" ? m.content : botHtml(m), "", m, i));
}

/* Thanh thao tác dưới mỗi tin */
function renderActions(div, msg, idx) {
  const bar = div.querySelector(".msg-actions");
  const chat = current();
  if (!bar || !chat) return;
  const btn = (act, ic, title, on) =>
    `<button class="ma${on ? " on" : ""}" data-act="${act}" title="${title}" aria-label="${title}">${icon(ic, 16)}</button>`;
  const lastBot = msg.role === "assistant" && idx === chat.messages.length - 1;
  bar.dataset.idx = idx;
  const multi = chat.group || chat.agent; // Group AI / Agent (desktop) có luồng trả lời riêng: không sửa, không tạo lại
  bar.innerHTML = msg.role === "user"
    ? btn("copy", "copy", "Sao chép") + (multi ? "" : btn("edit", "edit", "Sửa tin nhắn"))
    : btn("copy", "copy", "Sao chép") + btn("speak", "speak", "Đọc to") +
      btn("up", "up", "Câu trả lời tốt", msg.feedback === "up") + btn("down", "down", "Câu trả lời chưa tốt", msg.feedback === "down") +
      (lastBot && !multi ? btn("regen", "regen", "Tạo lại câu trả lời") : "");
}
function refreshActions() {
  const chat = current();
  if (!chat) return;
  const nodes = [...els.messages.querySelectorAll(":scope > .msg")];
  chat.messages.forEach((m, i) => nodes[i] && renderActions(nodes[i], m, i));
}

/* Lịch sử chat: ghim, tìm kiếm, menu (đổi tên, xuất, xoá) */
let historyQuery = "";
// Tìm không phân biệt hoa thường và có dấu / không dấu ("giua chung" khớp "giữa chừng")
const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
function chatMatches(c, q) {
  if (!q) return true;
  q = fold(q);
  return fold(c.title).includes(q) || c.messages.some((m) => fold(m.content).includes(q));
}
/** Một dòng đoạn chat (dùng cho "Lịch sử chat" và danh sách chat dưới mỗi dự án) */
function historyItem(c) {
  const btn = document.createElement("button");
  btn.className = "history-item" + (c.id === currentId ? " active" : "");
  btn.dataset.id = c.id;
  btn.innerHTML = `${c.pinned ? `<i class="hi-pin">${icon("pin", 13)}</i>` : ""}<span></span><i class="more" title="Tuỳ chọn">${icon("more", 16)}</i>`;
  btn.querySelector("span").textContent = c.title;
  btn.onclick = (e) => {
    if (e.target.closest(".more")) return openChatMenu(c, e.target.closest(".more"));
    if (btn.querySelector("input")) return;
    openChat(c.id);
  };
  return btn;
}
// Đoạn chat thuộc dự án còn tồn tại thì nằm dưới dự án đó, không nằm chung trong "Lịch sử chat"
const inProject = (c) => !!c.projectId && projects.some((p) => p.id === c.projectId);
function renderHistory() {
  els.history.innerHTML = "";
  const list = chats.filter((c) => !inProject(c) && chatMatches(c, historyQuery));
  const inProjects = chats.filter(inProject).length;
  $("#historyEmpty").hidden = list.length > 0;
  $("#historyEmpty").textContent = historyQuery ? "Không tìm thấy đoạn chat nào ngoài dự án"
    : inProjects ? "Các đoạn chat trong dự án nằm dưới tên dự án" : "Chưa có phiên chat nào";
  const pinned = list.filter((c) => c.pinned), rest = list.filter((c) => !c.pinned);
  const section = (title, items) => {
    if (!items.length) return;
    if (pinned.length) els.history.insertAdjacentHTML("beforeend", `<div class="history-sec">${title}</div>`);
    items.forEach((c) => els.history.appendChild(historyItem(c)));
  };
  section("Đã ghim", pinned);
  section("Gần đây", rest);
  renderProjectChats();
}
/* Danh sách chat dưới mỗi dự án: dự án đang mở luôn bung ra, dự án khác bấm mũi tên để xem */
const openedProjects = new Set();
function renderProjectChats() {
  document.querySelectorAll("#projectList .project-chats").forEach((box) => {
    const pid = box.dataset.project;
    const list = chats.filter((c) => c.projectId === pid && chatMatches(c, historyQuery));
    const open = pid === currentProjectId || openedProjects.has(pid) || (!!historyQuery && list.length > 0);
    box.hidden = !open;
    box.innerHTML = "";
    if (!list.length) box.innerHTML = `<div class="pc-empty">${historyQuery ? "Không có đoạn chat khớp" : "Chưa có đoạn chat"}</div>`;
    list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).forEach((c) => box.appendChild(historyItem(c)));
    const item = document.querySelector(`#projectList .project-item[data-id="${pid}"]`);
    if (item) {
      item.classList.toggle("open", open);
      const n = item.querySelector(".pc-count");
      if (n) n.textContent = chats.filter((c) => c.projectId === pid).length || "";
    }
  });
}

const chatMenu = document.createElement("div");
chatMenu.className = "ctx-menu";
chatMenu.hidden = true;
document.body.appendChild(chatMenu);
function openChatMenu(c, anchor) {
  chatMenu.innerHTML = `
    <button data-m="pin">${icon("pin", 15)}${c.pinned ? "Bỏ ghim" : "Ghim lên đầu"}</button>
    <button data-m="rename">${icon("edit", 15)}Đổi tên</button>
    <button data-m="export">${icon("download", 15)}Xuất file Markdown</button>
    <button data-m="delete" class="danger">${icon("trash", 15)}Xoá đoạn chat</button>`;
  chatMenu.hidden = false;
  const r = anchor.getBoundingClientRect();
  const w = chatMenu.offsetWidth, h = chatMenu.offsetHeight;
  chatMenu.style.left = Math.min(r.right - 4, innerWidth - w - 8) + "px";
  chatMenu.style.top = Math.min(r.bottom + 4, innerHeight - h - 8) + "px";
  chatMenu.onclick = (e) => {
    const m = e.target.closest("[data-m]")?.dataset.m;
    if (!m) return;
    chatMenu.hidden = true;
    if (m === "pin") { c.pinned = !c.pinned; save(); renderHistory(); }
    if (m === "rename") renameChat(c);
    if (m === "export") exportChat(c);
    if (m === "delete" && confirm(`Xoá đoạn chat "${c.title}"? Không khôi phục được.`)) deleteChat(c.id);
  };
}
document.addEventListener("mousedown", (e) => { if (!chatMenu.hidden && !chatMenu.contains(e.target)) chatMenu.hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") chatMenu.hidden = true; });
function renameChat(c) {
  const btn = document.querySelector(`.history-item[data-id="${c.id}"]`);
  if (!btn) return;
  const span = btn.querySelector("span");
  const input = document.createElement("input");
  input.className = "hi-rename";
  input.value = c.title;
  input.maxLength = 80;
  span.replaceWith(input);
  input.focus();
  input.select();
  const done = (ok) => {
    if (ok && input.value.trim()) { c.title = input.value.trim(); save(); }
    renderHistory();
  };
  input.onkeydown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter") done(true);
    if (e.key === "Escape") done(false);
  };
  input.onblur = () => done(true);
  input.onclick = (e) => e.stopPropagation();
}
function chatToMarkdown(c) {
  const who = (m) => (m.role === "user" ? "Bạn" : m.agentInfo ? `${m.agentInfo.handle} (${m.agentInfo.role})` : "Vico AI");
  const when = (m) => (m.ts ? ` · ${new Date(m.ts).toLocaleString("vi-VN")}` : "");
  return `# ${c.title}\n\n` + c.messages.map((m) =>
    `### ${who(m)}${when(m)}\n\n${m.content || ""}` +
    (m.attachments && m.attachments.length ? `\n\n_File đính kèm: ${m.attachments.map((a) => a.name).join(", ")}_` : "")
  ).join("\n\n---\n\n") + "\n";
}
function exportChat(c) {
  const base = c.title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "doan-chat";
  downloadFile({ name: base + ".md", content: chatToMarkdown(c) });
  showToast("Đã xuất đoạn chat thành file Markdown.");
}

/* ---------- Topics ---------- */
// Bộ icon nét (24x24, stroke) cho các chủ đề
const ICONS = {
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  web: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M10 13l-2 2 2 2M14 13l2 2-2 2"/>',
  app: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18h2"/>',
  slide: '<path d="M3 4h18M4.5 4v10a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V4M12 15.5V19M8.5 21l3.5-2 3.5 2M8.5 11.5l2.5-2.5 2 2 3-3.5"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>',
  pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  study: '<path d="M22 9.5L12 5 2 9.5l10 4.5 10-4.5zM6 11.5v4.5c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5M22 9.5v5"/>',
  translate: '<path d="M4 5h9M8.5 3v2M11 5c-1 4.5-3.5 7.5-7 9M6 9c1.2 2.2 3 3.8 5 4.8M13 21l4-9 4 9M14.4 18h5.2"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  regen: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  up: '<path d="M7 11v9H4v-9zM7 11l4-8a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.3 20H7"/>',
  down: '<path d="M7 13V4H4v9zM7 13l4 8a2 2 0 0 0 2-2v-4h5.5a2 2 0 0 0 2-2.3l-1.2-7A2 2 0 0 0 17.3 4H7"/>',
  speak: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  clip: '<path d="M20.5 11.5l-8.2 8.2a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  pin: '<path d="M9 4h6l-1 6 4 4H6l4-4zM12 14v7"/>',
  more: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1V16h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z"/>',
  sparkles: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/>',
  brain: '<path d="M9.5 3A2.5 2.5 0 0 0 7 5.5v.2A3 3 0 0 0 4.6 9.6 3 3 0 0 0 5 15a3 3 0 0 0 3 3.5h.3A2.5 2.5 0 0 0 12 19.5V5.5A2.5 2.5 0 0 0 9.5 3z"/><path d="M14.5 3A2.5 2.5 0 0 1 17 5.5v.2a3 3 0 0 1 2.4 3.9A3 3 0 0 1 19 15a3 3 0 0 1-3 3.5h-.3A2.5 2.5 0 0 1 12 19.5"/><path d="M7 8.5c1 0 2 .5 2.5 1.5M17 8.5c-1 0-2 .5-2.5 1.5M8 14c.8-.6 1.8-.6 2.5 0M16 14c-.8-.6-1.8-.6-2.5 0"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M8.5 11h5M11 8.5v5"/>',
  telescope: '<path d="M4 14.5l12-6.5 2 3.6-12 6.5zM16 8l1.2-.7 2 3.6-1.2.7M9 17.5l-2 4M11 16.5l2 5M2.8 15.2l1.2-.7 2 3.6-1.2.7"/>',
  folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6l2 2.2h7.4A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
};
const icon = (name, size = 18) =>
  `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;

const topicBtn = $("#topicBtn"), topicMenu = $("#topicMenu"), topicPicker = $("#topicPicker");

function renderTopics() {
  const cur = VICO_TOPICS.find((t) => t.id === topic) || VICO_TOPICS[0];
  topicBtn.className = "topic-btn" + (cur.id === "general" ? "" : " selected");
  topicBtn.title = cur.id === "general" ? "Chủ đề" : `Chủ đề: ${cur.label}`;
  topicBtn.innerHTML = `${icon(cur.icon)}<span>${cur.id === "general" ? "Chủ đề" : cur.label}</span>${icon("chevron", 15)}`;
  topicMenu.innerHTML = `<div class="topic-menu-title">Chọn chủ đề</div>` +
    VICO_TOPICS.map((t) => `
      <button type="button" class="topic-item${t.id === cur.id ? " active" : ""}" data-id="${t.id}" role="option" aria-selected="${t.id === cur.id}">
        <span class="topic-ico">${icon(t.icon)}</span>
        <span class="topic-text"><b>${t.label}</b><small>${t.desc}</small></span>
        ${t.id === cur.id ? icon("check", 16) : ""}
      </button>`).join("");
  els.input.placeholder = cur.placeholder;
}
function setTopic(id) {
  topic = id;
  const chat = current();
  if (chat) { chat.topic = id; save(); }
  renderTopics();
  toggleTopicMenu(false);
  els.input.focus();
}
function toggleTopicMenu(open = !topicPicker.classList.contains("open")) {
  topicPicker.classList.toggle("open", open);
  topicBtn.setAttribute("aria-expanded", open);
}
topicBtn.onclick = () => toggleTopicMenu();
topicMenu.onclick = (e) => {
  const item = e.target.closest(".topic-item");
  if (item) setTopic(item.dataset.id);
};
document.addEventListener("click", (e) => { if (!topicPicker.contains(e.target)) toggleTopicMenu(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleTopicMenu(false); });

/* ---------- Chế độ làm việc (nút bộ não) ---------- */
const modePicker = $("#modePicker"), modeBtn = $("#modeBtn"), modeMenu = $("#modeMenu");
let mode = loadKey("vico_mode", null);
if (!VICO_MODES.some((m) => m.id === mode)) mode = null;

function renderMode() {
  const cur = VICO_MODES.find((m) => m.id === mode);
  modeBtn.className = "mode-btn" + (cur ? " selected mode-" + cur.id : "");
  modeBtn.title = cur ? `Chế độ: ${cur.label}` : "Chế độ làm việc";
  modeBtn.innerHTML = icon("brain", 19) + (cur ? `<span>${cur.short}</span>` : "");
  modeMenu.innerHTML = `<div class="topic-menu-title">Chế độ làm việc</div>` +
    VICO_MODES.map((m) => `
      <button type="button" class="topic-item mode-item${m.id === mode ? " active" : ""}" data-id="${m.id}" role="option" aria-selected="${m.id === mode}">
        <span class="topic-ico">${icon(m.icon)}</span>
        <span class="topic-text"><b>${m.label}</b><small>${m.desc}</small></span>
        ${m.id === mode ? icon("check", 16) : ""}
      </button>`).join("") +
    `<div class="mode-hint">${cur ? "Bấm lại chế độ đang chọn để tắt" : "Chưa bật chế độ nào: trả lời bình thường"}</div>`;
}
function setMode(id) {
  mode = id === mode ? null : id; // bấm lại để tắt
  saveKey("vico_mode", mode);
  renderMode();
  renderCredits();
  toggleModeMenu(false);
  els.input.focus();
}
function toggleModeMenu(open = !modePicker.classList.contains("open")) {
  modePicker.classList.toggle("open", open);
  modeBtn.setAttribute("aria-expanded", open);
}
modeBtn.onclick = () => toggleModeMenu();
modeMenu.onclick = (e) => {
  const item = e.target.closest(".mode-item");
  if (item) setMode(item.dataset.id);
};
document.addEventListener("click", (e) => { if (!modePicker.contains(e.target)) toggleModeMenu(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleModeMenu(false); });

/* ---------- Mức suy luận ---------- */
const reasonPicker = $("#reasonPicker"), reasonBtn = $("#reasonBtn"), reasonRange = $("#reasonRange");
const reasonPanel = $("#reasonPanel"), reasonTrack = $("#reasonTrack");
const LAST = VICO_REASONING.length - 1;
let reasoning = loadKey("vico_reasoning", "medium");
let dragging = false;
if (!VICO_REASONING.some((r) => r.id === reasoning)) reasoning = "medium";
const reasonIndex = () => VICO_REASONING.findIndex((r) => r.id === reasoning);

reasonRange.max = LAST;
$("#reasonTicks").innerHTML = VICO_REASONING.map((_, i) => `<i style="--i:${i * 4 / LAST}"></i>`).join("");

function renderReasoning() {
  const i = reasonIndex(), lv = VICO_REASONING[i], ultra = lv.id === "ultrathink";
  if (!dragging) reasonPanel.style.setProperty("--v", i / LAST);
  reasonRange.value = i;
  reasonRange.setAttribute("aria-valuetext", lv.label);
  $("#reasonName").textContent = lv.label;
  $("#reasonDesc").textContent = lv.desc;
  const ri = VICO_REASONING.findIndex((r) => r.recommended);
  const rec = $("#reasonRec");
  rec.style.left = `calc(var(--tw) / 2 + (100% - var(--tw)) * ${ri / LAST})`;
  rec.classList.toggle("here", ri === i);
  reasonPicker.classList.toggle("ultra", ultra);
  reasonBtn.title = `Mức suy luận: ${lv.label}`;
  reasonBtn.innerHTML = `${icon(ultra ? "sparkles" : "bulb")}<span>${lv.label}</span>${icon("chevron", 15)}`;
}
function setReasoning(id) {
  reasoning = id;
  saveKey("vico_reasoning", id);
  renderReasoning();
  renderCredits();
  if (reasonPicker.classList.contains("open")) buildPixels();
}

// Chấm pixel vuông trên lưới 6px, chỉ có ở Ultrathink (kéo hết thanh):
// dày đặc sát con trượt, thưa dần khi càng xa; hiện lần lượt từ con trượt sang trái rồi nhấp nháy.
let pixelsKey = "";
function buildPixels() {
  const W = reasonTrack.clientWidth;
  if (reasoning !== "ultrathink") {
    // CSS làm mờ dần các chấm, xoá hẳn sau khi mờ xong
    pixelsKey = "";
    clearTimeout(buildPixels.t);
    buildPixels.t = setTimeout(() => { if (reasoning !== "ultrathink") $("#pixels").innerHTML = ""; }, 400);
    return;
  }
  if (!W || pixelsKey === String(W)) return;
  pixelsKey = String(W);
  const tw = 22, thumbX = W - tw / 2;
  let html = "";
  for (let x = 2; x < W - tw; x += 6) {
    const d = Math.min(1, x / thumbX); // 0 = xa con trượt, 1 = sát con trượt
    for (let y = 2; y < 36; y += 6) {
      if (Math.random() > 0.03 + 0.9 * d ** 2.2) continue;
      const light = d > 0.42; // gần: chấm trắng trên nền tím; xa: chấm tím trên nền xám
      const o = light ? 0.35 + 0.6 * d : 0.15 + 0.45 * d;
      const s = Math.random() < 0.2 * d ** 2 ? 4 : d < 0.3 ? 2 : 3;
      const off = (3 - s) / 2;
      html += `<b class="px${light ? "" : " dk"}" style="left:${x + off}px;top:${y + off}px;--s:${s}px;` +
        `--o:${o.toFixed(2)};--in:${(0.1 + (1 - d) * 0.65).toFixed(2)}s;` +
        `--d:${(1.2 + Math.random() * 1.8).toFixed(2)}s;--dl:${(Math.random() * 1.5).toFixed(2)}s"></b>`;
    }
  }
  $("#pixels").innerHTML = html;
}
addEventListener("resize", () => { if (reasonPicker.classList.contains("open")) buildPixels(); });
function toggleReason(open = !reasonPicker.classList.contains("open")) {
  reasonPicker.classList.toggle("open", open);
  if (open) buildPixels();
  reasonBtn.setAttribute("aria-expanded", open);
}
reasonBtn.onclick = () => toggleReason();
reasonRange.addEventListener("input", () => setReasoning(VICO_REASONING[+reasonRange.value].id));

// Kéo con trượt: chạy liền theo tay, thả ra thì trượt êm vào nấc gần nhất
const TW = 22;
function trackPos(e) {
  const r = reasonTrack.getBoundingClientRect();
  return Math.min(1, Math.max(0, (e.clientX - r.left - TW / 2) / (r.width - TW)));
}
function levelAt(v) { return VICO_REASONING[Math.round(v * LAST)].id; }
let dragStart = null;
reasonTrack.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  reasonRange.focus({ preventScroll: true });
  reasonTrack.setPointerCapture(e.pointerId);
  dragStart = e.clientX;
  const id = levelAt(trackPos(e));
  if (id !== reasoning) setReasoning(id); // bấm vào thanh: con trượt lướt tới nấc đó
});
reasonTrack.addEventListener("pointermove", (e) => {
  if (dragStart === null) return;
  if (!dragging && Math.abs(e.clientX - dragStart) < 3) return;
  dragging = true;
  reasonTrack.classList.add("dragging");
  const v = trackPos(e);
  reasonPanel.style.setProperty("--v", v);
  const id = levelAt(v);
  if (id !== reasoning) setReasoning(id);
});
function endDrag() {
  if (dragStart === null) return;
  dragStart = null;
  if (!dragging) return;
  dragging = false;
  reasonTrack.classList.remove("dragging");
  reasonPanel.style.setProperty("--v", reasonIndex() / LAST); // trượt êm vào nấc
}
reasonTrack.addEventListener("pointerup", endDrag);
reasonTrack.addEventListener("pointercancel", endDrag);
document.addEventListener("click", (e) => { if (!reasonPicker.contains(e.target)) toggleReason(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleReason(false); });

const scrollBottom = () => (els.chat.scrollTop = els.chat.scrollHeight);

/* ---------- Actions ---------- */
function newChat() {
  closePops();
  currentId = null;
  showView("homeView");
  renderChat(); renderHistory(); closeSidebar();
  els.input.focus();
}
function closePops() {
  document.querySelectorAll(".pop-wrap.open").forEach((w) => w.classList.remove("open"));
}
function openChat(id) {
  closePops();
  currentId = id;
  const prevProject = currentProjectId;
  currentProjectId = current().projectId || null;
  saveKey(uk("vico_project"), currentProjectId);
  if (prevProject !== currentProjectId) applyProjectModel();
  renderProjects();
  topic = current().topic || "general";
  renderTopics();
  renderChat(); renderHistory(); closeSidebar();
}
function deleteChat(id) {
  chats = chats.filter((c) => c.id !== id);
  if (currentId === id) currentId = null;
  save(); renderChat(); renderHistory();
}

/* ---------- Gửi tin & nhận câu trả lời ---------- */
const sendTimes = [];
/** Còn phải chờ bao nhiêu giây mới được gửi tiếp (giới hạn VICO_LIMITS.perMinute tin/phút). 0 = gửi được. */
function rateWait() {
  const now = Date.now();
  while (sendTimes.length && now - sendTimes[0] > 60000) sendTimes.shift();
  return sendTimes.length >= VICO_LIMITS.perMinute ? Math.ceil((60000 - (now - sendTimes[0])) / 1000) : 0;
}
/** Model trả lời tin nhắn: mặc định Vico (tốn credit). Bản desktop thay hàm này khi bạn chọn model chạy trên máy.
 *  cost: credit tạm giữ khi gửi (0 = miễn phí; máy chủ tính lại theo token) · label: tên hiện dưới câu trả lời · ask: cùng tham số với askVico */
function replyEngine() {
  const m = currentChatModel();
  if (m.engine) return m.engine();
  return { cost: creditCost(reasoning, mode), label: "", ask: askVico };
}

/* ---------- Ô chọn model (đầu trang) ----------
   Mặc định chỉ có Vico AI Lite 2.6. Bản desktop thêm model qua registerModelSource(fn): fn() trả về
   [{ id, name, sub, group, ready, engine?, onPick?, action? }]. ready=false: hiện mờ, bấm sẽ gọi onPick (VD nhập API key). */
const VICO_MODEL_NAME = "Vico AI Lite 2.6";
const MODEL_SOURCES = [];
let chatModel = loadKey("vico_chat_model", "vico");
function registerModelSource(fn) { MODEL_SOURCES.push(fn); renderModelPicker(); }
function chatModels() {
  const list = [{ id: "vico", name: VICO_MODEL_NAME, sub: "Mô hình của Vico · tính credit", group: "Vico AI", ready: true }];
  for (const fn of MODEL_SOURCES) { try { list.push(...fn()); } catch {} }
  return list;
}
function currentChatModel() {
  const list = chatModels();
  return list.find((m) => m.id === chatModel && m.ready !== false && !m.action) || list[0];
}
/** Chọn model cho chat. quiet = không báo (VD tự đổi khi vào dự án). */
async function setChatModel(id, quiet) {
  const m = chatModels().find((x) => x.id === id);
  if (!m) return false;
  if (m.onPick) { try { if ((await m.onPick()) === false) return false; } catch (err) { showToast(err.message, "warn"); return false; } }
  if (m.action) return false;
  chatModel = id;
  saveKey("vico_chat_model", id);
  renderModelPicker(); updateSend(); renderCredits();
  if (!quiet && id !== "vico") showToast(`Đã chọn ${m.name} cho chat.`);
  dispatchEvent(new CustomEvent("vico-model", { detail: id }));
  return true;
}
function renderModelPicker() {
  const cur = currentChatModel();
  $("#mpName").textContent = cur.name;
  const groups = new Map();
  for (const m of chatModels()) { if (!groups.has(m.group)) groups.set(m.group, []); groups.get(m.group).push(m); }
  let html = "";
  for (const [g, items] of groups) {
    html += `<div class="mp-group">${escapeHtml(g)}</div>` + items.map((m) => `<button class="mp-item${m.id === cur.id ? " on" : ""}${m.ready === false ? " locked" : ""}${m.action ? " act" : ""}" data-mp="${escapeHtml(m.id)}" role="option" aria-selected="${m.id === cur.id}">
      <span><b>${escapeHtml(m.name)}</b>${m.sub ? `<small>${escapeHtml(m.sub)}</small>` : ""}</span>${m.id === cur.id ? icon("check", 16) : ""}</button>`).join("");
  }
  if (!document.documentElement.classList.contains("is-desktop"))
    html += `<div class="mp-note">Bản desktop có thêm model chạy trên máy và model dùng API key của bạn. <button data-mp-desktop>Tải bản desktop</button></div>`;
  $("#mpMenu").innerHTML = html;
}
$("#mpBtn").onclick = (e) => { renderModelPicker(); togglePop(e.currentTarget.parentElement); };
$("#mpMenu").onclick = (e) => {
  if (e.target.closest("[data-mp-desktop]")) { closePops(); return $("#desktopBtn") && $("#desktopBtn").click(); }
  const it = e.target.closest("[data-mp]");
  if (!it) return;
  closePops();
  setChatModel(it.dataset.mp).then((ok) => ok && els.input.focus());
};
/** Kiểm tra trước khi gửi: đã đăng nhập, đủ credit, không gửi quá nhanh. */
function canSend() {
  if (!user) {
    openAuth("signup", "Tạo tài khoản để bắt đầu chat. Tặng ngay " + fmt(VICO_CREDITS.signupBonus) + " credit!");
    return false;
  }
  const wait = rateWait();
  if (wait) { showToast(`Bạn gửi hơi nhanh, đợi ${wait} giây nữa nhé.`, "warn"); return false; }
  user = VicoAuth.current();
  if (!user) { onAuthChanged(); openAuth("login", "Phiên đăng nhập đã hết, hãy đăng nhập lại"); return false; }
  const cost = replyEngine().cost;
  if (cost && user.total < cost) {
    renderCredits();
    showToast(`Không đủ credit để gửi tin này (còn ${fmt(user.total)} credit). Credit ngày làm mới sau ${fmtDuration(VicoAuth.msUntilReset())}.`, "warn");
    return false;
  }
  return true;
}

async function sendMessage(text) {
  text = text.trim();
  const files = pendingAttachments.slice();
  if ((!text && !files.length) || busy) return;
  if (files.some((f) => f.loading)) return showToast("Đợi file đính kèm xử lý xong đã nhé.");
  if (!canSend()) return;

  let chat = current();
  if (!chat) {
    chat = { id: Date.now().toString(36), title: (text || files[0].name).slice(0, 40), messages: [], topic, projectId: currentProjectId };
    chats.unshift(chat);
    currentId = chat.id;
  }
  const msg = { role: "user", content: text, ts: Date.now() };
  if (files.length) msg.attachments = files.map(({ id, name, type, size, kind, thumb }) => ({ id, name, type, size, kind, thumb }));
  chat.messages.push(msg);
  save(); renderHistory();
  if (typeof clearAttachments === "function") clearAttachments(false);

  els.welcome.style.display = "none";
  addMessageEl("user", text, "", msg, chat.messages.length - 1);
  els.input.value = ""; autoGrow(); updateSend();
  generateReply(chat);
}

function typingHtml() {
  const ri = reasonIndex(), ultra = reasoning === "ultrathink";
  const md = VICO_MODES.find((m) => m.id === mode);
  const thinkText = ultra ? "Ultrathink đang suy luận sâu…" : md ? md.thinking : "Đang suy nghĩ…";
  const label = ri >= 2 || md ? `<span class="thinking-label${ultra ? " ultra-text" : ""}">${thinkText}</span>` : "";
  return `<span class="typing"><i></i><i></i><i></i></span>${label}`;
}

/** Gọi AI trả lời cho tin cuối của đoạn chat (dùng chung cho gửi mới, tạo lại, sửa tin). */
async function generateReply(chat) {
  const engine = replyEngine();
  const cost = engine.cost;
  let used = null;
  if (cost) {
    try {
      ({ user, used } = VicoAuth.spend(cost, `Tin nhắn · suy luận ${VICO_REASONING[reasonIndex()].label}`));
    } catch {
      user = VicoAuth.current();
      renderCredits();
      return showToast("Không đủ credit để gửi tin này.", "warn");
    }
    renderCredits(VICO_CONFIG.apiUrl && engine.ask === askVico ? 0 : cost);
  }
  sendTimes.push(Date.now());
  busy = true;
  activeAbort = new AbortController();
  updateSend();
  refreshActions(); // ẩn nút "Tạo lại" của câu trả lời cũ

  const el = addMessageEl("bot", typingHtml());
  const content = el.querySelector(".content");
  let text = "", raf = 0;
  const nearBottom = () => els.chat.scrollHeight - els.chat.scrollTop - els.chat.clientHeight < 140;
  const paint = () => {
    raf = 0;
    const stick = nearBottom();
    content.innerHTML = renderMarkdown(text) + '<span class="stream-caret"></span>';
    if (stick) scrollBottom();
  };
  const onDelta = (d) => { text += d; if (!raf) raf = requestAnimationFrame(paint); };
  try {
    const reply = await engine.ask(chat.messages, chat.topic || topic, projects.find((p) => p.id === chat.projectId), reasoning, mode,
      { signal: activeAbort.signal, onDelta: settings.stream ? onDelta : null });
    text = reply == null ? text : String(reply);
    finish(false);
  } catch (err) {
    if (err && err.name === "AbortError") finish(true);
    else {
      content.classList.add("error");
      const em = String((err && err.message) || "Lỗi kết nối");
      content.textContent = (/^Lỗi/.test(em) ? em : "Lỗi: " + em) + (used ? " (không bị trừ credit)" : "");
      if (used) { user = VicoAuth.refund(used); renderCredits(); }
    }
  } finally {
    cancelAnimationFrame(raf);
    busy = false;
    activeAbort = null;
    updateSend();
    scrollBottom();
  }

  function finish(stopped) {
    cancelAnimationFrame(raf);
    if (stopped && !text.trim()) { // dừng trước khi có chữ: bỏ câu trả lời, hoàn credit
      el.remove();
      if (used) { user = VicoAuth.refund(used); renderCredits(); }
      refreshActions();
      return showToast(used ? "Đã dừng. Credit đã được hoàn lại." : "Đã dừng.");
    }
    // Chưa nối máy chủ: tính lại credit theo token ước tính của câu trả lời (máy chủ tự làm việc này khi có)
    if (used && !VICO_CONFIG.apiUrl && engine.ask === askVico && !stopped) {
      const tokens = Math.ceil(text.length / 3.5), extra = creditsForTokens(tokens, reasoning, mode) - cost;
      if (extra > 0) { try { ({ user } = VicoAuth.spend(Math.min(extra, user.total), `Tin nhắn · ${fmt(tokens)} token`)); renderCredits(extra); } catch {} }
    }
    const msg = { role: "assistant", content: text, ts: Date.now() };
    if (stopped) msg.stopped = true;
    if (engine.label) msg.model = engine.label;
    chat.messages.push(msg);
    save();
    content.innerHTML = botHtml(msg);
    if (currentId === chat.id) refreshActions();
    notifyDone(text);
  }
}
function stopGenerating() {
  if (activeAbort) activeAbort.abort();
}
/** Thông báo hệ thống khi AI trả lời xong mà bạn đang ở cửa sổ/tab khác (bật trong Cài đặt). */
function notifyDone(text) {
  if (!settings.notify || document.hasFocus() || !("Notification" in window) || Notification.permission !== "granted") return;
  const plain = text.replace(/```[\s\S]*?```/g, "[code]").replace(/[#*_>`~]/g, "").replace(/\s+/g, " ").trim();
  try { new Notification("Vico AI đã trả lời xong", { body: plain.slice(0, 120) }); } catch {}
}

function regenerate() {
  const chat = current();
  if (!chat || busy || chat.group || chat.agent || !canSend()) return;
  if (chat.messages.length && chat.messages[chat.messages.length - 1].role === "assistant") chat.messages.pop();
  save();
  renderChat();
  generateReply(chat);
}
/** Sửa một tin đã gửi: các tin phía sau bị bỏ, AI trả lời lại từ tin đã sửa. */
function startEdit(div, idx) {
  const chat = current();
  if (busy || !chat) return;
  const msg = chat.messages[idx];
  const body = div.querySelector(".msg-body"), c = div.querySelector(".content"), bar = div.querySelector(".msg-actions");
  if (body.querySelector(".edit-box")) return;
  body.classList.add("editing");
  c.hidden = bar.hidden = true;
  const box = document.createElement("div");
  box.className = "edit-box";
  box.innerHTML = `<textarea rows="2" aria-label="Sửa tin nhắn"></textarea>
    <div class="edit-actions"><button type="button" class="btn-ghost sm" data-e="cancel">Huỷ</button><button type="button" class="btn-primary sm" data-e="send">Gửi</button></div>`;
  const ta = box.querySelector("textarea");
  ta.value = msg.content;
  body.appendChild(box);
  const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 260) + "px"; };
  grow();
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
  const close = () => { box.remove(); c.hidden = bar.hidden = false; body.classList.remove("editing"); };
  const submit = () => {
    const t = ta.value.trim();
    if (!t && !(msg.attachments || []).length) return;
    if (t === msg.content) return close();
    if (!canSend()) return;
    chat.messages = chat.messages.slice(0, idx + 1);
    msg.content = t;
    msg.edited = true;
    save();
    renderChat();
    generateReply(chat);
  };
  ta.oninput = grow;
  ta.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); }
    if (e.key === "Escape") close();
  };
  box.onclick = (e) => {
    const a = e.target.closest("[data-e]");
    if (a) a.dataset.e === "send" ? submit() : close();
  };
}

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); showToast("Đã sao chép."); }
  catch { showToast("Không sao chép được.", "warn"); }
}
/* Đọc to câu trả lời bằng giọng có sẵn của máy (ưu tiên giọng tiếng Việt) */
let speakingBtn = null;
function speakText(t, btn) {
  if (!("speechSynthesis" in window)) return showToast("Máy không hỗ trợ đọc to.", "warn");
  const wasSame = speakingBtn === btn;
  speechSynthesis.cancel();
  if (speakingBtn) speakingBtn.classList.remove("on");
  speakingBtn = null;
  if (wasSame) return; // bấm lần nữa để dừng
  const plain = t.replace(/```[\s\S]*?```/g, " (đoạn code) ").replace(/\$\$[\s\S]*?\$\$/g, " (công thức) ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#*_>`~|]/g, " ").replace(/\s+/g, " ").trim();
  const u = new SpeechSynthesisUtterance(plain);
  const vi = speechSynthesis.getVoices().find((v) => /^vi/i.test(v.lang));
  if (vi) u.voice = vi;
  u.lang = vi ? vi.lang : "vi-VN";
  u.onend = u.onerror = () => { btn.classList.remove("on"); if (speakingBtn === btn) speakingBtn = null; };
  btn.classList.add("on");
  speakingBtn = btn;
  speechSynthesis.speak(u);
}

// Thao tác trên tin nhắn
els.messages.addEventListener("click", (e) => {
  const b = e.target.closest(".ma");
  if (!b) return;
  const chat = current(), bar = b.closest(".msg-actions"), idx = +bar.dataset.idx;
  const msg = chat && chat.messages[idx];
  if (!msg) return;
  const act = b.dataset.act;
  if (act === "copy") copyText(msg.content);
  else if (act === "speak") speakText(msg.content, b);
  else if (act === "up" || act === "down") {
    msg.feedback = msg.feedback === act ? null : act;
    save();
    renderActions(b.closest(".msg"), msg, idx);
    if (msg.feedback) showToast("Cảm ơn bạn đã đánh giá!");
  } else if (act === "regen") regenerate();
  else if (act === "edit") startEdit(b.closest(".msg"), idx);
});

/* ---------- Dự án ---------- */
const projectModal = $("#projectModal"), projectForm = $("#projectForm");

function renderProjects() {
  const list = $("#projectList");
  list.innerHTML = "";
  projects.forEach((p) => {
    const b = document.createElement("button");
    b.className = "project-item" + (p.id === currentProjectId ? " active" : "");
    b.dataset.id = p.id;
    b.title = p.goal;
    b.innerHTML = `<i class="pc-caret" title="Xem các đoạn chat">${icon("chevron", 14)}</i>${icon("folder", 17)}<span></span><small class="pc-count"></small><i class="edit" title="Sửa dự án">${icon("edit", 14)}</i><i class="del" title="Xoá dự án">${icon("trash", 15)}</i>`;
    b.querySelector("span").textContent = p.name;
    b.onclick = (e) => {
      if (e.target.closest(".del")) return deleteProject(p.id);
      if (e.target.closest(".edit")) return openProjectModal(p);
      if (e.target.closest(".pc-caret")) { // chỉ bung / thu danh sách chat, không đổi dự án
        if (p.id === currentProjectId) return;
        openedProjects.has(p.id) ? openedProjects.delete(p.id) : openedProjects.add(p.id);
        return renderProjectChats();
      }
      selectProject(p.id === currentProjectId ? null : p.id);
    };
    list.appendChild(b);
    const box = document.createElement("div");
    box.className = "project-chats";
    box.dataset.project = p.id;
    list.appendChild(box);
  });
  renderProjectChats();
  const p = currentProject();
  $("#projectChip").hidden = !p;
  if (p) {
    $("#projectChipName").textContent = p.name;
    $("#projectChip").title = "Mục tiêu: " + p.goal;
  }
}
function selectProject(id) {
  currentProjectId = id;
  saveKey(uk("vico_project"), id);
  applyProjectModel();
  renderProjects();
  newChat();
}
/** Vào dự án có chọn sẵn "AI làm việc" thì đổi model theo dự án. */
function applyProjectModel() {
  const p = currentProject();
  if (p && p.model && p.model !== chatModel) setChatModel(p.model, true).then((ok) => ok && showToast(`Dự án "${p.name}" dùng ${currentChatModel().name}.`));
  if (typeof onProjectEnter === "function") onProjectEnter(p);
}
function deleteProject(id) {
  const p = projects.find((x) => x.id === id);
  if (!p || !confirm(`Xoá dự án "${p.name}"? Các đoạn chat vẫn được giữ lại.`)) return;
  projects = projects.filter((x) => x.id !== id);
  saveKey(uk("vico_projects"), projects);
  if (typeof projDocsDelete === "function") projDocsDelete(id);
  if (currentProjectId === id) selectProject(null);
  else renderProjects();
}
let editingProjectId = null;
/** Mở khung dự án: không truyền gì = tạo mới, truyền dự án = sửa. */
function openProjectModal(p = null) {
  closePops();
  projectForm.reset();
  editingProjectId = p ? p.id : null;
  $("#projectModalTitle").textContent = p ? "Sửa dự án" : "Tạo dự án mới";
  $("#projectSubmit").textContent = p ? "Lưu thay đổi" : "Tạo dự án";
  if (p) { $("#projName").value = p.name; $("#projGoal").value = p.goal; }
  const opts = chatModels().filter((m) => !m.action && m.ready !== false);
  $("#projModel").innerHTML = `<option value="">Theo lựa chọn ở đầu trang</option>` + opts.map((m) => `<option value="${escapeHtml(m.id)}"${p && p.model === m.id ? " selected" : ""}${m.ready === false ? " disabled" : ""}>${escapeHtml(m.name)}${m.sub ? " · " + escapeHtml(m.sub) : ""}</option>`).join("");
  if (typeof projDocsOpen === "function") projDocsOpen(p);
  projectModal.hidden = false;
  setTimeout(() => $("#projName").focus(), 30);
}
const closeProjectModal = () => (projectModal.hidden = true);

$("#projectBtn").onclick = (e) => {
  if (!user) return openAuth("login", "Đăng nhập để tạo và lưu dự án");
  if (!projects.length) return openProjectModal(null);
  togglePop(e.currentTarget.parentElement);
};
const guardedProjectModal = () => (user ? openProjectModal(null) : openAuth("login", "Đăng nhập để tạo và lưu dự án"));
$("#newProjectBtn").onclick = guardedProjectModal;
$("#addProjectInline").onclick = guardedProjectModal;
$("#projectClose").onclick = closeProjectModal;
$("#projectCancel").onclick = closeProjectModal;
$("#projectChipClose").onclick = () => selectProject(null);
projectModal.addEventListener("mousedown", (e) => { if (e.target === projectModal) closeProjectModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !projectModal.hidden) closeProjectModal(); });
projectForm.onsubmit = async (e) => {
  e.preventDefault();
  const name = $("#projName").value.trim(), goal = $("#projGoal").value.trim();
  if (!name || !goal) return;
  const editing = projects.find((x) => x.id === editingProjectId);
  const p = editing || { id: "p" + Date.now().toString(36), createdAt: Date.now() };
  Object.assign(p, { name, goal, model: $("#projModel").value || null });
  if (typeof onProjectSave === "function") onProjectSave(p);
  if (!editing) projects.unshift(p);
  saveKey(uk("vico_projects"), projects);
  if (typeof projDocsSave === "function") await projDocsSave(p.id);
  closeProjectModal();
  if (editing) { renderProjects(); if (editing.id === currentProjectId) applyProjectModel(); showToast("Đã lưu dự án."); }
  else selectProject(p.id);
};

/* ---------- Tài khoản & credit ---------- */
const fmt = (n) => Number(n).toLocaleString("vi-VN");
function fmtDuration(ms) {
  const m = Math.max(1, Math.ceil(ms / 60000)), h = Math.floor(m / 60);
  return h ? `${h} giờ ${m % 60} phút` : `${m} phút`;
}

let toastTimer;
function showToast(msg, kind = "") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show" + (kind ? " " + kind : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast" + (kind ? " " + kind : "")), 4200);
}

const COIN = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5l1.3 3.2 3.2 1.3-3.2 1.3L12 16.5l-1.3-3.2L7.5 12l3.2-1.3z" fill="currentColor" stroke="none"/></svg>`;
const USER_ICON = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/></svg>`;

/** Cập nhật số credit trên thanh trên cùng và bảng chi tiết. `spent` > 0 thì hiện hiệu ứng "−X". */
function renderCredits(spent = 0) {
  const lv = VICO_REASONING[reasonIndex()], md = VICO_MODES.find((m) => m.id === mode);
  const eng = replyEngine(), cost = eng.cost;
  updateSend();
  if (!user) return;
  $("#creditTotal").textContent = fmt(user.total);
  $("#cpTotal").textContent = fmt(user.total);
  $("#cpDaily").textContent = fmt(user.daily);
  $("#cpDailyMax").textContent = fmt(user.dailyMax);
  $("#cpDailyBar").style.width = (user.daily / user.dailyMax) * 100 + "%";
  $("#cpReset").textContent = `Làm mới sau ${fmtDuration(VicoAuth.msUntilReset())} · không cộng dồn sang ngày sau`;
  $("#cpBonus").textContent = fmt(user.bonus);
  const chip = $("#creditChip");
  chip.classList.toggle("low", user.total < cost);
  if (spent > 0) {
    const f = document.createElement("span");
    f.className = "credit-float";
    f.textContent = "−" + fmt(spent);
    chip.appendChild(f);
    f.addEventListener("animationend", () => f.remove());
    chip.classList.remove("bump"); void chip.offsetWidth; chip.classList.add("bump");
  }
}

/** Hiện trạng thái đăng nhập: nút Đăng nhập/Đăng ký hoặc credit, avatar và menu tài khoản. */
function renderAuth() {
  $("#guestActions").hidden = !!user;
  $("#creditWrap").hidden = !user;
  $("#avatarLetter").innerHTML = user ? escapeHtml(user.username[0].toUpperCase()) : USER_ICON;
  $("#avatarLetter").classList.toggle("guest", !user);
  $("#avatarName").textContent = user ? user.username : "Khách";
  $("#avatarBtn").title = user ? `Tài khoản: ${user.username}` : "Tài khoản";
  $("#avatarPop").innerHTML = user
    ? `<div class="pop-user"><span class="avatar-btn sm">${escapeHtml(user.username[0].toUpperCase())}</span>
         <div><b>${escapeHtml(user.username)}</b><small>${escapeHtml(user.email)}</small></div></div>
       <button class="pop-credit" data-act="credits">${COIN}<b>${fmt(user.total)}</b> credit<span>Chi tiết</span></button>
       <button class="pop-item" data-act="theme">Đổi giao diện sáng/tối</button>
       <button class="pop-item" data-act="settings">Cài đặt</button>
       <button class="pop-item danger" data-act="logout">Đăng xuất</button>`
    : `<div class="pop-guest"><b>Bạn chưa đăng nhập</b>
         <small>Tạo tài khoản để nhận ${fmt(VICO_CREDITS.signupBonus)} credit miễn phí và ${fmt(VICO_CREDITS.dailyFree)} credit mỗi ngày</small></div>
       <button class="btn-primary block" data-act="signup">Tạo tài khoản</button>
       <button class="pop-item" data-act="login">Đăng nhập</button>
       <button class="pop-item" data-act="theme">Đổi giao diện sáng/tối</button>`;
  renderCredits();
}

/** Gọi sau khi đăng nhập / đăng xuất: nạp lại chat & dự án của tài khoản hiện tại. */
function onAuthChanged() {
  chats = load();
  projects = loadKey(uk("vico_projects"), []);
  currentProjectId = loadKey(uk("vico_project"), null);
  if (!projects.some((p) => p.id === currentProjectId)) currentProjectId = null;
  currentId = null;
  renderAuth();
  renderProjects();
  showView("homeView");
  renderChat();
  renderHistory();
}

// Chat / dự án tạo trước khi có tài khoản: chuyển sang tài khoản vừa tạo
function adoptGuestData() {
  for (const k of ["vico_chats", "vico_projects", "vico_project"]) {
    try {
      const v = localStorage.getItem(k);
      if (v !== null && localStorage.getItem(uk(k)) === null) localStorage.setItem(uk(k), v);
      localStorage.removeItem(k);
    } catch {}
  }
}

$("#avatarPop").addEventListener("click", (e) => {
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (!act) return;
  closePops();
  if (act === "theme") $("#themeToggle").click();
  else if (act === "login" || act === "signup") openAuth(act);
  else if (act === "credits") togglePop($("#creditWrap"));
  else if (act === "settings") openSettings("general");
  else if (act === "logout") {
    VicoAuth.logOut();
    user = null;
    onAuthChanged();
    showToast("Đã đăng xuất.");
  }
});
$("#creditChip").onclick = (e) => { renderCredits(); togglePop(e.currentTarget.parentElement); };
$("#loginBtn").onclick = () => openAuth("login");
$("#signupBtn").onclick = () => openAuth("signup");

/* Modal đăng nhập / tạo tài khoản */
const authModal = $("#authModal"), loginForm = $("#loginForm"), signupForm = $("#signupForm");
const AUTH_TEXT = {
  login: ["Chào mừng trở lại", "Đăng nhập để tiếp tục chat với Vico AI"],
  signup: ["Tạo tài khoản Vico AI", "Miễn phí, chỉ mất vài giây"],
};
$("#giftBonus").textContent = fmt(VICO_CREDITS.signupBonus) + " credit";
$("#giftDaily").textContent = fmt(VICO_CREDITS.dailyFree) + " credit";

function setAuthTab(tab, sub) {
  authModal.dataset.tab = tab;
  loginForm.hidden = tab !== "login";
  signupForm.hidden = tab !== "signup";
  $("#authTitle").textContent = AUTH_TEXT[tab][0];
  $("#authSub").textContent = sub || AUTH_TEXT[tab][1];
  authModal.querySelectorAll(".auth-tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tab));
  clearErrors(loginForm); clearErrors(signupForm);
  setTimeout(() => (tab === "login" ? $("#liLogin") : $("#suUsername")).focus(), 40);
}
function openAuth(tab = "login", sub) {
  closePops();
  authModal.hidden = false;
  setAuthTab(tab, sub);
}
const closeAuth = () => (authModal.hidden = true);

function clearErrors(form) {
  form.querySelectorAll("[data-err]").forEach((el) => (el.textContent = ""));
  form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
}
function showError(form, field, msg) {
  const slot = form.querySelector(`[data-err="${field}"]`) || form.querySelector('[data-err="_"]');
  slot.textContent = msg;
  const input = form.querySelector(`[name="${field}"]`);
  if (input) { input.classList.add("invalid"); input.focus(); }
}
async function submitAuth(form, action) {
  clearErrors(form);
  const btn = form.querySelector('button[type="submit"]'), label = btn.textContent;
  btn.disabled = true; btn.textContent = "Đang xử lý…";
  try {
    await action();
    closeAuth();
    form.reset();
    updateMeter();
  } catch (err) {
    showError(form, err instanceof AuthError ? err.field : null, err.message);
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
}

authModal.addEventListener("click", (e) => {
  // Chỉ các nút chuyển tab (bản thân modal cũng có data-tab để tô tab đang chọn)
  const tabBtn = e.target.closest("button[data-tab]");
  if (tabBtn) return setAuthTab(tabBtn.dataset.tab);
  const eye = e.target.closest(".pw-eye");
  if (eye) {
    const input = eye.previousElementSibling, show = input.type === "password";
    input.type = show ? "text" : "password";
    eye.classList.toggle("on", show);
    eye.title = eye.ariaLabel = show ? "Ẩn mật khẩu" : "Hiện mật khẩu";
  }
});
authModal.addEventListener("mousedown", (e) => { if (e.target === authModal) closeAuth(); });
$("#authClose").onclick = closeAuth;
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !authModal.hidden) closeAuth(); });

// Kiểm tra từng ô khi rời ô (tạo tài khoản)
signupForm.querySelectorAll("input").forEach((input) => {
  input.addEventListener("blur", () => {
    if (!input.value) return;
    const msg = VicoAuth.validate(input.name, input.name === "email" ? input.value.trim() : input.value);
    signupForm.querySelector(`[data-err="${input.name}"]`).textContent = msg;
    input.classList.toggle("invalid", !!msg);
  });
  input.addEventListener("input", () => {
    if (input.classList.contains("invalid") && !VicoAuth.validate(input.name, input.value.trim())) {
      input.classList.remove("invalid");
      signupForm.querySelector(`[data-err="${input.name}"]`).textContent = "";
    }
  });
});
// Thanh độ mạnh mật khẩu
function updateMeter() {
  const v = $("#suPassword").value, s = v ? VicoAuth.passwordStrength(v) : 0;
  $("#pwMeter").dataset.level = v ? String(s) : "";
  $("#pwMeter").title = v ? ["Rất yếu", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"][s] : "";
}
$("#suPassword").addEventListener("input", updateMeter);

loginForm.onsubmit = (e) => {
  e.preventDefault();
  submitAuth(loginForm, async () => {
    user = await VicoAuth.logIn({ login: $("#liLogin").value, password: $("#liPassword").value });
    onAuthChanged();
    showToast(`Xin chào ${user.username}! Bạn còn ${fmt(user.total)} credit.`);
  });
};
signupForm.onsubmit = (e) => {
  e.preventDefault();
  // Báo lỗi tất cả các ô sai cùng lúc
  const errs = ["username", "email", "password"]
    .map((f) => { const v = signupForm.elements[f].value; return [f, VicoAuth.validate(f, f === "password" ? v : v.trim())]; })
    .filter(([, msg]) => msg);
  if (!$("#suConsent").checked) errs.push(["consent", "Bạn cần đọc và đồng ý Điều khoản sử dụng, Chính sách quyền riêng tư để tạo tài khoản"]);
  if (errs.length) {
    clearErrors(signupForm);
    errs.forEach(([f, msg]) => showError(signupForm, f, msg));
    return signupForm.elements[errs[0][0]].focus();
  }
  submitAuth(signupForm, async () => {
    user = await VicoAuth.signUp({ username: $("#suUsername").value, email: $("#suEmail").value, password: $("#suPassword").value, refCode: $("#suRefCode").value, consent: $("#suConsent").checked });
    adoptGuestData();
    onAuthChanged();
    showToast(`Tạo tài khoản thành công! Bạn được tặng ${fmt(VICO_CREDITS.signupBonus)} credit và ${fmt(VICO_CREDITS.dailyFree)} credit mỗi ngày.`, "success");
  });
};

// Đồng bộ khi đăng nhập / đăng xuất / tiêu credit ở tab khác
addEventListener("storage", (e) => {
  if (e.key !== VicoAuth.SES_KEY && e.key !== VicoAuth.ACC_KEY) return;
  const prev = user && user.id;
  user = VicoAuth.current();
  if ((user && user.id) !== prev) onAuthChanged();
  else renderAuth();
});
/* ---------- Điều khoản cập nhật: người dùng phải đồng ý bản mới trước khi chat tiếp ---------- */
document.querySelectorAll("[data-min-age]").forEach((e) => (e.textContent = VICO_LEGAL.minAge));
let consentOpen = false;
function checkConsent() {
  if (!user || !user.needsConsent || !VicoAuth.acceptConsent || consentOpen) return;
  consentOpen = true;
  const m = document.createElement("div");
  m.className = "modal consent-modal";
  m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="cmTitle">
      <div class="modal-head"><div><h3 id="cmTitle">Điều khoản đã được cập nhật</h3>
        <p>Để tiếp tục dùng Vico AI, hãy đọc và đồng ý phiên bản mới (${escapeHtml(VICO_LEGAL.terms)}).</p></div></div>
      <div class="modal-form">
        <label class="consent-box"><input type="checkbox" id="cmAgree" /><span>Tôi đã đọc và đồng ý <a href="terms.html" target="_blank" rel="noopener">Điều khoản sử dụng</a> và <a href="privacy.html" target="_blank" rel="noopener">Chính sách quyền riêng tư</a>; xác nhận tôi đủ ${VICO_LEGAL.minAge} tuổi (hoặc đã được cha mẹ / người giám hộ đồng ý); đồng ý để tin nhắn được xử lý bởi đối tác cung cấp AI, có thể ở nước ngoài.</span></label>
        <small class="field-err" id="cmErr"></small>
        <div class="modal-actions"><button class="btn-ghost" id="cmLogout" type="button">Đăng xuất</button><button class="btn-primary" id="cmOk" type="button">Đồng ý và tiếp tục</button></div>
      </div></div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); consentOpen = false; };
  m.querySelector("#cmLogout").onclick = () => { close(); VicoAuth.logOut(); user = null; onAuthChanged(); };
  m.querySelector("#cmOk").onclick = async () => {
    if (!m.querySelector("#cmAgree").checked) return (m.querySelector("#cmErr").textContent = "Hãy đánh dấu ô đồng ý");
    try { user = await VicoAuth.acceptConsent(); close(); renderAuth(); showToast("Cảm ơn bạn! Đã lưu sự đồng ý.", "success"); }
    catch (err) { m.querySelector("#cmErr").textContent = err.message; }
  };
}
// Bản dùng máy chủ: số dư thật về từ máy chủ (hoặc phiên hết hạn) thì vẽ lại
addEventListener("vico-user", (e) => {
  const prev = user && user.id, next = e.detail || null;
  user = next;
  if ((next && next.id) !== prev) onAuthChanged();
  else renderAuth();
  checkConsent();
});
// Sang ngày mới thì credit ngày tự làm mới; cập nhật đồng hồ đếm ngược
setInterval(() => { if (user) { user = VicoAuth.current(); renderAuth(); } }, 30000);

/* ---------- Group AI & tải bản desktop ---------- */
const groupModal = $("#groupModal"), desktopModal = $("#desktopModal");

function openModal(m) { closePops(); closeSidebar(); m.hidden = false; }
function closeModal(m) { m.hidden = true; if (m === groupModal) stopGroupDemo(); }
[groupModal, desktopModal].forEach((m) => {
  m.addEventListener("mousedown", (e) => { if (e.target === m) closeModal(m); });
  m.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(m); });
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!desktopModal.hidden) closeModal(desktopModal);
  else if (!groupModal.hidden) closeModal(groupModal);
});
// Mọi nút có data-open="desktop" (trong Group AI, thông báo…) đều mở trang tải
document.addEventListener("click", (e) => {
  if (!e.target.closest('[data-open="desktop"]')) return;
  if (!groupModal.hidden) closeModal(groupModal);
  openDesktop();
});

// Ví dụ group chat: mỗi AI một chức vụ, tự nhắc nhau sửa lỗi
const GROUP_ROLES = {
  lead:   { name: "Trưởng nhóm", letter: "T", color: "#3b82f6" },
  design: { name: "Thiết kế",    letter: "K", color: "#ec4899" },
  dev:    { name: "Lập trình",   letter: "L", color: "#10b981" },
  qa:     { name: "Kiểm thử",    letter: "Q", color: "#f59e0b" },
};
const GROUP_DEMO = [
  { who: "you",    text: "Làm cho mình trang web đặt bàn cho quán cà phê nhé" },
  { who: "lead",   text: "Rõ! Thiết kế lo giao diện, Lập trình viết code, Kiểm thử rà lỗi." },
  { who: "design", text: "Xong bố cục và bảng màu nâu ấm áp." },
  { who: "dev",    text: "Đã code xong form đặt bàn." },
  { who: "qa",     text: "@Lập trình form chưa kiểm tra số điện thoại, nhập chữ vẫn gửi được." },
  { who: "dev",    text: "Đã sửa rồi, cảm ơn @Kiểm thử!" },
];
$("#groupAvatars").innerHTML = Object.values(GROUP_ROLES)
  .map((r) => `<span style="--c:${r.color}" title="${r.name}">${r.letter}</span>`).join("");

let groupRun = 0;
const stopGroupDemo = () => groupRun++;
async function playGroupDemo() {
  const run = ++groupRun, box = $("#groupChat");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  box.innerHTML = "";
  for (const m of GROUP_DEMO) {
    await wait(m.who === "you" ? 250 : 450);
    if (run !== groupRun) return;
    const row = document.createElement("div");
    if (m.who === "you") {
      row.className = "gc-row me";
      row.innerHTML = `<span class="gc-bubble"></span>`;
      row.querySelector(".gc-bubble").textContent = m.text;
    } else {
      const r = GROUP_ROLES[m.who];
      row.className = "gc-row";
      row.innerHTML = `<span class="gc-av" style="--c:${r.color}">${r.letter}</span>
        <span class="gc-col"><b style="color:${r.color}">${r.name}</b><span class="gc-bubble"><span class="typing"><i></i><i></i><i></i></span></span></span>`;
    }
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
    if (m.who !== "you") {
      await wait(650);
      if (run !== groupRun) return;
      const b = row.querySelector(".gc-bubble");
      b.textContent = m.text;
      b.innerHTML = b.innerHTML.replace(/@(Lập trình|Kiểm thử|Thiết kế|Trưởng nhóm)/g, '<em class="gc-at">@$1</em>');
      box.scrollTop = box.scrollHeight;
    }
  }
}
$("#groupBtn").onclick = () => { openModal(groupModal); playGroupDemo(); };

// Trang tải: gợi ý đúng bản cho hệ điều hành đang dùng
function detectOS() {
  const p = (navigator.userAgentData?.platform || navigator.platform || navigator.userAgent).toLowerCase();
  if (p.includes("mac")) return "mac";
  if (p.includes("linux") && !/android/i.test(navigator.userAgent)) return "linux";
  return "windows";
}
/** Link tải là trang ghép file (download.html) chứ không phải file trực tiếp */
const isPage = (url) => /\.html(?:[?#]|$)/.test(url);
function downloadOS(os) {
  const d = VICO_DESKTOP.downloads[os];
  if (d.url) return true; // để trình duyệt tải theo link
  showToast(`Bản desktop cho ${d.label} sắp ra mắt, bạn quay lại sau nhé!`);
  return false;
}
function openDesktop() {
  const os = detectOS(), d = VICO_DESKTOP.downloads;
  const ready = Object.values(d).some((x) => x.url);
  $("#deskVersion").textContent = "· v" + VICO_DESKTOP.version;
  $("#deskSoon").hidden = ready;
  const main = $("#dlMain");
  main.href = d[os].url || "#";
  main.toggleAttribute("download", !!d[os].url && !isPage(d[os].url));
  main.dataset.os = os;
  $("#dlMainLabel").textContent = `Tải cho ${d[os].label} (${d[os].ext})`;
  $("#dlOthers").innerHTML = "Hoặc tải cho " + Object.keys(d).filter((k) => k !== os)
    .map((k) => `<a href="${d[k].url || "#"}" data-os="${k}"${d[k].url && !isPage(d[k].url) ? " download" : ""}>${d[k].label}</a>`).join(" · ");
  openModal(desktopModal);
}
desktopModal.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-os]");
  if (!a) return;
  if (!downloadOS(a.dataset.os)) return e.preventDefault();
  // Đã tải bản desktop: ẩn nút tải ở thanh bên (vẫn tải lại được từ Thông báo)
  saveKey("vico_desktop_got", true);
  $("#desktopBtn").hidden = true;
});
$("#desktopBtn").onclick = openDesktop;
$("#desktopBtn").hidden = !!loadKey("vico_desktop_got", false);

// Chấm đỏ trên chuông cho tới khi mở thông báo lần đầu
$("#bellDot").hidden = !!loadKey("vico_notif_seen", false);

/* ---------- Ô file: tải xuống & xem trước ---------- */
function downloadFile(f) {
  const url = URL.createObjectURL(new Blob([f.content], { type: "application/octet-stream" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const fileModal = $("#fileModal");
let viewing = null, viewingSiblings = {};
// Xem trang HTML: nạp luôn file CSS/JS gửi kèm trong cùng tin nhắn (style.css, app.js…)
function inlineAssets(html, files) {
  const pick = (ref) => files[ref.split(/[?#]/)[0].replace(/^\.\//, "")];
  return html
    .replace(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi, (tag, href) => {
      const css = /stylesheet/i.test(tag) && pick(href);
      return css ? `<style>\n${css}\n</style>` : tag;
    })
    .replace(/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi, (tag, a, src, b) => {
      const js = pick(src);
      return js ? `<script${a}${b}>\n${js.replace(/<\/script/gi, "<\\/script")}\n</script>` : tag;
    });
}
/** Gỡ trang đang xem trước (srcdoc của bản desktop hoặc preview.html của bản web). */
function clearPreviewFrame() {
  const fr = $("#fvFrame");
  fr.removeAttribute("srcdoc");
  if (fr.getAttribute("src")) fr.src = "about:blank";
}
function setFileTab(tab) {
  fileModal.querySelectorAll("#fvTabs [data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  $("#fvCode").hidden = tab !== "code";
  $("#fvFrame").hidden = tab !== "preview";
  // iframe sandbox (chỉ cho chạy script, không cùng nguồn): trang xem trước không truy cập được Vico AI
  if (tab !== "preview" || !viewing) return;
  const page = inlineAssets(viewing.content, viewingSiblings);
  // Bản desktop tự chuyển srcdoc sang app://preview. Bản web có CSP chặt (srcdoc thừa hưởng CSP nên script trong trang bị chặn):
  // nạp preview.html (CSP riêng) rồi gửi nội dung qua postMessage.
  if (document.documentElement.classList.contains("is-desktop")) { $("#fvFrame").srcdoc = page; return; }
  const fr = $("#fvFrame");
  const onReady = (e) => {
    if (e.source !== fr.contentWindow || e.data !== "vico-preview-ready") return;
    removeEventListener("message", onReady);
    fr.contentWindow.postMessage(page, "*"); // khung sandbox có nguồn "null" nên phải dùng "*"
  };
  addEventListener("message", onReady);
  fr.src = "preview.html";
}
const fileTab = () => (fileModal.querySelector("#fvTabs [data-tab].on") || {}).dataset?.tab || "code";

/* Phiên bản: các bản AI gửi cùng tên trong đoạn chat (theo thứ tự) + các bản bạn đã sửa */
let fileVers = [], verIdx = 0, editingFile = false;
function fileVersions(name, fallback) {
  const list = [];
  els.messages.querySelectorAll(".file-tile").forEach((t) => {
    const s = sentFiles.get(t.dataset.file);
    if (s && s.name === name) list.push({ name, content: s.content, size: s.size, by: "ai", id: t.dataset.file });
  });
  if (!list.length && fallback) list.push({ ...fallback, by: "ai" });
  const chat = current();
  ((chat && chat.fileEdits && chat.fileEdits[name]) || []).forEach((e) =>
    list.push({ name, content: e.content, size: new Blob([e.content]).size, by: "you", t: e.t }));
  return list;
}
function showVersion(i) {
  verIdx = Math.max(0, Math.min(i, fileVers.length - 1));
  const v = fileVers[verIdx];
  viewing = v;
  if (v.name in viewingSiblings) viewingSiblings = { ...viewingSiblings, [v.name]: v.content };
  const t = fileType(v.name);
  const lines = v.content.split("\n");
  $("#fvMeta").textContent = `${t.kind} · ${fmtSize(v.size)} · ${fmt(lines.length)} dòng` + (v.by === "you" ? " · bản bạn sửa" : "");
  const MAX = 5000;
  $("#fvCode").innerHTML = lines.slice(0, MAX).map((l) => `<span>${escapeHtml(l) || " "}</span>`).join("") +
    (lines.length > MAX ? `<span class="fv-more">… còn ${fmt(lines.length - MAX)} dòng, tải file về để xem đủ</span>` : "");
  $("#fvVers").hidden = fileVers.length < 2;
  $("#fvVerLabel").textContent = `Bản ${verIdx + 1}/${fileVers.length}`;
  $("#fvPrev").disabled = verIdx === 0;
  $("#fvNext").disabled = verIdx === fileVers.length - 1;
  if (fileTab() === "preview") setFileTab("preview");
}
/** Mở khung xem file. f = { name, content, size }, siblings = các file cùng tin nhắn (để xem trang HTML). */
function openFilePreview(f, siblings = {}) {
  viewingSiblings = siblings;
  setEditing(false);
  const t = fileType(f.name);
  $("#fvBadge").textContent = t.label;
  $("#fvBadge").style.background = t.color;
  $("#fvName").textContent = f.name;
  $("#fvTabs").hidden = !["html", "htm", "svg"].includes(t.ext);
  clearPreviewFrame();
  setFileTab("code");
  fileVers = fileVersions(f.name, f);
  const at = fileVers.findIndex((v) => (f.id ? v.id === f.id : v.content === f.content));
  showVersion(at >= 0 ? at : fileVers.length - 1);
  fileModal.hidden = false;
}
function setEditing(on) {
  editingFile = on;
  $("#fvEditor").hidden = !on;
  $("#fvEditBar").hidden = !on;
  ["#fvEdit", "#fvCopy", "#fvDownload"].forEach((s) => ($(s).hidden = on));
  if (on) {
    $("#fvVers").hidden = $("#fvTabs").hidden = true;
    $("#fvCode").hidden = $("#fvFrame").hidden = true;
    $("#fvEditor").value = viewing.content;
    $("#fvEditor").focus();
  } else if (viewing) {
    $("#fvTabs").hidden = !["html", "htm", "svg"].includes(fileType(viewing.name).ext);
    $("#fvVers").hidden = fileVers.length < 2;
    setFileTab(fileTab());
  }
}
function saveFileEdit() {
  const content = $("#fvEditor").value;
  if (content === viewing.content) return setEditing(false);
  const chat = current();
  if (chat) {
    chat.fileEdits = chat.fileEdits || {};
    (chat.fileEdits[viewing.name] = chat.fileEdits[viewing.name] || []).push({ content, t: Date.now() });
    save();
  }
  fileVers = chat ? fileVersions(viewing.name, viewing) : [...fileVers, { name: viewing.name, content, size: new Blob([content]).size, by: "you" }];
  setEditing(false);
  showVersion(fileVers.length - 1);
  showToast("Đã lưu bản sửa. Bấm Tải xuống để lấy file.");
}
function cancelFileEdit() {
  if ($("#fvEditor").value !== viewing.content && !confirm("Bỏ các thay đổi chưa lưu?")) return;
  setEditing(false);
}
const closeFilePreview = () => {
  if (editingFile && $("#fvEditor").value !== viewing.content && !confirm("Bỏ các thay đổi chưa lưu?")) return;
  setEditing(false);
  fileModal.hidden = true;
  clearPreviewFrame();
  viewing = null;
};
els.messages.addEventListener("click", (e) => {
  const tile = e.target.closest(".file-tile");
  const f = tile && sentFiles.get(tile.dataset.file);
  if (!f) return;
  if (e.target.closest(".file-dl")) return downloadFile(f);
  const siblings = {};
  tile.closest(".content").querySelectorAll(".file-tile").forEach((t) => {
    const s = sentFiles.get(t.dataset.file);
    if (s) siblings[s.name] = s.content;
  });
  openFilePreview({ ...f, id: tile.dataset.file }, siblings);
});
fileModal.addEventListener("click", (e) => {
  const tab = e.target.closest("#fvTabs [data-tab]");
  if (tab) setFileTab(tab.dataset.tab);
  if (e.target.closest("[data-close]")) closeFilePreview();
});
fileModal.addEventListener("mousedown", (e) => { if (e.target === fileModal) closeFilePreview(); });
document.addEventListener("keydown", (e) => {
  if (fileModal.hidden || e.key !== "Escape") return;
  if (editingFile) cancelFileEdit(); else closeFilePreview();
});
$("#fvPrev").onclick = () => showVersion(verIdx - 1);
$("#fvNext").onclick = () => showVersion(verIdx + 1);
$("#fvEdit").onclick = () => viewing && setEditing(true);
$("#fvEditSave").onclick = saveFileEdit;
$("#fvEditCancel").onclick = cancelFileEdit;
$("#fvEditor").addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveFileEdit(); }
  else if (e.key === "Tab" && !e.shiftKey) { // Tab chèn 2 dấu cách thay vì nhảy ra khỏi ô
    e.preventDefault();
    const ta = e.target, s = ta.selectionStart;
    ta.setRangeText("  ", s, ta.selectionEnd, "end");
  }
  e.stopPropagation();
});
$("#fvDownload").onclick = () => viewing && downloadFile(viewing);
$("#fvCopy").onclick = async () => {
  if (!viewing) return;
  try { await navigator.clipboard.writeText(viewing.content); showToast("Đã sao chép nội dung file."); }
  catch { showToast("Không sao chép được, hãy tải file về.", "warn"); }
};

/* ---------- UI helpers ---------- */
function autoGrow() {
  els.input.style.height = "auto";
  els.input.style.height = Math.min(els.input.scrollHeight, 200) + "px";
}
const SEND_SVG = `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const STOP_SVG = `<svg viewBox="0 0 24 24" width="14" height="14"><rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor"/></svg>`;
function updateSend() {
  const has = !!els.input.value.trim() || pendingAttachments.length > 0;
  // Đang trả lời: nút gửi thành nút Dừng (chỉ dừng được câu trả lời có thể huỷ)
  const stoppable = busy && !!activeAbort;
  if (els.send.dataset.state !== (stoppable ? "stop" : "send")) {
    els.send.dataset.state = stoppable ? "stop" : "send";
    els.send.innerHTML = stoppable ? STOP_SVG : SEND_SVG;
  }
  els.send.classList.toggle("stop", stoppable);
  els.send.disabled = stoppable ? false : busy || !has;
  const eng = replyEngine();
  els.send.title = stoppable ? "Dừng trả lời" : !user ? "Gửi" : eng.cost ? "Gửi" : `Gửi (${eng.label || "miễn phí"})`;
  els.form.classList.toggle("has-text", els.input.value.length > 0); // đang gõ: các nút thu thành icon
}
const isMobile = () => matchMedia("(max-width: 768px)").matches;
const openSidebar = () => { els.sidebar.classList.add("open", "expanded"); els.overlay.classList.add("show"); };
const closeSidebar = () => {
  if (!isMobile()) return;
  els.sidebar.classList.remove("open", "expanded"); els.overlay.classList.remove("show");
};
function setExpanded(on) {
  els.sidebar.classList.toggle("expanded", on);
  const btn = $("#toggleSidebar");
  btn.title = on ? "Thu gọn thanh bên" : "Mở thanh bên";
  btn.setAttribute("aria-expanded", on);
  try { localStorage.setItem("vico_sidebar", on ? "1" : "0"); } catch {}
}

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("vico_theme", t); } catch {}
}

/* ---------- Events ---------- */
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (busy) return stopGenerating();
  sendMessage(els.input.value);
});
els.input.addEventListener("input", () => { autoGrow(); updateSend(); });
els.input.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.isComposing) return;
  // Cài đặt "Enter để gửi": Enter gửi, Shift+Enter xuống dòng. Tắt: Ctrl+Enter mới gửi.
  const send = settings.enterToSend ? !e.shiftKey : e.ctrlKey || e.metaKey;
  if (send) { e.preventDefault(); sendMessage(els.input.value); }
});
// Màn hình chào: thẻ chọn chủ đề, ví dụ mẫu và mở tệp
function fillInput(text) {
  els.input.value = text; autoGrow(); updateSend();
  els.input.focus();
  els.input.setSelectionRange(text.length, text.length);
}
document.querySelectorAll(".card-feature").forEach((c) => (c.onclick = () => setTopic(c.dataset.topic)));

// Xem "Xây dựng": lưới các loại sản phẩm
function showView(id) {
  document.querySelectorAll("#welcome .view").forEach((v) => (v.hidden = v.id !== id));
  els.chat.scrollTop = 0;
}
$("#buildCard").onclick = () => showView("buildView");
$("#backHome").onclick = () => showView("homeView");
document.querySelectorAll(".build-item").forEach((b) => (b.onclick = () => {
  setTopic(b.dataset.topic);
  fillInput(b.dataset.prompt);
}));
document.querySelectorAll(".example").forEach((b) => (b.onclick = () => {
  setTopic(b.dataset.topic);
  fillInput(b.dataset.prompt);
}));
const fileInput = $("#fileInput");
$("#openFile").onclick = () => fileInput.click();
fileInput.onchange = async () => {
  const f = fileInput.files[0];
  fileInput.value = "";
  if (!f) return;
  if (f.size > 200 * 1024) return alert("Tệp quá lớn (tối đa 200 KB).");
  const text = await f.text();
  fillInput(`Đây là nội dung tệp "${f.name}":\n\n\`\`\`\n${text}\n\`\`\`\n\n`);
};
// Thông báo & tài khoản
function togglePop(wrap) {
  const open = !wrap.classList.contains("open");
  document.querySelectorAll(".pop-wrap.open").forEach((w) => w.classList.remove("open"));
  wrap.classList.toggle("open", open);
}
$("#historyBtn").onclick = (e) => togglePop(e.currentTarget.parentElement);
$("#bellBtn").onclick = (e) => {
  togglePop(e.currentTarget.parentElement);
  saveKey("vico_notif_seen", true);
  $("#bellDot").hidden = true;
};
$("#avatarBtn").onclick = (e) => togglePop(e.currentTarget.parentElement);
document.addEventListener("click", (e) => {
  if (document.contains(e.target) && !e.target.closest(".pop-wrap")) closePops();
});
$("#newChat").onclick = newChat;
$("#openSidebar").onclick = openSidebar;
$("#toggleSidebar").onclick = () => {
  closePops();
  if (isMobile()) closeSidebar();
  else setExpanded(!els.sidebar.classList.contains("expanded"));
};
els.overlay.onclick = closeSidebar;
$("#themeToggle").onclick = () =>
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");

/* ---------- Init ---------- */
let savedTheme = null;
try { savedTheme = localStorage.getItem("vico_theme"); } catch {}
setTheme(savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
renderModelPicker();
let savedSidebar = null;
try { savedSidebar = localStorage.getItem("vico_sidebar"); } catch {}
if (savedSidebar === "1" && !isMobile()) setExpanded(true);
renderAuth();
renderMode();
renderTopics();
renderReasoning();
renderProjects();
renderHistory();
renderChat();
