/* =========================================================
   GÓI PRO - Vico AI
   790.000 ₫/tháng · 700 credit mỗi ngày · tặng 9.000 credit mỗi tháng · dùng thử 7 ngày.
   Thanh toán duy nhất bằng thẻ tín dụng. Chưa nối cổng thanh toán: thẻ chỉ được kiểm tra và ghi nhận
   (hãng, 4 số cuối, hạn, tên), hết dùng thử chưa trừ tiền. Logic nằm ở VicoAuth.startPro / cancelPro (auth.js).
   ========================================================= */
(() => {
  const P = VICO_PLANS.pro;
  const SVG = (p, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const CHECK = '<path d="M5 12.5l4.5 4.5L19 7.5"/>', CARD = '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>';
  const LOCK = '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', CROWN = '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>';
  const date = (t) => new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const daysLeft = (t) => Math.max(0, Math.ceil((t - Date.now()) / 86400000));
  const BRAND_LABEL = { visa: "VISA", mastercard: "MC", amex: "AMEX", jcb: "JCB", discover: "DISC", unionpay: "UP", diners: "DC" };

  /* ---------- Hộp đăng ký Pro ---------- */
  const modal = document.createElement("div");
  modal.className = "modal pro-modal";
  modal.id = "proModal";
  modal.hidden = true;
  document.body.appendChild(modal);
  function openPro() {
    if (!user) return openAuth("signup", "Tạo tài khoản để dùng thử gói Pro.");
    user = VicoAuth.current();
    if (user.plan === "pro") return openSettings("credit");
    closePops();
    const trial = !user.trialUsed;
    modal.innerHTML = `<div class="modal-card pro-card" role="dialog" aria-modal="true" aria-labelledby="proTitle">
      <button class="pro-x" data-x title="Đóng">${SVG('<path d="M6 6l12 12M18 6L6 18"/>')}</button>
      <div class="pro-side">
        <span class="pro-crown">${SVG(CROWN, 22)}</span>
        <h3 id="proTitle">Vico Pro</h3>
        <div class="pro-price"><b>${vnd(P.priceVnd)}</b><span>/tháng (đã gồm thuế)</span></div>
        ${trial ? `<div class="pro-trial">Dùng thử miễn phí ${P.trialDays} ngày</div>` : `<div class="pro-trial used">Bạn đã dùng thử trước đó</div>`}
        <ul>
          <li>${SVG(CHECK, 16)}<span><b>${fmt(P.dailyCredits)} credit mỗi ngày</b> (gói Free: ${fmt(VICO_PLANS.free.dailyCredits)})</span></li>
          <li>${SVG(CHECK, 16)}<span><b>Tặng ${fmt(P.monthlyBonus)} credit mỗi tháng</b>, không hết hạn</span></li>
          <li>${SVG(CHECK, 16)}<span>Dùng mọi mức suy luận và chế độ Deep Research thoải mái hơn</span></li>
          <li>${SVG(CHECK, 16)}<span>Huỷ bất cứ lúc nào trong Cài đặt</span></li>
        </ul>
      </div>
      <form class="pro-form" id="proForm" novalidate autocomplete="on">
        <h4>${SVG(CARD, 18)}Thanh toán bằng thẻ tín dụng</h4>
        <label class="pro-field"><span>Số thẻ</span>
          <div class="pro-num"><input id="cardNumber" name="cardnumber" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" maxlength="23" /><em id="cardBrand"></em></div>
          <small class="pro-err" data-err="cardNumber"></small></label>
        <label class="pro-field"><span>Tên chủ thẻ</span>
          <input id="cardName" name="ccname" autocomplete="cc-name" placeholder="NGUYEN VAN A" maxlength="40" />
          <small class="pro-err" data-err="cardName"></small></label>
        <div class="pro-row">
          <label class="pro-field"><span>Hết hạn</span><input id="cardExp" name="cc-exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5" />
            <small class="pro-err" data-err="cardExp"></small></label>
          <label class="pro-field"><span>CVV</span><input id="cardCvc" name="cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4" type="password" />
            <small class="pro-err" data-err="cardCvc"></small></label>
        </div>
        <div class="pro-terms">
          <b>Điều kiện gói Pro</b>
          <ul>
            <li>Giá ${vnd(P.priceVnd)} mỗi ${P.cycleDays} ngày, tự gia hạn đến khi bạn huỷ.${trial ? ` Dùng thử miễn phí ${P.trialDays} ngày, huỷ trước khi hết hạn dùng thử thì không mất phí.` : ""}</li>
            <li>${VICO_PLANS.billingReady ? "Vico gửi email nhắc trước mỗi lần thu phí." : "Hiện Vico <b>chưa thu phí</b>. Trước khi bắt đầu thu phí, Vico sẽ thông báo và xin bạn xác nhận lại; không xác nhận thì gói tự về Free."}</li>
            <li>Huỷ bất cứ lúc nào trong Cài đặt → Credit. Huỷ thì về gói Free ngay, credit đã tặng vẫn giữ. Hoàn tiền theo <a href="terms.html#pro" target="_blank" rel="noopener">Điều khoản</a>.</li>
          </ul>
          <label class="pro-agree"><input type="checkbox" id="proAgree" /> <span>Tôi đồng ý các điều kiện trên và <a href="terms.html" target="_blank" rel="noopener">Điều khoản sử dụng</a>.</span></label>
        </div>
        <small class="pro-err" data-err="form"></small>
        <button class="pro-submit" type="submit">${trial ? `Bắt đầu dùng thử ${P.trialDays} ngày` : `Đăng ký Pro · ${vnd(P.priceVnd)}/tháng`}</button>
        <p class="pro-fine">${SVG(LOCK, 13)}<span>${trial ? `Hôm nay chưa trừ tiền. ` : ""}Vico chỉ lưu hãng thẻ, 4 số cuối, ngày hết hạn và tên chủ thẻ. Số thẻ đầy đủ không được lưu, CVV chỉ kiểm tra trên máy bạn và không gửi đi.
          ${VICO_PLANS.billingReady ? "" : "Thanh toán chưa được bật nên sau thời gian dùng thử cũng chưa trừ tiền."}</span></p>
      </form>
    </div>`;
    modal.hidden = false;
    const q = (s) => modal.querySelector(s);
    const num = q("#cardNumber"), exp = q("#cardExp"), cvc = q("#cardCvc");
    num.oninput = () => {
      const d = VicoCard.digitsOf(num.value).slice(0, 19), b = VicoCard.brandOf(d);
      num.value = (b && b.id === "amex" ? d.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, "$1 $2 $3") : d.replace(/(\d{4})(?=\d)/g, "$1 ")).trim();
      q("#cardBrand").textContent = b ? BRAND_LABEL[b.id] : "";
      q("#cardBrand").dataset.brand = b ? b.id : "";
      cvc.maxLength = b && b.id === "amex" ? 4 : 3;
      clearErr("cardNumber");
    };
    exp.oninput = (e) => {
      let d = VicoCard.digitsOf(exp.value).slice(0, 4);
      if (d.length === 1 && +d > 1) d = "0" + d;
      exp.value = d.length > 2 || (d.length === 2 && e.inputType !== "deleteContentBackward") ? d.slice(0, 2) + "/" + d.slice(2) : d;
      clearErr("cardExp");
    };
    cvc.oninput = () => { cvc.value = VicoCard.digitsOf(cvc.value); clearErr("cardCvc"); };
    q("#cardName").oninput = (e) => { e.target.value = e.target.value.toUpperCase(); clearErr("cardName"); };
    q("#proForm").onsubmit = async (e) => {
      e.preventDefault();
      modal.querySelectorAll("[data-err]").forEach((x) => (x.textContent = ""));
      const btn = q(".pro-submit");
      if (!q("#proAgree").checked) { modal.querySelector('[data-err="form"]').textContent = "Hãy đọc và đánh dấu đồng ý điều kiện gói Pro."; return; }
      btn.disabled = true;
      try {
        user = await VicoAuth.startPro({ number: num.value, name: q("#cardName").value, exp: exp.value, cvc: cvc.value, agree: true });
        closePro();
        renderAuth();
        renderCredits();
        showToast(user.proStatus === "trial"
          ? `Đã bật gói Pro! Dùng thử miễn phí đến ${date(user.trialEndsAt)}, tặng ngay ${fmt(P.monthlyBonus)} credit.`
          : `Đã bật gói Pro, tặng ${fmt(P.monthlyBonus)} credit.`, "success");
      } catch (err) {
        const box = modal.querySelector(`[data-err="${err.field || "form"}"]`) || modal.querySelector('[data-err="form"]');
        box.textContent = err.message;
        const inp = err.field && q("#" + err.field);
        if (inp) { inp.classList.add("bad"); inp.focus(); }
      } finally { btn.disabled = false; }
    };
    const clearErr = (f) => { const x = modal.querySelector(`[data-err="${f}"]`); if (x) x.textContent = ""; const i = q("#" + f); if (i) i.classList.remove("bad"); };
    q("[data-x]").onclick = closePro;
    setTimeout(() => num.focus(), 50);
  }
  const closePro = () => { modal.hidden = true; modal.innerHTML = ""; }; // không giữ lại dữ liệu thẻ trong trang
  modal.addEventListener("mousedown", (e) => { if (e.target === modal) closePro(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closePro(); });
  window.openPro = openPro;

  /* ---------- Thẻ gói trong Cài đặt > Credit ---------- */
  window.planCardHtml = () => {
    if (!user) return "";
    if (user.plan !== "pro") return `
      <h4>Gói của bạn</h4>
      <div class="plan-card">
        <div class="plan-top"><b>Gói Free</b><span>${fmt(VICO_PLANS.free.dailyCredits)} credit mỗi ngày</span></div>
        <div class="plan-offer">
          <span class="pro-crown sm">${SVG(CROWN, 16)}</span>
          <div><b>Vico Pro · ${vnd(P.priceVnd)}/tháng</b><small>${fmt(P.dailyCredits)} credit mỗi ngày, tặng ${fmt(P.monthlyBonus)} credit mỗi tháng${user.trialUsed ? "" : `, dùng thử ${P.trialDays} ngày miễn phí`}</small></div>
          <button class="pro-submit sm" data-open-pro>${user.trialUsed ? "Đăng ký Pro" : "Dùng thử miễn phí"}</button>
        </div>
      </div>`;
    const c = user.card;
    return `
      <h4>Gói của bạn</h4>
      <div class="plan-card pro">
        <div class="plan-top"><b>${SVG(CROWN, 16)} Gói Pro</b><span class="plan-status">${user.proStatus === "trial" ? `Dùng thử · còn ${daysLeft(user.trialEndsAt)} ngày` : "Đang dùng"}</span></div>
        <div class="plan-lines">
          <div><span>Credit mỗi ngày</span><b>${fmt(P.dailyCredits)}</b></div>
          ${user.proStatus === "trial" ? `<div><span>Hết dùng thử</span><b>${date(user.trialEndsAt)}</b></div>` : ""}
          <div><span>Lần tặng ${fmt(P.monthlyBonus)} credit tiếp theo</span><b>${date(user.nextBonusAt)}</b></div>
          ${c ? `<div><span>Thẻ thanh toán</span><b>${c.brandName} •••• ${c.last4} · ${String(c.expMonth).padStart(2, "0")}/${String(c.expYear).slice(-2)}</b></div>` : ""}
          <div><span>Giá</span><b>${vnd(P.priceVnd)}/tháng${VICO_PLANS.billingReady ? "" : " · chưa trừ tiền"}</b></div>
        </div>
        <button class="btn-ghost sm danger-text" data-cancel-pro>Huỷ gói Pro</button>
      </div>`;
  };
  window.bindPlanCard = (body) => {
    const o = body.querySelector("[data-open-pro]");
    if (o) o.onclick = () => { stModal.hidden = true; openPro(); };
    const c = body.querySelector("[data-cancel-pro]");
    if (c) c.onclick = async () => {
      if (!confirm("Huỷ gói Pro? Bạn quay về gói Free ngay (300 credit mỗi ngày), credit đã được tặng vẫn giữ nguyên.")) return;
      try { user = await VicoAuth.cancelPro(); renderAuth(); renderCredits(); showSettingsTab("credit"); showToast("Đã huỷ gói Pro."); }
      catch (err) { showToast(err.message, "warn"); }
    };
  };

  /* ---------- Huy hiệu PRO và nút nâng cấp trong ô credit ---------- */
  const proBtn = document.createElement("button");
  proBtn.type = "button";
  proBtn.className = "cp-pro";
  proBtn.id = "cpPro";
  $("#creditPop .cp-more").before(proBtn);
  proBtn.onclick = () => (user && user.plan === "pro" ? openSettings("credit") : openPro());
  const baseRenderCredits = renderCredits;
  renderCredits = (...args) => {
    baseRenderCredits(...args);
    const pro = !!(user && user.plan === "pro");
    $("#creditChip").classList.toggle("is-pro", pro);
    let badge = $("#creditChip .pro-badge");
    if (pro && !badge) { badge = document.createElement("span"); badge.className = "pro-badge"; badge.textContent = "PRO"; $("#creditChip").appendChild(badge); }
    if (!pro && badge) badge.remove();
    proBtn.innerHTML = pro
      ? `${SVG(CROWN, 15)}<span>Gói Pro${user.proStatus === "trial" ? ` · dùng thử còn ${daysLeft(user.trialEndsAt)} ngày` : ""}</span>`
      : `${SVG(CROWN, 15)}<span>Nâng cấp Pro · ${fmt(P.dailyCredits)} credit/ngày${user && !user.trialUsed ? ` · dùng thử ${P.trialDays} ngày` : ""}</span>`;
  };
  document.addEventListener("click", (e) => { if (e.target.closest("[data-open-pro]") && !e.target.closest("#stBody")) openPro(); });
  if (user) renderCredits();
})();
