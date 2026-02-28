const fs = require('fs');

const file = '/home/openclaw-mvp/src/server.mjs';
let content = fs.readFileSync(file, 'utf8');

// Step 1: 注入一个通用的全局 SECRET 和生成 Token 的方法
const SECRET_INJECTION = `
const crypto = require('node:crypto');
// We generate a secret for JWT/Cookie signing
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const SESSIONS = new Map(); // Store active sessions mapping token -> { createdAt }

function createToken() {
  const token = crypto.randomUUID();
  SESSIONS.set(token, { createdAt: Date.now() });
  return token;
}

function isValidToken(token) {
  if (!token) return false;
  return SESSIONS.has(token);
}
`;

// Replace first import block to include it
content = content.replace('const __dirname = path.dirname(__filename);', 'const __dirname = path.dirname(__filename);\n' + SECRET_INJECTION.replace("require('node:crypto')", ""));

// Step 2: 拦截 API 请求进行鉴权
const AUTH_MIDDLEWARE = `
  if (pathname.startsWith("/api/")) {
    if (pathname === "/api/login") {
      await handleLogin(req, res);
      return;
    }
    
    // Auth Check
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\\s+/i, '');
    
    // We only enforce auth if gateway Config has password or token
    const hasConfiguredAuth = !!(gatewayConfig.password || gatewayConfig.token);
    
    if (hasConfiguredAuth && !isValidToken(token)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
      return;
    }

    await handleApi(req, res, pathname, url.searchParams);
    return;
  }
`;

content = content.replace(
  `  if (pathname.startsWith("/api/")) {
    await handleApi(req, res, pathname, url.searchParams);
    return;
  }`, 
  AUTH_MIDDLEWARE
);

// Step 3: 添加 /api/login 处理函数
const LOGIN_HANDLER = `
async function handleLogin(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  try {
    const body = await parseBody(req);
    const { password } = body;
    
    // Check against gatewayConfig (what OpenClaw uses)
    const validPassword = gatewayConfig.password || gatewayConfig.token;
    
    if (password === validPassword || (!validPassword)) {
      const token = createToken();
      jsonResponse(res, 200, { ok: true, token });
    } else {
      jsonResponse(res, 401, { ok: false, error: "阿洛娜没法认出这个授权凭证...请老师重新输入！(>_<)" });
    }
  } catch (err) {
    jsonResponse(res, 500, { ok: false, error: err.message });
  }
}

async function handleApi(req, res, pathname, query) {
`;

content = content.replace('async function handleApi(req, res, pathname, query) {', LOGIN_HANDLER);

fs.writeFileSync(file, content);
console.log('Patched server.mjs');
