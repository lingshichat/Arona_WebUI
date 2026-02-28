const fs = require('fs');

const htmlFile = '/home/openclaw-mvp/public/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');

const OLD_HTML = `<div class="glass-panel" style="margin-top: 20px;">
              <div class="panel-header"><span class="panel-title">新建任务</span></div>
              <div style="padding: 20px;">
                 <textarea id="cron-job-json" rows="10" style="margin-bottom: 15px;"></textarea>
                 <div class="actions">
                    <button id="cron-add" class="btn-primary">创建任务</button>
                    <button id="cron-template" class="panel-action-btn">提醒模板</button>
                 </div>
                 <pre id="cron-result" class="result" style="margin-top: 15px;"></pre>
              </div>
           </div>`;

const NEW_HTML = `<div class="glass-panel" style="margin-top: 30px;">
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

html = html.replace(OLD_HTML, NEW_HTML);
fs.writeFileSync(htmlFile, html);

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

const OLD_ADD_FUNC = `async function addCronJob() {
  try {
    const job = JSON.parse($("cron-job-json").value);
    const result = await api("/api/cron/add", {
      method: "POST",
      body: JSON.stringify({ job })
    });
    $("cron-result").textContent = JSON.stringify(result, null, 2);
    await loadCron();
  } catch (err) {
    showError("cron-result", err);
  }
}`;

const NEW_ADD_FUNC = `async function addCronJob() {
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
    }
    
    const btn = $("cron-add");
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 创建中...';
      btn.disabled = true;
    }
    
    const result = await api("/api/cron/add", {
      method: "POST",
      body: JSON.stringify({ job })
    });
    
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 下发创建任务';
      btn.disabled = false;
    }
    
    showToast("任务创建成功！", "success");
    $("cron-job-json").value = ""; // 清空输入框
    await loadCron();
  } catch (err) {
    const btn = $("cron-add");
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 下发创建任务';
      btn.disabled = false;
    }
    showToast(err.message || String(err), "error");
  }
}`;

js = js.replace(OLD_ADD_FUNC, NEW_ADD_FUNC);

// Check if there are other usages of cron-result and clean them up
// We changed how results display (using Toast)

fs.writeFileSync(jsFile, js);
