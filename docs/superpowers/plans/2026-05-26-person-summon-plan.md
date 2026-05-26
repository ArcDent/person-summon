# person-summon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack persona generator as a Next.js 15 app with SQLite storage, OpenAI/Anthropic LLM support, three-language i18n, and Docker deployment.

**Architecture:** Next.js 15 App Router monolith — server components for layout, client components for UI interactivity, API routes for backend logic. SQLite via better-sqlite3 for data persistence. LLM adapters abstract OpenAI-compatible and Anthropic native APIs behind a common interface. Core logic (prompt building, JSON parsing, normalization, TOML generation) lives in `src/lib/` as pure functions.

**Tech Stack:** Next.js 15, TypeScript, better-sqlite3, openai SDK, @anthropic-ai/sdk, smol-toml, vitest, Docker

---

## Files Map

```
src/types/index.ts           — shared TypeScript types
src/lib/db.ts                — SQLite init, migrations, seed, query helpers
src/lib/crypto.ts            — AES-256-GCM encrypt/decrypt
src/lib/prompt.ts            — default prompt templates + buildPromptInstruction()
src/lib/parser.ts            — extractJsonObject() from LLM output
src/lib/normalizer.ts        — normalizeResult() + buildConfigBlocks()
src/lib/toml.ts              — generateToml() output
src/lib/llm/openai.ts        — OpenAI-compatible adapter
src/lib/llm/anthropic.ts     — Anthropic native adapter
src/lib/llm/index.ts         — dispatcher: callLLM()
src/lib/rate-limit.ts        — in-memory IP-based rate limiter
src/app/globals.css           — minimal global styles
src/app/layout.tsx            — root layout + i18n provider
src/app/page.tsx              — main page (client component)
src/app/api/providers/route.ts           — GET list, POST create/update
src/app/api/providers/[id]/route.ts      — DELETE
src/app/api/generate/route.ts            — POST generate (SSE/non-stream)
src/app/api/history/route.ts             — GET cursor-paginated list
src/app/api/history/[id]/route.ts        — GET single, DELETE
src/app/api/export/toml/route.ts         — GET download
src/app/api/prompt-template/route.ts     — GET by lang, PUT update
src/app/api/prompt-template/reset/route.ts  — POST reset to defaults
src/components/GeneratorForm.tsx          — input form
src/components/ResultTabs.tsx             — three-tab result display
src/components/ConfigBlockCard.tsx        — single config block card
src/components/ProviderManager.tsx         — provider CRUD modal
src/components/ModelSelector.tsx          — provider → model dropdown
src/components/PromptEditor.tsx           — edit + reset prompt template
src/components/HistoryPanel.tsx           — slide-out history sidebar
src/i18n/zh.json, en.json, ja.json        — translation files
__tests__/parser.test.ts                  — unit tests
__tests__/prompt.test.ts                  — snapshot tests
__tests__/normalizer.test.ts              — output compatibility tests
__tests__/api/                            — integration tests
Dockerfile, docker-compose.yml, start.sh  — deployment
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `src/app/globals.css`, `src/app/layout.tsx`, `data/.gitkeep`, `vitest.config.ts`

- [ ] **Step 1: Initialize project directory**

```bash
cd /home/arcdent/github/person-summon
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "person-summon",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "better-sqlite3": "^11.0.0",
    "openai": "^4.70.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "smol-toml": "^1.3.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/uuid": "^10.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Create next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 6: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 7: Create .gitignore**

```
node_modules/
.next/
data/*
!data/.gitkeep
.env
.env.local
*.tsbuildinfo
```

- [ ] **Step 8: Create minimal layout and global CSS**

Create `src/app/globals.css` with basic reset and CSS variables for theming (light theme, monospace-friendly).

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "人格生成器 | Persona Generator",
  description: "Generate bot personality configs for maimaibot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Verify dev server starts (empty page)**

```bash
npm run dev &
sleep 3
curl -s http://localhost:3000 | head -5
# Expected: HTML document with empty body
kill %1
```

---

### Task 2: Type Definitions

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write all shared types**

```typescript
// ====== Provider & Model ======
export interface ModelInfo {
  id: string;
  displayName: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: "openai" | "anthropic";
  endpoint: string;
  apiKey: string;
  models: ModelInfo[];
  createdAt: string;
}

export type ProviderConfigPublic = Omit<ProviderConfig, "apiKey">;

// ====== Generate Request ======
export interface GenerateRequest {
  providerId: string;
  modelId: string;
  sourceText: string;
  targetScene: "group" | "private" | "both";
  language: string;
  extraRequirements: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
}

// ====== Parsed Result (compatible with MaiMai) ======
export interface ChatPrompt {
  platform: string;
  item_id: string;
  rule_type: "group" | "private";
  prompt: string;
}

export interface ParsedResult {
  personality: string;
  reply_style: string;
  multiple_reply_style: string[];
  group_chat_prompt: string;
  private_chat_prompts: string;
  chat_prompts: ChatPrompt[];
  notes: string[];
}

// ====== Config Block ======
export interface ConfigBlock {
  id: string;
  section: string;
  field: string;
  title: string;
  description: string;
  value: string | string[] | ChatPrompt[];
  toml: string;
}

// ====== Generate Response ======
export interface GenerateResponse {
  id: string;
  parsed: ParsedResult;
  blocks: ConfigBlock[];
  toml: string;
  rawResponse: string;
  createdAt: string;
}

// ====== History ======
export interface HistoryItem {
  id: string;
  providerId: string | null;
  modelId: string | null;
  requestJson: GenerateRequest;
  resultJson: GenerateResponse;
  createdAt: string;
}

// ====== API Wrappers ======
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

// ====== Prompt Template ======
export interface PromptTemplate {
  language: string;
  template: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
# Expected: no errors (may have "no inputs" warning from Next.js — ignore)
```

---

### Task 3: Database Layer + Seed Data

**Files:**
- Create: `src/lib/db.ts`

- [ ] **Step 1: Create database module with initialization, migrations, and seed**

```typescript
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
```

- [ ] **Step 2: Verify DB creates and seeds correctly**

```bash
node -e "
const { getDb } = require('./src/lib/db.ts');
// Can't test directly with TS — write a quick check script or run via vitest
"
```

Actually, write a quick inline test using `tsx`:

```bash
npx tsx -e "
import { getDb } from './src/lib/db';
const db = getDb();
const providers = db.prepare('SELECT * FROM providers').all();
console.log('Providers:', providers.length);
const models = db.prepare('SELECT * FROM provider_models').all();
console.log('Models:', models.length);
console.log('Seed OK');
"
# Expected: Providers: 4, Models: 6, Seed OK
```

---

### Task 4: Crypto Module

**Files:**
- Create: `src/lib/crypto.ts`

- [ ] **Step 1: Create encrypt/decrypt module**

```typescript
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.error("ENCRYPTION_KEY environment variable is required");
    process.exit(1);
  }
  // Derive 32-byte key using SHA-256
  return crypto.createHash("sha256").update(key).digest();
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv + encrypted + tag)
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";
  const key = getKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
```

- [ ] **Step 2: Quick verify round-trip**

```bash
ENCRYPTION_KEY=test-key npx tsx -e "
import { encrypt, decrypt } from './src/lib/crypto';
const original = 'sk-test-api-key-12345';
const enc = encrypt(original);
console.log('Encrypted:', enc.slice(0, 20) + '...');
const dec = decrypt(enc);
console.log('Match:', original === dec);
"
# Expected: Match: true
```

---

### Task 5: Parser (TDD)

**Files:**
- Create: `__tests__/parser.test.ts`, `src/lib/parser.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { extractJsonObject } from "@/lib/parser";

describe("extractJsonObject", () => {
  it("parses plain JSON object", () => {
    const input = '{"personality":"test","notes":[]}';
    const result = extractJsonObject(input);
    expect(result).toEqual({ personality: "test", notes: [] });
  });

  it("strips markdown code block with json tag", () => {
    const input = '```json\n{"personality":"test","notes":[]}\n```';
    const result = extractJsonObject(input);
    expect(result).toEqual({ personality: "test", notes: [] });
  });

  it("strips markdown code block without language tag", () => {
    const input = '```\n{"personality":"test","notes":[]}\n```';
    const result = extractJsonObject(input);
    expect(result).toEqual({ personality: "test", notes: [] });
  });

  it("extracts JSON from text with surrounding content", () => {
    const input = 'Here is the result:\n{"personality":"test","notes":[]}\nDone.';
    const result = extractJsonObject(input);
    expect(result).toEqual({ personality: "test", notes: [] });
  });

  it("extracts first { to last } when direct parse fails", () => {
    const input = 'Prefix text {"personality":"test","notes":[]} suffix text';
    const result = extractJsonObject(input);
    expect(result).toEqual({ personality: "test", notes: [] });
  });

  it("handles nested objects and arrays", () => {
    const input = '{"personality":"test","chat_prompts":[{"platform":"qq","item_id":"","rule_type":"group","prompt":"hello"}],"notes":["note1"]}';
    const result = extractJsonObject(input);
    expect(result.personality).toBe("test");
    expect(result.chat_prompts).toHaveLength(1);
    expect(result.notes).toEqual(["note1"]);
  });

  it("throws on non-JSON input without braces", () => {
    const input = "This is just plain text with no JSON.";
    expect(() => extractJsonObject(input)).toThrow("模型没有返回可解析的 JSON 对象");
  });

  it("handles empty input", () => {
    expect(() => extractJsonObject("")).toThrow();
  });

  it("handles unicode characters in JSON", () => {
    const input = '{"personality":"你好世界","reply_style":"日本語テスト"}';
    const result = extractJsonObject(input);
    expect(result.personality).toBe("你好世界");
    expect(result.reply_style).toBe("日本語テスト");
  });
});
```

- [ ] **Step 2: Run tests (expected: all fail)**

```bash
npx vitest run __tests__/parser.test.ts
# Expected: FAIL — module not found
```

- [ ] **Step 3: Implement extractJsonObject**

```typescript
export function extractJsonObject(rawResponse: string): Record<string, unknown> {
  let text = rawResponse.trim();

  // 1. Remove markdown code block wrapper
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "");
    text = text.replace(/\s*```$/, "");
    text = text.trim();
  }

  // 2. Try direct parse
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    // 3. Fallback: extract from first { to last }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error("模型没有返回可解析的 JSON 对象");
    }
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  }
}
```

- [ ] **Step 4: Run tests (expected: all pass)**

```bash
npx vitest run __tests__/parser.test.ts
# Expected: 9 tests PASS
```

---

### Task 6: Prompt Template (TDD)

**Files:**
- Create: `__tests__/prompt.test.ts`, `src/lib/prompt.ts`

- [ ] **Step 1: Write prompt snapshot test**

```typescript
import { describe, it, expect } from "vitest";
import { getDefaultPrompt, buildPromptInstruction, DEFAULT_PROMPT_ZH } from "@/lib/prompt";

describe("DEFAULT_PROMPT_ZH", () => {
  it("includes key MaiMai-compatible sections", () => {
    const prompt = DEFAULT_PROMPT_ZH;
    expect(prompt).toContain("[personality]");
    expect(prompt).toContain("[chat]");
    expect(prompt).toContain("personality");
    expect(prompt).toContain("reply_style");
    expect(prompt).toContain("multiple_reply_style");
    expect(prompt).toContain("group_chat_prompt");
    expect(prompt).toContain("private_chat_prompts");
    expect(prompt).toContain("chat_prompts");
    expect(prompt).toContain("notes");
  });

  it("matches known MaiMai prompt structure (snapshot)", () => {
    expect(DEFAULT_PROMPT_ZH).toMatchSnapshot();
  });
});

describe("buildPromptInstruction", () => {
  it("injects targetScene into prompt", () => {
    const result = buildPromptInstruction("群聊和私聊", "简体中文", "无");
    expect(result).toContain("群聊和私聊");
  });

  it("injects language into prompt", () => {
    const result = buildPromptInstruction("群聊", "English", "无");
    expect(result).toContain("English");
  });

  it("injects extra requirements", () => {
    const result = buildPromptInstruction("群聊", "简体中文", "保持角色一致性");
    expect(result).toContain("保持角色一致性");
  });

  it("handles empty extra requirements", () => {
    const result = buildPromptInstruction("both", "简体中文", "");
    expect(result).toContain('额外要求：\n无');
  });
});
```

- [ ] **Step 2: Run tests (expected: fail)**

```bash
npx vitest run __tests__/prompt.test.ts
# Expected: FAIL
```

- [ ] **Step 3: Implement prompt module**

```typescript
export const DEFAULT_PROMPT_ZH = `你是 MaiBot/MaiM 的配置人设解析助手。请把用户提供的任意文段、角色卡、人设、说话风格或聊天要求，改写成可以直接放入 bot_config.toml 的麦麦人设配置。

目标场景：{target_scene}
主要输出语言：{language}

默认人设参考：
下面是用于本功能的固定默认参考人设，只用于理解麦麦默认语气、字段职责和通用聊天边界；生成时必须以用户原文为主，不要逐字照抄。如果用户原文缺少场景规则，可以沿用这些设定的精神。
[personality]
personality = "是一个大二女大学生，现在正在上网和群友聊天。包容且善良"
reply_style = "你的风格平淡简短。可以参考贴吧，知乎的回复风格。不浮夸不过分修辞，不使用复杂句。只回复简短的内容就好。\\n（禁止生成固定化、模板化的怼人、威胁或玩梗句式...）"
multiple_reply_style = [
  "如果有人对你有敌意，或者很无聊的玩笑，尝试讽刺并且之后不会理他了，十分无语",
  "用1-2个字进行回复",
  "用1-2个符号进行回复",
  "言辭凝練古雅，穿插《論語》經句卻不晦澀...",
  "你的风格平淡简短。你很慵懒，打算随便回几句应付一下...",
]

[chat]
group_chat_prompt = "你正在qq群里聊天..."
private_chat_prompts = "你正在聊天..."

必须只输出一个 JSON 对象，不要 Markdown，不要代码块，不要额外解释。JSON 结构如下：
{
  "personality": "对应 [personality].personality。使用第二人称描述稳定人格、身份和长期特质，建议 80-220 字，不要写成小说设定。",
  "reply_style": "对应 [personality].reply_style。描述麦麦说话方式、回复长度、语气、互动习惯和禁用表达。",
  "multiple_reply_style": ["可选备用表达风格，每项一段，最多 5 项"],
  "group_chat_prompt": "对应 [chat].group_chat_prompt。只写群聊场景规则，不要重复人格设定。",
  "private_chat_prompts": "对应 [chat].private_chat_prompts。只写私聊场景规则，不要重复人格设定。",
  "chat_prompts": [
    {"platform": "", "item_id": "", "rule_type": "group", "prompt": "..."}
  ],
  "notes": ["需要人工检查或迁移到配置时注意的事项"]
}

生成要求：
1. 输出要适合聊天型 bot，像真实聊天参与者，不要像客服、旁白、小说角色卡或系统公告。
2. personality 放稳定身份与人格；reply_style 放表达风格和边界；chat prompt 放聊天场景规则。不要三处重复同一段话。
3. 除非特别提到，reply_style 和 multiple_reply_style 最好不要是特别具体的句式，而是描述性的风格要求，方便覆盖不同话题和场景的回复。
4. 默认回复应日常、自然、不过度展开；可以保留原文中的鲜明风格，但要改成可维护的配置文字。
5. 如果信息不足，请根据原文谨慎补全通用聊天规则，并在 notes 中说明需要人工确认，不要反问用户。
6. 字段值必须都是字符串、字符串数组或对象数组，不能为 null。

额外要求：
{extra_requirements}

用户原文：
{source_text}`;

export function getDefaultPrompt(language: string): string {
  // English and Japanese versions are placeholder translations; users should verify
  if (language === "English") {
    return DEFAULT_PROMPT_ZH; // Will be translated by user in PromptEditor
  }
  if (language === "日本語") {
    return DEFAULT_PROMPT_ZH; // Will be translated by user in PromptEditor
  }
  return DEFAULT_PROMPT_ZH;
}

function sceneLabel(scene: string): string {
  switch (scene) {
    case "group": return "群聊";
    case "private": return "私聊";
    case "both": return "群聊和私聊";
    default: return scene;
  }
}

export function buildPromptInstruction(
  targetScene: string,
  language: string,
  extraRequirements: string,
  customTemplate?: string,
): string {
  const template = customTemplate || DEFAULT_PROMPT_ZH;
  let result = template
    .replace("{target_scene}", sceneLabel(targetScene))
    .replace("{language}", language)
    .replace("{extra_requirements}", extraRequirements || "无")
    .replace("{source_text}", "REPLACE_ME");
  return result;
}
```

- [ ] **Step 4: Run tests (expected: 5 pass + 1 snapshot written)**

```bash
npx vitest run __tests__/prompt.test.ts --update
# Expected: 5 PASS
npx vitest run __tests__/prompt.test.ts
# Expected: 5 PASS
```

---

### Task 7: Normalizer (TDD)

**Files:**
- Create: `__tests__/normalizer.test.ts`, `src/lib/normalizer.ts`

- [ ] **Step 1: Write tests**

```typescript
import { describe, it, expect } from "vitest";
import { normalizeResult, buildConfigBlocks, CONFIG_BLOCK_WHITELIST } from "@/lib/normalizer";
import type { ParsedResult, ConfigBlock } from "@/types";

const sampleParsed: ParsedResult = {
  personality: "你是一个活泼的二次元爱好者",
  reply_style: "风格简短有趣",
  multiple_reply_style: ["用表情包回复", "用颜文字回复"],
  group_chat_prompt: "在群里活跃发言",
  private_chat_prompts: "私聊时温柔体贴",
  chat_prompts: [
    { platform: "qq", item_id: "", rule_type: "group", prompt: "QQ群专属规则" },
  ],
  notes: ["需要人工确认第一条"],
};

describe("CONFIG_BLOCK_WHITELIST", () => {
  it("contains all 6 expected fields", () => {
    expect(CONFIG_BLOCK_WHITELIST).toEqual([
      "personality.personality",
      "personality.reply_style",
      "personality.multiple_reply_style",
      "chat.group_chat_prompt",
      "chat.private_chat_prompts",
      "chat.chat_prompts",
    ]);
  });
});

describe("normalizeResult", () => {
  it("passes through valid data unchanged", () => {
    const result = normalizeResult(sampleParsed);
    expect(result).toEqual(sampleParsed);
  });

  it("ensures multiple_reply_style is array", () => {
    const input = { ...sampleParsed, multiple_reply_style: "single string" as unknown as string[] };
    const result = normalizeResult(input);
    expect(Array.isArray(result.multiple_reply_style)).toBe(true);
  });

  it("trims whitespace from string fields", () => {
    const input = { ...sampleParsed, personality: "  带空格  " };
    const result = normalizeResult(input);
    expect(result.personality).toBe("带空格");
  });

  it("caps multiple_reply_style to 5 items", () => {
    const input = {
      ...sampleParsed,
      multiple_reply_style: ["1", "2", "3", "4", "5", "6", "7"],
    };
    const result = normalizeResult(input);
    expect(result.multiple_reply_style).toHaveLength(5);
  });
});

describe("buildConfigBlocks", () => {
  it("builds 6 config blocks from valid parsed result", () => {
    const blocks = buildConfigBlocks(sampleParsed);
    expect(blocks).toHaveLength(6);
    const ids = blocks.map((b) => b.id);
    expect(ids).toContain("personality.personality");
    expect(ids).toContain("chat.chat_prompts");
  });

  it("each block has non-empty title and toml", () => {
    const blocks = buildConfigBlocks(sampleParsed);
    for (const block of blocks) {
      expect(block.title).toBeTruthy();
      expect(block.toml).toBeTruthy();
      expect(block.section).toBeTruthy();
      expect(block.field).toBeTruthy();
    }
  });

  it("block ids match whitelist", () => {
    const blocks = buildConfigBlocks(sampleParsed);
    for (const block of blocks) {
      expect(CONFIG_BLOCK_WHITELIST).toContain(block.id);
    }
  });

  it("personality block toml starts with [personality]", () => {
    const blocks = buildConfigBlocks(sampleParsed);
    const personalityBlock = blocks.find((b) => b.id === "personality.personality");
    expect(personalityBlock).toBeDefined();
    // Each block's toml should be a valid standalone TOML snippet
    expect(personalityBlock!.section).toBe("personality");
    expect(personalityBlock!.field).toBe("personality");
  });
});
```

- [ ] **Step 2: Run tests (expected: fail)**

```bash
npx vitest run __tests__/normalizer.test.ts
```

- [ ] **Step 3: Implement normalizer**

```typescript
import type { ParsedResult, ConfigBlock } from "@/types";

export const CONFIG_BLOCK_WHITELIST = [
  "personality.personality",
  "personality.reply_style",
  "personality.multiple_reply_style",
  "chat.group_chat_prompt",
  "chat.private_chat_prompts",
  "chat.chat_prompts",
];

const BLOCK_META: Record<string, { section: string; field: string; title: string; description: string }> = {
  "personality.personality": { section: "personality", field: "personality", title: "人格设定", description: "稳定人格与身份描述" },
  "personality.reply_style": { section: "personality", field: "reply_style", title: "表达风格", description: "说话方式、回复长度、语气" },
  "personality.multiple_reply_style": { section: "personality", field: "multiple_reply_style", title: "备用表达风格", description: "可选风格池，最多 5 项" },
  "chat.group_chat_prompt": { section: "chat", field: "group_chat_prompt", title: "群聊提示词", description: "群聊场景规则" },
  "chat.private_chat_prompts": { section: "chat", field: "private_chat_prompts", title: "私聊提示词", description: "私聊场景规则" },
  "chat.chat_prompts": { section: "chat", field: "chat_prompts", title: "额外聊天流 Prompt", description: "平台专属规则" },
};

export function normalizeResult(raw: Record<string, unknown>): ParsedResult {
  const personality = String(raw.personality ?? "").trim();
  const reply_style = String(raw.reply_style ?? "").trim();
  const multiple_reply_style = normalizeStringArray(raw.multiple_reply_style).slice(0, 5);
  const group_chat_prompt = String(raw.group_chat_prompt ?? "").trim();
  const private_chat_prompts = String(raw.private_chat_prompts ?? "").trim();
  const chat_prompts = normalizeChatPrompts(raw.chat_prompts);
  const notes = normalizeStringArray(raw.notes);

  return {
    personality,
    reply_style,
    multiple_reply_style,
    group_chat_prompt,
    private_chat_prompts,
    chat_prompts,
    notes,
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return [value.trim()].filter(Boolean);
  }
  return [];
}

function normalizeChatPrompts(value: unknown): ParsedResult["chat_prompts"] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    platform: String(item.platform ?? ""),
    item_id: String(item.item_id ?? ""),
    rule_type: item.rule_type === "private" ? "private" : "group",
    prompt: String(item.prompt ?? "").trim(),
  }));
}

export function buildConfigBlocks(parsed: ParsedResult): ConfigBlock[] {
  const blocks: ConfigBlock[] = [];
  const values: Record<string, unknown> = {
    "personality.personality": parsed.personality,
    "personality.reply_style": parsed.reply_style,
    "personality.multiple_reply_style": parsed.multiple_reply_style,
    "chat.group_chat_prompt": parsed.group_chat_prompt,
    "chat.private_chat_prompts": parsed.private_chat_prompts,
    "chat.chat_prompts": parsed.chat_prompts,
  };

  for (const id of CONFIG_BLOCK_WHITELIST) {
    const meta = BLOCK_META[id];
    if (!meta) continue;
    const value = values[id];
    const toml = blockToToml(meta.section, meta.field, value);
    blocks.push({
      id,
      section: meta.section,
      field: meta.field,
      title: meta.title,
      description: meta.description,
      value: value as ConfigBlock["value"],
      toml,
    });
  }

  return blocks;
}

function blockToToml(section: string, field: string, value: unknown): string {
  const valStr = tomlValueString(value);
  return `[${section}]\n${field} = ${valStr}`;
}

function tomlValueString(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value); // JSON string escaping is TOML-compatible for basic strings
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (typeof value[0] === "object" && value[0] !== null) {
      // Array of tables — each item is a [[section.field]] block
      const items = value.map(
        (item) => `[[${"chat"}.${"chat_prompts"}]]\n${Object.entries(item as Record<string, unknown>)
          .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
          .join("\n")}`
      );
      return items.join("\n\n");
    }
    return "[\n  " + value.map((v) => JSON.stringify(v)).join(",\n  ") + "\n]";
  }
  return JSON.stringify(value);
}
```

- [ ] **Step 4: Run tests (expected: pass)**

```bash
npx vitest run __tests__/normalizer.test.ts
# Expected: 9 PASS
```

---

### Task 8: TOML Generator

**Files:**
- Create: `src/lib/toml.ts`

- [ ] **Step 1: Implement TOML generation**

```typescript
import type { ParsedResult } from "@/types";

export function generateToml(parsed: ParsedResult): string {
  const lines: string[] = [];

  // [personality] section
  lines.push("[personality]");
  lines.push(`personality = ${escapeBasicString(parsed.personality)}`);
  lines.push(`reply_style = ${escapeBasicString(parsed.reply_style)}`);

  if (parsed.multiple_reply_style.length > 0) {
    lines.push("multiple_reply_style = [");
    for (const style of parsed.multiple_reply_style) {
      lines.push(`  ${escapeBasicString(style)},`);
    }
    lines.push("]");
  } else {
    lines.push("multiple_reply_style = []");
  }

  lines.push("");

  // [chat] section
  lines.push("[chat]");
  lines.push(`group_chat_prompt = ${escapeBasicString(parsed.group_chat_prompt)}`);
  lines.push(`private_chat_prompts = ${escapeBasicString(parsed.private_chat_prompts)}`);

  // [[chat.chat_prompts]] array of tables
  for (const cp of parsed.chat_prompts) {
    lines.push("");
    lines.push("[[chat.chat_prompts]]");
    lines.push(`platform = ${escapeBasicString(cp.platform)}`);
    lines.push(`item_id = ${escapeBasicString(cp.item_id)}`);
    lines.push(`rule_type = ${escapeBasicString(cp.rule_type)}`);
    lines.push(`prompt = ${escapeBasicString(cp.prompt)}`);
  }

  lines.push("");
  return lines.join("\n");
}

function escapeBasicString(s: string): string {
  // TOML basic string: backslash-escape ", \, and control chars
  return '"' + s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t") + '"';
}
```

- [ ] **Step 2: Quick verify output is valid TOML**

```bash
npx tsx -e "
import { generateToml } from './src/lib/toml';
import { stringify } from 'smol-toml';

const sample = {
  personality: '你是一个活泼的二次元爱好者',
  reply_style: '风格简短有趣',
  multiple_reply_style: ['用表情包回复', '用颜文字回复'],
  group_chat_prompt: '在群里活跃发言',
  private_chat_prompts: '私聊时温柔体贴',
  chat_prompts: [{ platform: 'qq', item_id: '', rule_type: 'group', prompt: 'QQ群专属规则' }],
  notes: ['需要确认'],
};

const toml = generateToml(sample);
console.log(toml);
// Verify it round-trips correctly
// Note: TOML spec compliance — our output uses standard TOML
"
```

---

### Task 9: LLM Adapters

**Files:**
- Create: `src/lib/llm/openai.ts`, `src/lib/llm/anthropic.ts`, `src/lib/llm/index.ts`

- [ ] **Step 1: Create OpenAI adapter**

```typescript
import OpenAI from "openai";
import type { GenerateRequest } from "@/types";

export async function callOpenAI(
  endpoint: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  request: GenerateRequest,
  onToken?: (token: string) => void,
): Promise<string> {
  const client = new OpenAI({ baseURL: endpoint, apiKey });

  if (request.stream) {
    const stream = await client.chat.completions.create({
      model,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.sourceText },
      ],
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        onToken?.(delta);
      }
    }
    return fullResponse;
  } else {
    const completion = await client.chat.completions.create({
      model,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.sourceText },
      ],
    });
    return completion.choices[0]?.message?.content ?? "";
  }
}
```

- [ ] **Step 2: Create Anthropic adapter**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { GenerateRequest } from "@/types";

export async function callAnthropic(
  endpoint: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  request: GenerateRequest,
  onToken?: (token: string) => void,
): Promise<string> {
  const client = new Anthropic({ baseURL: endpoint, apiKey });

  if (request.stream) {
    const stream = await client.messages.stream({
      model,
      max_tokens: request.maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: request.sourceText }],
    });

    let fullResponse = "";
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        onToken?.(event.delta.text);
      }
    }
    return fullResponse;
  } else {
    const message = await client.messages.create({
      model,
      max_tokens: request.maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: request.sourceText }],
    });
    const block = message.content.find((b) => b.type === "text");
    return block?.type === "text" ? block.text : "";
  }
}
```

- [ ] **Step 3: Create LLM dispatcher**

```typescript
import type { GenerateRequest, ProviderConfig } from "@/types";
import { callOpenAI } from "./openai";
import { callAnthropic } from "./anthropic";
import { decrypt } from "../crypto";

export async function callLLM(
  provider: ProviderConfig,
  modelId: string,
  systemPrompt: string,
  request: GenerateRequest,
  onToken?: (token: string) => void,
): Promise<string> {
  const apiKey = decrypt(provider.apiKey);
  if (!apiKey) {
    throw new Error("API Key 未配置，请先在模型配置中填写 API Key");
  }

  const model = provider.models.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`模型 ${modelId} 未在提供商 ${provider.name} 中找到`);
  }

  switch (provider.type) {
    case "openai":
      return callOpenAI(provider.endpoint, apiKey, modelId, systemPrompt, request, onToken);
    case "anthropic":
      return callAnthropic(provider.endpoint, apiKey, modelId, systemPrompt, request, onToken);
    default:
      throw new Error(`不支持的提供商类型: ${provider.type}`);
  }
}
```

- [ ] **Step 4: Verify TypeScript compilation**

```bash
npx tsc --noEmit
# Expected: no new errors
```

---

### Task 10: API — Providers

**Files:**
- Create: `src/app/api/providers/route.ts`, `src/app/api/providers/[id]/route.ts`

- [ ] **Step 1: Create GET + POST providers route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { v4 as uuid } from "uuid";
import type { ProviderConfig, ProviderConfigPublic, ModelInfo } from "@/types";

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
    // Update existing
    const existing = db.prepare("SELECT id FROM providers WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "提供商不存在", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    db.transaction(() => {
      db.prepare("UPDATE providers SET name=?, type=?, endpoint=?, api_key=? WHERE id=?")
        .run(name, type, endpoint, encryptedKey, id);
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
    // Create new
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
```

- [ ] **Step 2: Create DELETE provider route**

```typescript
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
```

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev &
sleep 3

# List providers
curl -s http://localhost:3000/api/providers | python3 -m json.tool | head -20
# Expected: 4 providers

# Delete and re-add to test full flow
kill %1
```

---

### Task 11: API — Prompt Template

**Files:**
- Create: `src/app/api/prompt-template/route.ts`, `src/app/api/prompt-template/reset/route.ts`

- [ ] **Step 1: Create prompt-template GET + PUT**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { DEFAULT_PROMPT_ZH } from "@/lib/prompt";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") || "zh";
  const db = getDb();

  const row = db.prepare("SELECT template, updated_at FROM prompt_template WHERE language = ?").get(lang) as
    { template: string; updated_at: string } | undefined;

  if (row) {
    return NextResponse.json({ success: true, data: { language: lang, template: row.template, updatedAt: row.updated_at } });
  }

  const defaults: Record<string, string> = { zh: DEFAULT_PROMPT_ZH, en: DEFAULT_PROMPT_ZH, ja: DEFAULT_PROMPT_ZH };
  return NextResponse.json({
    success: true,
    data: { language: lang, template: defaults[lang] || DEFAULT_PROMPT_ZH, updatedAt: null },
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
```

- [ ] **Step 2: Create reset route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { DEFAULT_PROMPT_ZH } from "@/lib/prompt";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const language = body.language; // undefined means reset all

  const db = getDb();
  const defaults: Record<string, string> = { zh: DEFAULT_PROMPT_ZH, en: DEFAULT_PROMPT_ZH, ja: DEFAULT_PROMPT_ZH };

  if (language) {
    const defaultTemplate = defaults[language] || DEFAULT_PROMPT_ZH;
    db.prepare("DELETE FROM prompt_template WHERE language = ?").run(language);
    return NextResponse.json({ success: true, data: { language, reset: true, template: defaultTemplate } });
  }

  // Reset all
  db.prepare("DELETE FROM prompt_template").run();
  return NextResponse.json({ success: true, data: { reset: true } });
}
```

- [ ] **Step 3: Verify with curl**

```bash
curl -s "http://localhost:3000/api/prompt-template?lang=zh" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['data']['template'])>100)"
# Expected: True
```

---

### Task 12: API — Generate

**Files:**
- Create: `src/app/api/generate/route.ts`

- [ ] **Step 1: Create generate route (SSE + non-stream)**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { callLLM } from "@/lib/llm";
import { decrypt } from "@/lib/crypto";
import { buildPromptInstruction } from "@/lib/prompt";
import { extractJsonObject } from "@/lib/parser";
import { normalizeResult, buildConfigBlocks } from "@/lib/normalizer";
import { generateToml } from "@/lib/toml";
import { v4 as uuid } from "uuid";
import type { GenerateRequest, ProviderConfig } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json() as GenerateRequest;

  // Validation
  if (!body.providerId || !body.modelId || !body.sourceText) {
    return NextResponse.json(
      { success: false, error: "providerId, modelId, sourceText 为必填字段", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  if (body.sourceText.length > 20000) {
    return NextResponse.json(
      { success: false, error: "sourceText 不能超过 20000 字符", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  if ((body.extraRequirements ?? "").length > 4000) {
    return NextResponse.json(
      { success: false, error: "extraRequirements 不能超过 4000 字符", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Load provider
  const db = getDb();
  const providerRow = db.prepare(
    "SELECT id, name, type, endpoint, api_key FROM providers WHERE id = ?"
  ).get(body.providerId) as { id: string; name: string; type: "openai" | "anthropic"; endpoint: string; api_key: string } | undefined;

  if (!providerRow) {
    return NextResponse.json(
      { success: false, error: "提供商不存在", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const modelRows = db.prepare(
    "SELECT id, display_name FROM provider_models WHERE provider_id = ?"
  ).all(providerRow.id) as Array<{ id: string; display_name: string }>;

  const provider: ProviderConfig = {
    id: providerRow.id,
    name: providerRow.name,
    type: providerRow.type,
    endpoint: providerRow.endpoint,
    apiKey: providerRow.api_key,
    models: modelRows.map((m) => ({ id: m.id, displayName: m.display_name })),
    createdAt: "",
  };

  // Load prompt template
  const lang = body.language.startsWith("en") ? "en" : body.language.startsWith("ja") ? "ja" : "zh";
  const templateRow = db.prepare(
    "SELECT template FROM prompt_template WHERE language = ?"
  ).get(lang) as { template: string } | undefined;

  const systemPrompt = buildPromptInstruction(
    body.targetScene,
    body.language,
    body.extraRequirements ?? "",
    templateRow?.template,
  ).replace("{source_text}", body.sourceText);

  const stream = body.stream !== false;

  if (stream) {
    // SSE streaming response
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = "";
          const onToken = (token: string) => {
            controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify({ text: token })}\n\n`));
          };

          try {
            fullResponse = await callLLM(provider, body.modelId, systemPrompt, body, onToken);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "LLM 调用失败";
            let code = "LLM_ERROR";
            if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("API Key")) {
              code = "INVALID_API_KEY";
            } else if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
              code = "LLM_TIMEOUT";
            } else if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
              code = "NETWORK_ERROR";
            }
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: msg, code })}\n\n`));
            controller.close();
            return;
          }

          // Parse and save
          try {
            const parsedRaw = extractJsonObject(fullResponse);
            const parsed = normalizeResult(parsedRaw);
            const blocks = buildConfigBlocks(parsed);
            const toml = generateToml(parsed);
            const resultId = uuid();
            const createdAt = new Date().toISOString();

            db.prepare(
              "INSERT INTO generate_history (id, provider_id, model_id, request_json, result_json, toml_output, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
            ).run(resultId, provider.id, body.modelId, JSON.stringify(body), JSON.stringify({ parsed, blocks, toml, rawResponse: fullResponse }), toml, createdAt);

            const result = {
              id: resultId,
              parsed,
              blocks,
              toml,
              rawResponse: fullResponse,
              createdAt,
            };

            controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(result)}\n\n`));
          } catch (parseErr) {
            const msg = parseErr instanceof Error ? parseErr.message : "JSON 解析失败";
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: msg, code: "PARSE_FAILED", rawResponse: fullResponse })}\n\n`));
          }
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "内部错误", code: "INTERNAL_ERROR" })}\n\n`));
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Non-streaming response
  try {
    const fullResponse = await callLLM(provider, body.modelId, systemPrompt, body);
    const parsedRaw = extractJsonObject(fullResponse);
    const parsed = normalizeResult(parsedRaw);
    const blocks = buildConfigBlocks(parsed);
    const toml = generateToml(parsed);
    const resultId = uuid();
    const createdAt = new Date().toISOString();

    db.prepare(
      "INSERT INTO generate_history (id, provider_id, model_id, request_json, result_json, toml_output, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(resultId, provider.id, body.modelId, JSON.stringify(body), JSON.stringify({ parsed, blocks, toml, rawResponse: fullResponse }), toml, createdAt);

    return NextResponse.json({
      success: true,
      data: { id: resultId, parsed, blocks, toml, rawResponse: fullResponse, createdAt },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "生成失败";
    let code = "LLM_ERROR";
    let status = 502;
    if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("API Key")) {
      code = "INVALID_API_KEY";
    } else if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
      code = "LLM_TIMEOUT";
      status = 504;
    } else if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
      code = "NETWORK_ERROR";
      status = 503;
    } else if (msg.includes("JSON")) {
      code = "PARSE_FAILED";
    }
    return NextResponse.json({ success: false, error: msg, code }, { status });
  }
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

---

### Task 13: API — History + Export

**Files:**
- Create: `src/app/api/history/route.ts`, `src/app/api/history/[id]/route.ts`, `src/app/api/export/toml/route.ts`

- [ ] **Step 1: Create history list route (cursor pagination)**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { HistoryItem } from "@/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const db = getDb();

  let rows: Array<{
    id: string; provider_id: string | null; model_id: string | null;
    request_json: string; result_json: string; toml_output: string; created_at: string;
  }>;

  if (cursor) {
    rows = db.prepare(
      "SELECT id, provider_id, model_id, request_json, result_json, toml_output, created_at FROM generate_history WHERE id < ? ORDER BY id DESC LIMIT ?"
    ).all(cursor, limit + 1) as typeof rows;
  } else {
    rows = db.prepare(
      "SELECT id, provider_id, model_id, request_json, result_json, toml_output, created_at FROM generate_history ORDER BY id DESC LIMIT ?"
    ).all(limit + 1) as typeof rows;
  }

  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();

  const items: HistoryItem[] = rows.map((row) => ({
    id: row.id,
    providerId: row.provider_id,
    modelId: row.model_id,
    requestJson: JSON.parse(row.request_json),
    resultJson: JSON.parse(row.result_json),
    createdAt: row.created_at,
  }));

  return NextResponse.json({
    success: true,
    data: {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    },
  });
}
```

- [ ] **Step 2: Create history single route (GET + DELETE)**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare(
    "SELECT id, provider_id, model_id, request_json, result_json, toml_output, created_at FROM generate_history WHERE id = ?"
  ).get(id) as { id: string; provider_id: string; model_id: string; request_json: string; result_json: string; toml_output: string; created_at: string } | undefined;

  if (!row) {
    return NextResponse.json(
      { success: false, error: "记录不存在", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: row.id,
      providerId: row.provider_id,
      modelId: row.model_id,
      requestJson: JSON.parse(row.request_json),
      resultJson: JSON.parse(row.result_json),
      createdAt: row.created_at,
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM generate_history WHERE id = ?").run(id);
  return NextResponse.json({ success: true, data: { deleted: id } });
}
```

- [ ] **Step 3: Create TOML export route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const historyId = searchParams.get("historyId");

  if (!historyId) {
    return NextResponse.json(
      { success: false, error: "historyId 查询参数为必填", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const db = getDb();
  const row = db.prepare(
    "SELECT toml_output FROM generate_history WHERE id = ?"
  ).get(historyId) as { toml_output: string } | undefined;

  if (!row) {
    return NextResponse.json(
      { success: false, error: "记录不存在", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return new NextResponse(row.toml_output, {
    headers: {
      "Content-Type": "application/toml",
      "Content-Disposition": 'attachment; filename="bot_config.toml"',
    },
  });
}
```

---

### Task 14: Rate Limiting

**Files:**
- Create: `src/lib/rate-limit.ts`
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Create in-memory rate limiter**

```typescript
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

interface BucketEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = buckets.get(ip);

  if (!entry || now > entry.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}
```

- [ ] **Step 2: Add rate limit check to generate route**

Add at the top of the `POST` handler in `src/app/api/generate/route.ts` (after the function declaration):

```typescript
// Rate limit
const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  || request.headers.get("x-real-ip")
  || "127.0.0.1";
const { allowed, retryAfter } = checkRateLimit(ip);
if (!allowed) {
  return NextResponse.json(
    { success: false, error: `请求过于频繁，请 ${retryAfter} 秒后重试`, code: "RATE_LIMITED" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
```

---

### Task 15: i18n Files

**Files:**
- Create: `src/i18n/zh.json`, `src/i18n/en.json`, `src/i18n/ja.json`, `src/lib/i18n.ts`

- [ ] **Step 1: Create i18n context hook and translation files**

Create `src/i18n/zh.json`:

```json
{
  "title": "人格生成器",
  "modelConfig": "模型配置",
  "provider": "提供商",
  "model": "模型",
  "sourceText": "源文本",
  "extraRequirements": "额外要求",
  "targetScene": "目标场景",
  "group": "群聊",
  "private": "私聊",
  "both": "群聊和私聊",
  "language": "生成语言",
  "temperature": "温度",
  "maxTokens": "最大 Token",
  "generate": "生成",
  "generating": "生成中...",
  "configBlocks": "配置块",
  "fullToml": "完整 TOML",
  "rawOutput": "原始输出",
  "copy": "复制",
  "copyAll": "全部复制",
  "copied": "已复制",
  "exportToml": "导出 bot_config.toml",
  "history": "历史记录",
  "delete": "删除",
  "retry": "重试",
  "resetDefault": "恢复默认",
  "advancedSettings": "高级设置",
  "editPrompt": "编辑提示词模板",
  "promptResetConfirm": "确认恢复默认提示词？当前修改将丢失。",
  "addProvider": "添加提供商",
  "editProvider": "编辑提供商",
  "saveProvider": "保存",
  "apiKey": "API Key",
  "endpoint": "端点 URL",
  "providerName": "提供商名称",
  "providerType": "提供商类型",
  "addModel": "添加模型",
  "modelId": "模型 ID",
  "modelDisplayName": "模型显示名",
  "noResults": "暂无生成记录",
  "noteEnJa": "English 和 日本語 的提示词模板为机器翻译，建议人工验证后再使用。",
  "deleteConfirm": "确认删除？",
  "configNote": "以下配置块可直接复制到 maimaibot 的 bot_config.toml 中使用。"
}
```

Create `src/i18n/en.json` and `src/i18n/ja.json` with the same keys translated.

Create `src/lib/i18n.ts`:

```typescript
"use client";
import { createContext, useContext } from "react";
import zh from "@/i18n/zh.json";

export type Locale = "zh" | "en" | "ja";

type TranslationMap = typeof zh;
type TranslationKey = keyof TranslationMap;

export function loadTranslations(locale: Locale): TranslationMap {
  switch (locale) {
    case "en": return require("@/i18n/en.json") as TranslationMap;
    case "ja": return require("@/i18n/ja.json") as TranslationMap;
    default: return zh;
  }
}

export const I18nContext = createContext<{ t: TranslationMap; locale: Locale; setLocale: (l: Locale) => void }>({
  t: zh,
  locale: "zh",
  setLocale: () => {},
});

export function useI18n() {
  return useContext(I18nContext);
}
```

- [ ] **Step 2: Create English translation**

Create `src/i18n/en.json` with all keys translated to English.

- [ ] **Step 3: Create Japanese translation**

Create `src/i18n/ja.json` with all keys translated to Japanese.

---

### Task 16: Frontend Components

**Files:**
- Create: `src/components/ProviderManager.tsx`, `src/components/ModelSelector.tsx`, `src/components/GeneratorForm.tsx`
- Create: `src/components/ResultTabs.tsx`, `src/components/ConfigBlockCard.tsx`
- Create: `src/components/PromptEditor.tsx`, `src/components/HistoryPanel.tsx`

- [ ] **Step 1: Create ProviderManager component (modal for CRUD)**

Client component that renders a modal dialog with:
- Provider list showing name, type badge, endpoint
- Add/Edit form: name, type (select), endpoint, API key (password input), models list (add/remove rows with id + displayName)
- Delete button with confirmation
- Fetch providers from `GET /api/providers`, save via `POST /api/providers`
- API key field shows placeholder "••••••" when editing existing (key not returned from API)

- [ ] **Step 2: Create ModelSelector component (provider → model cascade dropdown)**

Two `<select>` elements:
1. Provider selector: fetches `GET /api/providers`, shows provider.name for each
2. Model selector: updates when provider changes, shows provider.models
Has a gear icon button to open ProviderManager modal.
Exposes selected `{ providerId, modelId }` via callback.

- [ ] **Step 3: Create GeneratorForm component**

Form with:
- ModelSelector at top
- sourceText `<textarea>` (maxLength 20000, char counter)
- targetScene `<select>` (group/private/both)
- language `<select>` (简体中文/English/日本語)
- extraRequirements `<textarea>` (maxLength 4000)
- temperature `<input type="range" min="0" max="2" step="0.1">` + display value
- maxTokens `<input type="number" min="256" max="8192" step="256">`
- Generate button (disabled when sourceText is empty or generating)

- [ ] **Step 4: Create ConfigBlockCard component**

Single config block card:
- Title + field path (e.g., "人格设定 — personality.personality")
- TOML preview in `<pre>` block
- "复制" button (copies toml to clipboard, shows "已复制" for 2s)

- [ ] **Step 5: Create ResultTabs component**

Three tabs: 配置块 / 完整 TOML / 原始输出
- Tab 1: renders ConfigBlockCard for each block in results.blocks
- Tab 2: `<pre>` with results.toml + copy button
- Tab 3: `<pre>` with results.rawResponse
- Bottom bar: "全部复制" + "导出 bot_config.toml" (links to `/api/export/toml?historyId=`)
- Error state: show error message + "重试" button

- [ ] **Step 6: Create PromptEditor component**

Collapsible "高级设置" section with:
- Language tabs (zh/en/ja)
- `<textarea>` showing the current template for selected language
- "恢复默认" button with confirmation dialog
- "保存" button
- Warning note for en/ja translations

- [ ] **Step 7: Create HistoryPanel component**

Slide-out right panel:
- Toggle button in header bar: "历史记录"
- Overlay + sliding panel
- List of history items: truncated source text + provider/model name + time
- Click to load into ResultTabs
- Delete button per item

---

### Task 17: Main Page Assembly

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Update layout to include I18nProvider**

Create a client wrapper that provides `I18nContext` with state for current locale. Store locale in localStorage.

- [ ] **Step 2: Create main page**

Client component (`"use client"`) that composes all components:
- State: `results: GenerateResponse | null`, `error: string | null`, `loading: boolean`, `streamingText: string`
- handleGenerate: uses EventSource for SSE stream, updates streamingText on `token` events, sets results on `done`, sets error on `error`
- On `done`, stores current result and historyId for export
- Passes i18n `t` to all children

Layout:
```
Header (title + lang switch + history toggle)
ModelSelector + gear button
GeneratorForm
[PromptEditor collapsible]
---
ResultTabs (when results exist)
HistoryPanel (when open)
```

- [ ] **Step 3: Write globals.css**

Minimal CSS: CSS custom properties for colors, basic layout utilities, form styling, tab styling, modal overlay, slide-out panel. Dark-capable but defaults to light. Responsive max-width container. Monospace for code/pre blocks.

- [ ] **Step 4: Verify full page renders (no data flow yet)**

```bash
npm run dev &
sleep 3
curl -s http://localhost:3000 | grep -o "人格生成器"
# Expected: "人格生成器"
kill %1
```

---

### Task 18: Integration Tests

**Files:**
- Create: `__tests__/api/generate.test.ts`, `__tests__/api/providers.test.ts`, `__tests__/api/history.test.ts`

- [ ] **Step 1: Write providers API test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Use Next.js test helpers or mock the request/response
// Test: GET returns 4 seeded providers
// Test: POST creates new provider
// Test: POST with id updates existing provider
// Test: DELETE removes provider
// Test: POST with invalid type returns 400
```

- [ ] **Step 2: Write generate API test (mock LLM)**

Mock `callLLM` to return a known JSON response. Test:
- Valid request returns parsed result, blocks, TOML
- Streaming SSE returns correct events
- Invalid providerId returns 404
- Empty sourceText returns 400
- JSON parse failure returns error with raw response

- [ ] **Step 3: Write history API test**

Test:
- GET returns cursor-paginated list
- GET with cursor returns next page
- GET/:id returns single item
- DELETE/:id removes item
- Export endpoint returns TOML file

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
# Expected: all tests pass
```

---

### Task 19: Docker + start.sh

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `start.sh`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM node:22-alpine

RUN apk add --no-cache python3 make g++ build-base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

EXPOSE 3000
VOLUME ["/app/data"]

CMD ["npm", "start"]
```

- [ ] **Step 2: Create docker-compose.yml**

```yaml
services:
  person-summon:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ENCRYPTION_KEY=${ENCRYPTION_KEY:-change-me-in-production}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

- [ ] **Step 3: Create start.sh**

```bash
#!/bin/bash
set -e

echo "=== person-summon 启动脚本 ==="

# 1. Check Node.js
if ! command -v node &> /dev/null; then
  echo "错误: 未检测到 Node.js。请安装 Node.js >= 20"
  echo "  安装指引: https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "错误: Node.js 版本过低 (当前: $(node -v))。需要 >= 20"
  exit 1
fi
echo "✓ Node.js $(node -v)"

# 2. Check npm
if ! command -v npm &> /dev/null; then
  echo "错误: 未检测到 npm"
  exit 1
fi
echo "✓ npm $(npm -v)"

# 3. Check port 3000
if ss -tlnp 2>/dev/null | grep -q ":3000 "; then
  echo "错误: 端口 3000 已被占用"
  echo "  占用进程: $(ss -tlnp 2>/dev/null | grep ':3000 ')"
  exit 1
fi
echo "✓ 端口 3000 可用"

# 4. Check disk space (>100MB in current dir)
DISK_SPACE=$(df -BM . | tail -1 | awk '{print $4}' | sed 's/M//')
if [ "$DISK_SPACE" -lt 100 ]; then
  echo "错误: 磁盘空间不足 (当前可用: ${DISK_SPACE}MB, 需要 >= 100MB)"
  exit 1
fi
echo "✓ 磁盘空间充足 (${DISK_SPACE}MB)"

# 5. Generate ENCRYPTION_KEY if not set
if [ -z "$ENCRYPTION_KEY" ]; then
  ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  export ENCRYPTION_KEY
  echo "✓ 已生成 ENCRYPTION_KEY"
fi

# 6. Create data directory
mkdir -p data

# 7. Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "→ 安装依赖..."
  npm install
fi

# 8. Build
echo "→ 构建项目..."
npm run build

# 9. Start
echo "→ 启动服务..."
echo ""
echo "  人格生成器已启动: http://localhost:3000"
echo ""
npm start
```

- [ ] **Step 4: Make start.sh executable and test**

```bash
chmod +x start.sh
# Verify syntax
bash -n start.sh
# Expected: no output (syntax OK)
```

---

### Task 20: Final Polish

**Files:**
- Modify: `.gitignore`, `README.md`
- Create: (none)

- [ ] **Step 1: Update .gitignore**

```
node_modules/
.next/
data/*
!data/.gitkeep
.env
.env.local
*.tsbuildinfo
```

- [ ] **Step 2: Update README.md**

Replace the existing README.md with:
- Project overview (what person-summon is)
- Quick start (clone, npm install, ENCRYPTION_KEY=xxx npm run dev)
- Docker deployment
- start.sh usage
- API documentation (endpoint list)
- Link to design spec

- [ ] **Step 3: Final type check and build**

```bash
npx tsc --noEmit
npm run build
# Expected: no errors, successful Next.js build
```

- [ ] **Step 4: Final test run**

```bash
npx vitest run
# Expected: all tests pass
```

---

## Dependency Graph

```
Task 1 (Scaffold)
 ├─ Task 2 (Types)
 │    ├─ Task 5 (Parser TDD)
 │    ├─ Task 7 (Normalizer TDD)
 │    ├─ Task 8 (TOML Generator)
 │    └─ Task 16 (Frontend Components)
 ├─ Task 4 (Crypto)
 │    └─ Task 9 (LLM Adapters)
 ├─ Task 3 (DB + Seed)
 │    ├─ Task 9 (LLM Adapters)
 │    ├─ Task 10 (API Providers)
 │    ├─ Task 11 (API Prompt Template)
 │    ├─ Task 12 (API Generate) ← depends on 5,6,7,8,9,10
 │    └─ Task 13 (API History/Export) ← depends on 3
 ├─ Task 6 (Prompt TDD)
 │    └─ Task 12 (API Generate)
 ├─ Task 14 (Rate Limit)
 │    └─ Task 12 (API Generate)
 ├─ Task 15 (i18n)
 │    └─ Task 17 (Main Page)
 ├─ Task 17 (Main Page) ← depends on 16
 ├─ Task 18 (Integration Tests) ← depends on 12,13
 ├─ Task 19 (Docker/start.sh)
 └─ Task 20 (Final Polish)
```
