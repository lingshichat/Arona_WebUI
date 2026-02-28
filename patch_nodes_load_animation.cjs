const fs = require('fs');

const htmlFile = '/home/openclaw-mvp/public/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');

// 把 Nodes 下面的操作面板也加上 ID，用于统一隐藏加载
const OLD_NODES_PANEL = `<div class="glass-panel" style="margin-top: 20px; padding: 20px;">
              <div class="config-row"><label>Node ID</label><input id="node-id" type="text" /></div>
              <div class="config-row"><label>Command</label><input id="node-command" type="text" /></div>
              <div class="config-row"><label>Params (JSON array/object)</label><textarea id="node-params" rows="2"></textarea></div>
              <div class="actions">
                 <button id="node-invoke" class="btn-primary">Invoke</button>
              </div>
              <pre id="node-result" class="result" style="margin-top: 15px;"></pre>
           </div>`;

const NEW_NODES_PANEL = `<div id="nodes-form-wrap" class="glass-panel" style="margin-top: 20px; padding: 20px;">
              <div class="config-row"><label>Node ID</label><input id="node-id" type="text" /></div>
              <div class="config-row"><label>Command</label><input id="node-command" type="text" /></div>
              <div class="config-row"><label>Params (JSON array/object)</label><textarea id="node-params" rows="2"></textarea></div>
              <div class="actions">
                 <button id="node-invoke" class="btn-primary">Invoke</button>
              </div>
              <pre id="node-result" class="result" style="margin-top: 15px;"></pre>
           </div>`;

html = html.replace(OLD_NODES_PANEL, NEW_NODES_PANEL);
fs.writeFileSync(htmlFile, html);

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

const OLD_LOAD_NODES = `async function loadNodes() {
  const target = $("nodes-list");
  target.innerHTML = renderSkeleton(3);
  try {
    const data = await api("/api/nodes");`;

const NEW_LOAD_NODES = `async function loadNodes() {
  const target = $("nodes-list");
  const formWrap = $("nodes-form-wrap");
  
  if (formWrap) {
    formWrap.style.display = 'none';
    formWrap.style.opacity = '0';
    formWrap.style.transform = 'translateY(15px)';
  }
  
  target.innerHTML = renderSkeleton(3);
  try {
    const data = await api("/api/nodes");
    
    if (formWrap) {
      formWrap.style.display = 'block';
      setTimeout(() => {
        formWrap.style.transition = 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        formWrap.style.opacity = '1';
        formWrap.style.transform = 'translateY(0)';
      }, 50);
    }`;

js = js.replace(OLD_LOAD_NODES, NEW_LOAD_NODES);
fs.writeFileSync(jsFile, js);
