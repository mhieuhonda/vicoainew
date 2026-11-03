//! ============================================================================
//! src/store.rs — Lưu trữ project/session/checkpoint (KHUNG TÁI TẠO)
//! ----------------------------------------------------------------------------
//! Bằng chứng binary: struct Project, NewProject, ProjectPatch, NewSession,
//! Session(?), Checkpoint, FileChange, Event. Thư mục cấu hình riêng của app:
//! ".vico/visual/" (nơi lưu screenshot CDP). Không có crate sqlite → state
//! lưu dạng file JSON/JSONL trong thư mục .vico/ của dự án.
//! ============================================================================

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub root: PathBuf,
    /// thời điểm tạo (chrono)
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Session {
    pub id: String,
    pub project_id: String,
    pub model: Option<String>,
    pub base_url: Option<String>,
    /// KHÔNG LƯU api_key ra đĩa — giữ trong bộ nhớ của tiến trình
    #[serde(skip)]
    pub api_key: Option<String>,
    pub created_at: String,
}

/// Một checkpoint = một thay đổi file (undo áp ngược `before`).
#[derive(Serialize, Deserialize, Clone)]
pub struct Checkpoint {
    pub id: String,
    pub session_id: String,
    pub change: super::tools::FileChange,
    pub created_at: String,
}

/// State chia sẻ cho axum (State<AppState>).
#[derive(Clone)]
pub struct AppState(pub Arc<parking_lot::RwLock<Inner>>);

pub struct Inner {
    pub projects: Vec<Project>,
    pub sessions: Vec<Session>,
    pub checkpoints: Vec<Checkpoint>,
    /// dự án hiện hành cho /tree, /files, /file, /git
    pub active_root: Option<PathBuf>,
}

pub fn init_state() -> AppState {
    AppState(Arc::new(parking_lot::RwLock::new(Inner {
        projects: vec![],
        sessions: vec![],
        checkpoints: vec![],
        active_root: None,
    })))
}
