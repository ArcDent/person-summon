# AGENTS.md — person-summon

## 项目身份
- **类型**: Next.js 15 全栈 Web 应用
- **目标**: 为 maimaibot 生成 bot 人格配置（Persona Generator）
- **技术栈**: Next.js 15, TypeScript, React 19, better-sqlite3, vitest, OpenAI/Anthropic SDK, TOML

## 项目静态结构
person-summon/
├── README.md
├── AGENTS.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
├── .gitignore
├── Dockerfile               # Docker 构建：node:22-alpine, better-sqlite3 编译依赖
├── docker-compose.yml       # Docker 部署：端口 3000, data 卷挂载, ENCRYPTION_KEY
├── start.sh                 # 一键启动脚本：环境检查 + 密钥生成 + npm install + build + start
├── __tests__/               # vitest 测试
│   ├── parser.test.ts
│   ├── normalizer.test.ts
│   ├── prompt.test.ts
│   └── api/                 # API 路由集成测试
│       ├── providers.test.ts
│       ├── generate.test.ts
│       └── history.test.ts
├── docs/
├── data/                     # SQLite 数据库文件
└── src/
    ├── i18n/
    │   ├── zh.json
    │   ├── en.json
    │   └── ja.json
    ├── lib/
    │   ├── db.ts             # SQLite 数据库层
    │   ├── crypto.ts         # AES-256-GCM 加解密
    │   ├── parser.ts         # JSON 提取解析器
    │   ├── prompt.ts         # 提示词模板
    │   ├── normalizer.ts     # 结果规范化 + 配置块构建
    │   ├── toml.ts           # TOML 生成器
    │   ├── rate-limit.ts     # 请求频率限制
    │   ├── i18n.ts           # i18n 上下文与翻译加载钩子
    │   └── llm/
    │       ├── index.ts      # LLM 分发器
    │       ├── openai.ts     # OpenAI 适配器
    │       └── anthropic.ts  # Anthropic 适配器
    ├── types/
    │   └── index.ts          # 共享类型定义
    ├── components/           # 前端 UI 组件 (全部 "use client")
    │   ├── I18nLayout.tsx    # i18n Provider 客户端包装
    │   ├── ProviderManager.tsx # 提供商 CRUD 模态框
    │   ├── ModelSelector.tsx # 提供商→模型级联选择器
    │   ├── GeneratorForm.tsx # 主输入表单
    │   ├── ConfigBlockCard.tsx # 配置块卡片（琥珀/青左边框）
    │   ├── ResultTabs.tsx    # 结果标签页（配置块/TOML/原始输出）
    │   ├── PromptEditor.tsx  # 可折叠提示词模板编辑器
    │   └── HistoryPanel.tsx  # 滑出式历史记录侧栏
    └── app/
        ├── layout.tsx        # 根布局（I18nLayout 包裹）
        ├── globals.css       # "暗夜工作台"暗色主题样式
        ├── page.tsx          # 主页面（组合所有组件，SSE 流式处理）
        └── api/
            ├── providers/    # CRUD 提供商 API
            ├── prompt-template/ # 提示词模板 API
            ├── generate/     # 生成人格配置 API（SSE + 非流式）
            ├── history/      # 历史记录 API（cursor 分页）
            └── export/toml/  # TOML 导出下载 API

## 最近操作
- 2026-05-26: 全部 20 个 Task 完成 — Next.js 15 全栈项目 scaffolding → types → DB → crypto → core logic (parser/prompt/normalizer/toml) → LLM adapters → API routes → rate limiting → i18n → 前端组件 (暗夜工作台主题) → 测试 (31 tests) → Docker + start.sh → Final Polish
- 2026-05-26: 最终验证 — tsc 零错误，npm run build 成功，31 tests PASS，dev server 在 localhost:3000 运行

## 进行中
- 无（所有任务完成）

## 下一步
- 用户可启动 dev server (`npm run dev`) 或 Docker 部署 (`docker-compose up -d`)
- 后续可扩展：用户认证、更多 LLM 提供商、历史搜索

## 关键发现
- better-sqlite3 不会自动创建父目录，需手动 fs.mkdirSync 确保 data/ 存在
- busy_timeout=5000 可防止并发写入时的 SQLITE_BUSY 错误
- WAL 模式 + foreign_keys ON 提升并发性能
- parser 采用三层策略：去 markdown 包裹 -> JSON.parse -> 首尾 {} 回退提取
- 前端 SSE 流式读取：fetch POST + ReadableStream reader + TextDecoder + buffer 按行解析
- CSP 需要 img-src data: 允许 CSS 内联 SVG（噪声纹理、下拉箭头）
- 暗色主题设计：bg #0a0a0f, card #16161e, amber #f0a040 (人格区段), cyan #3dd6c8 (对话区段)
