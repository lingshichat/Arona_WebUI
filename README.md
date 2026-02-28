# OpenClaw MVP Console

A minimal single-page dashboard for OpenClaw with six modules:

- Overview
- Models
- Skills
- Cron
- Nodes
- Logs

## Runtime

- Local bind: `127.0.0.1:18790`
- Service: `openclaw-mvp.service`
- Public access: `https://openclaw.lingshichat.top` (protected by Nginx BasicAuth)

## Local commands

```bash
cd /root/clawd/openclaw-mvp
npm install
npm start
```

## Systemd commands

```bash
systemctl status openclaw-mvp
systemctl restart openclaw-mvp
journalctl -u openclaw-mvp -f
```

## API routes

- `GET /api/health`
- `GET /api/overview`
- `GET /api/models`
- `POST /api/models/save`
- `GET /api/skills`
- `POST /api/skills/update`
- `GET /api/cron/list`
- `GET /api/cron/runs?jobId=...`
- `POST /api/cron/add`
- `POST /api/cron/update`
- `POST /api/cron/remove`
- `POST /api/cron/run`
- `GET /api/nodes`
- `GET /api/nodes/describe?nodeId=...`
- `POST /api/nodes/invoke`
- `GET /api/logs`
