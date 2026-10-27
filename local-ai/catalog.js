// Danh sách model chạy trên máy (GGUF trên Hugging Face, đã kiểm tra repo, tên file, dung lượng ngày 2026-10-16).
// Thứ tự hãng = thứ tự ưu tiên khi đề xuất. Mọi repo đều công khai (không cần đăng nhập Hugging Face).
const VENDORS = {
  openai: { name: "OpenAI", color: "#10a37f", mark: "O" },
  google: { name: "Google", color: "#4285f4", mark: "G" },
  meta: { name: "Meta", color: "#0866ff", mark: "M" },
  qwen: { name: "Alibaba Qwen", color: "#615ced", mark: "Q" },
  microsoft: { name: "Microsoft", color: "#00a4ef", mark: "Ms" },
  mistral: { name: "Mistral AI", color: "#fa520f", mark: "Mi" },
  deepseek: { name: "DeepSeek", color: "#4d6bfe", mark: "D" },
  nvidia: { name: "NVIDIA", color: "#76b900", mark: "N" },
  ibm: { name: "IBM", color: "#0f62fe", mark: "I" },
  liquid: { name: "Liquid AI", color: "#7c3aed", mark: "L" },
  hf: { name: "Hugging Face", color: "#f59e0b", mark: "H" },
};

// params / active: tỷ tham số (active = số tham số chạy mỗi token của model MoE); gb: dung lượng file tải về
const MODELS = [
  { id: "gpt-oss-20b", vendor: "openai", name: "gpt-oss 20B", repo: "ggml-org/gpt-oss-20b-GGUF", file: "gpt-oss-20b-MXFP4.gguf", gb: 12.11, params: 20.91, active: 3.6, ctx: 131072, quant: "MXFP4", license: "Apache 2.0", tags: ["Suy luận", "MoE"], desc: "Model mở của OpenAI, mạnh về suy luận và dùng công cụ." },
  { id: "gpt-oss-120b", vendor: "openai", name: "gpt-oss 120B", repo: "ggml-org/gpt-oss-120b-GGUF", file: "gpt-oss-120b-MXFP4.gguf", gb: 63.39, params: 116.83, active: 5.1, ctx: 131072, quant: "MXFP4", license: "Apache 2.0", tags: ["Suy luận", "MoE"], desc: "Bản lớn nhất của gpt-oss, cần máy trạm nhiều VRAM." },

  { id: "gemma-4-31b", vendor: "google", name: "Gemma 4 31B", repo: "ggml-org/gemma-4-31B-it-GGUF", file: "gemma-4-31B-it-Q4_0.gguf", gb: 17.99, params: 30.70, ctx: 262144, quant: "Q4_0", license: "Apache 2.0", tags: ["Đa ngôn ngữ"], desc: "Bản lớn nhất của Gemma 4, chất lượng cao nhất trong dòng." },
  { id: "gemma-4-26b-a4b", vendor: "google", name: "Gemma 4 26B A4B", repo: "ggml-org/gemma-4-26B-A4B-it-GGUF", file: "gemma-4-26B-A4B-it-Q4_0.gguf", gb: 14.62, params: 25.23, active: 4, ctx: 262144, quant: "Q4_0", license: "Apache 2.0", tags: ["MoE"], desc: "Gemma 4 kiểu MoE: chỉ khoảng 4 tỷ tham số chạy mỗi token nên nhanh." },
  { id: "gemma-4-12b", vendor: "google", name: "Gemma 4 12B", repo: "ggml-org/gemma-4-12B-it-GGUF", file: "gemma-4-12B-it-Q4_0.gguf", gb: 7.22, params: 11.91, ctx: 262144, quant: "Q4_0", license: "Apache 2.0", tags: ["Đa ngôn ngữ"], desc: "Cân bằng giữa chất lượng và tốc độ cho GPU tầm trung." },
  { id: "gemma-4-e4b", vendor: "google", name: "Gemma 4 E4B", repo: "ggml-org/gemma-4-E4B-it-GGUF", file: "gemma-4-E4B-it-Q4_0.gguf", gb: 4.59, params: 7.52, ctx: 131072, quant: "Q4_0", license: "Apache 2.0", tags: ["Nhỏ gọn"], desc: "Gemma 4 cho máy cá nhân; E4B là khoảng 4 tỷ tham số hiệu dụng khi chạy." },
  { id: "gemma-4-e2b", vendor: "google", name: "Gemma 4 E2B", repo: "ggml-org/gemma-4-E2B-it-GGUF", file: "gemma-4-E2B-it-Q4_0.gguf", gb: 2.84, params: 4.65, ctx: 131072, quant: "Q4_0", license: "Apache 2.0", tags: ["Nhỏ gọn"], desc: "Bản nhỏ nhất của Gemma 4, chạy tốt trên GPU 4 GB." },
  { id: "gemma-3-4b", vendor: "google", name: "Gemma 3 4B", repo: "ggml-org/gemma-3-4b-it-GGUF", file: "gemma-3-4b-it-Q4_K_M.gguf", gb: 2.49, params: 3.88, ctx: 131072, quant: "Q4_K_M", license: "Gemma", tags: ["Nhỏ gọn"], desc: "Gemma thế hệ 3, nhỏ gọn và ổn định." },
  { id: "gemma-3-1b", vendor: "google", name: "Gemma 3 1B", repo: "ggml-org/gemma-3-1b-it-GGUF", file: "gemma-3-1b-it-Q4_K_M.gguf", gb: 0.81, params: 1.0, ctx: 32768, quant: "Q4_K_M", license: "Gemma", tags: ["Siêu nhẹ"], desc: "Rất nhẹ, chạy được cả trên máy yếu." },

  { id: "llama-3.1-8b", vendor: "meta", name: "Llama 3.1 8B", repo: "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF", file: "Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf", gb: 4.92, params: 8.03, ctx: 131072, quant: "Q4_K_M", license: "Llama 3.1", tags: ["Phổ biến"], desc: "Model mở phổ biến nhất của Meta, đa dụng." },
  { id: "llama-3.2-3b", vendor: "meta", name: "Llama 3.2 3B", repo: "bartowski/Llama-3.2-3B-Instruct-GGUF", file: "Llama-3.2-3B-Instruct-Q4_K_M.gguf", gb: 2.02, params: 3.21, ctx: 131072, quant: "Q4_K_M", license: "Llama 3.2", tags: ["Nhỏ gọn"], desc: "Llama nhỏ gọn cho máy cá nhân, trả lời nhanh." },
  { id: "llama-3.2-1b", vendor: "meta", name: "Llama 3.2 1B", repo: "bartowski/Llama-3.2-1B-Instruct-GGUF", file: "Llama-3.2-1B-Instruct-Q4_K_M.gguf", gb: 0.81, params: 1.24, ctx: 131072, quant: "Q4_K_M", license: "Llama 3.2", tags: ["Siêu nhẹ"], desc: "Bản nhẹ nhất của Llama 3.2." },

  { id: "qwen3.8-27b", vendor: "qwen", name: "Qwen3.8 27B", repo: "ggml-org/Qwen3.8-27B-GGUF", file: "Qwen3.8-27B-Q4_K_M.gguf", gb: 18.97, params: 26.9, ctx: 262144, quant: "Q4_K_M", license: "Apache 2.0", tags: ["Suy luận", "Mới"], desc: "Thế hệ Qwen mới nhất (ra mắt 8/2026), bản dense 27 tỷ tham số." },
  { id: "qwen3.6-35b-a3b", vendor: "qwen", name: "Qwen3.6 35B A3B", repo: "ggml-org/Qwen3.6-35B-A3B-GGUF", file: "Qwen3.6-35B-A3B-Q4_K_M.gguf", gb: 20.42, params: 34.66, active: 3, ctx: 262144, quant: "Q4_K_M", license: "Apache 2.0", tags: ["MoE"], desc: "Qwen kiểu MoE: khoảng 3 tỷ tham số chạy mỗi token." },
  { id: "qwen3.5-9b", vendor: "qwen", name: "Qwen3.5 9B", repo: "unsloth/Qwen3.5-9B-GGUF", file: "Qwen3.5-9B-Q4_K_M.gguf", gb: 5.68, params: 8.95, ctx: 262144, quant: "Q4_K_M", license: "Apache 2.0", tags: ["Suy luận"], desc: "Qwen3.5 tầm trung, đa ngôn ngữ, ngữ cảnh dài." },
  { id: "qwen3.5-4b", vendor: "qwen", name: "Qwen3.5 4B", repo: "unsloth/Qwen3.5-4B-GGUF", file: "Qwen3.5-4B-Q4_K_M.gguf", gb: 2.74, params: 4.21, ctx: 262144, quant: "Q4_K_M", license: "Apache 2.0", tags: ["Nhỏ gọn"], desc: "Qwen3.5 nhỏ gọn, cân bằng giữa chất lượng và tốc độ." },
  { id: "qwen3.5-2b", vendor: "qwen", name: "Qwen3.5 2B", repo: "unsloth/Qwen3.5-2B-GGUF", file: "Qwen3.5-2B-Q4_K_M.gguf", gb: 1.28, params: 1.88, ctx: 262144, quant: "Q4_K_M", license: "Apache 2.0", tags: ["Siêu nhẹ"], desc: "Rất nhẹ, trả lời nhanh cho việc đơn giản." },
  { id: "qwen3.5-0.8b", vendor: "qwen", name: "Qwen3.5 0.8B", repo: "unsloth/Qwen3.5-0.8B-GGUF", file: "Qwen3.5-0.8B-Q4_K_M.gguf", gb: 0.53, params: 0.75, ctx: 262144, quant: "Q4_K_M", license: "Apache 2.0", tags: ["Siêu nhẹ"], desc: "Model nhỏ nhất, chạy được trên hầu hết mọi máy." },

  { id: "phi-4", vendor: "microsoft", name: "Phi-4 14B", repo: "microsoft/phi-4-gguf", file: "phi-4-Q4_0.gguf", gb: 8.38, params: 14.66, ctx: 16384, quant: "Q4_0", license: "MIT", tags: ["Suy luận"], desc: "Phi-4 của Microsoft, mạnh về toán và suy luận." },
  { id: "phi-4-mini", vendor: "microsoft", name: "Phi-4 mini", repo: "unsloth/Phi-4-mini-instruct-GGUF", file: "Phi-4-mini-instruct-Q4_K_M.gguf", gb: 2.49, params: 3.84, ctx: 131072, quant: "Q4_K_M", license: "MIT", tags: ["Nhỏ gọn"], desc: "Phi-4 bản nhỏ, ngữ cảnh dài 128K." },

  { id: "ministral-3-14b", vendor: "mistral", name: "Ministral 3 14B", repo: "mistralai/Ministral-3-14B-Instruct-2512-GGUF", file: "Ministral-3-14B-Instruct-2512-Q4_K_M.gguf", gb: 8.24, params: 13.51, ctx: 262144, quant: "Q4_K_M", license: "Apache 2.0", tags: ["Đa ngôn ngữ"], desc: "Bản lớn của dòng Ministral 3, file GGUF chính chủ Mistral." },
  { id: "ministral-3-8b", vendor: "mistral", name: "Ministral 3 8B", repo: "mistralai/Ministral-3-8B-Instruct-2512-GGUF", file: "Ministral-3-8B-Instruct-2512-Q4_K_M.gguf", gb: 5.2, params: 8.49, ctx: 262144, quant: "Q4_K_M", license: "Apache 2.0", tags: ["Đa ngôn ngữ"], desc: "Ministral 3 tầm trung, file GGUF chính chủ Mistral." },
  { id: "ministral-3-3b", vendor: "mistral", name: "Ministral 3 3B", repo: "mistralai/Ministral-3-3B-Instruct-2512-GGUF", file: "Ministral-3-3B-Instruct-2512-Q4_K_M.gguf", gb: 2.15, params: 3.43, ctx: 262144, quant: "Q4_K_M", license: "Apache 2.0", tags: ["Nhỏ gọn"], desc: "Ministral 3 nhỏ gọn cho máy cá nhân." },

  { id: "deepseek-r1-qwen3-8b", vendor: "deepseek", name: "DeepSeek R1 0528 Qwen3 8B", repo: "unsloth/DeepSeek-R1-0528-Qwen3-8B-GGUF", file: "DeepSeek-R1-0528-Qwen3-8B-Q4_K_M.gguf", gb: 5.03, params: 8.19, ctx: 131072, quant: "Q4_K_M", license: "MIT", tags: ["Suy luận"], desc: "Khả năng suy luận của DeepSeek R1 chưng cất vào Qwen3 8B." },

  { id: "nemotron-3.5-30b-a3b", vendor: "nvidia", name: "Nemotron 3.5 Lightning 30B A3B", repo: "ggml-org/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-GGUF", file: "NVIDIA-Nemotron-3.5-Lightning-30B-A3B-Q4_0.gguf", gb: 18.9, params: 31.58, active: 3, ctx: 1048576, quant: "Q4_0", license: "NVIDIA Open", tags: ["MoE"], desc: "Model MoE của NVIDIA, ngữ cảnh tới 1 triệu token." },

  { id: "granite-4.2-8b", vendor: "ibm", name: "Granite 4.2 8B", repo: "ibm-granite/granite-4.2-8b-GGUF", file: "granite-4.2-8b-Q4_K_M.gguf", gb: 5.35, params: 8.79, ctx: 131072, quant: "Q4_K_M", license: "Apache 2.0", tags: ["Doanh nghiệp"], desc: "Granite của IBM, file GGUF chính chủ." },
  { id: "granite-4.2-3b", vendor: "ibm", name: "Granite 4.2 3B", repo: "ibm-granite/granite-4.2-3b-GGUF", file: "granite-4.2-3b-Q4_K_M.gguf", gb: 2.24, params: 3.66, ctx: 131072, quant: "Q4_K_M", license: "Apache 2.0", tags: ["Nhỏ gọn"], desc: "Granite bản nhỏ cho máy cá nhân." },

  { id: "lfm2.5-2.6b", vendor: "liquid", name: "LFM2.5 2.6B", repo: "LiquidAI/LFM2.5-2.6B-GGUF", file: "LFM2.5-2.6B-Q4_K_M.gguf", gb: 1.67, params: 2.7, ctx: 131072, quant: "Q4_K_M", license: "LFM Open", tags: ["Nhanh"], desc: "Kiến trúc LFM của Liquid AI, tối ưu cho thiết bị cá nhân." },
  { id: "lfm2.5-1.2b", vendor: "liquid", name: "LFM2.5 1.2B", repo: "LiquidAI/LFM2.5-1.2B-Instruct-GGUF", file: "LFM2.5-1.2B-Instruct-Q4_K_M.gguf", gb: 0.73, params: 1.17, ctx: 128000, quant: "Q4_K_M", license: "LFM Open", tags: ["Siêu nhẹ"], desc: "Bản rất nhẹ của LFM2.5." },

  { id: "smollm3-3b", vendor: "hf", name: "SmolLM3 3B", repo: "ggml-org/SmolLM3-3B-GGUF", file: "SmolLM3-Q4_K_M.gguf", gb: 1.92, params: 3.08, ctx: 65536, quant: "Q4_K_M", license: "Apache 2.0", tags: ["Mở hoàn toàn"], desc: "Model nhỏ mở hoàn toàn của Hugging Face." },
];

const VENDOR_ORDER = Object.keys(VENDORS);
module.exports = { VENDORS, VENDOR_ORDER, MODELS };
