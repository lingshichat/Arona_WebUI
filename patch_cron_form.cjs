const fs = require('fs');

const htmlFile = '/home/openclaw-mvp/public/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');

const OLD_HTML = `<div class="glass-panel" style="margin-top: 30px;">
              <div class="panel-header" style="background: rgba(0,0,0,0.15);">
                <span class="panel-title"><i class="fa-solid fa-code" style="color: var(--primary-color); margin-right: 8px;"></i>新建计划任务 (JSON)</span>
              </div>
              <div class="config-form" style="padding: 25px;">
                 <div style="margin-bottom: 15px; color: var(--text-muted); font-size: 0.9rem; display: flex; justify-content: space-between; align-items: flex-end;">
                   <span>在这里粘贴符合 OpenClaw 格式的 Cron Job JSON 配置：</span>
                   <button id="cron-template" class="panel-action-btn" style="background: rgba(59, 112, 252, 0.15); border-color: rgba(59, 112, 252, 0.3); color: #fff; padding: 6px 12px;"><i class="fa-solid fa-bolt"></i> 填入默认模板</button>
                 </div>
                 <div style="position: relative; border-radius: 12px; overflow: hidden; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);">
                   <textarea id="cron-job-json" rows="12" style="margin-bottom: 0; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.4); font-family: var(--font-mono); font-size: 0.9rem; padding: 16px; color: #a3c2ff; line-height: 1.6;"></textarea>
                 </div>
                 <div class="actions" style="margin-top: 25px; display: flex; justify-content: flex-end;">
                    <button id="cron-add" class="btn-primary"><i class="fa-solid fa-paper-plane"></i> 下发创建任务</button>
                 </div>
                 <pre id="cron-result" class="result" style="display: none; margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); color: #81c784; font-size: 0.85rem; max-height: 150px; overflow-y: auto;"></pre>
              </div>
           </div>`;

const NEW_HTML = `<div class="glass-panel" style="margin-top: 30px;">
              <div class="panel-header" style="background: rgba(0,0,0,0.15);">
                <div style="display: flex; gap: 15px;">
                  <button class="tab-btn active" id="cron-tab-form">可视化表单</button>
                  <button class="tab-btn" id="cron-tab-json">JSON 源码</button>
                </div>
              </div>
              <div class="config-form" style="padding: 25px;">
                 
                 <!-- 表单视图 -->
                 <div id="cron-view-form">
                    <div class="config-row">
                      <label>任务名称 Name</label>
                      <input type="text" id="cron-form-name" placeholder="例如：每日早安问候" />
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                      <div class="config-row">
                        <label>计划类型 Type</label>
                        <select id="cron-form-kind" style="width: 100%; padding: 12px; border-radius: 8px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.15); color: #fff;">
                          <option value="cron">周期循环 (Cron)</option>
                          <option value="at">一次性 (At)</option>
                          <option value="every">间隔触发 (Every)</option>
                        </select>
                      </div>
                      <div class="config-row" id="cron-form-value-wrap">
                        <label id="cron-form-value-label">Cron 表达式</label>
                        <input type="text" id="cron-form-value" placeholder="例如：0 8 * * *" />
                      </div>
                    </div>

                    <div class="config-row">
                      <label>任务指令 Prompt / Message</label>
                      <textarea id="cron-form-message" rows="4" placeholder="例如：查询今天的天气并向老师汇报"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 25px;">
                      <label style="margin:0; display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" id="cron-form-isolated" checked />
                        <span>隔离运行 (Isolated Session)</span>
                      </label>
                      <label style="margin:0; display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" id="cron-form-enabled" checked />
                        <span>立即启用 (Enabled)</span>
                      </label>
                    </div>
                 </div>

                 <!-- JSON 视图 (隐藏) -->
                 <div id="cron-view-json" style="display: none;">
                   <div style="margin-bottom: 15px; color: var(--text-muted); font-size: 0.9rem; display: flex; justify-content: space-between; align-items: flex-end;">
                     <span>支持高级语法的完整 JSON 配置：</span>
                     <button id="cron-template" class="panel-action-btn" style="background: rgba(59, 112, 252, 0.15); border-color: rgba(59, 112, 252, 0.3); color: #fff; padding: 6px 12px;"><i class="fa-solid fa-bolt"></i> 填入默认模板</button>
                   </div>
                   <div style="position: relative; border-radius: 12px; overflow: hidden; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);">
                     <textarea id="cron-job-json" rows="12" style="margin-bottom: 0; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.4); font-family: var(--font-mono); font-size: 0.9rem; padding: 16px; color: #a3c2ff; line-height: 1.6;"></textarea>
                   </div>
                 </div>

                 <div class="actions" style="margin-top: 15px; display: flex; justify-content: flex-end;">
                    <button id="cron-add" class="btn-primary"><i class="fa-solid fa-paper-plane"></i> 下发创建任务</button>
                 </div>
                 <pre id="cron-result" class="result" style="display: none;"></pre>
              </div>
           </div>`;

html = html.replace(OLD_HTML, NEW_HTML);
fs.writeFileSync(htmlFile, html);

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

// Replace the init logic and events for the forms
const NEW_JS_INIT = `
  // Setup Cron Tab interactions
  const tabForm = $("cron-tab-form");
  const tabJson = $("cron-tab-json");
  const viewForm = $("cron-view-form");
  const viewJson = $("cron-view-json");
  let isCronJsonMode = false;

  if (tabForm && tabJson) {
    tabForm.addEventListener("click", () => {
      tabForm.classList.add("active");
      tabJson.classList.remove("active");
      viewForm.style.display = "block";
      viewJson.style.display = "none";
      isCronJsonMode = false;
    });
    tabJson.addEventListener("click", () => {
      tabJson.classList.add("active");
      tabForm.classList.remove("active");
      viewJson.style.display = "block";
      viewForm.style.display = "none";
      isCronJsonMode = true;
    });
  }

  // Setup Cron Form Type interaction
  const kindSelect = $("cron-form-kind");
  const valLabel = $("cron-form-value-label");
  const valInput = $("cron-form-value");
  
  if (kindSelect) {
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
  }
`;

js = js.replace(`$("cron-template")?.addEventListener("click", () => {`, NEW_JS_INIT + `\n  $("cron-template")?.addEventListener("click", () => {`);

const OLD_ADD_FUNC = `async function addCronJob() {
  try {
    const rawVal = $("cron-job-json").value.trim();
    if (!rawVal) {
      showToast("任务配置内容不能为空！", "error");
      return;
    }
    
    let job;
    try {
      job = JSON.parse(rawVal);
    } catch (e) {
      showToast("JSON 格式错误，请检查语法！", "error");
      return;
    }`;

const NEW_ADD_FUNC = `async function addCronJob() {
  try {
    let job;
    
    if (typeof isCronJsonMode !== 'undefined' && isCronJsonMode) {
      const rawVal = $("cron-job-json").value.trim();
      if (!rawVal) {
        showToast("任务配置内容不能为空！", "error");
        return;
      }
      try {
        job = JSON.parse(rawVal);
      } catch (e) {
        showToast("JSON 格式错误，请检查语法！", "error");
        return;
      }
    } else {
      // Form builder mode
      const name = $("cron-form-name").value.trim();
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
      if (kind === "every") schedule.everyMs = parseInt(value, 10);
      
      job = {
        name: name || "Untitled Task",
        schedule,
        payload: {
          kind: "agentTurn",
          message
        },
        sessionTarget: $("cron-form-isolated").checked ? "isolated" : "main",
        enabled: $("cron-form-enabled").checked
      };
    }`;

js = js.replace(OLD_ADD_FUNC, NEW_ADD_FUNC);

fs.writeFileSync(jsFile, js);

const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');
const TABS_CSS = `
/* Tabs for forms */
.tab-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  font-weight: 500;
  padding: 10px 15px;
  cursor: pointer;
  position: relative;
  transition: 0.3s;
}
.tab-btn:hover {
  color: #fff;
}
.tab-btn.active {
  color: var(--primary-color);
  font-weight: 600;
}
.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--primary-color);
  border-radius: 3px 3px 0 0;
}
`;

if (!css.includes('.tab-btn')) {
    fs.writeFileSync(cssFile, css + TABS_CSS);
}
