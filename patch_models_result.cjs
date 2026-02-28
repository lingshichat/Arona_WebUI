const fs = require('fs');

const file = '/home/openclaw-mvp/public/index.html';
let content = fs.readFileSync(file, 'utf8');

const OLD_HTML_RESULT = `<div style="margin-top: 15px;">
                <button id="models-save" class="btn-primary">保存修改</button>
              </div>
              <pre id="models-result" class="result" style="margin-top: 15px;"></pre>`;

const NEW_HTML_RESULT = `<div style="margin-top: 30px; display: flex; justify-content: flex-end;">
                <button id="models-save" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> 保存并应用配置</button>
              </div>
              <pre id="models-result" class="result" style="display: none; margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); color: #81c784; font-size: 0.85rem; max-height: 150px; overflow-y: auto;"></pre>`;

content = content.replace(OLD_HTML_RESULT, NEW_HTML_RESULT);

fs.writeFileSync(file, content);
