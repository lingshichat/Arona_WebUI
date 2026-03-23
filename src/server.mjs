import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Load .env.local if it exists (local dev config, not committed to git)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  try {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex < 1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const val = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // .env.local not found — use environment variables or defaults
  }
})();

import cronstruePlugin from "cronstrue/i18n.js";
const cronstrue = cronstruePlugin.default || cronstruePlugin;
import { WebSocket } from "ws";

const SESSIONS = new Map();
const REDACTED_API_KEY_TOKEN = "__OPENCLAW_REDACTED__";

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function cloneJsonValue(value, fallback = null) {
  if (value === undefined) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

function redactApiKeyField(target, key = "apiKey") {
  if (!target || typeof target !== "object" || Array.isArray(target)) return target;
  if (typeof target[key] === "string" && target[key].trim()) {
    target[key] = REDACTED_API_KEY_TOKEN;
  }
  return target;
}

function readModelsConfigForResponse(config) {
  const modelsConfig = cloneJsonValue(config?.parsed?.models, {}) || {};
  const providers = modelsConfig && typeof modelsConfig === "object" && !Array.isArray(modelsConfig)
    ? modelsConfig.providers
    : null;
  if (providers && typeof providers === "object" && !Array.isArray(providers)) {
    for (const provider of Object.values(providers)) {
      redactApiKeyField(provider);
    }
  }
  return modelsConfig;
}

function readMemorySearchForResponse(config) {
  const memorySearch = cloneJsonValue(config?.parsed?.agents?.defaults?.memorySearch, null);
  if (!memorySearch || typeof memorySearch !== "object" || Array.isArray(memorySearch)) {
    return memorySearch ?? null;
  }
  if (memorySearch.remote && typeof memorySearch.remote === "object" && !Array.isArray(memorySearch.remote)) {
    redactApiKeyField(memorySearch.remote);
  }
  return memorySearch;
}

const INVALID_OPTIONAL_STRING = Symbol("invalid optional string");

function readRequiredString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(source, key) {
  if (!source || typeof source !== "object" || !hasOwn(source, key)) return undefined;
  return typeof source[key] === "string" ? source[key].trim() : INVALID_OPTIONAL_STRING;
}

const AGENT_FILE_NAMES = [
  "AGENTS.md",
  "SOUL.md",
  "TOOLS.md",
  "IDENTITY.md",
  "USER.md",
  "HEARTBEAT.md",
  "BOOTSTRAP.md",
  "MEMORY.md",
  "memory.md"
];

const AGENT_FILE_NAME_SET = new Set(AGENT_FILE_NAMES);
const AGENT_FILE_NAME_LOOKUP = new Map(AGENT_FILE_NAMES.map((name) => [name.toLowerCase(), name]));

function readAgentFileName(value) {
  const raw = readRequiredString(value);
  if (!raw) return "";
  // Preserve exact canonical casing first so MEMORY.md and memory.md stay distinct.
  if (AGENT_FILE_NAME_SET.has(raw)) return raw;
  return AGENT_FILE_NAME_LOOKUP.get(raw.toLowerCase()) || "";
}

function isMissingAgentFileError(error) {
  const message = String(error instanceof Error ? error.message : error || "").toLowerCase();
  if (!message || message.includes("api endpoint not found") || message.includes("unsupported file")) {
    return false;
  }
  return message.includes("enoent")
    || message.includes("no such file")
    || message.includes("missing file")
    || (message.includes("file") && message.includes("not found"))
    || (message.includes("workspace") && message.includes("not found"));
}

const SESSION_TTL_MS = parsePositiveInt(process.env.SESSION_TTL_MS || "86400000", 86_400_000);
const SESSION_CLEANUP_INTERVAL_MS = parsePositiveInt(process.env.SESSION_CLEANUP_INTERVAL_MS || "300000", 300_000);
const GATEWAY_POOL_IDLE_MS = parsePositiveInt(process.env.GATEWAY_POOL_IDLE_MS || "30000", 30_000);
const GATEWAY_POOL_CLEANUP_INTERVAL_MS = parsePositiveInt(
  process.env.GATEWAY_POOL_CLEANUP_INTERVAL_MS || "10000",
  10_000
);

const gatewayPool = {
  session: null,
  connecting: null,
  activeLeases: 0,
  lastUsedAt: 0
};

function createToken() {
  const token = crypto.randomUUID();
  const now = Date.now();
  SESSIONS.set(token, {
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + SESSION_TTL_MS
  });
  return token;
}

function getSessionRecord(token) {
  if (!token) return null;
  const record = SESSIONS.get(token);
  if (!record) return null;
  if (!Number.isFinite(record.expiresAt) || record.expiresAt <= Date.now()) {
    SESSIONS.delete(token);
    return null;
  }
  return record;
}

function touchSessionRecord(token, record) {
  if (!token || !record) return;
  const now = Date.now();
  record.lastActivityAt = now;
  record.expiresAt = now + SESSION_TTL_MS;
  SESSIONS.set(token, record);
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, record] of SESSIONS) {
    if (!record || !Number.isFinite(record.expiresAt) || record.expiresAt <= now) {
      SESSIONS.delete(token);
    }
  }
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

    // WebUI login creds are independent from gateway auth creds.
    const validUsername = process.env.WEBUI_USERNAME || process.env.GATEWAY_USERNAME || "admin";
    const validPassword = process.env.WEBUI_PASSWORD || gatewayConfig.password || gatewayConfig.token || "";

    if (username === validUsername && (validPassword ? password === validPassword : true)) {
      const token = createToken();
      jsonResponse(res, 200, { ok: true, token });
    } else {
      jsonResponse(res, 401, { ok: false, error: "阿洛娜不认识这个账号或密码哦...请老师核对一下！(>_<)" });
    }
  } catch (err) {
    jsonResponse(res, getApiErrorStatusCode(err), { ok: false, error: err.message });
  }
}

const publicDir = path.join(__dirname, "..", "public");

function loadGatewayDefaults() {
  const defaults = {
    url: "ws://127.0.0.1:18789",
    origin: "http://localhost:18790",
    password: "",
    token: ""
  };

  try {
    const configPath = path.join(os.homedir(), ".openclaw", "openclaw.json");
    const raw = fs.readFileSync(configPath, "utf8");
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
const DEFAULT_AGENT_WORKSPACE = "~/.openclaw/workspace";
const gatewayConfig = {
  url: process.env.GATEWAY_URL || gatewayDefaults.url,
  origin: process.env.GATEWAY_ORIGIN || gatewayDefaults.origin,
  password: process.env.GATEWAY_PASSWORD ?? gatewayDefaults.password,
  token: process.env.GATEWAY_TOKEN ?? gatewayDefaults.token
};

function resolveGatewayClientUrl(req) {
  const override = process.env.GATEWAY_PUBLIC_WS_URL;
  if (typeof override === "string" && override.trim()) {
    return override.trim();
  }

  const forwardedProtoRaw = req.headers["x-forwarded-proto"];
  const forwardedHostRaw = req.headers["x-forwarded-host"];
  const forwardedProto = Array.isArray(forwardedProtoRaw)
    ? forwardedProtoRaw[0]
    : String(forwardedProtoRaw || "").split(",")[0].trim();
  const forwardedHost = Array.isArray(forwardedHostRaw)
    ? forwardedHostRaw[0]
    : String(forwardedHostRaw || "").split(",")[0].trim();
  const normalizedForwardedProto = forwardedProto.toLowerCase();
  const hasForwardedContext = Boolean(forwardedProto || forwardedHost);

  if (hasForwardedContext) {
    const host = forwardedHost || String(req.headers.host || "").trim();
    const normalizedProto = normalizedForwardedProto === "https" || normalizedForwardedProto === "wss"
      ? "wss"
      : "ws";

    if (host) {
      return `${normalizedProto}://${host}/gateway/`;
    }
  }

  return gatewayConfig.url;
}

const PORT = Number.parseInt(process.env.PORT || "18790", 10);

const needsSetup = !fs.existsSync(path.join(__dirname, "..", ".env.local"))
  && !process.env.GATEWAY_URL;

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
      scopes: ["operator.read", "operator.write", "operator.admin", "operator.pairing", "operator.approvals"],
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

function isGatewaySessionAlive(session) {
  return Boolean(
    session &&
    session.connected &&
    session.ws &&
    session.ws.readyState === WebSocket.OPEN &&
    !session.closed
  );
}

function closePooledGatewaySession() {
  if (!gatewayPool.session) return;
  const stale = gatewayPool.session;
  gatewayPool.session = null;
  try {
    stale.close();
  } catch {
    // Ignore cleanup errors for stale pooled sessions.
  }
}

async function getPooledGatewaySession() {
  if (isGatewaySessionAlive(gatewayPool.session)) {
    return gatewayPool.session;
  }

  closePooledGatewaySession();

  if (!gatewayPool.connecting) {
    gatewayPool.connecting = (async () => {
      const session = new GatewaySession(gatewayConfig);
      await session.connect();
      gatewayPool.session = session;
      gatewayPool.lastUsedAt = Date.now();
      return session;
    })().finally(() => {
      gatewayPool.connecting = null;
    });
  }

  return gatewayPool.connecting;
}

function cleanupIdleGatewaySession() {
  if (!gatewayPool.session) return;
  if (gatewayPool.activeLeases > 0) return;
  const idleFor = Date.now() - gatewayPool.lastUsedAt;
  if (idleFor >= GATEWAY_POOL_IDLE_MS) {
    closePooledGatewaySession();
  }
}

async function withGateway(fn) {
  const session = await getPooledGatewaySession();
  gatewayPool.activeLeases += 1;
  gatewayPool.lastUsedAt = Date.now();
  try {
    return await fn(session);
  } catch (error) {
    if (!isGatewaySessionAlive(session)) {
      closePooledGatewaySession();
    }
    throw error;
  } finally {
    gatewayPool.activeLeases = Math.max(0, gatewayPool.activeLeases - 1);
    gatewayPool.lastUsedAt = Date.now();
  }
}

function jsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function isLocalhostRequest(req) {
  const addr = req.socket?.remoteAddress || "";
  return addr === "127.0.0.1" || addr === "::1" || addr === "::ffff:127.0.0.1";
}

function emptyAgentFilesResponse(agentId) {
  return {
    ok: true,
    agentId,
    files: []
  };
}

function missingAgentFileResponse(agentId, name) {
  return {
    ok: true,
    agentId,
    file: {
      name,
      content: "",
      missing: true
    }
  };
}

function readTrimmedStringArray(value) {
  if (!Array.isArray(value)) return [];
  const deduped = [];
  const seen = new Set();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    deduped.push(trimmed);
  }
  return deduped;
}

function readConfigAgentEntry(configPayload, agentId) {
  const parsed = configPayload && typeof configPayload === "object" ? configPayload.parsed : null;
  const agentsRoot = parsed && typeof parsed.agents === "object" ? parsed.agents : null;
  const list = Array.isArray(agentsRoot?.list) ? agentsRoot.list : [];
  const normalizedAgentId = readRequiredString(agentId).toLowerCase();

  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const entryId = readRequiredString(entry.id).toLowerCase();
    if (!entryId || entryId !== normalizedAgentId) continue;
    return entry;
  }
  return null;
}

function readConfigAgentWorkspaceInfo(configPayload, agentId, fallbackWorkspace = "") {
  const parsed = configPayload && typeof configPayload === "object" ? configPayload.parsed : null;
  const agentsRoot = parsed && typeof parsed.agents === "object" ? parsed.agents : null;
  const configuredDefaultWorkspace = readRequiredString(agentsRoot?.defaults?.workspace) || fallbackWorkspace;
  const defaultWorkspace = configuredDefaultWorkspace || DEFAULT_AGENT_WORKSPACE;
  const entry = readConfigAgentEntry(configPayload, agentId);
  const entryWorkspace = readRequiredString(entry?.workspace);
  if (entryWorkspace) {
    return {
      workspace: entryWorkspace,
      defaultWorkspace,
      matchedAgent: true,
      source: "agents.list.workspace"
    };
  }

  return {
    workspace: defaultWorkspace,
    defaultWorkspace,
    matchedAgent: Boolean(entry),
    source: configuredDefaultWorkspace ? "agents.defaults.workspace" : "default"
  };
}

function readConfigAgentWorkspace(configPayload, agentId, fallbackWorkspace = "") {
  return readConfigAgentWorkspaceInfo(configPayload, agentId, fallbackWorkspace).workspace;
}

function readAgentMemoryInfo(configPayload, agentId) {
  const parsed = configPayload && typeof configPayload === "object" ? configPayload.parsed : null;
  const agentsRoot = parsed && typeof parsed.agents === "object" ? parsed.agents : null;
  const defaultsMemory = agentsRoot?.defaults?.memorySearch;
  const entry = readConfigAgentEntry(configPayload, agentId);
  const agentMemory = entry?.memorySearch && typeof entry.memorySearch === "object" ? entry.memorySearch : null;
  const defaultExtraPaths = readTrimmedStringArray(defaultsMemory?.extraPaths);
  const agentExtraPaths = readTrimmedStringArray(agentMemory?.extraPaths);
  const effectiveExtraPaths = readTrimmedStringArray([...defaultExtraPaths, ...agentExtraPaths]);
  const backend = readRequiredString(parsed?.memory?.backend) || "builtin";

  return {
    backend,
    defaultExtraPaths,
    agentExtraPaths,
    effectiveExtraPaths,
    hasAgentOverride: Boolean(agentMemory && hasOwn(agentMemory, "extraPaths"))
  };
}

function mergeAgentsListWithConfig(agentsPayload, configPayload) {
  const source = agentsPayload && typeof agentsPayload === "object" ? agentsPayload : {};
  const defaultWorkspace = readConfigAgentWorkspace(configPayload, source.defaultId);
  const mergeAgentWorkspace = (agent, fallbackAgentId = "") => {
    const isObjectAgent = agent && typeof agent === "object" && !Array.isArray(agent);
    const nextAgent = isObjectAgent ? { ...agent } : null;
    const agentId = readRequiredString(
      (isObjectAgent ? nextAgent.id || nextAgent.agentId || nextAgent.key : agent) || fallbackAgentId
    );
    const currentWorkspace = isObjectAgent
      ? readRequiredString(nextAgent.workspace || nextAgent.root || nextAgent.path || nextAgent.dir)
      : "";
    const {
      workspace,
      matchedAgent,
      defaultWorkspace: agentDefaultWorkspace,
      source: configWorkspaceSource
    } = readConfigAgentWorkspaceInfo(configPayload, agentId, defaultWorkspace);
    const memorySearch = readAgentMemoryInfo(configPayload, agentId || fallbackAgentId);
    const effectiveWorkspace = currentWorkspace || workspace || agentDefaultWorkspace || DEFAULT_AGENT_WORKSPACE;
    const workspaceSource = currentWorkspace ? "agents.list.workspace" : configWorkspaceSource;

    if (nextAgent) {
      if (workspace && (matchedAgent || !currentWorkspace)) {
        nextAgent.workspace = workspace;
      }
      nextAgent.defaultWorkspace = agentDefaultWorkspace || DEFAULT_AGENT_WORKSPACE;
      nextAgent.effectiveWorkspace = effectiveWorkspace;
      nextAgent.workspaceSource = workspaceSource;
      nextAgent.memorySearch = memorySearch;
      return nextAgent;
    }

    const payload = {
      agentId: agentId || readRequiredString(fallbackAgentId),
      defaultWorkspace: agentDefaultWorkspace || DEFAULT_AGENT_WORKSPACE,
      effectiveWorkspace,
      workspaceSource,
      memorySearch
    };

    if (workspace) {
      payload.workspace = workspace;
    }

    return payload;
  };

  let agents = source.agents;
  if (Array.isArray(source.agents)) {
    agents = source.agents.map((agent) => mergeAgentWorkspace(agent));
  } else if (source.agents && typeof source.agents === "object") {
    agents = Object.fromEntries(
      Object.entries(source.agents).map(([agentId, agent]) => [agentId, mergeAgentWorkspace(agent, agentId)])
    );
  }

  return {
    ...source,
    agents
  };
}

function getApiErrorStatusCode(error) {
  if (Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode < 600) {
    return error.statusCode;
  }

  const message = String(error instanceof Error ? error.message : error || "");
  if (message.startsWith("invalid JSON body")) return 400;
  if (message.includes("payload too large")) return 413;
  if (
    message.includes("not found")
    || message.includes("must be a string")
    || message.includes("is required")
    || message.includes("memory.backend = qmd")
    || message.includes("config hash is unavailable")
  ) {
    return 400;
  }
  return 500;
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
      ".webp": "image/webp",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf"
    };

    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}

async function handleSetupApi(req, res, pathname) {
  try {
    if (req.method === "GET" && pathname === "/api/setup/status") {
      const envPath = path.join(__dirname, "..", ".env.local");
      const envExists = fs.existsSync(envPath);
      let gatewayConnected = false;
      try {
        const session = await getPooledGatewaySession();
        gatewayConnected = isGatewaySessionAlive(session);
      } catch {}
      return jsonResponse(res, 200, {
        ok: true,
        envExists,
        gatewayConnected,
        config: {
          gatewayUrl: gatewayConfig.url,
          authMode: gatewayConfig.password ? "password" : gatewayConfig.token ? "token" : "none",
          username: process.env.WEBUI_USERNAME || process.env.GATEWAY_USERNAME || "admin",
          port: PORT,
          origin: gatewayConfig.origin,
          publicWsUrl: process.env.GATEWAY_PUBLIC_WS_URL || ""
        }
      });
    }

    if (req.method === "POST" && pathname === "/api/setup/test-connection") {
      const body = await parseBody(req);
      const testConfig = {
        url: body.gatewayUrl || "ws://127.0.0.1:18789",
        origin: body.origin || `http://localhost:${PORT}`,
        password: body.authMode === "password" ? (body.credential || "") : "",
        token: body.authMode === "token" ? (body.credential || "") : ""
      };
      const session = new GatewaySession(testConfig);
      try {
        await Promise.race([
          session.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("连接超时 (5s)")), 5000))
        ]);
        session.close();
        return jsonResponse(res, 200, { ok: true });
      } catch (err) {
        session.close();
        return jsonResponse(res, 200, { ok: false, error: err.message });
      }
    }

    if (req.method === "POST" && pathname === "/api/setup/env") {
      const body = await parseBody(req);
      const lines = [
        "# Arona WebUI Configuration",
        "# Generated by Setup Wizard",
        ""
      ];
      if (body.gatewayUrl) lines.push(`GATEWAY_URL=${body.gatewayUrl}`);
      if (body.authMode === "password" && body.credential) {
        lines.push(`GATEWAY_PASSWORD=${body.credential}`);
      } else if (body.authMode === "token" && body.credential) {
        lines.push(`GATEWAY_TOKEN=${body.credential}`);
      }
      if (body.username) lines.push(`GATEWAY_USERNAME=${body.username}`);
      if (body.port && Number(body.port) !== 18790) lines.push(`PORT=${body.port}`);
      if (body.origin) lines.push(`GATEWAY_ORIGIN=${body.origin}`);
      if (body.publicWsUrl) lines.push(`GATEWAY_PUBLIC_WS_URL=${body.publicWsUrl}`);
      lines.push("");
      const envPath = path.join(__dirname, "..", ".env.local");
      fs.writeFileSync(envPath, lines.join("\n"), "utf8");
      setTimeout(() => process.exit(0), 1500);
      return jsonResponse(res, 200, { ok: true, message: "配置已保存，正在重启..." });
    }

    if (req.method === "POST" && pathname === "/api/setup/gateway") {
      const body = await parseBody(req);
      const patchObj = { gateway: {} };
      if (body.bindMode) {
        patchObj.gateway.bind = body.bindMode === "lan" ? "0.0.0.0" : "127.0.0.1";
      }
      if (Array.isArray(body.allowedOrigins) && body.allowedOrigins.length > 0) {
        if (!patchObj.gateway.controlUi) patchObj.gateway.controlUi = {};
        patchObj.gateway.controlUi.allowedOrigins = body.allowedOrigins;
      }
      if (typeof body.disableDeviceAuth === "boolean") {
        if (!patchObj.gateway.controlUi) patchObj.gateway.controlUi = {};
        patchObj.gateway.controlUi.dangerouslyDisableDeviceAuth = body.disableDeviceAuth;
      }
      const data = await withGateway(async (gw) => {
        const config = await gw.request("config.get", {});
        return gw.request("config.patch", {
          raw: JSON.stringify(patchObj, null, 2),
          baseHash: config.hash,
          note: "Arona Setup Wizard: gateway configuration"
        });
      });
      return jsonResponse(res, 200, { ok: true, data });
    }

    return jsonResponse(res, 404, { ok: false, error: "Setup endpoint not found" });
  } catch (error) {
    return jsonResponse(res, getApiErrorStatusCode(error), {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
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

    if (req.method === "GET" && pathname === "/api/gateway-auth") {
      const payload = {
        ok: true,
        url: resolveGatewayClientUrl(req)
      };
      if (gatewayConfig.password) payload.password = gatewayConfig.password;
      if (gatewayConfig.token) payload.token = gatewayConfig.token;
      return jsonResponse(res, 200, payload);
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
          modelsConfig: readModelsConfigForResponse(config),
          agentsDefaultsModels: config.parsed?.agents?.defaults?.models || {},
          agentsDefaultModel: config.parsed?.agents?.defaults?.model ?? null,
          imageModel: config.parsed?.agents?.defaults?.imageModel ?? null,
          imageGenerationModel: config.parsed?.agents?.defaults?.imageGenerationModel ?? null,
          pdfModel: config.parsed?.agents?.defaults?.pdfModel ?? null,
          pdfMaxBytesMb: config.parsed?.agents?.defaults?.pdfMaxBytesMb ?? null,
          pdfMaxPages: config.parsed?.agents?.defaults?.pdfMaxPages ?? null,
          summarize: config.parsed?.agents?.defaults?.summarize ?? null,
          subagents: config.parsed?.agents?.defaults?.subagents ?? null,
          memorySearch: readMemorySearchForResponse(config)
        };
      });
      return jsonResponse(res, 200, data);
    }

    if (req.method === "POST" && pathname === "/api/models/save") {
      const body = await parseBody(req);
      const payload = {
        models: body.models || {}
      };
      const hasAgentsDefaultsModels = hasOwn(body, "agentsDefaultsModels");
      const hasAgentsDefaultModel = hasOwn(body, "agentsDefaultModel");
      const hasImageModel = hasOwn(body, "imageModel");
      const hasImageGenerationModel = hasOwn(body, "imageGenerationModel");
      const hasPdfModel = hasOwn(body, "pdfModel");
      const hasPdfMaxBytesMb = hasOwn(body, "pdfMaxBytesMb");
      const hasPdfMaxPages = hasOwn(body, "pdfMaxPages");
      const hasSummarize = hasOwn(body, "summarize");
      const hasSubagents = hasOwn(body, "subagents");
      const hasMemorySearch = hasOwn(body, "memorySearch");
      if (
        hasAgentsDefaultsModels
        || hasAgentsDefaultModel
        || hasImageModel
        || hasImageGenerationModel
        || hasPdfModel
        || hasPdfMaxBytesMb
        || hasPdfMaxPages
        || hasSummarize
        || hasSubagents
        || hasMemorySearch
      ) {
        payload.agents = { defaults: {} };
        if (hasAgentsDefaultsModels) {
          payload.agents.defaults.models = body.agentsDefaultsModels || {};
        }
        if (hasAgentsDefaultModel) {
          payload.agents.defaults.model = body.agentsDefaultModel;
        }
        if (hasImageModel) {
          payload.agents.defaults.imageModel = body.imageModel;
        }
        if (hasImageGenerationModel) {
          payload.agents.defaults.imageGenerationModel = body.imageGenerationModel;
        }
        if (hasPdfModel) {
          payload.agents.defaults.pdfModel = body.pdfModel;
        }
        if (hasPdfMaxBytesMb) {
          payload.agents.defaults.pdfMaxBytesMb = body.pdfMaxBytesMb;
        }
        if (hasPdfMaxPages) {
          payload.agents.defaults.pdfMaxPages = body.pdfMaxPages;
        }
        if (hasSummarize) {
          payload.agents.defaults.summarize = body.summarize;
        }
        if (hasSubagents) {
          payload.agents.defaults.subagents = body.subagents;
        }
        if (hasMemorySearch) {
          payload.agents.defaults.memorySearch = body.memorySearch;
        }
      }
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

    if (req.method === "POST" && pathname === "/api/skills/install") {
      const body = await parseBody(req);
      if (!body.name || !body.installId) {
        return jsonResponse(res, 400, { ok: false, error: "name and installId are required" });
      }
      const result = await withGateway((gateway) =>
        gateway.request("skills.install", {
          name: body.name,
          installId: body.installId,
          timeoutMs: body.timeoutMs || 120000
        })
      );
      return jsonResponse(res, 200, { ok: true, result });
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

    if (req.method === "GET" && pathname === "/api/agents") {
      const data = await withGateway(async (gateway) => {
        const [agents, config] = await Promise.all([
          gateway.request("agents.list", {}),
          gateway.request("config.get", {}).catch(() => null)
        ]);
        return mergeAgentsListWithConfig(agents, config);
      });
      return jsonResponse(res, 200, data);
    }

    if (req.method === "POST" && pathname === "/api/agents/create") {
      const body = await parseBody(req);
      const name = readRequiredString(body?.name);
      const workspace = readRequiredString(body?.workspace);
      if (!name || !workspace) {
        return jsonResponse(res, 400, { ok: false, error: "name and workspace are required" });
      }

      const params = { name, workspace };
      const emoji = readOptionalString(body, "emoji");
      const avatar = readOptionalString(body, "avatar");
      if (emoji === INVALID_OPTIONAL_STRING) {
        return jsonResponse(res, 400, { ok: false, error: "emoji must be a string when provided" });
      }
      if (avatar === INVALID_OPTIONAL_STRING) {
        return jsonResponse(res, 400, { ok: false, error: "avatar must be a string when provided" });
      }
      if (emoji !== undefined && emoji !== "") params.emoji = emoji;
      if (avatar !== undefined && avatar !== "") params.avatar = avatar;

      const data = await withGateway((gateway) => gateway.request("agents.create", params));
      return jsonResponse(res, 200, { ok: true, data });
    }

    if (req.method === "POST" && pathname === "/api/agents/update") {
      const body = await parseBody(req);
      const agentId = readRequiredString(body?.agentId);
      if (!agentId) {
        return jsonResponse(res, 400, { ok: false, error: "agentId is required" });
      }

      const params = { agentId };
      const name = readOptionalString(body, "name");
      const workspace = readOptionalString(body, "workspace");
      const model = readOptionalString(body, "model");
      const avatar = readOptionalString(body, "avatar");
      if (name === INVALID_OPTIONAL_STRING) {
        return jsonResponse(res, 400, { ok: false, error: "name must be a string when provided" });
      }
      if (workspace === INVALID_OPTIONAL_STRING) {
        return jsonResponse(res, 400, { ok: false, error: "workspace must be a string when provided" });
      }
      if (model === INVALID_OPTIONAL_STRING) {
        return jsonResponse(res, 400, { ok: false, error: "model must be a string when provided" });
      }
      if (avatar === INVALID_OPTIONAL_STRING) {
        return jsonResponse(res, 400, { ok: false, error: "avatar must be a string when provided" });
      }
      if (name !== undefined) {
        if (!name) {
          return jsonResponse(res, 400, { ok: false, error: "name must be a non-empty string when provided" });
        }
        params.name = name;
      }
      if (workspace !== undefined) {
        if (!workspace) {
          return jsonResponse(res, 400, { ok: false, error: "workspace must be a non-empty string when provided" });
        }
        params.workspace = workspace;
      }
      if (model !== undefined) {
        if (!model) {
          return jsonResponse(res, 400, { ok: false, error: "model must be a non-empty string when provided" });
        }
        params.model = model;
      }
      if (avatar !== undefined) params.avatar = avatar;

      if (Object.keys(params).length === 1) {
        return jsonResponse(res, 400, { ok: false, error: "at least one field to update is required" });
      }

      const data = await withGateway(async (gateway) => {
        if (typeof params.workspace === "string") {
          const agents = await gateway.request("agents.list", {});
          const defaultId = readRequiredString(agents?.defaultId);
          if (defaultId && defaultId.toLowerCase() === agentId.toLowerCase()) {
            const error = new Error("默认 Agent 工作区受保护，如需修改请与 🦞 沟通");
            error.statusCode = 409;
            throw error;
          }
        }
        return gateway.request("agents.update", params);
      });
      return jsonResponse(res, 200, { ok: true, data });
    }

    if (req.method === "POST" && pathname === "/api/agents/delete") {
      const body = await parseBody(req);
      const agentId = readRequiredString(body?.agentId);
      if (!agentId) {
        return jsonResponse(res, 400, { ok: false, error: "agentId is required" });
      }

      const params = { agentId };
      if (body?.deleteFiles === true) {
        params.deleteFiles = true;
      }

      const data = await withGateway(async (gateway) => {
        const agents = await gateway.request("agents.list", {});
        const defaultId = readRequiredString(agents?.defaultId);
        if (defaultId && defaultId.toLowerCase() === agentId.toLowerCase()) {
          const error = new Error("默认 Agent 受保护，不能删除");
          error.statusCode = 409;
          throw error;
        }
        return gateway.request("agents.delete", params);
      });
      return jsonResponse(res, 200, { ok: true, data });
    }

    if (req.method === "GET" && pathname === "/api/agents/files") {
      const agentId = readRequiredString(query.get("agentId"));
      if (!agentId) {
        return jsonResponse(res, 400, { ok: false, error: "agentId is required" });
      }

      try {
        const data = await withGateway((gateway) => gateway.request("agents.files.list", { agentId }));
        return jsonResponse(res, 200, data);
      } catch (error) {
        if (isMissingAgentFileError(error)) {
          return jsonResponse(res, 200, emptyAgentFilesResponse(agentId));
        }
        throw error;
      }
    }

    if (req.method === "GET" && pathname === "/api/agents/file") {
      const agentId = readRequiredString(query.get("agentId"));
      const rawName = readRequiredString(query.get("name"));
      if (!agentId || !rawName) {
        return jsonResponse(res, 400, { ok: false, error: "agentId and name are required" });
      }

      const name = readAgentFileName(rawName);
      if (!name) {
        return jsonResponse(res, 400, { ok: false, error: "unsupported agent file name" });
      }

      try {
        const data = await withGateway((gateway) => gateway.request("agents.files.get", { agentId, name }));
        return jsonResponse(res, 200, data);
      } catch (error) {
        if (isMissingAgentFileError(error)) {
          return jsonResponse(res, 200, missingAgentFileResponse(agentId, name));
        }
        throw error;
      }
    }

    if (req.method === "POST" && pathname === "/api/agents/file") {
      const body = await parseBody(req);
      const agentId = readRequiredString(body?.agentId);
      const rawName = readRequiredString(body?.name);
      if (!agentId || !rawName) {
        return jsonResponse(res, 400, { ok: false, error: "agentId and name are required" });
      }

      const name = readAgentFileName(rawName);
      if (!name) {
        return jsonResponse(res, 400, { ok: false, error: "unsupported agent file name" });
      }

      if (!hasOwn(body || {}, "content") || typeof body?.content !== "string") {
        return jsonResponse(res, 400, { ok: false, error: "content must be a string" });
      }

      const content = body.content;
      const data = await withGateway((gateway) => gateway.request("agents.files.set", { agentId, name, content }));
      return jsonResponse(res, 200, { ok: true, data });
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
            } catch (e) {
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

    if (req.method === "POST" && pathname === "/api/nodes/refresh-capabilities") {
      const body = await parseBody(req);
      const nodeId = body.nodeId;
      if (!nodeId) return jsonResponse(res, 400, { ok: false, error: "nodeId is required" });
      const data = await withGateway((gateway) =>
        gateway.request("node.canvas.capability.refresh", { nodeId })
      );
      return jsonResponse(res, 200, { ok: true, data });
    }

    if (req.method === "GET" && pathname === "/api/nodes/pairing") {
      const data = await withGateway((gateway) =>
        gateway.request("node.pair.list", {})
      );
      return jsonResponse(res, 200, data);
    }

    if (req.method === "POST" && pathname === "/api/nodes/pairing/approve") {
      const body = await parseBody(req);
      if (!body.requestId) return jsonResponse(res, 400, { ok: false, error: "requestId is required" });
      const data = await withGateway((gateway) =>
        gateway.request("node.pair.approve", { requestId: body.requestId })
      );
      return jsonResponse(res, 200, { ok: true, data });
    }

    if (req.method === "POST" && pathname === "/api/nodes/pairing/reject") {
      const body = await parseBody(req);
      if (!body.requestId) return jsonResponse(res, 400, { ok: false, error: "requestId is required" });
      const data = await withGateway((gateway) =>
        gateway.request("node.pair.reject", { requestId: body.requestId })
      );
      return jsonResponse(res, 200, { ok: true, data });
    }

    if (req.method === "POST" && pathname === "/api/nodes/rename") {
      const body = await parseBody(req);
      if (!body.nodeId || !body.displayName) return jsonResponse(res, 400, { ok: false, error: "nodeId and displayName are required" });
      const data = await withGateway((gateway) =>
        gateway.request("node.rename", { nodeId: body.nodeId, displayName: body.displayName })
      );
      return jsonResponse(res, 200, { ok: true, data });
    }

    if (req.method === "GET" && pathname === "/api/usage") {
      const data = await withGateway(async (gateway) => {
        const [status, cost, sessions] = await Promise.all([
          gateway.request("usage.status", {}).catch(() => null),
          gateway.request("usage.cost", {}).catch(() => null),
          gateway.request("sessions.usage", {}).catch(() => null)
        ]);
        return { status, cost, sessions };
      });
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

    // ── Gateway restart ──────────────────────────────────────────────
    if (req.method === "POST" && pathname === "/api/gateway/restart") {
      const body = await parseBody(req);
      const mode = body.mode || "hot";

      if (mode === "hot") {
        try {
          const data = await withGateway(async (gateway) => {
            const snapshot = await gateway.request("config.get", {});
            const baseHash = snapshot?.hash || snapshot?.baseHash;
            const result = await gateway.request("config.patch", {
              raw: "{}",
              baseHash,
            });
            return { restart: result?.restart || { scheduled: true } };
          });
          return jsonResponse(res, 200, { ok: true, mode: "hot", ...data });
        } catch (error) {
          return jsonResponse(res, 502, {
            ok: false,
            mode: "hot",
            error: `热重启失败: ${error instanceof Error ? error.message : String(error)}`,
            hint: "可尝试硬重启",
          });
        }
      }

      if (mode === "hard") {
        const isDocker = fs.existsSync("/.dockerenv");
        if (isDocker) {
          return jsonResponse(res, 400, {
            ok: false,
            mode: "hard",
            error: "Docker 容器内无法执行硬重启",
            hint: "请在宿主机执行: docker restart <container>",
          });
        }
        try {
          const gwUrl = new URL(gatewayConfig.url.replace(/^ws/, "http"));
          const port = gwUrl.port || "18789";
          let pid;
          try {
            pid = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" }).trim().split("\n")[0];
          } catch {
            // lsof not available or no process found, try ss + /proc
            try {
              const ssOut = execSync(`ss -tlnp sport = :${port}`, { encoding: "utf8" });
              const pidMatch = ssOut.match(/pid=(\d+)/);
              pid = pidMatch ? pidMatch[1] : null;
            } catch { pid = null; }
          }
          if (!pid || !/^\d+$/.test(pid)) {
            return jsonResponse(res, 404, {
              ok: false,
              mode: "hard",
              error: `未找到监听端口 ${port} 的网关进程`,
              hint: "请确认网关正在运行，或手动重启网关进程",
            });
          }
          process.kill(Number(pid), "SIGTERM");
          return jsonResponse(res, 200, {
            ok: true,
            mode: "hard",
            pid: Number(pid),
            message: "已发送 SIGTERM 信号，网关将由进程管理器重新拉起",
          });
        } catch (error) {
          return jsonResponse(res, 500, {
            ok: false,
            mode: "hard",
            error: `硬重启失败: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }

      return jsonResponse(res, 400, { ok: false, error: `不支持的重启模式: ${mode}` });
    }

    // ── Gateway doctor ───────────────────────────────────────────────
    if (req.method === "GET" && pathname === "/api/gateway/doctor") {
      const issues = [];
      let info = {};

      try {
        const data = await withGateway(async (gateway) => {
          const [health, status, channels, memoryStatus] = await Promise.all([
            gateway.request("health", { probe: true }).catch((e) => ({ _error: e })),
            gateway.request("status", {}).catch((e) => ({ _error: e })),
            gateway.request("channels.status", {}).catch((e) => ({ _error: e })),
            gateway.request("doctor.memory.status", {}).catch((e) => ({ _error: e })),
          ]);
          return { health, status, channels, memoryStatus };
        });

        // Health check
        if (data.health?._error) {
          issues.push({
            id: "health-failed",
            severity: "error",
            title: "网关健康检查失败",
            detail: String(data.health._error.message || data.health._error),
            autoFixable: false,
            hint: "请检查网关进程是否正常运行，可尝试重启网关",
          });
        }

        // Status info
        if (data.status && !data.status._error) {
          info = {
            version: data.status.runtimeVersion,
          };
        }

        // Uptime from health probe
        if (data.health && !data.health._error) {
          if (data.health.uptime != null) info.uptime = data.health.uptime;
          if (data.health.platform) info.platform = data.health.platform;
          if (data.health.nodeVersion) info.nodeVersion = data.health.nodeVersion;
        }

        // Channels check
        if (data.channels && !data.channels._error) {
          const channelMap = data.channels.channels || {};
          const channelAccounts = data.channels.channelAccounts || {};
          for (const [name, ch] of Object.entries(channelMap)) {
            if (!ch?.configured) continue;
            const accounts = Array.isArray(channelAccounts[name]) ? channelAccounts[name] : [];
            const hasConnected = ch.connected === true || accounts.some((a) => a?.connected === true);
            const hasRunning = ch.running === true || accounts.some((a) => a?.running === true);
            if (!hasConnected && !hasRunning) {
              issues.push({
                id: `channel-offline-${name}`,
                severity: "warning",
                title: `频道 ${name} 离线`,
                detail: ch.lastError || "频道已配置但未连接",
                autoFixable: false,
                hint: `请检查 ${name} 频道配置和凭证是否正确，或尝试重启网关`,
              });
            }
          }
        }

        // Memory/Embedding check
        if (data.memoryStatus && !data.memoryStatus._error) {
          if (!data.memoryStatus.embedding?.ok) {
            issues.push({
              id: "memory-embedding-unavailable",
              severity: "warning",
              title: "Memory/Embedding 服务不可用",
              detail: data.memoryStatus.embedding?.error || "Embedding 服务未就绪",
              autoFixable: false,
              hint: "请检查 embedding 模型配置是否正确，确认 API Key 有效",
            });
          }
        } else if (data.memoryStatus?._error) {
          issues.push({
            id: "memory-probe-failed",
            severity: "warning",
            title: "Memory 状态探测失败",
            detail: String(data.memoryStatus._error.message || data.memoryStatus._error),
            autoFixable: false,
            hint: "网关可能不支持 doctor.memory.status 方法，可忽略此项",
          });
        }

        return jsonResponse(res, 200, { ok: true, issues, info });
      } catch (error) {
        // Gateway completely unreachable
        issues.push({
          id: "gateway-unreachable",
          severity: "error",
          title: "网关无法连接",
          detail: error instanceof Error ? error.message : String(error),
          autoFixable: false,
          hint: "请确认网关进程正在运行，或尝试硬重启",
        });
        return jsonResponse(res, 200, { ok: false, issues, info });
      }
    }

    if (req.method === "POST" && pathname === "/api/gateway/doctor/fix") {
      const body = await parseBody(req);
      const fixId = body.fixId;
      if (!fixId) {
        return jsonResponse(res, 400, { ok: false, error: "缺少 fixId 参数" });
      }
      // Placeholder for future auto-fix capabilities
      return jsonResponse(res, 200, {
        ok: false,
        fixId,
        error: "该问题暂不支持自动修复，请参考诊断建议手动处理",
      });
    }

    return jsonResponse(res, 404, { ok: false, error: "API endpoint not found" });
  } catch (error) {
    return jsonResponse(res, getApiErrorStatusCode(error), {
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
    if (pathname.startsWith("/api/setup/")) {
      if (!isLocalhostRequest(req)) {
        return jsonResponse(res, 403, { ok: false, error: "Setup only accessible from localhost" });
      }
      await handleSetupApi(req, res, pathname);
      return;
    }
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const hasConfiguredAuth = !!(gatewayConfig.password || gatewayConfig.token);
    const requiresAuth = hasConfiguredAuth && pathname !== "/api/health";

    if (requiresAuth) {
      const sessionRecord = getSessionRecord(token);
      if (!sessionRecord) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
        return;
      }
      touchSessionRecord(token, sessionRecord);
    }

    await handleApi(req, res, pathname, url.searchParams);
    return;
  }

  const safePath = pathname === "/" ? "/index.html" : pathname;

  if (needsSetup && (safePath === "/index.html" || safePath === "/login.html")) {
    res.writeHead(302, { Location: "/setup.html" });
    res.end();
    return;
  }

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

cleanupExpiredSessions();
cleanupIdleGatewaySession();

const sessionCleanupTimer = setInterval(cleanupExpiredSessions, SESSION_CLEANUP_INTERVAL_MS);
if (typeof sessionCleanupTimer.unref === "function") sessionCleanupTimer.unref();

const gatewayCleanupTimer = setInterval(cleanupIdleGatewaySession, GATEWAY_POOL_CLEANUP_INTERVAL_MS);
if (typeof gatewayCleanupTimer.unref === "function") gatewayCleanupTimer.unref();

server.listen(PORT, "127.0.0.1", () => {
  console.log(`OpenClaw MVP server running on http://127.0.0.1:${PORT}`);
});
