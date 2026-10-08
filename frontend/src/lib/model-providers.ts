export interface ModelProvider {
  id: string;
  name: string;
  baseUrl: string;
  keyUrl: string;
  models: string[];
}

// First release: a single image-capable model handles both recognition and teaching.
export const modelProviders: ModelProvider[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    keyUrl: "https://platform.deepseek.com/api_keys",
    models: ["deepseek-flash"],
  },
  {
    id: "bailian",
    name: "阿里云百炼",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    keyUrl: "https://help.aliyun.com/zh/model-studio/get-api-key",
    models: ["qwen3-vl-plus"],
  },
];
