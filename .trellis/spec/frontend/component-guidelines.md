# Component Guidelines

> Arona WebUI 的 UI 构建模式（vanilla JS，无框架组件）。

---

## Overview

本项目没有组件框架（无 React/Vue/Svelte）。UI 通过**模板字符串 + innerHTML + DOM 事件委托**构建。每个"组件"实际上是一个返回 HTML 字符串的函数，或直接操作 DOM 的过程式代码。

---

## UI 构建模式

### 1. 模板函数模式

最常用的模式。函数接收数据，返回 HTML 字符串，由调用方通过 `innerHTML` 插入 DOM。

```js
// public/app.js — renderEmpty (约第 806 行)
function renderEmpty(icon, title, subtitle) {
  return `
    <div class="empty-placeholder">
      <div class="empty-icon"><i class="${icon}"></i></div>
      <div class="empty-title">${title}</div>
      <div class="empty-subtitle">${subtitle}</div>
    </div>
  `;
}
```

```js
// public/app.js — renderTable (约第 429 行)
function renderTable(columns, rows) {
  const thCells = columns.map(c => `<th>${c.title}</th>`).join("");
  const trRows = rows.map(row => {
    const tdCells = columns.map(c => `<td>${c.render(row)}</td>`).join("");
    return `<tr>${tdCells}</tr>`;
  }).join("");
  return `<div class="table-wrap"><table><thead><tr>${thCells}</tr></thead><tbody>${trRows}</tbody></table></div>`;
}
```

### 2. 视图加载函数模式

每个导航视图对应一个 `async function load*()` 函数，负责获取数据并渲染到对应的 `<section>` 中。

```js
// public/app.js — viewLoaders 映射 (约第 151 行)
const viewLoaders = {
  overview: loadOverview,
  models: loadModels,
  skills: loadSkills,
  cron: loadCron,
  nodes: loadNodes,
  chat: loadChat,
  logs: initLogsView
};
```

### 3. 弹窗/对话框模式

弹窗使用 HTML 预定义壳 + JS 动态内容填充 + focus trap。

```js
// public/app.js — requestConfirmDialog (约第 290 行)
function requestConfirmDialog({ title, message, confirmText, cancelText, variant } = {}) {
  // 填充预定义的 #global-confirm-modal 元素
  // 返回 Promise<boolean>
}
```

---

## DOM 查询约定

- **`$(id)`**：`document.getElementById` 的短别名（`public/app.js` 第 161 行）
- **按 ID 查询**：用于获取视图容器、表单控件等固定元素
- **`querySelector` / `querySelectorAll`**：用于动态渲染后的元素查找
- **`data-*` 属性**：用于标记交互元素，如 `data-view`、`data-provider-card`、`data-secret-toggle`

---

## Form-Heavy Admin UI Pattern

模型管理、节点控制、技能配置这类后台页面属于 **data-dense admin UI**，应遵循下面的构建模式：

### 1. Visible labels first

- 输入框必须有可见 label 或 field title
- placeholder 只能作为示例，不能承担标签职责
- 技术字段（model id、provider key、base URL、路径、别名）尤其不能只靠 placeholder

### 2. Split values from policies

- 原始值输入（字符串、数字、URL）和策略选项（allow/default/enabled）不要混在同一视觉语言里
- 推荐结构：
  - 上层：字段输入
  - 下层：checkbox / radio 等策略项
- 不要为了“更酷”把 checkbox / radio 包装成一次性自定义发光 pill，除非仓库里已有共享控件可以复用

### 3. State expression should be explicit

- 普通内容标签（如模型名、provider 名）默认保持中性
- 状态要通过文案、icon、badge、helper text 来表达
- 不要把“可用 / 默认 / 选中”直接变成内容本身的语义色文本

### 4. Inline helper copy

- 当一个控件会影响配置写入行为时，必须在附近提供简短说明
- 例如：
  - “勾选后会写入 allowlist”
  - “保存后会更新默认模型”
- 这类说明比把控件做成复杂视觉形态更重要

### 5. Global form-control enhancement pattern

当后台表单需要把原生 `<select>` 或 `<input type="number">` 升级为统一视觉控件时，遵循当前模型管理页的“增强原生控件”模式，而不是在每个模板里手写完整的自定义 DOM：

- 原生控件仍然是**值的唯一真实来源**；自定义壳体只负责展示和交互。
- 通过全局增强器在渲染后包裹控件：
  - `select` → `.select-field-shell` + `.select-display` + `.select-dropdown`
  - `input[type="number"]` → `.number-field-shell` + `.number-stepper`
- 使用事件委托和 `data-*` 标记，而不是给每个字段单独绑监听：
  - `data-select-toggle`
  - `data-select-option`
  - `data-number-step`
- 程序化修改值后，必须继续派发 `input` 和 `change`，这样已有的脏检测、保存链路和 helper 行为才能复用。
- 只增强单选下拉；`multiple` 或 `size > 1` 的原生 `select` 保持原样。
- 遇到已经包裹过的控件，要用 `data-select-enhanced` / `data-number-enhanced` 这类标记防止重复增强。

```js
function enhanceSelectInput(select) {
  if (!(select instanceof HTMLSelectElement)) return;
  if (select.dataset.selectEnhanced === "true") return;
  if (select.multiple || Number(select.size || 0) > 1) return;

  const wrapper = document.createElement("div");
  wrapper.className = "select-field-shell";
  // 省略：插入 .select-display / .select-dropdown

  select.classList.add("select-native");
  select.tabIndex = -1;
  select.dataset.selectEnhanced = "true";
  select.addEventListener("change", () => syncCustomSelect(select));
}
```

**Why**:
- 模板仍然保持“输出原生表单结构”的可读性
- 统一交互由一套增强器接管，后续改样式或交互时不会散落在多个 modal 模板里
- 保留原生控件有利于状态同步、保存逻辑复用和可访问性兜底

---

## 样式约定

- **CSS 自定义属性体系**：所有颜色、阴影、动效时长等通过 `:root` 变量定义（`public/styles.css`）
- **暗色主题为默认**，亮色通过 `[data-theme="light"]` 覆盖
- **玻璃态设计语言**：`.glass-panel` 带 `backdrop-filter` 模糊效果
- **Spotlight 光效**：`[data-spotlight]` 属性标记可接收鼠标追踪光效的卡片
- **FontAwesome 6 图标**：全站使用 `<i class="fa-solid fa-*">` 语法
- **CSS 类名 kebab-case**，使用 BEM 变体：`.stat-card-icon-wrap`、`.panel-row-title-break`

---

## Accessibility

- **模态框 focus trap**：`captureModalFocus()` / `releaseModalFocus()` 实现 Tab 键循环（约第 361 行）
- **焦点恢复**：关闭弹窗后恢复到之前聚焦的元素
- **`aria-hidden`**：弹窗开关时同步设置
- **`prefers-reduced-motion`**：检测并禁用 spotlight 动画（约第 79 行）
- **键盘导航**：Enter 键提交表单、Escape 键关闭弹窗
- **表单控件可访问名**：checkbox / radio / icon-only 按钮必须有明确 label 或 `aria-label`

---

## Common Mistakes

- **不要使用 `eval()` 或 `Function()` 执行用户输入**：项目有专用 `evaluateArithmetic()` 安全解析器
- **不要忘记 `escapeHtml()`**：所有用户可控内容必须经过 `escapeHtml()` 转义后再插入 `innerHTML`
- **不要在 `innerHTML` 中使用未经 `sanitizeMarkdownHref()` 验证的链接**
- **不要使用 `document.write()`**：所有内容通过 `innerHTML` 或 `insertAdjacentHTML` 插入
- **不要创建全局变量**：所有状态集中在 `state` 对象或模块级 `const`/`let` 中
- **不要在模板字符串里直接复制一整套自定义下拉 DOM**：优先输出原生 `select`，再让全局增强器统一包裹和接管交互
