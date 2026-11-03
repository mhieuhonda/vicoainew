/* =========================================================
   THUÊ MÁY CHỦ - Vico AI
   Chọn dịch vụ: Host web, Host server (sắp ra mắt), Training AI, Finetune.
   - Training AI: chọn GPU, số nhân CPU (1-64), RAM (1-128 GB) -> notebook kiểu Jupyter
   - Finetune: chọn loại GPU + số GPU (tối đa 2) -> đề xuất model phù hợp -> tinh chỉnh
   Dữ liệu GPU / giá / model: VICO_CLOUD (config.js). Chưa có máy chủ (apiUrl trống) thì chạy chế độ demo.
   ========================================================= */
const VicoCloud = (() => {
  const C = VICO_CLOUD;
  const root = document.documentElement;
  const demo = !C.apiUrl;
  const SVG = (p, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const IC = {
    cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.2 18.5z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.9 5.8 3.9 9s-1.3 6.2-3.9 9c-2.6-2.8-3.9-5.8-3.9-9S9.4 5.8 12 3z"/>',
    server: '<rect x="3.5" y="4" width="17" height="7" rx="2"/><rect x="3.5" y="13" width="17" height="7" rx="2"/><path d="M7.5 7.5h.01M7.5 16.5h.01M11 7.5h6M11 16.5h6"/>',
    flask: '<path d="M9 3h6M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3"/><path d="M7.5 14.5h9"/>',
    tune: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 9.5h5v5h-5zM9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>',
    cpu: '<rect x="5" y="5" width="14" height="14" rx="2.5"/><path d="M9 1.5V5M15 1.5V5M9 19v3.5M15 19v3.5M1.5 9H5M1.5 15H5M19 9h3.5M19 15h3.5"/>',
    ram: '<rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 10v4M11 10v4M15 10v4M6 17v2.5M18 17v2.5"/>',
    play: '<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    restart: '<path d="M4 4v6h6"/><path d="M5.5 15a7 7 0 1 0 1.6-7.4L4 10"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6l2 2.2h7.4A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
    chart: '<path d="M4 19h16M7 16V10M12 16V5M17 16v-4"/>',
    text: '<path d="M5 6h14M5 12h14M5 18h9"/>',
    clear: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    data: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  };
  const esc = (s) => escapeHtml(String(s ?? ""));
  const nf = (n, d = 2) => Number(n).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: d });
  // Giá gốc quy đổi ra VNĐ (pháp luật VN không cho niêm yết giá bằng ngoại tệ)
  const usd = (n) => "≈ " + vnd(n * VICO_LEGAL.usdToVnd);
  const gpuById = (id) => C.gpus.find((g) => g.id === id) || C.gpus[0];
  const perSec = (cfg) => gpuById(cfg.gpu).perSec * (cfg.gpuCount || 1) + (cfg.cpu || 0) * C.cpuPerCoreSec + (cfg.ram || 0) * C.ramPerGiBSec;
  const RATE = C.creditsPerUsd || 130;                       // 1 USD = 130 credit
  const toCredits = (usdAmount) => usdAmount * RATE;
  const cr = (usdAmount) => { const n = toCredits(usdAmount); return `${n < 10 ? nf(n, 1) : fmt(Math.round(n))} credit`; };
  const balanceHours = (pps) => (user ? user.total / toCredits(pps * 3600) : 0); // số dư hiện tại đủ dùng bao nhiêu giờ
  /** Đồng hồ tính tiền: trừ credit theo thời gian chạy (làm tròn lên từng credit). Hết credit thì gọi onEmpty. */
  function meter(pps, note, onEmpty) {
    const t0 = Date.now();
    let charged = 0;
    const due = () => Math.ceil(toCredits(pps * (Date.now() - t0) / 1000));
    const charge = (final) => {
      const n = due() - charged;
      if (n <= 0) return true;
      try { ({ user } = VicoAuth.spend(n, note)); charged += n; renderCredits(); return true; }
      catch { user = VicoAuth.current(); renderCredits(); if (!final && onEmpty) onEmpty(); return false; }
    };
    return { charge: () => charge(false), stop: () => (charge(true), charged), due };
  }
  const needCredits = (pps, minutes) => Math.ceil(toCredits(pps * 60 * minutes));
  const clock = (s) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, Math.floor(s % 60)].map((v) => String(v).padStart(2, "0")).join(":");
  const sleep = (ms, signal) => sleepAbortable(ms, signal);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  let view = "home";
  let trainCfg = { gpu: "T4", cpu: 4, ram: 16, ...loadKey("vico_cloud_train", {}) };
  let ftCfg = { gpu: "L4", gpuCount: 1, ...loadKey("vico_cloud_ft", {}) };
  let session = null;   // notebook đang kết nối: { gpu, cpu, ram, startedAt, status, count, files }
  let nb = null;        // tài liệu notebook: { title, cells: [{ id, type, source, outputs, count }] }
  let jobs = [];        // các lượt tinh chỉnh

  /* ---------- Nút ở thanh bên + trang ---------- */
  const btn = document.createElement("button");
  btn.className = "rail-btn cloud-btn";
  btn.id = "cloudBtn";
  btn.title = "Thuê máy chủ";
  btn.innerHTML = `${SVG(IC.cloud, 20)}<span class="lbl">Thuê máy chủ</span>`;
  $("#groupBtn").after(btn);
  const page = document.createElement("section");
  page.className = "cl-page";
  page.id = "clPage";
  page.hidden = true;
  $(".main").appendChild(page);

  function open(v = view) {
    if (root.classList.contains("ft-open")) { const b = document.getElementById("ftBack"); if (b) b.click(); }
    closePops();
    page.hidden = false;
    root.classList.add("cl-open");
    btn.classList.add("active");
    go(v);
  }
  function close() {
    page.hidden = true;
    root.classList.remove("cl-open");
    btn.classList.remove("active");
  }
  btn.onclick = () => (page.hidden ? open(view) : close());
  const clNewChat = newChat;
  newChat = () => { close(); clNewChat(); };
  const clOpenChat = openChat;
  openChat = (id) => { close(); clOpenChat(id); };

  function go(v) {
    view = v;
    page.dataset.view = v;
    ({ home: viewHome, train: viewTrain, notebook: viewNotebook, ft: viewFt })[v]();
    page.scrollTop = 0;
  }
  const head = (title, sub, backTo) => `
    <header class="cl-head">
      <button class="cl-back" data-back="${backTo}" title="Quay lại">${SVG(IC.back, 18)}</button>
      <div><h2>${title}</h2><p>${sub}</p></div>
      ${demo ? `<span class="cl-demo" title="Chưa nối máy chủ (VICO_CLOUD.apiUrl). Kết quả chạy là mô phỏng; credit vẫn trừ theo thời gian máy chạy để thử luồng thanh toán.">Chế độ demo</span>` : ""}
    </header>`;
  page.addEventListener("click", (e) => {
    const b = e.target.closest("[data-back]");
    if (!b) return;
    if (b.dataset.back === "chat") close(); else go(b.dataset.back);
  });

  /* ---------- Trang chọn dịch vụ ---------- */
  function viewHome() {
    const cheapest = Math.min(...C.gpus.map((g) => g.perSec)) * 3600;
    const card = (id, icon, title, desc, points, on, foot) => `
      <article class="cl-service${on ? "" : " soon"}" ${on ? `data-go="${id}" tabindex="0" role="button"` : 'aria-disabled="true"'}>
        <div class="cl-service-top"><span class="cl-sicon">${SVG(icon, 22)}</span>${on ? "" : '<span class="cl-soon">Sắp ra mắt</span>'}</div>
        <h3>${title}</h3><p>${desc}</p>
        <ul>${points.map((x) => `<li>${SVG(IC.check, 14)}${x}</li>`).join("")}</ul>
        <div class="cl-service-foot">${foot}</div>
      </article>`;
    page.innerHTML = `<div class="cl-inner">
      ${head("Thuê máy chủ", `GPU đám mây trả theo giây, hạ tầng ${esc(C.provider)}. Giá tính bằng credit.`, "chat")}
      ${sessionBanner()}
      <div class="cl-services">
        ${card("web", IC.globe, "Host web", "Đưa website lên mạng với tên miền riêng, có HTTPS.", ["Web tĩnh và Next.js", "Tên miền riêng", "Tự động SSL"], false, "Sắp ra mắt")}
        ${card("server", IC.server, "Host server", "Máy chủ chạy 24/7 cho API, bot, game server.", ["Chạy liên tục", "Cổng mạng riêng", "Theo dõi log"], false, "Sắp ra mắt")}
        ${card("train", IC.flask, "Training AI", "Notebook Python có GPU để huấn luyện model và chạy thí nghiệm.", [`${C.gpus.length} loại GPU từ T4 đến B300`, `${C.limits.cpu[0]}–${C.limits.cpu[1]} nhân CPU, ${C.limits.ram[0]}–${C.limits.ram[1]} GB RAM`, "Giao diện notebook như Jupyter"], true, `Từ <b>${cr(cheapest)}</b>/giờ<span class="cl-go">Bắt đầu ${SVG('<path d="M5 12h14M13 6l6 6-6 6"/>', 16)}</span>`)}
        ${card("ft", IC.tune, "Finetune", "Tinh chỉnh model mở (Gemma, Llama, Qwen…) bằng dữ liệu của bạn.", [`Tối đa ${C.limits.ftGpus} GPU mỗi lượt`, "Đề xuất model vừa với GPU", "LoRA, QLoRA, full fine-tune"], true, `${C.ftModels.length} model<span class="cl-go">Bắt đầu ${SVG('<path d="M5 12h14M13 6l6 6-6 6"/>', 16)}</span>`)}
      </div>
      <section class="cl-sec">
        <div class="cl-sec-head"><h3>Bảng giá GPU</h3><small>Tính theo giây, chỉ khi máy đang bật. CPU ${cr(C.cpuPerCoreSec * 3600)}/nhân/giờ · RAM ${cr(C.ramPerGiBSec * 3600)}/GB/giờ</small></div>
        <div class="cl-price-table" role="table">
          <div class="cl-pr head" role="row"><span>GPU</span><span>VRAM</span><span>Kiến trúc</span><span>Credit / giờ</span><span>Quy đổi (VNĐ / giờ)</span></div>
          ${C.gpus.map((g) => `<div class="cl-pr" role="row"><span><b>${esc(g.name)}</b></span><span>${g.vram} GB</span><span>${esc(g.arch)}</span><span><b>${cr(g.perSec * 3600)}</b></span><span>${usd(g.perSec * 3600)}</span></div>`).join("")}
        </div>
      </section>
    </div>`;
    page.querySelectorAll("[data-go]").forEach((c) => {
      const goTo = () => (c.dataset.go === "train" && session ? go("notebook") : go(c.dataset.go));
      c.onclick = goTo;
      c.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goTo(); } };
    });
    bindBanner();
  }
  function sessionBanner() {
    if (!session) return "";
    const g = gpuById(session.gpu);
    return `<div class="cl-banner"><span class="cl-dot"></span>
      <div><b>Notebook đang chạy · ${esc(g.name)} · ${session.cpu} nhân · ${session.ram} GB RAM</b><small id="clBannerTime">${clock((Date.now() - session.startedAt) / 1000)} · ${fmt(sessionCredits())} credit</small></div>
      <button class="btn-primary sm" data-open-nb>Mở notebook</button><button class="btn-ghost sm" data-stop-session>Tắt máy</button></div>`;
  }
  function bindBanner() {
    const o = page.querySelector("[data-open-nb]"), s = page.querySelector("[data-stop-session]");
    if (o) o.onclick = () => go("notebook");
    if (s) s.onclick = () => stopSession();
  }

  /* ---------- Training AI: cấu hình máy ---------- */
  function viewTrain() {
    const t = trainCfg;
    page.innerHTML = `<div class="cl-inner">
      ${head("Training AI", "Chọn GPU, số nhân CPU và RAM cho notebook. Tắt máy là ngừng tính tiền.", "home")}
      <div class="cl-train">
        <section class="cl-sec">
          <div class="cl-sec-head"><h3>Chọn GPU</h3><small>Các GPU trong gói free (Starter) của ${esc(C.provider)}</small></div>
          <div class="cl-gpus" role="radiogroup" aria-label="Chọn GPU">${C.gpus.map((g, i) => `
            <button class="cl-gpu${g.id === t.gpu ? " on" : ""}" data-gpu="${g.id}" role="radio" aria-checked="${g.id === t.gpu}">
              <span class="cl-gpu-top"><b>${esc(g.name.replace("NVIDIA ", ""))}</b>${i < 3 ? '<em>Phổ biến</em>' : ""}</span>
              <span class="cl-gpu-vram">${g.vram} GB VRAM · ${esc(g.arch)}</span>
              <span class="cl-gpu-note">${esc(g.note)}</span>
              <span class="cl-gpu-price"><b>${cr(g.perSec * 3600)}</b>/giờ<small>${usd(g.perSec * 3600)} · số dư đủ ≈ ${nf(balanceHours(g.perSec), 1)} giờ</small></span>
            </button>`).join("")}</div>
        </section>
        <aside class="cl-summary">
          <h3>Cấu hình máy</h3>
          ${rangeRow("cpu", IC.cpu, "Số nhân CPU", t.cpu, C.limits.cpu, "nhân")}
          ${rangeRow("ram", IC.ram, "RAM", t.ram, C.limits.ram, "GB")}
          <div class="cl-bill" id="clBill"></div>
          <button class="cl-start" id="clStart">${SVG(IC.play, 14)}Khởi động notebook</button>
          <small class="cl-fine">Tính tiền theo giây, chỉ khi máy đang bật. 1 nhân = 1 nhân vật lý (2 vCPU).</small>
        </aside>
      </div>
    </div>`;
    page.querySelector(".cl-gpus").onclick = (e) => {
      const b = e.target.closest("[data-gpu]");
      if (!b) return;
      t.gpu = b.dataset.gpu;
      page.querySelectorAll(".cl-gpu").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); });
      saveTrain(); bill();
    };
    bindRange("cpu", (v) => { t.cpu = v; saveTrain(); bill(); });
    bindRange("ram", (v) => { t.ram = v; saveTrain(); bill(); });
    $("#clStart").onclick = () => startSession();
    bill();
  }
  const saveTrain = () => saveKey("vico_cloud_train", trainCfg);
  function rangeRow(key, icon, label, value, [min, max], unit) {
    return `<div class="cl-range" data-range="${key}">
      <div class="cl-range-top">${SVG(icon, 16)}<span>${label}</span>
        <label class="cl-num"><input type="number" min="${min}" max="${max}" step="1" value="${value}" aria-label="${label}" /><em>${unit}</em></label></div>
      <input type="range" min="${min}" max="${max}" step="1" value="${value}" aria-label="${label}" style="--v:${((value - min) / (max - min)) * 100}%" />
      <div class="cl-range-ends"><span>${min} ${unit}</span><span>${max} ${unit}</span></div>
    </div>`;
  }
  function bindRange(key, onChange) {
    const box = page.querySelector(`[data-range="${key}"]`);
    const range = box.querySelector('input[type="range"]'), num = box.querySelector('input[type="number"]');
    const min = +range.min, max = +range.max;
    const set = (v, from) => {
      v = clamp(Math.round(+v || min), min, max);
      if (from !== "range") range.value = v;
      if (from !== "num") num.value = v;
      range.style.setProperty("--v", ((v - min) / (max - min)) * 100 + "%");
      onChange(v);
    };
    range.oninput = () => set(range.value, "range");
    num.onchange = () => set(num.value, "x");
    num.oninput = () => { if (num.value !== "" && +num.value >= min && +num.value <= max) set(num.value, "num"); };
  }
  function bill() {
    const t = trainCfg, g = gpuById(t.gpu);
    const pps = perSec({ ...t, gpuCount: 1 });
    $("#clBill").innerHTML = `
      <div><span>GPU ${esc(g.name.replace("NVIDIA ", ""))}</span><b>${cr(g.perSec * 3600)}</b></div>
      <div><span>CPU ${t.cpu} nhân</span><b>${cr(t.cpu * C.cpuPerCoreSec * 3600)}</b></div>
      <div><span>RAM ${t.ram} GB</span><b>${cr(t.ram * C.ramPerGiBSec * 3600)}</b></div>
      <div class="total"><span>Tổng mỗi giờ</span><b>${cr(pps * 3600)}</b></div>
      <div class="free"><span>Số dư ${fmt(user ? user.total : 0)} credit đủ dùng</span><b>≈ ${nf(balanceHours(pps), 1)} giờ</b></div>`;
  }

  /* ---------- Phiên máy (notebook) ---------- */
  const sessionCredits = () => (session && session.meter ? session.meter.due() : 0);
  let tick = 0, sample = { gpu: 0, vram: 0, ram: 0, cpu: 0 };
  async function startSession() {
    if (!user) return openAuth("signup", "Tạo tài khoản để thuê máy chủ.");
    if (session) return go("notebook");
    const cfg = { gpu: trainCfg.gpu, cpu: trainCfg.cpu, ram: trainCfg.ram };
    const need = needCredits(perSec({ ...cfg, gpuCount: 1 }), 5);
    user = VicoAuth.current();
    if (!user || user.total < need) return showToast(`Cần ít nhất ${fmt(need)} credit (5 phút chạy máy này). Bạn còn ${fmt(user ? user.total : 0)} credit.`, "warn");
    session = { ...cfg, status: "starting", startedAt: Date.now(), count: 0, files: [{ name: "sample_data", dir: true }, { name: "README.md", size: 412 }] };
    loadNotebook();
    go("notebook");
    try {
      if (!demo) {
        const r = await fetch(`${C.apiUrl}/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cfg, gpuCount: 1 }) });
        if (!r.ok) throw new Error(`Máy chủ trả lỗi ${r.status}`);
        session.id = (await r.json()).id;
      } else {
        await sleep(1800 + Math.random() * 900); // demo: thời gian cấp máy
      }
      if (!session) return;
      session.status = "ready";
      session.startedAt = Date.now();
      session.meter = meter(perSec({ ...cfg, gpuCount: 1 }), `Thuê GPU · ${gpuById(cfg.gpu).name} · notebook`, () => {
        showToast("Hết credit nên máy đã tự tắt. Nạp thêm credit để chạy tiếp.", "warn");
        stopSession(false);
      });
      showToast(`Đã kết nối máy ${gpuById(cfg.gpu).name} · ${cfg.cpu} nhân · ${cfg.ram} GB RAM.`, "success");
    } catch (err) {
      session = null;
      showToast("Không khởi động được máy: " + err.message, "warn");
    }
    renderRuntime();
    clearInterval(tick);
    tick = setInterval(onTick, 1000);
  }
  async function stopSession(ask = true) {
    if (!session) return;
    if (ask && !confirm("Tắt máy? Biến và dữ liệu trong bộ nhớ của notebook sẽ mất (nội dung notebook vẫn được lưu).")) return;
    if (running) running.ctrl.abort();
    const charged = session.meter ? session.meter.stop() : 0, dur = (Date.now() - session.startedAt) / 1000;
    if (!demo && session.id) fetch(`${C.apiUrl}/sessions/${session.id}`, { method: "DELETE" }).catch(() => {});
    session = null;
    clearInterval(tick);
    showToast(`Đã tắt máy sau ${clock(dur)} · trừ ${fmt(charged)} credit.`);
    if (view === "notebook") renderRuntime(); else go(view);
  }
  function onTick() {
    if (!session) return;
    if (session.meter && (session.ticks = (session.ticks || 0) + 1) % 15 === 0 && !session.meter.charge()) return;
    const busy = !!running, g = gpuById(session.gpu);
    const jitter = (a, b) => a + Math.random() * (b - a);
    sample = busy && running.heavy
      ? { gpu: jitter(86, 99), vram: g.vram * jitter(0.55, 0.72), ram: session.ram * jitter(0.35, 0.5), cpu: jitter(25, 60) }
      : busy ? { gpu: jitter(5, 30), vram: g.vram * 0.06, ram: session.ram * 0.18, cpu: jitter(10, 40) }
      : { gpu: jitter(0, 2), vram: g.vram * 0.02, ram: session.ram * 0.12, cpu: jitter(0, 4) };
    const t = document.getElementById("nbClock");
    if (t) t.textContent = `${clock((Date.now() - session.startedAt) / 1000)} · ${fmt(sessionCredits())} credit`;
    const b = document.getElementById("clBannerTime");
    if (b) b.textContent = `${clock((Date.now() - session.startedAt) / 1000)} · ${fmt(sessionCredits())} credit`;
    renderMonitor();
  }

  /* ---------- Notebook ---------- */
  const NB_KEY = () => uk("vico_notebook");
  const cid = () => "c" + Math.random().toString(36).slice(2, 9);
  const TEMPLATE = () => ({
    title: "vico-training.ipynb",
    cells: [
      { type: "markdown", source: "# Huấn luyện AI trên GPU đám mây\nNotebook mẫu: kiểm tra GPU, cài thư viện rồi huấn luyện một mạng nơ-ron nhỏ.\n\n**Phím tắt:** `Shift + Enter` chạy ô và sang ô dưới · `Ctrl + Enter` chạy ô · `Alt + Enter` chạy và thêm ô mới." },
      { type: "code", source: "!nvidia-smi" },
      { type: "code", source: "# vico-demo: gpu-info\nimport torch\nprint(\"CUDA sẵn sàng:\", torch.cuda.is_available())\nprint(\"GPU:\", torch.cuda.get_device_name(0))\nprint(\"VRAM:\", round(torch.cuda.get_device_properties(0).total_memory / 1e9), \"GB\")" },
      { type: "code", source: "!pip install -q transformers datasets accelerate" },
      { type: "markdown", source: "## Huấn luyện thử\nMạng nơ-ron 2 lớp trên dữ liệu ngẫu nhiên, chạy 5 epoch trên GPU." },
      { type: "code", source: "# vico-demo: train\nimport torch, torch.nn as nn\nfrom tqdm import tqdm\n\ndevice = \"cuda\"\nX = torch.randn(20000, 64, device=device)\ny = (X[:, :8].sum(dim=1) > 0).long()\nmodel = nn.Sequential(nn.Linear(64, 256), nn.ReLU(), nn.Linear(256, 2)).to(device)\nopt = torch.optim.AdamW(model.parameters(), lr=1e-3)\n\nfor epoch in range(5):\n    for i in tqdm(range(0, len(X), 100), desc=f\"Epoch {epoch + 1}/5\"):\n        loss = nn.functional.cross_entropy(model(X[i:i+100]), y[i:i+100])\n        opt.zero_grad(); loss.backward(); opt.step()\n    acc = (model(X).argmax(1) == y).float().mean().item()\n    print(f\"epoch {epoch + 1}: loss={loss.item():.4f} acc={acc:.3f}\")" },
    ].map((c) => ({ id: cid(), outputs: [], count: null, ...c })),
  });
  function loadNotebook() {
    if (nb) return;
    nb = loadKey(NB_KEY(), null) || TEMPLATE();
    nb.cells.forEach((c) => { c.id = c.id || cid(); c.outputs = c.outputs || []; c.editing = false; });
  }
  let saveTimer = 0;
  const saveNb = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveKey(NB_KEY(), nb), 300); };
  let running = null;      // ô đang chạy: { id, ctrl, heavy }
  const queue = [];        // các ô chờ chạy (Chạy tất cả)
  let focusId = null;

  function viewNotebook() {
    loadNotebook();
    page.innerHTML = `<div class="nb">
      <header class="nb-bar">
        <button class="cl-back" data-back="home" title="Quay lại">${SVG(IC.back, 18)}</button>
        <span class="nb-logo">${SVG(IC.file, 18)}</span>
        <input class="nb-title" id="nbTitle" value="${esc(nb.title)}" spellcheck="false" aria-label="Tên notebook" />
        <div class="nb-tools">
          <button class="nb-tool" data-nb="add-code" title="Thêm ô code">${SVG(IC.plus, 15)}<span>Code</span></button>
          <button class="nb-tool" data-nb="add-md" title="Thêm ô văn bản">${SVG(IC.text, 15)}<span>Văn bản</span></button>
          <span class="nb-sep"></span>
          <button class="nb-tool" data-nb="run-all" title="Chạy tất cả">${SVG(IC.play, 13)}<span>Chạy tất cả</span></button>
          <button class="nb-tool" data-nb="interrupt" title="Dừng ô đang chạy">${SVG(IC.stop, 13)}<span>Dừng</span></button>
          <button class="nb-tool" data-nb="restart" title="Khởi động lại kernel">${SVG(IC.restart, 15)}<span>Khởi động lại</span></button>
          <button class="nb-tool" data-nb="clear" title="Xoá mọi kết quả">${SVG(IC.clear, 15)}<span>Xoá kết quả</span></button>
          <span class="nb-sep"></span>
          <button class="nb-tool icon" data-nb="export" title="Tải về file .ipynb">${SVG(IC.download, 16)}</button>
          <button class="nb-tool icon" data-nb="import" title="Mở file .ipynb">${SVG(IC.upload, 16)}</button>
          <input type="file" id="nbImport" accept=".ipynb,application/json" hidden />
        </div>
        <div class="nb-runtime" id="nbRuntime"></div>
      </header>
      <div class="nb-body">
        <aside class="nb-side">
          <div class="nb-side-tabs"><button class="on" data-side="files">${SVG(IC.folder, 15)}Tệp</button><button data-side="res">${SVG(IC.chart, 15)}Tài nguyên</button></div>
          <div class="nb-side-pane" id="nbSide"></div>
        </aside>
        <main class="nb-cells" id="nbCells"></main>
      </div>
    </div>`;
    $("#nbTitle").oninput = (e) => { nb.title = e.target.value.trim() || "untitled.ipynb"; saveNb(); };
    page.querySelector(".nb-tools").onclick = onTool;
    $("#nbImport").onchange = importIpynb;
    page.querySelector(".nb-side-tabs").onclick = (e) => {
      const b = e.target.closest("[data-side]");
      if (!b) return;
      page.querySelectorAll(".nb-side-tabs button").forEach((x) => x.classList.toggle("on", x === b));
      sideTab = b.dataset.side;
      renderSide();
    };
    renderRuntime();
    renderCells();
    renderSide();
  }
  let sideTab = "files";
  function renderRuntime() {
    const box = document.getElementById("nbRuntime");
    if (!box) return;
    if (!session) {
      box.innerHTML = `<button class="nb-connect" data-connect>${SVG(IC.chip, 15)}Kết nối máy</button>`;
      box.querySelector("[data-connect]").onclick = () => go("train");
    } else {
      const g = gpuById(session.gpu);
      box.innerHTML = `<span class="nb-chip ${session.status}" title="${esc(g.name)} · ${session.cpu} nhân CPU · ${session.ram} GB RAM">
          <span class="cl-dot"></span>${session.status === "starting" ? "Đang cấp máy…" : `${esc(g.name.replace("NVIDIA ", ""))} · ${session.cpu} nhân · ${session.ram} GB`}</span>
        <span class="nb-clock" id="nbClock">${clock((Date.now() - session.startedAt) / 1000)} · ${fmt(sessionCredits())} credit</span>
        <button class="nb-tool" data-off>Tắt máy</button>`;
      box.querySelector("[data-off]").onclick = () => stopSession();
    }
    renderSide();
  }
  function renderSide() {
    const box = document.getElementById("nbSide");
    if (!box) return;
    if (!session) { box.innerHTML = `<p class="nb-side-empty">Chưa kết nối máy.<br />Bấm <b>Kết nối máy</b> để chọn GPU.</p>`; return; }
    if (sideTab === "files") {
      box.innerHTML = `<div class="nb-files">${session.files.map((f) => `<div class="nb-file">${SVG(f.dir ? IC.folder : IC.file, 15)}<span>${esc(f.name)}</span>${f.size != null ? `<small>${fmtSize(f.size)}</small>` : ""}</div>`).join("")}</div>
        <button class="btn-ghost sm nb-upload" data-upload>${SVG(IC.upload, 14)}Tải tệp lên</button><input type="file" id="nbUpload" multiple hidden />
        <small class="nb-side-note">Tệp nằm ở thư mục làm việc của máy, mất khi tắt máy.</small>`;
      box.querySelector("[data-upload]").onclick = () => $("#nbUpload").click();
      $("#nbUpload").onchange = (e) => {
        for (const f of e.target.files) session.files.push({ name: f.name, size: f.size });
        showToast(`Đã tải ${e.target.files.length} tệp lên máy${demo ? " (demo)" : ""}.`);
        renderSide();
      };
    } else renderMonitor(true);
  }
  function renderMonitor(force) {
    if (sideTab !== "res" || !session) return;
    const box = document.getElementById("nbSide");
    if (!box) return;
    const g = gpuById(session.gpu);
    const bar = (label, val, max, unit, pct) => `<div class="nb-meter"><div class="nb-meter-top"><span>${label}</span><b>${pct ? `${nf(val, 0)}%` : `${nf(val, 1)} / ${max} ${unit}`}</b></div>
      <div class="nb-meter-bar"><i style="width:${clamp(pct ? val : (val / max) * 100, 0, 100)}%"></i></div></div>`;
    if (force || !box.querySelector(".nb-meters")) box.innerHTML = `<div class="nb-meters"></div><small class="nb-side-note">${demo ? "Số liệu mô phỏng (demo)." : "Cập nhật mỗi giây."}</small>`;
    box.querySelector(".nb-meters").innerHTML =
      `<div class="nb-meter-head">${SVG(IC.chip, 14)}${esc(g.name)}</div>` +
      bar("GPU", sample.gpu, 100, "", true) + bar("VRAM", sample.vram, g.vram, "GB") +
      `<div class="nb-meter-head">${SVG(IC.cpu, 14)}Máy chủ</div>` +
      bar(`CPU (${session.cpu} nhân)`, sample.cpu, 100, "", true) + bar("RAM", sample.ram, session.ram, "GB");
  }

  function cellHtml(c, i) {
    const isRun = running && running.id === c.id, queued = queue.includes(c.id);
    const gutter = c.type === "code"
      ? `<button class="nb-run${isRun ? " busy" : ""}" data-act="run" title="${isRun ? "Dừng" : "Chạy ô (Ctrl + Enter)"}">${isRun ? SVG(IC.stop, 13) : SVG(IC.play, 13)}</button>
         <span class="nb-count">${isRun ? "[*]" : queued ? "[…]" : c.count != null ? `[${c.count}]` : "[ ]"}</span>`
      : "";
    const body = c.type === "code"
      ? `<div class="nb-editor"><pre class="nb-hl" aria-hidden="true"><code class="hljs">${hl(c.source)}</code></pre><textarea class="nb-src" spellcheck="false" rows="1" aria-label="Ô code ${i + 1}">${esc(c.source)}</textarea></div>`
      : c.editing ? `<div class="nb-editor md"><textarea class="nb-src md" spellcheck="false" rows="2" aria-label="Ô văn bản ${i + 1}">${esc(c.source)}</textarea></div>`
      : `<div class="nb-md content" data-act="edit-md" title="Nháy đúp để sửa">${renderMarkdown(c.source || "*Ô văn bản trống, nháy đúp để viết*")}</div>`;
    return `<div class="nb-cell ${c.type}${focusId === c.id ? " focus" : ""}" data-id="${c.id}">
      <div class="nb-gutter">${gutter}</div>
      <div class="nb-main">
        ${body}
        ${c.outputs && c.outputs.length ? `<div class="nb-out">${c.outputs.map((o) => `<pre class="nb-o ${o.kind || ""}">${esc(o.text)}</pre>`).join("")}</div>` : ""}
      </div>
      <div class="nb-cell-tools">
        <button data-act="up" title="Lên">${SVG(IC.up, 14)}</button><button data-act="down" title="Xuống">${SVG(IC.down, 14)}</button>
        <button data-act="dup" title="Nhân đôi">${SVG(IC.copy, 14)}</button>
        ${c.outputs && c.outputs.length ? `<button data-act="clear-out" title="Xoá kết quả">${SVG(IC.clear, 14)}</button>` : ""}
        <button data-act="del" title="Xoá ô">${SVG(IC.trash, 14)}</button>
      </div>
    </div>
    <div class="nb-insert"><button data-ins="code" data-after="${c.id}">${SVG(IC.plus, 13)}Code</button><button data-ins="markdown" data-after="${c.id}">${SVG(IC.plus, 13)}Văn bản</button></div>`;
  }
  const hl = (code) => {
    try { return window.hljs ? hljs.highlight(code + "\n", { language: "python", ignoreIllegals: true }).value : esc(code); }
    catch { return esc(code); }
  };
  function renderCells() {
    const box = document.getElementById("nbCells");
    if (!box) return;
    box.innerHTML = `<div class="nb-insert first"><button data-ins="code" data-after="">${SVG(IC.plus, 13)}Code</button><button data-ins="markdown" data-after="">${SVG(IC.plus, 13)}Văn bản</button></div>` +
      nb.cells.map(cellHtml).join("") + (nb.cells.length ? "" : `<p class="nb-empty">Notebook trống. Thêm ô Code hoặc Văn bản.</p>`);
    box.querySelectorAll("textarea.nb-src").forEach(grow);
    bindCells(box);
  }
  function renderCell(id) {
    const el = page.querySelector(`.nb-cell[data-id="${id}"]`), c = nb.cells.find((x) => x.id === id);
    if (!el || !c) return renderCells();
    const tmp = document.createElement("div");
    tmp.innerHTML = cellHtml(c, nb.cells.indexOf(c));
    const fresh = tmp.firstElementChild;
    const had = el.contains(document.activeElement) && document.activeElement.tagName === "TEXTAREA";
    const sel = had ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    el.replaceWith(fresh);
    fresh.querySelectorAll("textarea.nb-src").forEach(grow);
    if (had) { const ta = fresh.querySelector("textarea"); if (ta) { ta.focus(); ta.setSelectionRange(...sel); } }
  }
  function grow(ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; }
  function bindCells(box) {
    box.oninput = (e) => {
      const ta = e.target.closest("textarea.nb-src");
      if (!ta) return;
      const c = nb.cells.find((x) => x.id === ta.closest(".nb-cell").dataset.id);
      c.source = ta.value;
      grow(ta);
      const pre = ta.parentElement.querySelector(".nb-hl code");
      if (pre) pre.innerHTML = hl(c.source);
      saveNb();
    };
    box.onfocusin = (e) => {
      const cell = e.target.closest(".nb-cell");
      if (!cell || focusId === cell.dataset.id) return;
      box.querySelectorAll(".nb-cell.focus").forEach((x) => x.classList.remove("focus"));
      cell.classList.add("focus");
      focusId = cell.dataset.id;
    };
    box.onclick = (e) => {
      const ins = e.target.closest("[data-ins]");
      if (ins) return addCell(ins.dataset.ins, ins.dataset.after, true);
      const a = e.target.closest("[data-act]");
      if (!a) return;
      const cell = a.closest(".nb-cell"), id = cell && cell.dataset.id, i = nb.cells.findIndex((x) => x.id === id), c = nb.cells[i];
      const act = a.dataset.act;
      if (act === "run") return running && running.id === id ? running.ctrl.abort() : runCell(id);
      if (act === "up" && i > 0) { [nb.cells[i - 1], nb.cells[i]] = [nb.cells[i], nb.cells[i - 1]]; }
      else if (act === "down" && i < nb.cells.length - 1) { [nb.cells[i + 1], nb.cells[i]] = [nb.cells[i], nb.cells[i + 1]]; }
      else if (act === "dup") nb.cells.splice(i + 1, 0, { ...c, id: cid(), outputs: [], count: null });
      else if (act === "clear-out") { c.outputs = []; c.count = null; }
      else if (act === "del") { if (running && running.id === id) running.ctrl.abort(); nb.cells.splice(i, 1); }
      else return;
      saveNb();
      renderCells();
    };
    box.ondblclick = (e) => {
      const md = e.target.closest('[data-act="edit-md"]');
      if (!md) return;
      const c = nb.cells.find((x) => x.id === md.closest(".nb-cell").dataset.id);
      c.editing = true;
      renderCell(c.id);
      const ta = page.querySelector(`.nb-cell[data-id="${c.id}"] textarea`);
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    };
    box.onkeydown = (e) => {
      const ta = e.target.closest("textarea.nb-src");
      if (!ta) return;
      const id = ta.closest(".nb-cell").dataset.id;
      if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); ta.setRangeText("    ", ta.selectionStart, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input", { bubbles: true })); return; }
      if (e.key !== "Enter" || !(e.shiftKey || e.ctrlKey || e.metaKey || e.altKey)) return;
      e.preventDefault();
      runCell(id);
      const i = nb.cells.findIndex((x) => x.id === id);
      if (e.altKey) addCell("code", id, true);
      else if (e.shiftKey) {
        if (i === nb.cells.length - 1) addCell("code", id, true);
        else focusCell(nb.cells[i + 1].id);
      }
    };
    box.onfocusout = (e) => { // rời ô văn bản đang sửa: hiện lại dạng đã định dạng
      const ta = e.target.closest("textarea.nb-src.md");
      if (!ta) return;
      setTimeout(() => {
        const cell = ta.closest(".nb-cell");
        if (!cell || cell.contains(document.activeElement)) return;
        const c = nb.cells.find((x) => x.id === cell.dataset.id);
        if (c && c.editing) { c.editing = false; renderCell(c.id); }
      }, 0);
    };
  }
  function focusCell(id) {
    const ta = page.querySelector(`.nb-cell[data-id="${id}"] textarea`);
    if (ta) { ta.focus(); ta.scrollIntoView({ block: "nearest" }); }
    else { const c = page.querySelector(`.nb-cell[data-id="${id}"]`); if (c) c.scrollIntoView({ block: "nearest" }); }
  }
  function addCell(type, afterId, focus) {
    const c = { id: cid(), type, source: "", outputs: [], count: null, editing: type === "markdown" };
    // afterId: "" = đầu notebook, null = cuối, còn lại = ngay sau ô đó
    const i = afterId === "" ? 0 : afterId == null ? nb.cells.length : nb.cells.findIndex((x) => x.id === afterId) + 1;
    nb.cells.splice(i, 0, c);
    saveNb();
    renderCells();
    if (focus) focusCell(c.id);
  }
  function onTool(e) {
    const b = e.target.closest("[data-nb]");
    if (!b) return;
    const act = b.dataset.nb;
    if (act === "add-code" || act === "add-md") return addCell(act === "add-code" ? "code" : "markdown", focusId || null, true);
    if (act === "run-all") {
      if (!session) return needSession();
      queue.length = 0;
      nb.cells.filter((c) => c.type === "code").forEach((c) => queue.push(c.id));
      renderCells();
      return pump();
    }
    if (act === "interrupt") { queue.length = 0; if (running) running.ctrl.abort(); return renderCells(); }
    if (act === "restart") {
      if (!session) return needSession();
      if (!confirm("Khởi động lại kernel? Biến trong bộ nhớ sẽ mất.")) return;
      queue.length = 0;
      if (running) running.ctrl.abort();
      session.count = 0;
      return showToast("Đã khởi động lại kernel.");
    }
    if (act === "clear") { nb.cells.forEach((c) => { c.outputs = []; c.count = null; }); saveNb(); return renderCells(); }
    if (act === "export") return exportIpynb();
    if (act === "import") return $("#nbImport").click();
  }
  function needSession() {
    showToast("Chưa kết nối máy. Chọn GPU để khởi động notebook.", "warn");
    go("train");
  }
  function runCell(id) {
    const c = nb.cells.find((x) => x.id === id);
    if (!c) return;
    if (c.type === "markdown") { c.editing = false; saveNb(); return renderCell(id); }
    if (!session) return needSession();
    if (!queue.includes(id) && !(running && running.id === id)) queue.push(id);
    renderCell(id);
    pump();
  }
  async function pump() {
    if (running || !queue.length) return;
    if (!session || session.status !== "ready") {
      if (session && session.status === "starting") { setTimeout(pump, 400); return; }
      queue.length = 0;
      return renderCells();
    }
    const id = queue.shift(), c = nb.cells.find((x) => x.id === id);
    if (!c) return pump();
    const ctrl = new AbortController();
    running = { id, ctrl, heavy: /vico-demo:\s*train|\.fit\(|\.train\(|backward\(\)/.test(c.source) };
    c.outputs = [];
    renderCell(id);
    let painted = 0;
    const paint = () => { painted = 0; renderCell(id); };
    const out = {
      line(text, kind) { c.outputs.push({ text, kind }); if (!painted) painted = requestAnimationFrame(paint); return c.outputs.length - 1; },
      set(idx, text) { if (c.outputs[idx]) c.outputs[idx].text = text; if (!painted) painted = requestAnimationFrame(paint); },
    };
    try {
      if (demo) await demoExecute(c.source, out, ctrl.signal);
      else await remoteExecute(c.source, out, ctrl.signal);
      session && (c.count = ++session.count);
    } catch (err) {
      if (err && err.name === "AbortError") out.line("KeyboardInterrupt: đã dừng ô này.", "err");
      else out.line(String((err && err.message) || err), "err");
      if (session) c.count = ++session.count;
    }
    cancelAnimationFrame(painted);
    running = null;
    saveNb();
    renderCell(id);
    pump();
  }
  // Máy chủ thật: gửi code, nhận kết quả dạng luồng chữ (mỗi dòng một kết quả)
  async function remoteExecute(code, out, signal) {
    const r = await fetch(`${C.apiUrl}/sessions/${session.id}/execute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }), signal });
    if (!r.ok) throw new Error(`Máy chủ trả lỗi ${r.status}`);
    const reader = r.body.getReader(), dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      lines.forEach((l) => out.line(l));
    }
    if (buf) out.line(buf);
  }
  // Demo: mô phỏng kết quả cho các lệnh thường gặp (chưa có máy chủ nên không chạy Python thật)
  async function demoExecute(code, out, signal) {
    const g = gpuById(session.gpu);
    await sleep(220 + Math.random() * 260, signal);
    // Ô mẫu của notebook (đánh dấu "# vico-demo: …")
    if (/vico-demo:\s*gpu-info/.test(code)) return out.line(`CUDA sẵn sàng: True\nGPU: ${g.name}\nVRAM: ${g.vram} GB`);
    if (/vico-demo:\s*train/.test(code)) return demoTrain(out, signal);
    // Còn lại: chạy lần lượt từng dòng, nhận ra vài lệnh thường gặp
    let shown = false;
    for (const raw of code.split("\n")) {
      const line = raw.trim();
      let m;
      if (/^!nvidia-smi\b/.test(line)) {
        const w = (s, n) => String(s).padEnd(n).slice(0, n);
        out.line([
          "+---------------------------------------------------------------------------+",
          `| ${w(`NVIDIA-SMI (demo)            Máy chủ ${C.provider}`, 73)} |`,
          "|-------------------------------+--------------------+----------------------|",
          "| GPU  Name                     |       Memory-Usage | GPU-Util             |",
          "|===============================+====================+======================|",
          `|   0  ${w(g.name, 25)}| ${String(`0MiB / ${g.vram * 1024}MiB`).padStart(18)} | ${w("0%", 20)} |`,
          "+-------------------------------+--------------------+----------------------+",
        ].join("\n"), "table");
      } else if ((m = /^!pip install\s+(.+)$/.exec(line))) {
        const pkgs = m[1].split(/\s+/).filter((p) => p && !p.startsWith("-"));
        const quiet = /(^|\s)(-q|--quiet)(\s|$)/.test(m[1]);
        for (const p of pkgs) { await sleep(350 + Math.random() * 400, signal); if (!quiet) out.line(`Collecting ${p}\n  Downloading ${p}-*.whl`); }
        out.line(`Successfully installed ${pkgs.join(" ")} (demo)`);
      } else if ((m = /^print\(\s*(["'])((?:(?!\1).)*)\1\s*\)$/.exec(line))) {
        out.line(m[2]);
      } else if ((m = /time\.sleep\(\s*([\d.]+)\s*\)/.exec(line))) {
        await sleep(Math.min(+m[1], 15) * 1000, signal);
      } else continue;
      shown = true;
    }
    if (!shown && code.trim()) out.line("(demo) Đã chạy ô code. Khi nối máy chủ thật (VICO_CLOUD.apiUrl), kết quả Python sẽ hiện ở đây.", "dim");
  }
  async function demoTrain(out, signal) {
    let loss = 0.71, acc = 0.52;
    for (let ep = 1; ep <= 5; ep++) {
      const total = 200, idx = out.line("");
      const t0 = Date.now();
      for (let s = 0; s <= total; s += 10) {
        const pct = s / total, bar = "█".repeat(Math.round(pct * 20)).padEnd(20, " ");
        const el = (Date.now() - t0) / 1000;
        out.set(idx, `Epoch ${ep}/5: ${String(Math.round(pct * 100)).padStart(3)}%|${bar}| ${s}/${total} [00:0${Math.floor(el)}<00:00, ${Math.round(s / Math.max(el, 0.05))}it/s]`);
        await sleep(55 + Math.random() * 30, signal);
      }
      loss = loss * (0.62 + Math.random() * 0.08);
      acc = Math.min(0.995, acc + (1 - acc) * (0.45 + Math.random() * 0.1));
      out.line(`epoch ${ep}: loss=${loss.toFixed(4)} acc=${acc.toFixed(3)}`);
    }
  }
  function exportIpynb() {
    const lines = (s) => String(s).split("\n").map((l, i, a) => (i < a.length - 1 ? l + "\n" : l));
    const doc = {
      cells: nb.cells.map((c) => (c.type === "code"
        ? { cell_type: "code", execution_count: c.count, metadata: {}, source: lines(c.source),
            outputs: (c.outputs || []).map((o) => (o.kind === "err"
              ? { output_type: "error", ename: "Error", evalue: o.text, traceback: [o.text] }
              : { output_type: "stream", name: "stdout", text: lines(o.text + "\n") })) }
        : { cell_type: "markdown", metadata: {}, source: lines(c.source) })),
      metadata: { kernelspec: { name: "python3", display_name: "Python 3", language: "python" }, language_info: { name: "python" } },
      nbformat: 4, nbformat_minor: 5,
    };
    const name = /\.ipynb$/i.test(nb.title) ? nb.title : nb.title + ".ipynb";
    downloadFile({ name, content: JSON.stringify(doc, null, 1) });
  }
  async function importIpynb(e) {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const doc = JSON.parse(await f.text());
      if (!Array.isArray(doc.cells)) throw new Error("không có danh sách ô");
      const txt = (s) => (Array.isArray(s) ? s.join("") : String(s || ""));
      nb = {
        title: f.name,
        cells: doc.cells.filter((c) => c.cell_type === "code" || c.cell_type === "markdown").map((c) => ({
          id: cid(), type: c.cell_type, source: txt(c.source).replace(/\n$/, ""), count: c.execution_count ?? null,
          outputs: (c.outputs || []).map((o) => o.output_type === "error"
            ? { text: `${o.ename}: ${o.evalue}`, kind: "err" }
            : { text: txt(o.text || (o.data && o.data["text/plain"])).replace(/\n$/, "") }).filter((o) => o.text),
        })),
      };
      saveNb();
      viewNotebook();
      showToast(`Đã mở ${f.name} (${nb.cells.length} ô).`, "success");
    } catch (err) { showToast("File .ipynb không hợp lệ: " + err.message, "warn"); }
  }

  /* ---------- Finetune trên GPU đám mây ---------- */
  const vendorRank = (m) => Object.keys(C.vendors).indexOf(m.vendor);
  const ftVram = () => { const g = gpuById(ftCfg.gpu); return ftCfg.gpuCount > 1 ? g.vram * ftCfg.gpuCount * 0.9 : g.vram * 0.95; };
  const methodsFor = (m) => C.ftMethods.filter((x) => x.need(m.params) <= ftVram());
  const bestMethod = (m) => methodsFor(m)[0] || null; // thứ tự ưu tiên trong ftMethods: LoRA -> QLoRA -> Full
  function ftSuggestions() {
    const best = {};
    for (const m of C.ftModels.slice().sort((a, b) => vendorRank(a) - vendorRank(b) || b.params - a.params)) {
      if (!best[m.vendor] && methodsFor(m).some((x) => x.id !== "full")) best[m.vendor] = m;
    }
    return Object.keys(C.vendors).map((v) => best[v]).filter(Boolean).slice(0, 6);
  }
  function viewFt() {
    page.innerHTML = `<div class="cl-inner">
      ${head("Finetune", "Tinh chỉnh model mở bằng dữ liệu của bạn trên GPU đám mây. Chọn GPU, Vico đề xuất model vừa sức.", "home")}
      <div id="ftJobs"></div>
      <section class="cl-panel">
        <div class="cl-panel-row">
          <div class="cl-field"><span>Loại GPU</span>
            <div class="cl-gpu-chips" role="radiogroup" aria-label="Loại GPU">${C.gpus.map((g) => `
              <button class="${g.id === ftCfg.gpu ? "on" : ""}" data-ftgpu="${g.id}" role="radio" aria-checked="${g.id === ftCfg.gpu}">
                <b>${esc(g.name.replace("NVIDIA ", ""))}</b><small>${g.vram} GB · ${cr(g.perSec * 3600)}/giờ</small></button>`).join("")}</div>
          </div>
        </div>
        <div class="cl-panel-row split">
          <div class="cl-field"><span>Số GPU</span>
            <div class="cl-seg" role="radiogroup" aria-label="Số GPU">${Array.from({ length: C.limits.ftGpus }, (_, i) => i + 1).map((n) =>
              `<button class="${ftCfg.gpuCount === n ? "on" : ""}" data-ftcount="${n}" role="radio" aria-checked="${ftCfg.gpuCount === n}">${n} GPU</button>`).join("")}</div>
          </div>
          <div class="cl-ft-sum" id="ftSum"></div>
        </div>
      </section>
      <section class="cl-sec">
        <div class="cl-sec-head"><h3>Model phù hợp</h3><small>Ưu tiên model của các hãng lớn, vừa với VRAM đã chọn</small></div>
        <div class="cl-grid" id="ftSug"></div>
      </section>
      <section class="cl-sec">
        <div class="cl-sec-head"><h3>Tất cả model</h3><small>${C.ftModels.length} model</small></div>
        <div class="cl-grid" id="ftAllModels"></div>
      </section>
    </div>`;
    page.querySelector(".cl-gpu-chips").onclick = (e) => {
      const b = e.target.closest("[data-ftgpu]");
      if (!b) return;
      ftCfg.gpu = b.dataset.ftgpu;
      page.querySelectorAll("[data-ftgpu]").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); });
      saveKey("vico_cloud_ft", ftCfg);
      renderFt();
    };
    page.querySelector(".cl-seg").onclick = (e) => {
      const b = e.target.closest("[data-ftcount]");
      if (!b) return;
      ftCfg.gpuCount = +b.dataset.ftcount;
      page.querySelectorAll("[data-ftcount]").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); });
      saveKey("vico_cloud_ft", ftCfg);
      renderFt();
    };
    page.querySelector("#ftSug").parentElement.parentElement.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tune]");
      if (b) openTune(C.ftModels.find((m) => m.id === b.dataset.tune));
    });
    renderFt();
    renderJobs();
  }
  function modelCard(m) {
    const v = C.vendors[m.vendor];
    const ms = methodsFor(m), best = bestMethod(m);
    const need = best ? best.need(m.params) : C.ftMethods.find((x) => x.id === "qlora").need(m.params);
    return `<article class="cl-mcard${best ? "" : " no"}">
      <div class="cl-mtop"><span class="cl-vendor"><i style="--c:${v.color}">${esc(v.mark)}</i>${esc(v.name)}</span>
        ${best ? `<span class="cl-fit ok">${esc(best.name)}</span>` : `<span class="cl-fit bad">Không đủ VRAM</span>`}</div>
      <h4 class="cl-mname">${esc(m.name)}</h4>
      <p class="cl-mrepo" title="${esc(m.repo)}">${esc(m.repo)}</p>
      <dl class="cl-mspecs">
        <div><dt>Tham số</dt><dd>${m.params < 1 ? `${nf(m.params * 1000, 0)} triệu` : `${nf(m.params)} tỷ`}</dd></div>
        <div><dt>VRAM cần</dt><dd>~${nf(need, 1)} GB</dd></div>
        <div><dt>Cách tinh chỉnh</dt><dd>${ms.length ? ms.map((x) => x.name.split(" ")[0]).join(" · ") : "—"}</dd></div>
        <div><dt>Giấy phép</dt><dd>${esc(m.license)}</dd></div>
      </dl>
      ${m.gated ? `<div class="cl-gated">${SVG(IC.lock, 13)}Cần đồng ý giấy phép trên Hugging Face</div>` : '<div class="cl-gated empty"></div>'}
      <button class="cl-tune" data-tune="${m.id}" ${best ? "" : "disabled"}>${best ? `${SVG(IC.tune, 15)}Tinh chỉnh model này` : `Cần GPU lớn hơn (~${nf(need, 0)} GB)`}</button>
    </article>`;
  }
  function renderFt() {
    const g = gpuById(ftCfg.gpu), pps = g.perSec * ftCfg.gpuCount;
    $("#ftSum").innerHTML = `<div><small>Tổng VRAM</small><b>${g.vram * ftCfg.gpuCount} GB</b></div>
      <div><small>Giá</small><b>${cr(pps * 3600)}/giờ</b></div>
      <div><small>Số dư đủ dùng</small><b>≈ ${nf(balanceHours(pps), 1)} giờ</b></div>
      ${ftCfg.gpuCount > 1 ? `<p class="cl-note">2 GPU: model được chia ra 2 GPU (FSDP) nên dùng được khoảng 90% tổng VRAM.</p>` : ""}`;
    const sug = ftSuggestions();
    $("#ftSug").innerHTML = sug.length ? sug.map(modelCard).join("") : `<div class="cl-empty">Chưa có model nào vừa ${g.vram * ftCfg.gpuCount} GB VRAM. Chọn GPU lớn hơn hoặc 2 GPU.</div>`;
    const all = C.ftModels.slice().sort((a, b) => (bestMethod(b) ? 1 : 0) - (bestMethod(a) ? 1 : 0) || vendorRank(a) - vendorRank(b) || b.params - a.params);
    $("#ftAllModels").innerHTML = all.map(modelCard).join("");
  }

  /* Hộp cấu hình một lượt tinh chỉnh */
  function parseDataset(name, text) {
    const ext = (name.split(".").pop() || "").toLowerCase();
    if (ext === "jsonl" || ext === "json") {
      const rows = text.split(/\r?\n/).filter((l) => l.trim());
      let ok = 0, bad = 0;
      for (const l of rows) {
        try { const o = JSON.parse(l); (o.messages || o.instruction || o.prompt || o.text || o.input) ? ok++ : bad++; } catch { bad++; }
      }
      return { rows: ok, bad, format: "JSONL" };
    }
    if (ext === "csv") return { rows: Math.max(0, text.split(/\r?\n/).filter((l) => l.trim()).length - 1), bad: 0, format: "CSV" };
    return { rows: text.split(/\r?\n/).filter((l) => l.trim()).length, bad: 0, format: "Văn bản" };
  }
  function openTune(m) {
    if (!user) return openAuth("signup", "Tạo tài khoản để tinh chỉnh model.");
    const g = gpuById(ftCfg.gpu), ms = methodsFor(m);
    const st = { data: null, method: ms[0].id, epochs: 3, lr: "2e-4", rank: 16, seq: 2048 };
    const modal = document.createElement("div");
    modal.className = "modal cl-modal";
    modal.innerHTML = `<div class="modal-card cl-tune-card" role="dialog" aria-modal="true" aria-label="Tinh chỉnh ${esc(m.name)}">
      <header class="cl-tune-head"><div><h3>Tinh chỉnh ${esc(m.name)}</h3><small>${esc(m.repo)} · ${ftCfg.gpuCount} × ${esc(g.name)}</small></div>
        <button class="cl-x" data-x title="Đóng">${SVG(IC.clear, 18)}</button></header>
      <div class="cl-tune-body">
        <div class="cl-field"><span>Dữ liệu huấn luyện</span>
          <div class="cl-seg cl-datatabs" role="tablist"><button class="on" data-dtab="pack" role="tab">Gói có sẵn</button><button data-dtab="file" role="tab">File của bạn</button></div>
          <div class="cl-packs" id="tunePacks">
            <div class="cl-pack-row"><small>Loại dữ liệu</small><div class="cl-seg" data-pkrow="type"><button data-pk="code">Code</button><button data-pk="chat">Chat</button></div></div>
            <div class="cl-pack-row"><small>Ngôn ngữ</small><div class="cl-seg" data-pkrow="lang"><button data-pk="vi">Tiếng Việt</button><button data-pk="en">Tiếng Anh</button><button data-pk="mix">Việt/Anh</button></div></div>
            <div class="cl-pack-card" id="tunePackCard"></div>
          </div>
          <div class="cl-drop" id="tuneDrop" hidden>${SVG(IC.data, 22)}<div><b>Chọn file .jsonl, .csv hoặc .txt</b><small>JSONL dạng {"messages": [...]} hoặc {"instruction", "output"}. Chỉ dùng dữ liệu bạn có quyền sử dụng; không đưa thông tin cá nhân của người khác khi chưa được họ đồng ý.</small></div>
            <button class="btn-ghost sm" data-pick>Chọn file</button>
            <input type="file" id="tuneFile" accept=".jsonl,.json,.csv,.txt" hidden /></div>
          <small class="cl-data-info" id="tuneInfo"></small>
        </div>
        <div class="cl-field"><span>Cách tinh chỉnh</span>
          <div class="cl-methods">${C.ftMethods.map((x) => {
            const ok = ms.some((y) => y.id === x.id);
            return `<button class="${x.id === st.method ? "on" : ""}" data-method="${x.id}" ${ok ? "" : "disabled"}>
              <b>${esc(x.name)}</b><small>${ok ? esc(x.desc) : `Cần ~${nf(x.need(m.params), 0)} GB VRAM`}</small></button>`;
          }).join("")}</div>
        </div>
        <div class="cl-tune-grid">
          <label class="cl-field"><span>Số epoch</span><input type="number" id="tuneEpochs" min="1" max="10" value="3" /></label>
          <label class="cl-field"><span>Learning rate</span><select id="tuneLr"><option>1e-4</option><option selected>2e-4</option><option>5e-5</option><option>1e-5</option></select></label>
          <label class="cl-field"><span>LoRA rank</span><select id="tuneRank"><option>8</option><option selected>16</option><option>32</option><option>64</option></select></label>
          <label class="cl-field"><span>Độ dài tối đa</span><select id="tuneSeq"><option>512</option><option>1024</option><option selected>2048</option><option>4096</option></select></label>
        </div>
        ${m.gated ? `<p class="cl-note">${SVG(IC.lock, 13)} ${esc(m.repo)} cần đồng ý giấy phép trên Hugging Face và token truy cập khi chạy thật.</p>` : ""}
      </div>
      <footer class="cl-tune-foot"><span id="tuneCost"></span><button class="cl-start sm" data-go>${SVG(IC.play, 13)}Bắt đầu tinh chỉnh</button></footer>
    </div>`;
    document.body.appendChild(modal);
    const q = (s) => modal.querySelector(s);
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); done(); } };
    const done = () => { modal.remove(); document.removeEventListener("keydown", onKey, true); };
    document.addEventListener("keydown", onKey, true);
    modal.addEventListener("mousedown", (e) => { if (e.target === modal) done(); });
    q("[data-x]").onclick = done;
    const info = () => {
      q("#tuneInfo").textContent = st.data ? `${st.data.name}: ${fmt(st.data.rows)} mẫu (${st.data.format})${st.data.bad ? `, ${st.data.bad} dòng sai định dạng sẽ bỏ qua` : ""}` : "Chưa có dữ liệu";
      q("#tuneRank").disabled = st.method === "full";
      const steps = st.data ? Math.max(1, Math.ceil(st.data.rows / 8)) * st.epochs : 0;
      q("#tuneCost").innerHTML = st.data ? `${fmt(steps)} bước · ${cr(g.perSec * ftCfg.gpuCount * 3600)}/giờ` : "";
    };
    q("[data-pick]").onclick = () => q("#tuneFile").click();
    q("#tuneFile").onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 50 * 1024 * 1024) return showToast("File dữ liệu tối đa 50 MB ở bản này.", "warn");
      const text = await f.text();
      st.data = { name: f.name, text, ...parseDataset(f.name, text) };
      if (!st.data.rows) { st.data = null; showToast("Không đọc được mẫu nào trong file.", "warn"); }
      fileData = st.data;
      info();
    };
    // Gói dữ liệu có sẵn: Code / Chat × Tiếng Việt / Tiếng Anh / Việt-Anh
    const P = VICO_TRAIN_PACKS;
    const pk = { type: "chat", lang: "vi", size: P.sizes[1] };
    let fileData = null;
    const usePack = () => {
      const p = P[pk.type][pk.lang];
      st.data = {
        name: p.title, rows: pk.size, format: "Gói có sẵn", pack: { type: pk.type, lang: pk.lang, sources: p.sources.map((x) => x.repo) },
        text: p.samples.map(([u, a]) => JSON.stringify({ messages: [{ role: "user", content: u }, { role: "assistant", content: a }] })).join("\n"),
      };
    };
    const renderPack = () => {
      const p = P[pk.type][pk.lang];
      modal.querySelectorAll("[data-pkrow] [data-pk]").forEach((b) => b.classList.toggle("on", b.dataset.pk === pk[b.parentElement.dataset.pkrow]));
      q("#tunePackCard").innerHTML = `<div class="cl-pack-top"><b>${esc(p.title)}</b><span class="cl-fit ok">${fmt(p.samples.length)} mẫu xem trước</span></div>
        <p>${esc(p.desc)}</p>
        <div class="cl-pack-src"><small>Nguồn dữ liệu (Hugging Face) - máy chủ lấy ngẫu nhiên đủ số mẫu bạn chọn:</small>
          ${p.sources.map((x) => `<div><code>${esc(x.repo)}</code><span>${esc(x.note)} · giấy phép: ${esc(x.license)}</span></div>`).join("")}</div>
        <p class="cl-legal">Model train ra phải tuân thủ giấy phép của từng bộ dữ liệu và của model gốc (VD Llama, Gemma có điều khoản riêng). Bạn chịu trách nhiệm về cách dùng model.</p>
        <div class="cl-pack-row"><small>Số mẫu dùng để train</small><div class="cl-seg" data-pksize>${P.sizes.map((n) => `<button class="${n === pk.size ? "on" : ""}" data-size="${n}">${fmt(n)}</button>`).join("")}</div></div>
        <details class="cl-pack-samples"><summary>Xem mẫu trong gói</summary>${p.samples.map(([u, a]) => `<div class="cl-sample"><b>Người dùng:</b> ${esc(u)}<div class="cl-sample-a content">${renderMarkdown(a)}</div></div>`).join("")}</details>`;
      usePack();
      info();
    };
    q("#tunePacks").addEventListener("click", (e) => {
      const b = e.target.closest("[data-pk]"), s = e.target.closest("[data-size]");
      if (b) { pk[b.parentElement.dataset.pkrow] = b.dataset.pk; renderPack(); }
      if (s) { pk.size = +s.dataset.size; renderPack(); }
    });
    q(".cl-datatabs").onclick = (e) => {
      const b = e.target.closest("[data-dtab]");
      if (!b) return;
      const file = b.dataset.dtab === "file";
      modal.querySelectorAll("[data-dtab]").forEach((x) => x.classList.toggle("on", x === b));
      q("#tunePacks").hidden = file;
      q("#tuneDrop").hidden = !file;
      if (file) { st.data = fileData; info(); } else renderPack();
    };
    q(".cl-methods").onclick = (e) => {
      const b = e.target.closest("[data-method]:not(:disabled)");
      if (!b) return;
      st.method = b.dataset.method;
      modal.querySelectorAll("[data-method]").forEach((x) => x.classList.toggle("on", x === b));
      info();
    };
    q("#tuneEpochs").oninput = (e) => { st.epochs = clamp(+e.target.value || 1, 1, 10); info(); };
    q("[data-go]").onclick = () => {
      if (!st.data) return showToast("Chọn một gói có sẵn hoặc nạp file dữ liệu của bạn trước nhé.", "warn");
      st.lr = q("#tuneLr").value; st.rank = +q("#tuneRank").value; st.seq = +q("#tuneSeq").value;
      done();
      startJob(m, st);
    };
    renderPack();
  }

  /* Lượt tinh chỉnh (demo: mô phỏng tiến độ, loss) */
  const JOBS_KEY = () => uk("vico_ft_jobs");
  const loadJobs = () => { jobs = loadKey(JOBS_KEY(), []); jobs.forEach((j) => { if (j.status === "running") j.status = "stopped"; }); };
  const saveJobs = () => saveKey(JOBS_KEY(), jobs.map(({ ctrl, meter: _m, ...j }) => j).slice(0, 30));
  async function startJob(m, st) {
    const g = gpuById(ftCfg.gpu);
    const need = needCredits(g.perSec * ftCfg.gpuCount, 1);
    user = VicoAuth.current();
    if (!user || user.total < need) return showToast(`Cần ít nhất ${fmt(need)} credit để chạy ${ftCfg.gpuCount} × ${g.name}. Bạn còn ${fmt(user ? user.total : 0)} credit.`, "warn");
    const job = {
      id: "j" + Date.now().toString(36), model: m.name, repo: m.repo, method: C.ftMethods.find((x) => x.id === st.method).name,
      gpu: g.name, gpuCount: ftCfg.gpuCount, pps: g.perSec * ftCfg.gpuCount, data: st.data.name, rows: st.data.rows, pack: st.data.pack || null,
      epochs: st.epochs, lr: st.lr, rank: st.method === "full" ? null : st.rank, seq: st.seq,
      step: 0, totalSteps: Math.max(1, Math.ceil(st.data.rows / 8)) * st.epochs, loss: [], log: [], status: "running", startedAt: Date.now(),
    };
    job.ctrl = new AbortController();
    job.meter = meter(job.pps, `Finetune · ${m.name} · ${job.gpuCount} × ${g.name}`, () => {
      showToast("Hết credit nên lượt tinh chỉnh đã dừng.", "warn");
      job.ctrl.abort();
    });
    jobs.unshift(job);
    saveJobs();
    renderJobs();
    showToast(`Đã bắt đầu tinh chỉnh ${m.name}.`, "success");
    const logLine = (t) => { job.log.push(`[${clock((Date.now() - job.startedAt) / 1000)}] ${t}`); };
    try {
      logLine(`Cấp ${job.gpuCount} × ${job.gpu}${demo ? " (demo)" : ""}`);
      await sleep(900, job.ctrl.signal); renderJobs();
      logLine(`Tải ${job.repo} từ Hugging Face`);
      await sleep(1100, job.ctrl.signal); renderJobs();
      if (job.pack) logLine(`Lấy ${fmt(job.rows)} mẫu từ ${job.pack.sources.join(", ")}`);
      logLine(`Chuẩn bị dữ liệu: ${fmt(job.rows)} mẫu, tối đa ${job.seq} token · ${job.method}${job.rank ? `, rank ${job.rank}` : ""}, lr ${job.lr}`);
      await sleep(700, job.ctrl.signal);
      // Demo chạy nhanh: tối đa ~25 giây dù số bước nhiều
      const stepMs = Math.max(40, Math.min(400, 25000 / job.totalSteps));
      const stride = Math.max(1, Math.ceil(job.totalSteps * stepMs / 25000));
      const start = 2.1 + Math.random() * 0.4, floor = 0.35 + Math.random() * 0.25;
      let loss = start;
      let lastCharge = Date.now();
      for (job.step = stride; job.step < job.totalSteps + stride; job.step += stride) {
        job.step = Math.min(job.step, job.totalSteps);
        await sleep(stepMs, job.ctrl.signal);
        if (Date.now() - lastCharge > 5000) { lastCharge = Date.now(); job.meter.charge(); }
        const p = job.step / job.totalSteps; // loss giảm theo tiến độ cả lượt (không phụ thuộc số bước)
        loss = Math.max(0.12, floor + (start - floor) * Math.exp(-3.2 * p) + (Math.random() - 0.5) * 0.06);
        job.loss.push(+loss.toFixed(4));
        const per = Math.ceil(job.totalSteps / job.epochs);
        if (Math.floor(job.step / per) > Math.floor((job.step - stride) / per) || job.step === job.totalSteps) logLine(`Epoch ${Math.min(job.epochs, Math.max(1, Math.floor(job.step / per)))}/${job.epochs} xong · loss ${loss.toFixed(4)}`);
        paintJob(job);
      }
      job.step = job.totalSteps;
      logLine(`Lưu ${job.method.startsWith("Full") ? "model" : "adapter LoRA"} · hoàn tất`);
      job.status = "done";
      showToast(`Tinh chỉnh ${m.name} xong.`, "success");
    } catch (err) {
      job.status = err && err.name === "AbortError" ? "stopped" : "error";
      logLine(job.status === "stopped" ? "Đã dừng theo yêu cầu" : "Lỗi: " + err.message);
    }
    job.endedAt = Date.now();
    job.credits = job.meter.stop();
    delete job.ctrl;
    delete job.meter;
    saveJobs();
    renderJobs();
  }
  function jobHtml(j) {
    const pct = Math.round((j.step / j.totalSteps) * 100);
    const dur = ((j.endedAt || Date.now()) - j.startedAt) / 1000;
    const label = { running: "Đang chạy", done: "Hoàn tất", stopped: "Đã dừng", error: "Lỗi" }[j.status];
    const pts = j.loss.slice(-120), max = Math.max(...pts, 0.01), min = Math.min(...pts, max);
    const path = pts.map((v, i) => `${i ? "L" : "M"}${(i / Math.max(1, pts.length - 1)) * 200},${40 - ((v - min) / Math.max(0.0001, max - min)) * 36 - 2}`).join(" ");
    return `<article class="cl-job ${j.status}" data-job="${j.id}">
      <div class="cl-job-top"><b>${esc(j.model)}</b><span class="cl-job-st">${label}</span>
        ${j.status === "running" ? `<button class="btn-ghost sm" data-stopjob="${j.id}">${SVG(IC.stop, 11)}Dừng</button>` : `<button class="cl-x sm" data-deljob="${j.id}" title="Xoá khỏi danh sách">${SVG(IC.clear, 14)}</button>`}</div>
      <small>${esc(j.method)} · ${j.gpuCount} × ${esc(j.gpu)} · ${fmt(j.rows)} mẫu · ${j.epochs} epoch · ${clock(dur)} · ${fmt(j.meter ? j.meter.due() : j.credits || 0)} credit</small>
      <div class="cl-job-prog"><i style="width:${pct}%"></i></div>
      <div class="cl-job-row"><span>Bước ${fmt(j.step)}/${fmt(j.totalSteps)} · ${pct}%</span><span>${j.loss.length ? `loss ${j.loss[j.loss.length - 1]}` : ""}</span></div>
      ${pts.length > 1 ? `<svg class="cl-loss" viewBox="0 0 200 40" preserveAspectRatio="none"><path d="${path}" /></svg>` : ""}
      <details class="cl-job-log"${j.status === "running" ? " open" : ""}><summary>Nhật ký</summary><pre>${esc(j.log.slice(-12).join("\n"))}</pre></details>
    </article>`;
  }
  function renderJobs() {
    const box = document.getElementById("ftJobs");
    if (!box) return;
    box.innerHTML = jobs.length ? `<section class="cl-sec"><div class="cl-sec-head"><h3>Lượt tinh chỉnh</h3><small>${jobs.length} lượt</small></div>
      <div class="cl-jobs">${jobs.slice(0, 6).map(jobHtml).join("")}</div></section>` : "";
    box.onclick = (e) => {
      const s = e.target.closest("[data-stopjob]"), d = e.target.closest("[data-deljob]");
      if (s) { const j = jobs.find((x) => x.id === s.dataset.stopjob); if (j && j.ctrl) j.ctrl.abort(); }
      if (d) { jobs = jobs.filter((x) => x.id !== d.dataset.deljob); saveJobs(); renderJobs(); }
    };
  }
  let jobPaint = 0;
  function paintJob(j) {
    if (jobPaint) return;
    jobPaint = requestAnimationFrame(() => {
      jobPaint = 0;
      const el = page.querySelector(`[data-job="${j.id}"]`);
      if (!el) return;
      const tmp = document.createElement("div");
      tmp.innerHTML = jobHtml(j);
      const open = el.querySelector("details") && el.querySelector("details").open;
      el.replaceWith(tmp.firstElementChild);
      const d = page.querySelector(`[data-job="${j.id}"] details`);
      if (d) d.open = open;
    });
  }

  // Đổi tài khoản: nạp notebook / lượt tinh chỉnh của tài khoản đó
  const clAuth = onAuthChanged;
  onAuthChanged = () => {
    if (session) stopSession(false);
    nb = null;
    loadJobs();
    clAuth();
    if (!page.hidden) go(view === "notebook" ? "home" : view);
  };
  loadJobs();
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !page.hidden && view !== "notebook" && !document.querySelector(".modal:not([hidden])")) close(); });

  return { open, close, get session() { return session; } };
})();
