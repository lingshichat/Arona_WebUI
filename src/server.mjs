import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { fileURLToPath } from "node:url";
import cronstruePlugin from "cronstrue/i18n.js";
const cronstrue = cronstruePlugin.default || cronstruePlugin;
import { WebSocket } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const SESSIONS = new Map(); 

function createToken() {
  const token = crypto.randomUUID();
  SESSIONS.set(token, { createdAt: Date.now() });
  return token;
}

function isValidToken(token) {
  if (!token) return false;
  return SESSIONS.has(token);
}

async function handleLogin(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }
  try {
    const body = await parseBody(req);
    const username = body.username;
    const password = body.password;
    
    // Read credentials from env/config instead of hardcoding secrets in source.
    const validUsername = process.env.GATEWAY_USERNAME || "admin";
    const validPassword = gatewayConfig.password || gatewayConfig.token || "";
    
    if (username === validUsername && (validPassword ? password === validPassword : true)) {
      const token = createToken();
      jsonResponse(res, 200, { ok: true, token });
    } else {
      jsonResponse(res, 401, { ok: false, error: "阿洛娜不认识这个账号或密码哦...请老师核对一下！(>_<)" });
    }
  } catch (err) {
    jsonResponse(res, 500, { ok: false, error: err.message });
  }
}

const publicDir = path.join(__dirname, "..", "public");

function loadGatewayDefaults() {
  const defaults = {
    url: "ws://100.68.146.126:18789",
    origin: "https://openclaw.lingshichat.top",
    password: "",
    token: ""
  };

  try {
    const raw = fs.readFileSync("/root/.openclaw/openclaw.json", "utf8");
    const config = JSON.parse(raw);
    const remoteUrl = config?.gateway?.remote?.url;
    if (typeof remoteUrl === "string" && remoteUrl.trim()) defaults.url = remoteUrl.trim();

    const allowedOrigin = config?.gateway?.controlUi?.allowedOrigins?.[0];
    if (typeof allowedOrigin === "string" && allowedOrigin.trim()) defaults.origin = allowedOrigin.trim();

    const password = config?.gateway?.auth?.password;
    const token = config?.gateway?.auth?.token;
    defaults.password = typeof password === "string" ? password : "";
    defaults.token = typeof token === "string" ? token : "";
  } catch {
    // Keep hardcoded defaults when local config is not available.
  }

  return defaults;
}

const gatewayDefaults = loadGatewayDefaults();
const gatewayConfig = {
  url: process.env.GATEWAY_URL || gatewayDefaults.url,
  origin: process.env.GATEWAY_ORIGIN || gatewayDefaults.origin,
  password: process.env.GATEWAY_PASSWORD ?? gatewayDefaults.password,
  token: process.env.GATEWAY_TOKEN ?? gatewayDefaults.token
};

const PORT = Number.parseInt(process.env.PORT || "18790", 10);

let previousCpuTimes = null;

function sampleCpuTimes() {
  const cpus = os.cpus();
  const totalIdle = cpus.reduce((sum, cpu) => sum + cpu.times.idle, 0);
  const totalTick = cpus.reduce(
    (sum, cpu) => sum + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle,
    0
  );
  return { idle: totalIdle, total: totalTick };
}

function readCpuUsage() {
  const current = sampleCpuTimes();
  if (!previousCpuTimes) {
    previousCpuTimes = current;
    return null;
  }

  const idleDiff = current.idle - previousCpuTimes.idle;
  const totalDiff = current.total - previousCpuTimes.total;
  previousCpuTimes = current;

  if (totalDiff <= 0) return null;
  return Math.max(0, Math.min(100, Number((((totalDiff - idleDiff) / totalDiff) * 100).toFixed(1))));
}

function readSystemLoad() {
  const cpuUsagePercent = readCpuUsage();
  const cpuCount = os.cpus().length || 1;
  const [load1, load5, load15] = os.loadavg();
  const memoryTotal = os.totalmem();
  const memoryFree = os.freemem();
  const memoryUsed = memoryTotal - memoryFree;
  const memoryUsagePercent = Number(((memoryUsed / memoryTotal) * 100).toFixed(1));

  return {
    cpu: {
      usagePercent: cpuUsagePercent,
      load1: Number(load1.toFixed(2)),
      load5: Number(load5.toFixed(2)),
      load15: Number(load15.toFixed(2)),
      cores: cpuCount,
      normalizedLoadPercent: Number(Math.min(100, (load1 / cpuCount) * 100).toFixed(1))
    },
    memory: {
      totalBytes: memoryTotal,
      usedBytes: memoryUsed,
      freeBytes: memoryFree,
      usagePercent: memoryUsagePercent
    },
    updatedAt: Date.now()
  };
}

previousCpuTimes = sampleCpuTimes();

class GatewaySession {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.pending = new Map();
    this.connected = false;
    this.connectResolve = null;
    this.connectReject = null;
    this.connectPromise = null;
    this.closed = false;
  }

  async connect() {
    if (this.connected) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;

      this.ws = new WebSocket(this.config.url, { origin: this.config.origin });
      this.ws.on("open", () => this.sendConnect());
      this.ws.on("message", (raw) => this.handleMessage(raw.toString()));
      this.ws.on("error", (err) => this.failConnect(err));
      this.ws.on("close", (code, reason) => {
        const message = `gateway websocket closed (${code}): ${reason.toString() || "no reason"}`;
        this.failConnect(new Error(message));
        this.rejectPending(new Error(message));
        this.connected = false;
      });
    });

    return this.connectPromise;
  }

  failConnect(err) {
    if (this.connected || this.closed) return;
    if (this.connectReject) this.connectReject(err instanceof Error ? err : new Error(String(err)));
    this.connectResolve = null;
    this.connectReject = null;
    this.connectPromise = null;
  }

  sendConnect() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const params = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: "openclaw-control-ui",
        version: "mvp-0.1",
        platform: process.platform,
        mode: "ui"
      },
      role: "operator",
      scopes: ["operator.read", "operator.write", "operator.admin"],
      caps: []
    };

    const auth = {};
    if (this.config.password) auth.password = this.config.password;
    if (this.config.token) auth.token = this.config.token;
    if (Object.keys(auth).length > 0) params.auth = auth;

    const frame = {
      type: "req",
      id: crypto.randomUUID(),
      method: "connect",
      params
    };

    this.ws.send(JSON.stringify(frame));
  }

  handleMessage(raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }

    if (message?.type === "event" && message.event === "connect.challenge") {
      this.sendConnect();
      return;
    }

    if (message?.type !== "res") return;

    if (!this.connected && message.ok && message.payload?.type === "hello-ok") {
      this.connected = true;
      if (this.connectResolve) this.connectResolve(message.payload);
      this.connectResolve = null;
      this.connectReject = null;
      this.connectPromise = null;
      return;
    }

    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);

    if (message.ok) {
      pending.resolve(message.payload);
    } else {
      pending.reject(new Error(message.error?.message || "gateway request failed"));
    }
  }

  request(method, params = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.connected) {
      return Promise.reject(new Error("gateway session not connected"));
    }

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ type: "req", id, method, params }));

      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`gateway request timeout: ${method}`));
      }, 15000);
    });
  }

  rejectPending(error) {
    for (const [, pending] of this.pending) pending.reject(error);
    this.pending.clear();
  }

  close() {
    this.closed = true;
    this.rejectPending(new Error("gateway session closed"));
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) this.ws.close();
  }
}

async function withGateway(fn) {
  const session = new GatewaySession(gatewayConfig);
  await session.connect();
  try {
    return await fn(session);
  } finally {
    session.close();
  }
}

function jsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) req.destroy(new Error("payload too large"));
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error(`invalid JSON body: ${err.message}`));
      }
    });
    req.on("error", reject);
  });
}

function sendFile(res, filePath) {
  try {
    const ext = path.extname(filePath);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp"
    };

    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}

async function handleApi(req, res, pathname, query) {
  try {
    if (req.method === "GET" && pathname === "/api/health") {
      return jsonResponse(res, 200, {
        ok: true,
        gateway: {
          url: gatewayConfig.url,
          origin: gatewayConfig.origin,
          authMode: gatewayConfig.password || gatewayConfig.token ? "enabled" : "none"
        }
      });
    }

    if (req.method === "GET" && pathname === "/api/system-load") {
      return jsonResponse(res, 200, {
        ok: true,
        system: readSystemLoad()
      });
    }

    if (req.method === "GET" && pathname === "/api/overview") {
      const data = await withGateway(async (gateway) => {
        const [status, channels, sessions, cronStatus, cronList, nodes, usage] = await Promise.all([
          gateway.request("status", {}),
          gateway.request("channels.status", {}),
          gateway.request("sessions.list", { limit: 20, includeLastMessage: true }),
          gateway.request("cron.status", {}),
          gateway.request("cron.list", {}),
          gateway.request("node.list", {}),
          gateway.request("usage.status", {}).catch(() => null)
        ]);

        const logs = await gateway.request("logs.tail", { limit: 60 }).catch(() => ({ lines: [] }));

        return {
          status,
          channels,
          sessions,
          cronStatus,
          cronList,
          nodes,
          usage,
          logs,
          fetchedAt: Date.now()
        };
      });
      return jsonResponse(res, 200, data);
    }

    if (req.method === "GET" && pathname === "/api/models") {
      const data = await withGateway(async (gateway) => {
        const [modelList, config] = await Promise.all([
          gateway.request("models.list", {}),
          gateway.request("config.get", {})
        ]);
        return {
          modelList,
          configHash: config.hash,
          modelsConfig: config.parsed?.models || {}
        };
      });
      return jsonResponse(res, 200, data);
    }

    if (req.method === "POST" && pathname === "/api/models/save") {
      const body = await parseBody(req);
      const payload = {
        models: body.models || {}
      };
      const result = await withGateway((gateway) =>
        gateway.request("config.patch", {
          raw: JSON.stringify(payload, null, 2),
          baseHash: body.baseHash,
          note: "MVP dashboard updated model/provider config"
        })
      );
      return jsonResponse(res, 200, { ok: true, result });
    }

    if (req.method === "GET" && pathname === "/api/skills") {
      const data = await withGateway((gateway) => gateway.request("skills.status", {}));
      return jsonResponse(res, 200, data);
    }

    if (req.method === "POST" && pathname === "/api/skills/update") {
      const body = await parseBody(req);
      const result = await withGateway((gateway) =>
        gateway.request("skills.update", {
          skillKey: body.skillKey,
          enabled: body.enabled,
          apiKey: body.apiKey,
          env: body.env
        })
      );
      return jsonResponse(res, 200, { ok: true, result });
    }

    if (req.method === "GET" && pathname === "/api/cron/list") {
      const includeDisabled = query.get("includeDisabled") === "true";
      const data = await withGateway((gateway) => gateway.request("cron.list", { includeDisabled }));
      
      // Inject human readable descriptions
      if (data && data.jobs) {
        data.jobs = data.jobs.map(job => {
          if (job.schedule && job.schedule.kind === 'cron' && job.schedule.expr) {
             try {
               job.schedule.human = cronstrue.toString(job.schedule.expr, { locale: "zh_CN" });
             } catch(e) {
               // ignore invalid cron
             }
          }
          return job;
        });
      }
      return jsonResponse(res, 200, data);
    }

    if (req.method === "GET" && pathname === "/api/cron/runs") {
      const jobId = query.get("jobId");
      if (!jobId) return jsonResponse(res, 400, { ok: false, error: "jobId required" });
      const data = await withGateway((gateway) => gateway.request("cron.runs", { jobId }));
      return jsonResponse(res, 200, data);
    }

    if (req.method === "POST" && pathname === "/api/cron/add") {
      const body = await parseBody(req);
      const data = await withGateway((gateway) => gateway.request("cron.add", { job: body.job }));
      return jsonResponse(res, 200, { ok: true, data });
    }

    if (req.method === "POST" && pathname === "/api/cron/update") {
      const body = await parseBody(req);
      const data = await withGateway((gateway) =>
        gateway.request("cron.update", { jobId: body.jobId, patch: body.patch })
      );
      return jsonResponse(res, 200, { ok: true, data });
    }

    if (req.method === "POST" && pathname === "/api/cron/remove") {
      const body = await parseBody(req);
      const data = await withGateway((gateway) => gateway.request("cron.remove", { jobId: body.jobId }));
      return jsonResponse(res, 200, { ok: true, data });
    }

    if (req.method === "POST" && pathname === "/api/cron/run") {
      const body = await parseBody(req);
      const data = await withGateway((gateway) => gateway.request("cron.run", { jobId: body.jobId }));
      return jsonResponse(res, 200, { ok: true, data });
    }

    if (req.method === "GET" && pathname === "/api/nodes") {
      const data = await withGateway((gateway) => gateway.request("node.list", {}));
      return jsonResponse(res, 200, data);
    }

    if (req.method === "GET" && pathname === "/api/nodes/describe") {
      const nodeId = query.get("nodeId");
      if (!nodeId) return jsonResponse(res, 400, { ok: false, error: "nodeId required" });
      const data = await withGateway((gateway) => gateway.request("node.describe", { nodeId }));
      return jsonResponse(res, 200, data);
    }

    if (req.method === "POST" && pathname === "/api/nodes/invoke") {
      const body = await parseBody(req);
      const data = await withGateway((gateway) =>
        gateway.request("node.invoke", {
          nodeId: body.nodeId,
          command: body.command,
          params: body.params,
          timeoutMs: body.timeoutMs,
          idempotencyKey: crypto.randomUUID()
        })
      );
      return jsonResponse(res, 200, data);
    }

    if (req.method === "GET" && pathname === "/api/logs") {
      const cursorRaw = query.get("cursor");
      const limitRaw = query.get("limit");
      const params = {};
      if (cursorRaw !== null && cursorRaw !== "") params.cursor = Number.parseInt(cursorRaw, 10);
      if (limitRaw !== null && limitRaw !== "") params.limit = Number.parseInt(limitRaw, 10);
      const data = await withGateway((gateway) => gateway.request("logs.tail", params));
      return jsonResponse(res, 200, data);
    }

    return jsonResponse(res, 404, { ok: false, error: "API endpoint not found" });
  } catch (error) {
    return jsonResponse(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/")) {
    if (pathname === "/api/login") {
      await handleLogin(req, res);
      return;
    }
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const hasConfiguredAuth = !!(gatewayConfig.password || gatewayConfig.token);
    
    if (hasConfiguredAuth && !isValidToken(token) && pathname !== "/api/health") {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
      return;
    }
    
    await handleApi(req, res, pathname, url.searchParams);
    return;
  }

  const safePath = pathname === "/" ? "/index.html" : pathname;
  const targetFile = path.normalize(path.join(publicDir, safePath));

  if (!targetFile.startsWith(publicDir)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
    sendFile(res, targetFile);
    return;
  }

  sendFile(res, path.join(publicDir, "index.html"));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`OpenClaw MVP server running on http://127.0.0.1:${PORT}`);
});
