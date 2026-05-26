import type { GenerateRequest, ProviderConfig } from "@/types";
import { callOpenAI } from "./openai";
import { callAnthropic } from "./anthropic";
import { decrypt } from "../crypto";

export async function callLLM(
  provider: ProviderConfig,
  modelId: string,
  systemPrompt: string,
  request: GenerateRequest,
  onToken?: (token: string) => void,
): Promise<string> {
  const apiKey = decrypt(provider.apiKey);
  if (!apiKey) {
    throw new Error("API Key 未配置，请先在模型配置中填写 API Key");
  }

  const model = provider.models.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`模型 ${modelId} 未在提供商 ${provider.name} 中找到`);
  }

  switch (provider.type) {
    case "openai":
      return callOpenAI(provider.endpoint, apiKey, modelId, systemPrompt, request, onToken);
    case "anthropic":
      return callAnthropic(provider.endpoint, apiKey, modelId, systemPrompt, request, onToken);
    default:
      throw new Error(`不支持的提供商类型: ${provider.type}`);
  }
}
