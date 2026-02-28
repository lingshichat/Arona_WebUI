const state = {
  currentView: "overview",
  modelsHash: "",
  logsCursor: null,
  logsTimer: null,
  logsLive: false,
  systemTimer: null,
  modelDefaultOptions: []
};

const viewLoaders = {
  overview: loadOverview,
  models: loadModels,
  skills: loadSkills,
  cron: loadCron,
  nodes: loadNodes,
  logs: initLogsView
};

function $(id) {
  return document.getElementById(id);
}

async function api(path, options = {}) {
  const token = localStorage.getItem("openclaw_token");
  if (token) {
    options.headers = options.headers || {};
    options.headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    localStorage.removeItem("openclaw_token");
    window.location.href = "/login.html";
    return;
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `request failed (${res.status})`);
  }
  return data;
}


// Blog Admin Toast Implementation
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let iconClass = 'fa-solid fa-circle-info';
  let title = '系统通知';

  if (type === 'success') {
      iconClass = 'fa-solid fa-check';
      title = '操作成功';
  } else if (type === 'error') {
      iconClass = 'fa-solid fa-xmark';
      title = '操作失败';
  } else if (type === 'warning') {
      iconClass = 'fa-solid fa-exclamation';
      title = '警告';
  }

  toast.innerHTML = `
      <div class="toast-icon">
          <i class="${iconClass}"></i>
      </div>
      <div class="toast-content">
          <div class="toast-title">${title}</div>
          <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
  `;

  container.appendChild(toast);

  // Close button event
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
      removeToast(toast);
  });

  // Auto remove
  if (duration > 0) {
      setTimeout(() => {
          removeToast(toast);
      }, duration);
  }
}

function removeToast(toast) {
  if (toast.classList.contains('toast-exit')) return;
  toast.classList.add('toast-exit');
  toast.addEventListener('animationend', () => {
      toast.remove();
  });
}

function showError(targetId, err) {
  const el = $(targetId);
  if (!el) return;
  el.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
}

function renderTable(columns, rows) {
  const head = columns.map((col) => `<th>${col.title}</th>`).join("");
  const body = rows
    .map((row) => {
      const cells = columns
        .map((col) => `<td>${typeof col.render === "function" ? col.render(row) : row[col.key] ?? ""}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setView(view) {
  state.currentView = view;

  for (const section of document.querySelectorAll(".view")) {
    section.classList.toggle("active", section.id === `view-${view}`);
  }

  for (const item of document.querySelectorAll("#nav-menu .nav-item")) {
    item.classList.toggle("active", item.dataset.view === view);
  }

  const load = viewLoaders[view];
  if (load) load();

  if (view === "logs") {
    startLogStream();
  } else {
    stopLogStream();
  }
}

async function refreshCurrentView() {
  const load = viewLoaders[state.currentView];
  if (load) await load();
}

async function loadHealth() {
  try {
    const health = await api("/api/health");
    const modeRaw = String(health?.gateway?.authMode || "unknown").toLowerCase();
    const modeMap = {
      token: "令牌",
      password: "密码",
      none: "无",
      unknown: "未知"
    };
    const mode = modeMap[modeRaw] || modeRaw;
    $("health-pill").textContent = `认证模式：${mode}`;
  } catch (err) {
    $("health-pill").textContent = "网关离线";
    console.error(err);
  }
}

function setPerfValue(valueId, percent) {
  const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const valueEl = $(valueId);
  if (valueEl) valueEl.textContent = `${safePercent.toFixed(1)}%`;
}

async function loadSystemLoad() {
  try {
    const data = await api("/api/system-load");
    const cpu = data?.system?.cpu || {};
    const memory = data?.system?.memory || {};

    const cpuPercent = Number.isFinite(cpu.usagePercent) ? cpu.usagePercent : cpu.normalizedLoadPercent || 0;
    setPerfValue("cpu-value", cpuPercent);

    const memPercent = Number(memory.usagePercent || 0);
    setPerfValue("mem-value", memPercent);
  } catch (err) {
    setPerfValue("cpu-value", 0);
    setPerfValue("mem-value", 0);
    console.error(err);
  }
}

function renderEmpty(icon, title, subtitle) {
  return `
    <div class="empty-placeholder">
      <div class="empty-icon"><i class="${icon}"></i></div>
      <div style="font-size: 1.1rem; color: var(--text-secondary); font-weight: 500;">${title}</div>
      <div style="font-size: 0.9rem; margin-top: 8px;">${subtitle}</div>
    </div>
  `;
}

function renderSkeleton(rows = 3) {
  let lines = "";
  for (let i = 0; i < rows; i++) {
    lines += `<div class="skeleton-text" style="width: ${80 + Math.random() * 20}%"></div>`;
  }
  return `<div style="padding: 20px;">${lines}</div>`;
}

async function loadOverview() {
  const container = $("overview-content");
  container.innerHTML = renderSkeleton(5);

  try {
    const data = await api("/api/overview");
    const channels = data.channels?.channels || {};
    const channelValues = Object.values(channels);
    if (channelValues.length === 0 && (data.sessions?.sessions || []).length === 0) {
      container.innerHTML = renderEmpty("fa-solid fa-wind", "暂无活跃数据", "阿洛娜还没发现任何会话或频道记录呢～");
      return;
    }
    const connectedChannels = channelValues.filter((entry) => entry?.connected).length;

    const sessions = data.sessions?.sessions || [];
    const cronJobs = data.cronList?.jobs || [];
    const nodeList = data.nodes?.nodes || [];
    const nodeOnline = nodeList.filter((node) => node.connected).length;
    const errors = (data.logs?.lines || []).filter((line) => /error|failed|denied/i.test(line));

    const metrics = [
      { label: "活跃会话", value: sessions.length, icon: "fa-regular fa-comments", color: "#64b5f6" },
      { label: "计划任务", value: cronJobs.filter((j) => j.enabled).length, icon: "fa-regular fa-clock", color: "#81c784" },
      { label: "在线节点", value: `${nodeOnline}/${nodeList.length}`, icon: "fa-solid fa-server", color: "#fff176" },
      { label: "最近异常", value: errors.length, icon: "fa-solid fa-triangle-exclamation", color: "#e57373" }
    ];

    const statsHtml = metrics.map(m => `
      <div class="stat-card" style="display: flex; align-items: center; justify-content: flex-start; gap: 16px; padding: 20px 24px;">
        <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(0, 0, 0, 0.15); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 3px rgba(255,255,255,0.05);">
          <i class="${m.icon}" style="color: ${m.color}; font-size: 1.6rem; text-shadow: 0 0 12px ${m.color};"></i>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-start;">
          <div class="stat-label" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 4px;">${m.label}</div>
          <div class="stat-value" style="font-size: 1.8rem; font-weight: 600; line-height: 1; color: var(--text-primary); text-shadow: 0 1px 2px rgba(0,0,0,0.2);">${m.value}</div>
        </div>
      </div>
    `).join("");

    const sessionsTable = renderTable(
      [
        { title: "会话标识", render: (r) => `<strong>${escapeHtml(r.label || r.displayName || r.key)}</strong>` },
        { title: "所用模型", render: (r) => `<span class="status-badge ok" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3);"><i class="fa-solid fa-microchip" style="margin-right: 4px;"></i>${escapeHtml(r.model || "-")}</span>` },
        { title: "更新时间", render: (r) => `<span style="color: var(--text-muted);"><i class="fa-regular fa-clock" style="margin-right: 4px;"></i>${r.updatedAt ? new Date(r.updatedAt).toLocaleTimeString() : "-"}</span>` }
      ],
      sessions.slice(0, 10)
    );

    const channelAccounts = data.channels?.channelAccounts || {};
    const channelRows = Object.entries(channels).map(([name, ch]) => {
      const accounts = Array.isArray(channelAccounts[name]) ? channelAccounts[name] : [];
      const hasConnected = ch?.connected === true || accounts.some((acc) => acc?.connected === true);
      const hasRunning = ch?.running === true || accounts.some((acc) => acc?.running === true);
      const configured = ch?.configured === true;

      let stateLabel = "离线";
      let stateClass = "warn";

      if (!configured) {
        stateLabel = "未配置";
        stateClass = "bad";
      } else if (hasConnected) {
        stateLabel = "已连接";
        stateClass = "ok";
      } else if (hasRunning) {
        stateLabel = "运行中";
        stateClass = "ok";
      }

      const detail = ch?.lastError || ch?.mode || (hasRunning ? "服务已启动" : "等待启动");
      return { name, detail, stateLabel, stateClass };
    });

    const channelTable = renderTable(
      [
        { title: "频道名称", render: (r) => `<strong>${escapeHtml(r.name)}</strong>` },
        { title: "连接状态", render: (r) => `<span class="status-badge ${r.stateClass}" style="box-shadow: 0 0 10px ${r.stateClass === 'ok' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)'};">${r.stateLabel}</span>` },
        { title: "详细信息", render: (r) => `<span style="color: var(--text-muted); font-size: 0.9em;">${escapeHtml(r.detail || "-")}</span>` }
      ],
      channelRows
    );

    container.innerHTML = `

      <div class="dashboard-grid" style="gap: 24px; margin-bottom: 35px;">${statsHtml}</div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">
        <div class="glass-panel" style="margin-bottom: 0;">
<div class="panel-header"><span class="panel-title"><i class="fa-solid fa-list-ul" style="color: var(--primary-color); margin-right: 8px;"></i>最近活跃会话</span></div>
          <div class="table-wrap">${sessionsTable}</div>
        </div>
        
        <div class="glass-panel" style="margin-bottom: 0;">
<div class="panel-header"><span class="panel-title"><i class="fa-solid fa-network-wired" style="color: var(--warning); margin-right: 8px;"></i>频道状态快照</span></div>
          <div class="table-wrap">${channelTable}</div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="glass-panel" style="padding: 20px; color: var(--danger)">${escapeHtml(err.message)}</div>`;
  }
}

function renderAliasRows(aliases) {
  const container = $("models-alias-editor");
  if (!container) return;

  const entries = Object.entries(aliases || {});
  if (entries.length === 0) entries.push(["", ""]);

  container.innerHTML = entries
    .map(
      ([alias, target]) => `
        <div class="alias-row" style="background: rgba(0,0,0,0.15); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="flex: 1; position: relative;">
            <i class="fa-solid fa-quote-left" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.3); font-size: 0.8rem;"></i>
            <input type="text" class="alias-key" placeholder="设定别名 (例如 rightcode)" value="${escapeHtml(alias)}" style="padding-left: 36px !important; margin: 0; width: 100%;" />
          </div>
          <i class="fa-solid fa-arrow-right-arrow-left" style="color: var(--text-muted); font-size: 0.9rem; padding: 0 5px;"></i>
          <div style="flex: 2; position: relative;">
            <i class="fa-solid fa-microchip" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.3); font-size: 0.9rem;"></i>
            <input type="text" class="alias-target" placeholder="目标模型 ID (例如 rightcode/gpt-5.3-codex)" value="${escapeHtml(target)}" style="padding-left: 36px !important; margin: 0; width: 100%;" />
          </div>
          <button type="button" class="alias-remove"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      `
    )
    .join("");

  for (const btn of container.querySelectorAll(".alias-remove")) {
    btn.addEventListener("click", (event) => {
      const row = event.target.closest(".alias-row");
      row?.remove();
      if (!container.querySelector(".alias-row")) renderAliasRows({});
    });
  }
}

function collectAliases() {
  const container = $("models-alias-editor");
  const rows = container ? Array.from(container.querySelectorAll(".alias-row")) : [];
  const aliases = {};

  for (const row of rows) {
    const alias = row.querySelector(".alias-key")?.value.trim();
    const target = row.querySelector(".alias-target")?.value.trim();
    if (!alias || !target) continue;
    aliases[alias] = target;
  }

  return aliases;
}

function renderProviderSummary(providers) {
  const summary = $("models-provider-summary");
  if (!summary) return;

  const names = Object.keys(providers || {});
  if (names.length === 0) {
    summary.innerHTML = `<span class="status-badge warn">暂无 Provider</span>`;
    return;
  }

  summary.innerHTML = names.map((name) => `<span class="provider-chip">${escapeHtml(name)}</span>`).join("");
}

function renderModelDefaultMenu(filterText = "") {
  const menu = $("models-default-menu");
  if (!menu) return;

  const keyword = filterText.trim().toLowerCase();
  const filtered = state.modelDefaultOptions.filter((option) => {
    if (!keyword) return true;
    return option.value.toLowerCase().includes(keyword) || option.label.toLowerCase().includes(keyword);
  });

  if (filtered.length === 0) {
    menu.innerHTML = `<div class="model-select-empty">没有匹配项</div>`;
    return;
  }

  let html = "";
  let group = "";
  for (const option of filtered) {
    if (option.group !== group) {
      group = option.group;
      html += `<div class="model-select-group">${escapeHtml(group)}</div>`;
    }
    html += `
      <button type="button" class="model-select-item" data-model-value="${escapeHtml(option.value)}">
        ${escapeHtml(option.label)}
        ${option.hint ? `<small>${escapeHtml(option.hint)}</small>` : ""}
      </button>
    `;
  }

  menu.innerHTML = html;

  for (const item of menu.querySelectorAll("[data-model-value]")) {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const input = $("models-default");
      if (input) input.value = item.getAttribute("data-model-value") || "";
      $("models-default-wrap")?.classList.remove("open");
    });
  }
}

function bindModelDefaultPicker() {
  const wrap = $("models-default-wrap");
  const input = $("models-default");
  if (!wrap || !input || input.dataset.bound === "1") return;

  input.dataset.bound = "1";

  input.addEventListener("focus", () => {
    wrap.classList.add("open");
    renderModelDefaultMenu(input.value);
  });

  input.addEventListener("input", () => {
    wrap.classList.add("open");
    renderModelDefaultMenu(input.value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      wrap.classList.remove("open");
      return;
    }
    if (event.key === "ArrowDown") {
      wrap.classList.add("open");
      renderModelDefaultMenu(input.value);
    }
  });

  wrap.addEventListener("click", (event) => {
    if (event.target.closest("[data-model-value]")) return;
    wrap.classList.add("open");
    renderModelDefaultMenu(input.value);
  });

  document.addEventListener("click", (event) => {
    if (!wrap.contains(event.target)) wrap.classList.remove("open");
  });
}

async function loadModels() {
  try {
    const data = await api("/api/models");
    state.modelsHash = data.configHash;

    const cfg = data.modelsConfig || {};
    renderAliasRows(cfg.aliases || {});
    renderProviderSummary(cfg.providers || {});
    /* reset result hidden */

    const configuredProviderNames = Object.keys(cfg.providers || {});
    const configuredProviderSet = new Set(configuredProviderNames);
    const allModels = data.modelList?.models || [];
    const models = configuredProviderSet.size
      ? allModels.filter((model) => configuredProviderSet.has(model.provider))
      : allModels;

    const aliasEntries = Object.entries(cfg.aliases || {});
    const uniqueIds = [...new Set(models.map((model) => model.id))].sort((a, b) => a.localeCompare(b));

    const pickerOptions = [{ value: "", label: "未设置（沿用系统）", hint: "保持系统默认", group: "常用" }];
    for (const [alias, target] of aliasEntries) {
      pickerOptions.push({ value: alias, label: alias, hint: `别名 → ${target}`, group: "别名" });
    }
    for (const id of uniqueIds) {
      pickerOptions.push({ value: id, label: id, hint: "模型 ID", group: "模型 ID" });
    }

    const knownValues = new Set(pickerOptions.map((item) => item.value));
    if (cfg.default && !knownValues.has(cfg.default)) {
      pickerOptions.push({ value: cfg.default, label: cfg.default, hint: "当前生效值", group: "当前" });
    }

    state.modelDefaultOptions = pickerOptions;
    bindModelDefaultPicker();

    const defaultInput = $("models-default");
    if (defaultInput) {
      defaultInput.value = cfg.default || "";
      renderModelDefaultMenu(defaultInput.value);
    }

    const rows = models.map((model) => ({
      id: model.id,
      provider: model.provider,
      reasoning: model.reasoning,
      contextWindow: model.contextWindow,
      input: (model.input || []).join(", ")
    }));

    if (rows.length === 0) {
      $("models-runtime").innerHTML = renderEmpty(
        "fa-solid fa-filter-circle-xmark",
        "没有匹配的模型",
        "当前只展示已配置 Provider 的模型，请先配置 Provider。"
      );
      return;
    }

    $("models-runtime").innerHTML = renderTable(
      [
        { title: "模型", key: "id" },
        { title: "Provider", key: "provider" },
        { title: "推理", render: (r) => (r.reasoning ? "yes" : "no") },
        { title: "上下文", key: "contextWindow" },
        { title: "输入", key: "input" }
      ],
      rows
    );
  } catch (err) {
    $("models-result").style.display = "block";
    $("models-result").style.color = "#ef4444";
    showToast(err.message || String(err), "error");
  }
}

async function saveModels() {
  try {
    const defaultModel = $("models-default").value.trim();
    const aliases = collectAliases();
    
    // UI Validation Check
    if (!defaultModel && Object.keys(aliases).length === 0) {
      showToast("没有配置任何内容呢...老师起码设置个默认模型或别名吧！(>_<)", "error");
      return;
    }

    const payload = {
      models: {
        default: defaultModel || null,
        aliases
      },
      baseHash: state.modelsHash
    };

    const btn = $("models-save");
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 保存中...';
      btn.disabled = true;
    }

    const result = await api("/api/models/save", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 保存并应用配置';
      btn.disabled = false;
    }
    
    showToast("配置已成功保存并下发至 OpenClaw！", "success");
    await loadModels();
  } catch (err) {
    $("models-result").style.display = "block";
    $("models-result").style.color = "#ef4444";
    showToast(err.message || String(err), "error");
  }
}

async function loadSkills() {
  const target = $("skills-table");
  target.innerHTML = renderSkeleton(6);
  try {
    const data = await api("/api/skills");
    const skills = data.skills || [];
    if (skills.length === 0) {
      target.innerHTML = renderEmpty("fa-solid fa-box-open", "技能箱是空的", "还没有安装任何技能，快去添加一些吧！");
      return;
    }
    const rows = skills
      .slice()
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .map((skill) => ({
        name: skill.name,
        description: skill.description?.trim() || "",
        source: skill.source,
        key: skill.skillKey,
        enabled: !skill.disabled,
        eligible: skill.eligible
      }));

    const html = renderTable(
      [
        { 
          title: "技能名称", 
          render: (r) => `<div style="display:flex; flex-direction:column; gap:4px;">
                            <strong style="font-size: 1rem; color: #fff; font-weight: 500;">${escapeHtml(r.name.replace(/\s*\(.*?\)/, ''))}</strong>
                            <span style="font-size: 0.8rem; color: rgba(255,255,255,0.4); font-family: var(--font-mono); letter-spacing: 0.5px;">${escapeHtml(r.key)}</span>
                          </div>` 
        },
        { 
          title: "功能描述", 
          render: (r) => `<div style="max-width: 450px; line-height: 1.6; color: rgba(255,255,255,0.7); font-size: 0.9rem; padding: 4px 0;">${escapeHtml(r.description || "-")}</div>` 
        },
        { 
          title: "来源位置", 
          render: (r) => `<span style="margin:0; display:inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255,255,255,0.7);">${escapeHtml(r.source)}</span>`
        },
        {
          title: "启用状态",
          render: (r) => `
            <label class="switch-toggle" style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
              <input type="checkbox" data-skill-toggle="${escapeHtml(r.key)}" ${r.enabled ? "checked" : ""} style="opacity: 0; width: 0; height: 0; position: absolute;" />
              <span class="slider" style="position: relative; width: 40px; height: 22px; background: ${r.enabled ? '#3b70fc' : 'rgba(255,255,255,0.15)'}; border-radius: 20px; transition: 0.3s; display: inline-block; border: 1px solid rgba(255,255,255,0.1);">
                <span class="knob" style="position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; top: 2px; left: ${r.enabled ? '20px' : '2px'}; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>
              </span>
            </label>`
        },
        {
          title: "可用性",
          render: (r) => `<span style="display:inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; ${r.eligible ? 'background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);' : 'background: rgba(251, 191, 36, 0.15); color: #fcd34d; border: 1px solid rgba(251, 191, 36, 0.3);'}">${r.eligible ? '就绪' : '未就绪'}</span>`
        }
      ],
      rows
    );

    target.innerHTML = html;

    for (const toggle of target.querySelectorAll("[data-skill-toggle]")) {
      toggle.addEventListener("change", async (event) => {
        const skillKey = event.target.getAttribute("data-skill-toggle");
        const enabled = event.target.checked;
        try {
          await api("/api/skills/update", {
            method: "POST",
            body: JSON.stringify({ skillKey, enabled })
          });
        } catch (err) {
          alert(err.message);
          event.target.checked = !enabled;
        }
      });
    }
  } catch (err) {
    target.textContent = err.message;
  }
}

function cronTemplate() {
  return {
    name: "MVP reminder",
    schedule: {
      kind: "at",
      at: new Date(Date.now() + 30 * 60_000).toISOString()
    },
    payload: {
      kind: "agentTurn",
      message: "提醒：这是测试提醒任务。"
    },
    sessionTarget: "isolated",
    enabled: true
  };
}

async function loadCron() {
  const target = $("cron-list");
  const formWrap = $("cron-form-wrap");
  
  // 完全隐藏表单，直到数据加载完毕再连同骨架屏一起展示
  if (formWrap) {
    formWrap.style.display = 'none';
    formWrap.style.opacity = '0';
  }
  
  target.innerHTML = renderSkeleton(4);

  if (!$("cron-job-json").value.trim()) {
    $("cron-job-json").value = JSON.stringify(cronTemplate(), null, 2);
  }

  try {
    const data = await api("/api/cron/list?includeDisabled=true");
    
    // 数据拉取成功后，开始展示动画
    if (formWrap) {
      formWrap.style.display = 'block';
      // 给一点极小的延迟让 display:block 渲染，从而触发 opacity 过渡
      setTimeout(() => {
        formWrap.style.transition = 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        formWrap.style.opacity = '1';
        formWrap.style.transform = 'translateY(0)';
      }, 50);
    }
    const jobs = data.jobs || [];
    if (jobs.length === 0) {
      target.innerHTML = renderEmpty("fa-solid fa-calendar-xmark", "暂无任务", "计划表里空荡荡的，点击下方模板创建一个？");
      return;
    }

    const html = renderTable(
      [
        { title: "任务名称", render: (r) => `<div style="display:flex; flex-direction:column; gap:4px;">
                            <strong style="font-size: 1rem; color: #fff; font-weight: 500;">${escapeHtml(r.name || "(unnamed)")}</strong>
                            <span style="font-size: 0.8rem; color: rgba(255,255,255,0.4); font-family: var(--font-mono); letter-spacing: 0.5px;">${escapeHtml(r.id)}</span>
                          </div>` },
        {
          title: "启用状态",
          render: (r) => `
            <label class="switch-toggle" style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
              <input type="checkbox" data-cron-enabled="${escapeHtml(r.id)}" ${r.enabled ? "checked" : ""} style="opacity: 0; width: 0; height: 0; position: absolute;" />
              <span class="slider" style="position: relative; width: 40px; height: 22px; background: ${r.enabled ? 'var(--primary-color)' : 'rgba(255,255,255,0.15)'}; border-radius: 20px; transition: 0.3s; display: inline-block; border: 1px solid rgba(255,255,255,0.1);">
                <span class="knob" style="position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; top: 2px; left: ${r.enabled ? '20px' : '2px'}; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>
              </span>
            </label>`
        },
        { title: "计划规则", render: (r) => {
            const sch = r.schedule || {};
            let badge = '';
            if (sch.kind === 'at') {
                const timeStr = new Date(sch.at).toLocaleString();
                badge = `<span style="color: #60a5fa; background: rgba(59, 112, 252, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(59, 112, 252, 0.3); margin-bottom: 6px; display: inline-block;">一次性</span><br><span style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">${timeStr}</span>`;
            } else if (sch.kind === 'cron') {
                // Remove the "在" prefix for cleaner UI if present (cronstrue sometimes adds it)
                let expr = sch.human || sch.expr;
                if (expr && expr.startsWith('在 ')) expr = expr.substring(2);
                if (expr && expr.startsWith('在')) expr = expr.substring(1);
                
                badge = `<span style="color: #34d399; background: rgba(16, 185, 129, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(16, 185, 129, 0.3); margin-bottom: 6px; display: inline-block;">周期计划</span><br><span style="font-size: 0.85rem; color: rgba(255,255,255,0.85);">${escapeHtml(expr)}</span>`;
            } else if (sch.kind === 'every') {
                const ms = parseInt(sch.everyMs, 10);
                const desc = ms >= 60000 ? `每 ${Math.round(ms/60000)} 分钟` : `每 ${Math.round(ms/1000)} 秒`;
                badge = `<span style="color: #fcd34d; background: rgba(251, 191, 36, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(251, 191, 36, 0.3); margin-bottom: 6px; display: inline-block;">循环间隔</span><br><span style="font-size: 0.85rem; color: rgba(255,255,255,0.85);">${desc}</span>`;
            } else {
                badge = `<code style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">${escapeHtml(JSON.stringify(sch))}</code>`;
            }
            return badge;
        }},
        {
          title: "最近运行",
          render: (r) => {
            const stateInfo = r.state || {};
            let statusBadge = '<span style="color: var(--text-muted);">-</span>';
            if (stateInfo.lastStatus === 'ok') {
                statusBadge = '<span style="color: #34d399; font-weight: 500;"><i class="fa-solid fa-check-circle" style="margin-right:4px;"></i>成功</span>';
            } else if (stateInfo.lastStatus === 'error') {
                statusBadge = '<span style="color: #f87171; font-weight: 500;"><i class="fa-solid fa-xmark-circle" style="margin-right:4px;"></i>失败</span>';
            } else if (stateInfo.lastStatus) {
                statusBadge = `<span>${escapeHtml(stateInfo.lastStatus)}</span>`;
            }
            const timeStr = stateInfo.lastRunAtMs ? `<div style="font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-top: 4px;">${new Date(stateInfo.lastRunAtMs).toLocaleString()}</div>` : "";
            return `<div>${statusBadge}${timeStr}</div>`;
          }
        },
        {
          title: "操作",
          render: (r) =>
            `<div style="display: flex; gap: 8px;">
               <button data-cron-run="${escapeHtml(r.id)}" class="action-btn play-btn" title="立即执行"><i class="fa-solid fa-play"></i></button>
               <button data-cron-runs="${escapeHtml(r.id)}" class="action-btn log-btn" title="运行日志"><i class="fa-solid fa-clock-rotate-left"></i></button>
               <button data-cron-remove="${escapeHtml(r.id)}" class="action-btn del-btn" title="删除任务"><i class="fa-solid fa-trash-can"></i></button>
             </div>`
        }
      ],
      jobs
    );

    target.innerHTML = html;

    for (const checkbox of target.querySelectorAll("[data-cron-enabled]")) {
      checkbox.addEventListener("change", async (event) => {
        const jobId = event.target.getAttribute("data-cron-enabled");
        const enabled = event.target.checked;
        try {
          await api("/api/cron/update", {
            method: "POST",
            body: JSON.stringify({ jobId, patch: { enabled } })
          });
        } catch (err) {
          alert(err.message);
          event.target.checked = !enabled;
        }
      });
    }

    for (const btn of target.querySelectorAll("[data-cron-run]")) {
      btn.addEventListener("click", async (event) => {
        const jobId = event.target.getAttribute("data-cron-run");
        try {
          await api("/api/cron/run", { method: "POST", body: JSON.stringify({ jobId }) });
          await loadCron();
        } catch (err) {
          alert(err.message);
        }
      });
    }

    for (const btn of target.querySelectorAll("[data-cron-runs]")) {
      btn.addEventListener("click", async (event) => {
        const jobId = event.target.getAttribute("data-cron-runs");
        try {
          const runs = await api(`/api/cron/runs?jobId=${encodeURIComponent(jobId)}`);
          $("cron-result").textContent = JSON.stringify(runs, null, 2);
        } catch (err) {
          showError("cron-result", err);
        }
      });
    }

    for (const btn of target.querySelectorAll("[data-cron-remove]")) {
      btn.addEventListener("click", async (event) => {
        const jobId = event.target.getAttribute("data-cron-remove");
        if (!confirm(`Remove job ${jobId}?`)) return;
        try {
          await api("/api/cron/remove", { method: "POST", body: JSON.stringify({ jobId }) });
          await loadCron();
        } catch (err) {
          alert(err.message);
        }
      });
    }
  } catch (err) {
    target.textContent = err.message;
  }
}

async function addCronJob() {
  try {
    let job;
    
    if (typeof isCronJsonMode !== 'undefined' && isCronJsonMode) {
      const rawVal = $("cron-job-json").value.trim();
      if (!rawVal) {
        showToast("任务配置内容不能为空！", "error");
        return;
      }
      try {
        job = JSON.parse(rawVal);
      } catch (e) {
        showToast("JSON 格式错误，请检查语法！", "error");
        return;
      }
    } else {
      // Form builder mode
      const name = $("cron-form-name").value.trim();
      const kind = $("cron-form-kind").value;
      const value = $("cron-form-value").value.trim();
      const message = $("cron-form-message").value.trim();
      
      if (kind !== "cron" && !value) {
        showToast("请填写计划触发规则！", "error");
        return;
      }
      if (!message) {
        showToast("请填写任务指令 (Prompt)！", "error");
        return;
      }
      
      const schedule = { kind };
      if (kind === "cron") {
        const timeVal = $("cron-form-time").value; // e.g. "08:30"
        if (!timeVal) {
           showToast("请选择每天执行的时间！", "error");
           return;
        }
        const [hh, mm] = timeVal.split(":");
        // 拼接成标准 cron 表达式 (分 时 * * *)
        schedule.expr = `${parseInt(mm, 10)} ${parseInt(hh, 10)} * * *`;
        schedule.tz = "Asia/Shanghai"; // 给默认时区保证时间准确
      } else if (kind === "at") {
        let parsedAt = value;
        // 如果是 datetime-local 选出来的值 (YYYY-MM-DDThh:mm)
        if (value.length === 16 && value.includes('T')) {
           parsedAt = new Date(value).toISOString();
        }
        schedule.at = parsedAt;
      } else if (kind === "every") {
        // Evaluate user input safely (e.g. they might type "30 * 60000" or just "1800000")
        let parsedMs = 0;
        try {
          parsedMs = eval(value.replace(/[^0-9\*\+\-\.\/\(\)]/g, ''));
        } catch(e) {
          parsedMs = parseInt(value, 10);
        }
        schedule.everyMs = parsedMs;
      }
      
      job = {
        name: name || "Untitled Task",
        schedule,
        payload: {
          kind: "agentTurn",
          message
        },
        sessionTarget: $("cron-form-isolated").checked ? "isolated" : "main",
        enabled: $("cron-form-enabled").checked
      };
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
}

async function loadNodes() {
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
    }
    const nodes = data.nodes || [];
    if (nodes.length === 0) {
      target.innerHTML = renderEmpty("fa-solid fa-network-wired", "未发现节点", "当前的什亭之箱还没有连接任何外部节点～");
      return;
    }
    const rows = nodes.map((node) => ({
      ...node,
      caps: (node.caps || []).join(", "),
      commands: (node.commands || []).join(", ")
    }));

    const html = renderTable(
      [
        {
          title: "节点名称",
          render: (r) => `<strong>${escapeHtml(r.displayName || r.nodeId)}</strong><br/><span class="muted">${escapeHtml(r.nodeId)}</span>`
        },
        {
          title: "状态",
          render: (r) => `<span class="status-badge ${r.connected ? "ok" : "warn"}">${r.connected ? "在线" : "离线"}</span>`
        },
        { title: "运行平台", key: "platform" },
        { title: "远程IP", key: "remoteIp" },
        { title: "能力(Caps)", key: "caps" },
        {
          title: "操作",
          render: (r) => `<button data-node-describe="${escapeHtml(r.nodeId)}">Describe</button>`
        }
      ],
      rows
    );

    target.innerHTML = html;

    for (const btn of target.querySelectorAll("[data-node-describe]")) {
      btn.addEventListener("click", async (event) => {
        const nodeId = event.target.getAttribute("data-node-describe");
        $("node-id").value = nodeId;
        try {
          const result = await api(`/api/nodes/describe?nodeId=${encodeURIComponent(nodeId)}`);
          $("node-result").textContent = JSON.stringify(result, null, 2);
        } catch (err) {
          showError("node-result", err);
        }
      });
    }
  } catch (err) {
    target.textContent = err.message;
  }
}

async function invokeNodeCommand() {
  try {
    const nodeId = $("node-id").value.trim();
    const command = $("node-command").value.trim();
    const params = JSON.parse($("node-params").value || "{}");
    if (!nodeId || !command) throw new Error("nodeId and command are required");

    const result = await api("/api/nodes/invoke", {
      method: "POST",
      body: JSON.stringify({ nodeId, command, params, timeoutMs: 15000 })
    });
    $("node-result").textContent = JSON.stringify(result, null, 2);
  } catch (err) {
    showError("node-result", err);
  }
}

function normalizeLogLine(line) {
  const raw = String(line || "").trim();
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      if (typeof parsed[0] === "string" || typeof parsed[1] === "string") {
        return [parsed[0], parsed[1]].filter(Boolean).join(" ");
      }
      if (typeof parsed.message === "string") return parsed.message;
      return JSON.stringify(parsed);
    }
  } catch {
    return raw;
  }
  return raw;
}

async function pullLogs() {
  try {
    const params = new URLSearchParams();
    if (state.logsCursor !== null) params.set("cursor", String(state.logsCursor));
    params.set("limit", "200");
    const data = await api(`/api/logs?${params.toString()}`);

    state.logsCursor = data.cursor;
    const keyword = $("logs-keyword").value.trim().toLowerCase();
    const lines = (data.lines || []).map(normalizeLogLine).filter(Boolean);
    const filtered = keyword ? lines.filter((line) => line.toLowerCase().includes(keyword)) : lines;

    const output = $("logs-output");
    if (filtered.length > 0) {
      output.textContent += `${filtered.join("\n")}\n`;
      output.scrollTop = output.scrollHeight;
    }
  } catch (err) {
    $("logs-output").textContent += `\n[error] ${err.message}\n`;
  }
}

function startLogStream() {
  if (state.logsLive) return;
  state.logsLive = true;
  $("logs-toggle").textContent = "暂停实时";
  pullLogs();
  state.logsTimer = setInterval(pullLogs, 2000);
}

function stopLogStream() {
  state.logsLive = false;
  $("logs-toggle").textContent = "开始实时";
  if (state.logsTimer) {
    clearInterval(state.logsTimer);
    state.logsTimer = null;
  }
}

function initLogsView() {
  if (!$("logs-output").dataset.bound) {
    $("logs-output").dataset.bound = "1";
    $("logs-toggle").addEventListener("click", () => {
      if (state.logsLive) stopLogStream();
      else startLogStream();
    });

    $("logs-clear").addEventListener("click", () => {
      state.logsCursor = null;
      $("logs-output").textContent = "";
    });

    $("logs-keyword").addEventListener("change", () => {
      $("logs-output").textContent = "";
      state.logsCursor = null;
      if (state.logsLive) pullLogs();
    });
  }
}

function logoutBasicAuth() {
  // BasicAuth is managed by nginx; this endpoint forces a fresh auth challenge.
  window.location.href = `/logout?ts=${Date.now()}`;
}

function bindEvents() {
  for (const nav of document.querySelectorAll("#nav-menu .nav-item")) {
    nav.addEventListener("click", (event) => {
      event.preventDefault();
      setView(nav.dataset.view);
      $("sidebar")?.classList.remove("active");
    });
  }

  $("mobile-toggle")?.addEventListener("click", () => {
    $("sidebar")?.classList.toggle("active");
  });

  $("logout-btn")?.addEventListener("click", (event) => {
    event.preventDefault();
    logoutBasicAuth();
  });

  $("models-save")?.addEventListener("click", saveModels);
  $("models-reload")?.addEventListener("click", loadModels);
  $("models-alias-add")?.addEventListener("click", () => {
    const container = $("models-alias-editor");
    if (!container) return;
    const row = document.createElement("div");
    row.className = "alias-row";
    row.innerHTML = `
      <input type="text" class="alias-key" placeholder="别名，例如 rightcode" value="" />
      <input type="text" class="alias-target" placeholder="目标模型，例如 rightcode/gpt-5.3-codex" value="" />
      <button type="button" class="ghost alias-remove">删除</button>
    `;
    row.querySelector(".alias-remove")?.addEventListener("click", () => row.remove());
    container.appendChild(row);
  });
  $("cron-add")?.addEventListener("click", addCronJob);
  
  // Setup Cron Tab interactions
  const tabForm = $("cron-tab-form");
  const tabJson = $("cron-tab-json");
  const viewForm = $("cron-view-form");
  const viewJson = $("cron-view-json");
  let isCronJsonMode = false;

  if (tabForm && tabJson) {
    tabForm.addEventListener("click", () => {
      tabForm.classList.add("active");
      tabJson.classList.remove("active");
      viewForm.style.display = "block";
      viewJson.style.display = "none";
      isCronJsonMode = false;
    });
    tabJson.addEventListener("click", () => {
      tabJson.classList.add("active");
      tabForm.classList.remove("active");
      viewJson.style.display = "block";
      viewForm.style.display = "none";
      isCronJsonMode = true;
    });
  }

  // Setup Cron Form Type interaction
  const kindSelect = $("cron-form-kind");
  const valLabel = $("cron-form-value-label");
  const valInput = $("cron-form-value");
  
  if (kindSelect) {
    kindSelect.addEventListener("change", () => {
      const v = kindSelect.value;
      const timePicker = $("cron-time-picker");
      
      if (v === "cron") {
        valLabel.textContent = "执行时间 (每天)";
        valInput.style.display = "none";
        timePicker.style.display = "flex";
      } else if (v === "at") {
        valLabel.textContent = "指定日期时间 (ISO格式)";
        timePicker.style.display = "none";
        valInput.style.display = "block";
        
        // 生成一个友好的默认值（当前时间后一小时）
        const tzOffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(Date.now() - tzOffset + 3600000)).toISOString().slice(0, 16);
        valInput.type = "datetime-local";
        valInput.value = localISOTime;
        
      } else if (v === "every") {
        valLabel.textContent = "间隔时间";
        timePicker.style.display = "none";
        valInput.style.display = "block";
        valInput.type = "text";
        valInput.placeholder = "输入算式，如 30 * 60000 (半小时)";
        valInput.value = "60000";
      }
    });
  }

  $("cron-template")?.addEventListener("click", () => {
    $("cron-job-json").value = JSON.stringify(cronTemplate(), null, 2);
  });
  $("node-invoke")?.addEventListener("click", invokeNodeCommand);
}

async function bootstrap() {
  bindEvents();
  initLogsView();
  await loadHealth();
  await loadSystemLoad();

  if (state.systemTimer) clearInterval(state.systemTimer);
  state.systemTimer = setInterval(loadSystemLoad, 5000);

  setView("overview");
}

bootstrap();
