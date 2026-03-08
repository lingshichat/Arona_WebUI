# Arona WebUI

A single-page admin dashboard for [OpenClaw](https://github.com/nicepkg/openclaw) AI gateway.
Monitor, configure, and interact with your OpenClaw instance from the browser.

**English** | [中文](./README.zh-CN.md)

<!-- ![Dashboard](docs/screenshots/dashboard.png) -->

## Features

- **Dashboard** — system overview with real-time CPU / memory monitoring
- **Model Management** — configure AI model providers and routing
- **Skills** — manage agent skills and API keys
- **Cron Jobs** — scheduled tasks (cron / at / interval) with run history
- **Chat Playground** — real-time chat with gateway sessions via WebSocket
- **Persona & Prompts** — agent identity and prompt file management
- **Node Topology** — device and node monitoring
- **Usage Stats** — model and channel usage analytics
- **Live Logs** — real-time log streaming with keyword search

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A running [OpenClaw](https://github.com/nicepkg/openclaw) gateway instance

## Quick Start

```bash
git clone https://github.com/nicepkg/arona-webui.git
cd arona-webui
npm install
```

Create a `.env.local` (or export env vars) with your gateway connection info:

```env
GATEWAY_URL=ws://127.0.0.1:18789
GATEWAY_PASSWORD=your-gateway-password
```

Start the server:

```bash
npm start
# Open http://localhost:18790
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `GATEWAY_URL` | `ws://127.0.0.1:18789` | Gateway WebSocket URL |
| `GATEWAY_USERNAME` | `admin` | WebUI login username |
| `GATEWAY_PASSWORD` | — | Gateway password |
| `GATEWAY_TOKEN` | — | Alternative: token-based auth |
| `GATEWAY_ORIGIN` | `http://localhost:18790` | Allowed browser origin for CORS |
| `GATEWAY_PUBLIC_WS_URL` | *(auto-detected)* | Override the WebSocket URL sent to browser clients |
| `PORT` | `18790` | Server listen port |

> **Note**: `GATEWAY_PASSWORD` and `GATEWAY_TOKEN` are mutually exclusive — set one or the other depending on your gateway auth mode.

## Screenshots

<!-- Replace the commented-out image references below with actual screenshots -->

<!-- ![Dashboard](docs/screenshots/dashboard.png) -->
<!-- ![Models](docs/screenshots/models.png) -->
<!-- ![Chat Playground](docs/screenshots/chat.png) -->
<!-- ![Persona Editor](docs/screenshots/persona.png) -->

## Tech Stack

- **Backend** — Node.js (`node:http`, no framework)
- **Frontend** — vanilla JavaScript ES modules, no build step
- **Transport** — WebSocket (gateway control protocol)
- **Styling** — CSS custom properties with dark / light theme support

## License

MIT
