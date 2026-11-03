# Báo cáo khôi phục mã nguồn — Vico AI Desktop 1.0.0

Ngày thực hiện: 2026-11-03
Phạm vi: tái cấu trúc mã nguồn từ bản cài đặt biên dịch duy nhất còn sót lại sau sự cố ransomware.

## 1. Tóm tắt kết quả

| Hạng mục | Kết quả |
| --- | --- |
| Mã nguồn JS/HTML/CSS của app | ✅ Khôi phục gần như 100% — là **bản gốc chưa minify, còn đầy đủ comment tiếng Việt** |
| Tiến trình chính (`main.js`, `preload.js`) | ✅ Khôi phục nguyên bản |
| Tích hợp LLM (`providers/`, `local-ai/`) | ✅ Khôi phục nguyên bản |
| Thư viện vendored (Monaco, KaTeX, highlight.js) | ✅ Nguyên bản kèm license |
| Tài nguyên (icon, ảnh, fonts) | ✅ Nguyên bản |
| Source Rust của `vico-agent` | ❌ Không thể khôi phục từ artifact này (chỉ có binary — thực thi máy học không đảo ngược được về Rust trung thực) |
| `package-lock.json` | ❌ Không có trong asar (electron-builder không đóng gói). Phiên bản deps đã được pin tuyệt đối trong `package.json` nên `npm install` tái tạo được môi trường tương đương |
| Cấu hình electron-builder | ❌ Không nằm trong asar (chỉ tồn tại lúc build) — cần dựng lại theo mục 6 |

## 2. Chuyển dây chuyền khôi phục (chain of custody)

1. **Nguồn tải**: Mediafire — `https://www.mediafire.com/file/j6wtqc1hjiphtuz/VicoAI-Setup-1.0.0.exe/file`
   (bản sao dự phòng: `https://vico.kiyo.vn/download#VicoAI-Setup-1.0.0.exe`, không dùng đến).
2. **File nhận được**: `VicoAI-Setup-1.0.0.exe`
   - Kích thước: **142.868.959 bytes** (136 MB)
   - SHA-256: `8b97e884606200d15aca3edb18facce2c08fc1aee9f1769770e763d82ba4b35b`
   - Nhận diện: `PE32 executable for MS Windows 4.00 (GUI), Intel i386, Nullsoft Installer self-extracting archive, 5 sections`
   - Người lưu ý: mốc thời gian bên trong NSIS cho thấy build lúc **2026-10-30 13:28 UTC**.
3. **Phân tích tĩnh thuần túy** — file exe **không hề được thực thi** trong toàn bộ quy trình.
4. Trích lớp 1: `7zz x VicoAI-Setup-1.0.0.exe` → `$PLUGINSDIR/app-64.7z` (142.280.139 bytes) + `Uninstall Vico AI.exe` + plugin NSIS (nsis7z, StdUtils…). SubType: **NSIS-3 Unicode**, phương thức nén Deflate.
5. Trích lớp 2: `7zz x app-64.7z` → bộ app Electron hoàn chỉnh (876 file, 565.690.471 bytes): `Vico AI.exe`, `resources/app.asar`, `resources/app.asar.unpacked/`, `resources/vico-agent.exe`, `version` = **44.7.0**.
6. Trích lớp 3: `npx @electron/asar extract app.asar` → **toàn bộ mã nguồn ứng dụng** (204 file không kể node_modules, ~21 MB).

## 3. Nhận diện kỹ thuật

- **Loại ứng dụng**: Electron desktop app, tên `vico-ai` / productName `Vico AI`, version `1.0.0`.
- **Mô tả gốc** (từ package.json): "Vico AI cho máy tính: chat AI, Group AI, truy cập terminal và thư mục".
- **Runtime**: Electron 44.7.0 (file `version` trong bộ giải nén).
- **Dependencies đã pin**:
  - `@anthropic-ai/sdk` 0.133.0
  - `electron-updater` 6.8.10
  - `node-llama-cpp` 3.22.1
  - `openai` 7.33.0
- **Kiến trúc renderer**: HTML/CSS/JS thuần (không qua bundler), nạp qua giao thức `app://` tự đăng ký; giao diện gồm app chat, desktop (quản lý terminal/thư mục), coding IDE (Monaco), auth + proof-of-work, cloud, finetune, group AI.
- **Sidecar**: `vico-agent.exe` — binary **Rust** (fingerprint chuỗi `.cargo/registry`), 8.516.608 bytes, PE32+ x64 console, là agent coding chạy local, lắng nghe `127.0.0.1:7878` (theo chú thích trong `main.js` dòng 452 và `app/coding.js` dòng 4).

## 4. Rà soát an toàn (do hệ thống vừa dính ransomware)

Thực hiện trên bản trích xuất, **không thực thi bất kỳ artifact nào**:

- Quét mẫu hình mã độc (mã hóa file tống tiền, miner, keylogger, persistence registry/scheduled task, downloader): **không phát hiện**.
- Quét secret hardcode (API key, token, mật khẩu, `.env`, `*.pem`, `*.key`): **không phát hiện**. Hit duy nhất là fixture smoke-test với tài khoản giả `smoketag@smoke.test` trong `main.js` (dòng 517) — không phải secret thật.
- Quét `eval(` / `new Function(` trong mã gốc (ngoài vendor): **không phát hiện**.
- `app/pow.js` là thuật toán proof-of-work chống bot viết tay (SHA-256 tự cài đặt) — hợp lệ, không phải mã độc.
- Kết luận: nội dung khôi phục an toàn để lưu trữ và phát triển tiếp; vẫn khuyến nghị review + chạy trong máy ảo lần đầu.

## 5. Những gì đẩy lên repo này

- Toàn bộ mã nguồn trích từ `app.asar` (loại trừ `node_modules` — khôi phục bằng `npm install`).
- `binaries/vico-agent.exe` — binary tham chiếu duy nhất của agent Rust còn lại.
- `docs/original-package.asar.json` — bản sao `package.json` **nguyên bản** từ asar để đối chiếu.
- `package.json` tại gốc repo đã được bổ sung **một cách có chủ đích** hai mục để chạy dev được ngay:
  - `"scripts": { "start": "electron ." }`
  - `"devDependencies": { "electron": "44.7.0" }`
  Phần còn lại giữ nguyên 100%.

## 6. Việc còn thiếu cần làm để phát triển tiếp

1. **Source Rust `vico-agent`**: binary này không thể dịch ngược trung thực về Rust. Nếu còn máy từng build agent (dấu vết trong binary: máy `C:\Users\VPPN\.cargo`), hãy tìm lại thư mục dự án Rust; nếu không, phải viết lại từ đặc tả: HTTP server `127.0.0.1:7878`, API đọc/sửa/tạo file, chạy lệnh, git, trả diff để hoàn tác (xem cách gọi trong `app/coding.js`).
2. **Dựng lại cấu hình electron-builder** (không có trong asar): `appId`, `productName: "Vico AI"`, target NSIS, icon từ `build/icon.png`, và bundle `vico-agent.exe` vào `resources/` + `asarUnpack` cho `node-llama-cpp`.
3. **Sinh lại `package-lock.json`**: chạy `npm install` rồi commit lockfile để khóa cây phụ thuộc.
4. **Xoay vòng mọi secret hạ tầng** (đã lộ rủi ro khi bị chiếm máy chủ): khóa API nhà cung cấp LLM, mật khẩu CSDL, secret JWT nếu backend cloud còn dùng secret sinh ra trước sự cố.
5. Thiết lập backup tự động (Git remote riêng + mirror) để không lặp lại rủi ro "bản sao duy nhất".
