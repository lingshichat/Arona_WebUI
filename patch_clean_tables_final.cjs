const fs = require('fs');
const file = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(file, 'utf8');

// Dashboard Emoji Removals
js = js.replace(`{ title: "🧩 技能名称",`, `{ title: "技能名称",`);
js = js.replace(`{ title: "📝 功能描述",`, `{ title: "功能描述",`);
js = js.replace(`{ title: "📦 来源位置",`, `{ title: "来源位置",`);
js = js.replace(`{ title: "🟢 启用状态",`, `{ title: "启用状态",`);
js = js.replace(`{ title: "✅ 可用性 (Eligible)",`, `{ title: "可用性",`);

// English headers cleanup for other pages
js = js.replace(`title: "Skill"`, `title: "技能名称"`);
js = js.replace(`title: "Description"`, `title: "描述"`);
js = js.replace(`title: "Source"`, `title: "来源"`);
js = js.replace(`title: "Enabled"`, `title: "启用状态"`);
js = js.replace(`title: "Eligible"`, `title: "可用性"`);

js = js.replace(`title: "Name"`, `title: "任务名称"`);
js = js.replace(`title: "Schedule"`, `title: "计划规则"`);
js = js.replace(`title: "Last"`, `title: "最近运行"`);
js = js.replace(`title: "Actions"`, `title: "操作"`);

js = js.replace(`title: "Node"`, `title: "节点名称"`);
js = js.replace(`title: "Status"`, `title: "状态"`);
js = js.replace(`title: "Platform"`, `title: "运行平台"`);
js = js.replace(`title: "Remote IP"`, `title: "远程IP"`);
js = js.replace(`title: "Caps"`, `title: "能力(Caps)"`);

// Translate text values
js = js.replace(`"online" : "offline"`, `"在线" : "离线"`);

fs.writeFileSync(file, js);

const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');

const CLEAN_TH = `
/* Refined Minimalist Table Headers */
table th {
  letter-spacing: 0.5px !important;
  font-weight: 600 !important;
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
