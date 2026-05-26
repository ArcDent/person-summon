import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock the LLM call to avoid real API calls
vi.mock("@/lib/llm", () => ({
  callLLM: vi.fn().mockResolvedValue('{"personality":"test personality","reply_style":"test style","multiple_reply_style":[],"group_chat_prompt":"","private_chat_prompts":"","chat_prompts":[],"notes":[]}'),
}));

// Mock rate limit to always allow
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
}));

describe("Generate API", () => {
  it("POST returns 400 for missing sourceText", async () => {
    const { POST } = await import("@/app/api/generate/route");
    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: "non-existent", modelId: "test" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("POST validates sourceText max length", async () => {
    const { POST } = await import("@/app/api/generate/route");
    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: "test",
        modelId: "test",
        sourceText: "x".repeat(20001),
        stream: false,
      }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("POST returns 404 for non-existent provider", async () => {
    const { POST } = await import("@/app/api/generate/route");
    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: "non-existent-uuid",
        modelId: "test",
        sourceText: "valid text",
        stream: false,
      }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(404);
  });
});
