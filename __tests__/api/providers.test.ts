import { describe, it, expect, beforeAll } from "vitest";
import { GET, POST } from "@/app/api/providers/route";

// The provider API routes call getDb() which initializes the DB
// Tests call the route handlers directly with mocked NextRequest

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-encryption-key-for-vitest";
});

describe("Providers API", () => {
  it("GET returns seeded providers (without apiKey)", async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(4);
    // Verify apiKey is NOT in response
    for (const p of body.data) {
      expect(p.apiKey).toBeUndefined();
    }
  });

  it("POST creates a new provider", async () => {
    const request = new Request("http://localhost/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Provider",
        type: "openai",
        endpoint: "https://test.example.com/v1",
        apiKey: "sk-test-key",
        models: [{ id: "test-model", displayName: "Test Model" }],
      }),
    });
    // NextRequest extends Request
    const response = await POST(request as any);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
  });

  it("POST returns 400 for missing fields", async () => {
    const request = new Request("http://localhost/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No Type" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("VALIDATION_ERROR");
  });
});
