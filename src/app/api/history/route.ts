import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { HistoryItem } from "@/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const db = getDb();

  let rows: Array<{ id: string; provider_id: string | null; model_id: string | null; request_json: string; result_json: string; toml_output: string; created_at: string }>;

  if (cursor) {
    rows = db.prepare("SELECT id, provider_id, model_id, request_json, result_json, toml_output, created_at FROM generate_history WHERE id < ? ORDER BY id DESC LIMIT ?").all(cursor, limit + 1) as typeof rows;
  } else {
    rows = db.prepare("SELECT id, provider_id, model_id, request_json, result_json, toml_output, created_at FROM generate_history ORDER BY id DESC LIMIT ?").all(limit + 1) as typeof rows;
  }

  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();

  const items: HistoryItem[] = rows.map(row => ({
    id: row.id,
    providerId: row.provider_id,
    modelId: row.model_id,
    requestJson: JSON.parse(row.request_json),
    resultJson: JSON.parse(row.result_json),
    createdAt: row.created_at,
  }));

  return NextResponse.json({ success: true, data: { items, nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null } });
}
