/* =========================================================
   INTRO CHAT - Vico AI (lần đầu mở app, web + desktop)
   Phong cách marketing tối giản: nền sáng ấm, chữ lớn, chuyển cảnh mượt, ít hiệu ứng.
   6 cảnh: giới thiệu → Trò chuyện → Lập trình → Nghiên cứu sâu → Group AI → bắt đầu.
   window.VicoChatIntro.open({ onDone }) để xem lại.
   ========================================================= */
(() => {
  const SEEN = "vico_chat_intro_seen";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (n) => Number(n).toLocaleString("vi-VN");
  const CR = typeof VICO_CREDITS === "object" ? VICO_CREDITS : { signupBonus: 1000, dailyFree: 300 };
  const MARK = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M50 15 32 49" stroke="#fff" stroke-opacity=".62" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M14 15 32 49" stroke="#fff" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M32 3.7Q33 11.7 39 12.7Q33 13.7 32 21.7Q31 13.7 25 12.7Q31 11.7 32 3.7Z" fill="#fff"/></svg>`;
  const MODEL = typeof VICO_MODEL_NAME === "string" ? VICO_MODEL_NAME : "Vico AI Lite 2.6";

  const SCENES = [
    { id: "hero", dur: 4200 },
    { id: "chat", eyebrow: "Trò chuyện", title: "Hỏi bất cứ điều gì.", text: "Từ kế hoạch du lịch đến email công việc, Vico trả lời rõ ràng, có cấu trúc và đúng điều bạn cần.", dur: 9000 },
    { id: "code", eyebrow: "Lập trình", title: "Viết code. Xem ngay.", text: "Code hiện trong panel riêng như một trình soạn thảo thật, xem trước trang web chỉ với một cú nhấp.", dur: 8200 },
    { id: "research", eyebrow: "Nghiên cứu sâu", title: "Đọc hàng chục nguồn thay bạn.", text: "Deep Research tự tìm, đọc và tổng hợp thành bản báo cáo gọn gàng, có trích dẫn rõ ràng.", dur: 8200 },
    { id: "group", eyebrow: "Group AI", title: "Cả một đội AI làm cùng bạn.", text: "Trưởng nhóm chia việc, các thành viên nghiên cứu, lập trình và kiểm tra kết quả cho nhau.", dur: 8200 },
    { id: "cta", dur: 0 },
  ];

  let cancel = null;
  const sleep = (ms) => new Promise((res, rej) => {
    const t = setTimeout(res, reduce ? Math.min(ms, 60) : ms);
    if (cancel) cancel.push(() => { clearTimeout(t); rej(new Error("skip")); });
  });
  const later = (fn) => setTimeout(fn, 30);

  /* ---------- Bản dựng các cảnh ---------- */
  const copy = (s) => `<div class="ci-copy"><span class="ci-eyebrow">${esc(s.eyebrow)}</span><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></div>`;
  const demo = {
    chat: () => `<div class="ci-card ci-chat">
        <div class="ci-msgs" data-msgs></div>
        <div class="ci-composer"><span data-type></span><i class="ci-caret"></i><b class="ci-send">↑</b></div>
      </div>`,
    code: () => `<div class="ci-card ci-code">
        <div class="ci-editor">
          <div class="ci-tabs"><span class="on">index.html</span><span>style.css</span></div>
          <pre data-code></pre>
        </div>
        <div class="ci-preview" data-preview>
          <div class="ci-browser"><i></i><i></i><i></i><span>xem trước</span></div>
          <div class="ci-site">
            <b>Lá Trà Café</b><small>Trà ngon · Không gian yên tĩnh</small>
            <div class="ci-site-row"><span></span><span></span><span></span></div>
            <em>Đặt bàn</em>
          </div>
        </div>
      </div>`,
    research: () => `<div class="ci-card ci-research">
        <div class="ci-rhead"><b>Thị trường cà phê Việt Nam 2026</b><small data-rstatus>Đang tìm nguồn…</small></div>
        <div class="ci-rbar"><i data-rbar></i></div>
        <ul class="ci-sources" data-sources></ul>
        <div class="ci-report" data-report></div>
      </div>`,
    group: () => `<div class="ci-card ci-group">
        <div class="ci-team">
          <span style="--c:#7c6cf6">T<small>Trưởng nhóm</small></span>
          <span style="--c:#1aa3d9">N<small>Nghiên cứu</small></span>
          <span style="--c:#e2559b">L<small>Lập trình</small></span>
          <span style="--c:#1f9d6b">K<small>Kiểm thử</small></span>
        </div>
        <div class="ci-thread" data-thread></div>
      </div>`,
  };
  function sceneHtml(s) {
    if (s.id === "hero") return `<section class="ci-scene ci-hero" data-scene="hero">
        <div class="ci-mark"><span>${MARK}</span></div>
        <h1 class="ci-words">${["Nghĩ", "cùng", "bạn.", "Làm", "cùng", "bạn."].map((w, i) => `<span style="--i:${i}">${w}</span>`).join(" ")}</h1>
        <p class="ci-sub">${esc(MODEL)} · Trợ lý AI tiếng Việt cho học tập, công việc và sáng tạo.</p>
      </section>`;
    if (s.id === "cta") return `<section class="ci-scene ci-cta" data-scene="cta">
        <div class="ci-mark sm"><span>${MARK}</span></div>
        <h2>Bắt đầu cùng Vico AI.</h2>
        <p>Tặng ${fmt(CR.signupBonus)} credit khi tạo tài khoản, thêm ${fmt(CR.dailyFree)} credit mỗi ngày.</p>
        <div class="ci-actions"><button class="ci-btn primary" data-start>Bắt đầu trò chuyện</button><button class="ci-btn" data-replay>Xem lại</button></div>
      </section>`;
    return `<section class="ci-scene ci-split" data-scene="${s.id}">${copy(s)}<div class="ci-demo">${demo[s.id]()}</div></section>`;
  }
  function build() {
    const ov = document.createElement("div");
    ov.className = "ci-overlay";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", "Giới thiệu Vico AI");
    ov.innerHTML = `
      <div class="ci-glow"><i></i><i></i></div>
      <header class="ci-top">
        <span class="ci-brand"><i>${MARK}</i>Vico AI</span>
        <div class="ci-progress">${SCENES.map(() => "<span><i></i></span>").join("")}</div>
        <button class="ci-skip" data-skip>Bỏ qua</button>
      </header>
      <main class="ci-stage">${SCENES.map(sceneHtml).join("")}</main>`;
    document.body.appendChild(ov);
    return ov;
  }

  /* ---------- Hoạt cảnh từng cảnh ---------- */
  async function typeInto(el, text, min = 26, max = 52) {
    for (const ch of text) { el.textContent += ch; await sleep(ch === "," ? 180 : min + Math.random() * (max - min)); }
  }
  async function streamHtml(el, parts, speed = 34) {
    // parts: mảng [thẻ, nội dung]; hiện dần từng chữ, giữ định dạng
    for (const [tag, text] of parts) {
      const node = document.createElement(tag);
      el.appendChild(node);
      const words = text.split(" ");
      for (let i = 1; i <= words.length; i++) { node.innerHTML = words.slice(0, i).join(" ").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); await sleep(speed + Math.random() * 18); }
      el.scrollTop = el.scrollHeight;
      await sleep(120);
    }
  }
  const PLAY = {
    async hero() { await sleep(3600); },
    async chat(sc) {
      const type = sc.querySelector("[data-type]"), msgs = sc.querySelector("[data-msgs]");
      await sleep(700);
      const q = "Lên lịch trình Đà Lạt 3 ngày cho 2 người, ngân sách 5 triệu";
      await typeInto(type, q);
      await sleep(350);
      type.textContent = "";
      const u = document.createElement("div"); u.className = "ci-user"; u.textContent = q; msgs.appendChild(u); later(() => u.classList.add("in"));
      await sleep(500);
      const a = document.createElement("div"); a.className = "ci-ai"; a.innerHTML = '<span class="ci-avatar">' + MARK + '</span><div data-a></div>'; msgs.appendChild(a); later(() => a.classList.add("in"));
      await sleep(300);
      await streamHtml(a.querySelector("[data-a]"), [
        ["p", "Lịch trình gợi ý cho 2 người, tổng khoảng **4,8 triệu**:"],
        ["p", "**Ngày 1** · Quảng trường Lâm Viên, chợ đêm, lẩu gà lá é"],
        ["p", "**Ngày 2** · Đồi chè Cầu Đất, săn mây sáng sớm, cà phê view thung lũng"],
        ["p", "**Ngày 3** · Hồ Tuyền Lâm, thiền viện Trúc Lâm, mua đặc sản về"],
      ], 30);
      await sleep(900);
    },
    async code(sc) {
      const pre = sc.querySelector("[data-code]"), pv = sc.querySelector("[data-preview]");
      const lines = [
        '<section class="hero">',
        '  <h1>Lá Trà Café</h1>',
        '  <p>Trà ngon · Không gian yên tĩnh</p>',
        '  <a class="btn">Đặt bàn</a>',
        '</section>',
        '<div class="menu">',
        '  <article>Trà ô long</article>',
        '  <article>Trà sen vàng</article>',
        '</div>',
      ];
      await sleep(600);
      for (const l of lines) {
        const d = document.createElement("div");
        d.innerHTML = esc(l).replace(/(&lt;\/?)([a-z0-9]+)/g, '$1<em>$2</em>').replace(/(class)=(&quot;|")([^&"]+)/g, '<u>$1</u>=$2<s>$3</s>');
        pre.appendChild(d);
        await sleep(240);
      }
      await sleep(400);
      pv.classList.add("in");
      await sleep(2600);
    },
    async research(sc) {
      const list = sc.querySelector("[data-sources]"), bar = sc.querySelector("[data-rbar]"), st = sc.querySelector("[data-rstatus]"), rep = sc.querySelector("[data-report]");
      const src = ["Báo cáo ngành đồ uống 2026", "Khảo sát thói quen uống cà phê", "Số liệu xuất khẩu cà phê", "Xu hướng chuỗi cà phê đặc sản", "Phỏng vấn chủ quán tại Hà Nội"];
      await sleep(500);
      for (let i = 0; i < src.length; i++) {
        const li = document.createElement("li"); li.innerHTML = `<i></i><span>${esc(src[i])}</span><small>[${i + 1}]</small>`; list.appendChild(li); later(() => li.classList.add("in"));
        bar.style.width = ((i + 1) / src.length) * 100 + "%";
        st.textContent = `Đã đọc ${i + 1} / ${src.length} nguồn`;
        await sleep(420);
        li.classList.add("done");
      }
      st.textContent = "Đã tổng hợp báo cáo";
      await sleep(300);
      await streamHtml(rep, [
        ["p", "**Kết luận chính:** cà phê đặc sản tăng trưởng nhanh nhất, khách trẻ ưu tiên trải nghiệm và nguồn gốc hạt. <sup>[2]</sup><sup>[4]</sup>"],
      ], 34);
      await sleep(1200);
    },
    async group(sc) {
      const th = sc.querySelector("[data-thread]");
      const say = async (who, color, text) => {
        const m = document.createElement("div"); m.className = "ci-gmsg"; m.innerHTML = `<span style="--c:${color}">${who[0]}</span><div><b style="color:${color}">@${who}</b><p></p></div>`;
        th.appendChild(m); later(() => m.classList.add("in"));
        await sleep(260);
        const p = m.querySelector("p"), words = text.split(" ");
        for (let i = 1; i <= words.length; i++) { p.innerHTML = words.slice(0, i).join(" ").replace(/@(\w+)/g, "<u>@$1</u>"); await sleep(34); }
        await sleep(380);
      };
      await sleep(500);
      await say("truongnhom", "#7c6cf6", "Kế hoạch: @nghiencuu tìm đối thủ, @laptrinh dựng trang đặt bàn.");
      await say("nghiencuu", "#1aa3d9", "Đã xong: khách thích đặt bàn nhanh, xem menu có ảnh.");
      await say("laptrinh", "#e2559b", "Code xong theo kế hoạch và thông tin của nghiên cứu.");
      await say("kiemthu", "#1f9d6b", "Đã kiểm tra trên điện thoại, mọi thứ ổn. Có thể ra mắt.");
      await sleep(900);
    },
  };

  /* ---------- Điều khiển ---------- */
  async function play(ov, from = 0) {
    const scenes = [...ov.querySelectorAll(".ci-scene")], bars = [...ov.querySelectorAll(".ci-progress i")];
    for (let i = from; i < SCENES.length; i++) {
      scenes.forEach((s, j) => s.classList.toggle("on", j === i));
      bars.forEach((b, j) => { b.style.transition = "none"; b.style.width = j < i ? "100%" : "0%"; });
      if (SCENES[i].dur) later(() => { bars[i].style.transition = `width ${SCENES[i].dur}ms linear`; bars[i].style.width = "100%"; });
      else bars[i].style.width = "100%";
      if (PLAY[SCENES[i].id]) {
        const t0 = Date.now();
        await PLAY[SCENES[i].id](scenes[i]);
        const left = SCENES[i].dur - (Date.now() - t0);
        if (left > 0) await sleep(left);
      }
    }
  }
  function open({ onDone } = {}) {
    if (document.querySelector(".ci-overlay")) return;
    const ov = build();
    later(() => ov.classList.add("in"));
    cancel = [];
    const finish = () => {
      try { localStorage.setItem(SEEN, "1"); } catch {}
      if (cancel) cancel.forEach((f) => { try { f(); } catch {} });
      cancel = null;
      ov.classList.remove("in");
      setTimeout(() => ov.remove(), 400);
      document.removeEventListener("keydown", onKey);
      if (onDone) onDone();
    };
    const onKey = (e) => { if (e.key === "Escape") finish(); };
    document.addEventListener("keydown", onKey);
    ov.querySelector("[data-skip]").onclick = finish;
    ov.querySelector("[data-start]").onclick = finish;
    ov.querySelector("[data-replay]").onclick = () => { finish(); setTimeout(() => open({ onDone }), 450); };
    play(ov).catch(() => {});
  }
  // Lần đầu mở Vico AI: phát intro (bỏ qua khi chạy kiểm tra tự động)
  const auto = () => {
    let seen = false;
    try { seen = !!localStorage.getItem(SEEN); } catch {}
    if (seen || /[?&]smoke\b/.test(location.search) || document.documentElement.dataset.noIntro !== undefined) return;
    setTimeout(() => open({ onDone: () => { const i = document.querySelector("#input"); if (i) i.focus(); } }), 500);
  };
  if (document.querySelector("#input")) auto();
  window.VicoChatIntro = { open, seenKey: SEEN };
})();
