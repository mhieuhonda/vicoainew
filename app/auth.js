/* =========================================================
   TÀI KHOẢN & CREDIT - Vico AI
   Bản thử nghiệm: tài khoản lưu trong trình duyệt (localStorage),
   mật khẩu được băm bằng PBKDF2 + salt, không lưu dạng chữ thường.
   Khi có backend, thay phần thân các hàm trong VicoAuth bằng gọi API
   (giữ nguyên tên hàm và dữ liệu trả về) là app.js chạy tiếp được.
   ========================================================= */

class AuthError extends Error {
  /** @param {string|null} field  tên ô bị lỗi (username, email, password, login, credits) */
  constructor(field, message) { super(message); this.field = field; }
}

/* =========================================================
   KIỂM TRA THẺ TÍN DỤNG (lọc thẻ rác, thẻ test, thẻ giả)
   Chỉ kiểm tra phía máy: số hợp lệ (Luhn), đúng hãng và độ dài, không phải số thẻ test công khai,
   không phải dãy số rác, còn hạn, CVV và tên hợp lệ. Cổng thanh toán thật sẽ kiểm tra thêm với ngân hàng.
   ========================================================= */
const VicoCard = (() => {
  const BRANDS = [
    { id: "amex", name: "American Express", re: /^3[47]/, len: [15], cvc: 4 },
    { id: "visa", name: "Visa", re: /^4/, len: [13, 16, 19], cvc: 3 },
    { id: "mastercard", name: "Mastercard", re: /^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)/, len: [16], cvc: 3 },
    { id: "jcb", name: "JCB", re: /^35(2[89]|[3-8]\d)/, len: [16, 17, 18, 19], cvc: 3 },
    { id: "discover", name: "Discover", re: /^(6011|65|64[4-9])/, len: [16, 17, 18, 19], cvc: 3 },
    { id: "unionpay", name: "UnionPay", re: /^62/, len: [16, 17, 18, 19], cvc: 3 },
    { id: "diners", name: "Diners Club", re: /^(36|38|30[0-5])/, len: [14, 15, 16, 17, 18, 19], cvc: 3 },
  ];
  // Số thẻ test được công bố công khai (Stripe, PayPal/Braintree, Adyen…)
  const TEST_CARDS = new Set([
    "4242424242424242", "4000056655665556", "5555555555554444", "2223003122003222", "5200828282828210", "5105105105105100",
    "378282246310005", "371449635398431", "378734493671000", "370000000000002", "6011111111111117", "6011000990139424",
    "3056930009020004", "30569309025904", "38520000023237", "36227206271667", "3566002020360505", "3530111333300000",
    "6200000000000005", "4111111111111111", "4012888888881881", "4222222222222", "4009348888881881", "4111111145551142",
    "5555444433331111", "2223000048400011", "4000002500003155", "4000000000003220", "4000000000009995", "4000000000000002",
    "4000000000000069", "4000000000000127", "4000000000000119", "4100000000000019", "4000000000000341", "4000000000000077",
  ]);
  const TEST_PREFIX = /^(4000000000|400000\d{2}0000|4242424242|40000566|40000025|4111111111|5555555555|5105105105)/;
  const JUNK_NAME = /\b(test|testing|fake|demo|sample|dummy|asdf|qwer|qwerty|abc|xxx|card ?holder|john doe|jane doe|nguyen van a|no name|null|undefined|admin)\b/i;
  const digitsOf = (v) => String(v || "").replace(/\D/g, "");
  const brandOf = (num) => BRANDS.find((b) => b.re.test(num)) || null;
  function luhn(num) {
    let sum = 0, alt = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let d = +num[i];
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      alt = !alt;
    }
    return sum % 10 === 0;
  }
  function junkNumber(num) {
    if (/^(\d)\1+$/.test(num)) return true;                        // 4444 4444 4444 4444
    if (new Set(num).size < 4) return true;                          // quá ít chữ số khác nhau
    if (/^(\d{1,4})\1{3,}/.test(num)) return true;                   // lặp một khối: 1212…, 4123 4123…
    const groups = num.match(/.{4}/g) || [];                         // 3 nhóm 4 số giống nhau: 4539 1234 1234 1234
    if (groups.some((g) => groups.filter((x) => x === g).length >= 3)) return true;
    if (/0{8,}|9{8,}/.test(num)) return true;                         // dãy dài toàn 0 hoặc 9
    let up = 0, down = 0;                                            // dãy tăng / giảm liên tiếp: 1234567890…
    for (let i = 1; i < num.length; i++) {
      if ((+num[i] - +num[i - 1] + 10) % 10 === 1) up++;
      if ((+num[i - 1] - +num[i] + 10) % 10 === 1) down++;
    }
    return up >= num.length - 3 || down >= num.length - 3;
  }
  /** Kiểm tra thẻ. Trả về { ok, field, message } hoặc { ok: true, brand, brandName, number, last4, expMonth, expYear, holder } */
  function check({ number, name, exp, cvc }) {
    const num = digitsOf(number), fail = (field, message) => ({ ok: false, field, message });
    if (num.length < 12) return fail("cardNumber", "Nhập đủ số thẻ");
    if (/^9704/.test(num)) return fail("cardNumber", "Đây là thẻ ATM nội địa (Napas), cần thẻ tín dụng quốc tế");
    const brand = brandOf(num);
    if (!brand) return fail("cardNumber", "Không nhận ra hãng thẻ. Vico nhận Visa, Mastercard, JCB, American Express, Discover, UnionPay, Diners");
    if (!brand.len.includes(num.length)) return fail("cardNumber", "Thẻ " + brand.name + " phải có " + brand.len.join(" hoặc ") + " chữ số");
    if (TEST_CARDS.has(num) || TEST_PREFIX.test(num)) return fail("cardNumber", "Đây là số thẻ thử nghiệm (test), không dùng được");
    if (junkNumber(num)) return fail("cardNumber", "Số thẻ không hợp lệ");
    if (!luhn(num)) return fail("cardNumber", "Số thẻ không đúng, kiểm tra lại từng chữ số");
    const m = /^\s*(\d{1,2})\s*\/\s*(\d{2}|\d{4})\s*$/.exec(String(exp || ""));
    if (!m) return fail("cardExp", "Ngày hết hạn dạng MM/YY");
    const month = +m[1], year = m[2].length === 2 ? 2000 + +m[2] : +m[2];
    if (month < 1 || month > 12) return fail("cardExp", "Tháng hết hạn không hợp lệ");
    const now = new Date();
    if (new Date(year, month, 1) <= now) return fail("cardExp", "Thẻ đã hết hạn");
    if (year > now.getFullYear() + 15) return fail("cardExp", "Ngày hết hạn không hợp lệ");
    const c = digitsOf(cvc);
    if (c.length !== brand.cvc) return fail("cardCvc", "Mã CVV gồm " + brand.cvc + " chữ số");
    if (/^0+$/.test(c)) return fail("cardCvc", "Mã CVV không hợp lệ");
    const holder = String(name || "").trim().replace(/\s+/g, " ");
    if (holder.length < 3 || !/^[\p{L} .'-]+$/u.test(holder)) return fail("cardName", "Nhập tên chủ thẻ như in trên thẻ (chỉ chữ cái)");
    if (JUNK_NAME.test(holder) || /(.)\1{3,}/i.test(holder.replace(/ /g, ""))) return fail("cardName", "Tên chủ thẻ không hợp lệ");
    return { ok: true, brand: brand.id, brandName: brand.name, number: num, last4: num.slice(-4), expMonth: month, expYear: year, holder: holder.toUpperCase() };
  }
  return { check, brandOf: (v) => brandOf(digitsOf(v)), digitsOf, luhn };
})();

/* =========================================================
   TÀI KHOẢN QUA MÁY CHỦ (khi VICO_CONFIG.apiUrl có giá trị)
   Máy chủ giữ số dư thật. App giữ bản sao (cache) để các hàm current/spend/refund vẫn chạy đồng bộ như bản cũ:
   spend trừ trên cache rồi gửi lệnh trừ lên máy chủ kèm mã giao dịch; askVico nhận luôn lệnh trừ đó vào /api/chat.
   ========================================================= */
function VicoAuthRemote() {
  const API = String(VICO_CONFIG.apiUrl).replace(/\/+$/, "");
  const SES_KEY = "vico_srv_session", CACHE_KEY = "vico_srv_cache";
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  let token = read(SES_KEY, null);
  let cache = token ? read(CACHE_KEY, { user: null, history: [] }) : { user: null, history: [] };
  let lastSync = 0, syncing = null;
  const pending = new Map(); // lệnh trừ chưa gửi: id -> used

  const notify = () => { try { window.dispatchEvent(new CustomEvent("vico-user", { detail: cache.user })); } catch {} };
  function apply(data) {
    if (data && data.user) cache.user = data.user;
    if (data && Array.isArray(data.history)) cache.history = data.history;
    write(CACHE_KEY, cache);
    notify();
    return cache.user;
  }
  async function call(path, { method = "GET", body, auth = true, signal } = {}) {
    let res;
    try {
      res = await fetch(API + path, {
        method, signal,
        headers: { "content-type": "application/json", ...(auth && token ? { authorization: "Bearer " + token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      if (err && err.name === "AbortError") throw err;
      throw new AuthError(null, "Không kết nối được máy chủ Vico. Kiểm tra mạng rồi thử lại.");
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && auth && token) { clearSession(); }
    if (!res.ok) throw Object.assign(new AuthError(data.field || null, data.error || "Máy chủ báo lỗi " + res.status), { status: res.status, data });
    return data;
  }
  function clearSession() {
    token = null; cache = { user: null, history: [] };
    try { localStorage.removeItem(SES_KEY); localStorage.removeItem(CACHE_KEY); } catch {}
    notify();
  }
  function setSession(data) { token = data.token; write(SES_KEY, token); lastSync = Date.now(); return apply(data); }

  /** Lấy số dư thật từ máy chủ (tối đa 1 lần / 20 giây trừ khi force). */
  function sync(force) {
    if (!token) return Promise.resolve(null);
    if (syncing) return syncing;
    if (!force && Date.now() - lastSync < 20000) return Promise.resolve(cache.user);
    lastSync = Date.now();
    syncing = call("/api/me").then(apply).catch(() => cache.user).finally(() => { syncing = null; });
    return syncing;
  }
  if (token) setTimeout(() => sync(true), 0);

  const localLog = (kind, amount, note) => { cache.history.unshift({ t: Date.now(), kind, amount, note }); };
  const newId = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function current() {
    if (!token) return null;
    sync(false);
    return cache.user;
  }
  const consentNow = () => ({ terms: VICO_LEGAL.terms, privacy: VICO_LEGAL.privacy, age: true, aiProcessing: true });
  async function signUp({ username, email, password, refCode, consent }) {
    if (!consent) throw new AuthError("consent", "Bạn cần đọc và đồng ý Điều khoản sử dụng, Chính sách quyền riêng tư");
    for (const [field, value] of Object.entries({ username: username.trim(), email: email.trim(), password })) {
      const err = validate(field, value);
      if (err) throw new AuthError(field, err);
    }
    // xác minh chống bot: máy chủ gửi thử thách, máy này giải trong khoảng 1 giây
    const pow = await VicoPow.solve(await call("/api/pow", { auth: false }));
    return setSession(await call("/api/auth/signup", { method: "POST", auth: false, body: { username, email, password, refCode, consent: consentNow(), pow } }));
  }
  async function logIn({ login, password }) {
    if (!login.trim()) throw new AuthError("login", "Nhập email hoặc tên đăng nhập");
    if (!password) throw new AuthError("password", "Nhập mật khẩu");
    return setSession(await call("/api/auth/login", { method: "POST", auth: false, body: { login, password } }));
  }
  function logOut() {
    if (token) fetch(API + "/api/auth/logout", { method: "POST", headers: { authorization: "Bearer " + token } }).catch(() => {});
    clearSession();
  }

  /** Trừ credit: trừ ngay trên cache rồi gửi lên máy chủ (askVico có thể nhận lệnh này thay vì gửi riêng). */
  function spend(cost, note = "Sử dụng") {
    const u = cache.user;
    if (!token || !u) throw new AuthError(null, "Bạn chưa đăng nhập");
    if (u.daily + u.bonus < cost) throw new AuthError("credits", "Không đủ credit");
    const fromDaily = Math.min(u.daily, cost);
    u.daily -= fromDaily; u.bonus -= cost - fromDaily; u.total = u.daily + u.bonus;
    localLog("spend", -cost, note);
    write(CACHE_KEY, cache);
    const used = { id: newId(), cost, note, fromDaily, fromBonus: cost - fromDaily, remote: true };
    pending.set(used.id, used);
    setTimeout(() => flush(used), 0);
    return { user: u, used };
  }
  function flush(used) {
    if (!pending.has(used.id)) return; // đã được askVico nhận hoặc đã huỷ
    pending.delete(used.id);
    used.sent = true;
    call("/api/credits/spend", { method: "POST", body: { id: used.id, cost: used.cost, note: used.note } })
      .then(apply).catch(() => sync(true));
  }
  /** askVico gọi để gửi lệnh trừ vừa tạo cùng tin nhắn (máy chủ trừ và hoàn nếu AI lỗi). */
  function claimCharge() {
    const last = [...pending.values()].pop();
    if (!last) return null;
    pending.delete(last.id);
    last.sent = true;
    return last;
  }
  function refund(used, note = "Hoàn lại") {
    if (!used || !cache.user) return cache.user;
    if (used.settled) return cache.user; // máy chủ đã hoàn và gửi số dư mới
    used.settled = true;
    const u = cache.user;
    u.daily += used.fromDaily; u.bonus += used.fromBonus; u.total = u.daily + u.bonus;
    localLog("refund", used.cost, note);
    write(CACHE_KEY, cache);
    if (pending.delete(used.id) && !used.sent) return u; // chưa gửi thì chỉ cần bỏ
    call("/api/credits/refund", { method: "POST", body: { id: used.id, note } }).then(apply).catch(() => sync(true));
    return u;
  }
  async function redeemReferral(code) { return apply(await call("/api/referral", { method: "POST", body: { code } })); }
  async function startPro(card) {
    const r = VicoCard.check(card); // kiểm tra trước trên máy cho nhanh, máy chủ kiểm tra lại
    if (!r.ok) throw new AuthError(r.field, r.message);
    // CVV chỉ kiểm tra trên máy này, không gửi đi (chuẩn PCI DSS)
    return apply(await call("/api/pro/start", { method: "POST", body: { number: card.number, name: card.name, exp: card.exp, agree: !!card.agree } }));
  }
  async function cancelPro() { return apply(await call("/api/pro/cancel", { method: "POST" })); }
  async function acceptConsent() { return apply(await call("/api/consent", { method: "POST", body: { consent: consentNow() } })); }
  const exportData = () => call("/api/account/export");
  async function deleteAccount(password) { await call("/api/account/delete", { method: "POST", body: { password } }); clearSession(); }
  function history() { return cache.history.slice(); }
  function msUntilReset() {
    const at = cache.user && cache.user.resetAt;
    if (at && at > Date.now()) return at - Date.now();
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n;
  }

  const RULES = {
    username: (v) => /^[a-zA-Z0-9_.]{3,20}$/.test(v) ? "" : "Tên đăng nhập 3–20 ký tự: chữ không dấu, số, dấu _ hoặc dấu chấm",
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Email không hợp lệ",
    password: (v) => v.length >= 8 ? "" : "Mật khẩu cần ít nhất 8 ký tự",
  };
  function validate(field, value) { return RULES[field] ? RULES[field](value) : ""; }
  function passwordStrength(p) {
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return Math.min(4, s);
  }

  return {
    remote: true, current, signUp, logIn, logOut, spend, refund, history, redeemReferral, msUntilReset, validate, passwordStrength, startPro, cancelPro,
    claimCharge, apply, sync, call, acceptConsent, exportData, deleteAccount, token: () => token, SES_KEY, ACC_KEY: "vico_accounts",
  };
}

const VicoAuth = VICO_CONFIG.apiUrl ? VicoAuthRemote() : (() => {
  const ACC_KEY = "vico_accounts", SES_KEY = "vico_session";
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const accounts = () => read(ACC_KEY, []);
  const saveAccounts = (list) => write(ACC_KEY, list);

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function hashPassword(password, saltB64) {
    if (!crypto.subtle) throw new AuthError(null, "Trình duyệt không hỗ trợ mã hoá. Hãy mở web qua http://localhost hoặc https.");
    const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
    return { salt: toB64(salt), hash: toB64(bits) };
  }

  // Credit ngày làm mới khi sang ngày mới (theo giờ máy), phần chưa dùng không cộng dồn
  function refreshDaily(acc) {
    const t = today();
    if (!acc.daily || acc.daily.date !== t) {
      const had = !!acc.daily;
      acc.daily = { date: t, left: dailyMaxOf(acc) };
      if (had) addLog(acc, "daily", dailyMaxOf(acc), "Làm mới credit ngày");
      return true;
    }
    return false;
  }
  /* ---- Gói Pro ---- */
  const DAY = 86400000;
  const isPro = (a) => !!(a.pro && a.pro.status !== "canceled");
  const dailyMaxOf = (a) => (isPro(a) ? VICO_PLANS.pro.dailyCredits : VICO_PLANS.free.dailyCredits);
  /** Chỗ nối cổng thanh toán sau này: trừ tiền kỳ Pro. Hiện chưa nối nên không trừ. */
  function chargeHook() { return false; }
  // Hết dùng thử -> giữ Pro (chưa trừ tiền); đến kỳ mới -> tặng credit hằng tháng
  function refreshPro(acc) {
    if (!isPro(acc)) return false;
    const P = VICO_PLANS.pro, now = Date.now();
    let changed = false;
    if (acc.pro.status === "trial" && now >= acc.pro.trialEndsAt) {
      acc.pro.status = "active";
      acc.pro.paid = VICO_PLANS.billingReady ? chargeHook(acc) : false;
      addLog(acc, "plan", 0, "Hết 7 ngày dùng thử: tiếp tục gói Pro (chưa trừ tiền)");
      changed = true;
    }
    while (now >= acc.pro.nextBonusAt) {
      acc.credits += P.monthlyBonus;
      addLog(acc, "bonus", P.monthlyBonus, "Tặng hằng tháng của gói Pro");
      acc.pro.nextBonusAt += P.cycleDays * DAY;
      changed = true;
    }
    return changed;
  }
  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Lịch sử credit: mỗi lần trừ / hoàn / tặng / làm mới (giữ 500 mục gần nhất)
  function addLog(acc, kind, amount, note) {
    (acc.log = acc.log || []).push({ t: Date.now(), kind, amount, note });
    if (acc.log.length > 500) acc.log.splice(0, acc.log.length - 500);
  }
  const newRefCode = (list) => {
    let c;
    do c = Math.random().toString(36).slice(2, 8).toUpperCase(); while (list.some((a) => a.refCode === c));
    return c;
  };
  const view = (a) => ({
    id: a.id, username: a.username, email: a.email, createdAt: a.createdAt,
    bonus: a.credits, daily: a.daily.left, dailyMax: dailyMaxOf(a),
    plan: isPro(a) ? "pro" : "free", proStatus: isPro(a) ? a.pro.status : null,
    trialEndsAt: isPro(a) ? a.pro.trialEndsAt : null, nextBonusAt: isPro(a) ? a.pro.nextBonusAt : null, trialUsed: !!a.trialUsed,
    card: a.card ? { brand: a.card.brand, brandName: a.card.brandName, last4: a.card.last4, expMonth: a.card.expMonth, expYear: a.card.expYear, holder: a.card.holder } : null,
    total: a.credits + a.daily.left,
    refCode: a.refCode, referredBy: a.referredBy || null, referrals: a.referrals || 0,
  });
  function sessionAccount() {
    const id = read(SES_KEY, null);
    const list = accounts();
    return { list, acc: id ? list.find((a) => a.id === id) : null };
  }

  /* ---- Kiểm tra dữ liệu nhập ---- */
  const RULES = {
    username: (v) => /^[a-zA-Z0-9_.]{3,20}$/.test(v) ? "" : "Tên đăng nhập 3–20 ký tự: chữ không dấu, số, dấu _ hoặc dấu chấm",
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Email không hợp lệ",
    password: (v) => v.length >= 8 ? "" : "Mật khẩu cần ít nhất 8 ký tự",
  };
  function validate(field, value) { return RULES[field] ? RULES[field](value) : ""; }

  /** Điểm mạnh mật khẩu 0–4 */
  function passwordStrength(p) {
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return Math.min(4, s);
  }

  /* ---- API ---- */
  function current() {
    const { list, acc } = sessionAccount();
    if (!acc) return null;
    let changed = refreshPro(acc);
    changed = refreshDaily(acc) || changed;
    if (!acc.refCode) { acc.refCode = newRefCode(list); changed = true; } // tài khoản cũ chưa có mã
    if (changed) saveAccounts(list);
    return view(acc);
  }

  // Áp mã giới thiệu: cả người mời và người được mời đều được tặng credit
  function applyReferral(list, acc, code) {
    code = String(code || "").trim().toUpperCase();
    if (!code) return;
    const owner = list.find((a) => a.refCode === code);
    if (!owner) throw new AuthError("refCode", "Mã giới thiệu không tồn tại");
    if (owner.id === acc.id) throw new AuthError("refCode", "Không dùng được mã của chính mình");
    if (acc.referredBy) throw new AuthError("refCode", "Tài khoản đã dùng mã giới thiệu rồi");
    const bonus = VICO_CREDITS.referralBonus;
    acc.referredBy = owner.refCode;
    acc.credits += bonus;
    addLog(acc, "referral", bonus, `Dùng mã giới thiệu ${owner.refCode}`);
    owner.credits += bonus;
    owner.referrals = (owner.referrals || 0) + 1;
    addLog(owner, "referral", bonus, `${acc.username} dùng mã của bạn`);
  }

  async function signUp({ username, email, password, refCode }) {
    username = username.trim();
    email = email.trim().toLowerCase();
    for (const [field, value] of Object.entries({ username, email, password })) {
      const err = validate(field, value);
      if (err) throw new AuthError(field, err);
    }
    const list = accounts();
    if (list.some((a) => a.username.toLowerCase() === username.toLowerCase())) throw new AuthError("username", "Tên đăng nhập này đã có người dùng");
    if (list.some((a) => a.email === email)) throw new AuthError("email", "Email này đã được đăng ký");
    if (refCode && !list.some((a) => a.refCode === String(refCode).trim().toUpperCase())) throw new AuthError("refCode", "Mã giới thiệu không tồn tại");
    const { salt, hash } = await hashPassword(password);
    const acc = {
      id: "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      username, email, salt, hash, createdAt: Date.now(),
      credits: VICO_CREDITS.signupBonus,
      daily: { date: today(), left: VICO_CREDITS.dailyFree },
      refCode: newRefCode(list),
    };
    addLog(acc, "bonus", VICO_CREDITS.signupBonus, "Tặng khi tạo tài khoản");
    list.push(acc);
    if (refCode) applyReferral(list, acc, refCode);
    saveAccounts(list);
    write(SES_KEY, acc.id);
    return view(acc);
  }

  /** Nhập mã giới thiệu sau khi đã có tài khoản (mỗi tài khoản 1 lần). */
  function redeemReferral(code) {
    const { list, acc } = sessionAccount();
    if (!acc) throw new AuthError(null, "Bạn chưa đăng nhập");
    applyReferral(list, acc, code);
    saveAccounts(list);
    return view(acc);
  }

  async function logIn({ login, password }) {
    const id = login.trim().toLowerCase();
    if (!id) throw new AuthError("login", "Nhập email hoặc tên đăng nhập");
    if (!password) throw new AuthError("password", "Nhập mật khẩu");
    const acc = accounts().find((a) => a.email === id || a.username.toLowerCase() === id);
    if (!acc) throw new AuthError("login", "Không tìm thấy tài khoản này");
    const { hash } = await hashPassword(password, acc.salt);
    if (hash !== acc.hash) throw new AuthError("password", "Mật khẩu không đúng");
    write(SES_KEY, acc.id);
    return current();
  }

  function logOut() { try { localStorage.removeItem(SES_KEY); } catch {} }

  /** Trừ credit: credit ngày trước, credit tặng sau. Trả về { user, used } (used dùng để hoàn lại khi lỗi). */
  function spend(cost, note = "Sử dụng") {
    const { list, acc } = sessionAccount();
    if (!acc) throw new AuthError(null, "Bạn chưa đăng nhập");
    refreshDaily(acc);
    if (acc.daily.left + acc.credits < cost) throw new AuthError("credits", "Không đủ credit");
    const fromDaily = Math.min(acc.daily.left, cost);
    acc.daily.left -= fromDaily;
    acc.credits -= cost - fromDaily;
    addLog(acc, "spend", -cost, note);
    saveAccounts(list);
    return { user: view(acc), used: { date: acc.daily.date, fromDaily, fromBonus: cost - fromDaily } };
  }

  /** Hoàn lại credit đã trừ (khi AI lỗi hoặc bạn bấm Dừng trước khi có chữ). Credit ngày chỉ hoàn nếu vẫn còn trong cùng ngày. */
  function refund(used, note = "Hoàn lại") {
    const { list, acc } = sessionAccount();
    if (!acc || !used) return current();
    refreshDaily(acc);
    const back = (acc.daily.date === used.date ? used.fromDaily : 0) + used.fromBonus;
    if (acc.daily.date === used.date) acc.daily.left = Math.min(dailyMaxOf(acc), acc.daily.left + used.fromDaily);
    acc.credits += used.fromBonus;
    if (back) addLog(acc, "refund", back, note);
    saveAccounts(list);
    return view(acc);
  }

  /** Đăng ký Pro bằng thẻ tín dụng. Lần đầu: dùng thử 7 ngày. Chỉ lưu hãng thẻ, 4 số cuối, hạn, tên và mã băm
      (KHÔNG lưu số thẻ đầy đủ và CVV). Mã băm dùng để chặn một thẻ lấy dùng thử ở nhiều tài khoản. */
  async function startPro(card) {
    const { list, acc } = sessionAccount();
    if (!acc) throw new AuthError(null, "Bạn chưa đăng nhập");
    if (isPro(acc)) throw new AuthError(null, "Bạn đang dùng gói Pro rồi");
    const r = VicoCard.check(card);
    if (!r.ok) throw new AuthError(r.field, r.message);
    const fp = await sha256("vico-card:" + r.number);
    if (list.some((a) => a.id !== acc.id && (a.cardFps || []).includes(fp))) throw new AuthError("cardNumber", "Thẻ này đã được dùng để đăng ký Pro ở tài khoản khác");
    const P = VICO_PLANS.pro, now = Date.now(), trial = !acc.trialUsed;
    refreshDaily(acc);
    acc.card = { brand: r.brand, brandName: r.brandName, last4: r.last4, expMonth: r.expMonth, expYear: r.expYear, holder: r.holder, fp, addedAt: now };
    acc.cardFps = [...new Set([...(acc.cardFps || []), fp])];
    acc.pro = { status: trial ? "trial" : "active", startedAt: now, trialEndsAt: trial ? now + P.trialDays * DAY : now, nextBonusAt: now, paid: false };
    acc.trialUsed = true;
    acc.daily.left = Math.min(P.dailyCredits, acc.daily.left + (P.dailyCredits - VICO_PLANS.free.dailyCredits));
    addLog(acc, "plan", 0, `${trial ? `Bắt đầu dùng thử Pro ${P.trialDays} ngày` : "Đăng ký lại gói Pro"} · ${r.brandName} •••• ${r.last4}`);
    refreshPro(acc);
    saveAccounts(list);
    return view(acc);
  }
  /** Huỷ Pro: về gói Free ngay, xoá thông tin thẻ (giữ mã băm để không lấy dùng thử lần nữa). */
  function cancelPro() {
    const { list, acc } = sessionAccount();
    if (!acc || !isPro(acc)) throw new AuthError(null, "Bạn đang không dùng gói Pro");
    acc.pro.status = "canceled";
    acc.pro.canceledAt = Date.now();
    delete acc.card;
    refreshDaily(acc);
    acc.daily.left = Math.min(acc.daily.left, VICO_PLANS.free.dailyCredits);
    addLog(acc, "plan", 0, "Huỷ gói Pro, quay về gói Free");
    saveAccounts(list);
    return view(acc);
  }

  /** Lịch sử credit của tài khoản đang đăng nhập (mới nhất trước). */
  function history() {
    const { acc } = sessionAccount();
    return acc ? (acc.log || []).slice().reverse() : [];
  }

  /** Số mili giây tới lúc credit ngày được làm mới (0 giờ hôm sau). */
  function msUntilReset() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n;
  }

  return { current, signUp, logIn, logOut, spend, refund, history, redeemReferral, msUntilReset, validate, passwordStrength, startPro, cancelPro, SES_KEY, ACC_KEY };
})();
