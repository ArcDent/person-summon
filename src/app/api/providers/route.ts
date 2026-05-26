import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { v4 as uuid } from "uuid";
import type { ProviderConfigPublic, ModelInfo } from "@/types";

export async function GET(): Promise<NextResponse> {
  const db = getDb();
  const rows = db.prepare(
    "SELECT id, name, type, endpoint, created_at FROM providers ORDER BY created_at"
  ).all() as Array<{ id: string; name: string; type: "openai" | "anthropic"; endpoint: string; created_at: string }>;

  const providers: ProviderConfigPublic[] = rows.map((row) => {
    const modelRows = db.prepare(
      "SELECT id, display_name FROM provider_models WHERE provider_id = ?"
    ).all(row.id) as Array<{ id: string; display_name: string }>;

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      endpoint: row.endpoint,
      models: modelRows.map((m) => ({ id: m.id, displayName: m.display_name })),
      createdAt: row.created_at,
    };
  });

  return NextResponse.json({ success: true, data: providers });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const db = getDb();

  const { id, name, type, endpoint, apiKey, models } = body as {
    id?: string; name: string; type: string; endpoint: string; apiKey: string; models: ModelInfo[];
  };

  if (!name || !type || !endpoint) {
    return NextResponse.json(
      { success: false, error: "name, type, endpoint 为必填字段", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (type !== "openai" && type !== "anthropic") {
    return NextResponse.json(
      { success: false, error: "type 必须为 openai 或 anthropic", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const encryptedKey = apiKey ? encrypt(apiKey) : "";

  if (id) {
    const existing = db.prepare("SELECT id FROM providers WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "提供商不存在", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    db.transaction(() => {
      if (encryptedKey) {
        db.prepare("UPDATE providers SET name=?, type=?, endpoint=?, api_key=? WHERE id=?")
          .run(name, type, endpoint, encryptedKey, id);
      } else {
        db.prepare("UPDATE providers SET name=?, type=?, endpoint=? WHERE id=?")
          .run(name, type, endpoint, id);
      }
      db.prepare("DELETE FROM provider_models WHERE provider_id = ?").run(id);
      const insertModel = db.prepare(
        "INSERT INTO provider_models (id, provider_id, display_name) VALUES (?, ?, ?)"
      );
      for (const m of models ?? []) {
        insertModel.run(m.id, id, m.displayName);
      }
    })();

    return NextResponse.json({ success: true, data: { id } });
  } else {
    const newId = uuid();

    db.transaction(() => {
      db.prepare("INSERT INTO providers (id, name, type, endpoint, api_key) VALUES (?, ?, ?, ?, ?)")
        .run(newId, name, type, endpoint, encryptedKey);
      const insertModel = db.prepare(
        "INSERT INTO provider_models (id, provider_id, display_name) VALUES (?, ?, ?)"
      );
      for (const m of models ?? []) {
        insertModel.run(m.id, newId, m.displayName);
      }
    })();

    return NextResponse.json({ success: true, data: { id: newId } }, { status: 201 });
  }
}
