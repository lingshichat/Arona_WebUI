const fs = require('fs');

// 1. Fix missing headers in index.html and unify the design
const htmlFile = '/home/openclaw-mvp/public/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');

const OVERVIEW_OLD = `<section id="view-overview" class="view active">
          <div class="page-header">
            <h1 class="page-title">仪表盘</h1>
            <p style="color: var(--text-secondary); margin-top: 8px;">欢迎回来，阿洛娜随时为您待命！</p>
          </div>`;

const OVERVIEW_NEW = `<section id="view-overview" class="view active">
          <div style="margin-bottom: 25px; padding: 0 5px;">
            <h2 style="margin: 0 0 5px; font-weight: 600; font-size: 1.5rem; letter-spacing: 1px;">仪表盘</h2>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem;">欢迎回来，阿洛娜随时为您待命！</p>
          </div>`;
html = html.replace(OVERVIEW_OLD, OVERVIEW_NEW);

const CRON_OLD = `<section id="view-cron" class="view">
           <div class="page-header"><h1 class="page-title">任务 Cron</h1></div>`;

const CRON_NEW = `<section id="view-cron" class="view">
           <div style="margin-bottom: 25px; padding: 0 5px;">
              <h2 style="margin: 0 0 5px; font-weight: 600; font-size: 1.5rem; letter-spacing: 1px;">任务计划</h2>
              <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem;">配置周期性任务或单次提醒，全自动化流转。</p>
           </div>`;
html = html.replace(CRON_OLD, CRON_NEW);

const NODES_OLD = `<section id="view-nodes" class="view">
           <div class="page-header"><h1 class="page-title">节点 Nodes</h1></div>`;

const NODES_NEW = `<section id="view-nodes" class="view">
           <div style="margin-bottom: 25px; padding: 0 5px;">
              <h2 style="margin: 0 0 5px; font-weight: 600; font-size: 1.5rem; letter-spacing: 1px;">节点拓扑</h2>
              <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem;">实时监控和控制网络中配对的设备终端。</p>
           </div>`;
html = html.replace(NODES_OLD, NODES_NEW);

fs.writeFileSync(htmlFile, html);

// 2. Remove emojis from table headers in app.js
const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

js = js.replace(`{ title: "🧩 技能名称",`, `{ title: "技能名称",`);
js = js.replace(`{ title: "📝 功能描述",`, `{ title: "功能描述",`);
js = js.replace(`{ title: "📦 来源位置",`, `{ title: "来源位置",`);
js = js.replace(`{ title: "🟢 启用状态",`, `{ title: "启用状态",`);
js = js.replace(`{ title: "✅ 可用性 (Eligible)",`, `{ title: "可用性",`);

// Remove icon from eligible column for minimalist design
js = js.replace(`'<i class="fa-solid fa-check" style="margin-right:4px;"></i>就绪'`, `'就绪'`);
js = js.replace(`'<i class="fa-solid fa-triangle-exclamation" style="margin-right:4px;"></i>拦截'`, `'未就绪'`);

// Remove emojis from dashboard panels
js = js.replace(`title: "💬 会话标识"`, `title: "会话标识"`);
js = js.replace(`title: "🤖 所用模型"`, `title: "所用模型"`);
js = js.replace(`title: "⏱ 更新时间"`, `title: "更新时间"`);

js = js.replace(`title: "📡 频道名称"`, `title: "频道名称"`);
js = js.replace(`title: "⚡ 连接状态"`, `title: "连接状态"`);
js = js.replace(`title: "📝 详细信息"`, `title: "详细信息"`);

fs.writeFileSync(jsFile, js);

