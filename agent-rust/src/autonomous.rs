//! ============================================================================
//! src/autonomous.rs — Chế độ phát triển tự chủ (KHUNG TÁI TẠO)
//! ----------------------------------------------------------------------------
//! Bằng chứng binary (nguyên văn):
//!  - "AUTONOMOUS DEVELOPMENT mode is ENABLED for this project by the user. You iterate
//!    on your own until the user's acceptance criteria are met or a limit is reached (max …)"
//!  - "Never claim a criterion is met without evidence (command output, file content).
//!    If you cannot verify it, mark it not met."
//!  - "Risky actions (deleting data, pushing, deploying, changing permissions) still need
//!    the user's approval."
//!  - Tool finish_goal: 'status "done" is accepted only when every criterion is met with
//!    verified evidence; "blocked" when you cannot continue.'
//!  - struct Criterion, struct TestRun, struct AutonomousBody (8 elements)
//!  - EventKind: IterationStarted, IterationReport, Proposal, RunPaused, AutonomousFinished
//!  - EventKind::AutonomousFinished (11 elements) gồm: status, iterations, tokens,
//!    seconds, cost_usd, blockers, proposals, sources, …
//!  - Chuỗi UI liên quan: status, iterations, tokens, seconds, cost_usd, blockers,
//!    proposals, sources ; goals, scope, limits
//! ============================================================================

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Criterion {
    pub text: String,
    /// true chỉ khi CÓ bằng chứng kiểm chứng (output lệnh / nội dung file)
    pub met: bool,
    pub evidence: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TestRun {
    pub command: String,
    pub ok: bool,
    pub output: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LimitSet {
    pub max_iterations: u32,
    pub max_tokens: u64,
    pub max_seconds: u64,
    pub max_cost_usd: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AutonomousFinished {
    pub status: String, // "done" | "blocked"
    pub iterations: u32,
    pub tokens: u64,
    pub seconds: u64,
    pub cost_usd: f64,
    pub blockers: Vec<String>,
    pub proposals: Vec<String>,
    pub sources: Vec<String>,
}

/// Vòng lặp tự chủ: lặp { kế hoạch → tools → test → EventKind::IterationReport }
/// đến khi finish_goal(done) / finish_goal(blocked) / chạm limits / RunPaused.
/// Thân hàm gốc không khôi phục được — viết lại theo docs/AGENT-FORENSICS.md §7.
pub async fn run(
    _goals: Vec<Criterion>,
    _limits: Option<LimitSet>,
    _emit: impl Fn(&str, serde_json::Value),
) -> anyhow::Result<AutonomousFinished> {
    todo!("vòng lặp iteration + theo dõi token/cost + check-in limits")
}
