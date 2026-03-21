# State Management

> Arona WebUI 的状态管理模式。

---

## Overview

本项目使用**单一模块级 `state` 对象**管理所有应用状态，无任何状态管理库。状态变更通过直接赋值完成，UI 更新通过手动 DOM 操作触发。

---

## State Categories

### 1. 应用状态 — `state` 对象

定义在 `public/app.js` 顶部（约第 3 行），是整个 SPA 的唯一全局状态容器。

```js
const state = {
  currentView: "overview",        // 当前激活的导航视图
  modelsHash: "",                 // 模型配置的哈希（用于脏检测）
  modelProvidersDraft: {},        // 模型提供商编辑草稿
  agentsDefaultsModelsDraft: {},  // Agent 默认模型 allowlist 草稿
  agentsDefaultModelDraft: null,  // Agent 默认主模型草稿
  deletedModelProviderKeys: new Set(), // 待作为 tombstone 下发的 Provider 删除集合
  deletedAllowlistModelRefs: new Set(), // 待作为 tombstone 下发的 allowlist 模型引用集合
  modelsApply: { ... },           // 模型配置保存/热重启恢复状态
  providerModalOpen: false,       // Provider 编辑弹窗是否打开
  skillModalOpen: false,          // Skill 配置弹窗是否打开
  providerEditor: { ... },       // Provider 编辑器元数据
  confirmDialog: { ... },        // 确认对话框状态
  modalFocus: { ... },           // 焦点管理状态
  logsCursor: null,               // 日志分页游标
  logsTimer: null,                // 日志轮询定时器
  logsLive: false,                // 日志是否正在实时拉取
  systemTimer: null,              // 系统负载轮询定时器
  overviewTimer: null,            // 概览视图轮询定时器
  nodeCommandDefaults: [],        // 节点命令默认选项
  modelDefaultOptions: [],        // 模型默认选项
  cronJsonMode: false,            // Cron 编辑是否为 JSON 模式
  persona: { ... },               // Persona 编辑器子状态（列表/文件/保存）
  chat: { ... }                   // Playground 对话子状态（嵌套对象）
};
```

### 2. 持久化状态 — `localStorage`

| Key | 用途 | 示例 |
|---|---|---|
| `openclaw_token` | 不透明的 session Bearer token（非 JWT） | UUID 风格 token 字符串 |
| `openclaw-theme` | 主题偏好 | `"dark"` 或 `"light"` |

### 3. 模块级缓存

```js
let _skillsCache = [];  // 技能数据缓存，供配置弹窗读取
```

业务数据应优先进入 `state`。当前仓库仍保留少量模块级 UI/runtime 运行态（例如 spotlight 指针与 reduced-motion 媒体查询结果），但不要继续把新的业务状态散落到 `state` 之外。

### 4. WebSocket 连接状态

`GatewayClient` 实例（`state.chat.client`）内部维护自己的连接状态：
- `status`：`"disconnected"` / `"connecting"` / `"connected"` / `"reconnecting"`
- `statusListeners` / `eventListeners`：回调监听器集合
- `pending`：请求-响应 Promise 映射

### 5. Persona 编辑器异步子状态

- `state.persona` 使用 `listRequestId` / `filesRequestId` / `fileRequestId` 避免旧请求覆盖当前选择。
- 只有当「请求编号仍然匹配」且「当前选中的 agent / file 仍然一致」时，异步结果才允许落地到状态。
- 文件缺失不是异常终态：会落到 `fileMissing = true` 的“可创建态”。
- 详情见 `.trellis/spec/frontend/persona-editor-state.md`。

### 6. 模型配置热重启子状态

- `deletedModelProviderKeys`：记录用户删除或重命名后需要在 `config.patch` 中发送 `null` tombstone 的 provider key。
- `agentsDefaultsModelsDraft`：当前模型页里“Agent 可用” allowlist 的前端草稿。
- `agentsDefaultModelDraft`：当前模型页里“设为默认”对应的默认模型草稿。
- `deletedAllowlistModelRefs`：记录取消勾选或删除后需要在 `config.patch` 中发送 `null` tombstone 的模型引用。
- `modelsApply.phase`：`"idle" | "restarting" | "error"`，驱动“网关热重启中”状态徽标和按钮禁用 / 重试连接状态。
- `modelsApply.message`：当前热重启提示文案；在轮询恢复期间动态更新。

---

## State Update Patterns

### 直接赋值 + 手动 DOM 更新

```js
// 切换视图
function setView(view) {
  state.currentView = view;
  // 手动更新 DOM
  for (const section of document.querySelectorAll(".view")) {
    section.classList.toggle("active", section.id === `view-${view}`);
  }
  // 触发视图加载
  const load = viewLoaders[view];
  if (load) load();
}
```

### 视图刷新模式

视图加载函数直接从 API 获取数据并重新渲染整个视图区域：

```js
async function loadOverview() {
  const container = $("overview-content");
  container.innerHTML = renderSkeleton(5);  // 加载骨架屏
  const data = await api("/api/overview");
  container.innerHTML = `...渲染完整 HTML...`;
}
```

### 定时器轮询模式

部分状态通过 `setInterval` 定期从服务器刷新：

```js
function startOverviewTimers() {
  state.systemTimer = setInterval(() => loadSystemLoad(), 5000);
  state.overviewTimer = setInterval(() => loadOverview(), 30000);
}
```

---

## Server State

- **无缓存层**：每次视图切换或定时器触发时直接从 API 获取最新数据
- **API 调用通过 `api()` 辅助函数**：自动附加 auth header，401 时重定向到登录页
- **WebSocket 实时数据**：Chat/Playground 视图通过 `GatewayClient` 接收流式事件

---

## Common Mistakes

- **不要把新的业务状态散落到 `state` 对象之外**：现有模块级运行态主要是 UI/媒体查询辅助，不应成为继续扩散的理由
- **不要忘记在视图切换时清理定时器**：参见 `stopOverviewTimers()` / `stopLogStream()`
- **不要假设 `state.chat.client` 已连接**：始终检查 `isConnected()` 或使用 `ensureChatClientConnected()`
- **修改状态后必须手动更新 DOM**：本项目无响应式绑定
- **不要把 `openclaw_token` 当成 JWT 解析**：它只是后端 `SESSIONS` Map 里的 opaque session token
- **不要让过期的 Persona 异步结果覆盖当前编辑目标**：必须同时校验 request id 与当前选中项
