/* =========================================================
   GIỚI THIỆU GROUP AI (bản desktop): phát lần đầu người dùng bấm Group AI
   Cảnh 1: con chuột thêm 3 thành viên Vico AI Lite 2.6 (Trưởng nhóm, Nghiên cứu, Lập trình)
   Cảnh 2: gõ tin nhắn giao việc → Trưởng nhóm lập kế hoạch → Nghiên cứu khảo sát web các hãng đầu ngành
           → Lập trình code (panel code mở bên phải như app thật) → Trưởng nhóm nhận xét, cho deploy
   Chuyển động chuột: requestAnimationFrame + easeInOutCubic theo đường cong nhẹ; hiệu ứng tối giản.
   ========================================================= */
(() => {
  const SEEN = "vico_group_intro_seen";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MEMBERS = [
    { role: "Trưởng nhóm", handle: "truongnhom", color: "#8b5cf6", initial: "T" },
    { role: "Nghiên cứu", handle: "nghiencuu", color: "#0ea5e9", initial: "N" },
    { role: "Lập trình", handle: "laptrinh", color: "#ec4899", initial: "L" },
  ];
  const ROLES = ["Trưởng nhóm", "Nghiên cứu", "Lập trình", "Thiết kế", "Kiểm thử"];
  const PROMPT = "@trưởng nhóm, hãy giao việc cho nghiên cứu và lập trình để code cho tôi 1 web bán nội thất";

  const PLAN = [
    "Mình đã đọc yêu cầu. Kế hoạch làm **web bán nội thất Mộc Home**, chia làm 3 giai đoạn:",
    "### Giai đoạn 1: Nghiên cứu (@nghiencuu)",
    "• Khảo sát website của các hãng nội thất đầu ngành: cách chia danh mục, trang sản phẩm, giỏ hàng, chính sách giao hàng.",
    "• Xác định khách hàng mục tiêu và nhu cầu chính khi mua nội thất online.",
    "• Đề xuất phong cách thiết kế, bảng màu, font chữ và các tính năng bắt buộc phải có.",
    "### Giai đoạn 2: Lập trình (@laptrinh)",
    "• Trang chủ: banner lớn, bộ sưu tập nổi bật, sản phẩm bán chạy, cam kết giao hàng.",
    "• Trang danh mục: lọc theo phòng (khách, ngủ, bếp, làm việc), theo giá và chất liệu.",
    "• Trang chi tiết sản phẩm: ảnh lớn, kích thước, chất liệu, nút thêm vào giỏ.",
    "• Giỏ hàng: tăng / giảm số lượng, tính tổng tiền, lưu lại khi tải lại trang.",
    "• Responsive trên điện thoại, dùng đúng phong cách và nội dung @nghiencuu đề xuất.",
    "### Giai đoạn 3: Kiểm tra (mình)",
    "• Rà soát code, giao diện và trải nghiệm mua hàng, rồi báo kết quả cho bạn.",
    "@nghiencuu bắt đầu trước nhé, @laptrinh dựng khung trang trong lúc chờ kết quả.",
  ];
  const RESEARCH = [
    "Đã nhận phần việc từ @truongnhom. Mình đã khảo sát website của các hãng nội thất đầu ngành như **IKEA**, **Nhà Xinh**, **BAYA** và **JYSK**. Tổng hợp:",
    "### Điểm chung của các web dẫn đầu",
    "• Danh mục chia **theo phòng** trước, sau đó mới theo loại sản phẩm, giúp khách tìm nhanh hơn.",
    "• Ảnh sản phẩm đặt trong **không gian thật**, có ảnh cận chất liệu và kích thước rõ ràng.",
    "• Giá hiển thị ngay trên thẻ sản phẩm, có nhãn giảm giá và hàng mới.",
    "• Chính sách **giao hàng, lắp đặt, đổi trả** được nhắc ở trang chủ và trang sản phẩm.",
    "• Thanh tìm kiếm luôn ở đầu trang, giỏ hàng có số lượng hiển thị.",
    "### Khách hàng mục tiêu",
    "• 25 - 40 tuổi, sống ở chung cư, thích đồ gọn gàng, dễ phối và bền.",
    "### Đề xuất cho Mộc Home",
    "• Phong cách tối giản Bắc Âu: gỗ sồi sáng, màu be **#EFE8DD**, xanh rêu **#5E6B52**, chữ nâu đậm **#3B2F22**.",
    "• Font: Be Vietnam Pro, tiêu đề đậm, nhiều khoảng trắng.",
    "• Danh mục chính: sofa, bàn ăn, giường, kệ sách, đèn trang trí.",
    "@laptrinh có thể dùng toàn bộ thông tin này để dựng giao diện.",
  ];
  const DEV = [
    "Theo kế hoạch của @truongnhom và thông tin của @nghiencuu, mình đã code xong 3 file (xem trong panel code bên phải):",
    "• **index.html**: trang chủ, thanh danh mục theo phòng, lưới sản phẩm, giỏ hàng.",
    "• **style.css**: phong cách Bắc Âu với bảng màu và font @nghiencuu đề xuất, responsive.",
    "• **app.js**: lọc sản phẩm theo phòng, thêm vào giỏ, tính tổng tiền, lưu giỏ hàng.",
  ];
  const REVIEW = [
    "Mình đã kiểm tra phần việc của @laptrinh theo kế hoạch:",
    "✓ Đủ trang chủ, lọc theo phòng, thẻ sản phẩm và giỏ hàng như giai đoạn 2.",
    "✓ Giao diện đúng phong cách, bảng màu và font @nghiencuu đề xuất.",
    "✓ Code gọn, tách riêng HTML, CSS, JS; giỏ hàng được lưu khi tải lại trang.",
    "✓ Hiển thị tốt trên điện thoại.",
    "**Đánh giá: app làm tốt, có thể deploy.** Bạn có thể xem trước hoặc lưu 3 file vào thư mục dự án ngay bây giờ.",
  ];
  const FILES = {
    "index.html": { badge: "HTML", color: "#e44d26", code: [
      '<!doctype html>',
      '<html lang="vi">',
      '<head>',
      '  <meta charset="utf-8" />',
      '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
      '  <title>Mộc Home · Nội thất tối giản</title>',
      '  <link rel="stylesheet" href="style.css" />',
      '</head>',
      '<body>',
      '  <header class="topbar">',
      '    <a class="logo" href="#">Mộc Home</a>',
      '    <input class="search" placeholder="Tìm sofa, bàn ăn, đèn..." />',
      '    <button class="cart">Giỏ hàng <span id="count">0</span></button>',
      '  </header>',
      '  <section class="hero">',
      '    <h1>Nội thất tối giản cho căn hộ của bạn</h1>',
      '    <p>Gỗ sồi tự nhiên · Giao và lắp đặt miễn phí</p>',
      '  </section>',
      '  <nav class="rooms">',
      '    <button data-room="all" class="on">Tất cả</button>',
      '    <button data-room="khach">Phòng khách</button>',
      '    <button data-room="ngu">Phòng ngủ</button>',
      '    <button data-room="bep">Bếp</button>',
      '  </nav>',
      '  <main id="products" class="grid"></main>',
      '  <script src="app.js"></script>',
      '</body>',
      '</html>',
    ] },
    "style.css": { badge: "CSS", color: "#2965f1", code: [
      ':root { --be: #efe8dd; --reu: #5e6b52; --nau: #3b2f22; }',
      'body { margin: 0; font-family: "Be Vietnam Pro", sans-serif; color: var(--nau); }',
      '.topbar { display: flex; gap: 16px; align-items: center; padding: 16px 6vw; }',
      '.hero { padding: 72px 6vw; background: var(--be); }',
      '.hero h1 { font-size: clamp(28px, 5vw, 52px); max-width: 640px; }',
      '.rooms { display: flex; gap: 8px; padding: 20px 6vw; }',
      '.rooms .on { background: var(--reu); color: #fff; }',
      '.grid { display: grid; gap: 20px; padding: 0 6vw 60px;',
      '  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }',
      '.card img { width: 100%; aspect-ratio: 4 / 3; border-radius: 14px; }',
      '@media (max-width: 640px) { .topbar .search { display: none; } }',
    ] },
    "app.js": { badge: "JS", color: "#d6b500", code: [
      'const products = [',
      '  { name: "Sofa Oslo", room: "khach", price: 8900000 },',
      '  { name: "Bàn ăn Linn", room: "bep", price: 5400000 },',
      '  { name: "Giường Fjord", room: "ngu", price: 7600000 },',
      '];',
      'const cart = JSON.parse(localStorage.getItem("cart") || "[]");',
      'function render(room = "all") {',
      '  products.filter((p) => room === "all" || p.room === room)',
      '    .forEach((p) => grid.append(card(p)));',
      '}',
      'function addToCart(p) {',
      '  cart.push(p); localStorage.setItem("cart", JSON.stringify(cart));',
      '  count.textContent = cart.length;',
      '}',
    ] },
  };

  let cancel = null;
  const sleep = (ms) => new Promise((res, rej) => { const t = setTimeout(res, ms); if (cancel) cancel.timers.push(() => { clearTimeout(t); rej(new Error("skip")); }); });
  const nextFrame = (fn) => setTimeout(fn, 20); // thêm class "in" ở nhịp sau để có transition
  const fmtText = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/@(trưởng nhóm|[\p{L}\p{N}_]+)/gu, '<span class="gi-at">@$1</span>');

  /* ---------- Khung ---------- */
  function build() {
    const ov = document.createElement("div");
    ov.className = "gi-overlay";
    ov.innerHTML = `
      <div class="gi-wrap" role="dialog" aria-modal="true" aria-label="Giới thiệu Group AI">
        <div class="gi-top"><b>Group AI</b><span class="gi-cap" id="giCap">Thêm thành viên cho nhóm</span><button class="gi-skip" id="giSkip">Bỏ qua</button></div>
        <div class="gi-stage" id="giStage">
          <section class="gi-scene gi-setup" id="giSetup">
            <div class="gi-field"><small>Tên nhóm</small><div class="gi-input">Team web nội thất</div></div>
            <div class="gi-field"><small>Thành viên</small><div class="gi-members" id="giMembers"><p class="gi-empty">Chưa có thành viên</p></div></div>
            <div class="gi-actions"><button class="gi-btn" id="giAdd">+ Thêm thành viên</button><button class="gi-btn primary" id="giSave">Lưu và bắt đầu</button></div>
            <div class="gi-picker" id="giPicker" hidden>
              <small>Chọn vai trò · model Vico AI Lite 2.6</small>
              ${ROLES.map((r) => `<button class="gi-opt" data-role="${esc(r)}"><b>${esc(r)}</b><span>Vico AI Lite 2.6</span></button>`).join("")}
            </div>
          </section>
          <section class="gi-scene gi-chat" id="giChat" hidden>
            <div class="gi-chatcol">
              <div class="gi-chathead"><span class="gi-avs">${MEMBERS.map((m) => `<i style="--c:${m.color}">${m.initial}</i>`).join("")}</span><b>Team web nội thất</b><small>3 AI · Vico AI Lite 2.6</small></div>
              <div class="gi-msgs" id="giMsgs"></div>
              <div class="gi-composer"><div class="gi-text" id="giText"><span class="gi-ph">Nhắn cho nhóm…</span></div><button class="gi-send" id="giSend" aria-label="Gửi"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
            </div>
            <aside class="gi-panel" id="giPanel">
              <div class="gi-ptabs"><span class="on">&lt;/&gt; Code</span><span>Thư mục &amp; Terminal</span></div>
              <div class="gi-plist"><small>FILE TRONG PHIÊN</small><div id="giFiles"></div></div>
              <div class="gi-pview"><div class="gi-pbar" id="giPbar"></div><div class="gi-pcode" id="giPcode"></div></div>
            </aside>
          </section>
          <div class="gi-cursor" id="giCursor"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 3l14 8.2-6.3 1.3 3.6 6.6-2.6 1.4-3.6-6.6L5 18.5z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg></div>
          <div class="gi-end" id="giEnd" hidden>
            <b>Cả nhóm AI cùng làm việc cho bạn</b>
            <span>Trưởng nhóm lập kế hoạch và kiểm tra, các thành viên làm phần của mình và dùng kết quả của nhau.</span>
            <div><button class="gi-btn" id="giReplay">Xem lại</button><button class="gi-btn primary" id="giStart">Tạo nhóm của bạn</button></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ov);
    return ov;
  }

  /* ---------- Chuột ---------- */
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let cur = { x: 0, y: 0 };
  function placeCursor(el, x, y) { cur = { x, y }; el.style.transform = `translate(${x}px, ${y}px)`; }
  function moveTo(cursor, stage, target, dx = 0.5, dy = 0.55) {
    const s = stage.getBoundingClientRect(), r = target.getBoundingClientRect();
    const x = r.left - s.left + r.width * dx, y = r.top - s.top + r.height * dy;
    const from = { ...cur }, dist = Math.hypot(x - from.x, y - from.y);
    if (reduce || dist < 2) { placeCursor(cursor, x, y); return sleep(reduce ? 250 : 0); }
    const dur = Math.min(1150, Math.max(520, 380 + dist * 0.75));
    // đường cong nhẹ: điểm điều khiển lệch vuông góc ~12% quãng đường
    const mx = (from.x + x) / 2 - (y - from.y) * 0.12, my = (from.y + y) / 2 + (x - from.x) * 0.12;
    return new Promise((res, rej) => {
      const t0 = performance.now();
      let raf = 0;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur), k = ease(p), a = 1 - k;
        placeCursor(cursor, a * a * from.x + 2 * a * k * mx + k * k * x, a * a * from.y + 2 * a * k * my + k * k * y);
        if (p < 1) raf = requestAnimationFrame(step); else res();
      };
      raf = requestAnimationFrame(step);
      cancel.timers.push(() => { cancelAnimationFrame(raf); rej(new Error("skip")); });
    });
  }
  async function click(cursor, stage, target) {
    await moveTo(cursor, stage, target);
    await sleep(120);
    cursor.classList.add("down"); target.classList.add("gi-press");
    const ring = document.createElement("i");
    ring.className = "gi-ring"; ring.style.left = cur.x + "px"; ring.style.top = cur.y + "px";
    stage.appendChild(ring);
    setTimeout(() => ring.remove(), 600);
    await sleep(140);
    cursor.classList.remove("down"); target.classList.remove("gi-press");
    await sleep(180);
  }

  /* ---------- Tin nhắn ---------- */
  function scrollMsgs(box) { box.scrollTop = box.scrollHeight; }
  function addMsg(box, html, cls = "") {
    const el = document.createElement("div");
    el.className = "gi-msg " + cls;
    el.innerHTML = html;
    box.appendChild(el);
    nextFrame(() => el.classList.add("in"));
    scrollMsgs(box);
    return el;
  }
  async function streamLines(box, body, lines, speed = 1) {
    for (const line of lines) {
      const heading = line.startsWith("### ");
      const p = document.createElement(heading ? "h5" : "p");
      body.appendChild(p);
      const words = (heading ? line.slice(4) : line).split(" ");
      for (let i = 1; i <= words.length; i++) {
        p.innerHTML = fmtText(words.slice(0, i).join(" "));
        if (i % 5 === 0) scrollMsgs(box);
        await sleep(reduce ? 0 : (26 + Math.random() * 22) * speed);
      }
      scrollMsgs(box);
      await sleep(heading ? 120 : 160);
    }
  }
  async function botReply(box, who, lines, after) {
    const m = MEMBERS[who];
    const el = addMsg(box, `<span class="gi-av" style="--c:${m.color}">${m.initial}</span><div class="gi-mcol"><div class="gi-who"><b style="color:${m.color}">@${m.handle}</b><span>${m.role}</span><small>Vico AI Lite 2.6</small></div><div class="gi-body"><span class="gi-dots"><i></i><i></i><i></i></span></div></div>`, "bot");
    const body = el.querySelector(".gi-body");
    await sleep(900);
    body.innerHTML = "";
    await streamLines(box, body, lines);
    if (after) await after(body);
    await sleep(600);
  }

  /* ---------- Panel code (giống panel Code của app) ---------- */
  async function codePanel(ov, box) {
    const $ = (s) => ov.querySelector(s);
    $("#giChat").classList.add("with-panel");
    await sleep(450);
    const files = $("#giFiles"), bar = $("#giPbar"), view = $("#giPcode");
    for (const [name, f] of Object.entries(FILES)) {
      const row = document.createElement("div");
      row.className = "gi-pfile on";
      row.innerHTML = `<span class="gi-pbadge" style="--c:${f.color}">${f.badge}</span>${esc(name)}<i class="gi-plive"></i>`;
      files.querySelectorAll(".gi-pfile").forEach((x) => x.classList.remove("on"));
      files.appendChild(row);
      bar.innerHTML = `<span class="gi-ptab">${esc(name)}</span><small>AI đang viết…</small>`;
      view.innerHTML = "";
      for (let i = 0; i < f.code.length; i++) {
        const ln = document.createElement("div");
        ln.innerHTML = `<b>${i + 1}</b><span>${esc(f.code[i])}</span>`;
        view.appendChild(ln);
        view.scrollTop = view.scrollHeight;
        await sleep(reduce ? 0 : 75 + Math.random() * 45);
      }
      row.querySelector(".gi-plive").remove();
      bar.querySelector("small").textContent = `${f.code.length} dòng`;
      await sleep(500);
    }
  }

  /* ---------- Kịch bản ---------- */
  async function play(ov) {
    const $ = (s) => ov.querySelector(s);
    const stage = $("#giStage"), cursor = $("#giCursor");
    const st = stage.getBoundingClientRect();
    placeCursor(cursor, st.width * 0.82, st.height * 0.9);
    cursor.classList.add("show");
    await sleep(700);
    // Cảnh 1: thêm 3 thành viên
    for (const m of MEMBERS) {
      await click(cursor, stage, $("#giAdd"));
      $("#giPicker").hidden = false;
      nextFrame(() => $("#giPicker").classList.add("in"));
      await sleep(350);
      await click(cursor, stage, $(`.gi-opt[data-role="${m.role}"]`));
      $("#giPicker").classList.remove("in");
      $("#giPicker").hidden = true;
      const list = $("#giMembers");
      const empty = list.querySelector(".gi-empty"); if (empty) empty.remove();
      const row = document.createElement("div");
      row.className = "gi-member";
      row.innerHTML = `<span class="gi-av" style="--c:${m.color}">${m.initial}</span><b>${m.role}</b><small>@${m.handle} · Vico AI Lite 2.6</small>`;
      list.appendChild(row);
      nextFrame(() => row.classList.add("in"));
      await sleep(450);
    }
    await click(cursor, stage, $("#giSave"));
    // Cảnh 2: chat
    $("#giSetup").classList.add("out");
    await sleep(320);
    $("#giSetup").hidden = true;
    $("#giChat").hidden = false;
    nextFrame(() => $("#giChat").classList.add("in"));
    $("#giCap").textContent = "Giao việc cho nhóm";
    await sleep(500);
    const text = $("#giText");
    await click(cursor, stage, text);
    text.innerHTML = '<span class="gi-typed"></span><i class="gi-caret"></i>';
    const typed = text.querySelector(".gi-typed");
    for (const ch of PROMPT) { // gõ như người thật: nhịp không đều, dừng lâu hơn sau dấu phẩy
      typed.textContent += ch;
      await sleep(reduce ? 0 : ch === "," ? 260 : ch === " " ? 70 + Math.random() * 60 : 38 + Math.random() * 46);
    }
    await sleep(450);
    await click(cursor, stage, $("#giSend"));
    const box = $("#giMsgs");
    addMsg(box, `<div class="gi-user">${fmtText(PROMPT)}</div>`, "user");
    text.innerHTML = '<span class="gi-ph">Nhắn cho nhóm…</span>';
    cursor.classList.remove("show");
    $("#giCap").textContent = "Trưởng nhóm lập kế hoạch";
    await sleep(500);
    await botReply(box, 0, PLAN);
    $("#giCap").textContent = "Nghiên cứu khảo sát web các hãng đầu ngành";
    await botReply(box, 1, RESEARCH);
    $("#giCap").textContent = "Lập trình code theo kế hoạch";
    await botReply(box, 2, DEV.slice(0, 1), async (body) => {
      await codePanel(ov, box);
      await streamLines(box, body, DEV.slice(1));
      const chips = document.createElement("div");
      chips.className = "gi-files";
      chips.innerHTML = Object.entries(FILES).map(([n, f]) => `<span><i style="--c:${f.color}">${f.badge}</i>${esc(n)}</span>`).join("");
      body.appendChild(chips);
      scrollMsgs(box);
    });
    $("#giCap").textContent = "Trưởng nhóm kiểm tra kết quả";
    await botReply(box, 0, REVIEW);
    await sleep(500);
    $("#giEnd").hidden = false;
    nextFrame(() => $("#giEnd").classList.add("in"));
  }

  function open({ onDone } = {}) {
    if (document.querySelector(".gi-overlay")) return;
    const ov = build();
    nextFrame(() => ov.classList.add("in"));
    const finish = (openSetup) => {
      try { localStorage.setItem(SEEN, "1"); } catch {}
      if (cancel) cancel.timers.forEach((f) => { try { f(); } catch {} });
      cancel = null;
      ov.classList.remove("in");
      setTimeout(() => ov.remove(), 250);
      if (openSetup && onDone) onDone();
    };
    cancel = { timers: [] };
    play(ov).catch(() => {});
    ov.querySelector("#giSkip").onclick = () => finish(true);
    ov.querySelector("#giStart").onclick = () => finish(true);
    ov.querySelector("#giReplay").onclick = () => { finish(false); setTimeout(() => open({ onDone }), 280); };
    ov.addEventListener("keydown", (e) => { if (e.key === "Escape") finish(true); });
    ov.tabIndex = -1; ov.focus();
  }

  // Lần đầu bấm Group AI: phát giới thiệu trước, xong mới mở khung tạo nhóm
  const btn = document.querySelector("#groupBtn");
  if (btn) btn.addEventListener("click", (e) => {
    let seen = false;
    try { seen = !!localStorage.getItem(SEEN); } catch {}
    if (seen) return;
    e.stopImmediatePropagation(); e.preventDefault();
    open({ onDone: () => btn.click() });
  }, true);
  window.VicoGroupIntro = { open, seenKey: SEEN };
})();
