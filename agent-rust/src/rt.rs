//! ============================================================================
//! src/rt.rs — Runtime dùng chung: single-instance, port registry, tiện ích
//! (KHUNG TÁI TẠO)
//! ----------------------------------------------------------------------------
//! Bằng chứng binary: panic path nhúng "src\rt.rs" (xác nhận file tồn tại),
//! cùng chuỗi "127.0.0.1:0" (xin port tạm — phục vụ kiểm thử CDP/SSR cục bộ)
//! và "ws://127.0.0.1:" (kênh WS). Đồng thời binary chứa
//! "VICO_AGENT_TEST_ALLOW_LOCAL" — biến env cho phép tự kiểm thử nội bộ.
//! ============================================================================

use std::sync::atomic::{AtomicU16, Ordering};

/// Port agent (mặc định 7878 — khớp JS client trong Vico AI Desktop).
static CURRENT_PORT: AtomicU16 = AtomicU16::new(super::DEFAULT_PORT);

pub fn current_port() -> u16 {
    CURRENT_PORT.load(Ordering::Relaxed)
}

/// Đảm bảo chỉ một instance agent chạy trên máy; instance sau kết nối lại instance trước.
pub fn acquire_single_instance() -> anyhow::Result<()> {
    todo!("lock file + health-check http://127.0.0.1:7878/health; nếu đã có agent → thoát 0")
}

/// Xin một port trạm (127.0.0.1:0) cho mục đích nội bộ (test CDP v.v.).
pub fn ephemeral_bind() -> anyhow::Result<u16> {
    todo!("TcpListener::bind(\"127.0.0.1:0\") → local_addr().port()")
}

/// Gate kiểm thử nội bộ — chỉ bật khi env VICO_AGENT_TEST_ALLOW_LOCAL=1
/// (chuỗi nguyên văn trong binary: "VICO_AGENT_TEST_ALLOW_LOCAL" + "query").
pub fn test_allow_local() -> bool {
    std::env::var("VICO_AGENT_TEST_ALLOW_LOCAL").as_deref() == Ok("1")
}
