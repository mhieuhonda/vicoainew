/* =========================================================
   Vico AI - LỚP RIÊNG CỦA BẢN DESKTOP
   Nạp sau app.js. Giao diện giữ như bản web, thêm:
   - Khung "Thư mục": mở folder, xem file, đưa file vào chat
   - Khung "Terminal": chạy lệnh PowerShell thật trên máy
   - Nút "Chạy trong terminal" dưới các khối lệnh AI gợi ý (bạn bấm mới chạy)
   - Group AI: nhiều AI đóng vai một team trong cùng một group chat
   ========================================================= */
(() => {
  const D = window.vicoDesktop;
  if (!D) return;
  const root = document.documentElement;
  root.classList.add("is-desktop");

  const SVG = (p, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const I = {
    panel: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M14.5 4v16"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6l2 2.2h7.4A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    play: '<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    send: '<path d="M4 12h12M12 6l6 6-6 6"/>',
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = { get: (k, d) => loadKey(k, d), set: (k, v) => saveKey(k, v) };
  let agentOn = store.get("vico_agent", false); // chế độ Agent (xem phần Agent ở cuối file)

  /* ---------- Thanh tiêu đề theo giao diện sáng/tối ---------- */
  const baseSetTheme = setTheme;
  setTheme = (t) => { baseSetTheme(t); D.setTheme(t); };
  D.setTheme(root.dataset.theme);

  /* ---------- Bỏ các phần "tải bản desktop" (đang ở bản desktop rồi) ---------- */
  $("#bellPop").innerHTML = `<div class="pop-title">Thông báo</div><div class="pop-empty">Chưa có thông báo nào</div>`;
  $("#bellDot").hidden = true;

  /* ---------- Khung làm việc: Thư mục + Terminal ---------- */
  const wsBtn = document.createElement("button");
  wsBtn.className = "icon-btn";
  wsBtn.id = "wsToggle";
  wsBtn.title = "Thư mục & Terminal";
  wsBtn.innerHTML = SVG(I.panel, 20);
  $("#themeToggle").before(wsBtn);

  const ws = document.createElement("aside");
  ws.className = "workspace";
  ws.id = "workspace";
  ws.innerHTML = `
    <div class="ws-titlebar"><span>Không gian làm việc</span></div>
    <div class="ws-tabs" role="tablist">
      <button data-wstab="code" role="tab">${SVG('<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>', 15)}Code<small id="cpTabCount"></small></button>
      <button data-wstab="pc" role="tab">${SVG('<path d="M4 17l6-5-6-5M12 19h8"/>', 15)}Thư mục &amp; Terminal</button>
    </div>
    <section class="ws-code">
      <div class="cp-explorer">
        <header class="cp-head"><span>File trong phiên</span><small id="cpCount"></small></header>
        <div class="cp-list" id="cpList"></div>
      </div>
      <div class="cp-editor">
        <div class="cp-tabs" id="cpTabs"></div>
        <div class="cp-bar" id="cpBar"></div>
        <div class="cp-view" id="cpView"></div>
        <div class="cp-status" id="cpStatus"></div>
      </div>
    </section>
    <section class="ws-files">
      <header class="ws-head">
        <b>Thư mục</b><span class="ws-name" id="wsName"></span>
        <button class="ws-icon" id="wsReveal" title="Mở trong File Explorer" hidden>${SVG(I.external, 15)}</button>
        <button class="ws-icon" id="wsRefresh" title="Làm mới" hidden>${SVG(I.refresh, 15)}</button>
        <button class="ws-icon" id="wsOpen" title="Mở thư mục khác">${SVG(I.folder, 15)}</button>
      </header>
      <div class="ws-tree" id="wsTree">
        <div class="ws-empty">
          ${SVG(I.folder, 30)}
          <p>Mở một thư mục để Vico AI đọc file và làm việc cùng bạn.</p>
          <button class="btn-primary sm" id="wsOpenEmpty">Mở thư mục</button>
        </div>
      </div>
      <div class="ws-preview" id="wsPreview" hidden>
        <header class="ws-head">
          ${SVG(I.file, 15)}<span class="ws-name" id="pvName"></span>
          <button class="ws-chip" id="pvToChat" title="Đưa nội dung file vào ô chat">Đưa vào chat</button>
          <button class="ws-icon" id="pvClose" title="Đóng">${SVG(I.close, 15)}</button>
        </header>
        <pre id="pvBody"></pre>
      </div>
    </section>
    <section class="ws-term">
      <header class="ws-head">
        <b>Terminal</b><span class="ws-name" id="termCwdLabel"></span>
        <button class="ws-chip danger" id="termStop" hidden>Dừng</button>
        <button class="ws-icon" id="termClear" title="Xoá màn hình">${SVG('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', 15)}</button>
      </header>
      <div class="term-out" id="termOut"><span class="t-dim">PowerShell · gõ lệnh rồi nhấn Enter. Dùng "cd" để đổi thư mục, "cls" để xoá màn hình.\n</span></div>
      <form class="term-in" id="termForm">
        <span class="term-ps" id="termPs">PS&gt;</span>
        <input id="termInput" autocomplete="off" spellcheck="false" aria-label="Lệnh terminal" />
      </form>
    </section>`;
  $(".app").appendChild(ws);

  const setWs = (open) => {
    root.classList.toggle("ws-open", open);
    wsBtn.classList.toggle("active", open);
    store.set("vico_ws", open);
  };
  wsBtn.onclick = () => setWs(!root.classList.contains("ws-open"));
  setWs(store.get("vico_ws", true));
  // Hai tab: Code (file AI viết trong phiên) | Thư mục & Terminal
  const setTab = (tab) => {
    ws.dataset.tab = tab;
    ws.querySelectorAll("[data-wstab]").forEach((b) => { b.classList.toggle("on", b.dataset.wstab === tab); b.setAttribute("aria-selected", b.dataset.wstab === tab); });
    store.set("vico_ws_tab", tab);
  };
  const showPc = () => { setWs(true); setTab("pc"); };
  ws.querySelector(".ws-tabs").onclick = (e) => { const b = e.target.closest("[data-wstab]"); if (b) setTab(b.dataset.wstab); };
  setTab(store.get("vico_ws_tab", "code"));
  // Kéo mép trái để đổi độ rộng khung làm việc
  const grip = document.createElement("div");
  grip.className = "ws-resize";
  grip.title = "Kéo để đổi độ rộng";
  ws.appendChild(grip);
  const setW = (w) => { w = Math.max(320, Math.min(Math.round(innerWidth * 0.62), w)); ws.style.width = w + "px"; return w; };
  setW(store.get("vico_ws_w", 440));
  grip.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    root.classList.add("ws-resizing");
    const move = (ev) => setW(innerWidth - ev.clientX); // khung nằm sát mép phải cửa sổ
    const up = () => {
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", up);
      root.classList.remove("ws-resizing");
      store.set("vico_ws_w", parseInt(ws.style.width, 10));
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", up);
  });

  /* Thư mục */
  let folder = null;           // { root, name }
  let topEntries = [];         // file/thư mục cấp 1, gửi kèm cho AI làm ngữ cảnh
  let preview = null;          // { rel, content }
  const expanded = new Set();

  async function openFolder() {
    const f = await D.openFolder();
    if (!f) return;
    // Đang ở dự án chưa gắn thư mục: gắn luôn thư mục vừa mở vào dự án
    const p = currentProject();
    if (p && !p.folder) { p.folder = { root: f.root, name: f.name }; p.autoSave = true; saveKey(uk("vico_projects"), projects); }
    await useFolder(f, true);
  }
  /** Mở thư mục đã có đường dẫn (thư mục của dự án). */
  async function openFolderPath(root, quiet) {
    const f = await D.setFolder(root);
    await useFolder(f, quiet);
    return f;
  }
  async function useFolder(f, announce) {
    folder = f;
    renderFolderChip();
    expanded.clear();
    $("#wsName").textContent = f.name;
    $("#wsName").title = f.root;
    $("#wsRefresh").hidden = $("#wsReveal").hidden = false;
    closePreview();
    await renderTree();
    await refreshCwd();
    termPrint(`Đã mở thư mục ${f.root}\n`, "t-dim");
    if (announce) showToast(`Đã mở thư mục "${f.name}". Vico AI sẽ thấy danh sách file trong thư mục này.`);
  }
  async function renderTree() {
    const box = $("#wsTree");
    box.innerHTML = "";
    try {
      topEntries = await D.listFolder("");
      box.appendChild(await buildLevel(topEntries, 0));
      if (!topEntries.length) box.innerHTML = `<div class="ws-empty"><p>Thư mục trống</p></div>`;
    } catch (err) {
      box.innerHTML = `<div class="ws-empty"><p>${esc(err.message)}</p></div>`;
    }
  }
  async function buildLevel(entries, depth) {
    const frag = document.createDocumentFragment();
    for (const e of entries) {
      const row = document.createElement("button");
      row.className = "ws-node" + (e.dir ? " dir" : "") + (preview && preview.rel === e.rel ? " on" : "");
      row.style.paddingLeft = 8 + depth * 14 + "px";
      row.title = e.rel;
      row.innerHTML = (e.dir ? `<span class="caret${expanded.has(e.rel) ? " open" : ""}">${SVG(I.chevron, 12)}</span>${SVG(I.folder, 15)}`
        : `<span class="caret"></span>${SVG(I.file, 15)}`) + `<span class="nm">${esc(e.name)}</span>`;
      frag.appendChild(row);
      const kids = document.createElement("div");
      kids.className = "ws-kids";
      frag.appendChild(kids);
      if (e.dir && expanded.has(e.rel)) kids.appendChild(await buildLevel(await D.listFolder(e.rel).catch(() => []), depth + 1));
      row.onclick = async () => {
        if (!e.dir) return openPreview(e.rel, row);
        if (expanded.has(e.rel)) { expanded.delete(e.rel); kids.innerHTML = ""; }
        else { expanded.add(e.rel); kids.appendChild(await buildLevel(await D.listFolder(e.rel).catch(() => []), depth + 1)); }
        row.querySelector(".caret").classList.toggle("open", expanded.has(e.rel));
      };
    }
    return frag;
  }
  async function openPreview(rel, row) {
    try {
      const r = await D.readFile(rel);
      document.querySelectorAll(".ws-node.on").forEach((n) => n.classList.remove("on"));
      row && row.classList.add("on");
      preview = r.binary ? null : { rel, content: r.content };
      $("#pvName").textContent = rel;
      $("#pvBody").textContent = r.binary ? "(File nhị phân, không xem được)" : r.content + (r.truncated ? "\n\n… (file dài, chỉ hiện 300 KB đầu)" : "");
      $("#pvToChat").hidden = !!r.binary;
      $("#wsPreview").hidden = false;
    } catch (err) { showToast(err.message, "warn"); }
  }
  function closePreview() {
    preview = null;
    $("#wsPreview").hidden = true;
    document.querySelectorAll(".ws-node.on").forEach((n) => n.classList.remove("on"));
  }
  $("#wsOpen").onclick = openFolder;
  $("#wsOpenEmpty").onclick = openFolder;
  $("#wsRefresh").onclick = renderTree;
  $("#wsReveal").onclick = () => D.reveal("");
  $("#pvClose").onclick = closePreview;
  $("#pvToChat").onclick = () => {
    if (!preview) return;
    const lang = (preview.rel.split(".").pop() || "").toLowerCase();
    fillInput(`Đây là nội dung file "${preview.rel}":\n\n\`\`\`${/^[a-z0-9]+$/.test(lang) ? lang : ""}\n${preview.content}\n\`\`\`\n\n`);
  };

  /* Terminal */
  const out = $("#termOut"), input = $("#termInput");
  let running = null, history = store.get("vico_term_history", []), hIdx = history.length;
  function termPrint(text, cls = "") {
    const span = document.createElement("span");
    if (cls) span.className = cls;
    span.textContent = text.replace(/\r\n?/g, "\n"); // PowerShell xuống dòng kiểu \r\n
    out.appendChild(span);
    while (out.childNodes.length > 1500) out.firstChild.remove();
    out.scrollTop = out.scrollHeight;
  }
  async function refreshCwd() {
    const cwd = await D.termCwd();
    const short = cwd.split(/[\\/]/).filter(Boolean).pop() || cwd;
    $("#termPs").textContent = `PS ${short}>`;
    $("#termCwdLabel").textContent = cwd;
    $("#termCwdLabel").title = cwd;
  }
  async function runCommand(cmd) {
    cmd = cmd.trim();
    if (!cmd) return;
    if (running) return showToast("Đang chạy một lệnh khác, bấm Dừng nếu muốn huỷ.", "warn");
    history = [...history.filter((h) => h !== cmd), cmd].slice(-100);
    hIdx = history.length;
    store.set("vico_term_history", history);
    if (/^(cls|clear)$/i.test(cmd)) { out.innerHTML = ""; return; }
    termPrint(`${$("#termPs").textContent} ${cmd}\n`, "t-cmd");
    const r = await D.run(cmd);
    if (!r) return;
    if (r.error) return termPrint(r.error + "\n", "t-err");
    if (!r.id) return refreshCwd(); // lệnh cd
    running = r.id;
    $("#termStop").hidden = false;
    input.disabled = true;
  }
  D.onTermData(({ id, data, err }) => { if (id === running) termPrint(data, err ? "t-err" : ""); });
  D.onTermExit(({ id, code }) => {
    if (id !== running) return;
    if (code) termPrint(`[Kết thúc với mã ${code}]\n`, "t-dim");
    running = null;
    $("#termStop").hidden = true;
    input.disabled = false;
    input.focus();
  });
  $("#termForm").onsubmit = (e) => { e.preventDefault(); const v = input.value; input.value = ""; runCommand(v); };
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && hIdx > 0) { input.value = history[--hIdx]; e.preventDefault(); }
    else if (e.key === "ArrowDown") { hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ""; e.preventDefault(); }
  });
  $("#termStop").onclick = () => running && D.kill(running);
  $("#termClear").onclick = () => (out.innerHTML = "");
  refreshCwd();

  /* ---------- Nút dưới khối lệnh terminal AI gửi: Sao chép / Chạy trong terminal ---------- */
  const SHELL_LANGS = new Set(["powershell", "ps", "ps1", "pwsh", "bash", "sh", "shell", "cmd", "bat", "console", "terminal", "zsh"]);
  function decorateCode(pre) {
    if (pre.dataset.decorated) return;
    pre.dataset.decorated = "1";
    const code = pre.querySelector("code");
    const bar = document.createElement("div");
    bar.className = "code-bar";
    const lang = pre.dataset.lang || "";
    bar.innerHTML = `<span class="code-lang">${esc(lang || "code")}</span>
      <button class="code-btn" data-act="copy">${SVG(I.copy, 13)}Sao chép</button>
      ${SHELL_LANGS.has(lang) ? `<button class="code-btn run" data-act="run">${SVG(I.play, 12)}Chạy trong terminal</button>` : ""}`;
    bar.onclick = async (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "copy") {
        await navigator.clipboard.writeText(code.textContent);
        showToast("Đã sao chép.");
      } else if (act === "run") {
        showPc();
        // Mỗi dòng không phải chú thích là một lệnh, chạy lần lượt
        const lines = code.textContent.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
        for (const l of lines) {
          await runCommand(l);
          await new Promise((r) => { const t = setInterval(() => { if (!running) { clearInterval(t); r(); } }, 120); });
        }
      }
    };
    pre.before(bar);
  }
  /* ---------- Panel Code (kiểu VS Code) ----------
     Code AI viết không hiện trong khung chat nữa: khối code (trừ lệnh terminal) thành chip "Mở trong panel".
     Panel bên phải: trên là danh sách file AI tạo trong phiên chat, dưới là code (số dòng, tô màu, các bản, sửa, tải, lưu vào thư mục). */
  const LANG_FILE = {
    html: ["index", "html"], htm: ["index", "html"], xml: ["data", "xml"], svg: ["image", "svg"], css: ["style", "css"], scss: ["style", "scss"],
    javascript: ["script", "js"], js: ["script", "js"], mjs: ["script", "js"], typescript: ["main", "ts"], ts: ["main", "ts"],
    jsx: ["App", "jsx"], tsx: ["App", "tsx"], vue: ["App", "vue"], json: ["data", "json"], yaml: ["config", "yaml"], yml: ["config", "yml"],
    python: ["main", "py"], py: ["main", "py"], java: ["Main", "java"], kotlin: ["Main", "kt"], c: ["main", "c"], cpp: ["main", "cpp"], "c++": ["main", "cpp"],
    csharp: ["Program", "cs"], cs: ["Program", "cs"], go: ["main", "go"], rust: ["main", "rs"], rs: ["main", "rs"], php: ["index", "php"],
    ruby: ["main", "rb"], rb: ["main", "rb"], swift: ["main", "swift"], dart: ["main", "dart"], lua: ["main", "lua"], r: ["script", "r"],
    sql: ["query", "sql"], markdown: ["README", "md"], md: ["README", "md"], dockerfile: ["Dockerfile", ""], toml: ["config", "toml"], ini: ["config", "ini"],
  };
  const HL_ALIAS = { html: "xml", htm: "xml", svg: "xml", vue: "xml", yml: "yaml", md: "markdown", rs: "rust", kt: "kotlin", cs: "csharp", rb: "ruby",
    py: "python", js: "javascript", mjs: "javascript", ts: "typescript", jsx: "javascript", tsx: "typescript", sh: "bash", ps1: "powershell" };
  const fileNameFor = (lang, nth) => {
    const [base, ext] = LANG_FILE[lang] || ["code", /^[a-z0-9]{1,10}$/.test(lang) ? lang : "txt"];
    return (nth > 1 ? `${base}-${nth}` : base) + (ext ? "." + ext : "");
  };
  function hlCode(code, name) {
    const ext = fileType(name).ext, lang = HL_ALIAS[ext] || ext;
    try { if (window.hljs && lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value; } catch {}
    return esc(code);
  }

  let cpFiles = [];        // [{ name, versions: [{ content, by: "ai" | "you", streaming }] }]
  let cpSel = null, cpVer = null, cpEditing = false, cpFollow = true, cpChat = undefined, cpCount = 0;
  const cpFile = () => cpFiles.find((f) => f.name === cpSel) || null;

  /** Gom file của phiên từ khung chat (chip code + ô file) và các bản người dùng đã sửa (chat.fileEdits). */
  function collectFiles() {
    const groups = new Map();
    let newest = null;
    const add = (name, v) => {
      if (!groups.has(name)) groups.set(name, { name, versions: [] });
      groups.get(name).versions.push(v);
      return groups.get(name).versions.length - 1;
    };
    els.messages.querySelectorAll(":scope > .msg.bot").forEach((msg) => {
      const streaming = !!msg.querySelector(".stream-caret");
      const nth = {};
      msg.querySelectorAll(".content .code-chip, .content .file-tile").forEach((el) => {
        let name, content;
        if (el.classList.contains("file-tile")) {
          const f = sentFiles.get(el.dataset.file);
          if (!f) return;
          name = f.name; content = f.content;
        } else {
          const c = el._code;
          if (!c) return;
          const key = fileNameFor(c.lang, 1);
          nth[key] = (nth[key] || 0) + 1; // 2 khối cùng loại trong một tin -> main.py, main-2.py
          name = fileNameFor(c.lang, nth[key]); content = c.content;
        }
        el.dataset.name = name;
        el.dataset.ver = add(name, { content, by: "ai", streaming });
        newest = name;
      });
    });
    const chat = current();
    if (chat && chat.fileEdits) for (const [name, edits] of Object.entries(chat.fileEdits)) {
      edits.forEach((e) => add(name, { content: e.content, by: "you", t: e.t }));
    }
    return { files: [...groups.values()], newest };
  }
  function paintChips() {
    els.messages.querySelectorAll(".code-chip").forEach((el) => {
      const name = el.dataset.name, f = cpFiles.find((x) => x.name === name);
      if (!name || !f) return;
      const ver = +el.dataset.ver, v = f.versions[ver], t = fileType(name);
      const lines = el._code.content.split("\n").length, total = f.versions.filter((x) => x.by === "ai").length;
      const label = `${name}|${lines}|${v && v.streaming}|${ver}|${total}`;
      if (el.dataset.label === label) return; // chỉ vẽ lại khi đổi (tránh vòng lặp với MutationObserver)
      el.dataset.label = label;
      el.innerHTML = `<span class="cc-badge" style="background:${t.color}">${esc(t.label)}</span>
        <span class="cc-text"><b>${esc(name)}</b><small>${v && v.streaming ? "AI đang viết…" : `${esc(t.kind)} · ${lines} dòng${total > 1 ? ` · bản ${ver + 1}` : ""}`}</small></span>
        <span class="cc-open">${SVG(I.panel, 14)}Mở trong panel</span>`;
    });
  }
  function refreshCode() {
    const { files, newest } = collectFiles();
    cpFiles = files;
    paintChips();
    const n = files.reduce((s, f) => s + f.versions.length, 0);
    const switched = currentId !== cpChat;
    if (currentId !== cpChat) { // đổi đoạn chat: chọn file mới nhất, không tự mở panel
      cpChat = currentId; cpCount = n; cpSel = newest; cpVer = null; cpEditing = false; cpFollow = true;
    } else if (n > cpCount) { // AI vừa viết file mới -> mở panel, chuyển sang tab Code
      cpCount = n;
      if (cpFollow || !cpSel) { cpSel = newest; cpVer = null; }
      if (!cpEditing) { setWs(true); setTab("code"); }
    } else cpCount = n;
    if (cpSel && !cpFile()) { cpSel = newest; cpVer = null; }
    renderPanel();
    autoSaveFiles(files, switched);
  }

  function renderPanel() {
    const f = cpFile();
    $("#cpCount").textContent = cpFiles.length || "";
    $("#cpTabCount").textContent = cpFiles.length || "";
    $("#cpList").innerHTML = cpFiles.length ? cpFiles.map((x) => {
      const t = fileType(x.name), live = x.versions.some((v) => v.streaming);
      return `<button class="cp-file${x.name === cpSel ? " on" : ""}" data-name="${esc(x.name)}" title="${esc(x.name)}">
        <span class="cp-badge" style="--c:${t.color}">${esc(t.label)}</span><span class="cp-fname">${esc(x.name)}</span>
        ${live ? '<i class="cp-live" title="AI đang viết"></i>' : ""}${x.versions.length > 1 ? `<small>${x.versions.length} bản</small>` : ""}</button>`;
    }).join("") : `<div class="cp-empty">Chưa có file nào trong phiên này.<br />Khi AI viết code, file sẽ hiện ở đây.</div>`;
    if (!f) {
      $("#cpTabs").innerHTML = "";
      $("#cpBar").innerHTML = "";
      $("#cpView").innerHTML = `<div class="cp-welcome">${SVG('<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>', 34)}<b>Panel code</b><span>Code AI viết trong phiên chat sẽ hiện ở đây thay vì trong khung chat.</span></div>`;
      $("#cpStatus").textContent = "";
      return;
    }
    const vi = cpVer == null ? f.versions.length - 1 : Math.min(cpVer, f.versions.length - 1);
    const v = f.versions[vi], t = fileType(f.name), lines = v.content.split("\n");
    const canPreview = ["html", "htm", "svg"].includes(t.ext);
    $("#cpTabs").innerHTML = `<div class="cp-tab"><span class="cp-badge" style="--c:${t.color}">${esc(t.label)}</span>${esc(f.name)}${v.streaming ? '<i class="cp-live"></i>' : ""}</div>`;
    const btn = (act, ic, label, extra = "") => `<button class="cp-btn" data-cp="${act}" ${extra}>${SVG(ic, 14)}<span>${label}</span></button>`;
    $("#cpBar").innerHTML = (f.versions.length > 1 ? `<span class="cp-vers">
        <button class="cp-btn icon" data-cp="prev" title="Bản trước" ${vi === 0 ? "disabled" : ""}>${SVG('<path d="M15 6l-6 6 6 6"/>', 14)}</button>
        <span>Bản ${vi + 1}/${f.versions.length}${v.by === "you" ? " · bạn sửa" : ""}</span>
        <button class="cp-btn icon" data-cp="next" title="Bản sau" ${vi === f.versions.length - 1 ? "disabled" : ""}>${SVG(I.chevron, 14)}</button></span>` : "") +
      (cpEditing
        ? btn("save", '<path d="M5 12.5l4.5 4.5L19 7.5"/>', "Lưu bản sửa", 'class="cp-btn primary"') + btn("cancel", I.close, "Huỷ")
        : btn("edit", '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', "Sửa", v.streaming ? "disabled" : "") + btn("copy", I.copy, "Sao chép") +
          btn("download", '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', "Tải") +
          btn("savefs", I.folder, "Lưu vào thư mục", `title="${folder ? `Lưu vào ${esc(folder.name)}` : "Chọn thư mục rồi lưu"}"`) +
          (canPreview ? btn("preview", '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', "Xem trước") : ""));
    const view = $("#cpView");
    if (cpEditing) {
      if (!view.querySelector("textarea")) {
        view.innerHTML = `<textarea class="cp-editarea" spellcheck="false" aria-label="Sửa ${esc(f.name)}"></textarea>`;
        const ta = view.querySelector("textarea");
        ta.value = v.content;
        ta.focus();
      }
    } else {
      const atBottom = view.scrollHeight - view.scrollTop - view.clientHeight < 40;
      const keep = view.scrollTop, MAX = 6000;
      const shown = lines.length > MAX ? lines.slice(0, MAX).join("\n") : v.content;
      view.innerHTML = `<div class="cp-code"><div class="cp-gutter" aria-hidden="true">${Array.from({ length: Math.min(lines.length, MAX) }, (_, i) => i + 1).join("\n")}</div>` +
        `<pre><code class="hljs">${hlCode(shown, f.name)}</code></pre></div>` +
        (lines.length > MAX ? `<div class="cp-more">… còn ${fmt(lines.length - MAX)} dòng, tải file về để xem đủ</div>` : "");
      view.scrollTop = v.streaming && atBottom ? view.scrollHeight : keep; // AI đang viết: cuộn theo dòng mới
    }
    $("#cpStatus").innerHTML = `<span>${esc(t.kind)}</span><span>${fmt(lines.length)} dòng</span><span>${fmtSize(new Blob([v.content]).size)}</span>` +
      (v.streaming ? `<span class="cp-st-live">AI đang viết…</span>` : v.by === "you" ? "<span>Bản bạn sửa</span>" : "<span>UTF-8</span>");
  }

  // Khối code mới trong tin của AI: lệnh terminal giữ nút "Chạy trong terminal", còn lại thành chip mở panel
  function scanMessages() {
    els.messages.querySelectorAll(".msg.bot .content pre").forEach((pre) => {
      if (pre.closest(".tool-card") || pre.dataset.decorated) return;
      const lang = (pre.dataset.lang || "").toLowerCase();
      if (SHELL_LANGS.has(lang)) return decorateCode(pre);
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "code-chip";
      chip._code = { lang, content: (pre.querySelector("code") || pre).textContent };
      pre.replaceWith(chip);
    });
    refreshCode();
  }
  // Quét ngay trong callback của MutationObserver (không hẹn giờ / rAF): cửa sổ thu nhỏ hay ẩn bị Chromium
  // làm chậm hẹn giờ, nếu chờ thì bấm ô file lúc đó sẽ chưa có panel. Chốt `cpScanning` tránh tự gọi lại.
  let cpScanning = false;
  new MutationObserver(() => {
    if (cpScanning) return;
    cpScanning = true;
    try { scanMessages(); } finally { cpScanning = false; }
  }).observe(els.messages, { childList: true, subtree: true });

  // Bấm chip code hoặc ô file trong chat -> mở đúng file / bản đó trong panel (thay cho cửa sổ xem file)
  const openInPanel = (name, ver) => {
    cpSel = name; cpVer = Number.isFinite(ver) ? ver : null; cpEditing = false; cpFollow = false;
    setWs(true); setTab("code"); renderPanel();
  };
  els.messages.addEventListener("click", (e) => {
    const chip = e.target.closest(".code-chip");
    if (chip && chip.dataset.name) return openInPanel(chip.dataset.name, +chip.dataset.ver);
    const tile = e.target.closest(".file-tile");
    if (!tile || e.target.closest(".file-dl") || !tile.dataset.name) return;
    e.stopPropagation(); // không mở cửa sổ xem file của bản web
    openInPanel(tile.dataset.name, +tile.dataset.ver);
  }, true);

  ws.querySelector(".ws-code").addEventListener("click", async (e) => {
    const item = e.target.closest(".cp-file");
    if (item) { cpSel = item.dataset.name; cpVer = null; cpEditing = false; cpFollow = false; return renderPanel(); }
    const b = e.target.closest("[data-cp]");
    if (!b || b.disabled) return;
    const f = cpFile();
    if (!f) return;
    const vi = cpVer == null ? f.versions.length - 1 : Math.min(cpVer, f.versions.length - 1), v = f.versions[vi];
    const act = b.dataset.cp;
    if (act === "prev" || act === "next") { cpVer = Math.max(0, Math.min(f.versions.length - 1, vi + (act === "next" ? 1 : -1))); cpEditing = false; return renderPanel(); }
    if (act === "edit") { cpEditing = true; return renderPanel(); }
    if (act === "cancel") { cpEditing = false; return renderPanel(); }
    if (act === "save") {
      const content = $("#cpView textarea").value, chat = current();
      cpEditing = false;
      if (content === v.content || !chat) return renderPanel();
      chat.fileEdits = chat.fileEdits || {};
      (chat.fileEdits[f.name] = chat.fileEdits[f.name] || []).push({ content, t: Date.now() });
      save();
      cpVer = null;
      showToast(`Đã lưu bản sửa của ${f.name}.`, "success");
      return refreshCode();
    }
    if (act === "copy") {
      try { await navigator.clipboard.writeText(v.content); showToast("Đã sao chép code."); } catch { showToast("Không sao chép được.", "warn"); }
      return;
    }
    if (act === "download") return downloadFile({ name: f.name, content: v.content });
    if (act === "savefs") {
      if (!folder) { await openFolder(); if (!folder) return; }
      try {
        const r = await D.agentWrite(f.name, v.content);
        renderTree();
        showToast(`${r.created ? "Đã tạo" : "Đã ghi đè"} ${f.name} trong thư mục ${folder.name}.`, "success");
      } catch (err) { showToast(cleanErr(err), "warn"); }
      return renderPanel();
    }
    if (act === "preview") {
      const siblings = {};
      cpFiles.forEach((x) => (siblings[x.name] = x.versions[x.versions.length - 1].content));
      siblings[f.name] = v.content;
      openFilePreview({ name: f.name, content: v.content }, siblings);
    }
  });
  ws.querySelector(".ws-code").addEventListener("keydown", (e) => {
    const ta = e.target.closest(".cp-editarea");
    if (!ta) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); ws.querySelector('[data-cp="save"]').click(); }
    else if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); ta.setRangeText("  ", ta.selectionStart, ta.selectionEnd, "end"); }
    else if (e.key === "Escape") { e.preventDefault(); ws.querySelector('[data-cp="cancel"]').click(); }
  });
  renderPanel();

  /* ---------- Xem trước trang HTML AI gửi ----------
     srcdoc thừa hưởng CSP của app (chặn script) nên chuyển sang app://preview có CSP riêng; khung vẫn sandbox. */
  const baseSetFileTab = setFileTab;
  setFileTab = (tab) => {
    baseSetFileTab(tab);
    const fr = $("#fvFrame"), page = fr.getAttribute("srcdoc");
    if (tab !== "preview" || page == null) return;
    fr.removeAttribute("srcdoc");
    D.previewUrl(page).then((url) => { if (fileTab() === "preview") fr.src = url; });
  };

  /* ---------- Ngữ cảnh cho AI: thư mục đang mở + vai trò trong Group AI ---------- */
  let agentPrompt = "";
  const baseBuild = buildSystemPrompt;
  buildSystemPrompt = (...args) => {
    const parts = [baseBuild(...args)];
    parts.push("Bạn đang chạy trong Vico AI bản desktop. Chỉ khi người dùng muốn chạy lệnh trên máy thì mới đặt lệnh PowerShell trong khối ```powershell để người dùng bấm \"Chạy trong terminal\" (người dùng luôn là người quyết định có chạy hay không).");
    if (folder) {
      const list = topEntries.slice(0, 80).map((e) => (e.dir ? e.name + "/" : e.name)).join(", ");
      parts.push(`Người dùng đã mở thư mục "${folder.root}". Các mục ở cấp đầu: ${list || "(trống)"}.`);
    }
    if (agentPrompt) parts.push(agentPrompt);
    return parts.join("\n\n");
  };

  /* ---------- Group AI: nhóm AI tuỳ chỉnh ---------- */
  const COLORS = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316"];
  const PREFIXES = ["@", "!", "/"];
  const ROLE_SUGGEST = ["Trưởng nhóm", "Lập trình", "Thiết kế", "Kiểm thử", "Checker", "Marketing", "Viết nội dung", "Phân tích dữ liệu", "Nghiên cứu"];
  /* Giám sát (Checker / Tester): tự nhắn khi thấy điểm bất thường trong tin của AI khác, không cần được gọi tên; ổn thì im lặng.
     member.watch (true/false) do người dùng chọn; chưa chọn thì tự bật với role kiểu kiểm thử / checker / tester. */
  const WATCH_RE = /kiểm thử|kiem thu|tester|checker|kiểm tra|giám sát|reviewer|\bqa\b/i;
  const isWatcher = (m) => (typeof m.watch === "boolean" ? m.watch : WATCH_RE.test(m.role || ""));
  const SAFETY_TURNS = 150; // chỉ để chặn model lặp vô hạn (tốn credit), không phải giới hạn trao đổi bình thường
  const SILENT_RE = /^\s*[\[(]?\s*(im lặng|im lang|silent|không có gì|ok)\s*[\])]?[.!]?\s*$/i;
  // Mẫu nhóm dựng sẵn (dùng Vico Lite 2.6, đổi model từng AI sau cũng được)
  const TEMPLATES = [
    { id: "dev", name: "Team phát triển", style: "turns", members: [
      { role: "Trưởng nhóm", name: "lead", desc: "Hiểu yêu cầu, chia việc cho các thành viên và tổng kết kết quả cuối cùng cho người dùng." },
      { role: "Thiết kế", name: "design", desc: "Đề xuất bố cục, giao diện và trải nghiệm người dùng." },
      { role: "Lập trình", name: "dev", desc: "Viết code theo thiết kế và sửa lỗi khi thành viên khác báo." },
      { role: "Kiểm thử", name: "qa", watch: true, desc: "Theo dõi tin nhắn của mọi người, chỉ nhắn khi thấy lỗi hoặc điểm bất thường và gọi tên người cần sửa." },
    ] },
    { id: "mkt", name: "Team Marketing", style: "turns", members: [
      { role: "Trưởng nhóm", name: "lead", desc: "Chốt mục tiêu, khách hàng mục tiêu và thông điệp chính, rồi tổng hợp thành kế hoạch cuối." },
      { role: "Nghiên cứu", name: "research", desc: "Phân tích thị trường, đối thủ và insight khách hàng; có số liệu thì nêu nguồn." },
      { role: "Viết nội dung", name: "copy", desc: "Viết tiêu đề, slogan và nội dung quảng cáo theo thông điệp đã chốt." },
      { role: "Quảng cáo", name: "ads", desc: "Đề xuất kênh, ngân sách và chỉ số đo hiệu quả (KPI) cho chiến dịch." },
    ] },
    { id: "content", name: "Team Content", style: "turns", members: [
      { role: "Biên tập", name: "editor", desc: "Lên dàn ý, giữ giọng văn thống nhất và duyệt bản cuối." },
      { role: "Viết bài", name: "writer", desc: "Viết nội dung hoàn chỉnh theo dàn ý của biên tập." },
      { role: "SEO", name: "seo", desc: "Gợi ý từ khoá, tiêu đề, mô tả và cấu trúc giúp bài lên top tìm kiếm." },
      { role: "Mạng xã hội", name: "social", desc: "Chuyển nội dung thành bài đăng ngắn cho Facebook, TikTok, Threads." },
    ] },
    { id: "council", name: "Hội đồng phản biện", style: "meeting", rounds: 2, members: [
      { role: "Chủ toạ", name: "chair", desc: "Điều phối thảo luận, cân nhắc các ý kiến và đưa ra kết luận cuối cùng rõ ràng." },
      { role: "Ủng hộ", name: "pro", desc: "Tìm điểm mạnh, cơ hội và lý do nên làm." },
      { role: "Phản biện", name: "con", desc: "Tìm điểm yếu, rủi ro, lỗ hổng lập luận và lý do không nên làm." },
      { role: "Thực tế", name: "fact", desc: "Kiểm tra số liệu, tính khả thi, chi phí và thời gian thực tế." },
    ] },
  ];
  const STYLES = {
    turns: { name: "Lần lượt", hint: "Mỗi AI trả lời một lượt theo thứ tự; AI gọi tên nhau thì được thêm lượt để sửa lỗi cho nhau." },
    meeting: { name: "Họp bàn", hint: "Các AI thảo luận nhiều vòng, phản biện ý của nhau; cuối cùng AI đầu tiên (hoặc AI bạn gọi) tổng kết." },
  };
  const styleOf = (g) => (g.style === "meeting" ? "meeting" : "turns");
  const roundsOf = (g) => Math.min(3, Math.max(1, g.rounds || 2));
  const isVico = (m) => modelOf(m.model).provider === "vico";
  /** Ước tính credit Vico cho một tin nhắn gửi nhóm (model ngoài dùng API key riêng nên không tính). */
  function groupEstimate(g) {
    const per = creditCost(reasoning, mode), n = g.members.filter(isVico).length;
    if (!n) return { min: 0, max: 0, per, n };
    if (styleOf(g) === "meeting") {
      const turns = n * roundsOf(g) + (g.members[0] && isVico(g.members[0]) ? 1 : 0); // + lượt tổng kết
      return { min: turns * per, max: turns * per, per, n };
    }
    return { min: n * per, max: (n + Math.min(4, n)) * per, per, n }; // tối đa 4 lượt thêm khi AI gọi nhau
  }
  const estimateText = (g) => {
    const e = groupEstimate(g);
    if (!e.n) return "Không trừ credit Vico: model dùng API key của bạn hoặc chạy ngay trên máy.";
    return `${e.n} AI Vico Lite 2.6 trong nhóm dùng credit của bạn; model dùng API key riêng hoặc chạy trên máy thì miễn phí.`;
  };
  const EFFORT_ORDER = ["none", "minimal", "low", "medium", "high", "xhigh", "max"];
  const LEVEL_EFFORT = { low: "low", medium: "medium", high: "high", max: "xhigh", ultrathink: "max" };
  const NAME_RE = /^[\p{L}\p{N}_-]{1,24}$/u;
  const modelOf = (id) => VICO_MODELS.find((m) => m.id === id) || VICO_MODELS[0];
  const handleOf = (m) => m.prefix + m.name;
  const initial = (s) => esc((String(s || "?").replace(/^[@!/]/, "")[0] || "?").toUpperCase());
  const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20);
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const cleanErr = (err) => String((err && err.message) || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

  let groups = [];
  const loadGroups = () => (groups = loadKey(uk("vico_groups"), []));
  const saveGroups = () => { saveKey(uk("vico_groups"), groups); renderGroupNav(); };
  loadGroups();
  let activeGroup = null;     // nhóm đang dùng trong chat
  let keyStatus = {};
  const refreshKeys = async () => (keyStatus = await D.keyStatus());
  refreshKeys();

  // Mức suy luận đang chọn -> effort của model ngoài (hạ xuống mức cao nhất model hỗ trợ)
  function effortFor(model) {
    if (!model.efforts) return undefined;
    const want = LEVEL_EFFORT[reasoning] || "medium";
    if (model.efforts.includes(want)) return want;
    const wi = EFFORT_ORDER.indexOf(want);
    return model.efforts.filter((e) => EFFORT_ORDER.indexOf(e) <= wi).pop() || model.efforts[0];
  }
  const avatars = (members) => `<span class="gs-avs">${members.slice(0, 6).map((m) => `<i style="--c:${m.color}">${initial(m.name)}</i>`).join("")}</span>`;

  /* Khung thiết lập nhóm: danh sách nhóm -> sửa nhóm -> chọn model -> thiết lập AI */
  const gs = document.createElement("div");
  gs.className = "modal gs-modal";
  gs.id = "gsModal";
  gs.hidden = true;
  gs.innerHTML = `<div class="modal-card gs-card" role="dialog" aria-modal="true" aria-labelledby="gsTitle">
      <header class="gs-head">
        <button class="ws-icon" id="gsBack" title="Quay lại" hidden>${SVG('<path d="M15 6l-6 6 6 6"/>', 18)}</button>
        <h3 id="gsTitle">Group AI</h3>
        <button class="ws-icon" id="gsClose" title="Đóng">${SVG(I.close, 18)}</button>
      </header>
      <div class="gs-body" id="gsBody"></div>
      <footer class="gs-foot" id="gsFoot"></footer>
    </div>`;
  document.body.appendChild(gs);

  let view = "list", draft = null, memberIdx = null, mDraft = null, keyFormFor = null, pendingModel = null, pickerQuery = "";
  const newDraft = () => ({ id: null, name: "", members: [], style: "turns", rounds: 2 });
  function openGs(v) {
    closePops();
    v = v || (groups.length ? "list" : "edit");
    if (v === "edit" && !draft) draft = newDraft();
    gs.hidden = false;
    go(v);
  }
  const closeGs = () => { gs.hidden = true; draft = mDraft = null; memberIdx = null; keyFormFor = pendingModel = null; };
  gs.addEventListener("mousedown", (e) => { if (e.target === gs) closeGs(); });
  $("#gsClose").onclick = closeGs;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !gs.hidden) closeGs(); });
  $("#gsBack").onclick = () => {
    if (view === "member") {
      if (memberIdx !== null) { mDraft = null; memberIdx = null; return go("edit"); }
      return go("picker");
    }
    if (view === "picker") {
      if (memberIdx !== null && mDraft) return go("member");
      mDraft = null;
      return go("edit");
    }
    if (view === "edit") { draft = null; return go("list"); }
  };
  function go(v) {
    view = v;
    $("#gsBack").hidden = v === "list" || (v === "edit" && !groups.length);
    const body = $("#gsBody");
    body.onclick = null;
    ({ list: viewList, edit: viewEdit, picker: viewPicker, member: viewMember })[v]();
    body.scrollTop = 0;
    body.classList.remove("gs-anim"); void body.offsetWidth; body.classList.add("gs-anim");
  }

  function viewList() {
    $("#gsTitle").textContent = "Group AI";
    $("#gsBody").innerHTML = `<p class="gs-intro">Tổng hợp nhiều AI vào 1 group chat, khi bạn giao việc cho 1 AI thì các AI khác cũng làm theo, mỗi AI đóng vai 1 chức vụ giống như team của bạn và có thể tự chat với nhau để sửa lỗi của nhau.</p>
      <div class="gs-groups">${groups.map((g, i) => `
        <div class="gs-group" data-i="${i}">
          ${avatars(g.members)}
          <div class="gs-gtext"><b>${esc(g.name)}</b><small>${g.members.length} AI · ${STYLES[styleOf(g)].name}${styleOf(g) === "meeting" ? ` ${roundsOf(g)} vòng` : ""} · ${esc(g.members.map(handleOf).join(", "))}</small></div>
          <button class="ws-chip" data-act="start">Bắt đầu</button>
          <button class="ws-icon" data-act="edit" title="Sửa nhóm">${SVG('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', 15)}</button>
        </div>`).join("")}</div>`;
    $("#gsFoot").innerHTML = `<span></span><button class="btn-primary with-ico" id="gsNew">${SVG('<path d="M12 5v14M5 12h14"/>', 16)}Tạo nhóm mới</button>`;
    $("#gsNew").onclick = () => { draft = newDraft(); go("edit"); };
    $("#gsBody").onclick = (e) => {
      const row = e.target.closest(".gs-group");
      if (!row) return;
      const g = groups[+row.dataset.i];
      if (e.target.closest('[data-act="edit"]')) { draft = clone(g); go("edit"); }
      else { closeGs(); setGroup(g); }
    };
  }

  function viewEdit() {
    $("#gsTitle").textContent = draft.id ? "Sửa nhóm" : "Tạo nhóm mới";
    const ms = draft.members;
    $("#gsBody").innerHTML = `
      <label class="gs-field"><span>Tên nhóm</span><input id="gsName" maxlength="40" placeholder="Ví dụ: Team Marketing" value="${esc(draft.name)}" /></label>
      <div class="gs-sec"><b>Thành viên AI</b><small>${ms.length} AI</small></div>
      <div class="gs-members">${ms.map((m, i) => {
        const md = modelOf(m.model);
        return `<button class="gs-member" data-i="${i}">
          <i class="gs-av" style="--c:${m.color}">${initial(m.name)}</i>
          <span class="gs-mtext"><b>${esc(handleOf(m))} <em>${esc(m.role)}</em></b><small>${esc(md.name)}${m.desc ? " · " + esc(m.desc) : ""}</small></span>
          ${SVG(I.chevron, 14)}
        </button>`;
      }).join("")}</div>
      <button class="gs-add" id="gsAdd">${SVG('<path d="M12 5v14M5 12h14"/>', 18)}Thêm AI vào nhóm</button>
      ${ms.length ? "" : `<div class="gs-sec"><b>Hoặc dùng nhanh một mẫu</b><small>Vico Lite 2.6, sửa lại được</small></div>
      <div class="gs-tpls">${TEMPLATES.map((t) => `<button class="gs-tpl" data-tpl="${t.id}">
          ${avatars(t.members.map((m, i) => ({ name: m.name, color: COLORS[i % COLORS.length] })))}
          <b>${esc(t.name)}</b><small>${esc(t.members.map((m) => m.role).join(" · "))}</small>
          <em>${STYLES[t.style].name}${t.style === "meeting" ? ` · ${t.rounds} vòng` : ""}</em></button>`).join("")}</div>`}
      <div class="gs-field"><span>Cách làm việc</span>
        <div class="gs-seg wide" role="radiogroup" aria-label="Cách làm việc">${Object.entries(STYLES).map(([id, s]) =>
          `<button class="${styleOf(draft) === id ? "on" : ""}" data-style="${id}" role="radio" aria-checked="${styleOf(draft) === id}">${s.name}</button>`).join("")}</div>
        <small class="gs-hint">${STYLES[styleOf(draft)].hint}</small>
      </div>
      ${styleOf(draft) === "meeting" ? `<div class="gs-field"><span>Số vòng thảo luận</span>
        <div class="gs-seg" role="radiogroup" aria-label="Số vòng">${[1, 2, 3].map((n) =>
          `<button class="${roundsOf(draft) === n ? "on" : ""}" data-rounds="${n}" role="radio" aria-checked="${roundsOf(draft) === n}">${n}</button>`).join("")}</div></div>` : ""}
      ${ms.length ? `<p class="gs-cost">${SVG('<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2-1.1 1.8-2.5 2-2.5.8-2.5 2 1.1 2 2.5 2 2.5-.8 2.5-2"/>', 14)}${estimateText(draft)}</p>` : ""}
      <p class="gs-err" id="gsErr"></p>`;
    $("#gsName").oninput = (e) => (draft.name = e.target.value);
    $("#gsAdd").onclick = () => { memberIdx = null; mDraft = null; go("picker"); };
    $("#gsBody").onclick = (e) => {
      const tp = e.target.closest("[data-tpl]"), st = e.target.closest("[data-style]"), rd = e.target.closest("[data-rounds]");
      if (tp) {
        const t = TEMPLATES.find((x) => x.id === tp.dataset.tpl);
        draft.members = t.members.map((m, i) => ({ id: uid(), model: "vico-lite-2.6", role: m.role, prefix: "@", name: m.name, desc: m.desc, ...(m.watch ? { watch: true } : {}), color: COLORS[i % COLORS.length] }));
        draft.style = t.style;
        draft.rounds = t.rounds || 2;
        if (!draft.name.trim()) draft.name = t.name;
        return viewEdit();
      }
      if (st) { draft.style = st.dataset.style; return viewEdit(); }
      if (rd) { draft.rounds = +rd.dataset.rounds; return viewEdit(); }
      const b = e.target.closest(".gs-member");
      if (!b) return;
      memberIdx = +b.dataset.i;
      mDraft = clone(draft.members[memberIdx]);
      go("member");
    };
    $("#gsFoot").innerHTML = `${draft.id ? `<button class="btn-ghost danger-text" id="gsDel">Xoá nhóm</button>` : "<span></span>"}
      <span class="gs-foot-r"><button class="btn-ghost" id="gsSave">Lưu</button><button class="btn-primary" id="gsSaveStart">Lưu &amp; bắt đầu</button></span>`;
    $("#gsSave").onclick = () => saveDraft(false);
    $("#gsSaveStart").onclick = () => saveDraft(true);
    const del = $("#gsDel");
    if (del) del.onclick = () => {
      if (!confirm(`Xoá nhóm "${draft.name}"?`)) return;
      groups = groups.filter((g) => g.id !== draft.id);
      saveGroups();
      if (activeGroup && activeGroup.id === draft.id) setGroup(null);
      draft = null;
      if (groups.length) go("list"); else closeGs();
    };
    if (!draft.name) setTimeout(() => $("#gsName") && $("#gsName").focus(), 40);
  }
  function saveDraft(start) {
    const err = (t) => ($("#gsErr").textContent = t);
    draft.name = draft.name.trim();
    if (!draft.name) { err("Hãy đặt tên cho nhóm."); return $("#gsName").focus(); }
    if (!draft.members.length) return err("Nhóm cần ít nhất 1 AI. Bấm “Thêm AI vào nhóm”.");
    if (!draft.id) { draft.id = "g" + Date.now().toString(36); groups.unshift(draft); }
    else groups = groups.map((g) => (g.id === draft.id ? draft : g));
    saveGroups();
    const saved = groups.find((g) => g.id === draft.id);
    if (activeGroup && activeGroup.id === saved.id) { activeGroup = saved; renderGroupChip(); updatePlaceholder(); updateSend(); }
    showToast(`Đã lưu nhóm "${saved.name}".`);
    if (start) { closeGs(); setGroup(saved); }
    else { draft = null; go("list"); }
  }

  function viewPicker() {
    $("#gsTitle").textContent = "Chọn model";
    const q = pickerQuery.toLowerCase();
    const sections = Object.entries(VICO_PROVIDERS).map(([pid, p]) => {
      const models = VICO_MODELS.filter((m) => m.provider === pid && (!q || `${m.name} ${m.id} ${m.desc}`.toLowerCase().includes(q)));
      if (!models.length) return "";
      const has = !p.needsKey || keyStatus[pid];
      const head = `<div class="gs-prov"><b>${p.name}</b>${p.needsKey
        ? `<span class="gs-pill ${has ? "ok" : ""}">${has ? "Đã có API key" : "Cần API key"}</span>
           <button class="gs-link" data-key="${pid}">${has ? "Đổi key" : "Nhập key"}</button>
           ${has ? `<button class="gs-link danger-text" data-unkey="${pid}">Xoá key</button>` : ""}`
        : `<span class="gs-pill ok">${p.local ? "Chạy trên máy · miễn phí" : "Không cần API key"}</span>`}</div>`;
      const form = keyFormFor === pid ? `<form class="gs-keyform" data-prov="${pid}">
          <p>${pendingModel ? `Nhập API key ${p.name} để dùng <b>${esc(modelOf(pendingModel).name)}</b>.` : `API key ${p.name}.`} Key được mã hoá và chỉ lưu trên máy này.</p>
          <div class="gs-keyrow"><input type="password" name="key" placeholder="${p.keyHint}" autocomplete="off" spellcheck="false" />
          <button class="btn-primary sm" type="submit">Kiểm tra &amp; lưu</button></div>
          <a href="${p.keyUrl}" target="_blank" rel="noopener">Lấy API key ${p.name} ↗</a>
          <small class="gs-err"></small></form>` : "";
      const rows = models.map((m) => `<button class="gs-model" data-model="${m.id}">
          <span class="gs-mtext"><b>${esc(m.name)}</b><small>${esc(m.desc)}</small></span>
          <span class="gs-tag ${p.needsKey ? "" : "free"}">${p.needsKey ? "Cần API key" : p.local ? "Trên máy" : "Miễn phí"}</span></button>`).join("");
      return `<section class="gs-provsec">${head}${form}${rows}</section>`;
    }).join("");
    $("#gsBody").innerHTML = `<input class="gs-search" id="gsSearch" placeholder="Tìm model…" value="${esc(pickerQuery)}" />` +
      (sections || `<p class="gs-empty">Không tìm thấy model.</p>`) +
      (window.VicoLocal && !VICO_MODELS.some((m) => m.provider === "local")
        ? `<p class="gs-hint">Muốn thêm AI chạy ngay trên máy (miễn phí)? Tải model trong mục <b>Finetune</b> ở thanh bên.</p>` : "");
    $("#gsFoot").innerHTML = "";
    const s = $("#gsSearch");
    s.oninput = () => {
      pickerQuery = s.value;
      viewPicker();
      const n = $("#gsSearch");
      n.focus();
      n.setSelectionRange(n.value.length, n.value.length);
    };
    $("#gsBody").onclick = async (e) => {
      const k = e.target.closest("[data-key]"), un = e.target.closest("[data-unkey]"), mb = e.target.closest(".gs-model");
      if (k) { keyFormFor = keyFormFor === k.dataset.key ? null : k.dataset.key; pendingModel = null; viewPicker(); focusKey(); }
      else if (un) {
        if (!confirm(`Xoá API key ${VICO_PROVIDERS[un.dataset.unkey].name} đã lưu trên máy này?`)) return;
        await D.removeKey(un.dataset.unkey);
        await refreshKeys();
        viewPicker();
      } else if (mb) chooseModel(mb.dataset.model);
    };
    $("#gsBody").querySelectorAll(".gs-keyform").forEach((f) => (f.onsubmit = async (e) => {
      e.preventDefault();
      const btn = f.querySelector("button"), errEl = f.querySelector(".gs-err");
      btn.disabled = true; btn.textContent = "Đang kiểm tra…"; errEl.textContent = "";
      try {
        await D.saveKey(f.dataset.prov, f.elements.key.value);
        await refreshKeys();
        showToast(`Đã lưu API key ${VICO_PROVIDERS[f.dataset.prov].name}.`, "success");
        keyFormFor = null;
        if (pendingModel) { const m = pendingModel; pendingModel = null; return chooseModel(m); }
        viewPicker();
      } catch (err) {
        errEl.textContent = cleanErr(err);
        btn.disabled = false; btn.textContent = "Kiểm tra & lưu";
      }
    }));
  }
  const focusKey = () => setTimeout(() => {
    const i = $("#gsBody .gs-keyform input");
    if (i) { i.focus(); i.scrollIntoView({ block: "center" }); }
  }, 30);
  function chooseModel(id) {
    const m = modelOf(id), p = VICO_PROVIDERS[m.provider];
    if (p.needsKey && !keyStatus[m.provider]) { keyFormFor = m.provider; pendingModel = id; viewPicker(); return focusKey(); }
    if (mDraft) mDraft.model = id; // đổi model cho AI đang thiết lập
    else mDraft = { id: uid(), model: id, role: "", prefix: "@", name: "", desc: "", color: COLORS[draft.members.length % COLORS.length], autoName: true };
    go("member");
  }

  function viewMember() {
    const m = mDraft, md = modelOf(m.model), editing = memberIdx !== null;
    $("#gsTitle").textContent = editing ? "Sửa AI" : "Thiết lập AI";
    $("#gsBody").innerHTML = `
      <div class="gs-chosen">
        <i class="gs-av" style="--c:${m.color}">${initial(m.name || m.role || md.name)}</i>
        <span class="gs-mtext"><b>${esc(md.name)}</b><small>${esc(VICO_PROVIDERS[md.provider].name)} · ${esc(md.desc)}</small></span>
        <button class="gs-link" id="gsChange">Đổi model</button>
      </div>
      <label class="gs-field"><span>Role</span><input id="gsRole" maxlength="40" placeholder="Ví dụ: Marketing" value="${esc(m.role)}" /></label>
      <div class="gs-chips">${ROLE_SUGGEST.map((r) => `<button class="gs-chip" data-role="${esc(r)}">${esc(r)}</button>`).join("")}</div>
      <div class="gs-field"><span>Cách gọi</span>
        <div class="gs-handle">
          <div class="gs-seg" role="radiogroup" aria-label="Ký hiệu gọi">${PREFIXES.map((p) => `<button class="${m.prefix === p ? "on" : ""}" data-prefix="${p}" role="radio" aria-checked="${m.prefix === p}">${p}</button>`).join("")}</div>
          <input id="gsHandle" maxlength="24" placeholder="tên gọi" value="${esc(m.name)}" spellcheck="false" />
        </div>
        <small class="gs-hint" id="gsPreview"></small>
      </div>
      <label class="gs-field"><span>Mô tả</span><textarea id="gsDesc" rows="4" maxlength="600" placeholder="AI này cần làm gì, theo phong cách nào…">${esc(m.desc)}</textarea></label>
      <label class="gs-watch"><input type="checkbox" id="gsWatch" ${isWatcher(m) ? "checked" : ""} />
        <span><b>Giám sát (Checker / Tester)</b><small>Tự nhắn bất cứ lúc nào khi thấy điểm bất thường trong tin của AI khác, không cần được gọi tên; mọi thứ ổn thì im lặng.</small></span></label>
      <p class="gs-err" id="gsErr"></p>`;
    const preview = () => {
      $("#gsPreview").innerHTML = m.name ? `Trong group chat, gọi AI này bằng <b>${esc(handleOf(m))}</b>` : "Đặt tên để gọi AI này trong group chat";
    };
    preview();
    const setName = (v) => { m.name = v; $("#gsHandle").value = v; preview(); };
    $("#gsRole").oninput = (e) => { m.role = e.target.value; if (m.autoName) setName(slug(m.role)); };
    $("#gsHandle").oninput = (e) => { m.autoName = false; setName(e.target.value.replace(/\s+/g, "")); };
    $("#gsDesc").oninput = (e) => (m.desc = e.target.value);
    $("#gsWatch").onchange = (e) => (m.watch = e.target.checked);
    $("#gsBody").onclick = (e) => {
      const r = e.target.closest("[data-role]"), p = e.target.closest("[data-prefix]");
      if (r) {
        m.role = r.dataset.role;
        $("#gsRole").value = m.role;
        if (typeof m.watch !== "boolean") $("#gsWatch").checked = isWatcher(m);
        if (m.autoName || !m.name) setName(slug(m.role));
        if (!m.desc) { m.desc = m.role; $("#gsDesc").value = m.desc; }
      }
      if (p) {
        m.prefix = p.dataset.prefix;
        $("#gsBody").querySelectorAll("[data-prefix]").forEach((b) => { b.classList.toggle("on", b === p); b.setAttribute("aria-checked", b === p); });
        preview();
      }
      if (e.target.closest("#gsChange")) go("picker");
    };
    $("#gsFoot").innerHTML = `${editing ? `<button class="btn-ghost danger-text" id="gsRemove">Xoá khỏi nhóm</button>` : "<span></span>"}
      <button class="btn-primary" id="gsOk">${editing ? "Lưu thay đổi" : "Thêm vào nhóm"}</button>`;
    $("#gsOk").onclick = () => {
      const err = (t) => ($("#gsErr").textContent = t);
      m.role = m.role.trim();
      m.desc = m.desc.trim();
      if (!m.role) return err("Hãy nhập role cho AI.");
      if (!NAME_RE.test(m.name)) return err("Tên gọi 1–24 ký tự, gồm chữ, số, dấu _ hoặc -, không có khoảng trắng.");
      const h = handleOf(m).toLowerCase();
      if (draft.members.some((x, i) => i !== memberIdx && handleOf(x).toLowerCase() === h)) return err(`Cách gọi ${handleOf(m)} đã có AI khác trong nhóm dùng.`);
      delete m.autoName;
      if (editing) draft.members[memberIdx] = m; else draft.members.push(m);
      mDraft = null; memberIdx = null;
      go("edit");
    };
    const rm = $("#gsRemove");
    if (rm) rm.onclick = () => { draft.members.splice(memberIdx, 1); mDraft = null; memberIdx = null; go("edit"); };
    if (!editing && !m.role) setTimeout(() => $("#gsRole") && $("#gsRole").focus(), 40);
  }

  /* Nhóm đang dùng: chip trên thanh trên cùng */
  const chip = document.createElement("span");
  chip.className = "group-chip";
  chip.id = "groupChip";
  chip.hidden = true;
  $(".model-name").appendChild(chip);
  function renderGroupChip() {
    if (!activeGroup) return;
    const g = activeGroup;
    chip.innerHTML = `${avatars(g.members)}<button class="gc-name" title="Sửa nhóm · ${esc(estimateText(g))}">${esc(g.name)}</button>
      <span class="gc-style">${STYLES[styleOf(g)].name}${styleOf(g) === "meeting" ? ` · ${roundsOf(g)} vòng` : ""}</span>
      <button class="gc-x gc-export" title="Xuất biên bản (Markdown)">${SVG('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', 13)}</button>
      <button class="gc-x" data-exit title="Thoát Group AI">${SVG(I.close, 13)}</button>`;
    chip.querySelector(".gc-name").onclick = () => { draft = clone(g); openGs("edit"); };
    chip.querySelector(".gc-name").onmouseenter = (e) => (e.currentTarget.title = "Sửa nhóm · " + estimateText(g)); // mức suy luận có thể đã đổi
    chip.querySelector(".gc-export").onclick = () => exportMinutes(current());
    chip.querySelector("[data-exit]").onclick = () => setGroup(null);
  }
  function updatePlaceholder() {
    if (activeGroup) els.input.placeholder = `Giao việc cho ${activeGroup.name}… (gọi riêng: ${handleOf(activeGroup.members[0])})`;
    else if (agentOn) els.input.placeholder = "Giao việc cho Agent… (AI xin phép trước khi ghi file hoặc chạy lệnh)";
  }
  // Nút gửi: hiện ước tính credit cho cả nhóm
  const baseUpdateSend = updateSend;
  updateSend = () => {
    baseUpdateSend();
    if (activeGroup && !(busy && activeAbort)) {
      const e = groupEstimate(activeGroup);
      els.send.title = "Gửi cho nhóm";
    }
  };
  /** Biên bản: thông tin nhóm + toàn bộ trao đổi, tải về dạng Markdown. */
  function exportMinutes(c) {
    if (!c || !c.messages.length) return showToast("Chưa có trao đổi nào để xuất biên bản.");
    const g = groups.find((x) => x.id === c.groupId) || activeGroup;
    const first = c.messages.find((m) => m.ts), when = first ? new Date(first.ts).toLocaleString("vi-VN") : new Date().toLocaleString("vi-VN");
    const head = `# Biên bản Group AI${g ? `: ${g.name}` : ""}\n\n- Thời gian: ${when}\n` +
      (g ? `- Cách làm việc: ${STYLES[styleOf(g)].name}${styleOf(g) === "meeting" ? ` (${roundsOf(g)} vòng)` : ""}\n` +
        `- Thành viên:\n${g.members.map((m) => `  - ${handleOf(m)}: ${m.role} (${modelOf(m.model).name})${m.desc ? ` - ${m.desc}` : ""}`).join("\n")}\n` : "") +
      `- Số tin nhắn: ${c.messages.length}\n\n---\n\n`;
    const body = chatToMarkdown(c).replace(/^# .*\n\n/, "");
    const base = fold(`bien-ban-${g ? g.name : c.title}`).replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
    downloadFile({ name: base + ".md", content: head + body });
    showToast("Đã xuất biên bản Group AI.");
  }
  function setGroup(g, fresh = true) {
    activeGroup = g;
    root.classList.toggle("group-on", !!g);
    chip.hidden = !g;
    $("#groupBtn").classList.toggle("active", !!g);
    if (g) renderGroupChip();
    if (fresh) newChat();
    if (!g) els.input.placeholder = (VICO_TOPICS.find((t) => t.id === topic) || VICO_TOPICS[0]).placeholder;
    updatePlaceholder();
    updateSend();
    renderGroupNav();
  }
  $("#groupBtn").title = "Group AI";
  $("#groupBtn").onclick = () => openGs();

  /* Các nhóm đã tạo hiện ngay dưới mục Group AI ở thanh bên; bấm vào là vào group chat của nhóm đó */
  const groupNav = document.createElement("div");
  groupNav.className = "group-nav";
  groupNav.id = "groupNav";
  $("#groupBtn").after(groupNav);
  function renderGroupNav() {
    groupNav.hidden = !groups.length;
    groupNav.innerHTML = groups.map((g) => {
      const on = activeGroup && activeGroup.id === g.id;
      return `<button class="gn-item${on ? " on" : ""}" data-gid="${g.id}" title="${esc(g.name)} · ${g.members.length} AI">
        <i class="gn-av" style="--c:${(g.members[0] && g.members[0].color) || "#8b5cf6"}">${initial(g.name)}</i>
        <span class="lbl gn-name">${esc(g.name)}</span><small class="lbl gn-count">${g.members.length} AI</small>
        <i class="lbl gn-edit" title="Sửa nhóm">${SVG('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', 13)}</i></button>`;
    }).join("");
  }
  groupNav.onclick = (e) => {
    const b = e.target.closest("[data-gid]");
    const g = b && groups.find((x) => x.id === b.dataset.gid);
    if (!g) return;
    if (e.target.closest(".gn-edit")) { draft = clone(g); return openGs("edit"); }
    setGroup(g); // vào giao diện chat của nhóm (phiên mới)
  };
  renderGroupNav();
  const baseRenderTopics = renderTopics;
  renderTopics = () => { baseRenderTopics(); updatePlaceholder(); };

  // Hiện cách gọi, role và model trên các tin nhắn của AI trong nhóm
  function decorateAgent(el, info) {
    if (!el || !info || el.querySelector(".agent-head")) return;
    el.classList.add("agent");
    el.insertAdjacentHTML("afterbegin", `<span class="agent-av" style="--c:${info.color}">${initial(info.handle)}</span>`);
    const content = el.querySelector(".content");
    const wrap = document.createElement("div");
    wrap.className = "agent-col";
    wrap.innerHTML = `<span class="agent-meta"><b class="agent-head" style="color:${info.color}">${esc(info.handle)}</b>` +
      `<span class="agent-role">${esc(info.role)}</span><span class="agent-model">${esc(info.model)}</span></span>`;
    content.replaceWith(wrap);
    wrap.appendChild(content);
  }
  const legacyInfo = (agent) => {
    const r = GROUP_ROLES[agent];
    return r && { handle: r.name, role: r.name, color: r.color, model: "Vico Lite 2.6" };
  };
  // Họp bàn: vạch chia "Vòng 2", "Tổng kết" giữa các lượt
  const roundLabel = (m) => (m.summary ? "Tổng kết" : m.round > 1 ? `Vòng ${m.round}` : "");
  function roundDivider(label) {
    const d = document.createElement("div");
    d.className = "round-div";
    d.innerHTML = `<span>${esc(label)}</span>`;
    return d;
  }
  const baseRenderChat = renderChat;
  renderChat = () => {
    baseRenderChat();
    const chat = current();
    if (!chat) return;
    const nodes = [...els.messages.querySelectorAll(":scope > .msg")];
    chat.messages.forEach((m, i) => {
      if (!nodes[i]) return;
      if (m.agentInfo || m.agent) decorateAgent(nodes[i], m.agentInfo || legacyInfo(m.agent));
      if (m.error) nodes[i].querySelector(".content").classList.add("error");
      const label = roundLabel(m), prev = chat.messages[i - 1];
      if (label && (!prev || roundLabel(prev) !== label)) nodes[i].before(roundDivider(label));
    });
  };
  const baseOpenChat = openChat;
  openChat = (id) => {
    baseOpenChat(id);
    const c = current();
    const g = c && c.groupId ? groups.find((x) => x.id === c.groupId) || null : null;
    if ((g && g.id) !== (activeGroup && activeGroup.id)) setGroup(g, false);
    if (c && c.groupId && !g) showToast("Nhóm của đoạn chat này đã bị xoá, tin mới sẽ gửi như chat thường.");
  };
  // Đổi tài khoản: nạp nhóm của tài khoản mới
  const baseAuthChanged = onAuthChanged;
  onAuthChanged = () => {
    activeGroup = null;
    root.classList.remove("group-on");
    chip.hidden = true;
    $("#groupBtn").classList.remove("active");
    loadGroups();
    renderGroupNav();
    baseAuthChanged();
  };

  /* Gọi tên trong chat: @tên, !tên hoặc /tên */
  function mentionsIn(text, members, exceptId) {
    const hits = [];
    for (const m of members) {
      if (m.id === exceptId) continue;
      const re = new RegExp(`(^|[\\s(\\[{,.;:"'“])${escRe(handleOf(m))}(?=$|[\\s.,!?:;)\\]}"'”])`, "iu");
      const mt = re.exec(text);
      if (mt) hits.push({ m, at: mt.index });
    }
    return hits.sort((a, b) => a.at - b.at).map((h) => h.m);
  }
  const filesNote = (x) => (x.attachments && x.attachments.length ? ` (đính kèm: ${x.attachments.map((a) => a.name).join(", ")})` : "");
  const lineOf = (x) => (x.role === "user"
    ? `[Người dùng]: ${x.content}${filesNote(x)}`
    : `[${x.agentInfo ? `${x.agentInfo.handle} - ${x.agentInfo.role}` : "AI"}${x.round > 1 ? ` · vòng ${x.round}` : ""}${x.summary ? " · tổng kết" : ""}]: ${x.content}`);
  /** Tách đoạn chat: yêu cầu mới nhất của người dùng, các câu AI đã trả lời yêu cầu đó, và phần trao đổi trước. */
  function splitChat(chat) {
    const msgs = chat.messages.filter((x) => !x.error);
    let u = msgs.length - 1;
    while (u >= 0 && msgs[u].role !== "user") u--;
    return { req: u >= 0 ? msgs[u] : null, before: msgs.slice(Math.max(0, u - 20), Math.max(0, u)), after: u >= 0 ? msgs.slice(u + 1) : msgs };
  }
  function transcriptFor(chat, member) {
    const { req, before, after } = splitChat(chat);
    return `YÊU CẦU CỦA NGƯỜI DÙNG (ưu tiên hàng đầu): ${req ? req.content + filesNote(req) : "(không có)"}` +
      (after.length ? `\n\nCác thành viên khác đã trả lời yêu cầu này:\n\n${after.map(lineOf).join("\n\n")}` : "") +
      (before.length ? `\n\nTrao đổi trước đó (chỉ để tham khảo):\n\n${before.map(lineOf).join("\n\n")}` : "") +
      `\n\nBạn là ${handleOf(member)}. Hãy trả lời đúng yêu cầu của người dùng ở trên.`;
  }
  /** Model nhỏ chạy trên máy: gửi thẳng nội dung cần trả lời, không kèm khung group chat. */
  function directFor(chat, ctx) {
    const { req, after } = splitChat(chat);
    if (ctx.kind === "watch" && after.length) return `Kiểm tra đoạn sau. Có lỗi thì chỉ ra ngắn gọn, nếu ổn chỉ trả lời [IM LẶNG]:\n\n${after[after.length - 1].content}`;
    if (ctx.kind === "followup" && after.length) return after[after.length - 1].content;
    if (ctx.kind === "summary") return `Tóm tắt ngắn gọn thành kết luận cho câu hỏi: ${req ? req.content : ""}\n\n${after.map((x) => x.content).join("\n\n")}`;
    return req ? req.content + filesNote(req) : "";
  }
  function memberPrompt(member, group, ctx) {
    const others = group.members.filter((x) => x.id !== member.id);
    const why = ctx.kind === "followup" ? `${ctx.by} vừa gọi tên bạn. Đọc kỹ tin nhắn của ${ctx.by} và của các thành viên khác ở trên, rồi làm đúng phần việc được giao cho bạn, dùng thông tin và kết quả họ đã đưa ra (không hỏi lại điều đã có). ` +
        "Nếu bạn không còn gì cần làm hay bổ sung (VD chỉ để cảm ơn, xác nhận), chỉ trả lời đúng: [IM LẶNG]"
      : ctx.kind === "watch" ? `Bạn là thành viên giám sát. ${ctx.target} vừa gửi tin nhắn mới nhất ở trên. Kiểm tra tin đó: có lỗi, làm sai yêu cầu của người dùng, thiếu sót quan trọng, hoặc mâu thuẫn với kế hoạch / thông tin của thành viên khác không? ` +
        "Nếu có, nhắn ngắn gọn chỉ ra đúng điểm bất thường và gọi tên người cần sửa. Nếu mọi thứ ổn, chỉ trả lời đúng: [IM LẶNG]"
      : ctx.kind === "support" ? (ctx.called ? `Người dùng giao việc cho ${handleOf(ctx.lead)}. ` : "") +
        "Hãy hỗ trợ đúng yêu cầu của người dùng (dùng chuyên môn của bạn nếu hữu ích). Nếu không có gì cần bổ sung, chỉ trả lời: OK"
      : ctx.kind === "discuss" ? `Đây là vòng thảo luận ${ctx.round}/${ctx.rounds}. Đọc ý kiến của các thành viên ở vòng trước, ` +
        "phản biện điểm chưa đúng, bổ sung điểm còn thiếu và cập nhật quan điểm của bạn. Không nhắc lại ý cũ. Nếu đã đồng ý hết, chỉ trả lời: Đồng ý"
      : ctx.kind === "summary" ? "Cuộc họp đã xong các vòng thảo luận. Hãy tổng kết cho người dùng: kết luận chính, các điểm còn tranh luận (nếu có) " +
        "và các bước nên làm tiếp. Viết rõ ràng, có cấu trúc, không gọi tên thành viên khác."
      : ctx.called ? "Người dùng gọi trực tiếp bạn, hãy xử lý yêu cầu." : "Bạn trả lời đầu tiên: nhận việc và điều phối nếu cần.";
    return "Ưu tiên hàng đầu: làm đúng điều người dùng vừa nhắn hoặc yêu cầu. Role và mô tả bên dưới chỉ là gợi ý về chuyên môn, " +
      "KHÔNG bắt buộc làm theo; nếu yêu cầu của người dùng khác với mô tả thì làm theo người dùng. Lời chào hay câu hỏi ngắn thì trả lời ngắn, tự nhiên.\n" +
      `Bạn là thành viên ${handleOf(member)} trong nhóm AI "${group.name}". Role (gợi ý): ${member.role}.` +
      (member.desc ? ` Mô tả (gợi ý, không bắt buộc): ${member.desc}` : "") +
      (others.length ? `\nCác thành viên khác: ${others.map((x) => `${handleOf(x)} (${x.role})`).join(", ")}.` : "") +
      (styleOf(group) === "meeting"
        ? `\nNhóm đang họp bàn ${roundsOf(group)} vòng: mỗi vòng mọi người lần lượt nêu ý kiến và phản biện ý của nhau, cuối cùng có một người tổng kết.`
        : "\nCả nhóm làm việc trong cùng một group chat như một team. Luôn đọc kỹ tin nhắn của các thành viên khác về yêu cầu này và dùng thông tin của họ " +
          "(ví dụ lập trình dùng kết quả của nghiên cứu, mọi người làm đúng kế hoạch của trưởng nhóm), chỉ ra và sửa lỗi của nhau." +
          (others[0] ? ` Khi giao việc hoặc cần ai làm tiếp, gọi đúng cách gọi của họ (ví dụ ${handleOf(others[0])}); chỉ người được gọi mới trả lời, người không được gọi sẽ không trả lời. Chỉ gọi tên khi thật sự cần người đó làm, sửa hoặc kiểm tra điều gì; không gọi tên chỉ để cảm ơn hay xác nhận. Cả nhóm cứ trao đổi đến khi xong việc thì dừng.` : "") +
          (others.some(isWatcher) ? ` ${others.filter(isWatcher).map(handleOf).join(", ")} là giám sát, có thể nhắn bất cứ lúc nào khi thấy điểm bất thường.` : "")) +
      " Trả lời đúng trọng tâm yêu cầu, ngắn gọn, không lặp lại điều người khác đã nói.\n" + why;
  }
  // Trả lời mẫu cho Vico Lite 2.6 khi chưa kết nối mô hình AI
  function demoReply(member, ctx) {
    // Bỏ các cách gọi khỏi phần trích yêu cầu để câu trả lời mẫu không vô tình gọi tên AI khác
    const task = ctx.task.replace(/(^|\s)[@!/][\p{L}\p{N}_-]+/gu, "$1").trim() || ctx.task || "file đính kèm";
    const t = `"${task.length > 70 ? task.slice(0, 70) + "…" : task}"`;
    const files = ctx.files && ctx.files.length ? ` Mình đã xem file ${ctx.files.map((f) => `**${f}**`).join(", ")}.` : "";
    if (ctx.kind === "watch") return "[IM LẶNG]";
    if (ctx.kind === "followup") return "Đã nhận, mình xem lại và xử lý ngay phần đó.";
    if (ctx.kind === "discuss") {
      return `Vòng ${ctx.round}: mình đã đọc ý kiến của mọi người về ${t} và bổ sung thêm góc nhìn ${member.role.toLowerCase()} cho yêu cầu này.`;
    }
    if (ctx.kind === "summary") {
      return `**Tổng kết cuộc họp về ${t}**\n\n` +
        summaryLines(ctx) +
        "\n\n**Bước tiếp theo:** chốt phương án, giao việc cho từng người và hẹn thời gian kiểm tra lại." +
        "\n\n*(Vico Lite 2.6 đang chạy chế độ demo, chưa kết nối mô hình AI.)*";
    }
    if (ctx.kind === "support") {
      return `Mình (**${member.role}**) hỗ trợ thêm cho yêu cầu ${t}.` + files +
        (ctx.isLast && ctx.lead ? ` ${handleOf(ctx.lead)} xem lại giúp mình phần này nhé.` : "");
    }
    return `Đã nhận yêu cầu ${t}.` + files + ` Mình (**${member.role}**) xử lý ngay phần chính của yêu cầu này.` +
      "\n\n*(Vico Lite 2.6 đang chạy chế độ demo, chưa kết nối mô hình AI.)*";
  }
  const summaryLines = (ctx) => ctx.group.members.filter((m) => m.id !== ctx.self).map((m) => `- **${m.role}** (${handleOf(m)}): đã góp ý cho yêu cầu.`).join("\n");

  /** Một lượt trả lời của một AI trong nhóm. opts: { signal, onDelta } */
  async function memberReply(member, chat, group, ctx, opts = {}) {
    const md = modelOf(member.model);
    const project = projects.find((p) => p.id === chat.projectId);
    const { signal, onDelta } = opts;
    agentPrompt = memberPrompt(member, group, ctx);
    try {
      const prompt = transcriptFor(chat, member);
      if (md.provider === "vico") {
        if (!VICO_CONFIG.apiUrl) { // chế độ demo: giả lập chữ chạy dần
          await sleepAbortable(500 + Math.random() * 500, signal);
          const reply = demoReply(member, { ...ctx, group, self: member.id });
          if (!onDelta) return reply;
          for (const piece of reply.match(/\s*\S+/g) || []) { await sleepAbortable(12 + Math.random() * 20, signal); onDelta(piece); }
          return reply;
        }
        return await askVico([{ role: "user", content: prompt }], chat.topic || topic, project, reasoning, mode, { signal, onDelta });
      }
      // Model ngoài (API key của bạn): gọi qua tiến trình chính, Dừng thì huỷ luôn yêu cầu đang chạy
      const system = buildSystemPrompt(chat.topic || topic, project, mode, { local: true });
      if (md.provider === "local") { // model chạy trên máy (Finetune): không trừ credit
        const content = VicoLocal.isSmall(md.localId) ? directFor(chat, ctx) : prompt;
        return await VicoLocal.ask(md.localId, { system, messages: [{ role: "user", content }], level: reasoning, signal, onDelta });
      }
      const reqId = uid();
      const abort = () => D.aiAbort && D.aiAbort(reqId);
      if (signal) signal.addEventListener("abort", abort, { once: true });
      try {
        return await D.aiChat({ provider: md.provider, model: md.id, system, prompt, effort: effortFor(md), reqId });
      } finally {
        if (signal) signal.removeEventListener("abort", abort);
      }
    } catch (err) {
      if ((signal && signal.aborted) || (err && err.name === "AbortError")) throw new DOMException("Đã dừng", "AbortError");
      throw new Error(cleanErr(err));
    } finally {
      agentPrompt = "";
    }
  }

  /** Danh sách lượt trả lời cho một tin nhắn, theo cách làm việc của nhóm. */
  /** AI được người dùng gọi: cách gọi có ký hiệu (@dev) hoặc gọi bằng tên / vai trò ("này lập trình", "laptrinh ơi"),
      không phân biệt dấu và hoa thường. Thứ tự theo vị trí xuất hiện trong tin nhắn. */
  function calledIn(text, members) {
    const t = " " + fold(text).replace(/[^a-z0-9@!/_-]+/g, " ") + " ";
    const hits = mentionsIn(text, members).map((m) => ({ m, at: -1 }));
    for (const m of members) {
      if (hits.some((h) => h.m === m)) continue;
      const names = [m.name, m.role].map((x) => fold(x).replace(/[^a-z0-9]+/g, " ").trim()).filter((x) => x.length >= 2);
      const at = Math.min(...names.map((n) => t.indexOf(" " + n + " ")).filter((i) => i >= 0), Infinity);
      if (at !== Infinity) hits.push({ m, at });
    }
    return hits.sort((a, b) => a.at - b.at).map((h) => h.m);
  }
  function planTurns(group, called) {
    const members = group.members;
    const lead = called[0] || members[0];
    const workers = members.filter((m) => !isWatcher(m) || called.includes(m));
    const pool = styleOf(group) === "meeting" || !workers.length ? members : workers; // giám sát chỉ nhắn khi thấy bất thường
    const order = called.length ? [...called, ...pool.filter((m) => !called.includes(m))] : pool;
    const first = order.map((m, i) => ({ m, kind: i < (called.length || 1) ? "direct" : "support", called: called.length > 0, lead, round: 1 }));
    // Lần lượt: gọi đích danh ai thì chỉ người đó trả lời (người khác chỉ vào khi được AI đó nhắc tên)
    if (styleOf(group) !== "meeting") return called.length ? first.filter((q) => q.kind === "direct") : first;
    const rounds = roundsOf(group), plan = [...first];
    for (let r = 2; r <= rounds; r++) order.forEach((m) => plan.push({ m, kind: "discuss", round: r, rounds, lead }));
    plan.push({ m: lead, kind: "summary", round: rounds, rounds, lead, summary: true });
    return plan;
  }

  async function sendGroup(text) {
    text = text.trim();
    const files = pendingAttachments.slice();
    if ((!text && !files.length) || busy) return;
    if (!user) return openAuth("signup", "Tạo tài khoản để dùng Group AI. Tặng ngay " + fmt(VICO_CREDITS.signupBonus) + " credit!");
    if (files.some((f) => f.loading)) return showToast("Đợi file đính kèm xử lý xong đã nhé.");
    const wait = rateWait();
    if (wait) return showToast(`Bạn gửi hơi nhanh, đợi ${wait} giây nữa nhé.`, "warn");
    const group = activeGroup;
    const est = groupEstimate(group);
    user = VicoAuth.current();
    if (est.n && user && user.total < est.per) {
      renderCredits();
      return showToast(`Không đủ credit cho thành viên Vico AI Lite 2.6 (còn ${fmt(user.total)} credit).`, "warn");
    }
    let chat = current();
    if (!chat) {
      chat = { id: Date.now().toString(36), title: `[${group.name}] ${(text || files[0].name).slice(0, 30)}`, messages: [], topic, projectId: currentProjectId, group: true, groupId: group.id };
      chats.unshift(chat);
      currentId = chat.id;
    }
    const umsg = { role: "user", content: text, ts: Date.now() };
    if (files.length) umsg.attachments = files.map(({ id, name, type, size, kind, thumb }) => ({ id, name, type, size, kind, thumb }));
    chat.messages.push(umsg);
    save(); renderHistory();
    if (typeof clearAttachments === "function") clearAttachments(false);
    els.welcome.style.display = "none";
    addMessageEl("user", text, "", umsg, chat.messages.length - 1);
    els.input.value = ""; autoGrow();
    sendTimes.push(Date.now());
    busy = true;
    const ctrl = (activeAbort = new AbortController());
    updateSend();

    // AI được gọi tên trả lời trước, các AI khác làm theo. Lần lượt: AI nhắc tên nhau thì được thêm lượt.
    // Họp bàn: thêm các vòng thảo luận rồi một lượt tổng kết.
    const members = group.members;
    const queue = planTurns(group, calledIn(text, members));
    const meeting = styleOf(group) === "meeting";
    const fileNames = files.map((f) => f.name);
    const visible = () => currentId === chat.id;
    let extra = 0, stopped = false, lastLabel = "";
    const watchers = meeting ? [] : members.filter(isWatcher);
    try {
      for (let i = 0; i < queue.length && !ctrl.signal.aborted; i++) {
        if (i >= SAFETY_TURNS) { showToast(`Nhóm đã trao đổi ${SAFETY_TURNS} lượt cho tin này nên tự dừng để tránh lặp vô hạn. Nhắn tiếp để cả nhóm làm tiếp.`, "warn"); break; }
        const q = queue[i], m = q.m, md = modelOf(m.model);
        let used = null;
        if (md.provider === "vico") { // model ngoài dùng API key của bạn nên không trừ credit Vico
          const cost = creditCost(reasoning, mode);
          try { ({ user, used } = VicoAuth.spend(cost, `Group AI · ${group.name} · ${handleOf(m)}`)); renderCredits(VICO_CONFIG.apiUrl ? 0 : cost); }
          catch {
            user = VicoAuth.current(); renderCredits();
            showToast(`Nhóm tạm dừng vì hết credit: ${handleOf(m)} (Vico AI Lite 2.6) không trả lời được.`, "warn");
            break;
          }
        }
        const info = { id: m.id, handle: handleOf(m), role: m.role, color: m.color, model: md.name };
        const label = q.summary ? "Tổng kết" : q.round > 1 ? `Vòng ${q.round}` : "";
        if (label && label !== lastLabel && visible()) els.messages.appendChild(roundDivider(label));
        lastLabel = label;
        const el = addMessageEl("bot", `<span class="typing"><i></i><i></i><i></i></span>`);
        const watching = q.kind === "watch";
        if (watching) el.style.display = "none"; // giám sát kiểm tra âm thầm, chỉ hiện khi có điều cần nói
        if (!visible()) el.remove(); // đang xem đoạn chat khác: vẫn chạy và lưu, chỉ không vẽ ra
        decorateAgent(el, info);
        const content = el.querySelector(".content");
        let streamed = "", raf = 0;
        const paint = () => { raf = 0; content.innerHTML = renderMarkdown(streamed) + '<span class="stream-caret"></span>'; if (visible()) scrollBottom(); };
        const onDelta = settings.stream && !watching ? (d) => { streamed += d; if (!raf) raf = requestAnimationFrame(paint); } : null;
        const ctx = { ...q, task: text, files: fileNames, isLast: i === queue.length - 1 };
        const push = (reply, extraProps = {}) => {
          const msg = { role: "assistant", agentInfo: info, content: reply, ts: Date.now(), ...extraProps };
          if (meeting) { msg.round = q.round; if (q.summary) msg.summary = true; }
          chat.messages.push(msg);
          save();
          content.innerHTML = botHtml(msg);
          renderActions(el, msg, chat.messages.length - 1);
          return msg;
        };
        if (visible()) scrollBottom();
        try {
          const reply = await memberReply(m, chat, group, ctx, { signal: ctrl.signal, onDelta });
          cancelAnimationFrame(raf);
          // Giám sát thấy ổn, hoặc AI được gọi nhưng không còn gì để nói: im lặng (không hiện, không lưu)
          if ((watching || q.kind === "followup") && (!reply || SILENT_RE.test(reply.replace(/\*/g, "")))) { el.remove(); continue; }
          if (watching) el.style.display = "";
          push(reply || "(không có nội dung)");
          if (!meeting) {
            // AI gọi tên AI khác -> những AI được gọi trả lời tiếp (theo thứ tự được gọi), cứ thế cho đến khi không còn ai
            // gọi ai nữa: không giới hạn số lượt. Chỉ dẫn yêu cầu chỉ gọi tên khi thật sự cần, AI không còn gì để nói thì im lặng.
            const substantial = reply.replace(/\s+/g, " ").length > 150;
            const next = [];
            for (const t of mentionsIn(reply, members, m.id)) {
              if (queue.slice(i + 1).some((x) => x.m.id === t.id && x.kind !== "watch")) continue; // đã đang chờ tới lượt
              next.push({ m: t, kind: "followup", by: info.handle });
              extra++;
            }
            // Giám sát xem mọi tin có nội dung trước, rồi đến các AI được gọi
            const checks = q.kind === "watch" || !substantial ? [] : watchers.filter((w) => w.id !== m.id && !next.some((x) => x.m.id === w.id));
            queue.splice(i + 1, 0, ...checks.map((w) => ({ m: w, kind: "watch", target: info.handle })), ...next);
          }
        } catch (err) {
          cancelAnimationFrame(raf);
          if (err && err.name === "AbortError") {
            stopped = true;
            if (streamed.trim()) push(streamed, { stopped: true }); // giữ phần đã viết, không hoàn credit
            else { el.remove(); if (used) { user = VicoAuth.refund(used, "Hoàn lại · Group AI đã dừng"); renderCredits(); } }
            break;
          }
          // Lỗi của một AI không dừng cả nhóm. Vẫn lưu thành tin (đánh dấu lỗi, không gửi cho AI khác)
          // để thứ tự tin nhắn khớp với khung chat.
          if (used) { user = VicoAuth.refund(used, "Hoàn lại · Group AI lỗi"); renderCredits(); }
          if (watching) { el.remove(); continue; }
          push((/^Lỗi/.test(err.message) ? err.message : "Lỗi: " + err.message) + (used ? " (không bị trừ credit)" : ""), { error: true });
          content.classList.add("error");
        }
        if (visible()) scrollBottom();
      }
    } finally {
      busy = false;
      if (activeAbort === ctrl) activeAbort = null;
      updateSend();
      if (visible()) { refreshActions(); scrollBottom(); }
      if (stopped || ctrl.signal.aborted) showToast("Đã dừng nhóm. Lượt chưa viết chữ nào được hoàn credit.");
      else notifyDone(`${group.name} đã trả lời xong.`);
    }
  }
  const baseSend = sendMessage;
  sendMessage = (text) => (activeGroup ? sendGroup(text) : baseSend(text));

  /* Gợi ý cách gọi khi gõ @, ! hoặc / trong ô chat */
  const mentionBox = document.createElement("div");
  mentionBox.className = "mention-box";
  mentionBox.hidden = true;
  els.form.appendChild(mentionBox);
  let mItems = [], mSel = 0, mTok = null;
  function updateMentions() {
    mentionBox.hidden = true;
    mTok = null;
    if (!activeGroup) return;
    const pos = els.input.selectionStart;
    const mt = /(^|\s)([@!/][\p{L}\p{N}_-]*)$/u.exec(els.input.value.slice(0, pos));
    if (!mt) return;
    const tok = mt[2].toLowerCase();
    mItems = activeGroup.members.filter((x) => handleOf(x).toLowerCase().startsWith(tok));
    if (!mItems.length) return;
    mTok = { start: pos - mt[2].length, end: pos };
    mSel = 0;
    renderMentionBox();
    mentionBox.hidden = false;
  }
  function renderMentionBox() {
    mentionBox.innerHTML = mItems.map((x, i) => `<button type="button" class="mention-item${i === mSel ? " on" : ""}" data-i="${i}">
      <i class="gs-av sm" style="--c:${x.color}">${initial(x.name)}</i><b>${esc(handleOf(x))}</b><span>${esc(x.role)} · ${esc(modelOf(x.model).name)}</span></button>`).join("");
  }
  function pickMention(i) {
    const x = mItems[i];
    if (!x || !mTok) return;
    const v = els.input.value, ins = handleOf(x) + " ";
    els.input.value = v.slice(0, mTok.start) + ins + v.slice(mTok.end);
    const caret = mTok.start + ins.length;
    els.input.setSelectionRange(caret, caret);
    els.input.focus();
    mentionBox.hidden = true;
    mTok = null;
    autoGrow(); updateSend();
  }
  els.input.addEventListener("input", updateMentions);
  els.input.addEventListener("click", updateMentions);
  els.input.addEventListener("blur", () => setTimeout(() => (mentionBox.hidden = true), 150));
  mentionBox.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const b = e.target.closest(".mention-item");
    if (b) pickMention(+b.dataset.i);
  });
  // Bắt phím trước ô nhập (pha capture) để Enter chọn gợi ý thay vì gửi tin
  els.form.addEventListener("keydown", (e) => {
    if (mentionBox.hidden || e.target !== els.input) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      mSel = (mSel + (e.key === "ArrowDown" ? 1 : -1) + mItems.length) % mItems.length;
      renderMentionBox();
    } else if (e.key === "Enter" || e.key === "Tab") pickMention(mSel);
    else if (e.key === "Escape") mentionBox.hidden = true;
    else return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  /* ---------- Agent: AI dùng công cụ trên máy, bạn duyệt từng bước ----------
     AI viết khối ```vico-tool {JSON}``` -> hiện thẻ xin phép (Cho phép / Từ chối) -> chạy trong tiến trình chính
     -> kết quả gửi lại cho AI ở bước sau. Ghi file luôn có điểm khôi phục để Hoàn tác.
     Cách này không phụ thuộc kiểu "tool calling" của từng hãng nên dùng được cho Vico (máy chủ sau này), GPT, Claude. */
  const AGENT_MAX_STEPS = 8;
  const TOOL_RE = /```vico-tool[^\n]*\n([\s\S]*?)```/g;
  const TOOLS = {
    list_dir: { label: "Xem thư mục", icon: I.folder, read: true },
    read_file: { label: "Đọc file", icon: I.file, read: true },
    write_file: { label: "Ghi file", icon: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>' },
    run_command: { label: "Chạy lệnh", icon: '<path d="M4 17l6-5-6-5M12 19h8"/>' },
  };
  const ROBOT = '<rect x="4.5" y="8" width="15" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16.5h5M2.5 12.5v2M21.5 12.5v2"/>';
  const agentPromptText = () =>
    `Bạn đang ở chế độ Agent: được dùng công cụ trên máy người dùng, bên trong thư mục "${folder ? folder.root : ""}".\n` +
    "Để dùng công cụ, viết một khối code vico-tool chứa đúng một đối tượng JSON, ví dụ:\n```vico-tool\n{\"tool\": \"list_dir\", \"path\": \".\"}\n```\n" +
    "Các công cụ (đường dẫn tính từ thư mục đang mở):\n" +
    "- list_dir {path}: liệt kê file và thư mục con\n" +
    "- read_file {path}: đọc file văn bản (tối đa 300 KB)\n" +
    "- write_file {path, content}: tạo mới hoặc ghi đè cả file (người dùng hoàn tác được)\n" +
    "- run_command {command}: chạy lệnh PowerShell trong thư mục đang mở, trả về kết quả (tối đa 2 phút)\n" +
    "Một lượt có thể dùng nhiều công cụ. Người dùng duyệt từng công cụ trước khi chạy và có thể từ chối; kết quả được gửi lại cho bạn ở tin tiếp theo. " +
    "Giải thích ngắn gọn trước khi dùng công cụ, chỉ dùng khi cần cho yêu cầu. Xong việc thì trả lời bình thường, không kèm khối vico-tool.";

  const parseTools = (text) => [...String(text).matchAll(TOOL_RE)].map((m) => {
    try { const o = JSON.parse(m[1]); return o && typeof o === "object" ? o : { tool: "?" }; }
    catch { return { tool: "?", raw: m[1].trim().slice(0, 300) }; }
  });
  // Bỏ khối công cụ khỏi phần chữ hiển thị (cả khối đang viết dở khi chữ chạy dần)
  const stripTools = (t) => String(t).replace(TOOL_RE, "").replace(/```vico-tool[\s\S]*$/, "").trim();
  const relPath = (p) => (p == null || p === "." || p === "./" ? "" : String(p).replace(/^\.[\\/]/, ""));
  function validateTool(t) {
    const a = t.args;
    if (!TOOLS[t.tool]) return a.raw ? "Khối công cụ không phải JSON hợp lệ." : `Không có công cụ "${t.tool}".`;
    if (t.tool !== "list_dir" && t.tool !== "run_command" && (typeof a.path !== "string" || !a.path.trim())) return "Thiếu đường dẫn (path).";
    if (t.tool === "write_file" && typeof a.content !== "string") return "Thiếu nội dung file (content).";
    if (t.tool === "run_command" && (typeof a.command !== "string" || !a.command.trim())) return "Thiếu lệnh (command).";
    return "";
  }

  let liveMsg = null, pending = null; // tin của Agent đang chạy, thẻ đang chờ duyệt
  const STATUS = { ask: "Chờ bạn duyệt", run: "Đang chạy…", done: "Đã chạy", denied: "Đã từ chối", error: "Lỗi", stopped: "Đã dừng", skipped: "Chưa chạy" };
  function toolCardHtml(t, i, live) {
    const spec = TOOLS[t.tool] || { label: "Công cụ không hợp lệ", icon: I.close };
    const status = !live && (t.status === "ask" || t.status === "run") ? "skipped" : t.status;
    const a = t.args, cmd = t.tool === "run_command";
    const target = cmd ? "PowerShell" : t.tool === "list_dir" ? a.path || "." : a.path || "";
    const body = cmd ? a.command : t.tool === "write_file" && status === "ask" ? a.content : "";
    return `<div class="tool-card" data-i="${i}" data-state="${status}">
      <div class="tc-head">${SVG(spec.icon, 15)}<b>${spec.label}</b><code>${esc(target)}</code>
        <span class="tc-st">${STATUS[status]}${t.undone ? " · đã hoàn tác" : ""}</span></div>
      ${body ? `<pre class="tc-pre">${esc(body.slice(0, 4000))}${body.length > 4000 ? "\n…" : ""}</pre>` : ""}
      ${status === "ask" ? `<div class="tc-actions"><button type="button" class="btn-ghost sm" data-tc="deny">Từ chối</button><button type="button" class="btn-primary sm" data-tc="allow">Cho phép</button></div>` : ""}
      ${t.output ? `<details class="tc-out"${status === "error" ? " open" : ""}><summary>${status === "error" ? "Chi tiết lỗi" : "Kết quả"}</summary><pre>${esc(t.output.slice(0, 20000))}</pre></details>` : ""}
      ${t.tool === "write_file" && status === "done" && t.checkpoint && !t.undone ? `<div class="tc-actions"><button type="button" class="btn-ghost sm" data-tc="undo">${SVG('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', 14)}Hoàn tác</button></div>` : ""}
    </div>`;
  }
  const toolCards = (msg) => `<div class="tool-cards">${msg.tools.map((t, i) => toolCardHtml(t, i, msg === liveMsg)).join("")}</div>`;
  const agentHtml = (msg) => renderMarkdown(stripTools(msg.content)) + (msg.tools ? toolCards(msg) : "") + (msg.stopped ? '<p class="stopped-note">Đã dừng</p>' : "");
  const nodeOf = (chat, msg) => (currentId === chat.id ? els.messages.querySelectorAll(":scope > .msg")[chat.messages.indexOf(msg)] : null);
  function paintTools(chat, msg, el) {
    const node = nodeOf(chat, msg) || el, box = node && node.querySelector(".tool-cards");
    if (box) box.outerHTML = toolCards(msg);
  }

  // Tin Agent: vẽ lại thẻ công cụ khi mở lại đoạn chat
  const agentRenderChat = renderChat;
  renderChat = () => {
    agentRenderChat();
    const chat = current();
    if (!chat || !chat.agent) return;
    const nodes = els.messages.querySelectorAll(":scope > .msg");
    chat.messages.forEach((m, i) => { if (m.tools && nodes[i]) nodes[i].querySelector(".content").innerHTML = agentHtml(m); });
  };

  /** Kết quả các công cụ, gửi lại cho AI ở bước sau. */
  const toolResultsText = (tools) => "Kết quả công cụ:\n\n" + tools.map((t) => {
    const a = t.args, what = t.tool === "run_command" ? { command: a.command } : { path: a.path || "." };
    const body = t.status === "done" ? (t.output || "").slice(0, 20000)
      : t.status === "denied" ? "Người dùng đã từ chối công cụ này."
      : t.status === "error" ? "Lỗi: " + t.output : "Chưa chạy (người dùng đã dừng).";
    return `[${t.tool} ${JSON.stringify(what)}]\n${body}`;
  }).join("\n\n");
  const agentMessages = (chat) => chat.messages.flatMap((m) => (m.tools && m.tools.length
    ? [{ role: "assistant", content: m.content }, { role: "user", content: toolResultsText(m.tools) }]
    : [{ role: m.role, content: m.content, attachments: m.attachments }]));

  // Model cho Agent: Vico Lite 2.6 hoặc model GPT/Claude đã có API key (chọn trong Cài đặt)
  const agentModel = () => {
    const md = VICO_MODELS.find((m) => m.id === settings.agentModel);
    return md && (md.provider === "vico" || md.provider === "local" || keyStatus[md.provider]) ? md : modelOf("vico-lite-2.6");
  };
  const autoRead = () => settings.agentAutoRead !== false;

  async function execTool(t, signal) {
    const a = t.args;
    if (t.tool === "list_dir") {
      const list = await D.listFolder(relPath(a.path));
      return { text: list.map((e) => (e.dir ? e.name + "/" : e.name)).join("\n") || "(thư mục trống)" };
    }
    if (t.tool === "read_file") {
      const r = await D.readFile(relPath(a.path));
      return { text: r.binary ? `(file nhị phân, ${fmtSize(r.size)}, không đọc được)` : r.content + (r.truncated ? "\n… (file dài, chỉ đọc 300 KB đầu)" : "") };
    }
    if (t.tool === "write_file") {
      const r = await D.agentWrite(relPath(a.path), a.content);
      renderTree();
      return { text: `${r.created ? "Đã tạo" : "Đã ghi đè"} ${a.path} (${fmtSize(r.bytes)})`, checkpoint: r.checkpoint };
    }
    // run_command: chạy và hiện cả trong khung Terminal để bạn thấy
    const reqId = uid(), kill = () => D.agentKill(reqId);
    signal.addEventListener("abort", kill, { once: true });
    showPc();
    termPrint(`[Agent] PS ${folder.name}> ${a.command}\n`, "t-cmd");
    try {
      const r = await D.agentRun(a.command, reqId);
      if (r.error) throw new Error(r.error);
      const out = [r.stdout.trim(), r.stderr.trim() && "[stderr]\n" + r.stderr.trim()].filter(Boolean).join("\n");
      termPrint((out || "(không có kết quả)") + "\n", r.code ? "t-err" : "");
      if (signal.aborted) throw new DOMException("Đã dừng", "AbortError");
      return { text: `Mã thoát: ${r.code}${r.timedOut ? " (quá 2 phút nên đã dừng)" : ""}\n${out || "(không có kết quả)"}` };
    } finally {
      signal.removeEventListener("abort", kill);
    }
  }

  // Trả lời mẫu khi chưa kết nối mô hình AI: chạy thử đủ 3 loại công cụ để kiểm tra luồng duyệt
  async function agentDemo(chat, { signal, onDelta }) {
    let u = chat.messages.length - 1;
    while (u >= 0 && chat.messages[u].role !== "user") u--;
    const task = ((chat.messages[u] || {}).content || "").trim() || "(không có nội dung)";
    const steps = chat.messages.slice(u + 1).filter((m) => m.role === "assistant");
    const last = steps[steps.length - 1];
    const tool = (o) => "\n\n```vico-tool\n" + JSON.stringify(o) + "\n```";
    const FILE = "vico-agent-demo.md";
    let text;
    if (last && last.tools && last.tools.some((t) => t.status === "denied")) {
      text = "Bạn đã từ chối bước vừa rồi nên mình dừng ở đây. Muốn làm tiếp thì nhắn mình nhé.";
    } else if (!steps.length) {
      text = "Mình xem thư mục đang mở trước để nắm cấu trúc." + tool({ tool: "list_dir", path: "." });
    } else if (steps.length === 1) {
      const items = ((last.tools && last.tools[0].output) || "").split("\n").filter((l) => l && !l.startsWith("("));
      text = `Thư mục có ${items.length} mục. Mình tạo một file ghi chú cho yêu cầu của bạn.` + tool({
        tool: "write_file", path: FILE,
        content: `# Ghi chú từ Vico Agent\n\n- Yêu cầu: ${task}\n- Thời gian: ${new Date().toLocaleString("vi-VN")}\n` +
          `- Thư mục có ${items.length} mục: ${items.slice(0, 12).join(", ")}${items.length > 12 ? ", …" : ""}\n`,
      });
    } else if (steps.length === 2) {
      text = "Kiểm tra lại file vừa tạo bằng PowerShell:" + tool({ tool: "run_command", command: `Get-Item ${FILE} | Select-Object Name, Length | Format-List` });
    } else {
      text = `Xong! Mình đã tạo **${FILE}** trong thư mục của bạn. Bấm **Hoàn tác** trên thẻ *Ghi file* nếu muốn xoá file này.\n\n` +
        "*(Agent đang chạy chế độ demo, chưa kết nối mô hình AI: các bước trên là mẫu để thử luồng duyệt công cụ.)*";
    }
    await sleepAbortable(450 + Math.random() * 350, signal);
    if (!onDelta) return text;
    const cut = text.indexOf("\n\n```vico-tool");
    const say = cut < 0 ? text : text.slice(0, cut);
    for (const piece of say.match(/\s*\S+/g) || []) { await sleepAbortable(12 + Math.random() * 20, signal); onDelta(piece); }
    if (cut >= 0) onDelta(text.slice(cut));
    return text;
  }

  async function agentCall(chat, md, opts) {
    const { signal, onDelta } = opts;
    const project = projects.find((p) => p.id === chat.projectId);
    agentPrompt = agentPromptText();
    try {
      if (md.provider === "vico") {
        if (!VICO_CONFIG.apiUrl) return await agentDemo(chat, opts);
        return await askVico(agentMessages(chat), chat.topic || topic, project, reasoning, mode, { signal, onDelta });
      }
      const system = buildSystemPrompt(chat.topic || topic, project, mode, { local: true });
      if (md.provider === "local") return await VicoLocal.ask(md.localId, { system, messages: agentMessages(chat), level: reasoning, signal, onDelta, keepSystem: true });
      const prompt = agentMessages(chat).map((m) => `[${m.role === "user" ? "Người dùng" : "Bạn (Agent)"}]: ${m.content}`).join("\n\n") +
        "\n\nTiếp tục công việc theo yêu cầu của người dùng.";
      const reqId = uid(), abort = () => D.aiAbort(reqId);
      signal.addEventListener("abort", abort, { once: true });
      try { return await D.aiChat({ provider: md.provider, model: md.id, system, prompt, effort: effortFor(md), reqId }); }
      finally { signal.removeEventListener("abort", abort); }
    } catch (err) {
      if (signal.aborted || (err && err.name === "AbortError")) throw new DOMException("Đã dừng", "AbortError");
      throw new Error(cleanErr(err));
    } finally {
      agentPrompt = "";
    }
  }

  async function sendAgent(text) {
    text = text.trim();
    const files = pendingAttachments.slice();
    if ((!text && !files.length) || busy) return;
    if (!folder) {
      showToast("Mở một thư mục để Agent làm việc trong đó.", "warn");
      showPc();
      return openFolder();
    }
    if (files.some((f) => f.loading)) return showToast("Đợi file đính kèm xử lý xong đã nhé.");
    const md = agentModel();
    if (md.provider === "vico") { if (!canSend()) return; }
    else {
      if (!user) return openAuth("signup", "Tạo tài khoản để dùng Agent.");
      const wait = rateWait();
      if (wait) return showToast(`Bạn gửi hơi nhanh, đợi ${wait} giây nữa nhé.`, "warn");
    }
    let chat = current();
    if (!chat) {
      chat = { id: Date.now().toString(36), title: "[Agent] " + (text || files[0].name).slice(0, 32), messages: [], topic, projectId: currentProjectId };
      chats.unshift(chat);
      currentId = chat.id;
    }
    chat.agent = true;
    const umsg = { role: "user", content: text, ts: Date.now() };
    if (files.length) umsg.attachments = files.map(({ id, name, type, size, kind, thumb }) => ({ id, name, type, size, kind, thumb }));
    chat.messages.push(umsg);
    save(); renderHistory();
    if (typeof clearAttachments === "function") clearAttachments(false);
    els.welcome.style.display = "none";
    addMessageEl("user", text, "", umsg, chat.messages.length - 1);
    els.input.value = ""; autoGrow();
    sendTimes.push(Date.now());
    await runAgent(chat, md);
  }

  async function runAgent(chat, md) {
    const ctrl = (activeAbort = new AbortController());
    busy = true;
    updateSend();
    refreshActions();
    const visible = () => currentId === chat.id;
    let stopped = false, steps = 0, finished = false;
    try {
      while (steps < AGENT_MAX_STEPS && !ctrl.signal.aborted) {
        steps++;
        let used = null;
        if (md.provider === "vico") {
          const cost = creditCost(reasoning, mode);
          try { ({ user, used } = VicoAuth.spend(cost, `Agent · bước ${steps}`)); renderCredits(VICO_CONFIG.apiUrl ? 0 : cost); }
          catch {
            user = VicoAuth.current(); renderCredits();
            showToast("Agent tạm dừng vì hết credit.", "warn");
            break;
          }
        }
        const el = addMessageEl("bot", typingHtml());
        if (!visible()) el.remove();
        const content = el.querySelector(".content");
        let streamed = "", raf = 0;
        const paint = () => { raf = 0; content.innerHTML = renderMarkdown(stripTools(streamed)) + '<span class="stream-caret"></span>'; if (visible()) scrollBottom(); };
        const onDelta = settings.stream ? (d) => { streamed += d; if (!raf) raf = requestAnimationFrame(paint); } : null;
        let reply;
        try {
          reply = await agentCall(chat, md, { signal: ctrl.signal, onDelta });
        } catch (err) {
          cancelAnimationFrame(raf);
          if (err && err.name === "AbortError") {
            stopped = true;
            if (stripTools(streamed)) {
              const msg = { role: "assistant", content: stripTools(streamed), ts: Date.now(), stopped: true };
              chat.messages.push(msg); save();
              content.innerHTML = agentHtml(msg);
            } else {
              el.remove();
              if (used) { user = VicoAuth.refund(used, "Hoàn lại · Agent đã dừng"); renderCredits(); }
            }
          } else {
            content.classList.add("error");
            content.textContent = (/^Lỗi/.test(err.message) ? err.message : "Lỗi: " + err.message) + (used ? " (không bị trừ credit)" : "");
            if (used) { user = VicoAuth.refund(used, "Hoàn lại · Agent lỗi"); renderCredits(); }
          }
          break;
        }
        cancelAnimationFrame(raf);
        const calls = parseTools(reply);
        const msg = { role: "assistant", content: reply || "(không có nội dung)", ts: Date.now() };
        if (calls.length) msg.tools = calls.map((c) => ({ tool: c.tool, args: c, status: "ask" }));
        liveMsg = msg;
        chat.messages.push(msg);
        save();
        content.innerHTML = agentHtml(msg);
        renderActions(el, msg, chat.messages.length - 1);
        if (!calls.length) { finished = true; notifyDone(stripTools(reply)); break; }

        // Duyệt rồi chạy lần lượt từng công cụ
        for (const t of msg.tools) {
          if (ctrl.signal.aborted) { t.status = "stopped"; continue; }
          const bad = validateTool(t);
          if (bad) { t.status = "error"; t.output = bad; continue; }
          let ok = TOOLS[t.tool].read && autoRead();
          if (!ok) {
            paintTools(chat, msg, el);
            if (visible()) scrollBottom();
            ok = await new Promise((resolve) => {
              pending = { t, resolve };
              ctrl.signal.addEventListener("abort", () => resolve(null), { once: true });
            });
            pending = null;
            if (ok === null) { t.status = "stopped"; continue; }
            if (!ok) { t.status = "denied"; paintTools(chat, msg, el); continue; }
          }
          t.status = "run";
          paintTools(chat, msg, el);
          try {
            const r = await execTool(t, ctrl.signal);
            t.status = "done";
            t.output = r.text;
            if (r.checkpoint) t.checkpoint = r.checkpoint;
          } catch (err) {
            t.status = ctrl.signal.aborted ? "stopped" : "error";
            t.output = cleanErr(err);
          }
          save();
          paintTools(chat, msg, el);
        }
        save();
        paintTools(chat, msg, el);
        if (ctrl.signal.aborted) stopped = true;
      }
    } finally {
      liveMsg = null;
      busy = false;
      if (activeAbort === ctrl) activeAbort = null;
      updateSend();
      if (visible()) { refreshActions(); scrollBottom(); }
      if (stopped) showToast("Đã dừng Agent. Bước chưa viết chữ nào được hoàn credit.");
      else if (!finished && steps >= AGENT_MAX_STEPS) showToast(`Agent đã chạy ${AGENT_MAX_STEPS} bước, nhắn "tiếp tục" để làm tiếp.`);
    }
  }

  // Bấm Cho phép / Từ chối / Hoàn tác trên thẻ công cụ
  els.messages.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-tc]");
    if (!b) return;
    const chat = current(), node = b.closest("#messages > .msg");
    const msg = chat && chat.messages[[...els.messages.querySelectorAll(":scope > .msg")].indexOf(node)];
    const t = msg && msg.tools && msg.tools[+b.closest(".tool-card").dataset.i];
    if (!t) return;
    if (b.dataset.tc !== "undo") { if (pending && pending.t === t) pending.resolve(b.dataset.tc === "allow"); return; }
    if (!t.checkpoint || t.undone) return;
    if (!confirm(`Hoàn tác: đưa "${t.args.path}" về như trước khi Agent ghi?`)) return;
    try {
      const r = await D.agentUndo(t.checkpoint);
      t.undone = true;
      save();
      if (folder) renderTree();
      paintTools(chat, msg, node);
      showToast(r.restored ? `Đã khôi phục ${r.path}.` : `Đã xoá ${r.path} (file do Agent tạo).`, "success");
    } catch (err) { showToast(cleanErr(err), "warn"); }
  });

  /* Nút bật/tắt Agent trong ô chat */
  const agentBtn = document.createElement("button");
  agentBtn.type = "button";
  agentBtn.className = "attach-btn agent-btn";
  agentBtn.id = "agentBtn";
  agentBtn.innerHTML = SVG(ROBOT, 19);
  $("#attachInput").after(agentBtn);
  function setAgent(on, quiet) {
    agentOn = on;
    store.set("vico_agent", on);
    agentBtn.classList.toggle("on", on);
    agentBtn.setAttribute("aria-pressed", on);
    agentBtn.title = on ? "Agent đang bật: AI được xem thư mục, ghi file, chạy lệnh (bạn duyệt từng bước). Bấm để tắt"
      : "Bật Agent: cho AI dùng công cụ trên máy (xem thư mục, ghi file, chạy lệnh)";
    if (!activeGroup) els.input.placeholder = (VICO_TOPICS.find((x) => x.id === topic) || VICO_TOPICS[0]).placeholder;
    updatePlaceholder();
    if (quiet) return;
    if (on && !folder) { showToast("Agent đã bật. Mở một thư mục để Agent làm việc trong đó."); showPc(); }
    else showToast(on ? "Agent đã bật: AI sẽ xin phép trước khi ghi file hoặc chạy lệnh." : "Đã tắt Agent.");
  }
  agentBtn.onclick = () => setAgent(!agentOn);
  setAgent(agentOn, true);
  // Mở lại đoạn chat Agent thì bật Agent
  const agentOpenChat = openChat;
  openChat = (id) => {
    agentOpenChat(id);
    const c = current();
    if (c && c.agent && !agentOn && !activeGroup) setAgent(true, true);
  };
  const agentSend = sendMessage;
  sendMessage = (text) => (agentOn && !activeGroup ? sendAgent(text) : agentSend(text));

  /* ---------- Cài đặt riêng bản desktop (Cài đặt > Chung) ---------- */
  let dset = {}, appVersion = "", updateState = null;
  D.getSettings().then((s) => (dset = s));
  D.info().then((i) => (appVersion = i.version));
  const UPDATE_TEXT = {
    off: "Chưa cấu hình máy chủ cập nhật (vicoUpdateUrl).", dev: "Bản đang phát triển không tự cập nhật.",
    checking: "Đang kiểm tra…", latest: "Bạn đang dùng bản mới nhất.",
  };
  const updateText = (s) => !s ? "" : UPDATE_TEXT[s.state] ||
    (s.state === "available" ? `Có bản ${s.version}, đang tải…` : s.state === "downloading" ? `Đang tải bản mới… ${s.percent}%`
      : s.state === "ready" ? `Bản ${s.version} đã tải xong.` : s.state === "error" ? "Lỗi cập nhật: " + s.message : "");
  const dToggle = (key, title, desc, on, attr = "data-dset") => `
    <label class="st-row st-toggle"><span><b>${title}</b>${desc ? `<small>${desc}</small>` : ""}</span>
      <input type="checkbox" ${attr}="${key}" ${on ? "checked" : ""} /><i class="sw"></i></label>`;
  registerSettingsSection("general", () => {
    const models = VICO_MODELS.filter((m) => m.provider === "vico" || m.provider === "local" || keyStatus[m.provider]);
    const cur = agentModel().id;
    return {
      html: `
        <h4>Bản desktop</h4>
        ${dToggle("closeToTray", "Thu xuống khay hệ thống khi đóng", "Vico AI chạy nền, mở lại từ biểu tượng ở khay hoặc phím tắt", dset.closeToTray)}
        ${dToggle("globalShortcut", "Phím tắt Ctrl + Shift + Space", dset.shortcutError || "Mở Vico AI từ bất cứ đâu, con trỏ vào sẵn ô chat", dset.globalShortcut)}
        ${dToggle("openAtLogin", "Mở cùng Windows", dset.packaged === false ? "Chỉ áp dụng cho bản đã cài" : "Tự mở Vico AI khi bật máy", dset.openAtLogin)}
        <h4>Agent</h4>
        ${dToggle("agentAutoRead", "Tự cho phép công cụ chỉ đọc", "Xem thư mục và đọc file không cần hỏi. Ghi file và chạy lệnh luôn hỏi bạn", autoRead(), "data-aset")}
        <div class="st-row"><span><b>Model cho Agent</b><small>Model GPT/Claude dùng API key của bạn, model trên máy tải trong Finetune; cả hai không trừ credit</small></span>
          <select data-aset-select="agentModel">${models.map((m) => `<option value="${m.id}"${m.id === cur ? " selected" : ""}>${esc(m.name)}</option>`).join("")}</select></div>
        <h4>Cập nhật</h4>
        <div class="st-row"><span><b>Vico AI ${esc(appVersion)}</b><small id="upStatus">${esc(updateText(updateState))}</small></span>
          <button type="button" class="btn-ghost sm" id="upBtn">${updateState && updateState.state === "ready" ? "Cài & khởi động lại" : "Kiểm tra cập nhật"}</button></div>`,
      bind: (body) => {
        body.querySelectorAll("[data-dset]").forEach((inp) => (inp.onchange = async () => {
          try { dset = await D.setSetting(inp.dataset.dset, inp.checked); }
          catch (err) { inp.checked = !inp.checked; return showToast(cleanErr(err), "warn"); }
          if (inp.dataset.dset === "globalShortcut" && dset.shortcutError) { showToast(dset.shortcutError, "warn"); inp.checked = false; }
        }));
        body.querySelectorAll("[data-aset]").forEach((inp) => (inp.onchange = () => { settings[inp.dataset.aset] = inp.checked; savePrefs(); }));
        body.querySelectorAll("[data-aset-select]").forEach((sel) => (sel.onchange = () => { settings[sel.dataset.asetSelect] = sel.value; savePrefs(); }));
        body.querySelector("#upBtn").onclick = async () => {
          if (updateState && updateState.state === "ready") return D.installUpdate();
          onUpdate(await D.checkUpdate());
        };
      },
    };
  });
  function onUpdate(s) {
    updateState = s;
    const el = document.getElementById("upStatus");
    if (el) el.textContent = updateText(s);
    const btn = document.getElementById("upBtn");
    if (btn) btn.textContent = s.state === "ready" ? "Cài & khởi động lại" : "Kiểm tra cập nhật";
    if (s.state === "ready") showToast(`Đã tải bản ${s.version}. Mở Cài đặt để cài và khởi động lại.`, "success");
    else if (["off", "dev", "error"].includes(s.state)) showToast(updateText(s), s.state === "error" ? "warn" : ""); // chỉ có khi bạn bấm kiểm tra (hoặc lỗi)
  }
  D.onUpdateStatus(onUpdate);
  // Lệnh từ khay hệ thống / phím tắt toàn cục
  D.onCommand((cmd) => {
    if (cmd === "new-chat") { if (activeGroup) setGroup(null); else newChat(); }
    if (cmd === "focus-input") els.input.focus();
  });

  // Phím tắt: Ctrl+O mở thư mục, Ctrl+` bật/tắt khung làm việc
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === "o") { e.preventDefault(); showPc(); openFolder(); }
    if (e.ctrlKey && e.key === "`") { e.preventDefault(); setWs(!root.classList.contains("ws-open")); }
  });

  /* =========================================================
     KẾT NỐI THƯ MỤC CHO DỰ ÁN
     Mỗi dự án chọn được 1 thư mục: vào dự án thì Vico mở thư mục đó (cây file, terminal, Agent làm việc trong đó)
     và tự lưu file AI viết vào thư mục (tắt được). AI làm việc của dự án chọn trong khung dự án (app.js: p.model).
     ========================================================= */
  const fChip = document.createElement("button");
  fChip.className = "folder-chip";
  fChip.id = "folderChip";
  fChip.type = "button";
  $("#projectChip").after(fChip);
  function renderFolderChip() {
    const p = currentProject();
    const linked = p && p.folder;
    fChip.hidden = root.classList.contains("group-on") || (!folder && !p);
    fChip.classList.toggle("empty", !folder);
    fChip.innerHTML = `${SVG(I.folder, 15)}<span>${esc(folder ? folder.name : "Chọn thư mục lưu dự án")}</span>` +
      (linked && p.autoSave !== false && folder && folder.root === p.folder.root ? `<i class="fc-auto" title="Tự lưu file AI tạo">tự lưu</i>` : "");
    fChip.title = folder ? `Thư mục đang mở: ${folder.root}${linked ? `\nGắn với dự án "${p.name}"` : ""}\nBấm để xem cây thư mục và terminal` : "Chọn thư mục để AI làm việc và lưu file của dự án";
  }
  fChip.onclick = async () => {
    const p = currentProject();
    if (!folder && p) return linkProjectFolder(p);
    if (!folder) return openFolder();
    setWs(true); showPc();
  };
  async function linkProjectFolder(p) {
    const f = await D.pickFolder();
    if (!f) return;
    p.folder = { root: f.root, name: f.name };
    if (p.autoSave == null) p.autoSave = true;
    saveKey(uk("vico_projects"), projects);
    try { await openFolderPath(f.root, true); } catch (err) { return showToast(cleanErr(err), "warn"); }
    showToast(`Đã gắn thư mục "${f.name}" cho dự án "${p.name}". File AI viết sẽ được lưu vào đây.`, "success");
  }

  // Ô chọn thư mục trong khung tạo / sửa dự án
  const pf = document.createElement("div");
  pf.className = "proj-folder";
  pf.innerHTML = `<div class="pf-head"><span>Thư mục lưu dự án <em class="optional">(bản desktop)</em></span></div>
    <div class="pf-row"><span class="pf-path" id="pfPath"></span>
      <button type="button" class="btn-ghost sm" id="pfPick">Chọn thư mục</button>
      <button type="button" class="btn-ghost sm" id="pfClear" hidden>Bỏ</button></div>
    <label class="pf-auto"><input type="checkbox" id="pfAuto" checked /> Tự lưu file AI tạo vào thư mục này (ghi đè được hoàn tác trong Agent)</label>`;
  $("#projectForm .proj-docs").before(pf);
  let pfDraft = null; // { root, name } | null
  function paintPf() {
    $("#pfPath").textContent = pfDraft ? pfDraft.root : "Chưa chọn: AI chỉ gửi file trong khung chat";
    $("#pfPath").classList.toggle("none", !pfDraft);
    $("#pfClear").hidden = !pfDraft;
    $("#pfAuto").disabled = !pfDraft;
  }
  const dkOpenProjectModal = openProjectModal;
  openProjectModal = (p = null) => {
    dkOpenProjectModal(p);
    pfDraft = p && p.folder ? { ...p.folder } : null;
    $("#pfAuto").checked = !p || p.autoSave !== false;
    paintPf();
  };
  $("#pfPick").onclick = async () => { const f = await D.pickFolder(); if (f) { pfDraft = f; paintPf(); } };
  $("#pfClear").onclick = () => { pfDraft = null; paintPf(); };
  window.onProjectSave = (p) => {
    const before = p.folder && p.folder.root;
    p.folder = pfDraft ? { root: pfDraft.root, name: pfDraft.name } : null;
    p.autoSave = $("#pfAuto").checked;
    if (p.id === currentProjectId && p.folder && p.folder.root !== before) setTimeout(() => onProjectEnter(p), 0);
  };
  // Vào dự án có thư mục: mở thư mục đó
  window.onProjectEnter = async (p) => {
    renderFolderChip();
    if (!p || !p.folder || (folder && folder.root === p.folder.root)) return;
    try {
      await openFolderPath(p.folder.root, false);
    } catch (err) {
      showToast(`Không mở được thư mục của dự án "${p.name}": ${cleanErr(err)}. Chọn lại trong Sửa dự án.`, "warn");
    }
  };
  addEventListener("vico-model", renderFolderChip);
  new MutationObserver(renderFolderChip).observe(root, { attributes: true, attributeFilter: ["class"] });
  setTimeout(() => window.onProjectEnter(currentProject()), 0);

  /* Tự lưu file AI viết vào thư mục dự án: chỉ file mới / bản mới sau khi mở đoạn chat (không ghi lại file cũ khi mở chat cũ) */
  function autoSaveFiles(files, reset) {
    const autoBase = (autoSaveFiles.base ||= new Map()); // tên file -> nội dung đã lưu hoặc đã có lúc mở đoạn chat
    const latest = (f) => f.versions[f.versions.length - 1];
    if (reset) { autoBase.clear(); files.forEach((f) => autoBase.set(f.name, latest(f).content)); return; }
    const p = currentProject();
    if (!p || !p.folder || p.autoSave === false || !folder || folder.root !== p.folder.root) return;
    for (const f of files) {
      const v = latest(f);
      if (!v || v.streaming || v.by !== "ai" || autoBase.get(f.name) === v.content) continue;
      autoBase.set(f.name, v.content);
      const dir = folder.name;
      D.agentWrite(f.name, v.content)
        .then((r) => { renderTree(); showToast(`${r.created ? "Đã lưu" : "Đã cập nhật"} ${f.name} trong thư mục ${dir}.`, "success"); })
        .catch((err) => showToast(`Không lưu được ${f.name}: ${cleanErr(err)}`, "warn"));
    }
  }

  /* =========================================================
     Ô CHỌN MODEL: model dùng API key của bạn (OpenAI / Anthropic)
     ========================================================= */
  const kd = document.createElement("div");
  kd.className = "modal";
  kd.id = "keyModal";
  kd.hidden = true;
  kd.innerHTML = `<div class="modal-card key-card" role="dialog" aria-modal="true">
      <div class="modal-head"><div><h3 id="kdTitle">Nhập API key</h3><p id="kdSub"></p></div>
        <button class="icon-btn modal-x" id="kdClose" title="Đóng">${SVG('<path d="M6 6l12 12M18 6L6 18"/>', 18)}</button></div>
      <form class="modal-form" id="kdForm">
        <label><span>API key</span><input id="kdKey" type="password" autocomplete="off" spellcheck="false" required /></label>
        <small class="kd-hint">Key được kiểm tra rồi lưu mã hoá trên máy này (Windows), giao diện không đọc lại được. Model dùng key của bạn không tốn credit Vico.</small>
        <p class="kd-err" id="kdErr"></p>
        <div class="modal-actions"><a class="btn-ghost" id="kdGet" target="_blank" rel="noopener">Lấy key</a><button class="btn-primary" id="kdSave" type="submit">Kiểm tra & lưu</button></div>
      </form></div>`;
  document.body.appendChild(kd);
  let kdResolve = null;
  function askKey(provider) {
    const P = VICO_PROVIDERS[provider];
    $("#kdTitle").textContent = `API key ${P.name}`;
    $("#kdSub").textContent = `Cần key ${P.name} để dùng model này trong chat.`;
    $("#kdKey").value = ""; $("#kdKey").placeholder = P.keyHint || "";
    $("#kdErr").textContent = "";
    $("#kdGet").href = P.keyUrl || "#";
    kd.hidden = false;
    setTimeout(() => $("#kdKey").focus(), 30);
    return new Promise((r) => (kdResolve = r));
  }
  const closeKd = (ok) => { kd.hidden = true; if (kdResolve) { kdResolve(ok); kdResolve = null; } };
  $("#kdClose").onclick = () => closeKd(false);
  kd.addEventListener("mousedown", (e) => { if (e.target === kd) closeKd(false); });
  let kdProvider = null;
  $("#kdForm").onsubmit = async (e) => {
    e.preventDefault();
    const btn = $("#kdSave");
    btn.disabled = true; btn.textContent = "Đang kiểm tra…"; $("#kdErr").textContent = "";
    try {
      await D.saveKey(kdProvider, $("#kdKey").value.trim());
      await refreshKeys();
      showToast(`Đã lưu API key ${VICO_PROVIDERS[kdProvider].name}.`, "success");
      closeKd(true);
    } catch (err) { $("#kdErr").textContent = cleanErr(err); }
    btn.disabled = false; btn.textContent = "Kiểm tra & lưu";
  };

  // Hội thoại -> 1 prompt (API gọi qua tiến trình chính nhận system + prompt)
  async function transcriptOf(messages) {
    const parts = [];
    for (const m of messages.slice(-20)) {
      let text = m.content || "";
      if (m.attachments && m.attachments.length && typeof VicoAttach === "object") {
        const ps = await VicoAttach.toApiParts({ attachments: m.attachments }).catch(() => []);
        for (const x of ps) text += x.type === "text" ? `\n\n[File ${x.name}]\n${x.text}` : `\n\n(Đính kèm ${x.name}: chưa gửi được loại file này)`;
      }
      parts.push({ role: m.role, text });
    }
    if (parts.length === 1) return parts[0].text;
    const last = parts.pop();
    return "Lịch sử trò chuyện (để tham khảo):\n" + parts.map((x) => `${x.role === "user" ? "Người dùng" : "Trợ lý"}: ${x.text}`).join("\n\n") +
      `\n\nTin nhắn mới của người dùng (hãy trả lời tin này):\n${last.text}`;
  }
  registerModelSource(() => ["openai", "anthropic"].flatMap((prov) => {
    const P = VICO_PROVIDERS[prov], models = VICO_MODELS.filter((m) => m.provider === prov);
    if (!keyStatus[prov]) return [{ // chưa có key: 1 dòng để nhập key, nhập xong các model hiện ra
      id: "addkey:" + prov, name: `Thêm API key ${P.name}…`, group: "API key của bạn", action: true,
      sub: `Dùng ${models.slice(0, 3).map((m) => m.name).join(", ")}… không tốn credit Vico`,
      onPick: async () => { kdProvider = prov; if (await askKey(prov)) { renderModelPicker(); $("#mpBtn").click(); } return false; },
    }];
    return models.map((md) => ({
      id: "key:" + md.id, name: md.name, group: `API key của bạn · ${P.name}`, sub: md.desc,
      engine: () => ({
        cost: 0, label: md.name,
        ask: async (messages, topicId, project, level, modeId, opts = {}) => {
          const reqId = uid();
          const abort = () => D.aiAbort && D.aiAbort(reqId);
          if (opts.signal) opts.signal.addEventListener("abort", abort, { once: true });
          try {
            const reply = await D.aiChat({ provider: md.provider, model: md.id, system: buildSystemPrompt(topicId, project, modeId, { local: true }), prompt: await transcriptOf(messages), effort: effortFor(md), reqId });
            if (opts.signal && opts.signal.aborted) throw new DOMException("Đã dừng", "AbortError");
            if (!opts.onDelta) return reply;
            for (const piece of String(reply).match(/\s*\S+/g) || []) { await sleepAbortable(8, opts.signal); opts.onDelta(piece); }
            return reply;
          } catch (err) {
            if ((opts.signal && opts.signal.aborted) || (err && err.name === "AbortError")) throw new DOMException("Đã dừng", "AbortError");
            throw new Error(cleanErr(err));
          } finally { if (opts.signal) opts.signal.removeEventListener("abort", abort); }
        },
      }),
    }));
  }));
  refreshKeys().then(renderModelPicker);
})();
