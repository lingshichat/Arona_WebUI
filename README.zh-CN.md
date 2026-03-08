# Arona WebUI

[OpenClaw](https://github.com/nicepkg/openclaw) AI 网关的单页管理面板。
在浏览器中监控、配置并与 OpenClaw 实例交互。

[**English**](./README.md) | **中文**

<!-- ![仪表盘](docs/screenshots/dashboard.png) -->

## 功能一览

- **仪表盘** — 系统总览，实时 CPU / 内存监控
- **模型管理** — 配置 AI 模型供应商与路由规则
- **技能** — 管理 Agent 技能与 API 密钥
- **定时任务** — 计划任务（cron / at / interval）及执行记录
- **聊天广场** — 通过 WebSocket 与网关会话实时对话
- **人设 & 提示词** — Agent 身份与提示词文件管理
- **节点拓扑** — 设备与节点状态监控
- **用量统计** — 模型与通道使用分析
- **实时日志** — 日志流式查看与关键字搜索

## 前置条件

- [Node.js](https://nodejs.org/) 18+
- 一个正在运行的 [OpenClaw](https://github.com/nicepkg/openclaw) 网关实例

## 快速开始

```bash
git clone https://github.com/nicepkg/arona-webui.git
cd arona-webui
npm install
```

创建 `.env.local`（或导出环境变量）填写网关连接信息：

```env
GATEWAY_URL=ws://127.0.0.1:18789
GATEWAY_PASSWORD=your-gateway-password
```

启动服务：

```bash
npm start
# 浏览器打开 http://localhost:18790
```

## 配置项

| 变量 | 默认值 | 说明 |
|---|---|---|
| `GATEWAY_URL` | `ws://127.0.0.1:18789` | 网关 WebSocket 地址 |
| `GATEWAY_USERNAME` | `admin` | WebUI 登录用户名 |
| `GATEWAY_PASSWORD` | — | 网关密码 |
| `GATEWAY_TOKEN` | — | 替代方式：Token 鉴权 |
| `GATEWAY_ORIGIN` | `http://localhost:18790` | 允许的浏览器来源（CORS） |
| `GATEWAY_PUBLIC_WS_URL` | *（自动检测）* | 覆盖发送给浏览器客户端的 WebSocket 地址 |
| `PORT` | `18790` | 服务监听端口 |

> **提示**：`GATEWAY_PASSWORD` 和 `GATEWAY_TOKEN` 二选一，取决于网关的鉴权模式。

## 截图

<!-- 替换下方注释为实际截图 -->

<!-- ![仪表盘](docs/screenshots/dashboard.png) -->
<!-- ![模型管理](docs/screenshots/models.png) -->
<!-- ![聊天广场](docs/screenshots/chat.png) -->
<!-- ![人设编辑](docs/screenshots/persona.png) -->

## 技术栈

- **后端** — Node.js（`node:http`，无框架）
- **前端** — 原生 JavaScript ES Modules，无需构建
- **通信** — WebSocket（网关控制协议）
- **样式** — CSS 自定义属性，支持深色 / 浅色主题

## 许可证

MIT
