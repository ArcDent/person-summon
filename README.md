# 人格生成器 (Persona Generator)

> 本项目核心功能模块（人格 Prompt 构建、JSON 解析、配置块拆分、TOML 生成逻辑）提取自 [Mai-with-u（麦麦）](https://github.com/Mai-with-u) 项目的 `src/webui/routers/config.py` 中的 `_build_prompt_generator_instruction()` / `_extract_json_object()` / `_normalize_prompt_generator_result()` / `_build_prompt_generator_config_blocks()` 等函数，使用 Next.js 15 + TypeScript 重新实现。生成的 bot_config.toml 输出格式与麦麦完全兼容，可直接复制到 maimaibot 使用。

## 免责声明

- 本项目为独立开源工具，与 Mai-with-u（麦麦）项目无隶属关系，亦未获得其官方背书。
- 本工具生成的 AI 人设配置仅供学习和娱乐用途。使用者应自行评估生成内容是否适合其使用场景，并遵守相关平台的服务条款与社区准则。
- 通过本工具调用 LLM 提供商（如 OpenAI、Anthropic、DeepSeek、Ollama 等）所产生的费用、数据隐私及合规风险由使用者自行承担。
- 本项目不对因使用本工具而产生的任何直接或间接损失承担责任。

## 功能特性

- 支持任意文段/角色卡/人设描述输入，自动生成麦麦 bot 人格配置
- 多 LLM 提供商支持：OpenAI (API 兼容)、Anthropic、DeepSeek、Ollama
- 内置 4 个提供商预置（API Key 留空，用户自行填入）
- 前端模型配置：提供商和模型可增删改，API Key AES-256-GCM 加密存储
- SSE 流式生成，打字机效果实时预览
- TOML 格式输出，与 maimaibot 的 bot_config.toml 完全兼容
- 配置块逐块展示 + 逐块复制 + 一键导出 TOML 文件
- 系统提示词模板可编辑 + 一键恢复麦麦原始默认
- 历史记录游标分页，支持回溯和导出
- 中/英/日三语 UI（En/Ja 提示词模板标注为建议人工验证）
- SQLite 本地数据库，零外部依赖
- Docker 一键部署 + start.sh 环境检测脚本

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/ArcDent/person-summon.git
cd person-summon

# 安装依赖
npm install

# 设置加密密钥（用于 API Key 存储加密）
export ENCRYPTION_KEY=$(openssl rand -hex 32)

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000`。

### Docker 部署

```bash
ENCRYPTION_KEY=$(openssl rand -hex 32) docker compose up -d
```

### start.sh 一键启动

```bash
chmod +x start.sh
./start.sh
```

## 配置

| 环境变量 | 必填 | 说明 |
|----------|------|------|
| `ENCRYPTION_KEY` | 是 | AES-256-GCM 加密密钥，用于加密存储 API Key。启动时自动生成（start.sh），或手动设置 32 字节 hex 字符串 |

首次启动后通过 Web UI 配置 LLM 提供商的 API Key。

## 运行测试

```bash
# 运行全部测试
npm test

# 监听模式
npm run test:watch
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/generate` | 生成人设配置（SSE 流式/非流式） |
| GET | `/api/history?cursor=&limit=` | 历史记录（游标分页） |
| GET | `/api/history/:id` | 单条记录 |
| DELETE | `/api/history/:id` | 删除记录 |
| GET | `/api/providers` | 提供商列表（不含 API Key） |
| POST | `/api/providers` | 新增/更新提供商 |
| DELETE | `/api/providers/:id` | 删除提供商 |
| GET | `/api/export/toml?historyId=` | 下载 bot_config.toml 文件 |
| GET | `/api/prompt-template?lang=` | 读取提示词模板 |
| PUT | `/api/prompt-template` | 更新提示词模板 |
| POST | `/api/prompt-template/reset` | 恢复默认提示词模板 |

## 项目结构

```
person-summon/
├── src/
│   ├── app/
│   │   ├── api/           # API 路由 (generate, history, providers, export, prompt-template)
│   │   ├── layout.tsx      # 根布局
│   │   ├── page.tsx        # 主页面
│   │   └── globals.css     # "暗夜工作台"暗色主题
│   ├── components/         # React UI 组件
│   ├── lib/                # 核心逻辑 (db, crypto, parser, prompt, normalizer, toml, llm)
│   ├── types/              # TypeScript 类型定义
│   └── i18n/               # 中/英/日翻译
├── __tests__/              # 单元测试 + 集成测试 (31 tests)
├── docs/                   # 设计规范 + 实现计划
├── data/                   # SQLite 数据库 (运行时生成)
├── Dockerfile
├── docker-compose.yml
├── start.sh
├── package.json
├── tsconfig.json
├── next.config.ts
└── vitest.config.ts
```

## 环境要求

- Node.js >= 20
- npm >= 10

## 许可证

MIT
