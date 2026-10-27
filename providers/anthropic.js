// Gọi model Claude qua SDK chính thức của Anthropic (chạy trong tiến trình chính, API key không lộ ra giao diện)
const sdk = require("@anthropic-ai/sdk");
const Anthropic = sdk.Anthropic || sdk.default || sdk;

// Các model có server-side fallback: nếu bị bộ lọc an toàn từ chối, Anthropic tự chạy lại
// trên model phù hợp. Claude Haiku 5.5 không có fallback nên gọi thường.
const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-sonnet-5-5"]);

function explain(err) {
  if (err instanceof Anthropic.AuthenticationError) return "API key Anthropic không hợp lệ.";
  if (err instanceof Anthropic.PermissionDeniedError) return "API key Anthropic không có quyền dùng model này.";
  if (err instanceof Anthropic.NotFoundError) return "Không tìm thấy model này trên Anthropic.";
  if (err instanceof Anthropic.RateLimitError) return "Anthropic đang giới hạn tốc độ, thử lại sau ít phút.";
  if (err instanceof Anthropic.BadRequestError) return "Anthropic báo yêu cầu không hợp lệ: " + err.message;
  if (err instanceof Anthropic.APIConnectionError) return "Không kết nối được tới Anthropic, hãy kiểm tra mạng.";
  if (err instanceof Anthropic.APIError) return `Anthropic lỗi ${err.status}: ${err.message}`;
  return err.message;
}

/** Gửi một lượt chat. effort: low | medium | high | xhigh | max (bỏ trống = mặc định của model). */
async function chat({ apiKey, model, system, prompt, effort, signal }) {
  const client = new Anthropic({ apiKey });
  const params = {
    model,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: prompt }],
  };
  if (effort) params.output_config = { effort };
  let res;
  try {
    res = FALLBACK_MODELS.has(model)
      ? await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }, { signal })
      : await client.messages.create(params, { signal });
  } catch (err) {
    throw new Error(signal && signal.aborted ? "Đã dừng" : explain(err));
  }
  if (res.stop_reason === "refusal") {
    const cat = res.stop_details && res.stop_details.category;
    return `*(Model từ chối yêu cầu này vì lý do an toàn${cat ? ` - nhóm: ${cat}` : ""}.)*`;
  }
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  return res.stop_reason === "max_tokens" ? text + "\n\n*(Câu trả lời bị cắt vì quá dài.)*" : text;
}

/** Kiểm tra API key bằng một lệnh nhẹ (liệt kê model). */
async function testKey(apiKey) {
  try {
    await new Anthropic({ apiKey }).models.list({ limit: 1 });
  } catch (err) {
    throw new Error(explain(err));
  }
}

module.exports = { chat, testKey };
