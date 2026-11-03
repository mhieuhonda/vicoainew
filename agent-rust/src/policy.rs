//! ============================================================================
//! src/policy.rs — Cổng phê duyệt & an toàn (KHUNG TÁI TẠO)
//! ----------------------------------------------------------------------------
//! Bằng chứng binary:
//!  - struct Permissions, struct ApprovalBody (trích nguyên văn)
//!  - route /sessions/{id}/approvals/{call}
//!  - Nguyên văn system prompt: "Risky actions (deleting data, pushing, deploying,
//!    changing permissions) still need the user's approval."
//!  - Nguyên văn: "If the user denies an action, do not retry it; adapt or ask."
//!  - Mô tả git_commit: "requires user approval. Never pushes."
//!  - Panic path nhúng: src\policy.rs (xác nhận file tồn tại trong dự án gốc)
//! ============================================================================

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Permissions {
    /// đọc file trong phạm vi dự án luôn được phép
    pub read_fs: bool,
    /// ghi file: checkpoint + diff, thuộc diện cần duyệt tùy mức
    pub write_fs: bool,
    /// chạy lệnh: cần duyệt theo whitelist
    pub exec: bool,
    /// git commit: luôn cần duyệt; git push: BỊ CẤM (tool gốc "Never pushes")
    pub git_commit: bool,
    /// truy cập mạng (fetch_url, LLM API, MCP, CDP)
    pub network: bool,
}

/// Phân loại rủi ro một tool-call trước khi thực thi.
pub enum Decision {
    Allowed,
    NeedsApproval { reason: String },
    Denied { reason: String },
}

pub fn evaluate(_call: &super::agent::ToolCall, _perm: &Permissions) -> Decision {
    todo!("map tool -> Decision; hành vi xóa dữ liệu/push/deploy/đổi quyền = NeedsApproval")
}

/// Chốt phê duyệt từ người dùng (route /approvals/{call}).
/// Nguyên văn ràng buộc: user từ chối thì agent KHÔNG được thử lại.
pub fn resolve_approval(approved: bool) -> bool {
    approved
}
