# binaries/vico-agent.exe — binary tham chiếu

> **Cập nhật 2026-11-03:** binary đã được khai thác tĩnh triệt để — xem
> [`agent-rust/docs/AGENT-FORENSICS.md`](../agent-rust/docs/AGENT-FORENSICS.md)
> và khung dự án tái tạo tại [`agent-rust/`](../agent-rust/) (Cargo.toml với 75 crate
> đúng phiên bản + 12 module khớp tên gốc + system prompt + 22 route API).

- Loại: `PE32+ executable for MS Windows 6.00 (console), x86-64, 6 sections`
- Kích thước: 8.516.608 bytes
- Nguồn: `resources/vico-agent.exe` bên trong `app-64.7z` của `VicoAI-Setup-1.0.0.exe`
- Ngôn ngữ: **Rust** (fingerprint chuỗi cho thấy build bằng cargo trên máy Windows
  `C:\Users\VPPN\.cargo\registry`, crate `aho-corasick-1.1.5`…)
- Vai trò trong app (theo chú thích source): agent coding chạy local, lắng nghe
  `127.0.0.1:7878`; đọc/sửa/tạo file, chạy lệnh, thao tác git trong thư mục người dùng
  cấp quyền; mỗi thay đổi trả về diff để hoàn tác. Desktop app tự khởi động agent kèm theo.

⚠️ **Không thể dịch ngược trung thực về mã Rust** từ binary. File này chỉ để:
1. chạy thử/tham chiếu hành vi (chỉ trên Windows, trong môi trường cách ly),
2. đối chiếu khi viết lại source Rust.

Cần viết lại agent bằng Rust theo đặc tả giao tiếp trong `app/coding.js` và
`main.js` (khoảng dòng 452). Trên Linux/macOS, binary tương ứng tên `vico-agent`
(không có đuôi .exe) nhưng không nằm trong bộ cài Windows này.
