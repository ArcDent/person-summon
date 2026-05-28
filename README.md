# MaiPSummon

> 一键将任意文段/角色卡/人设描述转化为 maimaibot 人格配置 — Next.js 15 全栈应用，Docker 镜像自动构建推送 GHCR，拉取即用。

> 核心功能模块提取自 [Mai-with-u（麦麦）](https://github.com/Mai-with-u) 项目的 `src/webui/routers/config.py`，使用 Next.js 15 + TypeScript 重新实现。生成的 `bot_config.toml` 输出格式与麦麦完全兼容。

## 快速开始（推荐：GHCR 远端镜像）

**每次 push 到 `main` 分支，GitHub Actions 自动构建 Docker 镜像并推送到 GHCR。无需克隆仓库、无需安装 Node.js、无需本地编译 — 拉取即用。**

### 一行命令启动

```bash
docker run -d --name maipsummon \
  -p 3000:3000 \
  -e ENCRYPTION_KEY=$(openssl rand -hex 32) \
  -v $(pwd)/data:/app/data \
  ghcr.io/arcdent/maipsummon:latest
```

浏览器访问 `http://localhost:3000`。

> **Windows 用户**：使用 PowerShell 执行，并将 `$(openssl rand -hex 32)` 替换为：
> ```powershell
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### Docker Compose（远端镜像）

```bash
# 下载 compose 文件
wget https://raw.githubusercontent.com/ArcDent/MaiPSummon/main/docker-compose.ghcr.yml

# 启动（自动拉取 latest 镜像）
ENCRYPTION_KEY=$(openssl rand -hex 32) docker compose -f docker-compose.ghcr.yml up -d
```

`docker-compose.ghcr.yml` 已配置 `pull_policy: always`，每次 `docker compose up -d` 都会自动拉取最新镜像。

### 停止服务

```bash
docker rm -f maipsummon
# 或使用 compose：
docker compose -f docker-compose.ghcr.yml down
```

### 自动同步最新镜像

搭配系统计划任务，实现无人值守自动更新：

**Linux（crontab）**

```bash
*/5 * * * * docker pull ghcr.io/arcdent/maipsummon:latest && docker rm -f maipsummon && docker run -d --name maipsummon -p 3000:3000 -e ENCRYPTION_KEY=your-key -v /path/to/data:/app/data ghcr.io/arcdent/maipsummon:latest
```

**Windows（PowerShell 计划任务，以管理员运行）**

```powershell
$action = New-ScheduledTaskAction -Execute "docker" -Argument "pull ghcr.io/arcdent/maipsummon:latest; docker rm -f maipsummon; docker run -d --name maipsummon -p 3000:3000 -e ENCRYPTION_KEY=your-key -v C:\data:/app/data ghcr.io/arcdent/maipsummon:latest"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
Register-ScheduledTask -TaskName "MaiPSummon-Auto-Update" -Action $action -Trigger $trigger -RunLevel Highest
```

## 从源码构建（备选）

### Docker 本地构建

```bash
git clone https://github.com/ArcDent/MaiPSummon.git
cd MaiPSummon
ENCRYPTION_KEY=$(openssl rand -hex 32) docker compose up -d
```

### 手动编译

```bash
git clone https://github.com/ArcDent/MaiPSummon.git
cd MaiPSummon
npm install
export ENCRYPTION_KEY=$(openssl rand -hex 32)
npm run dev
```

访问 `http://localhost:3000`。

### start.sh 一键启动

```bash
chmod +x start.sh
./start.sh
```

## 功能特性

- 任意文段/角色卡/人设描述 → 自动生成麦麦 bot 人格配置（TOML）
- 多 LLM 提供商支持：OpenAI (API 兼容)、Anthropic、DeepSeek、Ollama
- 内置 4 个提供商预置（API Key 留空，用户自行填入）
- 前端模型管理：提供商和模型可增删改，API Key AES-256-GCM 加密存储
- SSE 流式生成，打字机效果实时预览
- 配置块逐块展示 + 逐块复制 + 一键导出 `bot_config.toml`
- 系统提示词模板可编辑 + 一键恢复麦麦原始默认
- 历史记录游标分页，支持回溯和导出
- 双栏/单栏布局一键切换
- 中 / 英双语 UI（英语提示词模板为机器翻译，建议人工验证）
- 亮色 / 暗色主题切换
- SQLite 本地数据库，零外部依赖

## 配置

| 环境变量 | 必填 | 说明 |
|----------|------|------|
| `ENCRYPTION_KEY` | 是 | AES-256-GCM 加密密钥（32 字节 hex），用于加密存储 API Key。不设置则启动时自动生成 |

首次启动后通过 Web UI 配置 LLM 提供商的 API Key。

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
| GET | `/api/export/toml?historyId=` | 下载 `bot_config.toml` |
| GET | `/api/prompt-template?lang=` | 读取提示词模板 |
| PUT | `/api/prompt-template` | 更新提示词模板 |
| POST | `/api/prompt-template/reset` | 恢复默认提示词模板 |

## 运行测试

```bash
npm test
```

## 项目结构

```
├── src/
│   ├── app/api/         # API 路由 (generate, history, providers, export, prompt-template)
│   ├── components/      # React UI 组件
│   ├── lib/             # 核心逻辑 (db, crypto, parser, prompt, normalizer, toml, llm)
│   ├── types/           # TypeScript 类型定义
│   └── i18n/            # 中/英翻译
├── __tests__/           # 单元测试 + 集成测试
├── docs/                # 设计规范 + 实现计划
├── data/                # SQLite 数据库 (运行时生成)
├── Dockerfile           # 三阶段构建（deps → build → runtime）
├── docker-compose.yml   # 本地源码构建
├── docker-compose.ghcr.yml  # GHCR 远端镜像拉取
├── .github/workflows/   # CI/CD 自动构建推送 GHCR
└── start.sh             # 环境检测 + 一键启动脚本
```

## 环境要求

- Node.js >= 20（源码构建时）
- 或 **Docker**（推荐，无需安装 Node.js）

## 免责声明

- 本项目为独立开源工具，与 Mai-with-u（麦麦）项目无隶属关系，亦未获得其官方背书。
- 本工具生成的 AI 人设配置仅供学习和娱乐用途。使用者应自行评估生成内容是否适合其使用场景，并遵守相关平台的服务条款与社区准则。
- 通过本工具调用 LLM 提供商（如 OpenAI、Anthropic、DeepSeek、Ollama 等）所产生的费用、数据隐私及合规风险由使用者自行承担。
- 本项目不对因使用本工具而产生的任何直接或间接损失承担责任。

## 许可证

MIT
