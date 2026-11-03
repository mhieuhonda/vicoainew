//! ============================================================================
//! vico-agent — src/main.rs  (KHUNG TÁI TẠO / reconstruction skeleton)
//! ----------------------------------------------------------------------------
//! KHÔNG phải mã nguồn gốc. Binary gốc đã strip symbol table nên thân hàm
//! không thể dịch ngược trung thực. File này là khung chạy được (hoàn thiện
//! phần thân theo đặc tả trong docs/AGENT-FORENSICS.md) — mọi hằng số,
//! route, struct, system prompt bên dưới đều trích CHÍNH XÁC từ binary.
//!
//! Bằng chứng binary: "VicoAgent/0.1 (+https://vico.kiyo.vn)", bind ws://127.0.0.1:7878,
//! 12 file nguồn gốc: src\{main,rt,api,agent,autonomous,ide,mcp,policy,store,team,tools,web}.rs
//! ============================================================================

mod agent;
mod api;
mod autonomous;
mod ide;
mod mcp;
mod policy;
mod rt;
mod store;
mod team;
mod tools;
mod web;

use std::net::SocketAddr;

/// Cổng mặc định của agent (bằng chứng: JS client `app/coding.js` dòng 4 và
/// chú thích `main.js` dòng 452 của Vico AI Desktop: "lắng nghe 127.0.0.1:7878").
pub const DEFAULT_PORT: u16 = 7878;

/// User-Agent trích nguyên văn từ binary:
///   Mozilla/5.0 (Windows NT 10.0; Win64; x64) VicoAgent/0.1 (+https://vico.kiyo.vn)
pub const USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VicoAgent/0.1 (+https://vico.kiyo.vn)";

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    rt::acquire_single_instance()?; // 1 agent/1 máy, tái sử dụng port 7878

    let addr = SocketAddr::from(([127, 0, 0, 1], DEFAULT_PORT));
    tracing::info!(target: "VicoAgent", "listening on ws://{addr}");

    let app = api::build_router(); // toàn bộ route nằm ở api.rs

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
