# Quality Guidelines

> Arona WebUI 前端代码质量标准。

---

## Overview

项目无 linter、无 formatter、无测试框架。代码质量靠**约定和安全编码模式**维护。

---

## Forbidden Patterns

| 禁止模式 | 原因 | 替代方案 |
|---|---|---|
| `eval()` / `new Function()` | XSS 和代码注入风险 | `evaluateArithmetic()` 安全解析器 |
| 未转义的 `innerHTML` 赋值 | XSS 风险 | 先通过 `escapeHtml()` 转义 |
| `document.write()` | 会覆盖整个页面 | `innerHTML` / `insertAdjacentHTML` |
| 全局变量（挂 `window`） | 命名冲突和泄漏 | 模块级 `const`/`let` 或 `state` 对象 |
| 内联 `onclick="..."` 属性 | 不安全、难维护 | `addEventListener` 或事件委托（`login.html` 中的 `onclick` 是历史遗留） |
| 未验证的用户输入 URL | 开放重定向风险 | `sanitizeMarkdownHref()` 验证协议 |

---

## Required Patterns

### 1. XSS 防护

所有动态内容插入 `innerHTML` 前必须经过 `escapeHtml()` 转义：

```js
// 正确
container.innerHTML = `<span>${escapeHtml(userInput)}</span>`;

// 错误 — 永远不要这样做
container.innerHTML = `<span>${userInput}</span>`;
```

### 2. 链接安全

Markdown 渲染中的链接必须通过 `sanitizeMarkdownHref()` 验证，只允许 `https?://`、`mailto:` 和 `/` 开头的 URL。

### 3. API 调用统一入口

所有后端 API 请求必须通过 `api()` 辅助函数，确保：
- 自动附加 `Authorization: Bearer` header
- 401 响应时自动清除 token 并跳转登录页
- 统一错误处理

### 4. 定时器生命周期管理

启动的 `setInterval` / `setTimeout` 必须在视图切换时清理：

```js
// public/app.js — 约第 795 行
function stopOverviewTimers() {
  if (state.systemTimer) {
    clearInterval(state.systemTimer);
    state.systemTimer = null;
  }
}
```

### 5. 模态框可访问性

所有模态框/弹窗必须：
- 使用 `captureModalFocus()` 捕获焦点
- 关闭时使用 `releaseModalFocus()` 恢复焦点
- 设置 `aria-hidden` 属性
- 支持 Escape 键关闭

### 6. 表单质量要求

- 每个输入控件都需要可见 label；placeholder 不能代替 label
- 错误信息应尽量贴近对应字段，并在需要时用 `aria-live` / `role="alert"` 让读屏可感知
- 不要只靠颜色表达状态或错误
- 技术输入不要阻止 paste
- 技术输入应根据场景设置合适的 `type`、`autocomplete`、`spellcheck`
  - 例如 URL 用 `type="text"` 或 `type="url"` 时要确保可读
  - 代码 / 模型 ID / provider key 可考虑 `spellcheck="false"`

---

## Testing Requirements

项目当前**没有自动化测试**。代码质量通过以下方式保证：
- 手动浏览器测试
- `npm start` 启动后在浏览器中验证各视图功能
- 安全编码模式（escapeHtml 等）从源头防止漏洞

---

## Code Review Checklist

- [ ] 所有动态 HTML 内容是否经过 `escapeHtml()` 转义？
- [ ] API 调用是否使用 `api()` 辅助函数？
- [ ] 新增定时器是否在视图切换时正确清理？
- [ ] 弹窗是否正确管理焦点（`captureModalFocus` / `releaseModalFocus`）？
- [ ] UI 文本是否使用中文？
- [ ] CSS 是否使用已有的自定义属性（`--accent`、`--surface` 等）而非硬编码颜色？
- [ ] 新增元素是否遵循 `.glass-panel` / `.stat-card` 等已有设计模式？
- [ ] 表单是否有可见 label，而不是只靠 placeholder？
- [ ] 状态和错误是否不是只靠颜色表达？
- [ ] checkbox / radio / icon-only 按钮是否有清晰可访问名称？
- [ ] 是否尊重 `prefers-reduced-motion` 设置？
