# person-summon 设计规范

## 概述

从 [Mai-with-u (麦麦)](https://github.com/Mai-with-u) 提取的人设生成器，重构为全栈独立可部署服务。
核心目标：生成可直接复制到 maimaibot 的提示词配置，输出格式全链路兼容麦麦（TOML + ParsedResult JSON + 配置块拆分方式 + 字段命名完全一致）。

## 技术栈

- **全栈框架**：Next.js 15 (App Router) + TypeScript，使用 Turbopack
- **数据库**：SQLite (better-sqlite3)，文件路径 `data/person-summon.db`
- **LLM 适配**：OpenAI API 兼容 (基于 `/v1/chat/completions`) + Anthropic 原生 API
- **国际化**：中/英/日三语（UI 文案三语；prompt 模板三语但非中文版本标注"建议人工验证"；前端语言选择器切换 UI 语言；生成时用户选择目标语言传给 LLM）
- **部署**：本地运行 + Docker + 一键脚本 (start.sh)
- **环境要求**：Node.js ≥ 20

## 架构

```
person-summon/
├── next.config.ts
├── package.json
├── tsconfig.json
├── data/.gitkeep              # SQLite 数据库 + .key 文件，gitignore 排除
├── src/
│   ├── app/
│   │   ├── layout.tsx         # 根布局（i18n provider）
│   │   ├── page.tsx           # 生成器主页
│   │   └── api/
│   │       ├── generate/
│   │       │   └── route.ts   # POST，调用 LLM（支持流式/非流式）
│   │       ├── history/
│   │       │   ├── route.ts   # GET 列表（游标分页）
│   │       │   └── [id]/
│   │       │       └── route.ts  # GET/DELETE 单条
│   │       ├── models/
│   │       │   ├── route.ts   # GET 列表 / POST 新增/更新
│   │       │   └── [id]/
│   │       │       └── route.ts  # DELETE 单个模型
│   │       └── export/
│   │           └── toml/
│   │               └── route.ts  # GET ?id= 下载 bot_config.toml
│   ├── lib/
│   │   ├── db.ts              # SQLite 封装 (better-sqlite3)
│   │   ├── crypto.ts          # AES-256-GCM 加密/解密
│   │   ├── llm/
│   │   │   ├── index.ts       # LLM 调度层（统一接口）
│   │   │   ├── openai.ts      # OpenAI 兼容适配器
│   │   │   └── anthropic.ts   # Anthropic 适配器
│   │   ├── prompt.ts          # 核心 prompt 构建（移植麦麦逻辑，可编辑+恢复默认）
│   │   ├── parser.ts          # JSON 解析（移植 _extract_json_object）
│   │   ├── normalizer.ts      # 结果标准化 + 配置块拆分
│   │   └── toml.ts            # TOML 生成工具
│   ├── components/
│   │   ├── GeneratorForm.tsx
│   │   ├── ResultTabs.tsx
│   │   ├── ConfigBlock.tsx
│   │   ├── ModelConfig.tsx
│   │   ├── ModelSelector.tsx  # 先选提供商，再选模型
│   │   ├── PromptEditor.tsx   # 高级设置：编辑+恢复默认 prompt 模板
│   │   └── HistoryList.tsx
│   ├── i18n/
│   │   ├── zh.json
│   │   ├── en.json
│   │   └── ja.json
│   └── types/
│       └── index.ts           # 共享类型定义
├── Dockerfile                  # 基于 node:22-alpine + build-base
├── docker-compose.yml          # volume: ./data:/app/data
├── start.sh                    # 完整环境检测
└── data/.gitkeep
```

## 核心流程

```
表单输入 → POST /api/generate
  → 用户在前端选择 提供商 → 模型
  → 读取模型配置（含加密的 API Key，运行时解密）
  → 选择模型适配器 (OpenAI/Anthropic)
  → 构建系统提示词 (读取保存的或默认 prompt 模板)
  → 调用 LLM
    ├── stream=true:  SSE 流式返回，data 逐 token 拼接，前端打字机效果
    └── stream=false: 等 LLM 完成后返回完整 JSON 响应
  → 解析 JSON → 标准化 → 拆分配置块（白名单校验）
  → 生成完整 TOML
  → 持久化到 SQLite (generate_history)
  → 前端展示 配置块 / TOML / 原始输出
```

## 数据模型

### 提供商与模型（两级结构，参考 OpenCode）

```typescript
interface ProviderConfig {
  id: string;
  name: string;             // "OpenAI" / "DeepSeek" / "Ollama 本地"
  type: "openai" | "anthropic";
  endpoint: string;         // "https://api.openai.com/v1"
  apiKey: string;           // AES-256-GCM 加密存储，ENCRYPTION_KEY 环境变量
  models: ModelInfo[];      // 该提供商下的模型列表
  createdAt: string;
}

interface ModelInfo {
  id: string;               // "gpt-4o"
  displayName: string;      // "GPT-4o"
}
```

### 请求

```typescript
interface GenerateRequest {
  providerId: string;        // 选择的提供商
  modelId: string;           // 该提供商下选择的模型
  sourceText: string;        // max 20000 chars
  targetScene: "group" | "private" | "both";
  language: string;          // "简体中文" | "English" | "日本語"
  extraRequirements: string; // max 4000 chars
  temperature: number;       // 0-2, 默认 0.3
  maxTokens: number;         // 256-8192, 默认 1800
  stream: boolean;           // 默认 true
}
```

### LLM 输出（全链路兼容麦麦）

```typescript
interface ParsedResult {
  personality: string;
  reply_style: string;
  multiple_reply_style: string[];
  group_chat_prompt: string;
  private_chat_prompts: string;
  chat_prompts: ChatPrompt[];
  notes: string[];
}

interface ChatPrompt {
  platform: string;
  item_id: string;
  rule_type: "group" | "private";
  prompt: string;
}
```

### 配置块

```typescript
interface ConfigBlock {
  id: string;           // "personality.personality" 等
  section: string;      // "personality" | "chat"
  field: string;
  title: string;
  description: string;
  value: string | string[] | ChatPrompt[];  // 按 field 确定实际类型
  toml: string;
}
```

### 配置块白名单（与麦麦一致）

- `personality.personality`
- `personality.reply_style`
- `personality.multiple_reply_style`
- `chat.group_chat_prompt`
- `chat.private_chat_prompts`
- `chat.chat_prompts`

### API 响应

```typescript
// POST /api/generate 非流式响应
{
  "success": true,
  "data": {
    "id": "uuid",
    "parsed": { /* ParsedResult */ },
    "blocks": [ /* ConfigBlock[] */ ],
    "toml": "完整 TOML 字符串",
    "rawResponse": "LLM 原始输出",
    "createdAt": "ISO 8601"
  }
}

// GET /api/history 分页响应
{
  "items": [ /* ... */ ],
  "nextCursor": "uuid | null"
}

// 错误响应
{
  "error": "人类可读的错误描述",
  "code": "INVALID_API_KEY | LLM_TIMEOUT | PARSE_FAILED | NETWORK_ERROR | VALIDATION_ERROR | RATE_LIMITED"
}
```

## SQLite 表结构

```sql
CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('openai','anthropic')),
  endpoint TEXT NOT NULL,
  api_key TEXT NOT NULL,       -- AES-256-GCM 加密后的密文
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE provider_models (
  id TEXT NOT NULL,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  PRIMARY KEY (id, provider_id)
);

CREATE TABLE generate_history (
  id TEXT PRIMARY KEY,
  provider_id TEXT,
  model_id TEXT,
  request_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  toml_output TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL
);

CREATE TABLE prompt_template (
  language TEXT PRIMARY KEY,   -- "zh" | "en" | "ja"
  template TEXT NOT NULL,      -- 系统提示词全文
  updated_at TEXT DEFAULT (datetime('now'))
);
```

## API 设计

```
POST   /api/generate               # 生成人设，请求体 stream 字段控制流式/非流式
GET    /api/history?cursor=&limit=  # 历史记录游标分页 (默认 limit=20)
GET    /api/history/:id             # 单条记录
DELETE /api/history/:id             # 删除记录

GET    /api/providers               # 提供商列表，apiKey 完全不返回
POST   /api/providers               # 新增（无 id）或更新（有 id）提供商及其模型
DELETE /api/providers/:id           # 删除提供商（CASCADE 删除关联模型）

GET    /api/export/toml?historyId=  # 下载 bot_config.toml 文件

GET    /api/prompt-template?lang=   # 读取 prompt 模板
PUT    /api/prompt-template?lang=   # 更新 prompt 模板
POST   /api/prompt-template/reset   # 恢复指定语言或全部默认模板
```

### SSE 流式格式

```
Content-Type: text/event-stream

event: token
data: {"text": "这是逐"}

event: token
data: {"text": "个"}

event: done
data: {"id": "uuid", "parsed": {...}, "blocks": [...], "toml": "...", "rawResponse": "..."}

event: error
data: {"error": "...", "code": "PARSE_FAILED"}
```

## 错误处理

| 场景 | HTTP 码 | code | 前端行为 |
|------|---------|------|----------|
| 输入校验失败 | 400 | VALIDATION_ERROR | 表单字段标红，显示具体错误 |
| API Key 无效/401 from LLM | 502 | INVALID_API_KEY | 提示检查 API Key，链接到模型配置 |
| LLM 调用超时 (>60s) | 504 | LLM_TIMEOUT | 建议降低 maxTokens 或换模型 + 重试按钮 |
| LLM 返回无法解析 | 502 | PARSE_FAILED | 展示原始输出 + 重试按钮 |
| 请求过于频繁 | 429 | RATE_LIMITED | 提示等待 N 秒后重试 |
| 网络/端点不可达 | 503 | NETWORK_ERROR | 提示检查端点 URL 连通性 + 重试按钮 |
| 加密密钥未配置 | 500 | CONFIG_ERROR | 启动时报错退出，不提供 API |
| JSON 解析失败 | 502 | PARSE_FAILED | 展示原始输出 + "请重试或调整输入" + 重试按钮 |

失败结果保留卡片展示，含重试按钮（用相同参数再请求一次）。

## 安全

- API Key 使用 AES-256-GCM 加密存储，密钥从环境变量 `ENCRYPTION_KEY` 读取（启动时无则报错退出）
- GET `/api/providers` 不返回 apiKey 字段
- 前端 API Key 输入框 `type="password"`
- 用户输入通过 `textContent` / React JSX 自动转义渲染，防 XSS
- 输入长度校验：sourceText ≤ 20000 chars, extraRequirements ≤ 4000 chars
- CSP header 通过 Next.js config 配置
- better-sqlite3 使用参数化查询，防 SQL 注入
- 速率限制：同一 IP 每分钟最多 10 次 `/api/generate` 请求

## 前端设计

单一页面，内嵌所有功能：

- **顶部栏**：标题 + 语言切换（中/英/日）+ 历史记录按钮（弹出右侧侧栏面板）
- **模型选择区**：先选提供商（下拉），再选模型（下拉），旁边 ⚙ 按钮弹出提供商管理弹窗（增删改）
- **输入区**：源文本 textarea + 额外要求(可选) + 温度滑块(range 0-2) + Token 输入(number input, 256-8192)
- **高级设置**：折叠面板，展开后显示 prompt 模板编辑器 + "恢复默认"按钮（确认后从麦麦原文还原对应语言模板）
- **生成按钮**：触发 SSE 流式调用，按钮变"生成中..."
- **结果展示**（三标签页 + 批量操作）：
  - "配置块"标签：每个块独立卡片，标题+字段路径+TOML 预览+"复制此块"按钮
  - "完整 TOML"标签：代码块展示 + "复制"+"复制全部"按钮
  - "原始输出"标签：LLM 原始响应文本
  - 底部固定栏："全部复制" + "导出 bot_config.toml"（触发浏览器下载）

### 历史记录侧栏

- 右侧滑出面板
- 列表项：时间 + 源文本前 50 字 + 提供商/模型名
- 点击 → 恢复展示到结果区（三个标签页均可看）
- 支持删除

## 预置数据

首次启动时自动初始化：

| 提供商 | 类型 | 端点 | 模型 |
|--------|------|------|------|
| OpenAI | openai | `https://api.openai.com/v1` | gpt-4o, gpt-4o-mini |
| Anthropic | anthropic | `https://api.anthropic.com/v1` | claude-sonnet-4-6, claude-haiku-4-5 |
| DeepSeek | openai | `https://api.deepseek.com/v1` | deepseek-chat, deepseek-reasoner |
| Ollama (本地) | openai | `http://localhost:11434/v1` | （需用户自行添加模型） |

所有预置提供商的 API Key 留空（加密存储空字符串），用户填入后才可生成。

## 核心移植逻辑

从麦麦移植的关键函数，行为必须一致：

1. `_build_prompt_generator_instruction()` → `prompt.ts`：构建系统提示词
2. `_extract_json_object()` → `parser.ts`：JSON 解析（含 Markdown 代码块去除和容错 `{` → `}` 提取）
3. `_normalize_prompt_generator_result()` → `normalizer.ts`：标准化结果
4. `_build_prompt_generator_config_blocks()` → `normalizer.ts`：拆分配置块

## 部署

### 本地开发

```bash
npm install
npm run dev            # Next.js dev server on port 3000
```

### 生产运行

```bash
ENCRYPTION_KEY=<生成的随机密钥> npm run build && npm start
```

### Docker

```bash
docker build -t person-summon .
docker run -p 3000:3000 \
  -e ENCRYPTION_KEY=<随机密钥> \
  -v ./data:/app/data \
  person-summon
```

docker-compose.yml 挂载 `./data:/app/data`，数据持久化到宿主机。

### start.sh 脚本

完整环境检测：
1. 检测 Node.js ≥ 20（不满足给出安装指引）
2. 检测 npm 可用
3. 检测端口 3000 是否被占用（占用则报错退出，建议换端口）
4. 检测磁盘空间 > 100MB
5. 自动生成 `ENCRYPTION_KEY`（若不存在）
6. `npm install && npm run build && npm start`
7. 打印 `http://localhost:3000`

## 测试策略

### 单元测试 (vitest)

- `parser.test.ts`：JSON 解析（正常 JSON、Markdown 包裹 ` ```json `、截断修复、纯文本无 JSON）
- `prompt.test.ts`：默认模板快照测试（与麦麦原文一致）
- `normalizer.test.ts`：输出兼容性（生成的 TOML 字段名与麦麦白名单完全匹配、配置块拆分正确）

### 集成测试

- `generate.test.ts`：mock fetch 模拟 LLM 响应，测试 `/api/generate` 完整流程
- `models.test.ts`：提供商 CRUD、模型增删
- `history.test.ts`：历史记录游标分页、单条查询、删除
