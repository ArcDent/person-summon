# 人格生成器

提取自 [Mai-with-u（麦麦）](https://github.com/Mai-with-u) 项目的人设生成器功能，使用 Next.js 15 + TypeScript 重新实现。

## 功能特性

- 多 LLM 提供商支持（OpenAI、Anthropic、DeepSeek、Ollama）
- 任意文段输入自动生成 bot 人格配置
- TOML 格式配置输出，可直接注入 bot_config.toml
- SQLite 本地数据库，无需外部依赖
- 支持中/英/日三语

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000`。

## 运行测试

```bash
npm test
```

## 项目结构

```
person-summon/
├── src/
│   ├── i18n/
│   │   ├── zh.json            # 中文翻译
│   │   ├── en.json            # 英文翻译
│   │   └── ja.json            # 日文翻译
│   ├── lib/
│   │   ├── db.ts              # SQLite 数据库层（初始化、迁移、种子数据）
│   │   ├── crypto.ts          # AES-256-GCM 加解密模块
│   │   ├── parser.ts          # JSON 解析器（markdown 剥离 + 花括号回退提取）
│   │   ├── prompt.ts          # 提示词模板（MaiMai 兼容默认模板）
│   │   ├── normalizer.ts      # 解析结果规范化 + 配置块构建器
│   │   ├── toml.ts            # TOML 生成器（ParsedResult → bot_config.toml）
│   │   ├── i18n.ts            # i18n 上下文与翻译加载钩子
│   │   └── llm/               # LLM 适配器（openai / anthropic / 分发器）
│   ├── types/index.ts         # 共享 TypeScript 类型定义
│   └── app/
│       ├── layout.tsx         # 根布局
│       └── api/providers/     # 提供商 CRUD API（GET/POST/DELETE）
├── __tests__/                 # Vitest 单元测试
│   ├── api/                   # API 路由集成测试（providers / generate / history）
│   ├── parser.test.ts
│   ├── normalizer.test.ts
│   └── prompt.test.ts
├── data/                      # SQLite 数据库文件（运行时生成，不提交）
├── docs/                      # 原始项目参考文档
├── package.json
├── tsconfig.json
├── next.config.ts
└── vitest.config.ts
```

## 环境要求

- Node.js >= 18
- npm >= 9

## 原始项目参考

详细文档见 `docs/` 目录，原始实现使用 Python + Tomlkit。
