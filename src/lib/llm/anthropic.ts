import Anthropic from "@anthropic-ai/sdk";
import type { GenerateRequest } from "@/types";

export async function callAnthropic(
  endpoint: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  request: GenerateRequest,
  onToken?: (token: string) => void,
): Promise<string> {
  const client = new Anthropic({ baseURL: endpoint, apiKey });

  if (request.stream) {
    const stream = await client.messages.stream({
      model,
      max_tokens: request.maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: request.sourceText }],
    });

    let fullResponse = "";
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        onToken?.(event.delta.text);
      }
    }
    return fullResponse;
  } else {
    const message = await client.messages.create({
      model,
      max_tokens: request.maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: request.sourceText }],
    });
    const block = message.content.find((b) => b.type === "text");
    return block?.type === "text" ? block.text : "";
  }
}
