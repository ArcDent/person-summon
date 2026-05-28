# AGENTS.md — MaiPSummon

## 项目身份
- **类型**: Next.js 15 全栈 Web 应用
- **目标**: 为 maimaibot 生成 bot 人格配置（Persona Generator）
- **技术栈**: Next.js 15, TypeScript, React 19, better-sqlite3, vitest, OpenAI/Anthropic SDK
- **仓库**: https://github.com/ArcDent/MaiPSummon

## 项目静态结构
```
mai-p-summon/
├── README.md
├── AGENTS.md
├── package.json / tsconfig.json / next.config.ts / vitest.config.ts
├── .gitignore
├── Dockerfile              # 三阶段构建（deps → build → runtime）
├── docker-compose.yml      # 本地源码构建
├── docker-compose.ghcr.yml # GHCR 远端镜像拉取
├── start.sh
├── .github/workflows/      # CI/CD 自动构建推送 GHCR
├── public/prototype.html   # 双栏布局原型
├── __tests__/              # vitest 测试 (6 files, 31 tests)
├── docs/superpowers/       # 设计规范 + 实现计划
├── data/                   # SQLite 数据库文件
└── src/
    ├── i18n/               # zh/en 翻译
    ├── lib/                # 核心逻辑 (db, crypto, parser, prompt, normalizer, toml, rate-limit, i18n, llm/)
    ├── types/index.ts
    ├── components/         # React UI 组件
    └── app/                # Next.js App Router (layout, page, globals.css, api/)
```

## 布局架构
- **双栏（默认）**: `body.layout-dual` 触发，flex column 全屏布局，左 42% 输入 + 右 58% 结果，各栏独立 `overflow-y: auto`
- **单栏**: `body.layout-single` 触发，max-width 780px 居中
- **切换**: 顶栏 ⊟/⊞ 按钮，`localStorage.layout` 持久化

## 最近操作
- 2026-05-28: 代码瘦身 — 删除日语本地化（ja.json）、dead code（getDefaultPrompt）、unused CSS（~58行装饰性/冗余样式）、伪扩展点（日文提示词模板映射）
- 2026-05-28: 仓库更名为 MaiPSummon，全局替换名称引用
- 2026-05-28: 新增 GitHub Actions CI/CD（`.github/workflows/docker-build.yml`），push master 自动构建推送到 GHCR
- 2026-05-28: 新增 `docker-compose.ghcr.yml` 远端拉取部署方案，README 重写以强调 GHCR 一键拉取流程
- 2026-05-28: Dockerfile 优化为三阶段构建（deps → build → runtime），next.config.ts 添加 `output: standalone`

## 进行中
- 等待用户在 GitHub 上 rename 仓库（Settings → Rename → MaiPSummon），rename 后 CI/CD 自动生效

## 下一步
- GitHub 仓库 rename 后首次 push 验证 CI/CD 镜像构建推送是否正常

## 下一步
- 用户认证、更多 LLM 提供商、历史搜索

## 关键发现
- `html:has()` 浏览器兼容性差，改用 JS 设置 `body.className` 更可靠
- 双栏布局中 `overflow-y: auto` 必须作用于直接滚动容器，不能被父级 `overflow: hidden` 截断
- CSS 先清理再添加，积压的 hack 会互相冲突
