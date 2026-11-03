/* =========================================================
   XÁC MINH CHỐNG BOT KHI ĐĂNG KÝ (proof-of-work)
   Máy chủ gửi thử thách; máy người dùng tìm nonce sao cho SHA-256("<challenge>:<nonce>") bắt đầu bằng đủ số 0 (hex).
   Khoảng 1 triệu lần băm, dưới 1 giây trên máy thường: người dùng không nhận ra, còn bot tạo hàng loạt tài khoản thì tốn CPU.
   SHA-256 viết tay cho chuỗi ASCII ngắn (WebCrypto chậm hơn nhiều lần khi gọi hàng triệu lần).
   ========================================================= */
const VicoPow = (() => {
  const K = new Uint32Array(64);
  // 32 bit đầu phần thập phân căn bậc ba của 64 số nguyên tố đầu tiên
  for (let n = 2, i = 0; i < 64; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
    if (prime) K[i++] = (Math.cbrt(n) % 1) * 4294967296;
  }
  const W = new Uint32Array(64);
  /** 32 bit đầu của SHA-256(str), str chỉ gồm ký tự ASCII. */
  function head(str) {
    const n = str.length, blocks = (n + 72) >> 6;
    const M = new Uint32Array(blocks * 16);
    for (let i = 0; i < n; i++) M[i >> 2] |= str.charCodeAt(i) << (24 - (i & 3) * 8);
    M[n >> 2] |= 0x80 << (24 - (n & 3) * 8);
    M[blocks * 16 - 1] = n * 8;
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    for (let b = 0; b < blocks; b++) {
      for (let t = 0; t < 16; t++) W[t] = M[b * 16 + t];
      for (let t = 16; t < 64; t++) {
        const x = W[t - 15], y = W[t - 2];
        const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        W[t] = W[t - 16] + s0 + W[t - 7] + s1;
      }
      let a = h0, b2 = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let t = 0; t < 64; t++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[t] + W[t]) | 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const t2 = (S0 + ((a & b2) ^ (a & c) ^ (b2 & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b2; b2 = a; a = (t1 + t2) | 0;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b2) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }
    return h0 >>> 0;
  }
  /** Tìm nonce (tối đa 8 số 0 hex). Nhường luồng giao diện mỗi 20.000 lần băm để trang không bị đơ. */
  async function solve({ challenge, zeros }) {
    const shift = 32 - Math.min(8, zeros) * 4;
    for (let n = 0; ; n++) {
      if (head(challenge + ":" + n) >>> shift === 0) return { challenge, nonce: String(n) };
      if (n % 20000 === 19999) await new Promise((r) => setTimeout(r, 0));
    }
  }
  return { solve, head };
})();
