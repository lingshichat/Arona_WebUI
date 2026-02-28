const fs = require('fs');

const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');
const TOAST_CSS = `
/* Snackbar / Toast Notifications */
#snackbar {
  visibility: hidden;
  min-width: 280px;
  background: rgba(30, 60, 114, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  text-align: center;
  border-radius: 12px;
  padding: 14px 24px;
  position: fixed;
  z-index: 9999;
  left: 50%;
  transform: translateX(-50%);
  bottom: 30px;
  font-size: 0.95rem;
  font-weight: 500;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}
#snackbar.show {
  visibility: visible;
  animation: fadein 0.4s, fadeout 0.4s 2.6s;
}
@keyframes fadein {
  from { bottom: 0; opacity: 0; }
  to { bottom: 30px; opacity: 1; }
}
@keyframes fadeout {
  from { bottom: 30px; opacity: 1; }
  to { bottom: 0; opacity: 0; }
}
`;
if (!css.includes('#snackbar')) {
  fs.writeFileSync(cssFile, css + TOAST_CSS);
}

const htmlFile = '/home/openclaw-mvp/public/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');
if (!html.includes('id="snackbar"')) {
  html = html.replace('</body>', '  <div id="snackbar"></div>\n</body>');
  fs.writeFileSync(htmlFile, html);
}

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');
const TOAST_JS = `
function showToast(msg, type = 'info') {
  const sb = document.getElementById("snackbar");
  if (!sb) return;
  
  const icon = type === 'success' ? '<i class="fa-solid fa-circle-check" style="color:#34d399;font-size:1.1rem;"></i>' 
             : type === 'error' ? '<i class="fa-solid fa-circle-exclamation" style="color:#f87171;font-size:1.1rem;"></i>'
             : '<i class="fa-solid fa-circle-info" style="color:#60a5fa;font-size:1.1rem;"></i>';
             
  sb.innerHTML = \`\${icon} <span>\${msg}</span>\`;
  sb.className = "show";
  setTimeout(function(){ sb.className = sb.className.replace("show", ""); }, 3000);
}
`;
if (!js.includes('function showToast')) {
  js = js.replace('function showError', TOAST_JS + '\nfunction showError');
}

// Replace the result block logic
const OLD_LOGIC_1 = `const resEl = $("models-result");
    resEl.style.display = "block";
    resEl.style.color = "#81c784";
    resEl.innerHTML = '<i class="fa-solid fa-check-circle" style="margin-right:8px;"></i><b>配置已成功保存并下发至 OpenClaw！</b><br><code style="margin-top:10px;display:block;opacity:0.8;">' + escapeHtml(JSON.stringify(result, null, 2)) + '</code>';
    setTimeout(() => { resEl.style.display = "none"; }, 5000);`;

const OLD_LOGIC_2 = `const resEl2 = $("models-result");
    if (resEl2) resEl2.style.display = "none";`;

js = js.replace(OLD_LOGIC_1, `showToast("配置已成功保存并下发至 OpenClaw！", "success");`);
js = js.replace(OLD_LOGIC_2, `/* reset result hidden */`);

fs.writeFileSync(jsFile, js);
