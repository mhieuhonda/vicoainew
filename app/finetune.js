/* =========================================================
   Vico AI desktop - FINETUNE: chạy AI ngay trên máy bằng GPU
   - Quét cấu hình máy (GPU, VRAM, RAM, CPU, ổ đĩa) -> đề xuất model chạy được
   - Danh sách toàn bộ model (ô vuông: tên, tham số, VRAM cần...) + nút "Chạy model"
   - Model đang chạy hiện trong ô chọn model ở đầu khung chat và trong Group AI
   Nạp sau desktop.js. Chỉ có ở bản desktop.
   ========================================================= */
(() => {
  const D = window.vicoDesktop;
  if (!D || !D.localCatalog) return;
  const root = document.documentElement;
  const GB = 2 ** 30; // GB kiểu Windows (1024³), khớp số Task Manager / File Explorer hiện
  const SVG = (p, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const ICON = {
    tune: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 9.5h5v5h-5zM9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>',
    ram: '<rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 10v4M11 10v4M15 10v4M6 17v2.5M18 17v2.5"/>',
    cpu: '<rect x="5" y="5" width="14" height="14" rx="2.5"/><path d="M9 1.5V5M15 1.5V5M9 19v3.5M15 19v3.5M1.5 9H5M1.5 15H5M19 9h3.5M19 15h3.5"/>',
    disk: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    play: '<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6l2 2.2h7.4A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nf = (n, d = 1) => Number(n).toLocaleString("vi-VN", { maximumFractionDigits: d });
  const fmtGb = (gb) => `${nf(gb, gb < 10 ? 2 : 1)} GB`;
  const fmtParams = (m) => (m.params < 1 ? `${nf(m.params * 1000, 0)} triệu` : `${nf(m.params, 2)} tỷ`);
  const fmtCtx = (c) => (c >= 1e6 ? `${nf(c / 1048576, 1)}M` : `${Math.round(c / 1024)}K`);
  const clean = (err) => String((err && err.message) || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

  let cat = { vendors: {}, vendorOrder: [], models: [] };
  let st = { running: null, loading: null };
  let scanData = null, scanning = false;
  const progress = {}; // id -> { received, total, speed } khi đang tải
  let loadPct = 0;
  let filter = "all", query = "";
  const modelById = (id) => cat.models.find((m) => m.id === id);

  /* ---------- Đánh giá máy ---------- */
  // VRAM cần ≈ file model + bộ nhớ ngữ cảnh (8K token) + phần đệm của engine
  const sizeOf = (m) => (m.gb * 1e9) / GB; // dung lượng trên Hugging Face ghi theo GB thập phân
  const needGb = (m) => sizeOf(m) * 1.08 + Math.min(1.2, 0.08 + m.params * 0.025) + 0.35;
  function machine() {
    if (!scanData) return null;
    const g = scanData.main;
    const vram = g ? g.vram / GB : 0;
    const usable = Math.max(0, vram * 0.94 - 0.3);
    const ram = scanData.ram / GB;
    const weak = !g || vram < 3 || ram < 7.5 || !scanData.engine.gpu;
    const tier = weak ? "Chưa đủ mạnh" : usable >= 22 ? "Rất mạnh" : usable >= 10 ? "Mạnh" : usable >= 5.5 ? "Khá" : "Cơ bản";
    return { g, vram, usable, ram, freeRam: scanData.freeRam / GB, disk: scanData.disk == null ? Infinity : scanData.disk / GB, weak, tier };
  }
  function fitOf(m) {
    const mc = machine();
    if (!mc) return "unknown";
    if (!m.downloaded && sizeOf(m) + 0.3 > mc.disk) return "disk";
    const need = needGb(m);
    if (!mc.weak && need <= mc.usable) return "gpu";
    if (need <= (mc.weak ? 0 : mc.usable) + mc.freeRam * 0.8 - 0.5) return "partial"; // một phần lớp chạy trên CPU
    return "no";
  }
  const FIT = {
    gpu: ["Chạy mượt", "ok"], partial: ["Chạy được · chậm hơn", "mid"],
    no: ["Không đủ bộ nhớ", "bad"], disk: ["Thiếu dung lượng ổ", "bad"], unknown: ["", ""],
  };
  const vendorRank = (m) => cat.vendorOrder.indexOf(m.vendor);
  const sorted = (list) => list.slice().sort((a, b) => vendorRank(a) - vendorRank(b) || b.params - a.params);
  /** Đề xuất: mỗi hãng lấy model lớn nhất chạy trọn trên GPU, ưu tiên hãng nổi tiếng, tối đa 6. */
  function suggestions() {
    const mc = machine();
    if (!mc || mc.weak) return [];
    const best = {};
    for (const m of sorted(cat.models)) if (fitOf(m) === "gpu" && !best[m.vendor]) best[m.vendor] = m;
    return cat.vendorOrder.map((v) => best[v]).filter(Boolean).slice(0, 6);
  }

  /* ---------- Trang Finetune ---------- */
  const btn = document.createElement("button");
  btn.className = "rail-btn ft-btn";
  btn.id = "finetuneBtn";
  btn.title = "Finetune · chạy AI trên máy";
  btn.innerHTML = `${SVG(ICON.tune, 20)}<span class="lbl">Finetune</span><span class="lbl badge-desk">GPU</span>`;
  ($("#groupNav") || $("#groupBtn")).after(btn); // sau danh sách nhóm của Group AI

  const page = document.createElement("section");
  page.className = "ft-page";
  page.id = "ftPage";
  page.hidden = true;
  page.innerHTML = `
    <div class="ft-inner">
      <header class="ft-head">
        <button class="ft-back" id="ftBack" title="Quay lại chat">${SVG(ICON.back, 18)}</button>
        <div><h2>Finetune</h2><p>Chạy AI ngay trên máy bạn bằng GPU: miễn phí, không trừ credit, dữ liệu không rời khỏi máy.</p></div>
      </header>
      <section class="ft-scan" id="ftScan"></section>
      <section class="ft-running" id="ftRunning" hidden></section>
      <section class="ft-sec">
        <div class="ft-sec-head"><h3>Đề xuất cho máy của bạn</h3><small id="ftSugHint">Ưu tiên model của các hãng lớn, chạy trọn trên GPU</small></div>
        <div class="ft-grid" id="ftSuggest"></div>
      </section>
      <section class="ft-sec">
        <div class="ft-sec-head"><h3>Tất cả model</h3><small id="ftCount"></small></div>
        <div class="ft-tools">
          <div class="ft-chips" role="tablist">
            <button data-f="all" class="on">Tất cả</button><button data-f="fit">Chạy được trên máy</button><button data-f="dl">Đã tải</button>
          </div>
          <label class="ft-search">${SVG(ICON.search, 15)}<input id="ftQuery" placeholder="Tìm model hoặc hãng…" /></label>
        </div>
        <div class="ft-grid" id="ftAll"></div>
        <p class="ft-legal">Model được tải từ Hugging Face. Mỗi model có giấy phép riêng của nhà phát triển (VD Llama Community License, Gemma Terms of Use, Apache 2.0); bạn có trách nhiệm đọc và tuân thủ trước khi dùng, nhất là khi dùng cho mục đích thương mại. Model chạy hoàn toàn trên máy bạn, tin nhắn không gửi lên máy chủ Vico.</p>
      </section>
    </div>`;
  $(".main").appendChild(page);

  function openPage(on = true) {
    if (on && typeof VicoCloud !== "undefined") VicoCloud.close(); // không mở chồng lên trang Thuê máy chủ
    page.hidden = !on;
    root.classList.toggle("ft-open", on);
    btn.classList.toggle("active", on);
    if (on) {
      closePops && closePops();
      renderAll();
      if (!scanData && !scanning) runScan();
    }
  }
  btn.onclick = () => openPage(page.hidden);
  $("#ftBack").onclick = () => openPage(false);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !page.hidden && !document.querySelector(".modal:not([hidden])")) openPage(false); });
  // Mở chat / phiên mới thì rời trang Finetune
  const ftNewChat = newChat;
  newChat = () => { openPage(false); ftNewChat(); };
  const ftOpenChat = openChat;
  openChat = (id) => { openPage(false); ftOpenChat(id); };

  async function runScan() {
    scanning = true;
    renderScan();
    try { scanData = await D.localScan(); }
    catch (err) { showToast("Không quét được cấu hình máy: " + clean(err), "warn"); }
    scanning = false;
    renderAll();
  }
  function renderScan() {
    const box = $("#ftScan");
    if (scanning || !scanData) {
      box.innerHTML = `<div class="ft-scanning"><span class="ft-radar"><i></i></span>
        <div><b>Đang quét cấu hình máy…</b><small>GPU, VRAM, RAM, CPU, ổ đĩa và engine chạy model</small></div></div>`;
      return;
    }
    const mc = machine(), s = scanData;
    const gpuName = mc.g ? mc.g.name : (s.gpus[0] && s.gpus[0].name) || "Không tìm thấy GPU";
    const fitMax = sorted(cat.models).filter((m) => fitOf(m) === "gpu").reduce((a, m) => Math.max(a, m.params), 0);
    const engine = s.engine.gpu ? `${s.engine.gpu === "vulkan" ? "Vulkan" : s.engine.gpu.toUpperCase()} · ${s.engine.device || ""}` : "Chỉ CPU" + (s.engine.error ? " (lỗi engine)" : "");
    const tile = (ic, label, value, sub) => `<div class="ft-spec">${SVG(ic, 18)}<span><small>${label}</small><b>${esc(value)}</b>${sub ? `<em>${esc(sub)}</em>` : ""}</span></div>`;
    box.innerHTML = `
      <div class="ft-scan-top">
        <div class="ft-tier ${mc.weak ? "weak" : ""}"><span>${SVG(mc.weak ? ICON.close : ICON.bolt, 16)}</span>
          <div><b>Máy của bạn: ${mc.tier}</b><small>${mc.weak
            ? "Cần GPU rời (NVIDIA/AMD) từ 4 GB VRAM và RAM từ 8 GB để chạy AI trên máy mượt mà."
            : `Chạy mượt model tới khoảng ${nf(fitMax, 1)} tỷ tham số hoàn toàn trên GPU.`}</small></div></div>
        <span class="ft-scan-acts">
          <button class="btn-ghost sm" id="ftOpenDir" title="${esc(s.modelsDir)}">${SVG(ICON.folder, 15)}Thư mục model</button>
          <button class="btn-ghost sm" id="ftRescan">${SVG(ICON.refresh, 15)}Quét lại</button>
        </span>
      </div>
      <div class="ft-specs-grid">
        ${tile(ICON.chip, "GPU", gpuName, mc.g ? `${fmtGb(mc.vram)} VRAM` : "Không có GPU rời")}
        ${tile(ICON.ram, "RAM", fmtGb(mc.ram), `Còn trống ${fmtGb(mc.freeRam)}`)}
        ${tile(ICON.cpu, "CPU", s.cpu.replace(/\s+/g, " ").replace(/\(R\)|\(TM\)/g, ""), `${s.cores} luồng`)}
        ${tile(ICON.disk, "Ổ đĩa trống", mc.disk === Infinity ? "?" : fmtGb(mc.disk), "Nơi lưu model")}
        ${tile(ICON.bolt, "Engine", engine, "llama.cpp")}
      </div>`;
    $("#ftRescan").onclick = runScan;
    $("#ftOpenDir").onclick = () => D.localOpenDir();
  }
  function renderRunning() {
    const box = $("#ftRunning");
    const m = st.running && modelById(st.running.id);
    box.hidden = !m;
    if (!m) return;
    const i = st.running.info || {};
    const layers = i.totalLayers ? `${i.gpuLayers}/${i.totalLayers} lớp trên GPU` : `${i.gpuLayers} lớp trên GPU`;
    box.innerHTML = `<span class="ft-dot"></span>
      <div><b>${esc(m.name)} đang chạy</b><small>${esc(i.device || "GPU")} · ${layers} · ngữ cảnh ${fmtCtx(i.contextSize || 8192)}</small></div>
      <button class="btn-primary sm" data-act="chat">Mở chat</button>
      <button class="btn-ghost sm" data-act="stop" data-id="${m.id}">${SVG(ICON.stop, 12)}Dừng</button>`;
  }

  function actionsHtml(m) {
    const fit = fitOf(m);
    const run = st.running && st.running.id === m.id, load = st.loading === m.id, p = progress[m.id];
    if (run) return `<button class="ft-run on" data-act="stop" data-id="${m.id}"><span class="ft-dot"></span>Đang chạy · Dừng</button>`;
    if (p) {
      const pct = p.total ? Math.floor((p.received / p.total) * 100) : 0;
      return `<button class="ft-run busy" style="--p:${pct}%" disabled><span>Đang tải ${pct}%${p.speed ? ` · ${nf(p.speed / 1e6, 1)} MB/s` : ""}</span></button>
        <button class="ft-icon" data-act="cancel" data-id="${m.id}" title="Huỷ tải">${SVG(ICON.close, 15)}</button>`;
    }
    if (load) return `<button class="ft-run busy" style="--p:${loadPct}%" disabled><span>Đang khởi động… ${loadPct}%</span></button>`;
    if (fit === "no" || fit === "disk") return `<button class="ft-run" disabled>${fit === "disk" ? "Ổ đĩa không đủ chỗ" : "Máy không đủ bộ nhớ"}</button>`;
    return `<button class="ft-run" data-act="run" data-id="${m.id}">${SVG(ICON.play, 13)}Chạy model</button>` +
      (m.downloaded ? `<button class="ft-icon" data-act="delete" data-id="${m.id}" title="Xoá file model (${fmtGb(sizeOf(m))})">${SVG(ICON.trash, 15)}</button>` : "");
  }
  function cardHtml(m) {
    const v = cat.vendors[m.vendor] || { name: m.vendor, color: "#888", mark: "?" };
    const fit = fitOf(m), [fitText, fitCls] = FIT[fit];
    const run = st.running && st.running.id === m.id;
    return `<article class="ft-card${run ? " running" : ""}" data-id="${m.id}">
      <div class="ft-card-top">
        <span class="ft-vendor"><i style="--c:${v.color}">${esc(v.mark)}</i>${esc(v.name)}</span>
        ${run ? `<span class="ft-fit run">Đang chạy</span>` : fitText ? `<span class="ft-fit ${fitCls}">${fitText}</span>` : ""}
      </div>
      <h4 class="ft-name">${esc(m.name)}</h4>
      <p class="ft-desc" title="${esc(m.desc)}">${esc(m.desc)}</p>
      <dl class="ft-specs">
        <div><dt>Tham số</dt><dd>${fmtParams(m)}${m.active ? `<em>${nf(m.active, 1)} tỷ hoạt động</em>` : ""}</dd></div>
        <div><dt>VRAM cần</dt><dd>~${fmtGb(needGb(m))}</dd></div>
        <div><dt>${m.downloaded ? "Đã tải" : "Tải về"}</dt><dd>${fmtGb(sizeOf(m))}</dd></div>
        <div><dt>Ngữ cảnh</dt><dd>${fmtCtx(m.ctx)}</dd></div>
      </dl>
      <div class="ft-meta">${esc(m.quant)} · ${esc(m.license)}${m.tags.length ? " · " + m.tags.map(esc).join(" · ") : ""}</div>
      <div class="ft-actions">${actionsHtml(m)}</div>
    </article>`;
  }
  function renderLists() {
    const mc = machine();
    const sug = suggestions();
    $("#ftSuggest").innerHTML = !mc ? `<div class="ft-empty">Đang quét máy để đề xuất…</div>`
      : mc.weak ? `<div class="ft-empty weak">${SVG(ICON.chip, 26)}<b>Cấu hình máy chưa đủ để đề xuất model</b>
          <span>Chạy AI trên máy cần GPU rời (NVIDIA hoặc AMD) có từ 4 GB VRAM và RAM từ 8 GB. Bạn vẫn có thể xem toàn bộ model ở dưới.</span></div>`
      : sug.length ? sug.map(cardHtml).join("") : `<div class="ft-empty">Chưa có model nào vừa với GPU của bạn.</div>`;
    const q = query.trim().toLowerCase();
    const list = sorted(cat.models).filter((m) =>
      (filter === "all" || (filter === "fit" && ["gpu", "partial"].includes(fitOf(m))) || (filter === "dl" && m.downloaded)) &&
      (!q || `${m.name} ${(cat.vendors[m.vendor] || {}).name} ${m.tags.join(" ")}`.toLowerCase().includes(q)));
    $("#ftAll").innerHTML = list.map(cardHtml).join("") || `<div class="ft-empty">Không có model phù hợp.</div>`;
    $("#ftCount").textContent = `${cat.models.length} model · ${cat.models.filter((m) => m.downloaded).length} đã tải`;
  }
  function renderAll() {
    if (page.hidden) return;
    renderScan();
    renderRunning();
    renderLists();
  }
  // Cập nhật riêng phần nút của một model (lúc đang tải / khởi động) cho đỡ nháy
  function paintActions(id) {
    const m = modelById(id);
    if (!m || page.hidden) return;
    page.querySelectorAll(`.ft-card[data-id="${CSS.escape(id)}"] .ft-actions`).forEach((a) => (a.innerHTML = actionsHtml(m)));
  }

  page.querySelector(".ft-chips").onclick = (e) => {
    const b = e.target.closest("[data-f]");
    if (!b) return;
    filter = b.dataset.f;
    page.querySelectorAll(".ft-chips button").forEach((x) => x.classList.toggle("on", x === b));
    renderLists();
  };
  $("#ftQuery").oninput = (e) => { query = e.target.value; renderLists(); };
  page.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const id = b.dataset.id, m = id && modelById(id);
    if (b.dataset.act === "chat") { openPage(false); return els.input.focus(); }
    if (b.dataset.act === "stop") return D.localStop().catch((err) => showToast(clean(err), "warn"));
    if (b.dataset.act === "cancel") return D.localCancel(id);
    if (b.dataset.act === "delete") {
      if (!confirm(`Xoá file model ${m.name} (${fmtGb(sizeOf(m))}) khỏi máy?`)) return;
      try { cat = await D.localDelete(id); syncGroupModels(); renderAll(); showToast(`Đã xoá ${m.name}.`); }
      catch (err) { showToast(clean(err), "warn"); }
      return;
    }
    if (b.dataset.act === "run") return startModel(m);
  });

  async function startModel(m) {
    if (st.loading) return showToast("Đang khởi động một model khác, đợi chút nhé.", "warn");
    const cur = st.running && modelById(st.running.id);
    if (cur && !confirm(`Máy chỉ chạy được 1 model cùng lúc. Dừng ${cur.name} để chạy ${m.name}?`)) return;
    if (fitOf(m) === "partial" && !m.downloaded &&
      !confirm(`${m.name} cần khoảng ${fmtGb(needGb(m))} VRAM, nhiều hơn GPU của bạn. Một phần model sẽ chạy trên CPU nên chậm hơn. Vẫn tải ${fmtGb(sizeOf(m))} và chạy?`)) return;
    try {
      if (cur) await D.localStop();
      if (!m.downloaded) { progress[m.id] = { received: 0, total: m.gb * 1e9, speed: 0 }; paintActions(m.id); }
      loadPct = 0;
      await D.localStart(m.id);
      await setChatModel("local:" + m.id, true);
      showToast(`${m.name} đang chạy trên máy và đã được chọn cho chat. Đổi model ở ô chọn model đầu trang.`, "success");
    } catch (err) {
      delete progress[m.id];
      const msg = clean(err);
      if (msg !== "Đã huỷ tải") showToast(`Không chạy được ${m.name}: ${msg}`, "warn");
    }
    await refreshCatalog();
  }
  async function refreshCatalog() {
    cat = await D.localCatalog();
    st = { ...st, running: cat.running, loading: cat.loading };
    syncGroupModels();
    renderAll();
    renderPicker();
    updateSend();
  }

  D.onLocal((kind, d) => {
    if (kind === "progress") {
      if (d.done || d.error) { delete progress[d.id]; if (d.done) refreshCatalog(); else paintActions(d.id); }
      else { progress[d.id] = d; paintActions(d.id); }
    } else if (kind === "load") {
      loadPct = d.progress || 0;
      if (d.id) paintActions(d.id);
    } else if (kind === "status") {
      st = { ...st, running: d.running, loading: d.loading };
      if (d.error) showToast(d.error, "warn");
      renderAll();
      renderPicker();
      updateSend();
    } else if (kind === "delta") {
      const h = deltaHandlers.get(d.reqId);
      if (h) h(d);
    }
  });

  /* ---------- Ô chọn model đầu trang: thêm các model đã tải về máy ---------- */
  const LOCAL = "local:";
  const chatLocal = () => {
    if (root.classList.contains("group-on") || !String(chatModel).startsWith(LOCAL)) return null;
    const m = modelById(chatModel.slice(LOCAL.length));
    return m && m.downloaded ? m : null;
  };
  function renderPicker() { renderModelPicker(); }
  registerModelSource(() => {
    const dev = (st.running && st.running.info && st.running.info.device) || "GPU";
    const items = sorted(cat.models).filter((m) => m.downloaded).map((m) => ({
      id: LOCAL + m.id, name: m.name, group: "Chạy trên máy · miễn phí",
      sub: st.running && st.running.id === m.id ? `Đang chạy (${dev}) · ${fmtParams(m)} tham số`
        : st.loading === m.id ? "Đang khởi động…" : `Đã tải · ${fmtParams(m)} tham số · chọn để chạy`,
      // Chọn model chưa chạy thì khởi động luôn (máy chỉ chạy 1 model cùng lúc)
      onPick: async () => {
        if (st.running && st.running.id === m.id) return true;
        const cur = st.running && modelById(st.running.id);
        if (cur && !confirm(`Máy chỉ chạy được 1 model cùng lúc. Dừng ${cur.name} để chạy ${m.name}?`)) return false;
        if (cur) await D.localStop();
        showToast(`Đang khởi động ${m.name} trên máy…`);
        await D.localStart(m.id);
        return true;
      },
    }));
    items.push({ id: "local-manage", name: "Tải / quản lý model trên máy…", group: "Chạy trên máy · miễn phí", action: true, onPick: () => { openPage(true); return false; } });
    return items;
  });

  /* ---------- Trả lời bằng model trên máy ---------- */
  const deltaHandlers = new Map();
  const THOUGHT = { low: 0, medium: 0, high: 1024, max: 4096 }; // ultrathink: không giới hạn phần suy nghĩ
  async function toLocalMessages(messages) {
    const out = [];
    for (const m of messages) {
      let content = m.content || "";
      if (m.attachments && m.attachments.length && typeof VicoAttach === "object") {
        const parts = await VicoAttach.toApiParts({ attachments: m.attachments }).catch(() => []);
        for (const p of parts) {
          content += p.type === "text" ? `\n\nNội dung file "${p.name}":\n${p.text}` : `\n\n(Đính kèm ${p.name}: model trên máy chỉ đọc được chữ, chưa xem được file này.)`;
        }
      }
      out.push({ role: m.role === "user" ? "user" : "assistant", content });
    }
    return out;
  }
  async function ensureRunning(id) {
    if (st.running && st.running.id === id) return;
    const m = modelById(id);
    if (!m || !m.downloaded) throw new Error(`Model ${m ? m.name : id} chưa được tải. Mở Finetune để tải và chạy.`);
    showToast(`Đang khởi động ${m.name} trên máy…`);
    await D.localStart(id);
  }
  // Model nhỏ (dưới 20 tỷ tham số dense, hoặc dưới 100 tỷ tham số MoE) dễ bị system prompt dài làm lệch câu trả lời
  // nên không gửi system prompt: người dùng nhắn gì thì gửi thẳng tới model.
  const isSmall = (m) => (m.active ? m.params < 100 : m.params < 20);
  /** Gọi model trên máy. o: { system, messages, level, signal, onDelta, keepSystem } (keepSystem: Agent cần hướng dẫn dùng công cụ) */
  async function localAsk(id, o) {
    const model = modelById(id), small = !!model && isSmall(model);
    if (small && !o.keepSystem) o = { ...o, system: "" };
    // Model nhỏ: không áp dụng mức suy luận (độ thông minh) -> luôn trả lời trực tiếp, không "nghĩ" trước
    const thoughtBudget = small ? 0 : THOUGHT[o.level];
    window.VicoLocal.lastSystemLen = (o.system || "").length; // để kiểm tra tự động
    window.VicoLocal.lastMessage = ((o.messages || []).slice(-1)[0] || {}).content || "";
    window.VicoLocal.lastThought = thoughtBudget;
    await ensureRunning(id);
    const reqId = "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    deltaHandlers.set(reqId, (d) => { if (d.text && o.onDelta) o.onDelta(d.text); });
    const abort = () => D.localAbort(reqId);
    if (o.signal) o.signal.addEventListener("abort", abort, { once: true });
    try {
      const r = await D.localChat({ reqId, system: o.system, messages: o.messages, thoughtBudget, maxTokens: 4096 });
      if (o.signal && o.signal.aborted) throw new DOMException("Đã dừng", "AbortError");
      return r.text;
    } catch (err) {
      if ((o.signal && o.signal.aborted) || (err && err.name === "AbortError")) throw new DOMException("Đã dừng", "AbortError");
      throw new Error(clean(err));
    } finally {
      deltaHandlers.delete(reqId);
      if (o.signal) o.signal.removeEventListener("abort", abort);
    }
  }
  const ftEngine = replyEngine;
  replyEngine = () => {
    const m = chatLocal();
    if (!m) return ftEngine();
    return {
      cost: 0,
      label: `${m.name} · trên máy`,
      ask: async (messages, topicId, project, level, modeId, opts = {}) =>
        (await ensureRunning(m.id), localAsk)(m.id, { system: buildSystemPrompt(topicId, project, modeId, { local: true }), messages: await toLocalMessages(messages), level, signal: opts.signal, onDelta: opts.onDelta }),
    };
  };

  /* ---------- Model nhỏ trong chat: tắt độ thông minh (mức suy luận) và chế độ làm việc (Deep Research…) ---------- */
  const SMALL_NOTE = "Model nhỏ chạy trên máy không dùng độ thông minh (mức suy luận) và chế độ làm việc như Deep Research: model trả lời trực tiếp.";
  const smallChat = () => { const m = chatLocal(); return m && isSmall(m) ? m : null; };
  function syncComposer() {
    const small = !!smallChat();
    if (els.form.classList.contains("cm-small") === small) return;
    els.form.classList.toggle("cm-small", small);
    $("#modeBtn").title = small ? SMALL_NOTE : "Chế độ làm việc";
    $("#reasonBtn").title = small ? SMALL_NOTE : "Mức suy luận";
    $("#modeBtn").setAttribute("aria-disabled", small);
    $("#reasonBtn").setAttribute("aria-disabled", small);
    if (small) { toggleReason(false); toggleModeMenu(false); }
  }
  // Bấm 2 nút đó khi đang dùng model nhỏ: không mở bảng chọn, chỉ báo lý do
  els.form.addEventListener("click", (e) => {
    if (!els.form.classList.contains("cm-small") || !e.target.closest("#modeBtn, #reasonBtn")) return;
    e.preventDefault();
    e.stopPropagation();
    showToast(SMALL_NOTE);
  }, true);
  // Dòng "đang suy nghĩ / đang nghiên cứu sâu" không áp dụng: chỉ hiện dấu đang gõ
  const ftTyping = typingHtml;
  typingHtml = () => (smallChat() ? '<span class="typing"><i></i><i></i><i></i></span>' : ftTyping());
  const ftUpdateSend = updateSend;
  updateSend = () => { ftUpdateSend(); syncComposer(); };

  /* ---------- Group AI / Agent: thêm các model đã tải ---------- */
  VICO_PROVIDERS.local = { name: "Model trên máy", needsKey: false, local: true };
  function syncGroupModels() {
    for (let i = VICO_MODELS.length - 1; i >= 0; i--) if (VICO_MODELS[i].provider === "local") VICO_MODELS.splice(i, 1);
    for (const m of sorted(cat.models)) if (m.downloaded) {
      VICO_MODELS.push({ id: "local:" + m.id, localId: m.id, provider: "local", name: m.name, desc: `Chạy trên máy · ${fmtParams(m)} tham số · ${fmtGb(sizeOf(m))}` });
    }
  }
  window.VicoLocal = {
    ask: (id, o) => localAsk(id, o),
    isRunning: (id) => !!(st.running && st.running.id === id),
    isSmall: (id) => { const m = modelById(id); return !!m && isSmall(m); },
    open: () => openPage(true),
  };

  refreshCatalog().catch(() => {});
})();
