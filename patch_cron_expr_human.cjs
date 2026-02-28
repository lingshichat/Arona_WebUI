const fs = require('fs');

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

const OLD_CRON_SCHEDULE = `        { title: "计划规则", render: (r) => {
            const sch = r.schedule || {};
            let badge = '';
            if (sch.kind === 'at') {
                const timeStr = new Date(sch.at).toLocaleString();
                badge = \`<span style="color: #60a5fa; background: rgba(59, 112, 252, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(59, 112, 252, 0.3); margin-bottom: 6px; display: inline-block;">一次性</span><br><span style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">\${timeStr}</span>\`;
            } else if (sch.kind === 'cron') {
                const expr = sch.human || sch.expr;
                badge = \`<span style="color: #34d399; background: rgba(16, 185, 129, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(16, 185, 129, 0.3); margin-bottom: 6px; display: inline-block;">周期计划</span><br><span style="font-size: 0.85rem; color: rgba(255,255,255,0.85);">\${escapeHtml(expr)}</span>\`;
            } else if (sch.kind === 'every') {
                const ms = parseInt(sch.everyMs, 10);
                const desc = ms >= 60000 ? \`每 \${Math.round(ms/60000)} 分钟\` : \`每 \${Math.round(ms/1000)} 秒\`;
                badge = \`<span style="color: #fcd34d; background: rgba(251, 191, 36, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(251, 191, 36, 0.3); margin-bottom: 6px; display: inline-block;">循环间隔</span><br><span style="font-size: 0.85rem; color: rgba(255,255,255,0.85);">\${desc}</span>\`;
            } else {
                badge = \`<code style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">\${escapeHtml(JSON.stringify(sch))}</code>\`;
            }
            return badge;
        }},`;

const NEW_CRON_SCHEDULE = `        { title: "计划规则", render: (r) => {
            const sch = r.schedule || {};
            let badge = '';
            if (sch.kind === 'at') {
                const timeStr = new Date(sch.at).toLocaleString();
                badge = \`<span style="color: #60a5fa; background: rgba(59, 112, 252, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(59, 112, 252, 0.3); margin-bottom: 6px; display: inline-block;">一次性</span><br><span style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">\${timeStr}</span>\`;
            } else if (sch.kind === 'cron') {
                // Remove the "在" prefix for cleaner UI if present (cronstrue sometimes adds it)
                let expr = sch.human || sch.expr;
                if (expr && expr.startsWith('在 ')) expr = expr.substring(2);
                if (expr && expr.startsWith('在')) expr = expr.substring(1);
                
                badge = \`<span style="color: #34d399; background: rgba(16, 185, 129, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(16, 185, 129, 0.3); margin-bottom: 6px; display: inline-block;">周期计划</span><br><span style="font-size: 0.85rem; color: rgba(255,255,255,0.85);">\${escapeHtml(expr)}</span>\`;
            } else if (sch.kind === 'every') {
                const ms = parseInt(sch.everyMs, 10);
                const desc = ms >= 60000 ? \`每 \${Math.round(ms/60000)} 分钟\` : \`每 \${Math.round(ms/1000)} 秒\`;
                badge = \`<span style="color: #fcd34d; background: rgba(251, 191, 36, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(251, 191, 36, 0.3); margin-bottom: 6px; display: inline-block;">循环间隔</span><br><span style="font-size: 0.85rem; color: rgba(255,255,255,0.85);">\${desc}</span>\`;
            } else {
                badge = \`<code style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">\${escapeHtml(JSON.stringify(sch))}</code>\`;
            }
            return badge;
        }},`;

js = js.replace(OLD_CRON_SCHEDULE, NEW_CRON_SCHEDULE);
fs.writeFileSync(jsFile, js);
