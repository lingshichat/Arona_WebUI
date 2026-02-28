const fs = require('fs');

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

// 1. Cleaner source tags (capsules)
js = js.replace(
  `render: (r) => \`<span class="provider-chip" style="margin:0; background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.15); color: var(--text-secondary);">\${escapeHtml(r.source)}</span>\``,
  `render: (r) => \`<span style="margin:0; display:inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255,255,255,0.7);">\${escapeHtml(r.source)}</span>\``
);

// 2. Refined Toggle Switch
js = js.replace(
  `<span class="slider" style="position: relative; width: 44px; height: 24px; background: \${r.enabled ? '#10b981' : 'rgba(255,255,255,0.2)'}; border-radius: 20px; transition: 0.3s; display: inline-block; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">`,
  `<span class="slider" style="position: relative; width: 40px; height: 22px; background: \${r.enabled ? '#3b70fc' : 'rgba(255,255,255,0.15)'}; border-radius: 20px; transition: 0.3s; display: inline-block; border: 1px solid rgba(255,255,255,0.1);">`
);

js = js.replace(
  `<span class="knob" style="position: absolute; width: 18px; height: 18px; background: #fff; border-radius: 50%; top: 3px; left: \${r.enabled ? '23px' : '3px'}; transition: 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"></span>`,
  `<span class="knob" style="position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; top: 2px; left: \${r.enabled ? '20px' : '2px'}; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>`
);

// 3. Status badges refinement
js = js.replace(
  `render: (r) => \`<span class="status-badge \${r.eligible ? 'ok' : 'warn'}" style="box-shadow: 0 0 10px \${r.eligible ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)'}; padding: 6px 14px; border-radius: 20px;">\${r.eligible ? '就绪' : '未就绪'}</span>\``,
  `render: (r) => \`<span style="display:inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; \${r.eligible ? 'background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);' : 'background: rgba(251, 191, 36, 0.15); color: #fcd34d; border: 1px solid rgba(251, 191, 36, 0.3);'}">\${r.eligible ? '就绪' : '未就绪'}</span>\``
);

// 4. Update the toggle CSS class color overrides
const OLD_CSS_TOGGLE = `.switch-toggle input:checked + .slider { background: #10b981 !important; box-shadow: 0 0 10px rgba(16, 185, 129, 0.3) !important; }
.switch-toggle input:checked + .slider .knob { left: 23px !important; }`;
const NEW_CSS_TOGGLE = `.switch-toggle input:checked + .slider { background: var(--primary-color) !important; border-color: transparent !important; }
.switch-toggle input:checked + .slider .knob { left: 20px !important; }`;

const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');
css = css.replace(OLD_CSS_TOGGLE, NEW_CSS_TOGGLE);

fs.writeFileSync(jsFile, js);
fs.writeFileSync(cssFile, css);
