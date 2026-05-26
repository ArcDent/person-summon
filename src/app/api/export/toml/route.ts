import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const historyId = searchParams.get("historyId");
  if (!historyId) return NextResponse.json({ success: false, error: "historyId 查询参数为必填", code: "VALIDATION_ERROR" }, { status: 400 });

  const db = getDb();
  const row = db.prepare("SELECT toml_output FROM generate_history WHERE id = ?").get(historyId) as { toml_output: string } | undefined;
  if (!row) return NextResponse.json({ success: false, error: "记录不存在", code: "NOT_FOUND" }, { status: 404 });

  return new NextResponse(row.toml_output, {
    headers: { "Content-Type": "application/toml", "Content-Disposition": "attachment; filename=\"bot_config.toml\"" },
  });
}
