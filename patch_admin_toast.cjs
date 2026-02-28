const fs = require('fs');

const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');

const OLD_CSS = `/* Snackbar / Toast Notifications */
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

const NEW_CSS = `/* Butterfly-Style Admin Toast */
#snackbar {
  visibility: hidden;
  min-width: 250px;
  background-color: var(--glass-bg);
  border-radius: 8px;
  color: var(--text-primary);
  text-align: center;
  padding: 14px 24px;
  position: fixed;
  z-index: 99999;
  left: 50%;
  transform: translateX(-50%) translateY(-20px);
  top: 30px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
#snackbar.show {
  visibility: visible;
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}`;

css = css.replace(OLD_CSS, NEW_CSS);
fs.writeFileSync(cssFile, css);

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

const OLD_JS = `function showToast(msg, type = 'info') {
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

const NEW_JS = `function showToast(msg, type = 'info') {
  const sb = document.getElementById("snackbar");
  if (!sb) return;
  
  // Butterfly Admin Toast style (centered top, simple text with icon)
  const icon = type === 'success' ? '<i class="fa-solid fa-check" style="color:#4caf50;"></i>' 
             : type === 'error' ? '<i class="fa-solid fa-xmark" style="color:#f44336;"></i>'
             : '<i class="fa-solid fa-info" style="color:#2196f3;"></i>';
             
  sb.innerHTML = \`\${icon} <span style="letter-spacing:0.5px;">\${msg}</span>\`;
  sb.className = "show";
  
  if (sb.hideTimeout) clearTimeout(sb.hideTimeout);
  sb.hideTimeout = setTimeout(() => {
    sb.className = "";
  }, 2500); // 2.5s duration like Butterfly
}`;

js = js.replace(OLD_JS, NEW_JS);
fs.writeFileSync(jsFile, js);
