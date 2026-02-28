const fs = require('fs');

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

const OLD_CRON_SCHEDULE = `        { title: "计划规则", render: (r) => {
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

const NEW_CRON_SCHEDULE = `        { title: "计划规则", render: (r) => {
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

js = js.replace(OLD_CRON_SCHEDULE, NEW_CRON_SCHEDULE);

const OLD_ADD_FUNC = `const name = $("cron-form-name").value.trim();
      const kind = $("cron-form-kind").value;
      const value = $("cron-form-value").value.trim();
      const message = $("cron-form-message").value.trim();
      
      if (!value) {
        showToast("请填写计划触发规则！", "error");
        return;
      }
      if (!message) {
        showToast("请填写任务指令 (Prompt)！", "error");
        return;
      }
      
      const schedule = { kind };
      if (kind === "cron") schedule.expr = value;
      if (kind === "at") schedule.at = value;
      if (kind === "every") schedule.everyMs = parseInt(value, 10);`;

const NEW_ADD_FUNC = `const name = $("cron-form-name").value.trim();
      const kind = $("cron-form-kind").value;
      const value = $("cron-form-value").value.trim();
      const message = $("cron-form-message").value.trim();
      
      if (!value) {
        showToast("请填写计划触发规则！", "error");
        return;
      }
      if (!message) {
        showToast("请填写任务指令 (Prompt)！", "error");
        return;
      }
      
      const schedule = { kind };
      if (kind === "cron") {
        schedule.expr = value;
      } else if (kind === "at") {
        schedule.at = value;
      } else if (kind === "every") {
        // Evaluate user input safely (e.g. they might type "30 * 60000" or just "1800000")
        let parsedMs = 0;
        try {
          parsedMs = eval(value.replace(/[^0-9\\*\\+\\-\\.\\/\\(\\)]/g, ''));
        } catch(e) {
          parsedMs = parseInt(value, 10);
        }
        schedule.everyMs = parsedMs;
      }`;

js = js.replace(OLD_ADD_FUNC, NEW_ADD_FUNC);

fs.writeFileSync(jsFile, js);
