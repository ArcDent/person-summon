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
- 2026-05-26: 全部 20 个 Task 完成并推送 GitHub — https://github.com/ArcDent/person-summon
- 2026-05-26: 前端主题切换 — `:root` 默认亮色（极简纯白），`[data-theme="dark"]` 暗色（暗夜工作台），全局 CSS transition 动效，localStorage 持久化，☀/☾ 切换按钮在顶栏
- 2026-05-26: 修复 ENCRYPTION_KEY 未设置导致 API Key 保存失败，创建 `.env.local` 自动生成密钥
- 2026-05-26: 修复 stale `.next` 构建缓存导致 `Cannot find module './331.js'` 错误
- 2026-05-26: 配置 `outputFileTracingRoot` 消除 lockfile 工作区冲突告警

## 进行中
- 无

## 下一步
- 后续可扩展：用户认证、更多 LLM 提供商、历史搜索

## 关键发现
- ENCRYPTION_KEY 必须通过 `.env.local` 或环境变量设置，否则 crypto 模块抛异常导致 API 返回空 body
- `rm -rf .next` 是修复 Next.js Webpack chunk 缓存损坏的标准手段
- `/home/arcdent/package-lock.json` 干扰 Next.js 工作区检测，需 `outputFileTracingRoot` 配置
- 暗色/亮色主题切换用 CSS 变量 + `data-theme` 属性 + `* { transition }` 最轻量
- 亮色默认 (`:root`) > 暗色默认，符合大多数用户预期
