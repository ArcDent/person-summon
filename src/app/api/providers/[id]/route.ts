import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const db = getDb();

  const existing = db.prepare("SELECT id FROM providers WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "提供商不存在", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  db.prepare("DELETE FROM providers WHERE id = ?").run(id);

  return NextResponse.json({ success: true, data: { deleted: id } });
}
