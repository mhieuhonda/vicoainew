//! ============================================================================
//! src/web.rs — Tự động hoá browser qua Chrome DevTools Protocol (KHUNG TÁI TẠO)
//! ----------------------------------------------------------------------------
//! Bằng chứng binary:
//!  - Chuỗi CDP: "DevToolsActivePort", "Target.createTarget", "Target.attachToTarget",
//!    "Page.navigate", "Runtime.evaluate", "Page.captureScreenshot"
//!  - Tìm browser: env VICO_BROWSER, mặc định quét
//!    %ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe và
//!    %ProgramFiles%\Google\Chrome\Application\chrome.exe (chuỗi thấy trong binary)
//!  - Screenshot lưu: ".vico/visual/" (chuỗi nhúng)
//!  - Tool LLM tương ứng: navigate, evaluate, screenshot (tên trích từ binary)
//!  - Transport: tokio-tungstenite (ws://127.0.0.1:<debug_port>)
//! ============================================================================

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone)]
pub struct BrowserConfig {
    /// đường dẫn exe của Edge/Chrome (tự dò hoặc theo env VICO_BROWSER)
    pub binary: PathBuf,
    /// profile user-data tạm, riêng cho agent
    pub user_data_dir: PathBuf,
    pub debug_port: u16,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PageResult {
    pub url: String,
    pub title: Option<String>,
    /// kết quả Runtime.evaluate (nếu có)
    pub eval_result: Option<serde_json::Value>,
    /// đường dẫn PNG screenshot trong .vico/visual/
    pub screenshot: Option<PathBuf>,
}

/// Dò browser: VICO_BROWSER → msedge.exe → chrome.exe (thứ tự theo binary).
pub fn locate_browser() -> anyhow::Result<BrowserConfig> {
    todo!("kiểm tra env VICO_BROWSER; quét ProgramFiles paths; khởi động --headless=new --remote-debugging-port=0; đọc file DevToolsActivePort")
}

/// Tool navigate: Target.createTarget + Page.navigate.
pub async fn navigate(_cfg: &BrowserConfig, _url: &str) -> anyhow::Result<PageResult> {
    todo!("CDP qua tokio-tungstenite")
}

/// Tool evaluate: Target.attachToTarget + Runtime.evaluate (JS trong trang).
pub async fn evaluate(_cfg: &BrowserConfig, _expression: &str) -> anyhow::Result<PageResult> {
    todo!("CDP")
}

/// Tool screenshot: Page.captureScreenshot → giải mã base64 → PNG → .vico/visual/.
pub async fn screenshot(_cfg: &BrowserConfig, _out_name: &str) -> anyhow::Result<PageResult> {
    todo!("lưu PNG bằng crate image/png vào .vico/visual/")
}
