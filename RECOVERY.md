# BÁO CÁO KHÔI PHỤC MÃ NGUỒN VICO AI

**Ngày khôi phục:** 27/10/2026
**Nguồn khôi phục:** `VicoAI-Setup-1.0.0.exe` (137.302.838 bytes — duy nhất còn sót lại sau sự cố mã hoá máy chủ)
**Kết quả:** Khôi phục thành công **toàn bộ mã nguồn ứng dụng** (giao diện, main process, providers, local-ai) ở trạng thái **không bị minify, giữ nguyên comment gốc tiếng Việt**.

---

## 1. Tóm tắt điều hành

Toàn bộ mã nguồn của Vico AI bản desktop được tái tạo từ file cài đặt đã biên dịch theo chuỗi: **NSIS payload → 7z → app.asar → cây thư mục source**. Ba lớp bọc này đều là chuẩn đóng gói của `electron-builder` và mỗi lớp đều **không mã hoá** (chỉ nén), nên dữ liệu bên trong được giải ra nguyên vẹn 100% về nội dung.

Phần mã nguồn thu được:

| Thành phần | Trạng thái |
|---|---|
| `main.js` (Electron main process, 60KB) | ✅ Nguyên vẹn |
| `preload.js` (context bridge) | ✅ Nguyên vẹn |
| `app/` (toàn bộ giao diện: 21 entries — JS/CSS/HTML/img/vendor) | ✅ Nguyên vẹn, **mới hơn cả bản web đang chạy** |
| `providers/` (OpenAI, Anthropic adapter) | ✅ Nguyên vẹn |
| `local-ai/` (AI cục bộ node-llama-cpp) | ✅ Nguyên vẹn |
| `package.json` | ✅ Nguyên vẹn |
| `build/icon.png`, `build/tray.png` | ✅ Nguyên vẹn |
| `node_modules/` (70MB) | ♻️ Không đưa vào repo — khôi phục bằng `npm install` |
| Binary runtime Electron (45 file .dll/.exe nén BCJ2) | ♻️ Không cần — là runtime chuẩn Electron 44.7.0 + native module của `node-llama-cpp`, tự có khi `npm install` / build lại |
| PE stub của installer (98KB đầu file) | ❌ Mất do sự cố server — **không ảnh hưởng mã nguồn** (chỉ là code cài đặt NSIS) |
| `package-lock.json`, cấu hình electron-builder gốc, CI/CD | ❌ Không nằm trong file cài đặt — đã tái dựng cấu hình tối thiểu (`electron-builder.yml`) |

## 2. Chuỗi kỹ thuật khôi phục (chain of custody)

```
VicoAI-Setup-1.0.0.exe (137.302.838 bytes, SHA256 6f1c868abeb1ef6e290768a6581328205d82c208a1c36c178baec628b2e38542)
│
├─ [1] Xác minh kích thước khớp manifest gốc của trang tải chính thức (137.302.838 bytes)
│
├─ [2] Phân tích tĩnh (KHÔNG thực thi file):
│      · File bị lỗi phần đầu: 6 trang HTML 404 (mỗi trang 932 bytes) do server cứu hộ
│        trả lỗi khi tải từng phần, bị ghép nhầm vào đầu file
│      · Quét signature tìm thấy: NSIS firstheader (magic 0xDEADBEEF + "NullsoftInst")
│        tại offset 0x18000 và start-header 7-Zip hợp lệ tại offset 187.086
│
├─ [3] Carve (cắt) archive 7z gốc từ offset 187.086, dài 136.714.019 bytes
│      → app64.7z: hợp lệ, 950 entries, LZMA2/LZMA/BCJ2, 538MB khi giải nén
│
├─ [4] Giải nén 7z → 830/875 file (45 file BCJ2 là binary runtime, không phải source)
│      → thu được thư mục app Electron: "Vico AI.exe", resources/app.asar (41MB)…
│
├─ [5] Giải nén resources/app.asar bằng parser asar tự viết (Python, format pickle + JSON)
│      → 8.553 file: main.js, preload.js, package.json, app/, build/, local-ai/, providers/
│
└─ [6] Tái cấu trúc repo: loại node_modules, kiểm tra chất lượng, quét secrets,
       bổ sung .gitignore / README.md / RECOVERY.md / electron-builder.yml
```

## 3. Kiểm định chất lượng & an toàn

- **Mã nguồn đọc trực tiếp được**: toàn bộ file JS giữ nguyên comment tiếng Việt gốc, không bị minify/bundle (giao diện là JS thuần, không qua webpack).
- **So sánh với bản web đang chạy tại vico.kiyo.vn**: bản khôi phục trong asar **mới hơn** (có thêm `desktop.js`, `finetune.js`, `group-intro.*` và các tính năng desktop) → đây chính là bản dev mới nhất tại thời điểm đóng gói.
- **Quét secrets** trên toàn bộ mã nguồn (pattern `sk-…`, `sk-ant-…`, `ghp_…`, `apiKey=`, `password=`, `secret=`): **không phát hiện khoá API thật nào được nhúng cứng**. Chỉ có 2 chuỗi mật khẩu của tài khoản smoke-test nội bộ (hữu hại = 0, dùng cho `--smoke` test).
- **Không thực thi** file cài đặt ở bất kỳ bước nào — toàn bộ phân tích là tĩnh.

## 4. Việc cần làm tiếp theo (khuyến nghị)

1. **Revoke ngay PAT** đã cấp cho quá trình push này (như đã định).
2. **Xoay (rotate) mọi khoá bí mật** khác của hệ thống: khoá API backend tại `api.kiyo.vn`, tài khoản Cloudflare, DB, email — giả định chúng đã bị lộ trong sự cố.
3. **Không dùng lại các mật khẩu smoke-test** xuất hiện trong `main.js` cho môi trường thật.
4. **Thiết lập lại CI/CD + backup**: đặt repo này làm chuẩn (single source of truth), bật branch protection, tự động build release bằng GitHub Actions, backup định kỳ ra nơi lưu trữ riêng.
5. **Chạy thử `npm install` + `npm start`** và đóng gói lại bằng `electron-builder` để xác nhận bản build mới khớp bản 1.0.0 cũ.
6. Bổ sung lại `package-lock.json` (chạy `npm install` một lần rồi commit) để khoá phiên bản dependencies.

## 5. Phạm vi & hạn chế

- Mã nguồn khôi phục phản ánh đúng trạng thái bên trong `app.asar` tại thời điểm đóng gói bản 1.0.0. Những gì **chưa từng được đóng vào file cài đặt** (script CI/CD, tài liệu nội bộ, khoá ký code signing, cấu hình server) không thể có trong bản khôi phục này và cần được dựng lại riêng.
- 45 file binary BCJ2 không giải được bằng công cụ thuần Python đã bị loại khỏi repo vì không phải mã nguồn; nếu cần bản binary chính xác, build lại từ mã nguồn là đủ.
