import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { callLLM } from "@/lib/llm";
import { buildPromptInstruction } from "@/lib/prompt";
import { extractJsonObject } from "@/lib/parser";
import { normalizeResult, buildConfigBlocks } from "@/lib/normalizer";
import { generateToml } from "@/lib/toml";
import { v4 as uuid } from "uuid";
import type { GenerateRequest, ProviderConfig } from "@/types";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "127.0.0.1";
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${retryAfter} 秒后重试`, code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const body = await request.json() as GenerateRequest;

  // Validation
  if (!body.providerId || !body.modelId || !body.sourceText) {
    return NextResponse.json(
      { success: false, error: "providerId, modelId, sourceText 为必填字段", code: "VALIDATION_ERROR" }, { status: 400 }
    );
  }
  if (body.sourceText.length > 20000) {
    return NextResponse.json(
      { success: false, error: "sourceText 不能超过 20000 字符", code: "VALIDATION_ERROR" }, { status: 400 }
    );
  }
  if ((body.extraRequirements ?? "").length > 4000) {
    return NextResponse.json(
      { success: false, error: "extraRequirements 不能超过 4000 字符", code: "VALIDATION_ERROR" }, { status: 400 }
    );
  }

  // Load provider
  const db = getDb();
  const providerRow = db.prepare("SELECT id, name, type, endpoint, api_key FROM providers WHERE id = ?").get(body.providerId) as { id: string; name: string; type: "openai" | "anthropic"; endpoint: string; api_key: string } | undefined;
  if (!providerRow) {
    return NextResponse.json({ success: false, error: "提供商不存在", code: "NOT_FOUND" }, { status: 404 });
  }

  const modelRows = db.prepare("SELECT id, display_name FROM provider_models WHERE provider_id = ?").all(providerRow.id) as Array<{ id: string; display_name: string }>;

  const provider: ProviderConfig = {
    id: providerRow.id, name: providerRow.name, type: providerRow.type,
    endpoint: providerRow.endpoint, apiKey: providerRow.api_key,
    models: modelRows.map(m => ({ id: m.id, displayName: m.display_name })), createdAt: "",
  };

  // Load prompt template
  const lang = body.language?.startsWith("en") ? "en" : body.language?.startsWith("ja") ? "ja" : "zh";
  const templateRow = db.prepare("SELECT template FROM prompt_template WHERE language = ?").get(lang) as { template: string } | undefined;

  const systemPrompt = buildPromptInstruction(
    body.targetScene || "both", body.language || "简体中文",
    body.extraRequirements ?? "", templateRow?.template,
  ).replace("REPLACE_ME", body.sourceText);

  const stream = body.stream !== false;
  const temperature = body.temperature ?? 0.3;
  const maxTokens = body.maxTokens ?? 1800;

  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = "";
          const onToken = (token: string) => {
            controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify({ text: token })}\n\n`));
          };

          try {
            fullResponse = await callLLM(provider, body.modelId, systemPrompt, { ...body, temperature, maxTokens }, onToken);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "LLM 调用失败";
            let code = "LLM_ERROR";
            if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("API Key")) code = "INVALID_API_KEY";
            else if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) code = "LLM_TIMEOUT";
            else if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) code = "NETWORK_ERROR";
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: msg, code })}\n\n`));
            controller.close(); return;
          }

          try {
            const parsedRaw = extractJsonObject(fullResponse);
            const parsed = normalizeResult(parsedRaw);
            const blocks = buildConfigBlocks(parsed);
            const toml = generateToml(parsed);
            const resultId = uuid();
            const createdAt = new Date().toISOString();

            db.prepare("INSERT INTO generate_history (id, provider_id, model_id, request_json, result_json, toml_output, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(resultId, provider.id, body.modelId, JSON.stringify(body), JSON.stringify({ parsed, blocks, toml, rawResponse: fullResponse }), toml, createdAt);

            controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ id: resultId, parsed, blocks, toml, rawResponse: fullResponse, createdAt })}\n\n`));
          } catch (parseErr) {
            const msg = parseErr instanceof Error ? parseErr.message : "JSON 解析失败";
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: msg, code: "PARSE_FAILED", rawResponse: fullResponse })}\n\n`));
          }
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "内部错误", code: "INTERNAL_ERROR" })}\n\n`));
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  }

  // Non-streaming
  try {
    const fullResponse = await callLLM(provider, body.modelId, systemPrompt, { ...body, temperature, maxTokens });
    const parsedRaw = extractJsonObject(fullResponse);
    const parsed = normalizeResult(parsedRaw);
    const blocks = buildConfigBlocks(parsed);
    const toml = generateToml(parsed);
    const resultId = uuid();
    const createdAt = new Date().toISOString();

    db.prepare("INSERT INTO generate_history (id, provider_id, model_id, request_json, result_json, toml_output, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(resultId, provider.id, body.modelId, JSON.stringify(body), JSON.stringify({ parsed, blocks, toml, rawResponse: fullResponse }), toml, createdAt);

    return NextResponse.json({ success: true, data: { id: resultId, parsed, blocks, toml, rawResponse: fullResponse, createdAt } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "生成失败";
    let code = "LLM_ERROR"; let status = 502;
    if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("API Key")) code = "INVALID_API_KEY";
    else if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) { code = "LLM_TIMEOUT"; status = 504; }
    else if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) { code = "NETWORK_ERROR"; status = 503; }
    else if (msg.includes("JSON")) code = "PARSE_FAILED";
    return NextResponse.json({ success: false, error: msg, code }, { status });
  }
}
