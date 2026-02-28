const fs = require('fs');

const file = '/home/openclaw-mvp/public/app.js';
let content = fs.readFileSync(file, 'utf8');

const OLD_METRICS = `    const statsHtml = metrics.map(m => \`
      <div class="stat-card">
        <i class="\${m.icon} stat-icon" style="color: \${m.color}"></i>
        <div class="stat-label">\${m.label}</div>
        <div class="stat-value">\${m.value}</div>
      </div>
    \`).join("");`;

const NEW_METRICS = `    const statsHtml = metrics.map(m => \`
      <div class="glass-panel stat-card" style="margin-bottom: 0; padding: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-left: 4px solid \${m.color}; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center;">
        <i class="\${m.icon} stat-icon" style="color: \${m.color}; opacity: 0.15; font-size: 3.5rem; position: absolute; right: 10px; top: 50%; transform: translateY(-50%); transition: all 0.3s ease;"></i>
        <div class="stat-label" style="font-size: 1rem; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); margin-bottom: 5px;">\${m.label}</div>
        <div class="stat-value" style="font-size: 2.2rem; font-weight: bold; background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">\${m.value}</div>
      </div>
    \`).join("");`;

content = content.replace(OLD_METRICS, NEW_METRICS);

const OLD_TABLE_SESSIONS = `    const sessionsTable = renderTable(
      [
        { title: "会话标识", render: (r) => \`<strong>\${escapeHtml(r.label || r.displayName || r.key)}</strong>\` },
        { title: "所用模型", render: (r) => \`<span class="status-badge ok">\${escapeHtml(r.model || "-")}</span>\` },
        { title: "更新时间", render: (r) => r.updatedAt ? new Date(r.updatedAt).toLocaleTimeString() : "-" }
      ],
      sessions.slice(0, 10)
    );`;

const NEW_TABLE_SESSIONS = `    const sessionsTable = renderTable(
      [
        { title: "💬 会话标识", render: (r) => \`<strong style="color: var(--primary-color);">\${escapeHtml(r.label || r.displayName || r.key)}</strong>\` },
        { title: "🤖 所用模型", render: (r) => \`<span class="status-badge ok" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3);"><i class="fa-solid fa-microchip" style="margin-right: 4px;"></i>\${escapeHtml(r.model || "-")}</span>\` },
        { title: "⏱ 更新时间", render: (r) => \`<span style="opacity: 0.8;"><i class="fa-regular fa-clock" style="margin-right: 4px;"></i>\${r.updatedAt ? new Date(r.updatedAt).toLocaleTimeString() : "-"}</span>\` }
      ],
      sessions.slice(0, 10)
    );`;

content = content.replace(OLD_TABLE_SESSIONS, NEW_TABLE_SESSIONS);

const OLD_TABLE_CHANNELS = `    const channelTable = renderTable(
      [
        { title: "频道名称", key: "name" },
        { title: "连接状态", render: (r) => \`<span class="status-badge \${r.stateClass}">\${r.stateLabel}</span>\` },
        { title: "详细信息", render: (r) => escapeHtml(r.detail || "-") }
      ],
      channelRows
    );`;

const NEW_TABLE_CHANNELS = `    const channelTable = renderTable(
      [
        { title: "📡 频道名称", render: (r) => \`<strong style="letter-spacing: 0.5px;">\${escapeHtml(r.name)}</strong>\` },
        { title: "⚡ 连接状态", render: (r) => \`<span class="status-badge \${r.stateClass}" style="box-shadow: 0 0 10px \${r.stateClass === 'ok' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)'};">\${r.stateLabel}</span>\` },
        { title: "📝 详细信息", render: (r) => \`<span style="color: var(--text-muted); font-size: 0.9em;">\${escapeHtml(r.detail || "-")}</span>\` }
      ],
      channelRows
    );`;

content = content.replace(OLD_TABLE_CHANNELS, NEW_TABLE_CHANNELS);

const OLD_HTML = `    container.innerHTML = \`
      <div class="dashboard-grid">\${statsHtml}</div>
      <div class="glass-panel">
        <div class="panel-header"><span class="panel-title">最近活跃会话</span></div>
        <div class="table-wrap">\${sessionsTable}</div>
      </div>
      <div class="glass-panel">
        <div class="panel-header"><span class="panel-title">频道状态快照</span></div>
        <div class="table-wrap">\${channelTable}</div>
      </div>
    \`;`;

const NEW_HTML = `    container.innerHTML = \`
      <div style="margin-bottom: 25px; padding: 0 5px;">
        <h2 style="margin: 0 0 5px; font-weight: 600; font-size: 1.5rem; letter-spacing: 1px;">什亭之箱 控制面板</h2>
        <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem;">Sensei，这是您当前的终端实时运行概况。</p>
      </div>
      <div class="dashboard-grid" style="gap: 24px; margin-bottom: 35px;">\${statsHtml}</div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">
        <div class="glass-panel" style="margin-bottom: 0;">
          <div class="panel-header" style="background: rgba(0,0,0,0.15);">
            <span class="panel-title" style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-list-ul" style="color: var(--primary-color);"></i> 最近活跃会话
            </span>
          </div>
          <div class="table-wrap">\${sessionsTable}</div>
        </div>
        
        <div class="glass-panel" style="margin-bottom: 0;">
          <div class="panel-header" style="background: rgba(0,0,0,0.15);">
            <span class="panel-title" style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-network-wired" style="color: var(--warning);"></i> 频道状态快照
            </span>
          </div>
          <div class="table-wrap">\${channelTable}</div>
        </div>
      </div>
    \`;`;

content = content.replace(OLD_HTML, NEW_HTML);

fs.writeFileSync(file, content);
