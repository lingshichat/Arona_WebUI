const fs = require('fs');

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

// 1. 任务名称列优化 (和技能管理一致的副标题)
const OLD_CRON_NAME = `        { title: "任务名称", render: (r) => \`<strong>\${escapeHtml(r.name || "(unnamed)")}</strong><br/><span class="muted">\${escapeHtml(r.id)}</span>\` },`;
const NEW_CRON_NAME = `        { title: "任务名称", render: (r) => \`<div style="display:flex; flex-direction:column; gap:4px;">
                            <strong style="font-size: 1rem; color: #fff; font-weight: 500;">\${escapeHtml(r.name || "(unnamed)")}</strong>
                            <span style="font-size: 0.8rem; color: rgba(255,255,255,0.4); font-family: var(--font-mono); letter-spacing: 0.5px;">\${escapeHtml(r.id)}</span>
                          </div>\` },`;
js = js.replace(OLD_CRON_NAME, NEW_CRON_NAME);

// 2. 启用状态开关优化 (使用之前的拨动开关)
const OLD_CRON_ENABLED = `          title: "启用状态",
          render: (r) => \`<input type="checkbox" data-cron-enabled="\${escapeHtml(r.id)}" \${r.enabled ? "checked" : ""} />\``;
const NEW_CRON_ENABLED = `          title: "启用状态",
          render: (r) => \`
            <label class="switch-toggle" style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
              <input type="checkbox" data-cron-enabled="\${escapeHtml(r.id)}" \${r.enabled ? "checked" : ""} style="opacity: 0; width: 0; height: 0; position: absolute;" />
              <span class="slider" style="position: relative; width: 40px; height: 22px; background: \${r.enabled ? 'var(--primary-color)' : 'rgba(255,255,255,0.15)'}; border-radius: 20px; transition: 0.3s; display: inline-block; border: 1px solid rgba(255,255,255,0.1);">
                <span class="knob" style="position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; top: 2px; left: \${r.enabled ? '20px' : '2px'}; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>
              </span>
            </label>\``;
js = js.replace(OLD_CRON_ENABLED, NEW_CRON_ENABLED);

// 3. 计划规则 JSON 代码块美化
const OLD_CRON_SCHEDULE = `        { title: "计划规则", render: (r) => \`<code>\${escapeHtml(JSON.stringify(r.schedule || {}))}</code>\` },`;
const NEW_CRON_SCHEDULE = `        { title: "计划规则", render: (r) => {
            const sch = r.schedule || {};
            let badge = '';
            if (sch.kind === 'at') {
                const timeStr = new Date(sch.at).toLocaleString();
                badge = \`<span style="color: #60a5fa; background: rgba(59, 112, 252, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(59, 112, 252, 0.3); margin-bottom: 6px; display: inline-block;">一次性 (At)</span><br><span style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">\${timeStr}</span>\`;
            } else if (sch.kind === 'cron') {
                badge = \`<span style="color: #34d399; background: rgba(16, 185, 129, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(16, 185, 129, 0.3); margin-bottom: 6px; display: inline-block;">周期 (Cron)</span><br><code style="font-size: 0.85rem; padding: 2px 6px; background: rgba(0,0,0,0.2); border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); color: #fff;">\${escapeHtml(sch.expr)}</code>\`;
            } else if (sch.kind === 'every') {
                badge = \`<span style="color: #fcd34d; background: rgba(251, 191, 36, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(251, 191, 36, 0.3); margin-bottom: 6px; display: inline-block;">间隔 (Every)</span><br><span style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">\${sch.everyMs} ms</span>\`;
            } else {
                badge = \`<code style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">\${escapeHtml(JSON.stringify(sch))}</code>\`;
            }
            return badge;
        }},`;
js = js.replace(OLD_CRON_SCHEDULE, NEW_CRON_SCHEDULE);

// 4. 最近运行状态美化
const OLD_CRON_LAST = `            return \`\${escapeHtml(stateInfo.lastStatus || "-")}\${stateInfo.lastRunAtMs ? \`<br/><span class="muted">\${new Date(stateInfo.lastRunAtMs).toLocaleString()}</span>\` : ""}\`;`;
const NEW_CRON_LAST = `            let statusBadge = '<span style="color: var(--text-muted);">-</span>';
            if (stateInfo.lastStatus === 'ok') {
                statusBadge = '<span style="color: #34d399; font-weight: 500;"><i class="fa-solid fa-check-circle" style="margin-right:4px;"></i>成功</span>';
            } else if (stateInfo.lastStatus === 'error') {
                statusBadge = '<span style="color: #f87171; font-weight: 500;"><i class="fa-solid fa-xmark-circle" style="margin-right:4px;"></i>失败</span>';
            } else if (stateInfo.lastStatus) {
                statusBadge = \`<span>\${escapeHtml(stateInfo.lastStatus)}</span>\`;
            }
            const timeStr = stateInfo.lastRunAtMs ? \`<div style="font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-top: 4px;">\${new Date(stateInfo.lastRunAtMs).toLocaleString()}</div>\` : "";
            return \`<div>\${statusBadge}\${timeStr}</div>\`;`;
js = js.replace(OLD_CRON_LAST, NEW_CRON_LAST);

// 5. 操作按钮组美化
const OLD_CRON_ACTIONS = `          render: (r) =>
            \`<button data-cron-run="\${escapeHtml(r.id)}">Run</button>
             <button data-cron-runs="\${escapeHtml(r.id)}" class="ghost">Runs</button>
             <button data-cron-remove="\${escapeHtml(r.id)}" class="ghost">Remove</button>\``;
const NEW_CRON_ACTIONS = `          render: (r) =>
            \`<div style="display: flex; gap: 8px;">
               <button data-cron-run="\${escapeHtml(r.id)}" class="action-btn play-btn" title="立即执行"><i class="fa-solid fa-play"></i></button>
               <button data-cron-runs="\${escapeHtml(r.id)}" class="action-btn log-btn" title="运行日志"><i class="fa-solid fa-clock-rotate-left"></i></button>
               <button data-cron-remove="\${escapeHtml(r.id)}" class="action-btn del-btn" title="删除任务"><i class="fa-solid fa-trash-can"></i></button>
             </div>\``;
js = js.replace(OLD_CRON_ACTIONS, NEW_CRON_ACTIONS);

fs.writeFileSync(jsFile, js);

const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');
const ACTIONS_CSS = `
/* Action Buttons in Tables */
.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}
.action-btn:hover {
  transform: translateY(-2px);
  color: #fff;
}
.play-btn:hover { background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.4); color: #34d399; }
.log-btn:hover { background: rgba(59, 112, 252, 0.2); border-color: rgba(59, 112, 252, 0.4); color: #60a5fa; }
.del-btn:hover { background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); color: #f87171; }
`;

if (!css.includes('.action-btn')) {
    fs.writeFileSync(cssFile, css + ACTIONS_CSS);
}
