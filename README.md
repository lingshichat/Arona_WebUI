<div align="center">

# Arona WebUI

A single-page admin dashboard for [OpenClaw](https://github.com/nicepkg/openclaw) AI gateway.
Monitor, configure, and interact with your OpenClaw instance from the browser.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

</div>

---

## Features / 功能一览

- **Dashboard / 仪表盘** — Real-time CPU & memory monitoring / 实时 CPU 与内存监控
<img width="2560" height="1347" alt="Dashboard" src="https://github.com/user-attachments/assets/8d5aacdd-a6a7-4f95-a69f-b81b2440c8e3" />

- **Model Management / 模型管理** — Configure AI model providers and routing / 配置 AI 模型供应商与路由规则
<img width="2560" height="1346" alt="Models" src="https://github.com/user-attachments/assets/ff37b8bf-d063-4be2-b7e9-6895b45834eb" />

- **Skills / 技能** — Manage agent skills and API keys / 管理 Agent 技能与 API 密钥
<img width="2560" height="1339" alt="Skills" src="https://github.com/user-attachments/assets/53f10f4d-44b9-475a-bef1-bfc0834a184c" />

- **Cron Jobs / 定时任务** — Scheduled tasks with run history / 计划任务（cron / at / interval）及执行记录
<img width="2560" height="1344" alt="Cron" src="https://github.com/user-attachments/assets/60ad6ed1-a8b0-4aa2-8e8b-5195c70b53f5" />

- **Chat Playground / 聊天广场** — Real-time chat via WebSocket / 通过 WebSocket 与网关会话实时对话
<img width="2560" height="1337" alt="Chat" src="https://github.com/user-attachments/assets/cbeae770-23e4-41cb-a43e-8b58eda9fc9d" />

- **Persona & Prompts / 人设与提示词** — Agent identity and prompt file management / Agent 身份与提示词文件管理
<img width="2560" height="1341" alt="Persona" src="https://github.com/user-attachments/assets/c907776d-184c-42d2-9b40-b710506b09b4" />

- **Node Topology / 节点拓扑** — Device and node monitoring / 设备与节点状态监控
<img width="2560" height="1340" alt="Nodes" src="https://github.com/user-attachments/assets/dfb43347-cc8a-4b84-aad5-f0e1bfb71180" />

- **Usage Stats / 用量统计** — Model and channel usage analytics / 模型与通道使用分析
<img width="2560" height="1337" alt="Usage" src="https://github.com/user-attachments/assets/31846c72-a3dc-420b-9003-8e62fa6d2c70" />

- **Live Logs / 实时日志** — Log streaming with keyword search / 日志流式查看与关键字搜索
<img width="2560" height="1331" alt="Logs" src="https://github.com/user-attachments/assets/a28898bd-bc5f-4e9e-86d7-845e2694c94b" />

---

## Prerequisites / 前置条件

- [Node.js](https://nodejs.org/) 18+
- A running [OpenClaw](https://github.com/nicepkg/openclaw) gateway instance / 一个正在运行的 OpenClaw 网关实例

## Quick Start / 快速开始

```bash
git clone https://github.com/nicepkg/arona-webui.git
cd arona-webui
npm install
```

Create `.env.local` with your gateway connection info / 创建 `.env.local` 填写网关连接信息：

```env
GATEWAY_URL=ws://127.0.0.1:18789
GATEWAY_PASSWORD=your-gateway-password
```

Start the server / 启动服务：

```bash
npm start
# Open / 打开 http://localhost:18790
```

## Configuration / 配置项

| Variable / 变量 | Default / 默认值 | Description / 说明 |
|---|---|---|
| `GATEWAY_URL` | `ws://127.0.0.1:18789` | Gateway WebSocket URL / 网关 WebSocket 地址 |
| `GATEWAY_USERNAME` | `admin` | WebUI login username / 登录用户名 |
| `GATEWAY_PASSWORD` | — | Gateway password / 网关密码 |
| `GATEWAY_TOKEN` | — | Token-based auth (alternative) / Token 鉴权（替代方式） |
| `GATEWAY_ORIGIN` | `http://localhost:18790` | Allowed browser origin (CORS) / 允许的浏览器来源 |
| `GATEWAY_PUBLIC_WS_URL` | *(auto)* | Override WS URL for browser / 覆盖浏览器端 WebSocket 地址 |
| `PORT` | `18790` | Server listen port / 服务监听端口 |

> `GATEWAY_PASSWORD` and `GATEWAY_TOKEN` are mutually exclusive.
>
> `GATEWAY_PASSWORD` 与 `GATEWAY_TOKEN` 二选一，取决于网关鉴权模式。

## Tech Stack / 技术栈

| Layer / 层 | Tech / 技术 |
|---|---|
| Backend / 后端 | Node.js (`node:http`, no framework / 无框架) |
| Frontend / 前端 | Vanilla JS ES modules, no build step / 原生 JS，无需构建 |
| Transport / 通信 | WebSocket (gateway control protocol / 网关控制协议) |
| Styling / 样式 | CSS custom properties, dark & light theme / CSS 变量，深色与浅色主题 |

## License / 许可证

This project is licensed under the [MIT License](./LICENSE).

本项目基于 [MIT 许可证](./LICENSE) 开源。

```
MIT License

Copyright (c) 2026 Arona WebUI Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
