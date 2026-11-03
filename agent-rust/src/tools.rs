//! ============================================================================
//! src/tools.rs — Bộ tool của agent (KHUNG TÁI TẠO)
//! ----------------------------------------------------------------------------
//! Tên tool trích nguyên văn từ binary (serde field / enum variant):
//!   list_dir, search, read_file, write_file, edit_file, run_command,
//!   git_commit, propose_feature, finish_goal, navigate, evaluate, screenshot, fetch_url
//! Struct tham số: FsBody, ExecBody (binary: "struct FsBody", "struct ExecBody")
//! Git commit tool — nguyên văn mô tả trong binary:
//!   "git_commit: Stage all changes and create a commit (requires user approval). Never pushes."
//! propose_feature — nguyên văn:
//!   "Record an improvement idea outside the current scope into the backlog for the
//!    user to decide. Do not implement it."
//! ============================================================================

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Deserialize)]
pub struct FsBody {
    pub path: PathBuf,
    /// edit_file: chuỗi cũ → chuỗi mới (diff áp dụng qua crate `similar`)
    pub old_string: Option<String>,
    pub new_string: Option<String>,
    pub content: Option<String>,
}

#[derive(Deserialize)]
pub struct ExecBody {
    pub command: String,
    pub cwd: Option<PathBuf>,
    pub timeout: Option<u64>,
}

#[derive(Serialize)]
pub struct ToolResult {
    pub ok: bool,
    pub output: String,
    /// diff unified của thay đổi (hiển thị cho user, phục vụ undo)
    pub diff: Option<String>,
}

/// Mỗi lần ghi file tạo 1 checkpoint — nguyên văn system prompt:
///   "Every write is checkpointed and shown to the user as a diff."
#[derive(Serialize)]
pub struct FileChange {
    pub path: PathBuf,
    pub before: Option<String>, // None = file mới
    pub after: Option<String>,  // None = file bị xoá
    pub diff_unified: String,
}

pub mod descriptions {
    /// Nguyên văn binary:
    pub const GIT_COMMIT: &str =
        "Stage all changes and create a commit (requires user approval). Never pushes.";
    pub const PROPOSE_FEATURE: &str =
        "Record an improvement idea outside the current scope into the backlog for the user to decide. Do not implement it.";
    pub const FINISH_GOAL: &str =
        "Finish the autonomous run. status \"done\" is accepted only when every criterion is met with verified evidence; \"blocked\" when you cannot continue.";
}

/// Thực thi một tool-call. Thân hàm gốc không khôi phục được — viết lại theo đặc tả.
pub async fn execute(_call: &super::agent::ToolCall) -> anyhow::Result<ToolResult> {
    todo!("dispatch theo tên tool; mọi ghi file qua policy.rs checkpoint")
}
