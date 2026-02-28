const fs = require('fs');
const file = '/home/openclaw-mvp/public/app.js';
let content = fs.readFileSync(file, 'utf8');

const OLD_HTML_TITLE = `      <div style="margin-bottom: 25px; padding: 0 5px;">
        <h2 style="margin: 0 0 5px; font-weight: 600; font-size: 1.5rem; letter-spacing: 1px;">什亭之箱 控制面板</h2>
        <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem;">Sensei，这是您当前的终端实时运行概况。</p>
      </div>`;

content = content.replace(OLD_HTML_TITLE, '');

const REPLACE_1 = `          <div class="panel-header" style="background: rgba(0,0,0,0.15);">
            <span class="panel-title" style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-list-ul" style="color: var(--primary-color);"></i> 最近活跃会话
            </span>
          </div>`;
          
const REPLACE_2 = `          <div class="panel-header" style="background: rgba(0,0,0,0.15);">
            <span class="panel-title" style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-network-wired" style="color: var(--warning);"></i> 频道状态快照
            </span>
          </div>`;

content = content.replace(REPLACE_1, `<div class="panel-header"><span class="panel-title"><i class="fa-solid fa-list-ul" style="color: var(--primary-color); margin-right: 8px;"></i>最近活跃会话</span></div>`);
content = content.replace(REPLACE_2, `<div class="panel-header"><span class="panel-title"><i class="fa-solid fa-network-wired" style="color: var(--warning); margin-right: 8px;"></i>频道状态快照</span></div>`);

fs.writeFileSync(file, content);
