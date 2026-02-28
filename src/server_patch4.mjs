import fs from 'fs';
const file = '/home/openclaw-mvp/src/server.mjs';
let content = fs.readFileSync(file, 'utf8');

const LOGIN_HANDLER_OLD = `async function handleLogin(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }
  try {
    const body = await parseBody(req);
    const username = body.username;
    const password = body.password;
    
    // Hardcoded simple credentials based on previous standard setup
    // You can manage users more robustly later
    const validUsername = "admin";
    const validPassword = gatewayConfig.password || gatewayConfig.token;
    
    if (username === validUsername && (password === validPassword || (!validPassword))) {
      const token = createToken();
      jsonResponse(res, 200, { ok: true, token });
    } else {
      jsonResponse(res, 401, { ok: false, error: "阿洛娜不认识这个账号或密码哦...请老师核对一下！(>_<)" });
    }
  } catch (err) {
    jsonResponse(res, 500, { ok: false, error: err.message });
  }
}`;

const LOGIN_HANDLER_NEW = `async function handleLogin(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }
  try {
    const body = await parseBody(req);
    const username = body.username;
    const password = body.password;
    
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
}`;

content = content.replace(LOGIN_HANDLER_OLD, LOGIN_HANDLER_NEW);
fs.writeFileSync(file, content);
