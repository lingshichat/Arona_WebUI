# Backend Architecture

> Arona WebUI backend: minimal Node.js HTTP server (`src/server.mjs`)

---

## Overview

A single-file server using raw `node:http` — **no framework**. Serves both the API and static files.

- **Entry point**: `src/server.mjs`
- **Port**: `18790` (env `PORT`)
- **Static files**: `public/` directory with path traversal protection
- **No database layer**: persistent state lives in gateway config / files, plus in-memory browser session tokens
- **Gateway-first**: most routes adapt HTTP requests to gateway RPC and reuse a pooled WebSocket session

---

## GatewaySession & Pool

The `GatewaySession` class manages the gateway wire protocol. HTTP handlers do **not** open a fresh socket per request; they lease a pooled session through `withGateway()`.

- Implements the gateway wire protocol (JSON frames with `type: "req"/"res"/"event"`, UUID `id` correlation)
- 15-second request timeout per gateway call
- `withGateway()` reuses a pooled session when alive, otherwise reconnects
- Idle pooled session is cleaned up by `GATEWAY_POOL_IDLE_MS` + `GATEWAY_POOL_CLEANUP_INTERVAL_MS`
- Connection URL from env `GATEWAY_URL` (default: `ws://100.68.146.126:18789`)

---

## Auth

Session-token auth stored in a `SESSIONS` Map.

- Token issued at `POST /api/login`
- Passed as `Authorization: Bearer <token>` on subsequent requests
- Token is an **opaque UUID session id**, not JWT
- Auth is **only enforced** when `GATEWAY_PASSWORD` or `GATEWAY_TOKEN` is configured
- If neither is set, all requests pass through without auth
- When auth is enabled, `/api/login` and `/api/health` stay public; other `/api/*` routes require a valid session and extend session TTL on each request

---

## API Routes

| Route | Method | Gateway? | Description |
|---|---|---|---|
| `/api/login` | POST | No | Issue session token |
| `/api/health` | GET | No | Health check |
| `/api/system-load` | GET | No | CPU/memory via `node:os` |
| `/api/gateway-auth` | GET | No | Return browser gateway WS bootstrap config |
| `/api/overview` | GET | Yes | Gateway overview stats |
| `/api/models` | GET | Yes | List models |
| `/api/models/save` | POST | Yes | Save model config |
| `/api/skills` | GET | Yes | List skills |
| `/api/skills/install` | POST | Yes | Install skill dependency bundle |
| `/api/skills/update` | POST | Yes | Update skill config |
| `/api/agents` | GET | Yes | List persona agents |
| `/api/agents/create\|update\|delete` | POST | Yes | Manage persona agents |
| `/api/agents/files` | GET | Yes | List persona/prompt files for an agent |
| `/api/agents/file` | GET/POST | Yes | Read or save a persona/prompt file |
| `/api/cron/list` | GET | Yes | List cron jobs (adds `schedule.human`) |
| `/api/cron/runs` | GET | Yes | List execution runs for one cron job |
| `/api/cron/add\|update\|remove\|run` | POST | Yes | Manage cron jobs |
| `/api/nodes` | GET | Yes | List nodes |
| `/api/nodes/describe` | GET | Yes | Fetch node details |
| `/api/nodes/invoke` | POST | Yes | Invoke node action |
| `/api/logs` | GET | Yes | Fetch logs (polled by frontend) |

---

## Configuration

Env vars (see `.env.example`):

| Var | Default | Description |
|---|---|---|
| `WEBUI_USERNAME` | `GATEWAY_USERNAME` or `admin` | Login username override |
| `WEBUI_PASSWORD` | `GATEWAY_PASSWORD`/`GATEWAY_TOKEN` | Login password override |
| `GATEWAY_URL` | `ws://100.68.146.126:18789` | Gateway WebSocket URL |
| `GATEWAY_USERNAME` | `admin` | WebUI login username |
| `GATEWAY_PASSWORD` | — | Gateway auth + WebUI password |
| `GATEWAY_TOKEN` | — | Alternative to password |
| `GATEWAY_ORIGIN` | `https://openclaw.lingshichat.top` | Origin header for gateway |
| `GATEWAY_PUBLIC_WS_URL` | — | Force browser-visible WS URL for `/api/gateway-auth` |
| `SESSION_TTL_MS` | `86400000` | Browser session TTL |
| `SESSION_CLEANUP_INTERVAL_MS` | `300000` | Expired session cleanup interval |
| `GATEWAY_POOL_IDLE_MS` | `30000` | Close pooled gateway session after this idle time |
| `GATEWAY_POOL_CLEANUP_INTERVAL_MS` | `10000` | Idle gateway cleanup interval |
| `PORT` | `18790` | Server port |

Notes:

- `.env.local` only fills keys that are missing from `process.env`; it never overwrites existing env.
- **`.env.local` 包含完整的本地开发凭证**（WEBUI 登录 + 网关鉴权），可用于直接请求服务器 API 调试，无需手动操作浏览器。
- Production server also reads `/root/.openclaw/openclaw.json` as fallback.
- Browser Chat bootstrap uses `GATEWAY_PUBLIC_WS_URL` first, then reverse-proxy headers, then `GATEWAY_URL`.

---

## OpenClaw Gateway Source

`openclaw-src/` 包含 OpenClaw 网关完整源码，可用于分析网关 RPC 协议和数据结构。当需要了解某个 gateway method 的返回格式时，应直接查阅网关源码而非猜测。

已知数据结构：
- `cron.runs` → `{ entries: [{ ts, jobId, action, status, error, runAtMs, durationMs, nextRunAtMs, model, provider, usage, ... }] }`

---

## Patch Files

`patch_*.cjs` and `src/server_patch*.mjs` are **historical migration scripts**. They are not part of the running application. Do not modify or execute unless reapplying a specific transformation.
