//! ============================================================================
//! src/api.rs — Bề mặt HTTP API (KHUNG TÁI TẠO)
//! ----------------------------------------------------------------------------
//! Toàn bộ route bên dưới trích CHÍNH XÁC từ chuỗi route nhúng trong binary
//! (axum 0.8 dùng cú pháp `{param}` — khớp 100% với chuỗi thấy được).
//! Thân handler: todo!() — hoàn thiện theo docs/AGENT-FORENSICS.md.
//! ============================================================================

use axum::{
    extract::{Path, State},
    response::{IntoResponse, Sse},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::store::{self, AppState};

/// ---- Struct body trích từ binary (tên struct nguyên văn, "with N elements") ----
#[derive(Deserialize)]
pub struct NewProject {
    /// đường dẫn thư mục dự án người dùng cấp quyền
    pub path: String,
    pub name: Option<String>,
}

#[derive(Deserialize)]
pub struct NewSession {
    pub project_id: String,
    pub model: Option<String>,
    pub base_url: Option<String>, // LLM OpenAI-compatible
    pub api_key: Option<String>,
}

#[derive(Deserialize)]
pub struct MessageBody {
    pub content: String,
    /// tham số OpenAI thấy trong binary: `reasoning_effort`
    pub reasoning_effort: Option<String>,
}

#[derive(Deserialize)]
pub struct AgentBody {
    pub task: String,
    /// tên sub-agent do lead đặt
    pub name: Option<String>,
}

#[derive(Deserialize)]
pub struct ApprovalBody {
    pub approved: bool,
    pub remember: Option<bool>,
}

#[derive(Deserialize)]
pub struct AutonomousBody {
    /// 8 trường — binary: "struct AutonomousBody with 8 elements"
    pub goals: Vec<String>,      // tiêu chí chấp nhận
    pub scope: Option<Vec<String>>, // giới hạn phạm vi file
    pub limits: Option<LimitSet>,   // max iterations / tokens / seconds / cost
    pub model: Option<String>,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub resume: Option<bool>,
    pub extra: Option<Value>,
}

#[derive(Deserialize, Serialize)]
pub struct LimitSet {
    pub max_iterations: Option<u32>,
    pub max_tokens: Option<u64>,
    pub max_seconds: Option<u64>,
    pub max_cost_usd: Option<f64>,
}

#[derive(Deserialize)]
pub struct McpBody {
    pub command: String,
    pub args: Vec<String>,
    pub env: Option<std::collections::BTreeMap<String, String>>,
}

/// ---- Router gốc của agent ----
pub fn build_router() -> Router {
    let state = store::init_state();

    Router::new()
        // --- tiện ích & không gian làm việc ---
        .route("/health", get(health))
        .route("/tree", get(tree))          // cây thư mục dự án (tôn trọng .gitignore)
        .route("/files", get(files))        // liệt kê file (query: prefix/glob)
        .route("/file", get(read_file))     // ?path=...
        .route("/git", get(git_status))
        .route("/git/original", get(git_original)) // nội dung gốc để đối chiếu diff
        .route("/undo", post(undo))         // hoàn tác checkpoint
        // --- vòng đời session & hội thoại ---
        .route("/sessions", post(new_session))
        .route("/sessions/{id}", get(get_session)) // + DELETE qua method router tuỳ triển khai
        .route("/sessions/{id}/messages", post(send_message))
        .route("/sessions/{id}/events", get(events)) // SSE: EventKind::*
        .route("/sessions/{id}/approvals/{call}", post(approve_call))
        .route("/sessions/{id}/cancel", post(cancel))
        .route("/sessions/{id}/retry", post(retry))
        // --- Multi-Agent (team.rs, dùng git worktree) ---
        .route("/sessions/{id}/agents", get(list_agents))
        .route("/sessions/{id}/agents/{agent}/{action}", post(agent_action))
        // --- Autonomous mode (autonomous.rs) ---
        .route("/sessions/{id}/autonomous", post(start_autonomous))
        .route("/sessions/{id}/pause", post(pause))
        .route("/sessions/{id}/resume", post(resume))
        // --- MCP client (mcp.rs) ---
        .route("/mcp/{id}", post(add_mcp_server))
        .route("/mcp/{id}/test", post(test_mcp_server))
        .with_state(state)
}

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "ok": true, "agent": "VicoAgent", "version": "0.1" }))
}

async fn tree(State(st): State<AppState>) -> impl IntoResponse { todo!("trả cây thư mục dự án hiện hành") }
async fn files(State(st): State<AppState>) -> impl IntoResponse { todo!("liệt kê file theo query") }
async fn read_file(State(st): State<AppState>, Path(p): Path<String>) -> impl IntoResponse { todo!("đọc file + checkpoint") }
async fn git_status(State(st): State<AppState>) -> impl IntoResponse { todo!("git status của dự án") }
async fn git_original(State(st): State<AppState>) -> impl IntoResponse { todo!("blob gốc từ HEAD để diff") }
async fn undo(State(st): State<AppState>) -> impl IntoResponse { todo!("áp ngược FileChange của checkpoint") }

async fn new_session(State(st): State<AppState>, Json(b): Json<NewProject>) -> impl IntoResponse { todo!("tạo project+session") }
async fn get_session(State(st): State<AppState>, Path(id): Path<String>) -> impl IntoResponse { todo!("trạng thái session") }
async fn send_message(State(st): State<AppState>, Path(id): Path<String>, Json(b): Json<MessageBody>) -> impl IntoResponse { todo!("chạy vòng agent.rs") }
async fn events(State(st): State<AppState>, Path(id): Path<String>) -> Sse<impl tokio_stream::Stream<Item = Result<axum::response::sse::Event, std::convert::Infallible>>> {
    todo!("stream EventKind::* ra SSE")
}
async fn approve_call(State(st): State<AppState>, Path((id, call)): Path<(String, String)>, Json(b): Json<ApprovalBody>) -> impl IntoResponse { todo!("chốt phê duyệt policy.rs") }
async fn cancel(State(st): State<AppState>, Path(id): Path<String>) -> impl IntoResponse { todo!("hủy run") }
async fn retry(State(st): State<AppState>, Path(id): Path<String>) -> impl IntoResponse { todo!("chạy lại lượt thất bại") }
async fn pause(State(st): State<AppState>, Path(id): Path<String>) -> impl IntoResponse { todo!("tạm dừng autonomous") }
async fn resume(State(st): State<AppState>, Path(id): Path<String>) -> impl IntoResponse { todo!("tiếp tục autonomous") }

async fn list_agents(State(st): State<AppState>, Path(id): Path<String>) -> impl IntoResponse { todo!("danh sách sub-agent") }
async fn agent_action(State(st): State<AppState>, Path((id, agent, action)): Path<(String, String, String)>, Json(b): Json<AgentBody>) -> impl IntoResponse {
    // action ∈ {spawn, message, merge, discard} — bề mặt team.rs
    todo!("dispatch sang team.rs")
}
async fn start_autonomous(State(st): State<AppState>, Path(id): Path<String>, Json(b): Json<AutonomousBody>) -> impl IntoResponse { todo!("chạy autonomous.rs") }
async fn add_mcp_server(State(st): State<AppState>, Path(id): Path<String>, Json(b): Json<McpBody>) -> impl IntoResponse { todo!("đăng ký MCP server") }
async fn test_mcp_server(State(st): State<AppState>, Path(id): Path<String>) -> impl IntoResponse { todo!("initialize + tools/list thử") }
