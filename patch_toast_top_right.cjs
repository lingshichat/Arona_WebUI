const fs = require('fs');

const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');

const OLD_CSS = `/* Snackbar / Toast Notifications */
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
}`;

const NEW_CSS = `/* Snackbar / Toast Notifications */
#snackbar {
  visibility: hidden;
  min-width: 280px;
  max-width: 350px;
  background: rgba(30, 60, 114, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-left: 4px solid var(--primary-color);
  color: #fff;
  text-align: left;
  border-radius: 8px;
  padding: 16px 20px;
  position: fixed;
  z-index: 99999;
  right: 24px;
  top: 24px;
  font-size: 0.95rem;
  font-weight: 500;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: flex-start;
  gap: 14px;
  transform: translateX(120%);
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
#snackbar.show {
  visibility: visible;
  transform: translateX(0);
}
#snackbar.error {
  border-left-color: #ef4444;
}
#snackbar.success {
  border-left-color: #10b981;
}`;

css = css.replace(OLD_CSS, NEW_CSS);
fs.writeFileSync(cssFile, css);

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

const OLD_JS = `function showToast(msg, type = 'info') {
  const sb = document.getElementById("snackbar");
  if (!sb) return;
  
  const icon = type === 'success' ? '<i class="fa-solid fa-circle-check" style="color:#34d399;font-size:1.1rem;"></i>' 
             : type === 'error' ? '<i class="fa-solid fa-circle-exclamation" style="color:#f87171;font-size:1.1rem;"></i>'
             : '<i class="fa-solid fa-circle-info" style="color:#60a5fa;font-size:1.1rem;"></i>';
             
  sb.innerHTML = \`\${icon} <span>\${msg}</span>\`;
  sb.className = "show";
  setTimeout(function(){ sb.className = sb.className.replace("show", ""); }, 3000);
}`;

const NEW_JS = `function showToast(msg, type = 'info') {
  const sb = document.getElementById("snackbar");
  if (!sb) return;
  
  const icon = type === 'success' ? '<i class="fa-solid fa-circle-check" style="color:#10b981;font-size:1.4rem;"></i>' 
             : type === 'error' ? '<i class="fa-solid fa-circle-exclamation" style="color:#ef4444;font-size:1.4rem;"></i>'
             : '<i class="fa-solid fa-circle-info" style="color:#3b70fc;font-size:1.4rem;"></i>';
  
  const title = type === 'success' ? '操作成功' : type === 'error' ? '操作失败' : '系统通知';
             
  sb.innerHTML = \`
    \${icon} 
    <div style="display:flex; flex-direction:column; gap:4px;">
      <strong style="font-size: 1rem; color:#fff;">\${title}</strong>
      <span style="font-size: 0.9rem; color: rgba(255,255,255,0.85); line-height: 1.4;">\${msg}</span>
    </div>
  \`;
  
  sb.className = \`show \${type}\`;
  
  // Clear any existing timeout to prevent premature hiding if clicked multiple times
  if (sb.hideTimeout) clearTimeout(sb.hideTimeout);
  
  sb.hideTimeout = setTimeout(() => {
    sb.className = sb.className.replace("show", "").trim();
  }, 4000);
}`;

js = js.replace(OLD_JS, NEW_JS);
fs.writeFileSync(jsFile, js);
