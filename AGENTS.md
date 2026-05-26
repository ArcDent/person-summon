# AGENTS.md — person-summon

## 项目身份
- **类型**: Next.js 15 全栈 Web 应用
- **目标**: 为 maimaibot 生成 bot 人格配置（Persona Generator）
- **技术栈**: Next.js 15, TypeScript, React 19, better-sqlite3, vitest, OpenAI/Anthropic SDK, TOML

## 项目静态结构
            └── generate/
                └── route.ts                   # POST 生成人格配置（SSE 流式 + 非流式）
            ├── history/
            │   ├── route.ts                   # GET 历史记录列表（cursor 分页，默认 20 条/最多 50 条）
            │   └── [id]/
            │       └── route.ts               # GET 单条历史详情 + DELETE 删除
            └── export/
                └── toml/
                    └── route.ts               # GET 按 historyId 导出 TOML 文件（Content-Disposition 下载）
```
person-summon/
├── README.md                 # 项目主文档
├── AGENTS.md                 # AI 会话交接文件
├── package.json              # npm 依赖与脚本
├── tsconfig.json             # TypeScript 配置
├── next.config.ts            # Next.js 配置（CSP headers, serverExternalPackages）
├── vitest.config.ts          # Vitest 测试配置
├── .gitignore                # Git 忽略规则
├── .clinerules-*             # Cline AI 助手模式规则（5 个）
├── .claude/                  # Claude Code 项目配置
├── docs/                     # 项目文档
├── data/                     # SQLite 数据库文件（运行时数据，不提交）
└── src/
    ├── lib/
    │   ├── db.ts             # SQLite 数据库层（初始化/迁移/种子数据）
    │   ├── crypto.ts         # AES-256-GCM 加密解密模块
    │   ├── parser.ts         # JSON 提取解析（markdown 剥离 + 回退）
    │   ├── prompt.ts         # 提示词模板（MaiMai 兼容默认模板）
    │   ├── normalizer.ts     # 解析结果规范化 + 配置块构建器（TOML 序列化）
    │   ├── toml.ts           # TOML 生成器（ParsedResult → bot_config.toml）
    │   ├── rate-limit.ts     # 请求频率限制 stub（Task 14 完善）
    │   ├── llm/
    │   │   ├── index.ts      # LLM 分发器（callLLM: 解密 API key + 路由到 openai/anthropic）
    │   │   ├── openai.ts     # OpenAI SDK 适配器（callOpenAI: 流式/非流式）
    │   │   └── anthropic.ts  # Anthropic SDK 适配器（callAnthropic: 流式/非流式）
    ├── types/
    │   └── index.ts          # 所有共享 TypeScript 类型定义
    └── app/
        ├── layout.tsx                         # 根布局（中文 lang，metadata）
        ├── globals.css                        # 全局样式 + CSS 变量
        ├── api/
            ├── providers/
            │   ├── route.ts                   # GET 列表（不含 apiKey）+ POST upsert（create/update）
            │   └── [id]/
            │       └── route.ts               # DELETE 删除提供商
            ├── prompt-template/
                ├── route.ts                   # GET 查询模板 + PUT upsert 模板
                └── reset/
                    └── route.ts               # POST 重置模板（指定语言或全部）
            └── generate/
                └── route.ts                   # POST 生成人格配置（SSE 流式 + 非流式）
```

## 最近操作
- 2026-05-26: Task 1 — 项目脚手架：Next.js 15 + TypeScript + vitest，npm install 完成，dev server 验证通过
- 2026-05-26: Task 2 — 共享 TypeScript 类型定义：创建 `src/types/index.ts`，`npx tsc --noEmit` 编译通过
- 2026-05-26: Task 3 — SQLite 数据库层：创建 `src/lib/db.ts`，4 张表，种子数据 4 个 provider + 6 个 model
- 2026-05-26: Task 4 — Crypto Module：创建 `src/lib/crypto.ts`，AES-256-GCM 加解密，round-trip 验证通过
- 2026-05-26: Task 5 — Parser (TDD)：创建 `src/lib/parser.ts`，从 LLM 响应中提取 JSON 对象，支持 markdown 代码块剥离和首尾花括号回退提取，9/9 测试通过
- 2026-05-26: Task 6 — Prompt Template (TDD)：创建 `src/lib/prompt.ts`，MaiMai 兼容默认提示词模板（DEFAULT_PROMPT_ZH），支持 targetScene/language/extraRequirements 注入，6/6 测试通过
- 2026-05-26: Task 7 — Normalizer (TDD)：创建 `src/lib/normalizer.ts`，解析结果规范化（trim/类型补全/长度限制）+ 配置块构建器（白名单 + TOML 序列化），9/9 测试通过
- 2026-05-26: Task 8 — TOML Generator：创建 `src/lib/toml.ts`，ParsedResult → bot_config.toml，含 `[personality]`/`[chat]`/`[[chat.chat_prompts]]` 三区段，escapeBasicString 处理 TOML 基本字符串转义，冒烟测试通过
- 2026-05-26: Task 9 — LLM Adapters：创建 `src/lib/llm/`（openai.ts / anthropic.ts / index.ts），支持流式和非流式调用，callLLM 分发器解密 API key 并路由到对应 SDK 适配器，npx tsc --noEmit 编译通过
- 2026-05-26: Task 10 — API Providers：创建 `src/app/api/providers/route.ts`（GET 列表不含 apiKey + POST upsert 含加密）和 `[id]/route.ts`（DELETE），curl 冒烟测试 GET 返回 4 个种子提供商
- 2026-05-26: Task 11 — API Prompt Template：创建 `src/app/api/prompt-template/route.ts`（GET 查询/ PUT upsert）和 `reset/route.ts`（POST 重置），curl 测试 GET/PUT/reset 全部通过
- 2026-05-26: Task 12 — API Generate：创建 `src/app/api/generate/route.ts`（POST 生成人格配置），支持 SSE 流式和非流式输出，集成 rate-limit stub（Task 14 完善），创建 `src/lib/rate-limit.ts` stub，npx tsc --noEmit 编译通过
- 2026-05-26: Task 13 — API History + Export：创建 `src/app/api/history/route.ts`（GET cursor 分页）、`src/app/api/history/[id]/route.ts`（GET 详情 + DELETE 删除）、`src/app/api/export/toml/route.ts`（GET 按 historyId 导出 TOML 下载），npx tsc --noEmit 编译通过

## 进行中
- 无

## 下一步
- Task 14: Rate Limiting — 完善请求频率限制

## 关键发现
- better-sqlite3 不会自动创建父目录，需手动 `fs.mkdirSync` 确保 `data/` 存在
- busy_timeout=5000 可防止并发写入时的 SQLITE_BUSY 错误
- seed 的 COUNT 检查应放在事务内部以避免 TOCTOU 竞态条件
- WAL 模式 + foreign_keys ON 提升并发性能
- parser 采用三层策略：去 markdown 包裹 -> JSON.parse -> 首尾 {} 回退提取，与 Python 版 `_extract_json_object` 行为一致
- buildPromptInstruction 将 `{source_text}` 替换为 `REPLACE_ME`，调用方需替换 `REPLACE_ME` 而非 `{source_text}`，否则用户原文不会被注入到 prompt 中
