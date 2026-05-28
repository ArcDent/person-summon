import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { DEFAULT_PROMPT_ZH } from "@/lib/prompt";

const DEFAULTS: Record<string, string> = { zh: DEFAULT_PROMPT_ZH, en: DEFAULT_PROMPT_ZH };

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const language = body.language as string | undefined;

  const db = getDb();

  if (language) {
    const defaultTemplate = DEFAULTS[language] || DEFAULT_PROMPT_ZH;
    db.prepare("DELETE FROM prompt_template WHERE language = ?").run(language);
    return NextResponse.json({ success: true, data: { language, reset: true, template: defaultTemplate } });
  }

  db.prepare("DELETE FROM prompt_template").run();
  return NextResponse.json({ success: true, data: { reset: true } });
}
