//! ============================================================================
//! src/team.rs — Multi-Agent (lead + sub-agent trên git worktree) (KHUNG TÁI TẠO)
//! ----------------------------------------------------------------------------
//! Bằng chứng binary:
//!  - crate `git` KHÔNG có → thao tác git bằng lệnh `git` ngoài (run_command nội bộ)
//!  - chuỗi "worktree" xuất hiện 6 lần → sub-agent làm việc trên git worktree riêng
//!    (bản sao project), lead merge sau khi xong — khớp nguyên văn prompt:
//!    "Multi-Agent mode is ENABLED for this project by the user. You are the lead agent
//!     and may delegate to up to … agents; it is a copy of the project, your changes are
//!     merged into the project by the lead after you finish. Do not commit, it is done automatically."
//!  - Route: /sessions/{id}/agents, /sessions/{id}/agents/{agent}/{action}
//!  - EventKind: AgentSpawned, AgentStatus, AgentMessage, AgentFinished, AgentMerged, AgentDiscarded
//! ============================================================================

use serde::{Deserialize, Serialize};

pub const MAX_SUBAGENTS: u32 = 8; // giới hạn delegating — hiệu chỉnh theo binary nếu trích được giá trị gốc

#[derive(Serialize, Deserialize, Clone)]
pub struct SubAgent {
    pub name: String,
    pub task: String,
    pub status: String, // running | finished | merged | discarded
    pub worktree_path: Option<std::path::PathBuf>,
    pub branch: Option<String>,
}

/// Prompt giao việc cho sub-agent — TÁI GHÉP NGUYÊN VĂN từ các mảnh trong binary:
///   "You are \"<tên agent>\"" + hướng dẫn cách làm việc + yêu cầu tổng kết tiếng Việt.
pub fn subagent_prompt(agent_name: &str, task: &str) -> String {
    format!(
        "You are \"{agent_name}\"\n{task}\n\
         How to work: explore before editing, make focused changes only for your task, \
         never touch unrelated files, run the relevant build / test command when one exists. \
         If something blocks you, explain what you need in your final answer. \
         Finish with a concise summary in Vietnamese: changed files, how you verified, open issues. \
         Reply in Vietnamese."
    )
}

/// Tạo worktree cho sub-agent: `git worktree add <path> -b <branch>`.
pub async fn spawn_worktree(_root: &std::path::Path, _name: &str) -> anyhow::Result<std::path::PathBuf> {
    todo!("git worktree add; trả đường dẫn worktree")
}

/// Merge thay đổi của sub-agent về dự án chính (lead thực hiện, tự động commit).
pub async fn merge(_agent: &SubAgent) -> anyhow::Result<()> {
    todo!("merge worktree branch; phát EventKind::AgentMerged")
}

pub async fn discard(_agent: &SubAgent) -> anyhow::Result<()> {
    todo!("xoá worktree + branch; phát EventKind::AgentDiscarded")
}
