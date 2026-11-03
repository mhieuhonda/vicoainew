//! ============================================================================
//! src/ide.rs — Tích hợp với IDE / Vico AI Desktop (KHUNG TÁI TẠO)
//! ----------------------------------------------------------------------------
//! Bằng chứng gián tiếp (client side, từ source JS đã khôi phục trong repo này):
//!  - app/coding.js: agent phục vụ tab "Coding IDE" (Monaco) của desktop app;
//!    desktop mở ws://127.0.0.1:7878 và hiển thị diff từng thay đổi.
//!  - main.js (desktop) tự spawn `vico-agent.exe` kèm app.
//!  - Chuỗi binary liên quan: ".vico/visual/" (screenshot cho UI),
//!    "vico-agent-demo.md" (tên file demo QA bên desktop).
//! Nhiệm vụ module: kênh WS/SSE bơm EventKind::* cho UI + endpoint cây file/diff
//! cho Monaco. Thân hàm gốc không khôi phục được.
//! ============================================================================

/// Gói event đẩy về UI (định dạng khớp EventKind trích từ binary).
pub enum UiEvent {
    Message { role: String, content: String },
    FileChange { path: String, diff_unified: String },
    ApprovalRequired { call_id: String, tool: String, args: serde_json::Value },
    AgentSpawned { name: String },
    AgentStatus { name: String, status: String },
    AgentMessage { name: String, content: String },
    AgentFinished { name: String },
    AgentMerged { name: String },
    AgentDiscarded { name: String },
    IterationStarted { iteration: u32 },
    IterationReport { iteration: u32, note: String },
    Proposal { idea: String },
    RunPaused,
    AutonomousStarted { goals: Vec<String> },
    AutonomousFinished { status: String },
}

/// Serialize event → SSE data frame cho route /sessions/{id}/events.
pub fn to_sse(e: &UiEvent) -> String {
    let kind = match e {
        UiEvent::Message { .. } => "Message",
        UiEvent::FileChange { .. } => "FileChange",
        UiEvent::ApprovalRequired { .. } => "ApprovalRequired",
        UiEvent::AgentSpawned { .. } => "AgentSpawned",
        UiEvent::AgentStatus { .. } => "AgentStatus",
        UiEvent::AgentMessage { .. } => "AgentMessage",
        UiEvent::AgentFinished { .. } => "AgentFinished",
        UiEvent::AgentMerged { .. } => "AgentMerged",
        UiEvent::AgentDiscarded { .. } => "AgentDiscarded",
        UiEvent::IterationStarted { .. } => "IterationStarted",
        UiEvent::IterationReport { .. } => "IterationReport",
        UiEvent::Proposal { .. } => "Proposal",
        UiEvent::RunPaused => "RunPaused",
        UiEvent::AutonomousStarted { .. } => "AutonomousStarted",
        UiEvent::AutonomousFinished { .. } => "AutonomousFinished",
    };
    let data = serde_json::to_string(e).unwrap_or_default();
    format!("event: {kind}\ndata: {data}\n\n")
}
