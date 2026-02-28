const fs = require('fs');

const file = '/home/openclaw-mvp/public/app.js';
let content = fs.readFileSync(file, 'utf8');

const OLD_HTML_ADD = `<div class="config-row">
                <label>模型别名</label>
                <div id="models-alias-editor" class="alias-editor"></div>
                <button id="models-alias-add" type="button" class="panel-action-btn">+ 添加别名</button>
                <small class="form-hint">示例：\`rightcode\` -> \`rightcode/gpt-5.3-codex\`</small>
              </div>`;

const NEW_HTML_ADD = `<div class="config-row">
                <label style="margin-bottom: 16px;"><i class="fa-solid fa-tags" style="color: #667eea;"></i> 模型别名管理</label>
                <div id="models-alias-editor" class="alias-editor" style="margin-bottom: 16px;"></div>
                <button id="models-alias-add" type="button" class="panel-action-btn" style="background: rgba(59, 112, 252, 0.15); border-color: rgba(59, 112, 252, 0.3); color: #fff;"><i class="fa-solid fa-plus"></i> 添加别名映射</button>
                <small class="form-hint" style="margin-top: 12px;"><i class="fa-solid fa-circle-info"></i> 示例: 别名填写 \`rightcode\`，目标模型填写 \`rightcode/gpt-5.3-codex\`</small>
              </div>`;

content = content.replace(OLD_HTML_ADD, NEW_HTML_ADD);

const OLD_HTML_DEFAULT = `<div class="config-row">
                <label>默认模型</label>
                <div class="model-select-wrap" id="models-default-wrap">
                  <input id="models-default" type="text" autocomplete="off" placeholder="搜索别名或模型 ID" />
                  <i class="fa-solid fa-chevron-down model-select-caret" aria-hidden="true"></i>
                  <div id="models-default-menu" class="model-select-menu"></div>
                </div>
                <small class="form-hint">支持搜索，优先展示别名；只显示已配置 Provider 的模型。</small>
              </div>`;

const NEW_HTML_DEFAULT = `<div class="config-row" style="margin-bottom: 35px !important;">
                <label style="margin-bottom: 12px;"><i class="fa-solid fa-star" style="color: #fbbf24;"></i> 全局默认模型</label>
                <div class="model-select-wrap" id="models-default-wrap" style="position: relative;">
                  <input id="models-default" type="text" autocomplete="off" placeholder="🔍 搜索别名或选择模型 ID..." style="padding-left: 45px !important;" />
                  <i class="fa-solid fa-search" style="position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.4);" aria-hidden="true"></i>
                  <i class="fa-solid fa-chevron-down model-select-caret" aria-hidden="true" style="right: 18px;"></i>
                  <div id="models-default-menu" class="model-select-menu"></div>
                </div>
                <small class="form-hint" style="margin-top: 10px;"><i class="fa-solid fa-circle-info"></i> 当不指定模型时，系统将默认使用此配置。支持搜索，优先展示别名。</small>
              </div>`;

content = content.replace(OLD_HTML_DEFAULT, NEW_HTML_DEFAULT);

const OLD_HTML_PROVIDER = `<div class="config-row">
                <label>已配置 Provider（只读）</label>
                <div id="models-provider-summary" class="provider-summary"></div>
              </div>`;

const NEW_HTML_PROVIDER = `<div class="config-row" style="margin-top: 35px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 25px;">
                <label><i class="fa-solid fa-plug-circle-check" style="color: #10b981;"></i> 已配置的服务商 Provider</label>
                <div id="models-provider-summary" class="provider-summary" style="margin-top: 12px;"></div>
                <small class="form-hint" style="margin-top: 8px;">*只读信息，如需修改底层 Provider 请通过修改配置文件实现。</small>
              </div>`;

content = content.replace(OLD_HTML_PROVIDER, NEW_HTML_PROVIDER);

const OLD_HTML_SAVE = `<div style="margin-top: 15px;">
                <button id="models-save" class="btn-primary">保存修改</button>
              </div>`;

const NEW_HTML_SAVE = `<div style="margin-top: 30px; display: flex; justify-content: flex-end;">
                <button id="models-save" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> 保存并应用配置</button>
              </div>`;

content = content.replace(OLD_HTML_SAVE, NEW_HTML_SAVE);

const OLD_ALIAS_RENDER = `<div class="alias-row">
          <input type="text" class="alias-key" placeholder="别名，例如 rightcode" value="\${escapeHtml(alias)}" />
          <input type="text" class="alias-target" placeholder="目标模型，例如 rightcode/gpt-5.3-codex" value="\${escapeHtml(target)}" />
          <button type="button" class="ghost alias-remove">删除</button>
        </div>`;

const NEW_ALIAS_RENDER = `<div class="alias-row" style="background: rgba(0,0,0,0.15); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="flex: 1; position: relative;">
            <i class="fa-solid fa-quote-left" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.3); font-size: 0.8rem;"></i>
            <input type="text" class="alias-key" placeholder="设定别名 (例如 rightcode)" value="\${escapeHtml(alias)}" style="padding-left: 36px !important; margin: 0; width: 100%;" />
          </div>
          <i class="fa-solid fa-arrow-right-arrow-left" style="color: var(--text-muted); font-size: 0.9rem; padding: 0 5px;"></i>
          <div style="flex: 2; position: relative;">
            <i class="fa-solid fa-microchip" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.3); font-size: 0.9rem;"></i>
            <input type="text" class="alias-target" placeholder="目标模型 ID (例如 rightcode/gpt-5.3-codex)" value="\${escapeHtml(target)}" style="padding-left: 36px !important; margin: 0; width: 100%;" />
          </div>
          <button type="button" class="alias-remove"><i class="fa-regular fa-trash-can"></i></button>
        </div>`;

content = content.replace(OLD_ALIAS_RENDER, NEW_ALIAS_RENDER);

fs.writeFileSync(file, content);
