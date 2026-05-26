import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/history/route";

describe("History API", () => {
  it("GET returns paginated response structure", async () => {
    const request = new Request("http://localhost/api/history?limit=5");
    const response = await GET(request as any);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("items");
    expect(body.data).toHaveProperty("nextCursor");
    expect(Array.isArray(body.data.items)).toBe(true);
  });
});
