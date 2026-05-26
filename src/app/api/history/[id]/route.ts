import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare("SELECT id, provider_id, model_id, request_json, result_json, toml_output, created_at FROM generate_history WHERE id = ?").get(id) as { id: string; provider_id: string; model_id: string; request_json: string; result_json: string; toml_output: string; created_at: string } | undefined;
  if (!row) return NextResponse.json({ success: false, error: "记录不存在", code: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({
    success: true, data: { id: row.id, providerId: row.provider_id, modelId: row.model_id, requestJson: JSON.parse(row.request_json), resultJson: JSON.parse(row.result_json), createdAt: row.created_at },
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  getDb().prepare("DELETE FROM generate_history WHERE id = ?").run(id);
  return NextResponse.json({ success: true, data: { deleted: id } });
}
