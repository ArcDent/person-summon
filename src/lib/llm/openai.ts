import OpenAI from "openai";
import type { GenerateRequest } from "@/types";

export async function callOpenAI(
  endpoint: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  request: GenerateRequest,
  onToken?: (token: string) => void,
): Promise<string> {
  const client = new OpenAI({ baseURL: endpoint, apiKey });

  if (request.stream) {
    const stream = await client.chat.completions.create({
      model,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.sourceText },
      ],
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        onToken?.(delta);
      }
    }
    return fullResponse;
  } else {
    const completion = await client.chat.completions.create({
      model,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.sourceText },
      ],
    });
    return completion.choices[0]?.message?.content ?? "";
  }
}
