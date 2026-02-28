const fs = require('fs');

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

// The form is in HTML, but we want it to only show if there are tasks OR explicitly toggled. 
// Or better yet, we just fix the visual styling so it doesn't look bad when loading.

const OLD_LOAD_CRON = `async function loadCron() {
  const target = $("cron-list");
  target.innerHTML = renderSkeleton(4);

  if (!$("cron-job-json").value.trim()) {
    $("cron-job-json").value = JSON.stringify(cronTemplate(), null, 2);
  }

  try {
    const data = await api("/api/cron/list?includeDisabled=true");`;

const NEW_LOAD_CRON = `async function loadCron() {
  const target = $("cron-list");
  const formWrap = $("cron-form-wrap");
  if (formWrap) formWrap.style.opacity = '0.5'; // dim while loading
  
  target.innerHTML = renderSkeleton(4);

  if (!$("cron-job-json").value.trim()) {
    $("cron-job-json").value = JSON.stringify(cronTemplate(), null, 2);
  }

  try {
    const data = await api("/api/cron/list?includeDisabled=true");
    if (formWrap) {
      formWrap.style.opacity = '1';
      formWrap.style.transition = 'opacity 0.3s ease';
    }`;

js = js.replace(OLD_LOAD_CRON, NEW_LOAD_CRON);
fs.writeFileSync(jsFile, js);

const htmlFile = '/home/openclaw-mvp/public/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');

const OLD_FORM_WRAP = `<div class="glass-panel" style="margin-top: 30px;">
              <div class="panel-header" style="background: rgba(0,0,0,0.15);">
                <div style="display: flex; gap: 15px;">`;

const NEW_FORM_WRAP = `<div id="cron-form-wrap" class="glass-panel" style="margin-top: 30px;">
              <div class="panel-header" style="background: rgba(0,0,0,0.15);">
                <div style="display: flex; gap: 15px;">`;

html = html.replace(OLD_FORM_WRAP, NEW_FORM_WRAP);

// Fix the inputs border and background to match the style
const OLD_INPUTS = `<div class="config-form" style="padding: 25px;">
                 
                 <!-- 表单视图 -->
                 <div id="cron-view-form">
                    <div class="config-row">
                      <label>任务名称 Name</label>
                      <input type="text" id="cron-form-name" placeholder="例如：每日早安问候" />
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                      <div class="config-row">
                        <label>计划类型 Type</label>
                        <select id="cron-form-kind" style="width: 100%; padding: 12px; border-radius: 8px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.15); color: #fff;">`;

const NEW_INPUTS = `<div class="config-form" style="padding: 30px;">
                 
                 <!-- 表单视图 -->
                 <div id="cron-view-form">
                    <div class="config-row" style="margin-bottom: 24px;">
                      <label style="color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; margin-bottom: 8px; display: block;">任务名称</label>
                      <input type="text" id="cron-form-name" placeholder="例如：每日早安问候" style="width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff; font-size: 0.95rem; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);" />
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                      <div class="config-row" style="margin-bottom: 0;">
                        <label style="color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; margin-bottom: 8px; display: block;">计划类型</label>
                        <select id="cron-form-kind" style="width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff; font-size: 0.95rem; appearance: none; cursor: pointer;">`;

html = html.replace(OLD_INPUTS, NEW_INPUTS);

const OLD_VAL_INPUT = `</div>
                      <div class="config-row" id="cron-form-value-wrap">
                        <label id="cron-form-value-label">Cron 表达式</label>
                        <input type="text" id="cron-form-value" placeholder="例如：0 8 * * *" />
                      </div>
                    </div>

                    <div class="config-row">
                      <label>任务指令 Prompt / Message</label>
                      <textarea id="cron-form-message" rows="4" placeholder="例如：查询今天的天气并向老师汇报"></textarea>
                    </div>`;

const NEW_VAL_INPUT = `</div>
                      <div class="config-row" id="cron-form-value-wrap" style="margin-bottom: 0;">
                        <label id="cron-form-value-label" style="color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; margin-bottom: 8px; display: block;">Cron 表达式</label>
                        <input type="text" id="cron-form-value" placeholder="例如：0 8 * * *" style="width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff; font-size: 0.95rem; font-family: var(--font-mono); box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);" />
                      </div>
                    </div>

                    <div class="config-row" style="margin-bottom: 24px;">
                      <label style="color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; margin-bottom: 8px; display: block;">任务指令 (Prompt)</label>
                      <textarea id="cron-form-message" rows="4" placeholder="例如：查询今天的天气并向老师汇报" style="width: 100%; padding: 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff; font-size: 0.95rem; line-height: 1.5; resize: vertical; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);"></textarea>
                    </div>`;

html = html.replace(OLD_VAL_INPUT, NEW_VAL_INPUT);

const OLD_SWITCHES = `<div style="display: flex; gap: 20px; align-items: center; margin-bottom: 25px;">
                      <label style="margin:0; display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" id="cron-form-isolated" checked />
                        <span>隔离运行 (Isolated Session)</span>
                      </label>
                      <label style="margin:0; display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" id="cron-form-enabled" checked />
                        <span>立即启用 (Enabled)</span>
                      </label>
                    </div>`;

const NEW_SWITCHES = `<div style="display: flex; gap: 30px; align-items: center; margin-bottom: 30px; padding: 15px 20px; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                      <label style="margin:0; display:flex; align-items:center; gap:12px; cursor:pointer; color: var(--text-secondary); font-size: 0.9rem;">
                        <div class="switch-toggle" style="position: relative; width: 36px; height: 20px;">
                          <input type="checkbox" id="cron-form-isolated" checked style="opacity: 0; width: 0; height: 0; position: absolute;" />
                          <span class="slider" style="position: absolute; inset: 0; background: var(--primary-color); border-radius: 20px; transition: 0.3s; border: 1px solid transparent;">
                            <span class="knob" style="position: absolute; width: 14px; height: 14px; background: #fff; border-radius: 50%; top: 2px; left: 18px; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>
                          </span>
                        </div>
                        隔离运行会话 (Isolated)
                      </label>
                      <label style="margin:0; display:flex; align-items:center; gap:12px; cursor:pointer; color: var(--text-secondary); font-size: 0.9rem;">
                        <div class="switch-toggle" style="position: relative; width: 36px; height: 20px;">
                          <input type="checkbox" id="cron-form-enabled" checked style="opacity: 0; width: 0; height: 0; position: absolute;" />
                          <span class="slider" style="position: absolute; inset: 0; background: var(--primary-color); border-radius: 20px; transition: 0.3s; border: 1px solid transparent;">
                            <span class="knob" style="position: absolute; width: 14px; height: 14px; background: #fff; border-radius: 50%; top: 2px; left: 18px; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>
                          </span>
                        </div>
                        立即启用任务 (Enabled)
                      </label>
                    </div>`;

html = html.replace(OLD_SWITCHES, NEW_SWITCHES);

fs.writeFileSync(htmlFile, html);
