const fs = require('fs');

const file = '/home/openclaw-mvp/public/app.js';
let content = fs.readFileSync(file, 'utf8');

const OLD_METRICS = `    const statsHtml = metrics.map(m => \`
      <div class="glass-panel stat-card" style="margin-bottom: 0; padding: 24px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.2); position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border-radius: 18px; background: linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%);">
        
        <div style="width: 50px; height: 50px; border-radius: 12px; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; box-shadow: inset 0 1px 1px rgba(255,255,255,0.1);">
          <i class="\${m.icon}" style="color: \${m.color}; font-size: 1.6rem; text-shadow: 0 0 10px \${m.color};"></i>
        </div>
        
        <div class="stat-label" style="font-size: 0.95rem; font-weight: 500; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-secondary); margin-bottom: 4px;">\${m.label}</div>
        
        <div class="stat-value" style="font-size: 2.5rem; font-weight: 700; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">\${m.value}</div>
        
      </div>
    \`).join("");`;

const NEW_METRICS = `    const statsHtml = metrics.map(m => \`
      <div class="stat-card" style="display: flex; align-items: center; justify-content: flex-start; gap: 16px; padding: 20px 24px;">
        <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(0, 0, 0, 0.15); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 3px rgba(255,255,255,0.05);">
          <i class="\${m.icon}" style="color: \${m.color}; font-size: 1.6rem; text-shadow: 0 0 12px \${m.color};"></i>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-start;">
          <div class="stat-label" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 4px;">\${m.label}</div>
          <div class="stat-value" style="font-size: 1.8rem; font-weight: 600; line-height: 1; color: var(--text-primary); text-shadow: 0 1px 2px rgba(0,0,0,0.2);">\${m.value}</div>
        </div>
      </div>
    \`).join("");`;

content = content.replace(OLD_METRICS, NEW_METRICS);

const OLD_HTML_TITLE = `      <div style="margin-bottom: 25px; padding: 0 5px;">
        <h2 style="margin: 0 0 5px; font-weight: 600; font-size: 1.5rem; letter-spacing: 1px;">什亭之箱 控制面板</h2>
        <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem;">Sensei，这是您当前的终端实时运行概况。</p>
      </div>`;

content = content.replace(OLD_HTML_TITLE, '');

const OLD_TABLE_SESSIONS = `    const sessionsTable = renderTable(
      [
        { title: "💬 会话标识", render: (r) => \`<strong style="color: var(--primary-color);">\${escapeHtml(r.label || r.displayName || r.key)}</strong>\` },
        { title: "🤖 所用模型", render: (r) => \`<span class="status-badge ok" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3);"><i class="fa-solid fa-microchip" style="margin-right: 4px;"></i>\${escapeHtml(r.model || "-")}</span>\` },
        { title: "⏱ 更新时间", render: (r) => \`<span style="opacity: 0.8;"><i class="fa-regular fa-clock" style="margin-right: 4px;"></i>\${r.updatedAt ? new Date(r.updatedAt).toLocaleTimeString() : "-"}</span>\` }
      ],
      sessions.slice(0, 10)
    );`;

const NEW_TABLE_SESSIONS = `    const sessionsTable = renderTable(
      [
        { title: "会话标识", render: (r) => \`<strong>\${escapeHtml(r.label || r.displayName || r.key)}</strong>\` },
        { title: "所用模型", render: (r) => \`<span class="status-badge ok" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3);"><i class="fa-solid fa-microchip" style="margin-right: 4px;"></i>\${escapeHtml(r.model || "-")}</span>\` },
        { title: "更新时间", render: (r) => \`<span style="color: var(--text-muted);"><i class="fa-regular fa-clock" style="margin-right: 4px;"></i>\${r.updatedAt ? new Date(r.updatedAt).toLocaleTimeString() : "-"}</span>\` }
      ],
      sessions.slice(0, 10)
    );`;

content = content.replace(OLD_TABLE_SESSIONS, NEW_TABLE_SESSIONS);

const OLD_TABLE_CHANNELS = `    const channelTable = renderTable(
      [
        { title: "📡 频道名称", render: (r) => \`<strong style="letter-spacing: 0.5px;">\${escapeHtml(r.name)}</strong>\` },
        { title: "⚡ 连接状态", render: (r) => \`<span class="status-badge \${r.stateClass}" style="box-shadow: 0 0 10px \${r.stateClass === 'ok' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)'};">\${r.stateLabel}</span>\` },
        { title: "📝 详细信息", render: (r) => \`<span style="color: var(--text-muted); font-size: 0.9em;">\${escapeHtml(r.detail || "-")}</span>\` }
      ],
      channelRows
    );`;

const NEW_TABLE_CHANNELS = `    const channelTable = renderTable(
      [
        { title: "频道名称", render: (r) => \`<strong>\${escapeHtml(r.name)}</strong>\` },
        { title: "连接状态", render: (r) => \`<span class="status-badge \${r.stateClass}" style="box-shadow: 0 0 10px \${r.stateClass === 'ok' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)'};">\${r.stateLabel}</span>\` },
        { title: "详细信息", render: (r) => \`<span style="color: var(--text-muted); font-size: 0.9em;">\${escapeHtml(r.detail || "-")}</span>\` }
      ],
      channelRows
    );`;

content = content.replace(OLD_TABLE_CHANNELS, NEW_TABLE_CHANNELS);

fs.writeFileSync(file, content);
