# 布局重构 — 双栏 + 可切换 设计规范

## 概述

将 person-summon 前端从单栏上下布局改造为双栏左右布局，支持一键切换回单栏。适配原型 `public/prototype.html`。

## 两种模式

### 双栏（默认）
- 左右 flex 容器，gap 16px，外层 padding 16px 20px
- 左栏 width 42%：输入卡片组（模型/生成同行 → 源文本 → 场景/语言 → 额外要求 → 温度/Token → 高级设置折叠在底部）
- 右栏 width 58%：
  - `.result-card`：灰底卡片，`min-height: 45vh`，内含标签页
  - `.results-outer`：卡片下方 16px，独立配置块卡片浮动区域
- 顶栏 ⊟ 按钮（切换到单栏）

### 单栏
- 居中 max-width 780px，margin auto，输入在上结果在下
- 结果卡片无 min-height 限制
- 配置块在结果卡片内展示（原版行为）
- 顶栏 ⊞ 按钮（切换到双栏）

## 标签页行为

### 无结果时
- 所有标签页显示"等待生成"空状态

### 有结果时
- **"配置块"**：卡片内不展示内容，仅保留结果 header（标题 + 全部复制/导出按钮）；配置块在下方 `.results-outer` 区域以独立卡片浮现（仅双栏；单栏时仍在卡片内）
- **"完整 TOML"**：卡片内展示 TOML pre 块 + 复制按钮
- **"原始输出"**：卡片内展示原始响应 pre

## 切换

- 切换按钮：`lang btns | ☰ 历史 | ⊟/⊞ 布局 | ☀/☾ 主题`
- `localStorage: layout = "dual" | "single"`，默认 `"dual"`
- 切换仅改变容器 CSS class（`.layout-dual` / `.layout-single`），不丢失表单输入和生成结果
- 单栏时 `.results-outer` 内的配置块不渲染（回到卡片内），避免重复

## 表单改动

- **占位符**改为 MaiMai 风格：
  - 源文本："可以粘贴角色卡、几句人设、说话风格描述、群聊要求，模型会拆成 personality / reply_style / chat prompt。"
  - 额外要求："例如：更短、更日常；不要攻击性；保留技术群助教气质；不要改成角色卡口吻。"
- **表单块**加 `.form-card` class（灰色背景卡片包裹）
- **生成按钮**移到顶部，和模型选择器同行，右侧
- **温度/Token**改为同行排列
- **表单 hint 提示**：每个 label 下方可选灰色小字说明

## 新增 i18n key (zh.json)

```json
"sectionInput": "生成输入",
"inputDesc": "选择已配置的模型，把任意文段、角色卡或人设解析成 MAIBOT 配置格式。",
"modelHint": "来自模型管理中定义的 models。",
"resultDesc": "生成结果会拆成配置块，注入时只覆盖对应字段，不影响其它配置。",
"waitingTitle": "等待生成",
"waitingDesc": "选择模型并输入人设后，结果会按 bot_config.toml 字段拆成可注入的配置块。",
"layoutDual": "切换到单栏",
"layoutSingle": "切换到双栏"
```

## 改动文件

| 文件 | 改动 |
|------|------|
| globals.css | `.layout-dual` / `.layout-single` CSS、`.form-card`、`.result-card`、`.results-outer` |
| page.tsx | layout state、双栏 HTML 结构、切换按钮、生成按钮位置 |
| GeneratorForm.tsx | 字段重排、MaiMai 占位符、form-card class |
| ResultTabs.tsx | 配置块 tab 时卡片内空（双栏），配置块改为从 `results-outer` 渲染 |
| ConfigBlockCard.tsx | 圆角 6px、box-shadow、左侧色条 |
| i18n/zh.json | 新增 8 个 key |
| i18n/en.json | 对应英文翻译 |
| i18n/ja.json | 对应日文翻译 |

## 不变
- API 路由全部不变
- SSE 流式逻辑不变
- 主题切换（light/dark）不变
- ProviderManager、HistoryPanel、PromptEditor 核心逻辑不变
- ModelSelector 核心逻辑不变（只改排列位置）
