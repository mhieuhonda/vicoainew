/* =========================================================
   CODING IDE - Vico AI (G4 của Dự án 1)
   Môi trường lập trình trên web dựa trên Monaco Editor (vendor/monaco, MIT): Explorer, tab file, mở nhanh (Ctrl+P),
   tìm trong dự án (Ctrl+Shift+F), terminal, Git diff; AI chat chạy song song trong cùng dự án (do coding.js hiển thị).
   Mọi thao tác đi qua Vico Agent trên máy người dùng, trong thư mục đã cấp quyền.
   ========================================================= */
const VicoCodingIDE = (() => {
  const SVG = (p, s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const IC = {
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6l2 2.2h7.4A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    newFile: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>',
    newDir: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6l2 2.2h7.4A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><path d="M12 11v6M9 14h6"/>',
    refresh: '<path d="M4 4v6h6"/><path d="M5.5 15a7 7 0 1 0 1.6-7.4L4 10"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  };
  const esc = (s) => escapeHtml(String(s ?? ""));
  let ctx = null;           // { agent, base, token, project }
  let el = null;            // khung IDE
  let tabs = [];            // { path, model, saved, dirty, view }
  let active = null;
  let editor = null, diffEditor = null;
  let expanded = new Set([""]);
  let selectedDir = "";
  let files = null;         // danh sách file cho mở nhanh
  let term = { ctrl: null, history: [], hi: 0 };
  let bottom = "terminal";
  let monacoReady = null;
  let lastDeleted = null;   // { path, cp }: hiện "Hoàn tác" ở đầu Explorer

  /* ---------- Monaco: tải khi mở IDE lần đầu ---------- */
  function loadMonaco() {
    if (monacoReady) return monacoReady;
    monacoReady = new Promise((resolve, reject) => {
      const base = new URL("vendor/monaco/", location.href).href;
      // bản AMD tự tạo worker (blob + importScripts vs/assets/*.worker-*.js), cần CSP worker-src 'self' blob:
      const s = document.createElement("script");
      s.src = base + "vs/loader.js";
      s.onload = () => {
        window.require.config({ paths: { vs: base + "vs" } });
        window.require(["vs/editor/editor.main"], () => resolve(window.monaco), reject);
      };
      s.onerror = () => reject(new Error("Không tải được trình soạn thảo"));
      document.head.appendChild(s);
    });
    return monacoReady;
  }
  const theme = () => (document.documentElement.dataset.theme === "dark" ? "vs-dark" : "vs");

  /* ---------- Khung ---------- */
  async function mount(container, c) {
    ctx = c;
    el = container;
    tabs = [];
    active = null;
    files = null;
    expanded = new Set([""]);
    el.innerHTML = `
      <div class="ide">
        <aside class="ide-explorer">
          <div class="ide-bar"><b>Explorer</b><span class="ide-spacer"></span>
            <button data-ide="quick" title="Mở nhanh (Ctrl+P)">${SVG(IC.search)}</button>
            <button data-ide="new-file" title="File mới">${SVG(IC.newFile)}</button>
            <button data-ide="new-dir" title="Thư mục mới">${SVG(IC.newDir)}</button>
            <button data-ide="refresh" title="Làm mới">${SVG(IC.refresh)}</button></div>
          <div class="ide-tree" id="ideTree"></div>
          <details class="ide-find"><summary>Tìm trong dự án</summary>
            <form data-ide-form="search"><input name="q" placeholder="Từ khoá (Ctrl+Shift+F)" autocomplete="off" /></form>
            <div class="ide-results" id="ideResults"></div>
          </details>
        </aside>
        <section class="ide-center">
          <div class="ide-tabs" id="ideTabs"></div>
          <div class="ide-notice" id="ideNotice" hidden></div>
          <div class="ide-editor" id="ideEditor"><div class="ide-placeholder">Đang tải trình soạn thảo…</div></div>
          <div class="ide-panel">
            <div class="ide-panel-tabs"><button data-ide="panel" data-p="terminal" class="${bottom === "terminal" ? "on" : ""}">Terminal</button><button data-ide="panel" data-p="git" class="${bottom === "git" ? "on" : ""}">Git</button></div>
            <div class="ide-panel-body" id="idePanel"></div>
          </div>
        </section>
      </div>
      <div class="ide-quick" id="ideQuick" hidden><div class="ide-quick-box"><input id="ideQuickInput" placeholder="Gõ tên file…" autocomplete="off" /><div id="ideQuickList"></div></div></div>`;
    renderTree();
    renderPanel();
    try {
      const monaco = await loadMonaco();
      if (!el) return;
      document.getElementById("ideEditor").innerHTML = "";
      editor = monaco.editor.create(document.getElementById("ideEditor"), { model: null, theme: theme(), automaticLayout: true, fontSize: 13.5, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 2 });
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => save());
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => quickOpen());
      editor.onDidChangeModelContent(() => {
        const t = tabs.find((x) => x.path === active && !x.diff);
        if (t && !activeDiff) { const d = t.model.getValue() !== t.saved; if (d !== t.dirty) { t.dirty = d; renderTabs(); } }
      });
      showEmpty();
    } catch (e) {
      const box = document.getElementById("ideEditor");
      if (box) box.innerHTML = `<div class="ide-placeholder">${esc(e.message)}</div>`;
    }
  }

  function unmount() {
    term.ctrl?.abort();
    tabs.forEach((t) => t.model?.dispose());
    editor?.dispose();
    diffEditor?.dispose();
    editor = diffEditor = null;
    tabs = [];
    el = null;
  }

  function showEmpty() {
    if (!editor) return;
    if (!active) {
      editor.setModel(null);
      document.getElementById("ideEditor").dataset.empty = "1";
    } else delete document.getElementById("ideEditor").dataset.empty;
  }

  /* ---------- Explorer ---------- */
  async function listDir(dir) {
    const { items } = await ctx.agent(`/projects/${ctx.project.id}/tree?path=${encodeURIComponent(dir || ".")}`);
    return items;
  }
  async function renderTree() {
    const box = document.getElementById("ideTree");
    if (!box) return;
    const build = async (dir, depth) => {
      let items;
      try { items = await listDir(dir); } catch (e) { return `<div class="ide-err">${esc(e.message)}</div>`; }
      const parts = [];
      for (const it of items) {
        const pad = `style="padding-left:${8 + depth * 14}px"`;
        if (it.dir) {
          const open = expanded.has(it.path);
          parts.push(`<div class="ide-node dir${selectedDir === it.path ? " sel" : ""}" data-ide="toggle" data-path="${esc(it.path)}" ${pad}><span class="ide-chev${open ? " open" : ""}">${SVG(IC.chev, 12)}</span>${SVG(IC.folder, 15)}<span>${esc(it.name)}</span>${actions(it.path)}</div>`);
          if (open) parts.push(await build(it.path, depth + 1));
        } else {
          parts.push(`<div class="ide-node file${active === it.path ? " sel" : ""}" data-ide="open" data-path="${esc(it.path)}" ${pad}><span class="ide-chev"></span>${SVG(IC.file, 15)}<span>${esc(it.name)}</span>${actions(it.path)}</div>`);
        }
      }
      return parts.join("") || (depth === 0 ? '<div class="ide-muted">Thư mục trống</div>' : "");
    };
    const undo = lastDeleted ? `<div class="ide-undo">Đã xoá ${esc(lastDeleted.path)} <button data-ide="undo-delete">Hoàn tác</button></div>` : "";
    box.innerHTML = undo + (await build("", 0));
  }
  const actions = (p) => `<span class="ide-acts"><button data-ide="rename" data-path="${esc(p)}" title="Đổi tên">${SVG(IC.edit, 13)}</button><button data-ide="delete" data-path="${esc(p)}" title="Xoá">${SVG(IC.trash, 13)}</button></span>`;

  /* ---------- Tab + soạn thảo ---------- */
  async function openFile(path, line) {
    let t = tabs.find((x) => x.path === path && !x.diff);
    if (!t) {
      let r;
      try { r = await ctx.agent(`/projects/${ctx.project.id}/file?path=${encodeURIComponent(path)}`); } catch (e) { return showToast(e.message, "error"); }
      if (r.binary) return showToast("File nhị phân, không mở trong trình soạn thảo", "error");
      const monaco = await loadMonaco();
      const uri = monaco.Uri.parse(`file:///${ctx.project.id}/${path}`);
      const model = monaco.editor.getModel(uri) || monaco.editor.createModel(r.content, undefined, uri);
      t = { path, model, saved: r.content, dirty: false };
      tabs.push(t);
    }
    activate(t.path, false);
    if (line && editor) { editor.revealLineInCenter(line); editor.setPosition({ lineNumber: line, column: 1 }); editor.focus(); }
  }
  function activate(path, diff) {
    const t = tabs.find((x) => x.path === path && !!x.diff === !!diff);
    if (!t) return;
    const box = document.getElementById("ideEditor");
    if (t.diff) {
      const n = editor?.getDomNode();
      if (n) n.style.display = "none";
      diffEditor?.dispose();
      const holder = document.createElement("div");
      holder.className = "ide-diff-holder";
      box.querySelector(".ide-diff-holder")?.remove();
      box.appendChild(holder);
      diffEditor = window.monaco.editor.createDiffEditor(holder, { theme: theme(), automaticLayout: true, readOnly: true, renderSideBySide: box.clientWidth > 900, minimap: { enabled: false } });
      diffEditor.setModel({ original: t.diff.original, modified: t.diff.modified });
    } else {
      box.querySelector(".ide-diff-holder")?.remove();
      diffEditor?.dispose(); diffEditor = null;
      // Monaco chỉ dựng DOM của editor khi đã gắn model, nên gắn model trước rồi mới hiện lại
      if (editor) { editor.setModel(t.model); const n = editor.getDomNode(); if (n) n.style.display = ""; if (t.view) editor.restoreViewState(t.view); editor.focus(); }
    }
    active = path;
    activeDiff = !!diff;
    document.getElementById("ideNotice").hidden = !t.conflict;
    if (t.conflict) renderConflict(t);
    renderTabs();
    showEmpty();
    document.querySelectorAll(".ide-node.file").forEach((n) => n.classList.toggle("sel", n.dataset.path === path));
  }
  let activeDiff = false;
  function renderTabs() {
    const box = document.getElementById("ideTabs");
    if (!box) return;
    box.innerHTML = tabs.map((t) => `<div class="ide-tab${t.path === active && !!t.diff === activeDiff ? " on" : ""}" data-ide="tab" data-path="${esc(t.path)}" data-diff="${t.diff ? 1 : 0}" title="${esc(t.path)}">
      <span>${esc(t.path.split("/").pop())}${t.diff ? " (diff)" : ""}</span>${t.dirty ? '<i class="ide-dirty" title="Chưa lưu"></i>' : ""}
      <button data-ide="close" data-path="${esc(t.path)}" data-diff="${t.diff ? 1 : 0}" title="Đóng">${SVG(IC.x, 12)}</button></div>`).join("");
  }
  function closeTab(path, diff) {
    const i = tabs.findIndex((x) => x.path === path && !!x.diff === diff);
    if (i < 0) return;
    const t = tabs[i];
    if (t.dirty && !confirm(`${path} chưa lưu. Đóng và bỏ thay đổi?`)) return;
    if (t.diff) { t.diff.original.dispose(); t.diff.modified.dispose(); } else t.model.dispose();
    tabs.splice(i, 1);
    if (active === path && activeDiff === diff) {
      const next = tabs[Math.min(i, tabs.length - 1)];
      active = null;
      if (next) activate(next.path, !!next.diff);
      else { document.getElementById("ideEditor").querySelector(".ide-diff-holder")?.remove(); diffEditor?.dispose(); diffEditor = null; const n = editor?.getDomNode(); if (n) n.style.display = ""; showEmpty(); renderTabs(); }
    } else renderTabs();
  }
  async function save() {
    const t = tabs.find((x) => x.path === active && !x.diff);
    if (!t) return;
    const content = t.model.getValue();
    try {
      const r = await ctx.agent(`/projects/${ctx.project.id}/file`, { method: "PUT", body: { path: t.path, content } });
      t.saved = content; t.dirty = false; t.conflict = false;
      document.getElementById("ideNotice").hidden = true;
      renderTabs();
      showToast(`Đã lưu ${t.path} (+${r.added} -${r.removed})`);
    } catch (e) { showToast(e.message, "error"); }
  }

  /** AI vừa sửa / tạo / xoá file: cập nhật editor, explorer (V-048) */
  let refreshTimer = null;
  function refreshSoon() {
    // gộp nhiều sự kiện liền nhau (AI sửa nhiều file, phát lại lịch sử phiên) thành một lần đọc lại
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { if (!el) return; files = null; renderTree(); if (bottom === "git") renderGit(); }, 250);
  }
  async function fileChanged(path) {
    if (!el) return;
    refreshSoon();
    const t = tabs.find((x) => x.path === path && !x.diff);
    if (!t) return;
    let r;
    try { r = await ctx.agent(`/projects/${ctx.project.id}/file?path=${encodeURIComponent(path)}`); } catch { r = null; }
    if (!r) { t.conflict = "deleted"; if (active === path) activate(path, false); return; }
    if (r.content === t.model.getValue()) { t.saved = r.content; t.dirty = false; renderTabs(); return; }
    if (!t.dirty) {
      const view = active === path && editor ? editor.saveViewState() : null;
      t.model.pushEditOperations([], [{ range: t.model.getFullModelRange(), text: r.content }], () => null);
      t.saved = r.content;
      if (view && editor) editor.restoreViewState(view);
    } else {
      t.conflict = "changed";
      t.incoming = r.content;
      if (active === path) activate(path, false);
    }
  }
  function renderConflict(t) {
    const n = document.getElementById("ideNotice");
    n.innerHTML = t.conflict === "deleted"
      ? `File này vừa bị xoá trên đĩa. <button data-ide="close" data-path="${esc(t.path)}" data-diff="0">Đóng tab</button>`
      : `AI vừa sửa file này trong khi bạn có thay đổi chưa lưu. <button data-ide="take-disk">Dùng bản trên đĩa</button> <button data-ide="keep-mine">Giữ bản của tôi</button>`;
  }

  /* ---------- Mở nhanh ---------- */
  async function quickOpen() {
    const box = document.getElementById("ideQuick");
    if (!box) return;
    box.hidden = false;
    const input = document.getElementById("ideQuickInput");
    input.value = "";
    input.focus();
    if (!files) { try { ({ files } = await ctx.agent(`/projects/${ctx.project.id}/files`)); } catch (e) { files = []; showToast(e.message, "error"); } }
    renderQuick();
  }
  function renderQuick() {
    const q = document.getElementById("ideQuickInput").value.toLowerCase();
    const list = (files || []).filter((f) => f.toLowerCase().includes(q)).slice(0, 60);
    document.getElementById("ideQuickList").innerHTML = list.map((f, i) => `<button class="ide-q${i === 0 ? " on" : ""}" data-ide="quick-pick" data-path="${esc(f)}"><b>${esc(f.split("/").pop())}</b> <span>${esc(f)}</span></button>`).join("") || '<div class="ide-muted">Không có file khớp</div>';
  }

  /* ---------- Terminal + Git ---------- */
  function renderPanel() {
    const box = document.getElementById("idePanel");
    if (!box) return;
    document.querySelectorAll(".ide-panel-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.p === bottom));
    if (bottom === "terminal") {
      box.innerHTML = `<pre class="ide-term" id="ideTerm">${esc(term.out || "Lệnh chạy trong thư mục dự án (không tương tác). Gõ lệnh rồi Enter.\n")}</pre>
        <form class="ide-term-in" data-ide-form="term"><span>&gt;</span><input name="cmd" autocomplete="off" spellcheck="false" placeholder="vd npm test" /><button type="button" data-ide="term-stop" ${term.ctrl ? "" : "hidden"}>Dừng</button></form>`;
      const t = document.getElementById("ideTerm"); t.scrollTop = t.scrollHeight;
    } else renderGit();
  }
  function termWrite(text) {
    term.out = ((term.out || "") + text).slice(-200000);
    const t = document.getElementById("ideTerm");
    if (t) { t.textContent = term.out; t.scrollTop = t.scrollHeight; }
  }
  async function runCommand(cmd) {
    if (term.ctrl) return showToast("Đang chạy một lệnh, dừng lệnh đó trước", "error");
    term.history.push(cmd); term.hi = term.history.length;
    termWrite(`\n> ${cmd}\n`);
    const ctrl = new AbortController();
    term.ctrl = ctrl;
    renderPanelButtons();
    try {
      const r = await fetch(`${ctx.base()}/projects/${ctx.project.id}/exec`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + ctx.token() }, body: JSON.stringify({ command: cmd }), signal: ctrl.signal });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Lỗi ${r.status}`);
      const reader = r.body.getReader(), dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const data = buf.slice(0, i).split("\n").filter((x) => x.startsWith("data:")).map((x) => x.slice(5).trim()).join("");
          buf = buf.slice(i + 2);
          if (!data) continue;
          const ev = JSON.parse(data);
          if (ev.type === "out") termWrite(ev.text);
          else if (ev.type === "exit") termWrite(`[mã thoát ${ev.code}]\n`);
        }
      }
    } catch (e) {
      termWrite(ctrl.signal.aborted ? "[đã dừng]\n" : `[lỗi] ${e.message}\n`);
    }
    term.ctrl = null;
    renderPanelButtons();
    files = null;
    renderTree();
  }
  function renderPanelButtons() { const b = document.querySelector("[data-ide=term-stop]"); if (b) b.hidden = !term.ctrl; }

  async function renderGit() {
    const box = document.getElementById("idePanel");
    box.innerHTML = '<div class="ide-muted">Đang đọc trạng thái Git…</div>';
    let g;
    try { g = await ctx.agent(`/projects/${ctx.project.id}/git`); } catch (e) { box.innerHTML = `<div class="ide-err">${esc(e.message)}</div>`; return; }
    if (!g.repo) { box.innerHTML = '<div class="ide-muted">Thư mục chưa là kho Git. Chạy <code>git init</code> trong Terminal để bật lịch sử thay đổi.</div>'; return; }
    const label = { M: "Sửa", A: "Thêm", D: "Xoá", R: "Đổi tên", "??": "Mới" };
    box.innerHTML = `<div class="ide-git-head"><b>${esc(g.branch)}</b> <span class="ide-muted">${g.files.length ? `${g.files.length} file thay đổi` : "Không có thay đổi"}</span><button data-ide="git-refresh" title="Làm mới">${SVG(IC.refresh, 14)}</button></div>
      <div class="ide-git-list">${g.files.map((f) => `<button class="ide-git-file" data-ide="git-diff" data-path="${esc(f.path)}"><span class="ide-st st-${esc(f.status.replace("??", "N"))}">${esc(label[f.status] || label[f.status[0]] || f.status)}</span><span>${esc(f.path)}</span></button>`).join("")}</div>
      <p class="ide-muted ide-small">Commit / đẩy mã: nhờ AI (commit cần bạn duyệt) hoặc gõ lệnh git trong Terminal.</p>`;
  }
  async function openDiff(path) {
    const monaco = await loadMonaco();
    let orig, cur;
    try {
      orig = await ctx.agent(`/projects/${ctx.project.id}/git/original?path=${encodeURIComponent(path)}`);
      cur = await ctx.agent(`/projects/${ctx.project.id}/file?path=${encodeURIComponent(path)}`).catch(() => ({ content: "" }));
    } catch (e) { return showToast(e.message, "error"); }
    const old = tabs.find((x) => x.path === path && x.diff);
    if (old) { old.diff.original.dispose(); old.diff.modified.dispose(); tabs.splice(tabs.indexOf(old), 1); }
    const lang = monaco.editor.createModel("", undefined, monaco.Uri.parse(`file:///tmp/${path}`)).getLanguageId();
    monaco.editor.getModel(monaco.Uri.parse(`file:///tmp/${path}`))?.dispose();
    const t = { path, diff: { original: monaco.editor.createModel(orig.content || "", lang), modified: monaco.editor.createModel(cur.content || "", lang) } };
    tabs.push(t);
    activate(path, true);
  }

  /* ---------- Sự kiện giao diện ---------- */
  document.addEventListener("click", async (e) => {
    if (!el || !el.contains(e.target) && !e.target.closest("#ideQuick")) return;
    const b = e.target.closest("[data-ide]");
    if (!b) { if (e.target.id === "ideQuick") document.getElementById("ideQuick").hidden = true; return; }
    const a = b.dataset.ide, p = b.dataset.path;
    e.stopPropagation();
    try {
      if (a === "open") { await openFile(p); }
      else if (a === "toggle") { selectedDir = p; expanded.has(p) ? expanded.delete(p) : expanded.add(p); renderTree(); }
      else if (a === "tab") { const tab = !activeDiff && tabs.find((x) => x.path === active && !x.diff); if (tab && editor) tab.view = editor.saveViewState(); activate(p, b.dataset.diff === "1"); }
      else if (a === "close") { closeTab(p, b.dataset.diff === "1"); }
      else if (a === "refresh") { files = null; renderTree(); }
      else if (a === "new-file" || a === "new-dir") {
        const name = prompt(a === "new-file" ? `Tên file mới${selectedDir ? ` trong ${selectedDir}/` : ""}` : `Tên thư mục mới${selectedDir ? ` trong ${selectedDir}/` : ""}`);
        if (!name) return;
        const path = (selectedDir ? selectedDir + "/" : "") + name.trim();
        await ctx.agent(`/projects/${ctx.project.id}/fs`, { method: "POST", body: { op: a === "new-file" ? "new_file" : "mkdir", path } });
        if (selectedDir) expanded.add(selectedDir);
        files = null; await renderTree();
        if (a === "new-file") openFile(path);
      }
      else if (a === "rename") {
        const to = prompt("Tên / đường dẫn mới", p);
        if (!to || to === p) return;
        const r = await ctx.agent(`/projects/${ctx.project.id}/fs`, { method: "POST", body: { op: "rename", path: p, to } });
        tabs.filter((t) => t.path === p && !t.diff).forEach((t) => closeTab(t.path, false));
        files = null; await renderTree();
        showToast(`Đã đổi tên thành ${r.path}`);
      }
      else if (a === "delete") {
        if (!confirm(`Xoá ${p}? Có thể hoàn tác ngay sau khi xoá.`)) return;
        const r = await ctx.agent(`/projects/${ctx.project.id}/fs`, { method: "POST", body: { op: "delete", path: p } });
        tabs.filter((t) => t.path === p).forEach((t) => { t.dirty = false; closeTab(t.path, !!t.diff); });
        files = null; await renderTree();
        lastDeleted = r.checkpoint ? { path: p, cp: r.checkpoint } : null;
        renderTree();
      }
      else if (a === "undo-delete" && lastDeleted) { await ctx.agent(`/checkpoints/${lastDeleted.cp}/undo`, { method: "POST" }); showToast(`Đã khôi phục ${lastDeleted.path}`); lastDeleted = null; files = null; renderTree(); }
      else if (a === "quick") quickOpen();
      else if (a === "quick-pick") { document.getElementById("ideQuick").hidden = true; openFile(p); }
      else if (a === "panel") { bottom = b.dataset.p; renderPanel(); }
      else if (a === "term-stop") term.ctrl?.abort();
      else if (a === "git-refresh") renderGit();
      else if (a === "git-diff") openDiff(p);
      else if (a === "take-disk") { const t = tabs.find((x) => x.path === active && !x.diff); if (t) { t.model.setValue(t.incoming); t.saved = t.incoming; t.dirty = false; t.conflict = false; document.getElementById("ideNotice").hidden = true; renderTabs(); } }
      else if (a === "keep-mine") { const t = tabs.find((x) => x.path === active && !x.diff); if (t) { t.conflict = false; document.getElementById("ideNotice").hidden = true; } }
    } catch (err) { showToast(err.message, "error"); }
  }, true);

  document.addEventListener("submit", (e) => {
    if (!el) return;
    const f = e.target.closest("[data-ide-form]");
    if (!f) return;
    e.preventDefault();
    if (f.dataset.ideForm === "term") { const v = f.cmd.value.trim(); if (v) { f.cmd.value = ""; runCommand(v); } }
    else if (f.dataset.ideForm === "search") {
      const q = f.q.value.trim();
      const box = document.getElementById("ideResults");
      if (!q) return (box.innerHTML = "");
      box.innerHTML = '<div class="ide-muted">Đang tìm…</div>';
      ctx.agent(`/projects/${ctx.project.id}/search?q=${encodeURIComponent(q)}`).then(({ matches }) => {
        box.innerHTML = matches.length ? matches.map((m) => `<button class="ide-hit" data-ide-hit="${esc(m.path)}" data-line="${m.line}"><b>${esc(m.path)}:${m.line}</b><span>${esc(m.text)}</span></button>`).join("") : '<div class="ide-muted">Không có kết quả</div>';
      }).catch((err) => (box.innerHTML = `<div class="ide-err">${esc(err.message)}</div>`));
    }
  }, true);
  document.addEventListener("click", (e) => { const h = e.target.closest("[data-ide-hit]"); if (h && el) openFile(h.dataset.ideHit, Number(h.dataset.line)); });
  document.addEventListener("input", (e) => { if (e.target.id === "ideQuickInput") renderQuick(); });
  document.addEventListener("keydown", (e) => {
    if (!el) return;
    if (e.target.id === "ideQuickInput") {
      if (e.key === "Escape") document.getElementById("ideQuick").hidden = true;
      if (e.key === "Enter") { const first = document.querySelector(".ide-q"); if (first) { document.getElementById("ideQuick").hidden = true; openFile(first.dataset.path); } }
      return;
    }
    if (e.target.closest?.(".ide-term-in") && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      term.hi = Math.max(0, Math.min(term.history.length, term.hi + (e.key === "ArrowUp" ? -1 : 1)));
      e.target.value = term.history[term.hi] || "";
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p" && !e.shiftKey) { e.preventDefault(); quickOpen(); }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") { e.preventDefault(); const d = el.querySelector(".ide-find"); d.open = true; d.querySelector("input").focus(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !editor?.hasTextFocus()) { e.preventDefault(); save(); }
  });
  // đổi giao diện sáng / tối của Vico thì đổi theme editor
  new MutationObserver(() => window.monaco?.editor.setTheme(theme())).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  return { mount, unmount, fileChanged, hasDirty: () => tabs.some((t) => t.dirty) };
})();
