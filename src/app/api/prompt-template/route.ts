import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { DEFAULT_PROMPT_ZH } from "@/lib/prompt";

const DEFAULTS: Record<string, string> = { zh: DEFAULT_PROMPT_ZH, en: DEFAULT_PROMPT_ZH, ja: DEFAULT_PROMPT_ZH };

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") || "zh";
  const db = getDb();

  const row = db.prepare("SELECT template, updated_at FROM prompt_template WHERE language = ?").get(lang) as
    { template: string; updated_at: string } | undefined;

  if (row) {
    return NextResponse.json({ success: true, data: { language: lang, template: row.template, updatedAt: row.updated_at } });
  }

  return NextResponse.json({
    success: true,
    data: { language: lang, template: DEFAULTS[lang] || DEFAULT_PROMPT_ZH, updatedAt: null },
  });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const { language, template } = body;

  if (!language || !template) {
    return NextResponse.json(
      { success: false, error: "language 和 template 为必填字段", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const db = getDb();
  db.prepare(
    "INSERT INTO prompt_template (language, template, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(language) DO UPDATE SET template=excluded.template, updated_at=excluded.updated_at"
  ).run(language, template);

  return NextResponse.json({ success: true, data: { language, updated: true } });
}
