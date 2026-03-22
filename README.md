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

### Windows

1. Install [Node.js](https://nodejs.org/) 18+ (if not already) / 安装 [Node.js](https://nodejs.org/) 18+
2. Download `arona-webui-latest.zip` from [Latest Release](https://github.com/lingshichat/Arona_WebUI/releases/latest) / 从 [最新发行版](https://github.com/lingshichat/Arona_WebUI/releases/latest) 下载 `.zip`
3. Extract the zip / 解压
4. Double-click **`start.bat`** / 双击 **`start.bat`**（首次会自动安装依赖）
5. Browser opens automatically → Setup Wizard / 浏览器自动打开 → 配置向导

### macOS / Linux

```bash
# 1. Install Node.js 18+ (if not already)
#    macOS: brew install node
#    Ubuntu: sudo apt install -y nodejs

# 2. Download & extract latest release / 下载解压最新发行包
curl -fsSL https://github.com/lingshichat/Arona_WebUI/releases/latest/download/arona-webui-latest.tar.gz \
  | tar xz
cd arona-webui-*/

# 3. Start (auto-installs dependencies on first run) / 启动（首次自动安装依赖）
./start.sh
```

### First-run Setup / 首次配置

On first launch, the browser will open the **Setup Wizard** automatically:

首次启动时，浏览器会自动打开**配置向导**：

1. **Fill in your gateway info / 填写网关信息** — Gateway URL (`ws://127.0.0.1:18789`), password or token, username
2. **Test connection / 测试连接** — Click "测试连接" to verify
3. **Save & restart / 保存重启** — WebUI restarts and connects to your gateway
4. **(Optional) Patch gateway / 配置网关** — Set `allowedOrigins` and `dangerouslyDisableDeviceAuth` on your gateway

> You can also skip the wizard and configure manually: `cp .env.example .env.local` then edit.
>
> 也可以跳过向导手动配置：`cp .env.example .env.local` 然后编辑。

### Gateway-side preparation / 网关侧准备

If your gateway uses **non-loopback** access (e.g. LAN or Docker), you may need to configure it:

如果网关不是 loopback 访问（如局域网或 Docker），可能需要在网关侧配置：

```json5
// ~/.openclaw/openclaw.json
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:18790"],
      dangerouslyDisableDeviceAuth: true  // required for Arona WebUI
    }
  }
}
```

Or use `openclaw config set` / 或通过命令设置：

```bash
openclaw config set gateway.controlUi.allowedOrigins '["http://localhost:18790"]'
openclaw config set gateway.controlUi.dangerouslyDisableDeviceAuth true
```

> The Setup Wizard (Step 3) can also apply these settings automatically via WebSocket.
>
> 配置向导第 3 步也可以通过 WebSocket 自动应用这些设置。

> Default port is `18790`. To change it, edit `PORT=<your-port>` in `.env.local`.
>
> 默认端口 `18790`。如需修改，在 `.env.local` 中设置 `PORT=<端口号>`。

---

## Other Install Methods / 其他安装方式

<details>
<summary><b>One-line Install Script / 一键安装脚本</b></summary>

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/lingshichat/Arona_WebUI/main/scripts/install.sh)
```

Downloads the latest release, extracts it, and walks you through configuring `.env.local` interactively.

下载最新发行包、解压、交互式配置 `.env.local`。

</details>

<details>
<summary><b>Docker</b></summary>

```bash
git clone https://github.com/lingshichat/Arona_WebUI.git
cd Arona_WebUI
docker compose up -d
# Open http://localhost:18790 → Setup Wizard
```

Gateway on another machine / 网关在其他机器上：

```bash
GATEWAY_URL=ws://192.168.1.100:18789 GATEWAY_PASSWORD=xxx docker compose up -d
```

> **Linux host gateway / Linux 宿主机网关**: Uncomment `extra_hosts` in `docker-compose.yml`, or use `network_mode: host`.
>
> **Linux 宿主机网关**: 取消 `docker-compose.yml` 中 `extra_hosts` 的注释，或使用 `network_mode: host`。

</details>

<details>
<summary><b>Manual / 手动安装（开发者）</b></summary>

```bash
git clone https://github.com/lingshichat/Arona_WebUI.git
cd Arona_WebUI
./start.sh        # auto-installs deps + starts server / 自动安装依赖并启动
# Or: npm install && npm start
# Open http://localhost:18790 → Setup Wizard
```

</details>

## Setup Wizard / 配置向导

On first launch, the browser auto-redirects to the Setup Wizard. You can also open it manually:

首次启动时浏览器会自动跳转到配置向导，也可以手动访问：

```
http://localhost:18790/setup.html
```

The wizard guides you through: WebUI config → connection check → gateway config.

向导流程：WebUI 配置 → 连接检测 → 网关配置（bind / allowedOrigins / disableDeviceAuth）。

> Setup APIs are localhost-only (403 from remote). / Setup API 仅限本机访问。

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
