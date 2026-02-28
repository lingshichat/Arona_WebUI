const fs = require('fs');

const file = '/home/openclaw-mvp/public/app.js';
let content = fs.readFileSync(file, 'utf8');

const OLD_METRICS = `    const statsHtml = metrics.map(m => \`
      <div class="glass-panel stat-card" style="margin-bottom: 0; padding: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-left: 4px solid \${m.color}; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center;">
        <i class="\${m.icon} stat-icon" style="color: \${m.color}; opacity: 0.15; font-size: 3.5rem; position: absolute; right: 10px; top: 50%; transform: translateY(-50%); transition: all 0.3s ease;"></i>
        <div class="stat-label" style="font-size: 1rem; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); margin-bottom: 5px;">\${m.label}</div>
        <div class="stat-value" style="font-size: 2.2rem; font-weight: bold; background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">\${m.value}</div>
      </div>
    \`).join("");`;

const NEW_METRICS = `    const statsHtml = metrics.map(m => \`
      <div class="glass-panel stat-card" style="margin-bottom: 0; padding: 24px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.2); position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border-radius: 18px; background: linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%);">
        
        <div style="width: 50px; height: 50px; border-radius: 12px; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; box-shadow: inset 0 1px 1px rgba(255,255,255,0.1);">
          <i class="\${m.icon}" style="color: \${m.color}; font-size: 1.6rem; text-shadow: 0 0 10px \${m.color};"></i>
        </div>
        
        <div class="stat-label" style="font-size: 0.95rem; font-weight: 500; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-secondary); margin-bottom: 4px;">\${m.label}</div>
        
        <div class="stat-value" style="font-size: 2.5rem; font-weight: 700; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">\${m.value}</div>
        
      </div>
    \`).join("");`;

content = content.replace(OLD_METRICS, NEW_METRICS);

fs.writeFileSync(file, content);
