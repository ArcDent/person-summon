import Database from "better-sqlite3";
import path from "path";
import { v4 as uuid } from "uuid";

const DB_PATH = path.join(process.cwd(), "data", "person-summon.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initDb();
    seedIfEmpty();
  }
  return db;
}

function initDb(): void {
  const d = db!;
  d.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('openai','anthropic')),
      endpoint TEXT NOT NULL,
      api_key TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS provider_models (
      id TEXT NOT NULL,
      provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL,
      PRIMARY KEY (id, provider_id)
    );

    CREATE TABLE IF NOT EXISTS generate_history (
      id TEXT PRIMARY KEY,
      provider_id TEXT REFERENCES providers(id) ON DELETE SET NULL,
      model_id TEXT,
      request_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      toml_output TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prompt_template (
      language TEXT PRIMARY KEY,
      template TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function seedIfEmpty(): void {
  const d = db!;
  const count = d.prepare("SELECT COUNT(*) as c FROM providers").get() as { c: number };
  if (count.c > 0) return;

  const insertProvider = d.prepare(
    "INSERT INTO providers (id, name, type, endpoint) VALUES (?, ?, ?, ?)"
  );
  const insertModel = d.prepare(
    "INSERT INTO provider_models (id, provider_id, display_name) VALUES (?, ?, ?)"
  );

  const seed = d.transaction(() => {
    // OpenAI
    const openaiId = uuid();
    insertProvider.run(openaiId, "OpenAI", "openai", "https://api.openai.com/v1");
    insertModel.run("gpt-4o", openaiId, "GPT-4o");
    insertModel.run("gpt-4o-mini", openaiId, "GPT-4o Mini");

    // Anthropic
    const anthId = uuid();
    insertProvider.run(anthId, "Anthropic", "anthropic", "https://api.anthropic.com/v1");
    insertModel.run("claude-sonnet-4-6", anthId, "Claude Sonnet 4.6");
    insertModel.run("claude-haiku-4-5", anthId, "Claude Haiku 4.5");

    // DeepSeek
    const dsId = uuid();
    insertProvider.run(dsId, "DeepSeek", "openai", "https://api.deepseek.com/v1");
    insertModel.run("deepseek-chat", dsId, "DeepSeek Chat");
    insertModel.run("deepseek-reasoner", dsId, "DeepSeek Reasoner");

    // Ollama
    const ollamaId = uuid();
    insertProvider.run(ollamaId, "Ollama (本地)", "openai", "http://localhost:11434/v1");
  });

  seed();
}
