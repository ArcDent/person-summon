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
│   ├── lib/
│   │   ├── db.ts           # SQLite 数据库层（初始化、迁移、种子数据）
│   │   ├── crypto.ts       # AES-256-GCM 加解密模块
│   │   └── parser.ts       # JSON 解析器（markdown 剥离 + 花括号回退提取）
│   ├── types/index.ts      # 共享 TypeScript 类型定义
│   └── app/                # Next.js App Router（布局、页面）
├── __tests__/              # Vitest 单元测试
├── data/                   # SQLite 数据库文件（运行时生成，不提交）
├── docs/                   # 原始项目参考文档
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
