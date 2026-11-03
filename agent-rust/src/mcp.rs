//! ============================================================================
//! src/mcp.rs — MCP (Model Context Protocol) client (KHUNG TÁI TẠO)
//! ----------------------------------------------------------------------------
//! Bằng chứng binary (nguyên văn chuỗi giao thức tìm thấy):
//!  - "initialize" (×10), "tools/list", "tools/call", "notifications", "inputSchema"
//!  - Route: /mcp/{id} (đăng ký), /mcp/{id}/test (kiểm tra server)
//!  - System prompt: "functions named mcp__<server>__<tool>" — tên tool MCP được
//!    bản địa thành mcp__<server>__<tool> trong không gian tool của LLM.
//!  - struct McpBody { command, args, env } — MCP server chạy dạng subprocess stdio.
//! ============================================================================

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Clone)]
pub struct McpServer {
    pub id: String,
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: Option<std::collections::BTreeMap<String, String>>,
    pub tools: Vec<McpTool>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct McpTool {
    pub name: String, // tên gốc trên server
    pub description: Option<String>,
    pub input_schema: Value, // "inputSchema" JSON-Schema
}

/// Tên tool trong không gian LLM — quy ước nguyên văn binary:
pub fn exposed_tool_name(server: &str, tool: &str) -> String {
    format!("mcp__{server}__{tool}")
}

/// Bước 1 MCP handshake: gửi request "initialize" qua stdio subprocess.
pub async fn initialize(_srv: &McpServer) -> anyhow::Result<Value> {
    todo!("spawn process, JSON-RPC initialize, nhận capabilities")
}

/// Bước 2: "tools/list" để đăng ký tool vào system prompt.
pub async fn list_tools(_srv: &McpServer) -> anyhow::Result<Vec<McpTool>> {
    todo!("tools/list")
}

/// Bước 3: "tools/call" khi LLM chọn tool mcp__<server>__<tool>
/// (đi qua policy.rs: "Each call may need the user's approval").
pub async fn call_tool(_srv: &McpServer, _tool: &str, _args: Value) -> anyhow::Result<Value> {
    todo!("tools/call + timeout + giới hạn kích thước output")
}
