const fs = require('fs');

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

// The replacement in step 2 might not have executed because of syntax mismatch in regex
js = js.replace(/title:\s*"🧩 技能名称"/g, 'title: "技能名称"');
js = js.replace(/title:\s*"📝 功能描述"/g, 'title: "功能描述"');
js = js.replace(/title:\s*"📦 来源位置"/g, 'title: "来源位置"');
js = js.replace(/title:\s*"🟢 启用状态"/g, 'title: "启用状态"');
js = js.replace(/title:\s*"✅ 可用性 \(Eligible\)"/g, 'title: "可用性"');

fs.writeFileSync(jsFile, js);

const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');

const CLEAN_TH = `
/* Refined Minimalist Table Headers */
table th {
  letter-spacing: 0.5px !important;
  font-weight: 500 !important;
  color: var(--text-secondary) !important;
  text-transform: none !important;
  font-size: 0.85rem !important;
  padding: 16px 20px !important;
  background: rgba(0, 0, 0, 0.15) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}
`;

if (!css.includes('Refined Minimalist Table Headers')) {
    fs.writeFileSync(cssFile, css + CLEAN_TH);
}
