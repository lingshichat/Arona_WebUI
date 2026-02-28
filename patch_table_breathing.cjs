const fs = require('fs');

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

// 1. 重新设计"技能名称"列
const OLD_SKILL_NAME = `          render: (r) => \`<div style="display:flex; flex-direction:column; gap:6px;">
                            <strong style="font-size: 1rem; color: var(--text-primary); letter-spacing:0.5px;">\${escapeHtml(r.name.replace(/\\s*\\(.*?\\)/, ''))}</strong>
                            <span style="font-size: 0.8rem; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; display: inline-block; width: fit-content; border: 1px solid rgba(255,255,255,0.05); font-family: monospace;">\${escapeHtml(r.key)}</span>
                          </div>\``;

// 移除黑底框，改用纯粹的淡灰色小字作为子标题，增加呼吸感
const NEW_SKILL_NAME = `          render: (r) => \`<div style="display:flex; flex-direction:column; gap:4px;">
                            <strong style="font-size: 1rem; color: #fff; font-weight: 500;">\${escapeHtml(r.name.replace(/\\s*\\(.*?\\)/, ''))}</strong>
                            <span style="font-size: 0.8rem; color: rgba(255,255,255,0.4); font-family: var(--font-mono); letter-spacing: 0.5px;">\${escapeHtml(r.key)}</span>
                          </div>\``;
js = js.replace(OLD_SKILL_NAME, NEW_SKILL_NAME);

// 2. 优化功能描述列，增大宽度和行距
const OLD_DESC = `          render: (r) => \`<div style="max-width: 400px; line-height: 1.5; color: rgba(255,255,255,0.85); font-size: 0.9rem;">\${escapeHtml(r.description || "-")}</div>\``;
const NEW_DESC = `          render: (r) => \`<div style="max-width: 450px; line-height: 1.6; color: rgba(255,255,255,0.7); font-size: 0.9rem; padding: 4px 0;">\${escapeHtml(r.description || "-")}</div>\``;
js = js.replace(OLD_DESC, NEW_DESC);

fs.writeFileSync(jsFile, js);

// 3. 增大全局表格的内边距，提供极佳的"呼吸感"
const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');

const OLD_TD = `td { 
  padding: 16px 20px; 
  border-bottom: 1px solid rgba(255, 255, 255, 0.05); 
  font-size: 0.95rem; 
  vertical-align: middle; 
}`;

const NEW_TD = `td { 
  padding: 24px 20px; 
  border-bottom: 1px solid rgba(255, 255, 255, 0.05); 
  font-size: 0.95rem; 
  vertical-align: middle; 
}`;

css = css.replace(OLD_TD, NEW_TD);

// 如果还有其他地方被覆盖，强行注入一次
css += `
/* Force table breathing room */
.table-wrap table td {
  padding: 24px 20px !important;
}
.table-wrap table th {
  padding: 18px 20px !important;
}
`;

fs.writeFileSync(cssFile, css);
