# Vico AI — Desktop 1.0.0 (bản khôi phục source)

> Chat AI cho máy tính: chat AI, Group AI, truy cập terminal và thư mục, IDE coding agent.
> **Repo này được tái cấu trúc từ file cài đặt đã biên dịch** sau khi máy chủ chứa mã nguồn
> bị mã độc tống tiền mã hóa. Xem chi tiết quy trình trong [`docs/RECOVERY-REPORT.md`](docs/RECOVERY-REPORT.md).

## Thông tin khôi phục

| Hạng mục | Giá trị |
| --- | --- |
| Nguồn khôi phục | `VicoAI-Setup-1.0.0.exe` (NSIS, 142.868.959 bytes) |
| SHA-256 | `8b97e884606200d15aca3edb18facce2c08fc1aee9f1769770e763d82ba4b35b` |
| Kiểu đóng gói | electron-builder → NSIS-3 Unicode → `app-64.7z` → `resources/app.asar` |
| Runtime | Electron 44.7.0 |
| Mức khôi phục | Gần như 100% mã JavaScript/HTML/CSS gốc (không minify, còn comment) |
| Không khôi phục được | Source Rust của `vico-agent` (chỉ còn binary), `package-lock.json` |

## Cấu trúc dự án

```
├── main.js              # Tiến trình chính Electron: cửa sổ, terminal, thư mục, tray, IPC
├── preload.js           # Bridge an toàn giữa renderer và main
├── app/                 # Giao diện renderer (HTML/CSS/JS thuần + vendor: Monaco, KaTeX, highlight.js)
│   ├── index.html
│   ├── app.js / desktop.js / cloud.js / coding.js / coding-ide.js / config.js ...
│   ├── auth.js          # Đăng nhập/đăng ký (+ proof-of-work chống bot: pow.js)
│   ├── db.js            # Lưu trữ dữ liệu cục bộ
│   └── vendor/          # Monaco editor, KaTeX, highlight.js (bản vendored)
├── providers/           # Tích hợp LLM: anthropic.js, openai.js
├── local-ai/            # AI cục bộ qua node-llama-cpp: catalog.js, manager.js, worker.mjs
├── build/               # Icon ứng dụng (icon.png, tray.png)
├── binaries/
│   └── vico-agent.exe   # Agent coding (Rust) — binary tham chiếu, xem docs/
├── agent-rust/          # KHUNG TÁI TẠO agent Rust từ forensic binary
│   ├── Cargo.toml       # 75 crate + phiên bản CHÍNH XÁC trích từ binary
│   ├── src/             # 12 module khớp tên gốc: main, api, agent, tools, policy,
│   │                    # store, team, autonomous, mcp, web, rt, ide
│   └── docs/AGENT-FORENSICS.md  # Bằng chứng: 22 route, struct, system prompt, CDP
└── docs/
    ├── RECOVERY-REPORT.md          # Báo cáo khôi phục đầy đủ
    └── original-package.asar.json  # package.json nguyên bản từ asar (chưa chỉnh sửa)
```

## Chạy môi trường phát triển

Yêu cầu Node.js ≥ 20 (khuyến nghị LTS mới nhất).

```bash
npm install          # cài dependencies (đã pin đúng phiên bản trong package.json)
npm start            # chạy app (electron .)
```

Lần chạy đầu nếu muốn dùng **AI cục bộ** (node-llama-cpp), tải model:

```bash
npx node-llama-cpp download
```

## Đóng gói lại bản cài đặt

```bash
npm i -D electron@44.7.0 electron-builder
npx electron-builder --win nsis
```

Cấu hình builder gốc không nằm trong asar (electron-builder đọc config lúc build),
cần dựng lại `electron-builder.yml` theo docs/RECOVERY-REPORT.md.

## Ghi chú bảo mật

- Toàn bộ mã nguồn đã được quét tĩnh: **không có** secret/API key hardcode, không có
  `eval`/`new Function` trong mã gốc, không có mẫu hình mã độc.
- File `binaries/vico-agent.exe` là **binary Rust đã biên dịch** — chỉ dùng làm tham chiếu
  chạy thử; cần build lại từ source Rust (xem docs/RECOVERY-REPORT.md).
- Đây là bản khôi phục khẩn cấp: nên rà soát code review toàn diện trước khi release.
