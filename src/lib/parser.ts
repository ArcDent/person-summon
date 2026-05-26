export function extractJsonObject(rawResponse: string): Record<string, unknown> {
  let text = rawResponse.trim();

  // 1. Remove markdown code block wrapper
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "");
    text = text.replace(/\s*```$/, "");
    text = text.trim();
  }

  // 2. Try direct parse
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    // 3. Fallback: extract from first { to last }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error("模型没有返回可解析的 JSON 对象");
    }
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  }
}
