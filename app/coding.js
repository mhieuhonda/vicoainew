/* =========================================================
   CODING - Vico AI (chế độ Coding dạng chat, G3 của Dự án 1)
   Giao việc lập trình cho AI trong thư mục bạn cấp quyền. AI chạy trong Vico Agent trên máy bạn
   (vico-agent, http://127.0.0.1:7878): đọc / sửa / tạo file, chạy lệnh, Git thật; mỗi thay đổi có diff và hoàn tác.
   Trang chỉ hiển thị sự kiện thật từ Agent, không có dữ liệu mô phỏng.
   ========================================================= */
const VicoCoding = (() => {
  const root = document.documentElement;
  const SVG = (p, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const IC = {
    code: '<path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6l2 2.2h7.4A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none"/>',
    send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    retry: '<path d="M4 4v6h6"/><path d="M5.5 15a7 7 0 1 0 1.6-7.4L4 10"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    term: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M7 9.5l3 2.5-3 2.5M12.5 15h4"/>',
    pause: '<path d="M9 6v12M15 6v12"/>',
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    merge: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 8v8M8 6.5c5 0 8 2 8.2 3.6"/>',
    chat: '<path d="M5 18.5V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8.5z"/>',
    loop: '<path d="M17 2.5 20 5.5l-3 3"/><path d="M4 11.5V10a4.5 4.5 0 0 1 4.5-4.5H20"/><path d="M7 21.5 4 18.5l3-3"/><path d="M20 12.5V14a4.5 4.5 0 0 1-4.5 4.5H4"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  };
  const esc = (s) => escapeHtml(String(s ?? ""));
  const LABEL = { Analyzed: "Xem cấu trúc", Reading: "Đọc", Searching: "Tìm", Writing: "Tạo / ghi", Editing: "Sửa", Deleting: "Xoá", Running: "Chạy lệnh", Git: "Git", Delegating: "Giao việc", Agents: "Xem agent", Waiting: "Chờ agent", Messaging: "Nhắn agent", Merging: "Gộp", Discarding: "Bỏ agent", Reporting: "Báo cáo vòng", Finishing: "Kết thúc", Proposing: "Đề xuất", WebSearch: "Tìm trên web", Fetching: "Đọc trang web", Browser: "Trình duyệt", MCP: "MCP" };
  const AUTO_STATUS = { done: "Đã đạt mọi tiêu chí", blocked: "Dừng vì bị chặn", limit: "Dừng vì chạm giới hạn", stalled: "Dừng vì không tiến triển", cancelled: "Bạn đã dừng", revoked: "Đã tắt Tự phát triển", failed: "Lỗi" };
  const AG_STATUS = { running: "Đang chạy", paused: "Tạm dừng", done: "Xong", failed: "Lỗi", cancelled: "Đã dừng", limit: "Chạm giới hạn", revoked: "Đã thu hồi" };
  const AG_COLORS = ["#7c5cff", "#0e9bd8", "#e08a00", "#10a37f", "#e5484d", "#d6409f", "#0f9f95", "#8e4ec6"];
  const REASON = { low: "thấp", medium: "vừa", high: "cao" };
  const COMMANDS = { ask: "Hỏi trước mỗi lệnh", safe: "Tự chạy build / test, lệnh khác hỏi", auto: "Tự chạy mọi lệnh trừ lệnh nguy hiểm" };
  const EDITS = { auto: "Tự sửa file (luôn có diff và hoàn tác)", ask: "Hỏi trước mỗi lần sửa file" };

  let conn = { port: 7878, token: "", ...loadKey("vico_agent", {}) };
  let status = "idle";          // idle | checking | ok | error
  let statusMsg = "";
  let config = null;            // { providers, default_provider, default_model, search_url }
  let mcpServers = [];          // MCP server người dùng đăng ký
  let modelNames = loadKey("vico_coding_model_names", {}); // mã model của AI Vico -> tên hiển thị (nhóm AI trong Vico Admin)
  const modelLabel = (m) => modelNames[m] || m;
  const VICO_API = (typeof VICO_CONFIG !== "undefined" && VICO_CONFIG.apiUrl ? String(VICO_CONFIG.apiUrl) : "").replace(/\/+$/, "");
  let projects = [];
  let project = null;           // dự án đang mở
  let sessions = [];
  let session = null;           // phiên đang mở
  let running = null;           // run_id đang chạy
  let paused = false;           // lượt chạy đang tạm dừng
  let stream = null;            // AbortController của luồng sự kiện
  let lastSeq = 0;
  let view = "home";            // home | settings | project
  let mode = loadKey("vico_coding_mode", "chat");  // chat | ide

  /* ---------- Gọi Agent ---------- */
  const base = () => `http://127.0.0.1:${Number(conn.port) || 7878}`;
  async function agent(path, { method = "GET", body } = {}) {
    let r;
    try {
      r = await fetch(base() + path, { method, headers: { "content-type": "application/json", authorization: "Bearer " + conn.token }, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new Error("Không kết nối được Vico Agent trên máy bạn. Kiểm tra Vico Agent đang chạy và đúng cổng.");
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Vico Agent báo lỗi ${r.status}`);
    return data;
  }

  /* ---------- Nút ở thanh bên + trang ---------- */
  const btn = document.createElement("button");
  btn.className = "rail-btn coding-btn";
  btn.id = "codingBtn";
  btn.title = "Coding";
  btn.innerHTML = `${SVG(IC.code, 20)}<span class="lbl">Coding</span>`;
  $("#groupBtn").after(btn);
  const page = document.createElement("section");
  page.className = "cd-page";
  page.id = "cdPage";
  page.hidden = true;
  $(".main").appendChild(page);

  function open() {
    // đóng các trang toàn màn hình khác (Thuê máy chủ...)
    if (root.classList.contains("cl-open")) document.getElementById("cloudBtn")?.click();
    closePops();
    page.hidden = false;
    root.classList.add("cd-open");
    btn.classList.add("active");
    if (status !== "ok") connect(true);
    else render();
  }
  function close() {
    page.hidden = true;
    root.classList.remove("cd-open");
    btn.classList.remove("active");
  }
  btn.onclick = () => (page.hidden ? open() : close());
  const cdNewChat = newChat;
  newChat = () => { close(); cdNewChat(); };
  const cdOpenChat = openChat;
  openChat = (id) => { close(); cdOpenChat(id); };
  document.getElementById("cloudBtn")?.addEventListener("click", () => { if (!page.hidden) close(); }, true);

  async function connect(quiet) {
    // Bản desktop chạy kèm Vico Agent: lấy mã ghép cặp tự động, người dùng không phải dán
    if (window.vicoDesktop?.agentPair) {
      try {
        const p = await window.vicoDesktop.agentPair();
        if (p?.token && p.token !== conn.token) { conn = { port: p.port, token: p.token }; saveKey("vico_agent", conn); }
      } catch {}
    }
    if (!conn.token) { status = "idle"; render(); return; }
    status = "checking"; render();
    try {
      [config, { projects }, { servers: mcpServers }] = await Promise.all([agent("/config"), agent("/projects"), agent("/mcp").catch(() => ({ servers: [] }))]);
      status = "ok"; statusMsg = "";
      if (project) project = projects.find((p) => p.id === project.id) || null;
      if (!project && view === "project") view = "home";
      // mở lại dự án / phiên lần trước
      const last = loadKey("vico_coding_last", null);
      if (!project && last && projects.some((p) => p.id === last.project) && config.providers.length) {
        await openProject(last.project, last.session);
        return;
      }
    } catch (e) {
      status = "error"; statusMsg = e.message;
      if (!quiet) showToast(e.message, "error");
    }
    render();
  }

  /* ---------- Hiển thị ---------- */
  const head = (title, sub, back) => `
    <header class="cd-head">
      ${back ? `<button class="cd-back" data-act="back" title="Quay lại">${SVG(IC.back)}</button>` : ""}
      <div class="cd-head-text"><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>
      ${status === "ok" ? `<span class="cd-conn ok" title="${esc(base())}">Đã kết nối Vico Agent</span><button class="cd-icon" data-act="settings" title="Cài đặt Coding">${SVG(IC.gear)}</button>` : ""}
    </header>`;

  function render() {
    if (view !== "project" || !project) dropIde();
    if (status !== "ok") return renderPair();
    if (view === "settings" || !config.providers.length) return renderSettings();
    if (view === "project" && project) return renderProject();
    renderHome();
  }

  function renderPair() {
    page.innerHTML = `<div class="cd-inner cd-narrow">
      ${head("Coding", "Giao việc lập trình cho AI ngay trong thư mục dự án trên máy bạn.")}
      <section class="cd-card">
        <h3>Kết nối Vico Agent</h3>
        <p class="cd-muted">AI cần một chương trình nhỏ chạy trên máy bạn (Vico Agent) để đọc, sửa file và chạy lệnh thật. Agent chỉ làm việc trong thư mục bạn cấp quyền và chỉ nhận kết nối từ chính máy này.</p>
        <ol class="cd-steps">
          <li>Chạy <b>vico-agent</b> trên máy (bản desktop Vico AI sẽ tự chạy kèm).</li>
          <li>Sao chép <b>mã ghép cặp</b> hiện trong cửa sổ Vico Agent.</li>
          <li>Dán vào ô dưới đây.</li>
        </ol>
        <form class="cd-form" data-form="pair">
          <label class="cd-field"><span>Mã ghép cặp</span><input name="token" autocomplete="off" spellcheck="false" value="${esc(conn.token)}" placeholder="40 ký tự" required /></label>
          <label class="cd-field cd-port"><span>Cổng</span><input name="port" type="number" min="1024" max="65535" value="${esc(conn.port)}" /></label>
          <button class="cd-btn primary" ${status === "checking" ? "disabled" : ""}>${status === "checking" ? "Đang kết nối…" : "Kết nối"}</button>
        </form>
        ${status === "error" ? `<p class="cd-error">${esc(statusMsg)}</p>` : ""}
      </section>
    </div>`;
  }

  function renderSettings() {
    const p = config.providers.find((x) => x.id !== "vico") || null;
    const vico = config.providers.find((x) => x.id === "vico");
    const user = typeof VicoAuth !== "undefined" && VicoAuth.remote ? VicoAuth.current() : null;
    page.innerHTML = `<div class="cd-inner cd-narrow">
      ${head("Cài đặt Coding", "Model AI dùng cho Agent.", config.providers.length ? "home" : "")}
      ${VICO_API ? `<section class="cd-card cd-vico-ai">
        <h3>AI của Vico</h3>
        <p class="cd-muted">Dùng các model admin đã cấu hình trong Vico Admin (nhóm AI, điều hướng, dự phòng), không cần API key riêng. Mỗi lượt AI trả lời trừ credit tài khoản Vico như chat thường.</p>
        ${vico ? `<div class="cd-prov"><div><b>Đã kết nối</b><span class="cd-muted">${vico.models.length} lựa chọn model: ${vico.models.map((m) => esc(modelLabel(m))).join(", ")}</span></div>${config.default_provider === "vico" ? '<span class="cd-tag">Mặc định</span>' : ""}<button class="cd-link danger" data-act="vico-ai-off">Ngắt</button></div>` : ""}
        <div class="cd-row-btns">${user
          ? `<button class="cd-btn primary" data-act="vico-ai">${vico ? "Làm mới danh sách model" : "Dùng AI của Vico"}</button><span class="cd-muted cd-small">Tài khoản ${esc(user.username || user.email || "")}</span>`
          : `<button class="cd-btn primary" data-act="vico-login">Đăng nhập Vico để dùng</button>`}</div>
      </section>` : ""}
      <section class="cd-card">
        <h3>Nhà cung cấp AI khác</h3>
        <p class="cd-muted">Hoặc dùng API key riêng của nhà cung cấp chuẩn OpenAI có tool calling (vd Sàn Kiyo Router).</p>
        ${config.providers.filter((x) => x.id !== "vico").map((x) => `<div class="cd-prov"><div><b>${esc(x.name)}</b><span class="cd-muted cd-mono">${esc(x.base_url)}</span></div><span class="cd-muted">${x.has_key ? esc(x.key) : "chưa có key"}</span>${x.id === config.default_provider ? '<span class="cd-tag">Mặc định</span>' : ""}<button class="cd-link danger" data-act="del-prov" data-id="${esc(x.id)}">Xoá</button></div>`).join("")}
        <form class="cd-form cd-grid" data-form="provider">
          <label class="cd-field"><span>Tên</span><input name="name" value="${esc(p?.name || "Kiyo Router")}" required /></label>
          <label class="cd-field"><span>Địa chỉ API</span><input name="base_url" class="cd-mono" value="${esc(p?.base_url || "https://router.kiyo.vn/v1")}" required /></label>
          <label class="cd-field"><span>API key ${p?.has_key ? "(để trống để giữ key cũ)" : ""}</span><input name="api_key" type="password" autocomplete="off" /></label>
          <label class="cd-field"><span>Model mặc định</span><input name="model" class="cd-mono" list="cdModels" value="${esc(config.default_provider === "vico" ? (p?.models || [])[0] || "" : config.default_model || "")}" placeholder="mã model của nhà cung cấp (bấm Lấy danh sách model)" required /><datalist id="cdModels">${(p?.models || []).map((m) => `<option value="${esc(m)}">`).join("")}</datalist></label>
          <div class="cd-row-btns"><button type="button" class="cd-btn" data-act="load-models">Lấy danh sách model</button><button class="cd-btn primary">Lưu nhà cung cấp</button></div>
        </form>
      </section>
      <section class="cd-card"><h3>Tìm kiếm web</h3>
        <p class="cd-muted">Dùng khi dự án cho AI truy cập Internet. Mặc định tìm bằng DuckDuckGo; có máy SearXNG riêng thì nhập địa chỉ (định dạng JSON).</p>
        <form class="cd-form cd-grid" data-form="search">
          <label class="cd-field"><span>Máy tìm kiếm SearXNG (không bắt buộc)</span><input name="search_url" class="cd-mono" value="${esc(config.search_url || "")}" placeholder="https://searx.example.org/search" /></label>
          <div class="cd-row-btns"><button class="cd-btn primary">Lưu</button></div>
        </form>
      </section>
      <section class="cd-card"><h3>Máy chủ MCP</h3>
        <p class="cd-muted">MCP server bạn đã cài (vd điều khiển Windows, chụp màn hình, cơ sở dữ liệu) để AI dùng thêm công cụ. Chỉ dùng được trong dự án bạn cho phép; mỗi lần gọi sẽ hỏi bạn, trừ server đánh dấu tự duyệt.</p>
        ${mcpServers.map((m) => `<div class="cd-prov"><div><b>${esc(m.name)}</b><span class="cd-muted cd-mono">${esc([m.command, ...m.args].join(" "))}</span>${m.env_keys.length ? `<span class="cd-muted cd-small">Biến môi trường: ${m.env_keys.map(esc).join(", ")}</span>` : ""}</div>${m.auto_approve ? '<span class="cd-tag">Tự duyệt</span>' : ""}<button class="cd-link" data-act="mcp-test" data-id="${esc(m.id)}">Chạy thử</button><button class="cd-link danger" data-act="mcp-del" data-id="${esc(m.id)}">Xoá</button></div><p class="cd-small cd-muted" data-mcp-tools="${esc(m.id)}" hidden></p>`).join("")}
        <form class="cd-form cd-grid" data-form="mcp">
          <label class="cd-field"><span>Mã (chữ, số, gạch)</span><input name="id" class="cd-mono" required pattern="[A-Za-z0-9-]{1,32}" placeholder="windows" /></label>
          <label class="cd-field"><span>Tên</span><input name="name" placeholder="Điều khiển Windows" /></label>
          <label class="cd-field"><span>Lệnh chạy</span><input name="command" class="cd-mono" required placeholder="npx" /></label>
          <label class="cd-field"><span>Tham số, mỗi dòng một tham số</span><textarea name="args" rows="2" class="cd-mono" placeholder="-y\nten-goi-mcp-server"></textarea></label>
          <label class="cd-field"><span>Biến môi trường KEY=giá trị, mỗi dòng một biến (để trống để giữ như cũ)</span><textarea name="env" rows="2" class="cd-mono"></textarea></label>
          <label class="cd-check"><input type="checkbox" name="auto_approve" /> Tự duyệt mọi lần gọi công cụ của server này (chỉ bật với server bạn tin tưởng)</label>
          <div class="cd-row-btns"><button class="cd-btn primary">Lưu MCP server</button></div>
        </form>
      </section>
      <section class="cd-card"><h3>Kết nối</h3>
        <p class="cd-muted">Vico Agent tại ${esc(base())}.</p>
        <div class="cd-row-btns"><button class="cd-btn" data-act="unpair">Ngắt kết nối</button></div>
      </section>
    </div>`;
  }

  function renderHome() {
    page.innerHTML = `<div class="cd-inner">
      ${head("Coding", "Chọn dự án để giao việc cho AI. AI chỉ đọc / sửa trong thư mục đã cấp quyền.")}
      <section class="cd-card">
        <h3>Dự án</h3>
        ${projects.length ? `<div class="cd-projects">${projects.map((p) => `
          <button class="cd-project" data-act="open-project" data-id="${esc(p.id)}">
            <span class="cd-picon">${SVG(IC.folder, 20)}</span>
            <span class="cd-pmain"><b>${esc(p.name)}</b><span class="cd-muted cd-mono">${esc(p.root)}</span></span>
            <span class="cd-muted cd-small">${esc(EDITS[p.permissions.edits].split(" (")[0])}; ${esc(COMMANDS[p.permissions.commands].toLowerCase())}</span>
          </button>`).join("")}</div>` : `<p class="cd-muted">Chưa có dự án. Thêm thư mục dự án trên máy bạn để bắt đầu.</p>`}
        <form class="cd-form" data-form="project">
          <label class="cd-field cd-grow"><span>Thư mục dự án</span><input name="path" class="cd-mono" placeholder="vd C:\\Users\\ban\\Code\\du-an" required /></label>
          <button class="cd-btn primary">Cấp quyền thư mục</button>
        </form>
      </section>
    </div>`;
  }

  function chatColumn(models) {
    return session ? `
        <div class="cd-board" id="cdBoard" hidden></div>
        <div class="cd-log" id="cdLog"></div>
        <form class="cd-auto-form" id="cdAutoForm" data-form="auto" hidden>
          <div class="cd-auto-form-head"><b>Tự phát triển</b><span class="cd-muted cd-small">AI tự lặp tới khi đạt mọi tiêu chí hoặc chạm giới hạn</span></div>
          <label class="cd-field"><span>Mục tiêu</span><textarea name="goal" rows="2" required placeholder="vd Thêm trang đăng nhập có kiểm tra mật khẩu"></textarea></label>
          <label class="cd-field"><span>Tiêu chí hoàn thành, mỗi dòng một tiêu chí (AI phải có bằng chứng cho từng tiêu chí)</span><textarea name="criteria" rows="3" required placeholder="npm test chạy qua\nTrang /login hiện lỗi khi sai mật khẩu"></textarea></label>
          <label class="cd-field"><span>Phạm vi (không bắt buộc)</span><input name="scope" placeholder="vd chỉ sửa thư mục src/auth" /></label>
          <div class="cd-auto-limits">
            <label class="cd-field"><span>Số vòng tối đa</span><input name="max_iterations" type="number" min="1" max="30" value="5" /></label>
            <label class="cd-field"><span>Thời gian (phút)</span><input name="max_minutes" type="number" min="5" max="480" value="60" /></label>
            <label class="cd-field"><span>Token tối đa</span><input name="max_tokens" type="number" min="10000" step="10000" value="2000000" /></label>
            <label class="cd-field"><span>Chi phí tối đa (USD)</span><input name="max_cost_usd" type="number" min="0" step="0.1" placeholder="không giới hạn" /></label>
            <label class="cd-field"><span>Giá ước tính (USD / 1 triệu token)</span><input name="usd_per_mtok" type="number" min="0" step="0.01" placeholder="để tính chi phí" /></label>
          </div>
          <div class="cd-row-btns"><button class="cd-btn primary">${SVG(IC.loop, 16)} Bắt đầu tự phát triển</button><button type="button" class="cd-btn" data-act="auto-close">Huỷ</button></div>
        </form>
        <div class="cd-composer">
          <textarea id="cdInput" rows="2" placeholder="Giao việc cho AI, vd: Thêm trang đăng nhập và viết test"></textarea>
          <div class="cd-composer-bar">
            <select id="cdModel" title="Model">${models.map((m) => `<option value="${esc(m)}"${(session.model || config.default_model) === m ? " selected" : ""}>${esc(modelLabel(m))}</option>`).join("")}</select>
            <select id="cdReason" title="Mức suy luận"><option value="">Suy luận mặc định</option>${["low", "medium", "high"].map((r) => `<option value="${r}"${session.reasoning === r ? " selected" : ""}>Suy luận ${({ low: "thấp", medium: "vừa", high: "cao" })[r]}</option>`).join("")}</select>
            <span class="cd-spacer"></span>
            <button class="cd-btn" id="cdRetry" data-act="retry" title="Chạy lại yêu cầu cuối">${SVG(IC.retry, 16)} Thử lại</button>
            <button class="cd-btn" id="cdAutoBtn" data-act="auto-open" hidden title="Giao mục tiêu để AI tự lặp tới khi đạt tiêu chí">${SVG(IC.loop, 16)} Tự phát triển</button>
            <button class="cd-btn" id="cdPause" data-act="pause" hidden>${SVG(IC.pause, 16)} Tạm dừng</button>
            <button class="cd-btn primary" id="cdSend" data-act="send">${SVG(IC.send, 16)} Gửi</button>
            <button class="cd-btn danger" id="cdStop" data-act="stop" hidden>${SVG(IC.stop, 14)} Dừng</button>
          </div>
        </div>` : `<div class="cd-empty"><p>Tạo phiên mới để giao việc cho AI trong dự án này.</p><button class="cd-btn primary" data-act="new-session">${SVG(IC.plus, 16)} Phiên mới</button></div>`;
  }
  const modeSwitch = () => `<div class="cd-mode" role="tablist" aria-label="Chế độ"><button role="tab" data-act="mode" data-mode="chat" aria-selected="${mode === "chat"}">Chat</button><button role="tab" data-act="mode" data-mode="ide" aria-selected="${mode === "ide"}">IDE</button></div>`;

  const permsHtml = (perms) => `
          <label class="cd-field"><span>Sửa file</span><select data-perm="edits">${Object.entries(EDITS).map(([k, v]) => `<option value="${k}"${perms.edits === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
          <label class="cd-field"><span>Chạy lệnh</span><select data-perm="commands">${Object.entries(COMMANDS).map(([k, v]) => `<option value="${k}"${perms.commands === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
          <label class="cd-check"><input type="checkbox" data-perm="read_secrets"${perms.read_secrets ? " checked" : ""} /> Cho AI đọc file bí mật (.env, khoá)</label>
          <label class="cd-check"><input type="checkbox" data-perm="network"${perms.network ? " checked" : ""} /> Cho AI tìm kiếm và đọc trang web (tài liệu, dự án tương tự)</label>
          <label class="cd-check"><input type="checkbox" data-perm="browser"${perms.browser ? " checked" : ""} /> Cho AI mở trình duyệt riêng để bấm thử, chụp và so ảnh giao diện</label>
          ${mcpServers.map((m) => `<label class="cd-check"><input type="checkbox" data-mcp="${esc(m.id)}"${(perms.mcp || []).includes(m.id) ? " checked" : ""} /> Cho dùng MCP: ${esc(m.name)}${m.auto_approve ? " (tự duyệt)" : ""}</label>`).join("")}
          <label class="cd-check"><input type="checkbox" data-perm="multi_agent"${perms.multi_agent ? " checked" : ""} /> Multi-Agent: AI trưởng giao việc cho nhiều AI chạy song song</label>
          <label class="cd-check"><input type="checkbox" data-perm="autonomous"${perms.autonomous ? " checked" : ""} /> Tự phát triển: AI tự lặp lập trình, kiểm thử tới khi đạt tiêu chí bạn đặt</label>
          <label class="cd-field"><span>Số agent chạy cùng lúc</span><select data-perm="max_agents"${perms.multi_agent ? "" : " disabled"}>${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<option value="${n}"${(perms.max_agents || 3) === n ? " selected" : ""}>${n} agent</option>`).join("")}</select></label>
          <p class="cd-muted cd-small">Xoá file, commit và lệnh nguy hiểm (git push, xoá thư mục, deploy) luôn hỏi bạn. Mỗi agent làm trong bản sao Git riêng và chỉ vào dự án khi được gộp.</p>
          <button class="cd-link danger" data-act="revoke">Thu hồi quyền thư mục</button>`;

  function renderProject() {
    const perms = project.permissions;
    const models = [...new Set([config.default_model, ...(config.providers.find((x) => x.id === config.default_provider)?.models || [])].filter(Boolean))];
    if (mode === "ide") {
      page.innerHTML = `<div class="cd-ide-work">
        <div class="cd-ide-top">
          <button class="cd-back-row" data-act="back">${SVG(IC.back, 16)} Dự án</button>
          <b class="cd-ide-name" title="${esc(project.root)}">${esc(project.name)}</b>
          ${modeSwitch()}
          <span class="cd-spacer"></span>
          <select id="cdSessionPick" title="Phiên">${sessions.map((s) => `<option value="${esc(s.id)}"${session?.id === s.id ? " selected" : ""}>${esc(s.title)}</option>`).join("") || "<option value=''>Chưa có phiên</option>"}</select>
          <button class="cd-btn" data-act="new-session" title="Phiên mới">${SVG(IC.plus, 16)}</button>
          <details class="cd-perms cd-perms-pop"><summary>Quyền</summary><div class="cd-perms-box">${permsHtml(perms)}</div></details>
        </div>
        <div class="cd-ide-body"><div id="cdIdeSlot" class="cd-ide-slot"></div><div class="cd-ide-chat cd-main">${chatColumn(models)}</div></div>
      </div>`;
      // giữ nguyên khung IDE (tab, editor) khi chỉ đổi phiên / quyền
      if (!ideHost || ideProject !== project.id) {
        if (ideHost) VicoCodingIDE.unmount();
        ideHost = document.createElement("div");
        ideHost.className = "cd-ide-host";
        ideProject = project.id;
        document.getElementById("cdIdeSlot").replaceWith(ideHost);
        VicoCodingIDE.mount(ideHost, { agent, base, token: () => conn.token, project });
      } else document.getElementById("cdIdeSlot").replaceWith(ideHost);
    } else {
      dropIde();
      page.innerHTML = `<div class="cd-work">
      <aside class="cd-side">
        <button class="cd-back-row" data-act="back">${SVG(IC.back, 16)} Dự án</button>
        <div class="cd-side-title"><b>${esc(project.name)}</b><span class="cd-muted cd-mono cd-small">${esc(project.root)}</span></div>
        ${modeSwitch()}
        <button class="cd-btn primary cd-full" data-act="new-session">${SVG(IC.plus, 16)} Phiên mới</button>
        <nav class="cd-sessions">${sessions.map((s) => `<button class="cd-session${session?.id === s.id ? " active" : ""}" data-act="open-session" data-id="${esc(s.id)}"><span>${esc(s.title)}</span><span class="cd-muted cd-small">${new Date(s.updated_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span></button>`).join("") || '<p class="cd-muted cd-small">Chưa có phiên nào.</p>'}</nav>
        <details class="cd-perms"${perms.multi_agent ? " open" : ""}>
          <summary>Quyền của dự án</summary>${permsHtml(perms)}
        </details>
      </aside>
      <div class="cd-main">${chatColumn(models)}</div>
    </div>`;
    }
    if (session) {
      lastSeq = 0;
      renderedRun = null;
      follow();
    }
    updateComposer();
  }

  let ideHost = null, ideProject = null;
  function dropIde() {
    if (ideHost) { VicoCodingIDE.unmount(); ideHost = null; ideProject = null; }
  }

  /* ---------- Timeline từ sự kiện thật ---------- */
  let renderedRun = null;
  let liveText = null;      // khối chữ AI đang stream
  const rows = new Map();   // call_id -> phần tử dòng công cụ
  const log = () => document.getElementById("cdLog");
  const atBottom = () => { const l = log(); return !l || l.scrollHeight - l.scrollTop - l.clientHeight < 80; };
  const toBottom = () => { const l = log(); if (l) l.scrollTop = l.scrollHeight; };

  function diffHtml(diff) {
    return `<pre class="cd-diff">${diff.split("\n").map((l) => `<span class="${l.startsWith("+") && !l.startsWith("+++") ? "add" : l.startsWith("-") && !l.startsWith("---") ? "del" : l.startsWith("@@") ? "hunk" : ""}">${esc(l)}</span>`).join("\n")}</pre>`;
  }

  /* ---------- Multi-Agent: thẻ từng agent nhân viên + bảng theo dõi (V-052) ---------- */
  const agents = new Map();   // agent_id -> { name, el, log, status, tokens, now, branch, files, merged, discarded, color }

  function agentButtons(a) {
    const b = (act, icon, text, cls = "") => `<button class="cd-btn ${cls}" data-act="ag" data-do="${act}" data-ag="${esc(a.id)}">${SVG(icon, 15)} ${text}</button>`;
    const live = a.status === "running" || a.status === "paused";
    let html = "";
    if (live) html = (a.status === "paused" ? b("resume", IC.play, "Tiếp tục") : b("pause", IC.pause, "Tạm dừng")) + b("message", IC.chat, "Nhắn") + b("cancel", IC.stop, "Dừng", "danger");
    else if (a.branch && a.files && a.files.length && !a.merged && !a.discarded) html = b("merge", IC.merge, "Gộp vào dự án", "primary") + b("discard", IC.x, "Bỏ");
    a.el.querySelector(".cd-agent-btns").innerHTML = html;
  }
  function agentUpdate(a) {
    const st = a.el.querySelector(".cd-agent-st");
    st.dataset.st = a.status;
    st.textContent = AG_STATUS[a.status] || a.status;
    a.el.querySelector("[data-k=tokens]").textContent = `${a.tokens.toLocaleString("vi-VN")} token`;
    a.el.querySelector(".cd-agent-now").textContent = a.now ? `Đang ${a.now}` : "";
    a.el.classList.toggle("live", a.status === "running" || a.status === "paused");
    agentButtons(a);
    renderBoard();
  }
  function renderBoard() {
    const box = document.getElementById("cdBoard");
    if (!box) return;
    box.hidden = !agents.size;
    const list = [...agents.values()];
    const live = list.filter((a) => a.status === "running" || a.status === "paused").length;
    box.innerHTML = `<div class="cd-board-head"><b>Agent</b><span class="cd-muted cd-small">${live ? `${live} đang chạy` : "không có agent đang chạy"}, ${list.reduce((n, a) => n + a.tokens, 0).toLocaleString("vi-VN")} token</span></div>
      <div class="cd-board-list">${list.map((a) => `<button class="cd-board-item" data-act="ag-focus" data-ag="${esc(a.id)}" style="--ag:${a.color}"><i></i><b>${esc(a.name)}</b><span class="cd-agent-st" data-st="${esc(a.status)}">${AG_STATUS[a.status] || a.status}</span><span class="cd-board-now">${esc(a.now || (a.merged ? "đã gộp vào dự án" : a.discarded ? "đã bỏ" : ""))}</span></button>`).join("")}</div>`;
  }

  function applyAgent(ev, l) {
    if (ev.type === "agent_spawned") {
      const a = { id: ev.agent_id, name: ev.name, status: "running", tokens: 0, now: "", branch: ev.branch, files: [], merged: false, discarded: false, color: AG_COLORS[agents.size % AG_COLORS.length] };
      l.insertAdjacentHTML("beforeend", `<div class="cd-agent live" data-agent="${esc(ev.agent_id)}" style="--ag:${a.color}">
        <div class="cd-agent-head"><span class="cd-agent-av">${esc(ev.name.slice(0, 1).toUpperCase())}</span>
          <div class="cd-agent-title"><b>${esc(ev.name)}</b><span class="cd-muted cd-small">${esc(ev.role)}, ${esc(ev.model)}${ev.reasoning ? `, suy luận ${REASON[ev.reasoning] || esc(ev.reasoning)}` : ""}</span></div>
          <span class="cd-agent-st" data-st="running">Đang chạy</span></div>
        <p class="cd-agent-task">${esc(ev.task)}</p>
        <div class="cd-agent-meta cd-small cd-muted"><span>${ev.branch ? `Bản sao Git riêng, nhánh <span class="cd-mono">${esc(ev.branch)}</span>` : "Chung thư mục dự án, khoá file khi sửa"}</span><span data-k="tokens">0 token</span></div>
        <div class="cd-agent-now cd-small"></div>
        <details class="cd-agent-more"><summary>Nhật ký của agent</summary><div class="cd-agent-log"></div></details>
        <div class="cd-agent-note"></div>
        <div class="cd-agent-btns"></div>
      </div>`);
      a.el = l.lastElementChild;
      a.log = a.el.querySelector(".cd-agent-log");
      agents.set(a.id, a);
      agentUpdate(a);
      return;
    }
    const a = agents.get(ev.agent);
    if (!a) return;
    const note = (html, cls = "") => a.el.querySelector(".cd-agent-note").insertAdjacentHTML("beforeend", `<p class="${cls}">${html}</p>`);
    switch (ev.type) {
      case "agent_status": a.status = ev.status; break;
      case "agent_message":
        a.log.insertAdjacentHTML("beforeend", `<div class="cd-agent-msg"><b>${ev.from === "lead" ? "AI trưởng" : "Bạn"} nhắn:</b> ${esc(ev.text)}</div>`);
        break;
      case "agent_finished":
        a.status = ev.status; a.tokens = ev.tokens; a.files = ev.files; a.now = "";
        // xong việc: thu gọn nhật ký, báo cáo cuối hiện ở thẻ (không lặp trong nhật ký)
        a.el.querySelector(".cd-agent-more").open = false;
        if (a.last && a.last.text === ev.summary) a.last.el.remove();
        if (ev.files.length) note(`${ev.files.map((f) => `<span class="cd-mono">${esc(f.path)}</span> <span class="cd-plus">+${f.added}</span> <span class="cd-minus">-${f.removed}</span>`).join(", ")}${a.branch ? " (chưa gộp)" : ""}`, "cd-agent-files");
        if (ev.summary) a.el.querySelector(".cd-agent-note").insertAdjacentHTML("beforeend", `<div class="cd-agent-sum">${renderMarkdown(ev.summary.slice(0, 1500))}</div>`);
        break;
      case "agent_merged": {
        a.merged = true;
        const fl = a.el.querySelector(".cd-agent-files");
        if (fl) fl.innerHTML = fl.innerHTML.replace(" (chưa gộp)", "");
        note(`Đã gộp vào dự án: ${ev.applied.length} file${ev.conflicts.length ? `. <b>Xung đột</b> ở ${ev.conflicts.map(esc).join(", ")}: file có dấu &lt;&lt;&lt;&lt;&lt;&lt;&lt; cần sửa` : ""}`, ev.conflicts.length ? "cd-error" : "");
        if (ideHost) ev.applied.forEach((f) => VicoCodingIDE.fileChanged(f.path));
        break;
      }
      case "agent_discarded": a.discarded = true; a.status = a.status === "running" || a.status === "paused" ? "cancelled" : a.status; note("Đã bỏ agent và thay đổi chưa gộp", "cd-muted cd-small"); break;
      case "usage": a.tokens += ev.prompt_tokens + ev.completion_tokens; break;
      case "assistant_delta": return;
      case "assistant_message": a.log.insertAdjacentHTML("beforeend", `<div class="cd-ai">${renderMarkdown(ev.text)}</div>`); a.last = { text: ev.text, el: a.log.lastElementChild }; break;
      case "tool_started": a.now = `${(LABEL[ev.label] || ev.label).toLowerCase()} ${ev.target || ""}`.trim(); applyTool(ev, a.log, a); break;
      case "approval_required": a.el.querySelector(".cd-agent-more").open = true; a.el.classList.add("waiting"); return applyTool(ev, a.log, a);
      case "approval_resolved": a.el.classList.remove("waiting"); return applyTool(ev, a.log, a);
      case "tool_output": return applyTool(ev, a.log, a);
      case "tool_finished": a.now = ""; applyTool(ev, a.log, a); break;
      default: return;
    }
    agentUpdate(a);
  }

  /* ---------- Tự phát triển: thẻ tiến độ (tiêu chí, vòng, token), báo cáo từng vòng, báo cáo cuối ---------- */
  let auto = null;          // { el, max, tokens, started, cost }
  const critList = (criteria) => criteria.map((c, i) => `<li class="${c.met ? "met" : ""}"><span class="cd-crit-mark">${c.met ? SVG(IC.check, 14) : i + 1}</span><div><div>${esc(c.text)}</div>${c.evidence ? `<div class="cd-muted cd-small">${esc(c.evidence)}</div>` : ""}</div></li>`).join("");
  function autoProgress() {
    if (!auto) return;
    const mins = Math.max(0, Math.round((Date.now() - auto.started) / 60000));
    auto.el.querySelector("[data-k=progress]").textContent = `Vòng ${auto.n || 0}/${auto.max}, ${mins} phút, ${auto.tokens.toLocaleString("vi-VN")} token${auto.price ? `, khoảng ${(auto.tokens * auto.price / 1e6).toFixed(2)} USD` : ""}`;
  }
  function applyAuto(ev, l) {
    switch (ev.type) {
      case "autonomous_started": {
        const lim = ev.limits || {};
        l.insertAdjacentHTML("beforeend", `<div class="cd-auto">
          <div class="cd-auto-head">${SVG(IC.loop, 18)}<b>Tự phát triển</b><span class="cd-auto-st" data-st="running">Đang chạy</span></div>
          <p class="cd-auto-goal">${esc(ev.goal)}</p>
          ${ev.scope ? `<p class="cd-muted cd-small">Phạm vi: ${esc(ev.scope)}</p>` : ""}
          <ol class="cd-crit">${critList(ev.criteria.map((text) => ({ text, met: false, evidence: "" })))}</ol>
          <div class="cd-auto-meta cd-small"><span data-k="progress"></span><span class="cd-muted">Giới hạn ${lim.max_iterations} vòng, ${lim.max_minutes} phút, ${Number(lim.max_tokens || 0).toLocaleString("vi-VN")} token${lim.max_cost_usd ? `, ${lim.max_cost_usd} USD` : ""}</span></div>
          <div class="cd-auto-props" hidden><b class="cd-small">Đề xuất ngoài phạm vi (AI không tự làm)</b><ul></ul></div>
        </div>`);
        auto = { el: l.lastElementChild, max: lim.max_iterations, tokens: 0, started: new Date(ev.t).getTime(), price: lim.usd_per_mtok, n: 0 };
        autoProgress();
        break;
      }
      case "iteration_started":
        if (auto) { auto.n = ev.n; autoProgress(); }
        l.insertAdjacentHTML("beforeend", `<div class="cd-iter">Vòng ${ev.n}/${ev.max}</div>`);
        break;
      case "iteration_report": {
        if (auto) auto.el.querySelector(".cd-crit").innerHTML = critList(ev.criteria);
        const met = ev.criteria.filter((c) => c.met).length;
        l.insertAdjacentHTML("beforeend", `<div class="cd-iter-rep ${ev.decision}">
          <div class="cd-iter-rep-head"><b>Kết quả vòng ${ev.n}</b><span class="cd-muted cd-small">${met}/${ev.criteria.length} tiêu chí đạt</span></div>
          ${ev.reported ? (ev.summary ? `<p>${esc(ev.summary)}</p>` : "") : `<p class="cd-error">AI không gửi báo cáo cuối vòng</p>`}
          ${ev.tests.length ? `<ul class="cd-tests">${ev.tests.map((t) => `<li class="${t.exit_code === 0 ? "ok" : "bad"}"><span class="cd-mono">${esc(t.command)}</span> ${t.verified ? `mã thoát ${t.exit_code}` : "không thấy chạy, không tính"}</li>`).join("")}</ul>` : ""}
          ${ev.files.length ? `<p class="cd-small">${ev.files.map((f) => `<span class="cd-mono">${esc(f.path)}</span> <span class="cd-plus">+${f.added}</span> <span class="cd-minus">-${f.removed}</span>`).join(", ")}</p>` : '<p class="cd-small cd-muted">Không đổi file trong vòng này</p>'}
          <p class="cd-small"><b>${ev.decision === "continue" ? "Tiếp tục" : "Dừng"}:</b> ${esc(ev.reason)}</p>
        </div>`);
        break;
      }
      case "proposal": {
        if (!auto) break;
        const box = auto.el.querySelector(".cd-auto-props");
        box.hidden = false;
        box.querySelector("ul").insertAdjacentHTML("beforeend", `<li><b>${esc(ev.title)}</b> <span class="cd-muted cd-small">(${({ high: "ưu tiên cao", medium: "ưu tiên vừa", low: "ưu tiên thấp" })[ev.priority] || esc(ev.priority)})</span><div class="cd-small">${esc(ev.detail)}</div></li>`);
        break;
      }
      case "autonomous_finished": {
        if (auto) {
          const st = auto.el.querySelector(".cd-auto-st");
          st.dataset.st = ev.status;
          st.textContent = AUTO_STATUS[ev.status] || ev.status;
          auto.el.querySelector(".cd-crit").innerHTML = critList(ev.criteria);
          auto.tokens = ev.tokens;
          auto.n = ev.iterations;
          autoProgress();
          auto.el.querySelector("[data-k=progress]").textContent = `${ev.iterations} vòng, ${Math.round(ev.seconds / 60)} phút, ${ev.tokens.toLocaleString("vi-VN")} token${ev.cost_usd != null ? `, khoảng ${ev.cost_usd.toFixed(2)} USD` : ""}`;
        }
        l.insertAdjacentHTML("beforeend", `<div class="cd-auto-end ${esc(ev.status)}">
          <div><b>${AUTO_STATUS[ev.status] || esc(ev.status)}</b> <span class="cd-muted cd-small">${esc(ev.reason)}</span></div>
          ${ev.blockers.length ? `<ul class="cd-files">${ev.blockers.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
          ${(ev.sources || []).length ? `<details class="cd-detail"><summary>Nguồn tham khảo (${ev.sources.length})</summary><ul class="cd-sources">${ev.sources.map((x) => `<li><a href="${esc(/^https?:/.test(x.url) ? x.url : "#")}" target="_blank" rel="noopener noreferrer">${esc(x.title || x.url)}</a> <span class="cd-muted cd-small">${esc(x.url)}, truy cập ${esc(x.accessed)}</span></li>`).join("")}</ul></details>` : ""}
          <button class="cd-link" data-act="auto-report" data-run="${esc(ev.run_id)}">${SVG(IC.doc, 14)} Tải báo cáo (.md)</button>
        </div>`);
        auto = null;
        break;
      }
    }
  }

  function apply(ev) {
    const l = log();
    if (!l) return;
    const stick = atBottom();
    lastSeq = Math.max(lastSeq, ev.type === "assistant_delta" ? 0 : ev.seq);
    if (["autonomous_started", "iteration_started", "iteration_report", "proposal", "autonomous_finished"].includes(ev.type)) {
      applyAuto(ev, l);
      if (stick) toBottom();
      return;
    }
    if (ev.agent || ev.type.startsWith("agent_")) {
      applyAgent(ev, l);
      if (stick) toBottom();
      return;
    }
    if (["tool_started", "approval_required", "approval_resolved", "tool_output", "tool_finished"].includes(ev.type)) {
      if (ev.type === "tool_started") liveText = null;
      applyTool(ev, l, null);
      if (stick) toBottom();
      return;
    }
    switch (ev.type) {
      case "user_message":
        l.insertAdjacentHTML("beforeend", `<div class="cd-user">${esc(ev.text)}</div>`);
        break;
      case "run_started":
        running = ev.run_id;
        l.insertAdjacentHTML("beforeend", `<div class="cd-meta">${esc(ev.model)} qua ${esc(ev.provider)}</div>`);
        break;
      case "assistant_delta":
        if (!liveText) { l.insertAdjacentHTML("beforeend", `<div class="cd-ai streaming"></div>`); liveText = l.lastElementChild; liveText.dataset.raw = ""; }
        liveText.dataset.raw += ev.text;
        liveText.textContent = liveText.dataset.raw;
        break;
      case "assistant_message": {
        const el = liveText || (l.insertAdjacentHTML("beforeend", `<div class="cd-ai"></div>`), l.lastElementChild);
        el.classList.remove("streaming");
        el.innerHTML = renderMarkdown(ev.text);
        liveText = null;
        break;
      }
      case "run_paused":
        paused = ev.paused;
        l.insertAdjacentHTML("beforeend", `<div class="cd-meta">${ev.paused ? "Đã tạm dừng: AI dừng ở bước kế tiếp, lệnh đang chạy vẫn chạy xong" : "Tiếp tục chạy"}</div>`);
        updateComposer();
        break;
      case "usage":
        if (auto) { auto.tokens += ev.prompt_tokens + ev.completion_tokens; autoProgress(); }
        break;
      case "run_finished": {
        liveText = null;
        paused = false;
        if (running === ev.run_id) running = null;
        const label = { done: "Xong", cancelled: "Đã dừng", failed: "Lỗi", limit: "Dừng vì chạm giới hạn", blocked: "Dừng vì bị chặn", stalled: "Dừng vì không tiến triển", revoked: "Đã thu hồi quyền" }[ev.status] || ev.status;
        l.insertAdjacentHTML("beforeend", `<div class="cd-done ${esc(ev.status)}">
          <div><b>${label}</b> sau ${ev.steps} bước${ev.files.length ? `, ${ev.files.length} file thay đổi` : ""}</div>
          ${ev.error ? `<p class="cd-error">${esc(ev.error)}</p>` : ""}
          ${ev.files.length ? `<ul class="cd-files">${ev.files.map((f) => `<li><span class="cd-mono">${esc(f.path)}</span> <span class="cd-small cd-muted">${({ created: "tạo mới", edited: "đã sửa", deleted: "đã xoá" })[f.action] || ""}</span> <span class="cd-plus">+${f.added}</span> <span class="cd-minus">-${f.removed}</span></li>`).join("")}</ul>
          <button class="cd-link" data-act="undo-run" data-run="${esc(ev.run_id)}">${SVG(IC.undo, 14)} Hoàn tác cả lượt</button>` : ""}
        </div>`);
        updateComposer();
        break;
      }
      case "undone": {
        if (ideHost) VicoCodingIDE.fileChanged(ev.path);
        l.querySelectorAll(`[data-cp="${CSS.escape(ev.checkpoint)}"]`).forEach((b) => b.replaceWith(Object.assign(document.createElement("span"), { className: "cd-small cd-muted", textContent: "Đã hoàn tác" })));
        break;
      }
    }
    if (stick) toBottom();
    if (ev.type === "run_started" || ev.type === "run_finished") updateComposer();
  }

  /** Ảnh chụp nằm trong Agent (cần mã ghép cặp) nên tải bằng fetch rồi gắn blob URL */
  async function loadShot(img, id) {
    try {
      const r = await fetch(`${base()}/screenshots/${id}`, { headers: { authorization: "Bearer " + conn.token } });
      if (!r.ok) throw new Error();
      img.src = URL.createObjectURL(await r.blob());
    } catch { img.replaceWith(Object.assign(document.createElement("span"), { className: "cd-small cd-muted", textContent: "Không tải được ảnh chụp" })); }
  }

  /** Dòng công cụ (đọc / sửa / chạy lệnh...) của AI trưởng hoặc của một agent nhân viên */
  function applyTool(ev, box, agent) {
    switch (ev.type) {
      case "tool_started": {
        box.insertAdjacentHTML("beforeend", `<div class="cd-tool running" data-call="${esc(ev.call_id)}">
          <div class="cd-tool-head"><span class="cd-dot"></span><b>${esc(LABEL[ev.label] || ev.label)}</b><span class="cd-target cd-mono">${esc(ev.target || "")}</span><span class="cd-sum"></span></div>
        </div>`);
        rows.set(ev.call_id, box.lastElementChild);
        break;
      }
      case "approval_required": {
        const row = rows.get(ev.call_id);
        if (!row) break;
        row.classList.add("waiting");
        row.insertAdjacentHTML("beforeend", `<div class="cd-approve">
          <p><b>Cần bạn duyệt:</b> ${esc(ev.reason)}</p>
          ${ev.preview ? (ev.tool === "run_command" || ev.tool === "git_commit" || ev.tool === "merge_agent" || ev.tool.startsWith("mcp__") ? `<pre class="cd-cmd">${esc(ev.preview)}</pre>` : diffHtml(ev.preview)) : ""}
          <div class="cd-row-btns"><button class="cd-btn primary" data-act="approve" data-call="${esc(ev.call_id)}" data-ok="1">${SVG(IC.check, 16)} Cho phép</button><button class="cd-btn" data-act="approve" data-call="${esc(ev.call_id)}" data-ok="0">${SVG(IC.x, 16)} Từ chối</button></div>
        </div>`);
        if (document.hidden) document.title = "Cần duyệt · Vico AI";
        if (agent) row.querySelector(".cd-approve p").insertAdjacentHTML("afterbegin", `<b>Agent ${esc(agent.name)}</b>: `);
        break;
      }
      case "approval_resolved": {
        const row = rows.get(ev.call_id);
        row?.classList.remove("waiting");
        row?.querySelector(".cd-approve")?.remove();
        if (row && !ev.approved) row.querySelector(".cd-sum").textContent = "Bạn đã từ chối";
        document.title = "Vico AI";
        break;
      }
      case "tool_output": {
        const row = rows.get(ev.call_id);
        if (!row) break;
        let term = row.querySelector(".cd-term");
        if (!term) { row.insertAdjacentHTML("beforeend", `<pre class="cd-term"></pre>`); term = row.querySelector(".cd-term"); }
        term.textContent += ev.text;
        term.scrollTop = term.scrollHeight;
        break;
      }
      case "tool_finished": {
        const row = rows.get(ev.call_id);
        if (!row) break;
        row.classList.remove("running", "waiting");
        row.classList.add(ev.ok ? "ok" : "failed");
        const counts = ev.added !== undefined ? `<span class="cd-plus">+${ev.added}</span> <span class="cd-minus">-${ev.removed}</span>` : "";
        // tóm tắt dài (vd lý do runtime từ chối) xuống dòng riêng thay vì tràn ngang
        const long = ev.summary.length > 70;
        row.querySelector(".cd-sum").innerHTML = `${counts} ${esc(long ? (ev.ok ? "" : "Không thực hiện") : ev.exit_code !== undefined || !counts ? ev.summary : "")}`;
        if (long) row.insertAdjacentHTML("beforeend", `<p class="cd-tool-msg">${esc(ev.summary)}</p>`);
        if (ev.diff) {
          row.insertAdjacentHTML("beforeend", `<details class="cd-detail"><summary>Xem diff ${esc(ev.path || "")}</summary>${diffHtml(ev.diff)}</details>`);
        }
        if (ev.checkpoint) row.querySelector(".cd-tool-head").insertAdjacentHTML("beforeend", `<button class="cd-link" data-act="undo" data-cp="${esc(ev.checkpoint)}" title="Khôi phục file như trước lần sửa này">${SVG(IC.undo, 14)} Hoàn tác</button>`);
        if (ev.image) {
          row.insertAdjacentHTML("beforeend", `<button class="cd-shot" data-act="shot" title="Bấm để xem lớn"><img alt="Ảnh chụp trình duyệt ${esc(ev.image.split("/").pop())}" /></button>`);
          loadShot(row.querySelector(".cd-shot:last-child img"), ev.image);
        }
        const term = row.querySelector(".cd-term");
        if (term) term.classList.add("done");
        // agent làm trong worktree riêng: file chưa vào dự án nên IDE không cần đọc lại
        if (ev.path && ev.added !== undefined && ideHost && !(agent && agent.branch)) VicoCodingIDE.fileChanged(ev.path);
        break;
      }
    }
  }

  /** Đọc luồng sự kiện của phiên (fetch stream để gửi được mã ghép cặp); mất kết nối thì nối lại từ seq cuối */
  async function follow() {
    stream?.abort();
    const ctrl = new AbortController();
    stream = ctrl;
    const id = session.id;
    rows.clear();
    agents.clear();
    auto = null;
    paused = false;
    liveText = null;
    for (let attempt = 0; !ctrl.signal.aborted && session?.id === id; attempt++) {
      try {
        const r = await fetch(`${base()}/sessions/${id}/events?since=${lastSeq}`, { headers: { authorization: "Bearer " + conn.token }, signal: ctrl.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        attempt = 0;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const block = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const data = block.split("\n").filter((x) => x.startsWith("data:")).map((x) => x.slice(5).trim()).join("");
            if (data) apply(JSON.parse(data));
          }
        }
      } catch (e) {
        if (ctrl.signal.aborted) return;
      }
      await new Promise((res) => setTimeout(res, Math.min(5000, 500 * (attempt + 1))));
    }
  }

  function updateComposer() {
    const send = document.getElementById("cdSend"), stop = document.getElementById("cdStop"), retry = document.getElementById("cdRetry");
    if (!send) return;
    send.hidden = !!running;
    stop.hidden = !running;
    const autoBtn = document.getElementById("cdAutoBtn");
    autoBtn.hidden = !!running || !project?.permissions.autonomous;
    if (running || !project?.permissions.autonomous) { const f = document.getElementById("cdAutoForm"); if (f) f.hidden = true; }
    const pause = document.getElementById("cdPause");
    pause.hidden = !running;
    pause.innerHTML = paused ? `${SVG(IC.play, 16)} Tiếp tục` : `${SVG(IC.pause, 16)} Tạm dừng`;
    // Thử lại chỉ cho lượt thường kết thúc lỗi / dừng; lượt Tự phát triển thì giao lại mục tiêu bằng form
    const dones = log()?.querySelectorAll(".cd-done") || [];
    const lastDone = dones[dones.length - 1];
    retry.hidden = !!running || !lastDone || !lastDone.matches(".failed, .cancelled, .limit") || !!lastDone.previousElementSibling?.matches(".cd-auto-end");
  }

  /* ---------- Thao tác ---------- */
  async function openProject(id, sessionId) {
    project = projects.find((p) => p.id === id);
    if (!project) return;
    view = "project";
    session = null;
    stream?.abort();
    saveKey("vico_coding_last", { project: id });
    try { ({ sessions } = await agent(`/projects/${id}/sessions`)); } catch (e) { showToast(e.message, "error"); sessions = []; }
    const pick = sessions.find((s) => s.id === sessionId) || sessions[0];
    if (pick) await openSession(pick.id); else render();
  }
  async function openSession(id) {
    try {
      const r = await agent(`/sessions/${id}`);
      session = r.session;
      running = r.running || null;
      saveKey("vico_coding_last", { project: session.project_id, session: session.id });
    } catch (e) { showToast(e.message, "error"); return; }
    render();
  }
  async function refreshSessions() {
    try { ({ sessions } = await agent(`/projects/${project.id}/sessions`)); } catch {}
  }

  page.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, fd = new FormData(f), kind = f.dataset.form;
    try {
      if (kind === "pair") {
        conn = { port: Number(fd.get("port")) || 7878, token: String(fd.get("token")).trim() };
        saveKey("vico_agent", conn);
        await connect(false);
      } else if (kind === "provider") {
        await agent("/providers/main", { method: "PUT", body: { name: fd.get("name"), base_url: fd.get("base_url"), api_key: String(fd.get("api_key") || "") || undefined, make_default: true, default_model: fd.get("model") } });
        config = await agent("/config");
        showToast("Đã lưu nhà cung cấp AI");
        view = "home";
        render();
      } else if (kind === "mcp") {
        const lines = (k) => String(fd.get(k) || "").split("\n").map((x) => x.trim()).filter(Boolean);
        const envLines = lines("env");
        const env = envLines.length ? Object.fromEntries(envLines.map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1)]).filter(([k]) => k)) : undefined;
        await agent(`/mcp/${encodeURIComponent(String(fd.get("id")).trim())}`, { method: "PUT", body: { name: String(fd.get("name") || "").trim(), command: String(fd.get("command")).trim(), args: lines("args"), env, auto_approve: fd.get("auto_approve") === "on" } });
        ({ servers: mcpServers } = await agent("/mcp"));
        showToast("Đã lưu MCP server; bấm Chạy thử để kiểm tra kết nối");
        render();
      } else if (kind === "search") {
        await agent("/config/search", { method: "PUT", body: { search_url: String(fd.get("search_url") || "").trim() || null } });
        config = await agent("/config");
        showToast(config.search_url ? "Đã lưu máy tìm kiếm" : "Dùng DuckDuckGo để tìm kiếm");
      } else if (kind === "auto") {
        const num = (k) => (String(fd.get(k) || "").trim() === "" ? undefined : Number(fd.get(k)));
        const body = {
          goal: String(fd.get("goal")).trim(),
          criteria: String(fd.get("criteria")).split("\n").map((x) => x.trim()).filter(Boolean),
          scope: String(fd.get("scope") || "").trim() || undefined,
          max_iterations: num("max_iterations"), max_minutes: num("max_minutes"), max_tokens: num("max_tokens"),
          max_cost_usd: num("max_cost_usd"), usd_per_mtok: num("usd_per_mtok"),
        };
        if (!body.criteria.length) return showToast("Nhập ít nhất một tiêu chí hoàn thành", "error");
        if (session.title === "Phiên mới") { session.title = ("Tự phát triển: " + body.goal).slice(0, 60); agent(`/sessions/${session.id}`, { method: "PATCH", body: { title: session.title } }).then(refreshSessions).then(() => {}); }
        const r = await agent(`/sessions/${session.id}/autonomous`, { method: "POST", body });
        running = r.run_id;
        f.hidden = true;
        f.reset();
        updateComposer();
      } else if (kind === "project") {
        const r = await agent("/projects", { method: "POST", body: { path: String(fd.get("path")).trim() } });
        ({ projects } = await agent("/projects"));
        await openProject(r.project.id);
      }
    } catch (err) { showToast(err.message, "error"); }
  });

  page.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.dataset.perm && project) {
      let value = el.type === "checkbox" ? el.checked : el.value;
      if (el.dataset.perm === "max_agents") value = Number(value);
      if (el.dataset.perm === "autonomous" && value && !confirm(`Bật Tự phát triển cho dự án ${project.name}?\n\nKhi bạn giao một mục tiêu kèm tiêu chí hoàn thành, AI sẽ tự lặp: tìm hiểu, lập trình, chạy kiểm thử, tự đánh giá cho tới khi đạt tiêu chí hoặc chạm giới hạn vòng / thời gian / token / chi phí bạn đặt. Lệnh rủi ro (xoá dữ liệu, push, deploy) vẫn hỏi bạn. Tắt bất cứ lúc nào; tắt thì lượt đang chạy dừng ngay.`)) { el.checked = false; return; }
      if (el.dataset.perm === "multi_agent" && value && !confirm(`Bật Multi-Agent cho dự án ${project.name}?\n\nAI trưởng sẽ được tạo tối đa ${project.permissions.max_agents || 3} agent nhân viên chạy song song, mỗi agent tốn thêm token. Agent làm trong bản sao Git riêng và chỉ vào dự án khi được gộp. Bạn tắt được bất cứ lúc nào; tắt thì các agent đang chạy dừng ngay.`)) { el.checked = false; return; }
      try {
        const r = await agent(`/projects/${project.id}`, { method: "PATCH", body: { [el.dataset.perm]: value } });
        project = r.project;
        projects = projects.map((p) => (p.id === project.id ? project : p));
        page.querySelectorAll('[data-perm="max_agents"]').forEach((x) => (x.disabled = !project.permissions.multi_agent));
        page.querySelectorAll('[data-perm="multi_agent"]').forEach((x) => (x.checked = project.permissions.multi_agent));
        page.querySelectorAll('[data-perm="autonomous"]').forEach((x) => (x.checked = project.permissions.autonomous));
        updateComposer();
        showToast(el.dataset.perm === "multi_agent" ? (value ? "Đã bật Multi-Agent cho dự án này" : "Đã tắt Multi-Agent: agent đang chạy sẽ dừng") : el.dataset.perm === "autonomous" ? (value ? "Đã bật Tự phát triển cho dự án này" : "Đã tắt Tự phát triển") : el.dataset.perm === "network" ? (value ? "AI được tìm kiếm và đọc trang web cho dự án này" : "Đã tắt truy cập Internet") : el.dataset.perm === "browser" ? (value ? "AI được dùng trình duyệt để kiểm thử dự án này" : "Đã tắt trình duyệt") : "Đã đổi quyền dự án");
      } catch (err) { showToast(err.message, "error"); }
    } else if (el.dataset.mcp && project) {
      const m = mcpServers.find((x) => x.id === el.dataset.mcp);
      if (el.checked && !confirm(`Cho AI dùng MCP server ${m?.name} trong dự án ${project.name}?\n\nServer chạy bằng lệnh ${m?.command} trên máy bạn và có thể thao tác ngoài thư mục dự án (vd điều khiển màn hình). ${m?.auto_approve ? "Server này được đánh dấu tự duyệt: AI gọi công cụ không cần hỏi." : "Mỗi lần AI gọi công cụ của server sẽ hỏi bạn duyệt."}`)) { el.checked = false; return; }
      const ids = [...page.querySelectorAll("[data-mcp]")].filter((x) => x.checked).map((x) => x.dataset.mcp);
      try {
        const r = await agent(`/projects/${project.id}`, { method: "PATCH", body: { mcp: [...new Set(ids)] } });
        project = r.project;
        projects = projects.map((x) => (x.id === project.id ? project : x));
        showToast(el.checked ? `Đã cho dùng MCP ${m?.name}` : `Đã tắt MCP ${m?.name}`);
      } catch (err) { el.checked = !el.checked; showToast(err.message, "error"); }
    } else if (el.id === "cdSessionPick" && el.value) {
      await openSession(el.value);
    } else if ((el.id === "cdModel" || el.id === "cdReason") && session) {
      const body = el.id === "cdModel" ? { model: el.value } : { reasoning: el.value || "default" };
      try { await agent(`/sessions/${session.id}`, { method: "PATCH", body }); Object.assign(session, el.id === "cdModel" ? { model: el.value } : { reasoning: el.value || null }); } catch (err) { showToast(err.message, "error"); }
    }
  });

  page.addEventListener("keydown", (e) => {
    if (e.target.id === "cdInput" && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); act("send"); }
  });
  page.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (b) act(b.dataset.act, b);
  });

  async function act(a, b) {
    try {
      if (a === "back") { if (view === "project" || view === "settings") { view = "home"; session = null; stream?.abort(); render(); } else close(); }
      else if (a === "settings") { view = "settings"; stream?.abort(); render(); }
      else if (a === "unpair") { conn = { port: conn.port, token: "" }; saveKey("vico_agent", conn); status = "idle"; stream?.abort(); render(); }
      else if (a === "del-prov") { await agent(`/providers/${b.dataset.id}`, { method: "DELETE" }); config = await agent("/config"); render(); }
      else if (a === "vico-login") { if (typeof openAuth === "function") openAuth("login", "Đăng nhập tài khoản Vico để dùng AI của Vico trong Coding"); }
      else if (a === "vico-ai") {
        b.disabled = true;
        // mã kết nối riêng cho Agent (chỉ gọi AI được, thu hồi được); key nhà cung cấp nằm trên máy chủ Vico
        const t = await VicoAuth.call("/api/coding/tokens", { method: "POST", body: { name: document.documentElement.classList.contains("is-desktop") ? "Vico Coding (máy tính)" : "Vico Coding (web)" } });
        const token = t.token;
        const r = await fetch(VICO_API + "/api/coding/v1/models", { headers: { authorization: "Bearer " + token } });
        const list = (await r.json().catch(() => ({}))).data || [];
        if (!r.ok || !list.length) throw new Error("Máy chủ Vico chưa có model nào dùng được (Vico Admin > Cấu hình AI)");
        modelNames = Object.fromEntries(list.map((m) => [m.id, m.name || m.id]));
        saveKey("vico_coding_model_names", modelNames);
        await agent("/providers/vico", { method: "PUT", body: { name: "Vico AI", base_url: VICO_API + "/api/coding/v1", api_key: token, models: list.map((m) => m.id), make_default: true, default_model: "vico-auto" } });
        config = await agent("/config");
        showToast("Đã kết nối AI của Vico: Coding dùng cấu hình của Vico Admin");
        view = "home";
        render();
      }
      else if (a === "vico-ai-off") {
        if (!confirm("Ngắt AI của Vico khỏi Coding? Mã kết nối trên máy này bị xoá.")) return;
        await agent("/providers/vico", { method: "DELETE" });
        config = await agent("/config");
        render();
      }
      else if (a === "load-models") {
        const p = config.providers.find((x) => x.id !== "vico");
        if (!p) return showToast("Lưu nhà cung cấp trước rồi lấy danh sách model", "error");
        const { models } = await agent(`/providers/${p.id}/models`);
        await agent(`/providers/${p.id}`, { method: "PUT", body: { name: p.name, base_url: p.base_url, models } });
        config = await agent("/config");
        render();
        showToast(`Có ${models.length} model`);
      }
      else if (a === "mode") {
        if (mode === "ide" && b.dataset.mode === "chat" && VicoCodingIDE.hasDirty() && !confirm("Có file chưa lưu trong IDE. Chuyển sang Chat và bỏ thay đổi chưa lưu?")) return;
        mode = b.dataset.mode; saveKey("vico_coding_mode", mode); render();
      }
      else if (a === "open-project") await openProject(b.dataset.id);
      else if (a === "open-session") await openSession(b.dataset.id);
      else if (a === "new-session") {
        const r = await agent(`/projects/${project.id}/sessions`, { method: "POST", body: { title: "Phiên mới" } });
        await refreshSessions();
        session = r.session;
        running = null;
        saveKey("vico_coding_last", { project: project.id, session: session.id });
        render();
        document.getElementById("cdInput")?.focus();
      }
      else if (a === "send") {
        const input = document.getElementById("cdInput");
        const text = input.value.trim();
        if (!text || running) return;
        // phiên mới: đặt tên theo yêu cầu đầu tiên
        if (session.title === "Phiên mới") { session.title = text.slice(0, 60); agent(`/sessions/${session.id}`, { method: "PATCH", body: { title: session.title } }).then(refreshSessions).then(() => {}); }
        const r = await agent(`/sessions/${session.id}/messages`, { method: "POST", body: { text } });
        running = r.run_id;
        input.value = "";
        updateComposer();
      }
      else if (a === "stop") await agent(`/sessions/${session.id}/cancel`, { method: "POST" });
      else if (a === "auto-open") { const f = document.getElementById("cdAutoForm"); f.hidden = false; f.querySelector("textarea").focus(); }
      else if (a === "auto-close") document.getElementById("cdAutoForm").hidden = true;
      else if (a === "auto-report") {
        const r = await fetch(`${base()}/runs/${b.dataset.run}/report`, { headers: { authorization: "Bearer " + conn.token } });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Không tải được báo cáo");
        const url = URL.createObjectURL(new Blob([await r.text()], { type: "text/markdown" }));
        Object.assign(document.createElement("a"), { href: url, download: `bao-cao-tu-phat-trien-${b.dataset.run}.md` }).click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      else if (a === "mcp-test") {
        const out = page.querySelector(`[data-mcp-tools="${CSS.escape(b.dataset.id)}"]`);
        out.hidden = false;
        out.textContent = "Đang khởi động server…";
        try {
          const r = await agent(`/mcp/${b.dataset.id}/test`, { method: "POST" });
          out.textContent = r.tools.length ? `Kết nối được, ${r.tools.length} công cụ: ${r.tools.map((t) => t.name).join(", ")}` : "Kết nối được nhưng server không có công cụ nào";
        } catch (err) { out.textContent = err.message; out.classList.add("cd-error"); }
      }
      else if (a === "mcp-del") {
        if (!confirm("Xoá MCP server này? Các dự án đang cho dùng sẽ không dùng được nữa.")) return;
        await agent(`/mcp/${b.dataset.id}`, { method: "DELETE" });
        ({ servers: mcpServers } = await agent("/mcp"));
        ({ projects } = await agent("/projects"));
        if (project) project = projects.find((x) => x.id === project.id) || project;
        render();
      }
      else if (a === "shot") {
        const src = b.querySelector("img")?.src;
        if (!src) return;
        const box = Object.assign(document.createElement("div"), { className: "cd-lightbox", innerHTML: `<img src="${src}" alt="Ảnh chụp trình duyệt" />` });
        box.addEventListener("click", () => box.remove());
        document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { box.remove(); document.removeEventListener("keydown", k); } });
        document.body.appendChild(box);
      }
      else if (a === "pause") await agent(`/sessions/${session.id}/${paused ? "resume" : "pause"}`, { method: "POST" });
      else if (a === "ag-focus") agents.get(b.dataset.ag)?.el.scrollIntoView({ behavior: "smooth", block: "center" });
      else if (a === "ag") {
        const ag = agents.get(b.dataset.ag), what = b.dataset.do;
        let body;
        if (what === "message") {
          const text = prompt(`Nhắn cho agent ${ag.name} (agent đọc ở bước kế tiếp):`);
          if (!text || !text.trim()) return;
          body = { text: text.trim() };
        }
        if (what === "discard" && !confirm(`Bỏ agent ${ag.name}? Thay đổi chưa gộp của agent này sẽ bị xoá.`)) return;
        if (what === "cancel" && !confirm(`Dừng agent ${ag.name}?`)) return;
        b.disabled = true;
        const r = await agent(`/sessions/${session.id}/agents/${ag.id}/${what}`, { method: "POST", body });
        if (what === "merge") showToast(r.conflicts.length ? `Đã gộp, có xung đột ở ${r.conflicts.length} file` : `Đã gộp ${r.applied.length} file vào dự án`, r.conflicts.length ? "error" : undefined);
      }
      else if (a === "retry") { const r = await agent(`/sessions/${session.id}/retry`, { method: "POST" }); running = r.run_id; updateComposer(); }
      else if (a === "approve") { b.closest(".cd-approve")?.querySelectorAll("button").forEach((x) => (x.disabled = true)); await agent(`/sessions/${session.id}/approvals/${b.dataset.call}`, { method: "POST", body: { approve: b.dataset.ok === "1" } }); }
      else if (a === "undo") { const r = await agent(`/checkpoints/${b.dataset.cp}/undo`, { method: "POST" }); showToast(`Đã khôi phục ${r.path}`); }
      else if (a === "undo-run") {
        if (!confirm("Hoàn tác mọi thay đổi file của lượt chạy này?")) return;
        const r = await agent(`/runs/${b.dataset.run}/undo`, { method: "POST" });
        b.replaceWith(Object.assign(document.createElement("span"), { className: "cd-small cd-muted", textContent: `Đã hoàn tác ${r.files.length} thay đổi` }));
      }
      else if (a === "revoke") {
        if (!confirm(`Thu hồi quyền thư mục ${project.root}? AI sẽ không đọc / sửa được thư mục này nữa. File của bạn không bị xoá.`)) return;
        await agent(`/projects/${project.id}`, { method: "DELETE" });
        ({ projects } = await agent("/projects"));
        project = null; session = null; view = "home"; stream?.abort(); render();
      }
    } catch (err) { showToast(err.message, "error"); }
  }

  // vừa đăng nhập / đăng xuất Vico khi đang ở Cài đặt: cập nhật nút "Dùng AI của Vico"
  window.addEventListener("vico-user", () => { if (!page.hidden && status === "ok" && (view === "settings" || !config.providers.length)) render(); });

  // Link trực tiếp: vico.kiyo.vn/#coding mở thẳng chế độ Coding
  if (location.hash === "#coding") setTimeout(open, 0);

  return { open, close };
})();
