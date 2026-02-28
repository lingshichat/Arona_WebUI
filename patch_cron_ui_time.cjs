const fs = require('fs');

const htmlFile = '/home/openclaw-mvp/public/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');

const OLD_VAL_INPUT = `<div class="config-row" id="cron-form-value-wrap" style="margin-bottom: 0;">
                        <label id="cron-form-value-label" style="color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; margin-bottom: 8px; display: block;">Cron 表达式</label>
                        <input type="text" id="cron-form-value" placeholder="例如：0 8 * * *" style="width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff; font-size: 0.95rem; font-family: var(--font-mono); box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);" />
                      </div>`;

const NEW_VAL_INPUT = `<div class="config-row" id="cron-form-value-wrap" style="margin-bottom: 0; position: relative;">
                        <label id="cron-form-value-label" style="color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; margin-bottom: 8px; display: block;">执行时间 (HH:mm)</label>
                        
                        <!-- 时间选择器 (用于 Cron 每天执行) -->
                        <div id="cron-time-picker" style="display: flex; gap: 10px;">
                          <input type="time" id="cron-form-time" value="08:00" style="width: 100%; padding: 11px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff; font-size: 1rem; font-family: var(--font-mono); box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); cursor: pointer;" />
                        </div>
                        
                        <!-- 文本输入框 (用于 At 或 Every) -->
                        <input type="text" id="cron-form-value" placeholder="" style="display: none; width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff; font-size: 0.95rem; font-family: var(--font-mono); box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);" />
                        
                      </div>`;

html = html.replace(OLD_VAL_INPUT, NEW_VAL_INPUT);
fs.writeFileSync(htmlFile, html);

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

const OLD_JS_INIT = `  if (kindSelect) {
    kindSelect.addEventListener("change", () => {
      const v = kindSelect.value;
      if (v === "cron") {
        valLabel.textContent = "Cron 表达式";
        valInput.placeholder = "例如：0 8 * * *";
        valInput.value = "";
      } else if (v === "at") {
        valLabel.textContent = "触发时间 (ISO或绝对时间)";
        valInput.placeholder = "例如：" + new Date(Date.now() + 3600000).toISOString();
        valInput.value = new Date(Date.now() + 3600000).toISOString();
      } else if (v === "every") {
        valLabel.textContent = "间隔毫秒 (Ms)";
        valInput.placeholder = "例如：60000";
        valInput.value = "60000";
      }
    });
  }`;

const NEW_JS_INIT = `  if (kindSelect) {
    kindSelect.addEventListener("change", () => {
      const v = kindSelect.value;
      const timePicker = $("cron-time-picker");
      
      if (v === "cron") {
        valLabel.textContent = "执行时间 (每天)";
        valInput.style.display = "none";
        timePicker.style.display = "flex";
      } else if (v === "at") {
        valLabel.textContent = "指定日期时间 (ISO格式)";
        timePicker.style.display = "none";
        valInput.style.display = "block";
        
        // 生成一个友好的默认值（当前时间后一小时）
        const tzOffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(Date.now() - tzOffset + 3600000)).toISOString().slice(0, 16);
        valInput.type = "datetime-local";
        valInput.value = localISOTime;
        
      } else if (v === "every") {
        valLabel.textContent = "间隔时间";
        timePicker.style.display = "none";
        valInput.style.display = "block";
        valInput.type = "text";
        valInput.placeholder = "输入算式，如 30 * 60000 (半小时)";
        valInput.value = "60000";
      }
    });
  }`;

js = js.replace(OLD_JS_INIT, NEW_JS_INIT);

const OLD_ADD_FUNC = `      const schedule = { kind };
      if (kind === "cron") {
        schedule.expr = value;
      } else if (kind === "at") {
        schedule.at = value;
      } else if (kind === "every") {`;

const NEW_ADD_FUNC = `      const schedule = { kind };
      if (kind === "cron") {
        const timeVal = $("cron-form-time").value; // e.g. "08:30"
        if (!timeVal) {
           showToast("请选择每天执行的时间！", "error");
           return;
        }
        const [hh, mm] = timeVal.split(":");
        // 拼接成标准 cron 表达式 (分 时 * * *)
        schedule.expr = \`\${parseInt(mm, 10)} \${parseInt(hh, 10)} * * *\`;
        schedule.tz = "Asia/Shanghai"; // 给默认时区保证时间准确
      } else if (kind === "at") {
        let parsedAt = value;
        // 如果是 datetime-local 选出来的值 (YYYY-MM-DDThh:mm)
        if (value.length === 16 && value.includes('T')) {
           parsedAt = new Date(value).toISOString();
        }
        schedule.at = parsedAt;
      } else if (kind === "every") {`;

// 还需要调整前面的校验，因为 cron 现在是用 timeVal 而不是 value
const OLD_VALIDATION = `const value = $("cron-form-value").value.trim();
      const message = $("cron-form-message").value.trim();
      
      if (!value) {
        showToast("请填写计划触发规则！", "error");
        return;
      }`;

const NEW_VALIDATION = `const value = $("cron-form-value").value.trim();
      const message = $("cron-form-message").value.trim();
      
      if (kind !== "cron" && !value) {
        showToast("请填写计划触发规则！", "error");
        return;
      }`;

js = js.replace(OLD_ADD_FUNC, NEW_ADD_FUNC);
js = js.replace(OLD_VALIDATION, NEW_VALIDATION);

fs.writeFileSync(jsFile, js);

const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');
const TIME_CSS = `
/* Input time picker icon color for dark mode */
input[type="time"]::-webkit-calendar-picker-indicator,
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
    opacity: 0.6;
}
input[type="time"]::-webkit-calendar-picker-indicator:hover,
input[type="datetime-local"]::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
}
`;
if(!css.includes('::-webkit-calendar-picker-indicator')) {
  fs.writeFileSync(cssFile, css + TIME_CSS);
}
