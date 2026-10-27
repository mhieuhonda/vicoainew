// Gọi model GPT qua SDK chính thức của OpenAI (chạy trong tiến trình chính, API key không lộ ra giao diện)
const sdk = require("openai");
const OpenAI = sdk.OpenAI || sdk.default || sdk;

function explain(err) {
  if (err instanceof OpenAI.AuthenticationError) return "API key OpenAI không hợp lệ.";
  if (err instanceof OpenAI.PermissionDeniedError) return "API key OpenAI không có quyền dùng model này.";
  if (err instanceof OpenAI.NotFoundError) return "Không tìm thấy model này trên OpenAI (tài khoản có thể chưa được mở quyền).";
  if (err instanceof OpenAI.RateLimitError) return "OpenAI đang giới hạn tốc độ hoặc hết hạn mức, thử lại sau.";
  if (err instanceof OpenAI.BadRequestError) return "OpenAI báo yêu cầu không hợp lệ: " + err.message;
  if (err instanceof OpenAI.APIConnectionError) return "Không kết nối được tới OpenAI, hãy kiểm tra mạng.";
  if (err instanceof OpenAI.APIError) return `OpenAI lỗi ${err.status}: ${err.message}`;
  return err.message;
}

/** Gửi một lượt chat qua Chat Completions. effort: low | medium | high | xhigh | max. */
async function chat({ apiKey, model, system, prompt, effort, signal }) {
  const client = new OpenAI({ apiKey });
  const body = {
    model,
    messages: [
      { role: "developer", content: system },
      { role: "user", content: prompt },
    ],
  };
  if (effort) body.reasoning_effort = effort;
  let res;
  try {
    res = await client.chat.completions.create(body, { signal });
  } catch (err) {
    throw new Error(signal && signal.aborted ? "Đã dừng" : explain(err));
  }
  const choice = res.choices && res.choices[0];
  if (choice && choice.message && choice.message.refusal) return `*(Model từ chối: ${choice.message.refusal})*`;
  const text = ((choice && choice.message && choice.message.content) || "").trim();
  return choice && choice.finish_reason === "length" ? text + "\n\n*(Câu trả lời bị cắt vì quá dài.)*" : text;
}

/** Kiểm tra API key bằng một lệnh nhẹ (liệt kê model). */
async function testKey(apiKey) {
  try {
    await new OpenAI({ apiKey }).models.list();
  } catch (err) {
    throw new Error(explain(err));
  }
}

module.exports = { chat, testKey };
