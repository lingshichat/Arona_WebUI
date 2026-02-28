const fs = require('fs');

const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');

const OLD_CSS = `/* Butterfly-Style Admin Toast */
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

const NEW_CSS = `/* Blog Admin Toast Styles */
.toast-container {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
}

.toast {
    background: rgba(20, 40, 80, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 14px;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
    min-width: 280px;
    max-width: 420px;
    pointer-events: auto;
    animation: toastSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: right center;
    color: #fff;
}

.toast.toast-exit {
    animation: toastSlideOut 0.3s ease-in forwards;
}

.toast-icon {
    font-size: 1.4rem;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.08);
}

.toast.success .toast-icon {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
}

.toast.warning .toast-icon {
    background: rgba(251, 191, 36, 0.2);
    color: #fcd34d;
    box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
}

.toast.error .toast-icon {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.3);
}

.toast.info .toast-icon {
    background: rgba(59, 112, 252, 0.2);
    color: #60a5fa;
    box-shadow: 0 0 15px rgba(59, 112, 252, 0.3);
}

.toast-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.toast-title {
    font-weight: 600;
    font-size: 0.95rem;
    color: #fff;
    margin-bottom: 4px;
}

.toast-message {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.4;
}

.toast-close {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 6px;
    border-radius: 50%;
    transition: all 0.2s;
    font-size: 0.85rem;
}

.toast-close:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
}

@keyframes toastSlideIn {
    from { opacity: 0; transform: translateX(100%) scale(0.8); }
    to { opacity: 1; transform: translateX(0) scale(1); }
}

@keyframes toastSlideOut {
    from { opacity: 1; transform: translateX(0) scale(1); }
    to { opacity: 0; transform: translateX(50%) scale(0.9); }
}`;

css = css.replace(OLD_CSS, NEW_CSS);
fs.writeFileSync(cssFile, css);

const htmlFile = '/home/openclaw-mvp/public/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');
if (html.includes('<div id="snackbar"></div>')) {
  html = html.replace('<div id="snackbar"></div>', '<div id="toast-container" class="toast-container"></div>');
} else if (!html.includes('toast-container')) {
  html = html.replace('</body>', '  <div id="toast-container" class="toast-container"></div>\n</body>');
}
fs.writeFileSync(htmlFile, html);

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

const OLD_JS = `function showToast(msg, type = 'info') {
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

const NEW_JS = `// Blog Admin Toast Implementation
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = \`toast \${type}\`;

  let iconClass = 'fa-solid fa-circle-info';
  let title = '系统通知';

  if (type === 'success') {
      iconClass = 'fa-solid fa-check';
      title = '操作成功';
  } else if (type === 'error') {
      iconClass = 'fa-solid fa-xmark';
      title = '操作失败';
  } else if (type === 'warning') {
      iconClass = 'fa-solid fa-exclamation';
      title = '警告';
  }

  toast.innerHTML = \`
      <div class="toast-icon">
          <i class="\${iconClass}"></i>
      </div>
      <div class="toast-content">
          <div class="toast-title">\${title}</div>
          <div class="toast-message">\${message}</div>
      </div>
      <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
  \`;

  container.appendChild(toast);

  // Close button event
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
      removeToast(toast);
  });

  // Auto remove
  if (duration > 0) {
      setTimeout(() => {
          removeToast(toast);
      }, duration);
  }
}

function removeToast(toast) {
  if (toast.classList.contains('toast-exit')) return;
  toast.classList.add('toast-exit');
  toast.addEventListener('animationend', () => {
      toast.remove();
  });
}`;

js = js.replace(OLD_JS, NEW_JS);
fs.writeFileSync(jsFile, js);
