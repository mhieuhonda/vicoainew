# Vico AI — Desktop (Windows)

Vico AI là ứng dụng chat AI chạy trên máy tính (Electron), gồm: hội thoại AI đa chủ đề, Group AI (nhiều AI làm việc như một team), quản lý dự án, truy cập thư mục & terminal thật, chạy AI cục bộ (node-llama-cpp) và kết nối tới các nhà cung cấp model OpenAI/Anthropic.

> ⚠️ **Tài liệu này đi kèm bản khôi phục mã nguồn** từ file cài đặt đã biên dịch. Xem `RECOVERY.md` để biết toàn bộ quá trình và phạm vi khôi phục.

## Cấu trúc dự án

```
vicoainew/
├── main.js            # Electron main process: cửa sổ, khay hệ thống, terminal,
│                      #   thư mục, mã hoá API key (safeStorage), cập nhật, agent tools
├── preload.js         # Cầu nối contextBridge an toàn giữa giao diện và máy
├── package.json       # Thông tin app + dependencies runtime
├── electron-builder.yml  # Cấu hình đóng gói NSIS (được tái dựng — xem RECOVERY.md)
├── app/               # Toàn bộ giao diện (HTML/CSS/JS thuần, không cần build)
│   ├── index.html     #   Entry point của giao diện
│   ├── app.js         #   Lõi ứng dụng (chat, phiên, chủ đề, suy luận)
│   ├── config.js      #   Cấu hình: API URL, model, bảng giá credit, gói Pro
│   ├── auth.js        #   Đăng nhập / đăng ký / credit
│   ├── desktop.js     #   Lớp riêng bản desktop (thư mục, terminal, Group AI)
│   ├── cloud.js       #   Fine-tune & GPU cloud
│   ├── features.js / pro.js / finetune.js / ...
│   ├── img/           #   Logo, icon
│   └── vendor/        #   KaTeX, highlight.js (bản đóng gói sẵn)
├── providers/         # Adapter nhà cung cấp model (openai.js, anthropic.js)
├── local-ai/          # AI cục bộ bằng node-llama-cpp (catalog, manager, worker)
└── build/             # Icon ứng dụng (icon.png, tray.png)
```

## Yêu cầu môi trường

- Node.js ≥ 20
- Electron 44 (bản khôi phục được đóng gói bằng Electron **44.7.0**)

## Chạy bản phát triển

```bash
npm install                 # cài dependencies (electron-updater, openai, @anthropic-ai/sdk, node-llama-cpp)
npm install -D electron@44.7.0   # electron là devDependency để chạy local
npm start                   # electron .
```

Lưu ý: `package.json` gốc trong asar không khai báo `electron` (vì khi đóng gói, electron được đưa vào qua electron-builder). Hai lệnh `npm install -D electron@...` và `npm start` do quá trình khôi phục bổ sung để chạy được ngay.

## Đóng gói lại file cài đặt Windows (NSIS)

```bash
npm install -D electron-builder
npx electron-builder --win nsis
```

Cấu hình `electron-builder.yml` được tái dựng ở mức tối thiểu (appId, tên, icon, target NSIS) — bạn có thể chỉnh sửa theo ý.

## Ghi chú kỹ thuật

- **Giao diện** được nạp qua giao thức `app://` (đăng ký trong `main.js`) — an toàn hơn `file://`, giữ hoạt động của localStorage & crypto.
- **API key** của người dùng (OpenAI/Anthropic) được mã hoá bằng `safeStorage` ngay trong main process, giao diện không đọc lại được.
- **Terminal & thư mục**: bản desktop cho phép AI gợi ý lệnh và người dùng bấm để chạy trong PowerShell thật.
- **Group AI**: nhiều vai AI trong cùng một group chat (chỉ trên desktop).
- **local-ai/**: chạy model GGUF cục bộ qua `node-llama-cpp` (binary nền tảng nằm trong `app.asar.unpacked`, tự cài lại bằng `npm install`).
