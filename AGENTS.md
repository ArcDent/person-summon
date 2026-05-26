# AGENTS.md — person-summon

## 项目身份
- **类型**: Next.js 15 全栈 Web 应用
- **目标**: 为 maimaibot 生成 bot 人格配置（Persona Generator）
- **技术栈**: Next.js 15, TypeScript, React 19, better-sqlite3, vitest, OpenAI/Anthropic SDK, TOML

## 项目静态结构
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
    │   └── db.ts             # SQLite 数据库层（初始化/迁移/种子数据）
    ├── types/
    │   └── index.ts          # 所有共享 TypeScript 类型定义
    └── app/
        ├── layout.tsx        # 根布局（中文 lang，metadata）
        └── globals.css       # 全局样式 + CSS 变量
```

## 最近操作
- 2026-05-26: 初始化项目，创建 AGENTS.md
- 2026-05-26: Task 1 — 项目脚手架：Next.js 15 + TypeScript + vitest，npm install 完成，dev server 验证通过
- 2026-05-26: Task 2 — 共享 TypeScript 类型定义：创建 `src/types/index.ts`，`npx tsc --noEmit` 编译通过
- 2026-05-26: Task 3 — SQLite 数据库层：修复 3 个问题 — busy_timeout pragma、data/ 目录确保、seed TOCTOU 竞态修复；刷新 README.md 为项目实际状态
- 2026-05-26: Task 3 — SQLite 数据库层：创建 `src/lib/db.ts`，4 张表，种子数据 4 个 provider + 6 个 model

## 进行中
- Task 3: Database Layer + Seed Data（已完成）
- 待进入 Task 4: Crypto Module

## 下一步
- Task 4: Crypto Module — AES-256-GCM 加密解密模块

## 关键发现
- better-sqlite3 不会自动创建父目录，需手动 `fs.mkdirSync` 确保 `data/` 存在
- busy_timeout=5000 可防止并发写入时的 SQLITE_BUSY 错误
- seed 的 COUNT 检查应放在事务内部以避免 TOCTOU 竞态条件
- WAL 模式 + foreign_keys ON 提升并发性能
