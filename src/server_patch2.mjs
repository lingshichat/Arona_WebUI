import fs from 'fs';
const file = '/home/openclaw-mvp/src/server.mjs';
let content = fs.readFileSync(file, 'utf8');

// The replacement was malformed due to multiple occurrences of handleApi. 
// We will simply use the original file, copy it, and patch it more carefully.

fs.copyFileSync('/home/openclaw-mvp/src/server.mjs.bak', file);
content = fs.readFileSync(file, 'utf8');

const SECRET_INJECTION = `
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
    const password = body.password;
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
`;

content = content.replace('const __dirname = path.dirname(__filename);', 'const __dirname = path.dirname(__filename);\n' + SECRET_INJECTION);

const AUTH_MIDDLEWARE = `  if (pathname.startsWith("/api/")) {
    if (pathname === "/api/login") {
      await handleLogin(req, res);
      return;
    }
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\\s+/i, '');
    const hasConfiguredAuth = !!(gatewayConfig.password || gatewayConfig.token);
    
    if (hasConfiguredAuth && !isValidToken(token) && pathname !== "/api/health") {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
      return;
    }
    
    await handleApi(req, res, pathname, url.searchParams);
    return;
  }`;

content = content.replace(
  `  if (pathname.startsWith("/api/")) {
    await handleApi(req, res, pathname, url.searchParams);
    return;
  }`, 
  AUTH_MIDDLEWARE
);

fs.writeFileSync(file, content);
