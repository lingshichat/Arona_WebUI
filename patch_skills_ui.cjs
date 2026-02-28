const fs = require('fs');

// 1. 修复 index.html
const htmlFile = '/home/openclaw-mvp/public/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');

const OLD_HTML_SKILLS = `<section id="view-skills" class="view">
           <div class="page-header"><h1 class="page-title">技能 Skills</h1></div>
           <div class="glass-panel" id="skills-table"></div>
        </section>`;

const NEW_HTML_SKILLS = `<section id="view-skills" class="view">
           <div style="margin-bottom: 25px; padding: 0 5px;">
              <h2 style="margin: 0 0 5px; font-weight: 600; font-size: 1.5rem; letter-spacing: 1px;">技能状态</h2>
              <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem;">查看和管理当前安装的 Agent 技能，掌控终端能力。</p>
           </div>
           <div class="glass-panel" id="skills-table" style="border-radius: 16px; overflow: hidden;"></div>
        </section>`;
        
// 给其他页面也应用这个结构（比如模型管理）
const OLD_HTML_MODELS = `<section id="view-models" class="view">
          <div class="page-header">
            <h1 class="page-title">模型管理</h1>
          </div>
          <div class="glass-panel">`;

const NEW_HTML_MODELS = `<section id="view-models" class="view">
          <div style="margin-bottom: 25px; padding: 0 5px;">
            <h2 style="margin: 0 0 5px; font-weight: 600; font-size: 1.5rem; letter-spacing: 1px;">模型管理</h2>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem;">调整终端运行的大脑，为不同任务分配专属模型。</p>
          </div>
          <div class="glass-panel">`;

const OLD_HTML_CRON = `<section id="view-cron" class="view">
           <div class="page-header"><h1 class="page-title">任务计划 Cron</h1></div>`;

const NEW_HTML_CRON = `<section id="view-cron" class="view">
           <div style="margin-bottom: 25px; padding: 0 5px;">
              <h2 style="margin: 0 0 5px; font-weight: 600; font-size: 1.5rem; letter-spacing: 1px;">任务计划</h2>
              <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem;">配置周期性任务或单次提醒，全自动化流转。</p>
           </div>`;

const OLD_HTML_NODES = `<section id="view-nodes" class="view">
           <div class="page-header"><h1 class="page-title">节点拓扑 Nodes</h1></div>`;

const NEW_HTML_NODES = `<section id="view-nodes" class="view">
           <div style="margin-bottom: 25px; padding: 0 5px;">
              <h2 style="margin: 0 0 5px; font-weight: 600; font-size: 1.5rem; letter-spacing: 1px;">节点拓扑</h2>
              <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem;">实时监控和控制网络中配对的设备终端。</p>
           </div>`;

const OLD_HTML_LOGS = `<section id="view-logs" class="view">
           <div class="page-header"><h1 class="page-title">实时日志</h1></div>`;

const NEW_HTML_LOGS = `<section id="view-logs" class="view">
           <div style="margin-bottom: 25px; padding: 0 5px;">
              <h2 style="margin: 0 0 5px; font-weight: 600; font-size: 1.5rem; letter-spacing: 1px;">实时日志</h2>
              <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem;">捕获底层运行轨迹，快速定位终端异常。</p>
           </div>`;

html = html.replace(OLD_HTML_SKILLS, NEW_HTML_SKILLS);
html = html.replace(OLD_HTML_MODELS, NEW_HTML_MODELS);
html = html.replace(OLD_HTML_CRON, NEW_HTML_CRON);
html = html.replace(OLD_HTML_NODES, NEW_HTML_NODES);
html = html.replace(OLD_HTML_LOGS, NEW_HTML_LOGS);

fs.writeFileSync(htmlFile, html);

// 2. 修复 app.js 中的 Skills 渲染逻辑
const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

const OLD_SKILLS_TABLE = `const html = renderTable(
      [
        { title: "Skill", render: (r) => \`<strong>\${escapeHtml(r.name)}</strong><br/><span class="muted">\${escapeHtml(r.key)}</span>\` },
        { title: "Description", render: (r) => escapeHtml(r.description || "-") },
        { title: "Source", key: "source" },
        {
          title: "Enabled",
          render: (r) => \`<input type="checkbox" data-skill-toggle="\${escapeHtml(r.key)}" \${r.enabled ? "checked" : ""} />\`
        },
        {
          title: "Eligible",
          render: (r) => \`<span class="status-badge \${r.eligible ? "ok" : "warn"}">\${r.eligible ? "yes" : "no"}</span>\`
        }
      ],
      rows
    );`;

const NEW_SKILLS_TABLE = `const html = renderTable(
      [
        { 
          title: "🧩 技能名称", 
          render: (r) => \`<div style="display:flex; flex-direction:column; gap:6px;">
                            <strong style="font-size: 1rem; color: var(--text-primary); letter-spacing:0.5px;">\${escapeHtml(r.name.replace(/\\s*\\(.*?\\)/, ''))}</strong>
                            <span style="font-size: 0.8rem; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; display: inline-block; width: fit-content; border: 1px solid rgba(255,255,255,0.05); font-family: monospace;">\${escapeHtml(r.key)}</span>
                          </div>\` 
        },
        { 
          title: "📝 功能描述", 
          render: (r) => \`<div style="max-width: 400px; line-height: 1.5; color: rgba(255,255,255,0.85); font-size: 0.9rem;">\${escapeHtml(r.description || "-")}</div>\` 
        },
        { 
          title: "📦 来源位置", 
          render: (r) => \`<span class="provider-chip" style="margin:0; background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.15); color: var(--text-secondary);">\${escapeHtml(r.source)}</span>\`
        },
        {
          title: "🟢 启用状态",
          render: (r) => \`
            <label class="switch-toggle" style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
              <input type="checkbox" data-skill-toggle="\${escapeHtml(r.key)}" \${r.enabled ? "checked" : ""} style="opacity: 0; width: 0; height: 0; position: absolute;" />
              <span class="slider" style="position: relative; width: 44px; height: 24px; background: \${r.enabled ? '#10b981' : 'rgba(255,255,255,0.2)'}; border-radius: 20px; transition: 0.3s; display: inline-block; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
                <span class="knob" style="position: absolute; width: 18px; height: 18px; background: #fff; border-radius: 50%; top: 3px; left: \${r.enabled ? '23px' : '3px'}; transition: 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"></span>
              </span>
            </label>\`
        },
        {
          title: "✅ 可用性 (Eligible)",
          render: (r) => \`<span class="status-badge \${r.eligible ? 'ok' : 'warn'}" style="box-shadow: 0 0 10px \${r.eligible ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)'}; padding: 6px 14px; border-radius: 20px;">\${r.eligible ? '<i class="fa-solid fa-check" style="margin-right:4px;"></i>就绪' : '<i class="fa-solid fa-triangle-exclamation" style="margin-right:4px;"></i>拦截'}</span>\`
        }
      ],
      rows
    );`;

js = js.replace(OLD_SKILLS_TABLE, NEW_SKILLS_TABLE);

fs.writeFileSync(jsFile, js);

// 3. 全局 CSS 优化
const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');

const MORE_CSS = `
/* Global Toggle Switch Styles */
.switch-toggle input:checked + .slider { background: #10b981 !important; box-shadow: 0 0 10px rgba(16, 185, 129, 0.3) !important; }
.switch-toggle input:checked + .slider .knob { left: 23px !important; }

/* Global Table Beautification */
table { 
  width: 100%; 
  border-collapse: separate; 
  border-spacing: 0; 
}
th { 
  text-align: left; 
  padding: 16px 20px; 
  color: #fff; 
  font-size: 0.9rem; 
  font-weight: 600; 
  text-transform: none; 
  border-bottom: 1px solid rgba(255, 255, 255, 0.1); 
  background: rgba(0, 0, 0, 0.2); 
}
td { 
  padding: 16px 20px; 
  border-bottom: 1px solid rgba(255, 255, 255, 0.05); 
  font-size: 0.95rem; 
  vertical-align: middle; 
}
tr:last-child td { border-bottom: none; }
tr { transition: background 0.3s ease; }
tr:hover td { background: rgba(255, 255, 255, 0.04); }

/* Better Title Headers */
.page-title { display: none; /* Hide old ugly headers */ }

/* Remove old page-header spacing */
.page-header { display: none; }
`;

css += MORE_CSS;
fs.writeFileSync(cssFile, css);

