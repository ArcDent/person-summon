# AGENTS.md — person-summon

## 项目身份
- **类型**: Next.js 15 全栈 Web 应用
- **目标**: 为 maimaibot 生成 bot 人格配置（Persona Generator）
- **技术栈**: Next.js 15, TypeScript, React 19, better-sqlite3, vitest, OpenAI/Anthropic SDK
- **仓库**: https://github.com/ArcDent/person-summon

## 项目静态结构
```
person-summon/
├── README.md
├── AGENTS.md
├── package.json / tsconfig.json / next.config.ts / vitest.config.ts
├── .gitignore
├── Dockerfile / docker-compose.yml / start.sh
├── public/prototype.html    # 双栏布局原型
├── __tests__/               # vitest 测试 (6 files, 31 tests)
├── docs/superpowers/        # 设计规范 + 实现计划
├── data/                    # SQLite 数据库文件
└── src/
    ├── i18n/                # zh/en/ja 翻译
    ├── lib/                 # 核心逻辑 (db, crypto, parser, prompt, normalizer, toml, rate-limit, i18n, llm/)
    ├── types/index.ts
    ├── components/          # React UI 组件
    └── app/                 # Next.js App Router (layout, page, globals.css, api/)
```

## 布局架构
- **双栏（默认）**: `body.layout-dual` 触发，flex column 全屏布局，左 42% 输入 + 右 58% 结果，各栏独立 `overflow-y: auto`
- **单栏**: `body.layout-single` 触发，max-width 780px 居中
- **切换**: 顶栏 ⊟/⊞ 按钮，`localStorage.layout` 持久化

## 最近操作
- 2026-05-26: 全部 20 个 Task 完成
- 2026-05-26: 亮/暗主题切换 + 双栏/单栏布局切换
- 2026-05-26: 双栏布局重构 — 从 CSS `html:has()` 改为 `body.className`，从 `overflow: visible` 改为 `overflow-y: auto`，彻底修复滚动
- 2026-05-26: ENCRYPTION_KEY .env.local + outputFileTracingRoot 配置
- 2026-05-26: 修复模型设置齿轮按钮无响应 — ModelSelector 齿轮按钮被误删，恢复后 GeneratorForm 中假按钮移除
- 2026-05-26: README 新增跨平台 Docker 部署说明（Linux/macOS/Windows）

## 进行中
- 无

## 下一步
- 用户认证、更多 LLM 提供商、历史搜索

## 关键发现
- `html:has()` 浏览器兼容性差，改用 JS 设置 `body.className` 更可靠
- 双栏布局中 `overflow-y: auto` 必须作用于直接滚动容器，不能被父级 `overflow: hidden` 截断
- CSS 先清理再添加，积压的 hack 会互相冲突
