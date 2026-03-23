import { GatewayClient, fetchGatewayAuthConfig } from "./gateway-client.js?v=20260307-model-fix-v12";

const state = {
  currentView: "overview",
  modelsHash: "",
  modelProvidersDraft: {},
  agentsDefaultsModelsDraft: {},
  agentsDefaultModelDraft: null,
  modelsAdvancedDrafts: {
    imageModel: null,
    imageGenerationModel: null,
    pdfModel: null,
    pdfMaxBytesMb: null,
    pdfMaxPages: null,
    summarize: null,
    subagents: null,
    memorySearch: null
  },
  modelsAdvancedExpanded: false,
  configModalDirty: false,
  deletedModelProviderKeys: new Set(),
  deletedAllowlistModelRefs: new Set(),
  modelsApply: {
    phase: "idle",
    message: ""
  },
  providerModalOpen: false,
  skillModalOpen: false,
  providerEditor: {
    mode: "create",
    originalKey: "",
    dirty: false
  },
  confirmDialog: {
    open: false,
    resolver: null,
    lastActiveElement: null
  },
  modalFocus: {
    stack: []
  },
  logsCursor: null,
  logsTimer: null,
  logsLive: false,
  systemTimer: null,
  overviewTimer: null,
  nodeCommandDefaults: [],
  modelDefaultOptions: [],
  cronJsonMode: false,
  persona: {
    agents: [],
    defaultId: "",
    mainKey: "",
    scope: "",
    selectedAgentId: "",
    files: [],
    filesWorkspace: "",
    selectedFileName: "",
    fileContent: "",
    fileOriginalContent: "",
    fileMissing: false,
    loading: false,
    filesLoading: false,
    fileLoading: false,
    metadataSaving: false,
    fileSaving: false,
    listError: "",
    filesError: "",
    fileError: "",
    listRequestId: 0,
    filesRequestId: 0,
    fileRequestId: 0
  },
  chat: {
    client: null,
    authConfig: null,
    initialized: false,
    viewActive: false,
    sessions: [],
    sessionKey: "",
    messages: [],
    pendingRuns: new Map(),
    status: "disconnected",
    needsRefresh: false,
    historyRefreshTimer: null,
    bindingsReady: false,
    mobileSessionsOpen: false,
    sending: false,
    manualAuthSecret: "",
    lastStatusReason: "",
    streamTargetByMessage: new Map(),
    streamAnimationTimer: null,
    streamAnimationIsRaf: false,
    streamAnimationLastTs: 0,
    streamLastDomUpdateTs: 0,
    streamCursorFadeIds: new Set(),
    streamCursorFadeTimers: new Map(),
    historyLimit: 10,
    historyBatchSize: 10,
    historyMaxLimit: 1000,
    hasOlderMessages: false,
    loadingOlderMessages: false
  }
};

const REDACTED_API_KEY_TOKEN = "__OPENCLAW_REDACTED__";
const CHAT_STREAM_CURSOR_FADE_MS = 320;
const DEDICATED_MODEL_FIELDS = [
  {
    key: "imageModel",
    title: "图像理解模型",
    hint: "当对话包含图片时，优先使用这里的模型理解图片内容。"
  },
  {
    key: "imageGenerationModel",
    title: "图像生成模型",
    hint: "用于生成图片；仅在工作流明确调用生图能力时生效。"
  },
  {
    key: "pdfModel",
    title: "PDF 模型",
    hint: "用于读取和理解 PDF 文件，可额外限制文件大小和页数。"
  },
  {
    key: "summarizeModel",
    title: "摘要模型",
    hint: "用于上下文压缩与总结，避免长会话把主模型窗口撑满。"
  },
  {
    key: "subagentsModel",
    title: "子代理模型",
    hint: "用于工具调用和子任务执行，适合放更稳或更便宜的模型。"
  }
];
const MEMORY_SEARCH_PROVIDER_OPTIONS = [
  { value: "", label: "自动选择（留空）" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
  { value: "voyage", label: "Voyage" },
  { value: "mistral", label: "Mistral" },
  { value: "ollama", label: "Ollama" },
  { value: "local", label: "Local" }
];
const MEMORY_SEARCH_FALLBACK_OPTIONS = [
  { value: "", label: "默认（none）" },
  { value: "none", label: "None" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
  { value: "voyage", label: "Voyage" },
  { value: "mistral", label: "Mistral" },
  { value: "ollama", label: "Ollama" },
  { value: "local", label: "Local" }
];
const SUBAGENT_THINKING_OPTIONS = [
  { value: "", label: "跟随默认" },
  { value: "off", label: "off" },
  { value: "minimal", label: "minimal" },
  { value: "low", label: "low" },
  { value: "medium", label: "medium" },
  { value: "high", label: "high" },
  { value: "xhigh", label: "xhigh" },
  { value: "adaptive", label: "adaptive" }
];

// Skills 缓存，供配置弹窗读取
let _skillsCache = [];

const PERSONA_FALLBACK_FILES = [
  "IDENTITY.md",
  "SOUL.md",
  "AGENTS.md",
  "TOOLS.md",
  "USER.md",
  "HEARTBEAT.md",
  "BOOTSTRAP.md",
  "MEMORY.md"
];

const PERSONA_DEFAULT_WORKSPACE = "~/.openclaw/workspace";

const PERSONA_FILE_LABELS = {
  "identity.md": "身份设定",
  "soul.md": "灵魂核心",
  "agents.md": "行为规范",
  "tools.md": "工具提示",
  "user.md": "用户画像",
  "heartbeat.md": "心跳指令",
  "bootstrap.md": "启动引导",
  "memory.md": "长期记忆"
};

// =========================================
// Spotlight 交互与全局光照
// =========================================
const spotlightPointer = {
  active: false,
  x: 0,
  y: 0
};

let spotlightRefreshPending = false;
const reducedMotionMedia = typeof window.matchMedia === "function"
  ? window.matchMedia("(prefers-reduced-motion: reduce)")
  : null;
let prefersReducedMotion = reducedMotionMedia?.matches === true;

function clearSpotlightLenses() {
  document.querySelectorAll(".spotlight-lens").forEach((lens) => {
    lens.remove();
  });
}

function handleReducedMotionChange(event) {
  prefersReducedMotion = event.matches === true;
  if (!prefersReducedMotion) return;
  spotlightPointer.active = false;
  spotlightRefreshPending = false;
  clearSpotlightLenses();
}

if (reducedMotionMedia) {
  reducedMotionMedia.addEventListener("change", handleReducedMotionChange);
}

if (prefersReducedMotion) {
  clearSpotlightLenses();
}

function updateSpotlights(pointerX, pointerY) {
  if (prefersReducedMotion) return;
  const spotlights = document.querySelectorAll("[data-spotlight]");
  for (const el of spotlights) {
    const rect = el.getBoundingClientRect();
    const x = pointerX - rect.left;
    const y = pointerY - rect.top;

    let lens = el.querySelector(".spotlight-lens");
    if (!lens) {
      lens = document.createElement("div");
      lens.className = "spotlight-lens";
      el.appendChild(lens);
    }
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    const c1 = isLight ? "rgba(79, 70, 229, 0.08)" : "rgba(255, 255, 255, 0.075)";
    const c2 = isLight ? "rgba(79, 70, 229, 0.02)" : "rgba(255, 255, 255, 0.03)";
    lens.style.background = `radial-gradient(220px circle at ${x}px ${y}px, ${c1} 0%, ${c2} 40%, transparent 78%)`;
  }
}

function refreshSpotlightsAfterLayout() {
  if (prefersReducedMotion || !spotlightPointer.active || spotlightRefreshPending) return;
  spotlightRefreshPending = true;
  requestAnimationFrame(() => {
    spotlightRefreshPending = false;
    updateSpotlights(spotlightPointer.x, spotlightPointer.y);
  });
}

document.addEventListener("mousemove", (e) => {
  if (prefersReducedMotion) return;
  spotlightPointer.active = true;
  spotlightPointer.x = e.clientX;
  spotlightPointer.y = e.clientY;
  updateSpotlights(spotlightPointer.x, spotlightPointer.y);
}, { passive: true });

window.addEventListener("scroll", refreshSpotlightsAfterLayout, { passive: true, capture: true });
document.addEventListener("wheel", refreshSpotlightsAfterLayout, { passive: true });

document.addEventListener("mouseleave", () => {
  spotlightPointer.active = false;
});

const viewLoaders = {
  overview: loadOverview,
  models: loadModels,
  skills: loadSkills,
  cron: loadCron,
  nodes: loadNodes,
  usage: loadUsage,
  persona: loadPersona,
  chat: loadChat,
  logs: initLogsView
};

function $(id) {
  return document.getElementById(id);
}

async function api(path, options = {}) {
  const token = localStorage.getItem("openclaw_token");
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) {
    mergedHeaders["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(path, {
    ...options,
    headers: mergedHeaders
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

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
          <div class="toast-message">${escapeHtml(message)}</div>
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

function setModelsApplyState(phase = "idle", message = "") {
  state.modelsApply.phase = phase;
  state.modelsApply.message = message;

  const badge = $("models-apply-status");
  const saveBtn = $("models-save");
  const reloadBtn = $("models-reload");

  if (badge) {
    if (phase === "idle") {
      badge.hidden = true;
      badge.style.display = "none";
      badge.className = "status-badge status-badge-tight warn";
      badge.textContent = "";
    } else {
      badge.hidden = false;
      badge.style.display = "inline-flex";
      badge.className = `status-badge status-badge-tight ${phase === "error" ? "bad" : "warn"}`;
      badge.innerHTML = phase === "restarting"
        ? `<i class="fa-solid fa-rotate-right fa-spin status-badge-icon"></i>${escapeHtml(message || "网关热重启中")}`
        : `<i class="fa-solid fa-triangle-exclamation status-badge-icon"></i>${escapeHtml(message || "网关暂时不可用")}`;
    }
  }

  if (saveBtn) {
    if (phase === "idle") {
      saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 保存并应用配置';
      saveBtn.disabled = false;
    } else if (phase === "restarting") {
      saveBtn.innerHTML = '<i class="fa-solid fa-rotate-right fa-spin"></i> 等待网关重启...';
      saveBtn.disabled = true;
    } else if (phase === "error") {
      saveBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> 重试连接网关';
      saveBtn.disabled = false;
    }
  }

  if (reloadBtn) {
    reloadBtn.disabled = phase === "restarting";
  }
}

function isLikelyGatewayHotRestartError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("econnrefused")
    || message.includes("econnreset")
    || message.includes("read econnreset")
    || message.includes("socket hang up")
    || message.includes("fetch failed")
    || message.includes("gateway websocket is not connected")
    || message.includes("gateway websocket closed")
    || message.includes("gateway session closed")
    || message.includes("gateway unavailable")
    || message.includes("temporarily unavailable")
    || (message.includes("gateway") && message.includes("not connected"))
  );
}

async function verifyModelsSaveApplied(expectedState, {
  initialDelayMs = 1200,
  retryDelayMs = 900,
  maxAttempts = 14
} = {}) {
  let lastError = null;
  if (initialDelayMs > 0) await wait(initialDelayMs);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    setModelsApplyState("restarting", `保存响应中断，正在核对配置（第 ${attempt}/${maxAttempts} 次）`);
    try {
      const data = await api("/api/models");
      if (modelsStateMatchesExpected(data, expectedState)) {
        applyLoadedModelsData(data);
        setModelsApplyState("idle");
        return { verified: true, data };
      }
      lastError = new Error("保存后读取成功，但配置尚未达到预期状态");
    } catch (error) {
      lastError = error;
      if (!isLikelyGatewayHotRestartError(error)) {
        break;
      }
    }

    if (attempt < maxAttempts) {
      await wait(retryDelayMs);
    }
  }

  return { verified: false, error: lastError };
}

async function waitForModelsGatewayRecovery({
  initialDelayMs = 1200,
  retryDelayMs = 900,
  maxAttempts = 12
} = {}) {
  let lastError = null;
  if (initialDelayMs > 0) await wait(initialDelayMs);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    setModelsApplyState("restarting", `网关热重启中（第 ${attempt}/${maxAttempts} 次回连）`);
    try {
      await loadModels({ silent: true, rethrow: true });
      setModelsApplyState("idle");
      showToast("网关热重启完成，配置已重新连接", "success", 1800);
      return;
    } catch (error) {
      lastError = error;
      if (!isLikelyGatewayHotRestartError(error) || attempt === maxAttempts) {
        break;
      }
      await wait(retryDelayMs);
    }
  }

  setModelsApplyState("error", "网关热重启超时，配置已保存但可能未生效。请手动重启网关后重试。");
  throw lastError || new Error("网关热重启恢复失败");
}

function applyConfirmAcceptVariant(button, variant = "primary") {
  if (!button) return;
  button.classList.remove("btn-primary", "btn-primary-strong", "panel-action-btn", "btn-secondary", "btn-danger");
  if (variant === "danger") {
    button.classList.add("panel-action-btn", "btn-secondary", "btn-danger");
  } else {
    button.classList.add("btn-primary", "btn-primary-strong");
  }
}

function getSkillModalInitialSelector() {
  const apiKeyVisible = !$("skill-config-apikey-section")?.classList.contains("is-hidden");
  return apiKeyVisible ? "#skill-config-apikey" : "#skill-config-env-add";
}

// ── Cron Runs Modal ──

function formatCronRunItem(run) {
  const status = run.status || run.lastStatus || "unknown";
  const isOk = status === "ok" || status === "success";
  const isErr = status === "error" || status === "fail" || status === "failed";
  const iconCls = isOk ? "fa-solid fa-circle-check cron-run-icon-ok" : isErr ? "fa-solid fa-circle-xmark cron-run-icon-err" : "fa-solid fa-circle-minus cron-run-icon-unknown";
  const statusLabel = isOk ? "成功" : isErr ? "失败" : escapeHtml(status);

  const ts = run.runAtMs || run.ts || run.startedAt || run.runAt || run.timestamp || run.createdAt;
  const timeStr = ts ? new Date(typeof ts === "number" ? ts : ts).toLocaleString() : "-";
  const duration = run.durationMs != null ? `${run.durationMs}ms` : run.duration || "";
  const errMsg = run.error || run.errorMessage || "";

  return `<div class="cron-run-item ${isErr ? "cron-run-item-err" : ""}">
    <div class="cron-run-row">
      <i class="${iconCls}"></i>
      <span class="cron-run-status">${statusLabel}</span>
      <span class="cron-run-time">${escapeHtml(timeStr)}</span>
      ${duration ? `<span class="cron-run-duration">${escapeHtml(duration)}</span>` : ""}
    </div>
    ${errMsg ? `<div class="cron-run-error">${escapeHtml(errMsg)}</div>` : ""}
  </div>`;
}

function openCronRunsModal(jobId, runs) {
  const modal = $("cron-runs-modal");
  const titleEl = $("cron-runs-modal-title");
  const contentEl = $("cron-runs-modal-content");
  if (!modal || !contentEl) return;

  titleEl.textContent = `执行记录 — ${jobId}`;

  if (!runs || runs.length === 0) {
    contentEl.innerHTML = renderEmpty("fa-solid fa-inbox", "暂无执行记录", "该任务尚未产生运行日志");
  } else {
    contentEl.innerHTML = runs.map(formatCronRunItem).join("");
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("cron-runs-modal-open");
  captureModalFocus("cron-runs-modal");
}

function closeCronRunsModal() {
  const modal = $("cron-runs-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  releaseModalFocus("cron-runs-modal");
  document.body.classList.remove("cron-runs-modal-open");
}

// ── Confirm Dialog ──

function settleConfirmDialog(confirmed) {
  const modal = $("global-confirm-modal");
  if (modal) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }
  releaseModalFocus("global-confirm-modal", { restoreFocus: false });
  document.body.classList.remove("confirm-modal-open");

  const resolver = state.confirmDialog.resolver;
  const lastActiveElement = state.confirmDialog.lastActiveElement;
  state.confirmDialog.open = false;
  state.confirmDialog.resolver = null;
  state.confirmDialog.lastActiveElement = null;

  if (typeof resolver === "function") {
    resolver(confirmed === true);
  }

  if (lastActiveElement && typeof lastActiveElement.focus === "function") {
    try {
      lastActiveElement.focus({ preventScroll: true });
    } catch {
      lastActiveElement.focus();
    }
  }
}

function requestConfirmDialog({
  title = "请确认操作",
  message = "确认继续执行该操作吗？",
  confirmText = "确认",
  cancelText = "取消",
  variant = "primary"
} = {}) {
  const modal = $("global-confirm-modal");
  const titleEl = $("confirm-modal-title");
  const messageEl = $("confirm-modal-message");
  const confirmBtn = $("confirm-modal-accept");
  const cancelBtn = modal?.querySelector(".confirm-modal-cancel-btn");

  if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
    return Promise.resolve(window.confirm(message));
  }

  if (state.confirmDialog.open) {
    return Promise.resolve(false);
  }

  titleEl.textContent = String(title || "请确认操作");
  messageEl.textContent = String(message || "确认继续执行该操作吗？");
  confirmBtn.textContent = String(confirmText || "确认");
  cancelBtn.textContent = String(cancelText || "取消");
  applyConfirmAcceptVariant(confirmBtn, variant === "danger" ? "danger" : "primary");

  return new Promise((resolve) => {
    state.confirmDialog.open = true;
    state.confirmDialog.resolver = resolve;
    state.confirmDialog.lastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("confirm-modal-open");
    captureModalFocus("global-confirm-modal", { initialSelector: "#confirm-modal-accept" });
  });
}

function requestPromptDialog({
  title = "请输入",
  message = "",
  placeholder = "",
  defaultValue = "",
  confirmText = "确认",
  cancelText = "取消"
} = {}) {
  const modal = $("global-confirm-modal");
  const titleEl = $("confirm-modal-title");
  const messageEl = $("confirm-modal-message");
  const confirmBtn = $("confirm-modal-accept");
  const cancelBtn = modal?.querySelector(".confirm-modal-cancel-btn");

  if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
    const result = window.prompt(message || title, defaultValue);
    return Promise.resolve(result);
  }

  if (state.confirmDialog.open) {
    return Promise.resolve(null);
  }

  titleEl.textContent = String(title);
  const inputId = "confirm-modal-prompt-input";
  messageEl.innerHTML = `${message ? `<span>${escapeHtml(message)}</span>` : ""}
    <input id="${inputId}" type="text" class="prompt-dialog-input" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue)}" />`;
  confirmBtn.textContent = String(confirmText);
  cancelBtn.textContent = String(cancelText);
  applyConfirmAcceptVariant(confirmBtn, "primary");

  return new Promise((resolve) => {
    state.confirmDialog.open = true;
    state.confirmDialog.resolver = (confirmed) => {
      const input = $(inputId);
      const value = input ? input.value.trim() : "";
      messageEl.textContent = "确认继续执行该操作吗？";
      resolve(confirmed && value ? value : null);
    };
    state.confirmDialog.lastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("confirm-modal-open");
    captureModalFocus("global-confirm-modal", { initialSelector: `#${inputId}` });

    const input = $(inputId);
    if (input) {
      input.select();
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          settleConfirmDialog(true);
        }
      });
    }
  });
}

const MODAL_FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function getModalFocusableElements(modal) {
  if (!modal) return [];
  return Array.from(modal.querySelectorAll(MODAL_FOCUSABLE_SELECTOR))
    .filter((el) => el instanceof HTMLElement)
    .filter((el) => !el.hasAttribute("hidden"))
    .filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    });
}

function focusElementSafely(element) {
  if (!element || typeof element.focus !== "function") return;
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

function getActiveModalFocusRecord() {
  const stack = Array.isArray(state.modalFocus.stack) ? state.modalFocus.stack : [];
  return stack[stack.length - 1] || null;
}

function detachModalFocusRecord(record) {
  if (!record) return;
  const modal = $(record.modalId);
  if (modal && record.keydownHandler) {
    modal.removeEventListener("keydown", record.keydownHandler);
  }
}

function attachModalFocusRecord(record) {
  if (!record) return;
  const modal = $(record.modalId);
  if (modal && record.keydownHandler) {
    modal.addEventListener("keydown", record.keydownHandler);
  }
}

function focusModalInitialTarget(modal, initialSelector = "") {
  if (!modal || modal.contains(document.activeElement)) return;
  const target = initialSelector ? modal.querySelector(initialSelector) : null;
  if (target instanceof HTMLElement) {
    focusElementSafely(target);
    return;
  }
  const [first] = getModalFocusableElements(modal);
  if (first) focusElementSafely(first);
}

function captureModalFocus(modalId, { initialSelector } = {}) {
  const modal = $(modalId);
  if (!modal) return;

  const activeRecord = getActiveModalFocusRecord();
  if (activeRecord?.modalId === modalId) {
    activeRecord.initialSelector = initialSelector || activeRecord.initialSelector || "";
    requestAnimationFrame(() => {
      focusModalInitialTarget(modal, activeRecord.initialSelector || "");
    });
    return;
  }

  if (activeRecord) {
    detachModalFocusRecord(activeRecord);
  }

  const handler = (event) => {
    if (event.key !== "Tab") return;
    const focusables = getModalFocusableElements(modal);
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      focusElementSafely(last);
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      focusElementSafely(first);
    }
  };

  const record = {
    modalId,
    keydownHandler: handler,
    lastActiveElement: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    initialSelector: initialSelector || ""
  };
  state.modalFocus.stack.push(record);
  modal.addEventListener("keydown", handler);

  requestAnimationFrame(() => {
    focusModalInitialTarget(modal, record.initialSelector);
  });
}

function releaseModalFocus(modalId, { restoreFocus = true } = {}) {
  const stack = Array.isArray(state.modalFocus.stack) ? state.modalFocus.stack : [];
  if (stack.length === 0) return;

  let index = -1;
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i]?.modalId === modalId) {
      index = i;
      break;
    }
  }
  if (index === -1) return;

  const wasActiveRecord = index === stack.length - 1;
  const [record] = stack.splice(index, 1);
  detachModalFocusRecord(record);

  const activeRecord = getActiveModalFocusRecord();
  if (wasActiveRecord && activeRecord) {
    attachModalFocusRecord(activeRecord);
    requestAnimationFrame(() => {
      const activeModal = $(activeRecord.modalId);
      if (!activeModal) return;
      focusModalInitialTarget(activeModal, activeRecord.initialSelector || "");
    });
  }

  if (restoreFocus && record?.lastActiveElement instanceof HTMLElement) {
    focusElementSafely(record.lastActiveElement);
  }
}

function showError(targetId, err) {
  const el = $(targetId);
  if (!el) return;
  el.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
}

function renderTable(columns, rows) {
  const thCells = columns
    .map((c) => {
      const cls = c.className ? ` class="${c.className}"` : "";
      const align = c.align ? ` style="text-align:${c.align};"` : "";
      return `<th${cls}${align}>${c.title}</th>`;
    })
    .join("");

  const trRows = rows
    .map((row) => {
      const tdCells = columns
        .map((c) => {
          const cls = c.className ? ` class="${c.className}"` : "";
          const align = c.align ? ` style="text-align:${c.align};"` : "";
          return `<td${cls}${align}>${c.render(row)}</td>`;
        })
        .join("");
      return `<tr>${tdCells}</tr>`;
    })
    .join("");

  return `<div class="table-wrap"><table><thead><tr>${thCells}</tr></thead><tbody>${trRows}</tbody></table></div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeSelectorAttrValue(value) {
  const raw = String(value || "");
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(raw);
  }
  return raw.replace(/(["\\])/g, "\\$1");
}

function sanitizeMarkdownHref(rawHref) {
  const href = String(rawHref || "").replaceAll("&amp;", "&").trim();
  if (!href) return "";
  if (!/^(https?:\/\/|mailto:|\/)/i.test(href)) return "";
  return escapeHtml(href);
}

function renderMarkdownInline(value) {
  const source = String(value || "");
  if (!source) return "";

  const codeTokens = [];
  const withCodeTokens = source.replace(/`([^`\n]+?)`/g, (_, code) => {
    const token = `@@CODE${codeTokens.length}@@`;
    codeTokens.push(String(code || ""));
    return token;
  });

  const linkTokens = [];
  const withLinkTokens = withCodeTokens.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (full, label, rawHref) => {
    const href = sanitizeMarkdownHref(rawHref);
    if (!href) return full;
    const token = `@@LINK${linkTokens.length}@@`;
    linkTokens.push(`<a href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`);
    return token;
  });

  let html = escapeHtml(withLinkTokens);

  html = html.replace(/\*\*([^*][\s\S]*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_][\s\S]*?)__/g, "<strong>$1</strong>");
  html = html.replace(/~~([^~][\s\S]*?)~~/g, "<del>$1</del>");
  html = html.replace(/\*([^*\n][\s\S]*?)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_\n][\s\S]*?)_/g, "<em>$1</em>");

  html = html.replace(/@@LINK(\d+)@@/g, (_, index) => linkTokens[Number(index)] || "");

  html = html.replace(/@@CODE(\d+)@@/g, (_, index) => {
    const code = codeTokens[Number(index)] || "";
    return `<code>${escapeHtml(code)}</code>`;
  });

  return html;
}

function renderMarkdownBlock(block) {
  const lines = String(block || "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return "";

  const headingMatch = lines.length === 1 ? lines[0].match(/^\s{0,3}(#{1,6})\s+(.+)$/) : null;
  if (headingMatch) {
    const level = headingMatch[1].length;
    const text = renderMarkdownInline(headingMatch[2]);
    return `<h${level}>${text}</h${level}>`;
  }

  if (lines.every((line) => /^\s*>\s?/.test(line))) {
    const quoted = lines.map((line) => line.replace(/^\s*>\s?/, ""));
    return `<blockquote>${quoted.map((line) => renderMarkdownInline(line)).join("<br>")}</blockquote>`;
  }

  if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
    const items = lines.map((line) => line.replace(/^\s*[-*]\s+/, ""));
    return `<ul>${items.map((item) => `<li>${renderMarkdownInline(item)}</li>`).join("")}</ul>`;
  }

  if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
    const items = lines.map((line) => line.replace(/^\s*\d+\.\s+/, ""));
    return `<ol>${items.map((item) => `<li>${renderMarkdownInline(item)}</li>`).join("")}</ol>`;
  }

  return `<p>${lines.map((line) => renderMarkdownInline(line)).join("<br>")}</p>`;
}

function renderMarkdown(value) {
  const source = String(value || "").replace(/\r\n?/g, "\n").trim();
  if (!source) return "";

  const chunks = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
  let cursor = 0;
  let match = codeBlockRegex.exec(source);

  const pushTextBlocks = (text) => {
    const blocks = String(text || "")
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
    for (const block of blocks) {
      chunks.push(renderMarkdownBlock(block));
    }
  };

  while (match) {
    const before = source.slice(cursor, match.index);
    if (before.trim()) {
      pushTextBlocks(before);
    }

    const language = String(match[1] || "").trim();
    const code = String(match[2] || "").replace(/\n$/, "");
    const langAttr = language ? ` data-lang="${escapeHtml(language)}"` : "";
    chunks.push(`<pre class="chat-md-code"><code${langAttr}>${escapeHtml(code)}</code></pre>`);

    cursor = match.index + match[0].length;
    match = codeBlockRegex.exec(source);
  }

  const tail = source.slice(cursor);
  if (tail.trim()) {
    pushTextBlocks(tail);
  }

  return chunks.join("");
}

function autoCloseMarkdown(text) {
  let result = String(text || "");
  if (!result) return result;

  // Close unclosed code fences (``` blocks)
  const fenceMatches = result.match(/^```/gm);
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    return `${result}\n\`\`\``;
  }

  // For the last line, close unclosed inline markers
  const lines = result.split("\n");
  const lastLine = lines[lines.length - 1];

  // Close unclosed backticks
  const backtickCount = (lastLine.match(/(?<!\\)`/g) || []).length;
  if (backtickCount % 2 !== 0) {
    result += "`";
  }

  const starRuns = [...lastLine.matchAll(/(?<!\\)\*+/g)].map((match) => match[0].length);
  const boldCount = starRuns.reduce((total, count) => total + Math.floor(count / 2), 0);
  if (boldCount % 2 !== 0) {
    result += "**";
  }

  // Close unclosed italic markers (*)
  const singleStarCount = starRuns.reduce((total, count) => total + (count % 2), 0);
  if (singleStarCount > 0 && singleStarCount % 2 !== 0) {
    result += "*";
  }

  return result;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getLogLevel(line) {
  const text = String(line || "");
  if (/\b(error|failed|failure|exception|fatal|panic|denied)\b/i.test(text)) return "error";
  if (/\b(warn|warning|deprecated|retry)\b/i.test(text)) return "warn";
  if (/\b(info|connected|started|success|ready)\b/i.test(text)) return "info";
  return "default";
}

function highlightLogKeyword(line, keyword) {
  const source = String(line || "");
  if (!keyword) return escapeHtml(source);
  const pattern = new RegExp(escapeRegExp(keyword), "gi");
  let result = "";
  let cursor = 0;
  let match = pattern.exec(source);
  while (match !== null) {
    result += escapeHtml(source.slice(cursor, match.index));
    result += `<mark class="log-highlight">${escapeHtml(match[0])}</mark>`;
    cursor = match.index + match[0].length;
    if (match[0].length === 0) break;
    match = pattern.exec(source);
  }
  result += escapeHtml(source.slice(cursor));
  return result;
}

function renderLogLine(line, keyword) {
  const level = getLogLevel(line);
  return `<span class="log-line log-${level}">${highlightLogKeyword(line, keyword)}</span>`;
}

function setLogsOutputPlaceholder(message = "等待日志输出...") {
  const output = $("logs-output");
  if (!output) return;
  output.classList.add("log-output-empty");
  output.textContent = String(message || "等待日志输出...");
}

function appendLogLines(lines, keyword) {
  const output = $("logs-output");
  if (!output || lines.length === 0) return;
  if (output.classList.contains("log-output-empty")) {
    output.classList.remove("log-output-empty");
    output.innerHTML = "";
  }
  const html = lines.map((line) => renderLogLine(line, keyword)).join("\n");
  if (output.innerHTML) output.insertAdjacentText("beforeend", "\n");
  output.insertAdjacentHTML("beforeend", html);
  output.scrollTop = output.scrollHeight;
}

// Safe arithmetic expression evaluator (numbers, + - * /, parentheses, whitespace only)
function evaluateArithmetic(expr) {
  const s = String(expr || '').replace(/\s/g, '');
  if (!s) return 0;
  if (!/^[0-9+\-*/().]+$/.test(s)) {
    throw new Error('Invalid expression');
  }
  let pos = 0;
  function parseExpression() {
    let value = parseTerm();
    while (pos < s.length) {
      const char = s[pos];
      if (char === '+') { pos++; value += parseTerm(); }
      else if (char === '-') { pos++; value -= parseTerm(); }
      else break;
    }
    return value;
  }
  function parseTerm() {
    let value = parseFactor();
    while (pos < s.length) {
      const char = s[pos];
      if (char === '*') { pos++; value *= parseFactor(); }
      else if (char === '/') {
        pos++;
        const divisor = parseFactor();
        if (divisor === 0) throw new Error('Division by zero');
        value /= divisor;
      } else break;
    }
    return value;
  }
  function parseFactor() {
    if (pos >= s.length) throw new Error('Unexpected end');
    const char = s[pos];
    if (char === '(') {
      pos++;
      const value = parseExpression();
      if (pos >= s.length || s[pos] !== ')') throw new Error('Missing closing parenthesis');
      pos++;
      return value;
    }
    const start = pos;
    let hasDecimal = false;
    while (pos < s.length) {
      const c = s[pos];
      if (c >= '0' && c <= '9') pos++;
      else if (c === '.' && !hasDecimal) { hasDecimal = true; pos++; }
      else break;
    }
    if (start === pos) throw new Error('Expected number');
    const num = parseFloat(s.substring(start, pos));
    if (isNaN(num)) throw new Error('Invalid number');
    return num;
  }
  const result = parseExpression();
  if (pos < s.length) throw new Error('Unexpected character');
  return Math.round(result);
}

function setView(view) {
  state.currentView = view;

  if (view === "models" && state.modelsApply.phase === "idle") {
    setModelsApplyState("idle");
  }

  for (const section of document.querySelectorAll(".view")) {
    section.classList.toggle("active", section.id === `view-${view}`);
  }

  for (const item of document.querySelectorAll("#nav-menu .nav-item")) {
    item.classList.toggle("active", item.dataset.view === view);
  }

  const load = viewLoaders[view];
  if (load) load();

  if (view === "overview") {
    loadSystemLoad();
    startOverviewTimers();
  } else {
    stopOverviewTimers();
  }

  if (view === "logs") {
    startLogStream();
  } else {
    stopLogStream();
  }

  setChatViewActive(view === "chat");
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

function startOverviewTimers() {
  if (!state.systemTimer) {
    state.systemTimer = setInterval(() => {
      if (state.currentView === "overview") loadSystemLoad();
    }, 5000);
  }
  if (!state.overviewTimer) {
    state.overviewTimer = setInterval(() => {
      if (state.currentView === "overview") loadOverview();
    }, 30000);
  }
}

function stopOverviewTimers() {
  if (state.systemTimer) {
    clearInterval(state.systemTimer);
    state.systemTimer = null;
  }
  if (state.overviewTimer) {
    clearInterval(state.overviewTimer);
    state.overviewTimer = null;
  }
}

function renderEmpty(icon, title, subtitle) {
  return `
    <div class="empty-placeholder">
      <div class="empty-icon"><i class="${icon}"></i></div>
      <div class="empty-title">${title}</div>
      <div class="empty-subtitle">${subtitle}</div>
    </div>
  `;
}

function renderSkeleton(rows = 3) {
  let lines = "";
  const widthClasses = ["skeleton-w-96", "skeleton-w-90", "skeleton-w-84", "skeleton-w-78"];
  for (let i = 0; i < rows; i++) {
    const widthClass = widthClasses[Math.floor(Math.random() * widthClasses.length)];
    lines += `<div class="skeleton-text ${widthClass}"></div>`;
  }
  return `<div class="skeleton-stack">${lines}</div>`;
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
    const sessions = data.sessions?.sessions || [];
    const cronJobs = data.cronList?.jobs || [];
    const nodeList = data.nodes?.nodes || [];
    const nodeOnline = nodeList.filter((node) => node.connected).length;
    const errors = (data.logs?.lines || []).filter((line) => /error|failed|denied/i.test(line));

    const metrics = [
      { label: "活跃会话", value: sessions.length, icon: "fa-regular fa-comments", toneClass: "stat-icon-info" },
      { label: "计划任务", value: cronJobs.filter((j) => j.enabled).length, icon: "fa-regular fa-clock", toneClass: "stat-icon-success" },
      { label: "在线节点", value: `${nodeOnline}/${nodeList.length}`, icon: "fa-solid fa-server", toneClass: "stat-icon-warning" },
      { label: "最近异常", value: errors.length, icon: "fa-solid fa-triangle-exclamation", toneClass: "stat-icon-danger" }
    ];

    const statsHtml = metrics.map(m => `
      <div class="stat-card stat-card-shell">
      <div class="stat-card-icon-wrap">
          <i class="${m.icon} stat-card-icon ${m.toneClass}"></i>
        </div>
        <div class="stat-card-info">
          <div class="stat-label stat-label-compact">${m.label}</div>
          <div class="stat-value stat-value-hero">${m.value}</div>
        </div>
      </div>
    `).join("");

    const sessionsHtml = sessions.slice(0, 10).map((r) => {
      return `
        <div class="panel-row">
          <div class="panel-row-head">
            <strong class="panel-row-title panel-row-title-break">${escapeHtml(r.label || r.displayName || r.key)}</strong>
            <span class="panel-row-meta"><i class="fa-regular fa-clock icon-prefix-sm"></i>${r.updatedAt ? new Date(r.updatedAt).toLocaleTimeString() : "-"}</span>
          </div>
          <div>
            <span class="status-badge accent status-badge-tight"><i class="fa-solid fa-microchip status-badge-icon"></i>${escapeHtml(r.model || "-")}</span>
          </div>
        </div>
      `;
    }).join("");

    const channelAccounts = data.channels?.channelAccounts || {};
    const channelRows = Object.entries(channels).map(([name, ch]) => {
      const accounts = Array.isArray(channelAccounts[name]) ? channelAccounts[name] : [];
      const hasConnected = ch?.connected === true || accounts.some((acc) => acc?.connected === true);
      const hasRunning = ch?.running === true || accounts.some((acc) => acc?.running === true);
      const configured = ch?.configured === true;

      let stateLabel = "离线";
      let statusClass = "warn";

      if (!configured) {
        stateLabel = "未配置";
        statusClass = "bad";
      } else if (hasConnected) {
        stateLabel = "已连接";
        statusClass = "ok";
      } else if (hasRunning) {
        stateLabel = "运行中";
        statusClass = "ok";
      }

      const detail = ch?.lastError || ch?.mode || (hasRunning ? "服务已启动" : "等待启动");
      return { name, detail, stateLabel, statusClass };
    });

    const channelHtml = channelRows.map((r) => {
      return `
        <div class="panel-row">
          <div class="panel-row-head panel-row-head-center">
            <strong class="panel-row-title panel-row-title-nowrap">${escapeHtml(r.name)}</strong>
            <span class="status-badge status-badge-tight ${r.statusClass}">${r.stateLabel}</span>
          </div>
          <div>
            <span class="panel-row-detail">${escapeHtml(r.detail || "-")}</span>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = `

      <div class="dashboard-grid dashboard-grid-lg">${statsHtml}</div>
      
      <div class="panel-grid-split">
        <div class="glass-panel glass-panel-shell" data-spotlight>
          <div class="panel-header"><span class="panel-title panel-title-foreground"><i class="fa-solid fa-list-ul panel-title-icon panel-title-icon-accent"></i>最近活跃会话</span></div>
          <div class="panel-body-scroll">
             ${sessionsHtml || '<div class="panel-empty">暂无活跃会话</div>'}
          </div>
        </div>
        
        <div class="glass-panel glass-panel-shell" data-spotlight>
          <div class="panel-header"><span class="panel-title panel-title-foreground"><i class="fa-solid fa-network-wired panel-title-icon panel-title-icon-warning"></i>频道状态快照</span></div>
          <div class="panel-body-scroll">
             ${channelHtml || '<div class="panel-empty">暂无频道数据</div>'}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="glass-panel panel-error">${escapeHtml(err.message)}</div>`;
  }
}

// （别名和默认模型相关控制已被移除）

// ── Gateway Restart & Doctor ─────────────────────────────────────

async function waitForGatewayRecovery({
  initialDelayMs = 1200,
  preRestartDelayMs = 0,
  retryDelayMs = 900,
  maxAttempts = 15,
  onStatus = () => {}
} = {}) {
  // Phase 0: wait for the scheduled restart delay (from gateway response)
  if (preRestartDelayMs > 0) {
    onStatus("scheduled", `网关计划在 ${Math.ceil(preRestartDelayMs / 1000)} 秒后重启...`);
    await wait(preRestartDelayMs);
  }

  if (initialDelayMs > 0) await wait(initialDelayMs);

  // Helper: check if gateway is actually up (doctor returns ok: true)
  async function isGatewayUp() {
    try {
      const result = await api("/api/gateway/doctor");
      return result?.ok === true;
    } catch {
      return false;
    }
  }

  // Phase 1: wait for gateway to actually go down (probe until disconnect)
  onStatus("waiting-down", "等待网关开始重启...");
  for (let i = 0; i < 12; i++) {
    if (!(await isGatewayUp())) break;
    await wait(800);
  }

  // Phase 2: wait for gateway to come back up
  onStatus("waiting-up", "网关正在重启，等待恢复...");
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    onStatus("recovering", `回连中 (${attempt}/${maxAttempts})`);
    if (await isGatewayUp()) return true;
    if (attempt < maxAttempts) await wait(retryDelayMs);
  }
  return false;
}

async function handleGatewayRestart() {
  const restartBtn = $("overview-restart");
  if (!restartBtn || restartBtn.disabled) return;

  // Pre-restart doctor check
  restartBtn.disabled = true;
  const origLabel = restartBtn.innerHTML;
  restartBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 预检中...';

  let doctorOk = true;
  try {
    const doctorResult = await api("/api/gateway/doctor");
    const errors = (doctorResult?.issues || []).filter((i) => i.severity === "error");
    if (errors.length > 0) {
      restartBtn.disabled = false;
      restartBtn.innerHTML = origLabel;
      showToast("检测到严重问题，请先修复后再重启", "error", 3000);
      showDoctorModal(doctorResult.issues, doctorResult.info || {});
      return;
    }
  } catch {
    doctorOk = false;
  }

  restartBtn.innerHTML = origLabel;
  restartBtn.disabled = false;

  const confirmed = await requestConfirmDialog({
    title: "重启网关",
    message: doctorOk
      ? "预检通过，将执行热重启（in-process reload）。网关会先等待进行中的任务完成，再平滑重载配置并恢复服务，整个过程通常需要几秒到半分钟。"
      : "预检未能连接网关，网关可能已无响应。将执行硬重启（终止进程并由系统服务重新拉起），恢复时间视进程管理器而定，通常需要十几秒到一分钟。",
    confirmText: doctorOk ? "确认热重启" : "确认硬重启",
    cancelText: "取消",
    variant: "danger"
  });
  if (!confirmed) return;

  const mode = doctorOk ? "hot" : "hard";
  await executeGatewayRestart(restartBtn, origLabel, mode);
}

async function executeGatewayRestart(restartBtn, origLabel, mode) {
  restartBtn.disabled = true;
  const isHot = mode === "hot";
  restartBtn.innerHTML = isHot
    ? '<i class="fa-solid fa-spinner fa-spin"></i> 热重启中...'
    : '<i class="fa-solid fa-spinner fa-spin"></i> 硬重启中...';

  try {
    const result = await api("/api/gateway/restart", {
      method: "POST",
      body: JSON.stringify({ mode })
    });

    // Use timing from gateway response for hot restart
    const delayMs = Number(result?.restart?.delayMs || 0);
    const cooldownMs = Number(result?.restart?.cooldownMsApplied || 0);
    const preRestartDelayMs = isHot ? Math.max(0, delayMs + cooldownMs) : 0;

    const recovered = await waitForGatewayRecovery({
      preRestartDelayMs,
      initialDelayMs: isHot ? 500 : 3000,
      retryDelayMs: isHot ? 900 : 1500,
      maxAttempts: isHot ? 20 : 25,
      onStatus: (phase, msg) => {
        restartBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${msg}`;
      }
    });

    if (recovered) {
      showToast(`网关${isHot ? "热" : "硬"}重启完成`, "success", 2000);
      loadOverview();
    } else {
      showToast(`网关${isHot ? "热" : "硬"}重启后未能恢复连接，请检查网关状态`, "error", 5000);
    }
  } catch (err) {
    // Restart request may fail because the gateway disconnects during the RPC call
    // (timeout, connection reset, etc.) — this is expected behavior during restart.
    // Always attempt recovery instead of immediately showing failure.
    if (isHot) {
      restartBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 网关正在重启...';
      const recovered = await waitForGatewayRecovery({
        initialDelayMs: 2500,
        maxAttempts: 20,
        onStatus: (phase, msg) => {
          restartBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${msg}`;
        }
      });
      if (recovered) {
        showToast("网关热重启完成", "success", 2000);
        loadOverview();
      } else {
        showToast("网关热重启后未能恢复连接，请检查网关状态", "error", 5000);
      }
    } else {
      showToast(`重启失败: ${err.message || err}`, "error", 4000);
    }
  } finally {
    restartBtn.disabled = false;
    restartBtn.innerHTML = origLabel;
  }
}

async function handleGatewayDoctor() {
  const doctorBtn = $("overview-doctor");
  if (!doctorBtn || doctorBtn.disabled) return;

  const origLabel = doctorBtn.innerHTML;
  doctorBtn.disabled = true;
  doctorBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 诊断中...';

  try {
    const result = await api("/api/gateway/doctor");
    const issues = result?.issues || [];

    if (issues.length === 0) {
      showToast("一切正常！网关运行状态良好", "success", 3000);
      return;
    }

    showDoctorModal(issues, result?.info || {});
  } catch (err) {
    showDoctorModal([{
      id: "request-failed",
      severity: "error",
      title: "诊断请求失败",
      detail: err.message || String(err),
      autoFixable: false,
      hint: "请检查 WebUI 后端与网关的连接"
    }], {});
  } finally {
    doctorBtn.disabled = false;
    doctorBtn.innerHTML = origLabel;
  }
}

function showDoctorModal(issues, info) {
  const modal = $("doctor-modal");
  const content = $("doctor-modal-content");
  if (!modal || !content) return;

  const infoHtml = (info.version || info.uptime) ? `
    <div style="padding:.8em 1.2em;border-bottom:1px solid var(--glass-border);display:flex;gap:1.2em;flex-wrap:wrap;font-size:.85em;color:var(--text-secondary)">
      ${info.version ? `<span><i class="fa-solid fa-code-branch" style="margin-right:.3em"></i>版本: ${escapeHtml(String(info.version))}</span>` : ""}
      ${info.uptime != null ? `<span><i class="fa-regular fa-clock" style="margin-right:.3em"></i>运行时长: ${formatUptime(info.uptime)}</span>` : ""}
      ${info.platform ? `<span><i class="fa-solid fa-desktop" style="margin-right:.3em"></i>${escapeHtml(String(info.platform))}</span>` : ""}
    </div>
  ` : "";

  const issuesHtml = issues.map((issue) => {
    const sevIcon = issue.severity === "error"
      ? '<i class="fa-solid fa-circle-xmark" style="color:var(--danger-text)"></i>'
      : '<i class="fa-solid fa-triangle-exclamation" style="color:var(--warning-text)"></i>';
    const sevLabel = issue.severity === "error" ? "错误" : "警告";

    return `
      <div class="doctor-issue" style="padding:.8em 1.2em;border-bottom:1px solid var(--glass-border)">
        <div style="display:flex;align-items:center;gap:.5em;margin-bottom:.3em">
          ${sevIcon}
          <strong style="flex:1">${escapeHtml(issue.title)}</strong>
          <span class="status-badge status-badge-tight ${issue.severity === 'error' ? 'bad' : 'warn'}">${sevLabel}</span>
        </div>
        <div style="font-size:.85em;color:var(--text-secondary);margin-bottom:.4em">${escapeHtml(issue.detail)}</div>
        ${issue.hint ? `<div style="font-size:.82em;color:var(--text-tertiary)"><i class="fa-solid fa-lightbulb" style="margin-right:.3em;color:var(--warning-text)"></i>${escapeHtml(issue.hint)}</div>` : ""}
      </div>
    `;
  }).join("");

  content.innerHTML = infoHtml + issuesHtml;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeDoctorModal() {
  const modal = $("doctor-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function formatUptime(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "-";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}天${h}小时`;
  if (h > 0) return `${h}小时${m}分钟`;
  return `${m}分钟`;
}

function cloneProviderConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function cloneAgentModelsConfig(value) {
  return cloneProviderConfig(value);
}

function cloneOptionalConfigObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const cloned = cloneProviderConfig(value);
  return Object.keys(cloned).length > 0 ? cloned : null;
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeysDeep(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeysDeep(value[key]);
  }
  return sorted;
}

function cloneAgentModelConfig(value) {
  if (typeof value === "string") {
    const primary = value.trim();
    return primary ? { primary } : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const source = cloneProviderConfig(value);
  const primary = typeof source.primary === "string" ? source.primary.trim() : "";
  const fallbacks = Array.isArray(source.fallbacks)
    ? source.fallbacks.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (primary) source.primary = primary;
  else delete source.primary;

  if (fallbacks.length > 0) source.fallbacks = fallbacks;
  else delete source.fallbacks;

  return Object.keys(source).length > 0 ? source : null;
}

function cloneAgentDefaultModelConfig(value) {
  return cloneAgentModelConfig(value);
}

function cloneMemorySearchConfig(value) {
  const source = cloneOptionalConfigObject(value);
  if (!source) return null;

  if (typeof source.provider === "string") {
    source.provider = source.provider.trim();
    if (!source.provider) delete source.provider;
  }
  if (typeof source.model === "string") {
    source.model = source.model.trim();
    if (!source.model) delete source.model;
  }
  if (typeof source.fallback === "string") {
    source.fallback = source.fallback.trim();
    if (!source.fallback) delete source.fallback;
  }

  if (source.remote && typeof source.remote === "object" && !Array.isArray(source.remote)) {
    const remote = cloneProviderConfig(source.remote);
    if (typeof remote.baseUrl === "string") {
      remote.baseUrl = remote.baseUrl.trim();
      if (!remote.baseUrl) delete remote.baseUrl;
    }
    if (typeof remote.apiKey === "string") {
      remote.apiKey = remote.apiKey.trim();
      if (!remote.apiKey) delete remote.apiKey;
    }
    source.remote = Object.keys(remote).length > 0 ? remote : undefined;
  }

  if (source.remote === undefined) {
    delete source.remote;
  }

  return Object.keys(source).length > 0 ? source : null;
}

function normalizeOptionalPositiveNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function normalizeOptionalPositiveInteger(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

function normalizeComparableConfigObject(value) {
  return sortKeysDeep(cloneOptionalConfigObject(value));
}

function normalizeComparableAgentModelConfig(value) {
  return sortKeysDeep(cloneAgentModelConfig(value));
}

function normalizeComparableMemorySearchConfig(value) {
  const source = cloneMemorySearchConfig(value);
  if (!source) return null;
  if (source.remote && typeof source.remote === "object" && !Array.isArray(source.remote)) {
    delete source.remote.apiKey;
    if (Object.keys(source.remote).length === 0) delete source.remote;
  }
  return sortKeysDeep(source);
}

function listAgentModelRefs(value) {
  const normalized = cloneAgentModelConfig(value);
  if (!normalized) return [];
  const refs = [];
  if (typeof normalized.primary === "string" && normalized.primary.trim()) {
    refs.push(normalized.primary.trim());
  }
  if (Array.isArray(normalized.fallbacks)) {
    refs.push(...normalized.fallbacks.map((item) => String(item).trim()).filter(Boolean));
  }
  return Array.from(new Set(refs));
}

function getAgentDefaultModelPrimary(value = state.agentsDefaultModelDraft) {
  if (typeof value === "string") return value.trim();
  return typeof value?.primary === "string" ? value.primary.trim() : "";
}

function buildProviderModelRef(providerKey, modelId) {
  const provider = String(providerKey || "").trim();
  const model = String(modelId || "").trim();
  if (!provider || !model) return "";
  if (model.toLowerCase().startsWith(`${provider.toLowerCase()}/`)) {
    return model;
  }
  return `${provider}/${model}`;
}

function getProviderModelRefs(providerKey, provider) {
  return getProviderModelRows(provider)
    .map((row) => buildProviderModelRef(providerKey, row.id))
    .filter(Boolean);
}

function isAllowlistedModelRef(modelRef) {
  return Boolean(modelRef && Object.prototype.hasOwnProperty.call(state.agentsDefaultsModelsDraft, modelRef));
}

function isDefaultModelRef(modelRef) {
  return Boolean(modelRef && modelRef === getAgentDefaultModelPrimary());
}

function clearAgentDefaultModelForRefs(defaultModelDraft, refs = []) {
  const targets = new Set((Array.isArray(refs) ? refs : []).map((item) => String(item || "").trim()).filter(Boolean));
  if (targets.size === 0) return cloneAgentDefaultModelConfig(defaultModelDraft);

  const nextDraft = cloneAgentDefaultModelConfig(defaultModelDraft);
  if (!nextDraft) return null;

  const currentPrimary = getAgentDefaultModelPrimary(nextDraft);
  if (!currentPrimary || !targets.has(currentPrimary)) {
    return nextDraft;
  }

  const remainingFallbacks = Array.isArray(nextDraft.fallbacks)
    ? nextDraft.fallbacks.map((item) => String(item).trim()).filter((item) => item && !targets.has(item))
    : [];

  if (remainingFallbacks.length > 0) {
    nextDraft.primary = remainingFallbacks.shift();
    if (remainingFallbacks.length > 0) nextDraft.fallbacks = remainingFallbacks;
    else delete nextDraft.fallbacks;
    return nextDraft;
  }

  delete nextDraft.primary;
  delete nextDraft.fallbacks;
  return Object.keys(nextDraft).length > 0 ? nextDraft : null;
}

function buildAgentsDefaultsModelsPatchForSave(modelsMap, deletedRefs = []) {
  const patch = cloneAgentModelsConfig(modelsMap);
  for (const ref of deletedRefs) {
    const modelRef = String(ref || "").trim();
    if (!modelRef) continue;
    patch[modelRef] = null;
  }
  return patch;
}

function getConfiguredProviderModelCount(providers = state.modelProvidersDraft) {
  let count = 0;
  for (const provider of Object.values(providers || {})) {
    count += getProviderModelRows(provider).length;
  }
  return count;
}

function normalizeComparableProviders(providers = {}) {
  const normalized = {};
  for (const [providerKey, rawProvider] of Object.entries(providers || {})) {
    if (!rawProvider || typeof rawProvider !== "object" || Array.isArray(rawProvider)) continue;
    const provider = cloneProviderConfig(rawProvider);
    delete provider.apiKey;
    normalized[providerKey] = sortKeysDeep(provider);
  }
  return sortKeysDeep(normalized);
}

function normalizeComparableAllowlist(models = {}) {
  return sortKeysDeep(cloneAgentModelsConfig(models));
}

function normalizeComparableDefaultModelConfig(value) {
  return sortKeysDeep(cloneAgentDefaultModelConfig(value));
}

function captureExpectedModelsState() {
  return {
    providers: cloneProviderConfig(state.modelProvidersDraft),
    agentsDefaultsModels: cloneAgentModelsConfig(state.agentsDefaultsModelsDraft),
    agentsDefaultModel: cloneAgentDefaultModelConfig(state.agentsDefaultModelDraft),
    imageModel: cloneAgentModelConfig(state.modelsAdvancedDrafts.imageModel),
    imageGenerationModel: cloneAgentModelConfig(state.modelsAdvancedDrafts.imageGenerationModel),
    pdfModel: cloneAgentModelConfig(state.modelsAdvancedDrafts.pdfModel),
    pdfMaxBytesMb: normalizeOptionalPositiveNumber(state.modelsAdvancedDrafts.pdfMaxBytesMb),
    pdfMaxPages: normalizeOptionalPositiveInteger(state.modelsAdvancedDrafts.pdfMaxPages),
    summarize: cloneOptionalConfigObject(state.modelsAdvancedDrafts.summarize),
    subagents: cloneOptionalConfigObject(state.modelsAdvancedDrafts.subagents),
    memorySearch: cloneMemorySearchConfig(state.modelsAdvancedDrafts.memorySearch)
  };
}

function modelsStateMatchesExpected(data, expected) {
  if (!data || !expected) return false;

  const currentProviders = normalizeComparableProviders(data.modelsConfig?.providers || {});
  const currentAllowlist = normalizeComparableAllowlist(data.agentsDefaultsModels || {});
  const currentDefaultModel = normalizeComparableDefaultModelConfig(data.agentsDefaultModel);
  const currentImageModel = normalizeComparableAgentModelConfig(data.imageModel);
  const currentImageGenerationModel = normalizeComparableAgentModelConfig(data.imageGenerationModel);
  const currentPdfModel = normalizeComparableAgentModelConfig(data.pdfModel);
  const currentPdfMaxBytesMb = normalizeOptionalPositiveNumber(data.pdfMaxBytesMb);
  const currentPdfMaxPages = normalizeOptionalPositiveInteger(data.pdfMaxPages);
  const currentSummarize = normalizeComparableConfigObject(data.summarize);
  const currentSubagents = normalizeComparableConfigObject(data.subagents);
  const currentMemorySearch = normalizeComparableMemorySearchConfig(data.memorySearch);

  const expectedProviders = normalizeComparableProviders(expected.providers || {});
  const expectedAllowlist = normalizeComparableAllowlist(expected.agentsDefaultsModels || {});
  const expectedDefaultModel = normalizeComparableDefaultModelConfig(expected.agentsDefaultModel);
  const expectedImageModel = normalizeComparableAgentModelConfig(expected.imageModel);
  const expectedImageGenerationModel = normalizeComparableAgentModelConfig(expected.imageGenerationModel);
  const expectedPdfModel = normalizeComparableAgentModelConfig(expected.pdfModel);
  const expectedPdfMaxBytesMb = normalizeOptionalPositiveNumber(expected.pdfMaxBytesMb);
  const expectedPdfMaxPages = normalizeOptionalPositiveInteger(expected.pdfMaxPages);
  const expectedSummarize = normalizeComparableConfigObject(expected.summarize);
  const expectedSubagents = normalizeComparableConfigObject(expected.subagents);
  const expectedMemorySearch = normalizeComparableMemorySearchConfig(expected.memorySearch);

  return JSON.stringify(currentProviders) === JSON.stringify(expectedProviders)
    && JSON.stringify(currentAllowlist) === JSON.stringify(expectedAllowlist)
    && JSON.stringify(currentDefaultModel) === JSON.stringify(expectedDefaultModel)
    && JSON.stringify(currentImageModel) === JSON.stringify(expectedImageModel)
    && JSON.stringify(currentImageGenerationModel) === JSON.stringify(expectedImageGenerationModel)
    && JSON.stringify(currentPdfModel) === JSON.stringify(expectedPdfModel)
    && currentPdfMaxBytesMb === expectedPdfMaxBytesMb
    && currentPdfMaxPages === expectedPdfMaxPages
    && JSON.stringify(currentSummarize) === JSON.stringify(expectedSummarize)
    && JSON.stringify(currentSubagents) === JSON.stringify(expectedSubagents)
    && JSON.stringify(currentMemorySearch) === JSON.stringify(expectedMemorySearch);
}

function normalizeProviderEditorData(provider) {
  const source = provider && typeof provider === "object" && !Array.isArray(provider) ? provider : {};
  const modelsValue = Object.prototype.hasOwnProperty.call(source, "models") ? source.models : [];

  return {
    baseUrl:
      (typeof source.baseUrl === "string" && source.baseUrl) ||
      (typeof source.baseURL === "string" && source.baseURL) ||
      (typeof source.url === "string" && source.url) ||
      "",
    apiKey: (typeof source.apiKey === "string" && source.apiKey) || "",
    apiType:
      normalizeProviderApiKind(source.api || source.apiType || source.type || ""),
    modelRows: normalizeProviderModels(modelsValue)
  };
}

const LEGACY_PROVIDER_API_KIND_MAP = {
  openai: "openai-completions",
  custom: "openai-completions",
  "azure-openai": "openai-completions",
  anthropic: "anthropic-messages",
  gemini: "google-generative-ai",
  google: "google-generative-ai"
};

const PROVIDER_API_OPTIONS = [
  { value: "openai-completions", label: "OpenAI Compatible / Completions" },
  { value: "openai-responses", label: "OpenAI Responses" },
  { value: "openai-codex-responses", label: "OpenAI Codex Responses" },
  { value: "anthropic-messages", label: "Anthropic Messages" },
  { value: "google-generative-ai", label: "Google Generative AI" },
  { value: "ollama", label: "Ollama" },
  { value: "github-copilot", label: "GitHub Copilot" },
  { value: "bedrock-converse-stream", label: "AWS Bedrock Converse" }
];

function normalizeProviderApiKind(value, fallback = "openai-completions") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  const normalized = raw.toLowerCase();
  return LEGACY_PROVIDER_API_KIND_MAP[normalized] || normalized;
}

function getProviderBrandKind(value) {
  const normalized = normalizeProviderApiKind(value, "openai-completions");
  if (
    normalized === "openai-completions"
    || normalized === "openai-responses"
    || normalized === "openai-codex-responses"
  ) {
    return "openai";
  }
  if (normalized === "anthropic-messages") return "anthropic";
  if (normalized === "google-generative-ai") return "google";
  if (normalized === "ollama") return "ollama";
  return normalized;
}

function normalizeProviderModelRow(entry, fallbackId = "") {
  if (typeof entry === "string") {
    return {
      id: entry,
      contextWindow: "",
      reasoning: false,
      input: "",
      extras: {}
    };
  }

  const source = entry && typeof entry === "object" && !Array.isArray(entry) ? cloneProviderConfig(entry) : {};
  const id =
    (typeof source.id === "string" && source.id) ||
    (typeof source.model === "string" && source.model) ||
    fallbackId ||
    "";

  let contextWindow = "";
  if (source.contextWindow !== null && source.contextWindow !== undefined && source.contextWindow !== "") {
    const parsedWindow = Number(source.contextWindow);
    if (Number.isFinite(parsedWindow) && parsedWindow > 0) {
      contextWindow = String(Math.trunc(parsedWindow));
    }
  }

  const reasoning = source.reasoning === true;
  const input = Array.isArray(source.input)
    ? source.input.map((value) => String(value).trim()).filter(Boolean).join(", ")
    : "";

  delete source.id;
  delete source.model;
  delete source.contextWindow;
  delete source.reasoning;
  delete source.input;

  return {
    id,
    contextWindow,
    reasoning,
    input,
    extras: source
  };
}

// 常用提供商 SVG Icon (来自 simple-icons 白底版本) 及统一默认黑金质感配色
const DEFAULT_BRAND_COLOR = "#a3a8b4";

const SVG_ICONS = {
  openai: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0462 6.0462 0 0 0 5.45-3.1818 5.9847 5.9847 0 0 0 3.998-2.9 6.0462 6.0462 0 0 0-.426-7.0971zM14.224 22.7508a4.4256 4.4256 0 0 1-2.876-1.04l.1417-.08v-7.625l-2.0916-1.205v-5.91l4.8258 2.7668v13.1118zM6.9234 19.9822a4.4256 4.4256 0 0 1-.5157-3.0248l.1417.08 6.6415 3.823 2.0911 1.205-3.0247 5.234a4.4256 4.4256 0 0 1-5.3339-7.3172zm-4.3228-5.3217a4.4256 4.4256 0 0 1 2.3603-1.9848v7.625l2.0916 1.205 2.8851-4.9975-4.8256-2.7668v-12.193a4.4256 4.4256 0 0 1-2.5114 13.1121zm1.7513-10.02a4.4256 4.4256 0 0 1 2.876 1.04l-.1417.08v7.625L5.0041 12.001A4.4256 4.4256 0 0 1 9.778 2.6405zm10.4252.1815a4.4256 4.4256 0 0 1 .5157 3.0248l-.1417-.08-6.6415-3.823-2.0911-1.205 3.0247-5.234a4.4256 4.4256 0 0 1 5.3339 7.3172zm4.3228 5.3217a4.4256 4.4256 0 0 1-2.3603 1.9848v-7.625l-2.0916-1.205-2.8851 4.9975 4.8256 2.7668v12.193a4.4256 4.4256 0 0 1 2.5114-13.1121z"/></svg>`,
  anthropic: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 3L11.8 13.3L8 6H6.1L10.8 14.5L9.6 16.7L1.8 2.6H0L8.7 18.2L9.6 19.8L20 1H17.5M16.9 11.2L12.7 18.8H18L22.2 11.2H16.9Z"/></svg>`,
  google: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>`
};

const PROVIDER_BRANDS = {
  openai: { color: DEFAULT_BRAND_COLOR, isSvg: true, icon: SVG_ICONS.openai, name: "OpenAI" },
  anthropic: { color: DEFAULT_BRAND_COLOR, isSvg: true, icon: SVG_ICONS.anthropic, name: "Anthropic" },
  google: { color: DEFAULT_BRAND_COLOR, isSvg: true, icon: SVG_ICONS.google, name: "Google" },
  gemini: { color: DEFAULT_BRAND_COLOR, isSvg: true, icon: SVG_ICONS.google, name: "Gemini" },
  deepseek: { color: DEFAULT_BRAND_COLOR, isSvg: false, icon: "fa-solid fa-wave-square", name: "DeepSeek" },
  openrouter: { color: DEFAULT_BRAND_COLOR, isSvg: false, icon: "fa-solid fa-route", name: "OpenRouter" },
  qwen: { color: DEFAULT_BRAND_COLOR, isSvg: false, icon: "fa-solid fa-brain", name: "Qwen" },
  ollama: { color: DEFAULT_BRAND_COLOR, isSvg: false, icon: "fa-brands fa-kickstarter-k", name: "Ollama" },
  siliconflow: { color: DEFAULT_BRAND_COLOR, isSvg: false, icon: "fa-solid fa-microchip", name: "SiliconFlow" },
  custom: { color: DEFAULT_BRAND_COLOR, isSvg: false, icon: "fa-solid fa-server", name: "提供商" }
};

function getProviderBrand(key, rawType) {
  const typeKey = getProviderBrandKind(rawType);
  const k = (key || "").toLowerCase();

  // 1. 优先尝试直接名称包含的品牌匹配（因为 key 通常是用户的命名，具有直接指导意义）
  for (const [brandKey, bObj] of Object.entries(PROVIDER_BRANDS)) {
    if (brandKey !== 'custom' && k.includes(brandKey)) {
      return { ...bObj };
    }
  }

  // 2. 如果名称没匹配上，再看他的底层驱动引擎是否为已知的官方大厂（但必须排除 openai，因为许多第三方 API 中转站也用 openai 类型）
  if (typeKey && typeKey !== 'openai' && PROVIDER_BRANDS[typeKey]) {
    return { ...PROVIDER_BRANDS[typeKey] };
  }

  // 完全抹去自定义商和 newapi 的越权显示，全面统一为默认的黑灰金质感 + `fa-server` 图标
  return { ...PROVIDER_BRANDS.custom };
}

function normalizeProviderModels(modelsValue, ensureOne = true) {
  const rows = [];

  if (Array.isArray(modelsValue)) {
    for (const item of modelsValue) {
      rows.push(normalizeProviderModelRow(item));
    }
  } else if (modelsValue && typeof modelsValue === "object") {
    for (const [key, value] of Object.entries(modelsValue)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const objectValue = cloneProviderConfig(value);
        if (!objectValue.id && !objectValue.model) objectValue.id = key;
        rows.push(normalizeProviderModelRow(objectValue, key));
      } else {
        rows.push(normalizeProviderModelRow(key, key));
      }
    }
  }

  if (ensureOne && rows.length === 0) rows.push(normalizeProviderModelRow(""));
  return rows;
}

function providerModelRowTemplate(rowData = {}) {
  const row = {
    id: rowData.id || "",
    contextWindow: rowData.contextWindow || "",
    reasoning: rowData.reasoning === true,
    input: rowData.input || "",
    extras: rowData.extras && typeof rowData.extras === "object" && !Array.isArray(rowData.extras) ? rowData.extras : {},
    allowlisted: rowData.allowlisted !== false,
    isDefaultModel: rowData.isDefaultModel === true
  };

  const uniqueId = "reasoning-" + Math.random().toString(36).substring(2, 9);
  const allowlistId = "allowlist-" + Math.random().toString(36).substring(2, 9);
  const defaultId = "default-model-" + Math.random().toString(36).substring(2, 9);

  return `
    <div class="provider-model-row" data-provider-model-row>
      <div class="provider-model-fields">
        <label class="provider-model-field">
          <span class="provider-model-field-label">模型 ID</span>
          <input type="text" class="provider-model-id form-control-mono" placeholder="如 gpt-4o-mini" value="${escapeHtml(row.id)}" spellcheck="false" />
        </label>
        <label class="provider-model-field">
          <span class="provider-model-field-label">上下文窗口</span>
          <input type="number" min="1" step="1" class="provider-model-context" placeholder="可留空" value="${escapeHtml(row.contextWindow)}" />
        </label>
        <label class="provider-model-field provider-model-field-wide">
          <span class="provider-model-field-label">输入类型</span>
          <input type="text" class="provider-model-input" placeholder="逗号分隔，可留空" value="${escapeHtml(row.input)}" spellcheck="false" />
        </label>
        <button type="button" class="provider-model-remove danger-action-btn btn-danger" data-provider-model-remove title="移除模型" aria-label="移除模型">
          <i class="fa-solid fa-minus"></i>
        </button>
      </div>
      <div class="provider-model-options" role="group" aria-label="模型策略">
        <span class="provider-model-options-label">策略</span>
        <div class="provider-model-options-list">
          <label class="provider-model-option" for="${uniqueId}">
            <input type="checkbox" id="${uniqueId}" class="provider-model-reasoning-toggle" ${row.reasoning ? "checked" : ""} />
            <span>推理模式</span>
          </label>
          <label class="provider-model-option" for="${allowlistId}">
            <input type="checkbox" id="${allowlistId}" class="provider-model-allowlist-toggle" ${row.allowlisted ? "checked" : ""} />
            <span>允许 Agent 使用</span>
          </label>
          <label class="provider-model-option provider-model-option-default" for="${defaultId}">
            <input type="radio" id="${defaultId}" name="provider-default-model" class="provider-model-default-toggle" ${row.isDefaultModel ? "checked" : ""} />
            <span>设为默认</span>
            <span class="provider-model-option-hint">单选</span>
          </label>
        </div>
      </div>
      <input type="hidden" class="provider-model-extras" value="${escapeHtml(JSON.stringify(row.extras))}" />
    </div>
  `;
}

function providerCardTemplate(providerKey = "", provider = {}, originalKey = "") {
  const info = normalizeProviderEditorData(provider);
  const apiTypeOptions = PROVIDER_API_OPTIONS.slice();
  if (info.apiType && !apiTypeOptions.some((option) => option.value === info.apiType)) {
    apiTypeOptions.unshift({ value: info.apiType, label: info.apiType });
  }
  const optionsHtml = apiTypeOptions
    .map((option) => `<option value="${option.value}"${option.value === info.apiType ? " selected" : ""}>${option.label}</option>`)
    .join("");
  const modelRowsHtml = info.modelRows
    .map((row) => {
      const modelRef = buildProviderModelRef(providerKey, row.id);
      return providerModelRowTemplate({
        ...row,
        allowlisted: modelRef ? (isAllowlistedModelRef(modelRef) || isDefaultModelRef(modelRef)) : row.allowlisted !== false,
        isDefaultModel: modelRef ? isDefaultModelRef(modelRef) : row.isDefaultModel === true
      });
    })
    .join("");

  const providerFullConfig = cloneProviderConfig(provider);
  const initialJsonStr = Object.keys(providerFullConfig).length > 0
    ? JSON.stringify(providerFullConfig, null, 2)
    : JSON.stringify({ baseUrl: "", apiKey: "", api: info.apiType || "openai-completions", models: [] }, null, 2);
  const isRedactedApiKey = info.apiKey === REDACTED_API_KEY_TOKEN;

  const brand = getProviderBrand(providerKey, info.apiType);
  const iconHTML = brand.isSvg ? brand.icon : `<i class="${brand.icon}"></i>`;

  return `
    <article class="provider-edit-card" data-provider-card data-original-key="${escapeHtml(originalKey)}">
      <div class="provider-card-head provider-card-head-spacious">
        <div class="provider-card-title"><span class="provider-card-title-icon">${iconHTML}</span><span class="provider-card-title-strong">当前 Provider 配置</span></div>
      </div>
      <div class="provider-card-grid">
        <div class="config-row">
          <label>Provider Key (唯一标识)</label>
          <input type="text" class="provider-key skeuo-input form-control-mono" placeholder="如 openrouter" value="${escapeHtml(providerKey)}" spellcheck="false" />
        </div>

        <div class="config-row">
          <label>Base URL</label>
          <input type="text" class="provider-base-url skeuo-input form-control-mono" placeholder="https://openrouter.ai/api/v1 (可为空)" value="${escapeHtml(info.baseUrl)}" spellcheck="false" />
        </div>

        <div class="config-row">
          <label>API Key</label>
          <div class="provider-secret-wrap">
            <input type="password" class="provider-api-key skeuo-input" placeholder="${isRedactedApiKey ? "检测到脱敏密钥（不修改可保持原样）" : "sk-..."}" autocomplete="off" value="${escapeHtml(info.apiKey)}" />
            <button type="button" class="provider-secret-toggle" data-secret-toggle aria-label="显示 API Key" title="显示 API Key">
              <i class="fa-regular fa-eye"></i>
            </button>
          </div>
          ${isRedactedApiKey ? '<small class="form-hint">当前显示的是脱敏占位符。保持不变会沿用旧密钥，输入新值可覆盖。</small>' : ""}
        </div>

        <div class="config-row">
          <label>API Adapter</label>
          <select class="provider-api-type skeuo-input">${optionsHtml}</select>
        </div>
        
        <div class="config-row provider-models-row">
          <label>包含的模型列表</label>
          <div class="provider-model-list">${modelRowsHtml}</div>
          <button type="button" class="provider-model-add panel-action-btn btn-secondary btn-block btn-dashed btn-mt-sm" data-provider-model-add>
            <i class="fa-solid fa-plus"></i> 追加一个模型
          </button>
          <small class="form-hint">勾选“允许 Agent 使用”会把该模型加入白名单；勾选“设为默认”会同时更新全局默认主模型。</small>
        </div>

        <div class="config-row provider-json-row">
          <label class="provider-json-label">
            <span>当前 Provider 完整配置 (JSON)</span>
            <span class="provider-json-actions">
              <button type="button" class="panel-action-btn btn-secondary btn-size-xs provider-json-apply" data-provider-json-apply>
                <i class="fa-solid fa-wand-magic-sparkles"></i> 回填表单
              </button>
              <span class="provider-json-error json-error-text is-hidden"><i class="fa-solid fa-triangle-exclamation"></i> 格式异常</span>
            </span>
          </label>
          <textarea class="provider-json-config skeuo-textarea" placeholder="{\n  &quot;baseUrl&quot;: &quot;https://example.com/v1&quot;,\n  &quot;apiKey&quot;: &quot;sk-...&quot;,\n  &quot;api&quot;: &quot;openai-completions&quot;,\n  &quot;models&quot;: []\n}">${escapeHtml(initialJsonStr)}</textarea>
          <small class="form-hint">上方表单会自动同步到此 JSON；你也可以直接修改后点击“回填表单”。</small>
        </div>
      </div>
    </article>
  `;
}

function appendProviderModelRow(targetList, rowData = {}) {
  if (!targetList) return;
  targetList.insertAdjacentHTML("beforeend", providerModelRowTemplate(rowData));
}

function renderProviderEditor(providerKey = "", provider = {}, originalKey = "") {
  const container = $("models-providers-editor");
  if (!container) return;

  container.innerHTML = providerCardTemplate(providerKey, provider, originalKey);
}

function getProviderModelRows(provider) {
  const rows = normalizeProviderModels(provider?.models, false);
  return rows.filter((row) => row.id);
}

function getManagedDedicatedModelDraft(modelKey) {
  switch (modelKey) {
    case "summarizeModel":
      return cloneAgentModelConfig(state.modelsAdvancedDrafts.summarize?.model);
    case "subagentsModel":
      return cloneAgentModelConfig(state.modelsAdvancedDrafts.subagents?.model);
    default:
      return cloneAgentModelConfig(state.modelsAdvancedDrafts[modelKey]);
  }
}

function renderSelectOptions(options, currentValue = "") {
  const normalizedCurrent = toTrimmedString(currentValue);
  const entries = Array.isArray(options) ? options.slice() : [];
  if (normalizedCurrent && !entries.some((option) => option.value === normalizedCurrent)) {
    entries.unshift({ value: normalizedCurrent, label: normalizedCurrent });
  }
  return entries
    .map((option) => `<option value="${escapeHtml(option.value)}"${option.value === normalizedCurrent ? " selected" : ""}>${escapeHtml(option.label)}</option>`)
    .join("");
}

function getKnownModelRefs() {
  const refs = new Set();
  for (const [providerKey, provider] of Object.entries(state.modelProvidersDraft || {})) {
    for (const ref of getProviderModelRefs(providerKey, provider)) refs.add(ref);
  }
  for (const ref of Object.keys(state.agentsDefaultsModelsDraft || {})) refs.add(ref);
  for (const ref of listAgentModelRefs(state.agentsDefaultModelDraft)) refs.add(ref);
  for (const ref of listAgentModelRefs(state.modelsAdvancedDrafts.imageModel)) refs.add(ref);
  for (const ref of listAgentModelRefs(state.modelsAdvancedDrafts.imageGenerationModel)) refs.add(ref);
  for (const ref of listAgentModelRefs(state.modelsAdvancedDrafts.pdfModel)) refs.add(ref);
  for (const ref of listAgentModelRefs(state.modelsAdvancedDrafts.summarize?.model)) refs.add(ref);
  for (const ref of listAgentModelRefs(state.modelsAdvancedDrafts.subagents?.model)) refs.add(ref);
  return Array.from(refs).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function renderModelRefDatalist() {
  const datalist = $("models-ref-options");
  if (!datalist) return;
  datalist.innerHTML = getKnownModelRefs()
    .map((item) => `<option value="${escapeHtml(item)}"></option>`)
    .join("");
}

function dedicatedModelFallbackRowTemplate(modelKey, value = "", index = 0) {
  return `
    <div class="models-agent-model-row" data-agent-model-row="${escapeHtml(modelKey)}">
      <div class="config-row">
        <label>备选模型 ${index + 1}</label>
        <input
          type="text"
          class="skeuo-input form-control-mono models-agent-model-fallback"
          data-agent-model-fallback="${escapeHtml(modelKey)}"
          list="models-ref-options"
          placeholder="如 openai/gpt-4.1-mini"
          value="${escapeHtml(value)}"
          spellcheck="false"
        />
      </div>
      <button
        type="button"
        class="panel-action-btn btn-secondary btn-size-xs models-agent-model-remove"
        data-agent-model-remove-fallback="${escapeHtml(modelKey)}"
        aria-label="删除备选模型"
      >
        <i class="fa-regular fa-trash-can"></i>
      </button>
    </div>
  `;
}

function renderDedicatedModelEditor(modelKey, value) {
  const normalized = cloneAgentModelConfig(value);
  const fallbacks = Array.isArray(normalized?.fallbacks) ? normalized.fallbacks : [];
  return `
    <div class="models-agent-model-editor" data-agent-model-editor="${escapeHtml(modelKey)}">
      <div class="config-row">
        <label>主模型</label>
        <input
          type="text"
          class="skeuo-input form-control-mono models-agent-model-primary"
          data-agent-model-primary="${escapeHtml(modelKey)}"
          list="models-ref-options"
          placeholder="如 anthropic/claude-opus-4-6"
          value="${escapeHtml(normalized?.primary || "")}"
          spellcheck="false"
        />
        <small class="form-hint">留空表示不覆盖当前网关默认值；填写时建议使用 <code>provider/model</code> 形式。</small>
      </div>
      <div class="models-agent-model-fallbacks" data-agent-model-fallback-list="${escapeHtml(modelKey)}">
        ${fallbacks.map((item, index) => dedicatedModelFallbackRowTemplate(modelKey, item, index)).join("")}
      </div>
      <button
        type="button"
        class="panel-action-btn btn-secondary btn-block btn-dashed models-agent-model-add"
        data-agent-model-add-fallback="${escapeHtml(modelKey)}"
      >
        <i class="fa-solid fa-plus"></i> 添加备选模型
      </button>
    </div>
  `;
}

function getMemorySearchFormState(value = state.modelsAdvancedDrafts.memorySearch) {
  const source = cloneMemorySearchConfig(value) || {};
  const remote = cloneOptionalConfigObject(source.remote) || {};
  const provider = toTrimmedString(source.provider);
  return {
    enabled: source.enabled === true,
    provider: provider === "auto" ? "" : provider,
    model: toTrimmedString(source.model),
    baseUrl: toTrimmedString(remote.baseUrl),
    apiKey: toTrimmedString(remote.apiKey),
    fallback: toTrimmedString(source.fallback)
  };
}

function countConfiguredDedicatedModels() {
  let count = 0;
  for (const item of DEDICATED_MODEL_FIELDS) {
    const value = getManagedDedicatedModelDraft(item.key);
    if (value && (value.primary || (Array.isArray(value.fallbacks) && value.fallbacks.length > 0))) {
      count += 1;
    }
  }
  return count;
}

function renderModelsAdvancedSummary() {
  const configuredDedicated = countConfiguredDedicatedModels();
  const memoryInfo = getMemorySearchFormState();
  const memoryStatus = memoryInfo.enabled ? "已启用" : "未启用";
  const memoryLabel = memoryInfo.provider || "自动选择";
  const primaryRefs = [
    getManagedDedicatedModelDraft("imageModel")?.primary,
    getManagedDedicatedModelDraft("pdfModel")?.primary,
    getManagedDedicatedModelDraft("subagentsModel")?.primary
  ].map((item) => toTrimmedString(item)).filter(Boolean);

  return `
    <button
      type="button"
      class="models-advanced-summary"
      data-models-advanced-toggle
      aria-expanded="${state.modelsAdvancedExpanded ? "true" : "false"}"
    >
      <span class="models-advanced-summary-icon">
        <i class="fa-solid fa-sliders"></i>
      </span>
      <span class="models-advanced-summary-main">
        <span class="models-advanced-summary-title">高级模型与记忆配置</span>
        <span class="models-advanced-summary-copy">图像、PDF、摘要、子代理和 Embedding 的统一入口。默认收起，只在你要精调时展开。</span>
      </span>
      <span class="models-advanced-summary-meta">
        <span class="status-badge dynamic">专用模型 ${configuredDedicated}/5</span>
        <span class="status-badge ${memoryInfo.enabled ? "ok" : "dynamic"}">记忆搜索 ${memoryStatus}</span>
        <span class="models-advanced-summary-inline">
          <span class="models-advanced-summary-inline-label">Embedding</span>
          <code class="models-advanced-summary-inline-code">${escapeHtml(memoryLabel)}</code>
        </span>
        ${primaryRefs[0] ? `<span class="models-advanced-summary-inline">
          <span class="models-advanced-summary-inline-label">代表模型</span>
          <code class="models-advanced-summary-inline-code">${escapeHtml(primaryRefs[0])}</code>
        </span>` : ""}
      </span>
      <i class="fa-solid fa-chevron-down models-advanced-summary-chevron"></i>
    </button>
  `;
}

const ADVANCED_CONFIG_CHIP_DEFS = [
  { key: "imageModel",            icon: "fa-eye",                  title: "图像理解" },
  { key: "imageGenerationModel",  icon: "fa-wand-magic-sparkles",  title: "图像生成" },
  { key: "pdfModel",              icon: "fa-file-pdf",             title: "PDF 处理" },
  { key: "summarizeModel",        icon: "fa-compress",             title: "摘要模型" },
  { key: "subagentsModel",        icon: "fa-microchip",            title: "子代理" },
  { key: "memorySearch",          icon: "fa-brain",                title: "记忆搜索" }
];

function renderAdvancedConfigChip(def) {
  let valueHtml = "";
  if (def.key === "memorySearch") {
    const info = getMemorySearchFormState();
    const badgeClass = info.enabled ? "adv-config-chip-badge ok" : "adv-config-chip-badge muted";
    const badgeLabel = info.enabled ? "已启用" : "未启用";
    const providerLabel = info.provider || "自动";
    valueHtml = `
      <div class="adv-config-chip-value">
        <span class="${badgeClass}">${badgeLabel}</span>
        <span class="adv-config-chip-tag muted">${escapeHtml(providerLabel)}</span>
      </div>`;
  } else {
    const draft = getManagedDedicatedModelDraft(def.key);
    const primary = toTrimmedString(draft?.primary);
    if (primary) {
      valueHtml = `<div class="adv-config-chip-value"><span class="adv-config-chip-tag">${escapeHtml(primary)}</span></div>`;
    } else {
      valueHtml = `<div class="adv-config-chip-value"><span class="adv-config-chip-tag muted">未配置</span></div>`;
    }
  }
  return `
    <button
      type="button"
      class="adv-config-chip"
      data-advanced-config-card="${escapeHtml(def.key)}"
      aria-label="配置 ${escapeHtml(def.title)}"
    >
      <div class="adv-config-chip-icon">
        <i class="fa-solid ${def.icon}"></i>
      </div>
      <div class="adv-config-chip-title">${escapeHtml(def.title)}</div>
      ${valueHtml}
    </button>`;
}

function renderAdvancedConfigGrid() {
  return `<div class="adv-config-grid">${ADVANCED_CONFIG_CHIP_DEFS.map(renderAdvancedConfigChip).join("")}</div>`;
}

function renderModelsAdvancedDetail() {
  if (!state.modelsAdvancedExpanded) return "";
  return `
    <div class="models-advanced-detail" data-models-advanced-detail>
      <div class="models-config-section-divider">
        <span class="models-config-section-divider-label">专用模型 &amp; 记忆</span>
        <span class="models-config-section-divider-line"></span>
      </div>
      ${renderAdvancedConfigGrid()}
    </div>
  `;
}

function renderAdvancedConfigModalContent(configKey) {
  const def = ADVANCED_CONFIG_CHIP_DEFS.find((d) => d.key === configKey);
  if (!def) return "";

  if (configKey === "memorySearch") {
    return renderMemorySearchModalBody();
  }

  const dedicatedDef = DEDICATED_MODEL_FIELDS.find((d) => d.key === configKey);
  const draft = getManagedDedicatedModelDraft(configKey);
  let extraFieldsHtml = "";

  if (configKey === "pdfModel") {
    extraFieldsHtml = `
      <div class="models-sheet-inline-pair">
        <div class="config-row">
          <label>PDF 大小上限 (MB)</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            class="skeuo-input models-inline-number"
            data-pdf-max-bytes
            placeholder="如 20"
            value="${escapeHtml(state.modelsAdvancedDrafts.pdfMaxBytesMb ?? "")}"
          />
        </div>
        <div class="config-row">
          <label>PDF 最大页数</label>
          <input
            type="number"
            min="1"
            step="1"
            class="skeuo-input models-inline-number"
            data-pdf-max-pages
            placeholder="如 60"
            value="${escapeHtml(state.modelsAdvancedDrafts.pdfMaxPages ?? "")}"
          />
        </div>
      </div>`;
  } else if (configKey === "summarizeModel") {
    extraFieldsHtml = `
      <div class="config-row">
        <label>摘要超时 (秒)</label>
        <input
          type="number"
          min="1"
          step="1"
          class="skeuo-input models-inline-number"
          data-summarize-timeout
          placeholder="如 30"
          value="${escapeHtml(state.modelsAdvancedDrafts.summarize?.timeoutSeconds ?? "")}"
        />
      </div>`;
  } else if (configKey === "subagentsModel") {
    extraFieldsHtml = `
      <div class="config-row">
        <label>子代理思考强度</label>
        <select class="skeuo-input" data-subagents-thinking>
          ${renderSelectOptions(SUBAGENT_THINKING_OPTIONS, state.modelsAdvancedDrafts.subagents?.thinking || "")}
        </select>
      </div>`;
  }

  const hintHtml = dedicatedDef
    ? `<p class="form-hint" style="margin:0 0 18px;">${escapeHtml(dedicatedDef.hint)}</p>`
    : "";

  return `
    ${hintHtml}
    ${renderDedicatedModelEditor(configKey, draft)}
    ${extraFieldsHtml}`;
}

function renderMemorySearchModalBody() {
  const info = getMemorySearchFormState();
  const isRedactedApiKey = info.apiKey === REDACTED_API_KEY_TOKEN;
  return `
    <div class="models-memory-toggle-strip">
      <label class="models-toggle-row">
        <input type="checkbox" data-memory-search-enabled ${info.enabled ? "checked" : ""} />
        <span>启用记忆搜索</span>
      </label>
      <p class="models-memory-toggle-copy">关闭时不会主动清空高级配置；再次启用后仍会沿用当前记忆检索设置。</p>
    </div>
    <div class="models-memory-inner-row">
      <div class="models-memory-inner-label">Embedding Provider 与模型</div>
      <p class="models-memory-inner-hint">优先保持留空自动，只有当你需要固定到某个 embedding 通道时再手动指定。</p>
      <div class="models-sheet-inline-pair">
        <div class="config-row">
          <label>Embedding Provider</label>
          <select class="skeuo-input" data-memory-search-provider>
            ${renderSelectOptions(MEMORY_SEARCH_PROVIDER_OPTIONS, info.provider)}
          </select>
          <small class="form-hint">留空时网关会按当前环境自动选择可用的 embedding provider。</small>
        </div>
        <div class="config-row">
          <label>Embedding 模型</label>
          <input
            type="text"
            class="skeuo-input form-control-mono"
            data-memory-search-model
            placeholder="如 text-embedding-3-small"
            value="${escapeHtml(info.model)}"
            spellcheck="false"
          />
        </div>
      </div>
    </div>
    <div class="models-memory-inner-row">
      <div class="models-memory-inner-label">远程端点与凭证</div>
      <p class="models-memory-inner-hint">只有在 embedding 流量需要走自建代理或使用不同凭证时，才建议覆盖。</p>
      <div class="config-row">
        <label>API 端点</label>
        <input
          type="text"
          class="skeuo-input form-control-mono"
          data-memory-search-base-url
          placeholder="https://example.com/v1 (可为空)"
          value="${escapeHtml(info.baseUrl)}"
          spellcheck="false"
        />
      </div>
      <div class="config-row">
        <label>API Key</label>
        <div class="provider-secret-wrap">
          <input
            type="password"
            class="provider-api-key skeuo-input models-memory-api-key"
            data-memory-search-api-key
            placeholder="${isRedactedApiKey ? "检测到脱敏密钥（不修改可保持原样）" : "sk-..."}"
            autocomplete="off"
            value="${escapeHtml(info.apiKey)}"
          />
          <button
            type="button"
            class="provider-secret-toggle"
            data-memory-secret-toggle
            aria-label="显示 Embedding API Key"
            title="显示 Embedding API Key"
          >
            <i class="fa-regular fa-eye"></i>
          </button>
        </div>
        ${isRedactedApiKey ? '<small class="form-hint">当前显示的是脱敏占位符。保持不变会沿用旧密钥，输入新值可覆盖。</small>' : '<small class="form-hint">仅在记忆搜索需要独立凭证时填写；否则保持为空，沿用全局环境变量。</small>'}
      </div>
    </div>
    <div class="models-memory-inner-row">
      <div class="models-memory-inner-label">失败回退策略</div>
      <p class="models-memory-inner-hint">默认保守策略是 <code>none</code>。只有你明确希望 embedding 调用在主 provider 出错时自动切换，才需要配置。</p>
      <div class="config-row">
        <label>失败回退 Provider</label>
        <select class="skeuo-input" data-memory-search-fallback>
          ${renderSelectOptions(MEMORY_SEARCH_FALLBACK_OPTIONS, info.fallback)}
        </select>
        <small class="form-hint">默认是 <code>none</code>；只有在你希望 embedding 调用自动切换时才建议显式配置。</small>
      </div>
    </div>`;
}

function openAdvancedConfigModal(configKey) {
  const def = ADVANCED_CONFIG_CHIP_DEFS.find((d) => d.key === configKey);
  if (!def) return;

  const modal = $("models-config-modal");
  if (!modal) return;

  const titleEl = $("config-modal-title");
  const subtitleEl = $("config-modal-subtitle");
  const bodyEl = $("config-modal-body");

  if (titleEl) titleEl.textContent = def.title;
  if (subtitleEl) {
    const dedicatedDef = DEDICATED_MODEL_FIELDS.find((d) => d.key === configKey);
    subtitleEl.textContent = configKey === "memorySearch"
      ? "配置 agents.defaults.memorySearch — 控制 Embedding Provider 与记忆检索行为"
      : (dedicatedDef?.hint || "");
  }
  if (bodyEl) bodyEl.innerHTML = renderAdvancedConfigModalContent(configKey);

  modal.setAttribute("data-config-modal-key", configKey);
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("show");
  document.body.classList.add("provider-modal-open");
  state.configModalDirty = false;

  captureModalFocus("models-config-modal", {
    initialSelector: "#config-modal-body input, #config-modal-body select, #config-modal-body textarea"
  });
}

async function closeAdvancedConfigModal({ force = false } = {}) {
  const modal = $("models-config-modal");
  if (!modal) return;

  if (!force && state.configModalDirty) {
    const shouldClose = await requestConfirmDialog({
      title: "有未保存的修改",
      message: "当前配置已修改，关闭后修改会保留在草稿中。点击顶部「保存并应用」后生效。确定关闭？",
      confirmText: "关闭",
      cancelText: "继续编辑",
      variant: "primary"
    });
    if (!shouldClose) return;
  }

  // sync draft state from modal DOM before closing
  state.modelsAdvancedDrafts = buildModelsAdvancedDraftsFromDom();

  const wasDirty = state.configModalDirty;
  state.configModalDirty = false;

  releaseModalFocus("models-config-modal");

  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  modal.removeAttribute("data-config-modal-key");
  document.body.classList.remove("provider-modal-open");

  // re-render grid chips to reflect updated values
  const detail = document.querySelector("[data-models-advanced-detail]");
  const gridContainer = detail?.querySelector(".adv-config-grid");
  if (gridContainer) {
    const newGrid = document.createElement("div");
    newGrid.innerHTML = renderAdvancedConfigGrid();
    gridContainer.replaceWith(newGrid.firstElementChild);
  } else {
    renderModelsAdvancedPanels();
  }

  if (wasDirty) {
    showToast("配置已修改，点击顶部「保存并应用」后生效", "success");
  }
}

function mergeManagedConfigFields(base, managedEntries) {
  const source = cloneOptionalConfigObject(base) || {};
  for (const key of Object.keys(managedEntries || {})) {
    delete source[key];
  }
  for (const [key, value] of Object.entries(managedEntries || {})) {
    if (value === null || value === undefined || value === "") continue;
    source[key] = value;
  }
  return Object.keys(source).length > 0 ? source : null;
}

function buildMemorySearchDraft(base, managed) {
  const source = cloneOptionalConfigObject(base) || {};
  const remote = source.remote && typeof source.remote === "object" && !Array.isArray(source.remote)
    ? cloneProviderConfig(source.remote)
    : {};
  delete source.enabled;
  delete source.provider;
  delete source.model;
  delete source.fallback;
  delete source.remote;
  delete remote.baseUrl;
  delete remote.apiKey;

  const provider = toTrimmedString(managed?.provider);
  const model = toTrimmedString(managed?.model);
  const baseUrl = toTrimmedString(managed?.baseUrl);
  const apiKey = toTrimmedString(managed?.apiKey);
  const fallback = toTrimmedString(managed?.fallback);
  const shouldMaterialize = Boolean(
    managed?.enabled
    || provider
    || model
    || baseUrl
    || apiKey
    || fallback
    || Object.keys(source).length > 0
    || Object.keys(remote).length > 0
  );

  if (!shouldMaterialize) return null;

  source.enabled = managed?.enabled === true;
  if (provider && provider !== "auto") source.provider = provider;
  if (model) source.model = model;
  if (fallback) source.fallback = fallback;
  if (baseUrl) remote.baseUrl = baseUrl;
  if (apiKey && apiKey !== REDACTED_API_KEY_TOKEN) {
    remote.apiKey = apiKey;
  }
  if (Object.keys(remote).length > 0) {
    source.remote = remote;
  }
  return Object.keys(source).length > 0 ? source : null;
}

function readDedicatedModelDraftFromDom(modelKey) {
  const root = document.querySelector(`[data-agent-model-editor="${modelKey}"]`);
  if (!root) return getManagedDedicatedModelDraft(modelKey);
  const primary = root.querySelector(`[data-agent-model-primary="${modelKey}"]`)?.value.trim() || "";
  const fallbacks = Array.from(root.querySelectorAll(`[data-agent-model-fallback="${modelKey}"]`))
    .map((input) => input.value.trim())
    .filter(Boolean);
  return cloneAgentModelConfig({ primary, fallbacks });
}

function buildModelsAdvancedDraftsFromDom() {
  return {
    imageModel: readDedicatedModelDraftFromDom("imageModel"),
    imageGenerationModel: readDedicatedModelDraftFromDom("imageGenerationModel"),
    pdfModel: readDedicatedModelDraftFromDom("pdfModel"),
    pdfMaxBytesMb: normalizeOptionalPositiveNumber(document.querySelector("[data-pdf-max-bytes]")?.value),
    pdfMaxPages: normalizeOptionalPositiveInteger(document.querySelector("[data-pdf-max-pages]")?.value),
    summarize: mergeManagedConfigFields(state.modelsAdvancedDrafts.summarize, {
      model: readDedicatedModelDraftFromDom("summarizeModel"),
      timeoutSeconds: normalizeOptionalPositiveInteger(document.querySelector("[data-summarize-timeout]")?.value)
    }),
    subagents: mergeManagedConfigFields(state.modelsAdvancedDrafts.subagents, {
      model: readDedicatedModelDraftFromDom("subagentsModel"),
      thinking: toTrimmedString(document.querySelector("[data-subagents-thinking]")?.value)
    }),
    memorySearch: buildMemorySearchDraft(state.modelsAdvancedDrafts.memorySearch, {
      enabled: document.querySelector("[data-memory-search-enabled]")?.checked === true,
      provider: document.querySelector("[data-memory-search-provider]")?.value,
      model: document.querySelector("[data-memory-search-model]")?.value,
      baseUrl: document.querySelector("[data-memory-search-base-url]")?.value,
      apiKey: document.querySelector("[data-memory-search-api-key]")?.value,
      fallback: document.querySelector("[data-memory-search-fallback]")?.value
    })
  };
}

function syncModelsAdvancedDraftsFromDom() {
  // sync when the detail panel is visible OR when the config modal is open
  const hasDetail = !!document.querySelector("[data-models-advanced-detail]");
  const hasModal = $("models-config-modal")?.classList.contains("show");
  if (!$("models-advanced-panel") || (!hasDetail && !hasModal)) return;
  state.modelsAdvancedDrafts = buildModelsAdvancedDraftsFromDom();
}

function renderModelsAdvancedPanels() {
  const container = $("models-advanced-panel");
  if (!container) return;
  container.innerHTML = `
    <section class="glass-panel models-advanced-card ${state.modelsAdvancedExpanded ? "open" : ""}" data-spotlight>
      ${renderModelsAdvancedSummary()}
      ${renderModelsAdvancedDetail()}
    </section>
  `;
  renderModelRefDatalist();
}

function renderModelsBaseLayout() {
  const container = $("models-content");
  if (!container) return false;
  container.innerHTML = `
    <div id="models-policy-summary" class="models-policy-summary"></div>
    <div class="provider-matrix-wrapper provider-matrix-wrapper-compact">
      <div id="models-provider-matrix" class="provider-matrix-grid"></div>
    </div>
    <div class="models-config-stack">
      <div id="models-advanced-panel"></div>
    </div>
    <datalist id="models-ref-options"></datalist>
    <div id="models-config-modal" class="provider-modal-shell" aria-hidden="true">
      <div class="provider-modal-backdrop" data-config-modal-close></div>
      <div class="provider-modal-panel">
        <div class="provider-modal-head">
          <div>
            <h3 id="config-modal-title" class="provider-modal-title"></h3>
            <p id="config-modal-subtitle" class="provider-modal-subtitle"></p>
          </div>
          <button class="provider-modal-close" data-config-modal-close aria-label="关闭">×</button>
        </div>
        <div class="provider-modal-body" id="config-modal-body" style="padding:24px 30px;overflow-y:auto;"></div>
      </div>
    </div>
  `;
  return true;
}

function clearModelsPolicySummary() {
  const container = $("models-policy-summary");
  if (!container) return;
  container.innerHTML = "";
}

function renderModelsPolicySummary() {
  const container = $("models-policy-summary");
  if (!container) return;

  const configuredCount = getConfiguredProviderModelCount(state.modelProvidersDraft);
  const allowlistCount = Object.keys(state.agentsDefaultsModelsDraft || {}).length;
  const defaultPrimary = getAgentDefaultModelPrimary();

  if (configuredCount === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="models-policy-inline" aria-live="polite">
      <div class="models-policy-inline-copy">
        <span class="models-policy-inline-title">生效说明</span>
        <span class="models-policy-inline-text">“允许 Agent 使用”会把模型加入白名单；“设为默认”只会修改全局默认模型，不会改动某个 Agent 已经单独指定的模型。</span>
      </div>
      <div class="models-policy-inline-meta">
        <span class="status-badge dynamic">已配置模型 ${configuredCount}</span>
        <span class="status-badge dynamic">已入白名单 ${allowlistCount}</span>
        <span class="models-policy-inline-default">
          <span class="models-policy-inline-default-label">默认模型</span>
          <code class="models-policy-inline-code">${escapeHtml(defaultPrimary || "未设置")}</code>
        </span>
      </div>
    </div>
  `;
}

function renderModelsDraftSurface() {
  syncModelsAdvancedDraftsFromDom();
  renderModelsBaseLayout();
  if (Object.keys(state.modelProvidersDraft || {}).length === 0) {
    clearModelsPolicySummary();
  } else {
    renderModelsPolicySummary();
  }
  renderProviderMatrix(state.modelProvidersDraft);
  renderModelsAdvancedPanels();
}

function applyLoadedModelsData(data) {
  state.modelsHash = data.configHash;
  state.deletedModelProviderKeys = new Set();
  state.deletedAllowlistModelRefs = new Set();
  state.modelsAdvancedExpanded = false;

  const cfg = data.modelsConfig || {};
  const providers = cfg.providers || {};
  state.modelProvidersDraft = {};
  for (const [key, provider] of Object.entries(providers)) {
    state.modelProvidersDraft[key] = cloneProviderConfig(provider);
  }
  state.agentsDefaultsModelsDraft = cloneAgentModelsConfig(data.agentsDefaultsModels || {});
  state.agentsDefaultModelDraft = cloneAgentDefaultModelConfig(data.agentsDefaultModel);
  state.modelsAdvancedDrafts = {
    imageModel: cloneAgentModelConfig(data.imageModel),
    imageGenerationModel: cloneAgentModelConfig(data.imageGenerationModel),
    pdfModel: cloneAgentModelConfig(data.pdfModel),
    pdfMaxBytesMb: normalizeOptionalPositiveNumber(data.pdfMaxBytesMb),
    pdfMaxPages: normalizeOptionalPositiveInteger(data.pdfMaxPages),
    summarize: cloneOptionalConfigObject(data.summarize),
    subagents: cloneOptionalConfigObject(data.subagents),
    memorySearch: cloneMemorySearchConfig(data.memorySearch)
  };

  renderProviderEditor("", {}, "");
  renderModelsDraftSurface();
}

function applyProviderPolicyDraft({
  previousKey = "",
  previousProvider = null,
  nextKey = "",
  nextProvider = null,
  allowlistedModelRefs = [],
  defaultModelRef = ""
} = {}) {
  const normalizedPreviousKey = String(previousKey || "").trim();
  const normalizedNextKey = String(nextKey || "").trim();
  const nextAllowlist = cloneAgentModelsConfig(state.agentsDefaultsModelsDraft);
  const nextDeletedRefs = new Set(state.deletedAllowlistModelRefs);
  const previousRefs = previousProvider && normalizedPreviousKey
    ? getProviderModelRefs(normalizedPreviousKey, previousProvider)
    : [];

  for (const ref of previousRefs) {
    delete nextAllowlist[ref];
    nextDeletedRefs.add(ref);
  }

  for (const ref of Array.from(new Set(allowlistedModelRefs.filter(Boolean)))) {
    const existingEntry = cloneProviderConfig(state.agentsDefaultsModelsDraft[ref]);
    nextAllowlist[ref] = existingEntry;
    nextDeletedRefs.delete(ref);
  }

  const normalizedDefaultRef = String(defaultModelRef || "").trim();
  if (normalizedDefaultRef) {
    const existingEntry = cloneProviderConfig(state.agentsDefaultsModelsDraft[normalizedDefaultRef]);
    nextAllowlist[normalizedDefaultRef] = existingEntry;
    nextDeletedRefs.delete(normalizedDefaultRef);
  }

  state.agentsDefaultsModelsDraft = nextAllowlist;
  state.deletedAllowlistModelRefs = nextDeletedRefs;

  const clearedDefault = clearAgentDefaultModelForRefs(state.agentsDefaultModelDraft, previousRefs);
  state.agentsDefaultModelDraft = normalizedDefaultRef
    ? { ...(clearedDefault || {}), primary: normalizedDefaultRef }
    : clearedDefault;

  if (!normalizedNextKey || !nextProvider) {
    renderModelsDraftSurface();
    return;
  }

  renderModelsDraftSurface();
}

function renderProviderMatrix(providers) {
  const matrix = $("models-provider-matrix");
  if (!matrix) return;

  const entries = Object.entries(providers || {});
  if (entries.length === 0) {
    matrix.innerHTML = `
      <div class="empty-placeholder provider-empty-placeholder">
        <i class="fa-solid fa-plug-circle-xmark empty-icon"></i>
        <h3 class="provider-empty-title">还没有接入任何算力核心</h3>
        <p>先添加一个 Provider，模型管理功能才会生效。</p>
        <button type="button" class="panel-action-btn btn-secondary btn-mt-sm" data-provider-matrix-add>
          <i class="fa-solid fa-plus"></i> 接入第一个 Provider
        </button>
      </div>
    `;
    return;
  }

  const cards = entries
    .map(([key, provider]) => {
      const rows = getProviderModelRows(provider);
      const modelCount = rows.length;

      const apiType = normalizeProviderApiKind(provider?.api || provider?.apiType || provider?.type || "");

      const brand = getProviderBrand(key, apiType);

      // 生成内部模型标签块（移除小圆点）
      const modelChips = rows.map((r, i) => {
        if (i >= 8) return ""; // 最多展示前8个，防撑爆
        const modelRef = buildProviderModelRef(key, r.id);
        const allowlisted = isAllowlistedModelRef(modelRef);
        const isDefault = isDefaultModelRef(modelRef);
        const chipLabel = isDefault ? "当前默认模型" : allowlisted ? "已加入 allowlist" : "仅接入目录";
        return `<span class="model-chip" title="${escapeHtml(`${r.id} · ${chipLabel}`)}">${escapeHtml(r.id)}</span>`;
      }).join('');

      const overCount = modelCount > 8 ? `<span class="model-chip model-chip-muted">+${modelCount - 8}</span>` : "";

      const iconHTML = brand.isSvg ? brand.icon : `<i class="${brand.icon}"></i>`;

      return `
        <article class="provider-card" data-provider-key="${escapeHtml(key)}" data-spotlight>
          <div class="provider-header">
            <div class="provider-brand">
              <div class="provider-logo-btn" data-provider-card-manage data-provider-key="${escapeHtml(key)}" title="修改 ${escapeHtml(key)} 设置">
                ${iconHTML}
              </div>
              <div class="provider-info">
                <h4>${escapeHtml(key)}</h4>
                <div class="provider-status active"><i class="fa-solid fa-circle"></i> 在线可用</div>
              </div>
            </div>
            
          </div>
          <div class="model-chips-container model-chips-container-end">
            ${modelChips}
            ${overCount}
            <span class="model-chip model-chip-manage" data-provider-card-manage data-provider-key="${escapeHtml(key)}" title="配置更多">
              <i class="fa-solid fa-ellipsis"></i>
            </span>
          </div>
        </article>
      `;
    })
    .join("");

  matrix.innerHTML = cards;
}

// （底层模型胶囊池渲染已移除）

function setProviderModalOpen(open) {
  const modal = $("models-provider-modal");
  if (!modal) return;

  state.providerModalOpen = open;
  modal.classList.toggle("open", open);
  modal.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("provider-modal-open", open);

  if (open) {
    captureModalFocus("models-provider-modal", { initialSelector: "#models-providers-editor .provider-key" });
  } else {
    releaseModalFocus("models-provider-modal");
  }
}

function setProviderEditorDirty(dirty) {
  state.providerEditor.dirty = dirty === true;
}

function setProviderModalMeta() {
  const title = $("provider-modal-title");
  const subtitle = $("provider-modal-subtitle");
  const deleteBtn = $("models-provider-delete-current");
  const saveCurrentBtn = $("models-provider-save-current");
  const isEdit = state.providerEditor.mode === "edit";
  const targetKey = state.providerEditor.originalKey || "";

  if (title) {
    title.textContent = isEdit ? `编辑 Provider：${targetKey}` : "接入新 Provider";
  }
  if (subtitle) {
    subtitle.textContent = isEdit
      ? "你正在修改当前供应商。点击“保存当前供应商”仅更新此配置。"
      : "仅创建当前供应商，不会影响其他 Provider。";
  }
  if (deleteBtn) {
    deleteBtn.classList.toggle("is-hidden", !isEdit);
  }
  if (saveCurrentBtn) {
    saveCurrentBtn.innerHTML = '<i class="fa-solid fa-check"></i> 保存当前供应商';
  }
}

function openProviderModal({ mode = "create", providerKey = "" } = {}) {
  const isEdit = mode === "edit";
  if (isEdit) {
    if (!providerKey) {
      showToast("缺少 Provider Key，无法进入编辑模式", "error");
      return;
    }
    const targetProvider = state.modelProvidersDraft[providerKey];
    if (!targetProvider) {
      showToast(`未找到 Provider：${providerKey}`, "error");
      return;
    }
    state.providerEditor.mode = "edit";
    state.providerEditor.originalKey = providerKey;
    setProviderEditorDirty(false);
    renderProviderEditor(providerKey, targetProvider, providerKey);
  } else {
    state.providerEditor.mode = "create";
    state.providerEditor.originalKey = "";
    setProviderEditorDirty(false);
    renderProviderEditor("", {}, "");
  }

  const currentCard = document.querySelector("#models-providers-editor [data-provider-card]");
  if (currentCard) syncProviderJsonFromForm(currentCard);

  setProviderModalMeta();
  setProviderModalOpen(true);
}

async function closeProviderModal({ force = false } = {}) {
  if (!force && state.providerEditor.dirty) {
    const shouldDiscard = await requestConfirmDialog({
      title: "放弃未保存修改",
      message: "当前供应商尚未保存，确定放弃本次修改吗？",
      confirmText: "放弃修改",
      cancelText: "继续编辑",
      variant: "primary"
    });
    if (!shouldDiscard) return false;
  }

  setProviderModalOpen(false);
  state.providerEditor.mode = "create";
  state.providerEditor.originalKey = "";
  setProviderEditorDirty(false);
  return true;
}

const PROVIDER_MANAGED_KEYS = new Set(["baseUrl", "baseURL", "url", "apiKey", "api", "apiType", "type", "models"]);

function clearProviderJsonError(card) {
  const jsonInput = card?.querySelector(".provider-json-config");
  const jsonErrorText = card?.querySelector(".provider-json-error");
  if (jsonInput) jsonInput.classList.remove("json-error");
  if (jsonErrorText) jsonErrorText.classList.add("is-hidden");
}

function showProviderJsonError(card) {
  const jsonInput = card?.querySelector(".provider-json-config");
  const jsonErrorText = card?.querySelector(".provider-json-error");
  if (jsonInput) jsonInput.classList.add("json-error");
  if (jsonErrorText) jsonErrorText.classList.remove("is-hidden");
}

function parseProviderJsonConfig(card, { strict = true, allowEmpty = true } = {}) {
  const jsonInput = card?.querySelector(".provider-json-config");
  if (!jsonInput) return {};

  const raw = jsonInput.value.trim();
  if (!raw) {
    clearProviderJsonError(card);
    return allowEmpty ? {} : null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("必须是 JSON 对象");
    }
    clearProviderJsonError(card);
    return parsed;
  } catch (err) {
    if (strict) {
      showProviderJsonError(card);
      throw err;
    }
    return null;
  }
}

function collectProviderModelsFromCard(card, { strict = true, keyForError = "未命名" } = {}) {
  const modelRows = Array.from(card.querySelectorAll("[data-provider-model-row]"));
  const models = [];
  const rowPolicies = [];

  for (let rowIndex = 0; rowIndex < modelRows.length; rowIndex += 1) {
    const modelRow = modelRows[rowIndex];
    const modelId = modelRow.querySelector(".provider-model-id")?.value.trim() || "";
    const contextWindowRaw = modelRow.querySelector(".provider-model-context")?.value.trim() || "";
    const reasoning = modelRow.querySelector(".provider-model-reasoning-toggle")?.checked === true;
    const inputText = modelRow.querySelector(".provider-model-input")?.value.trim() || "";
    const allowlisted = modelRow.querySelector(".provider-model-allowlist-toggle")?.checked !== false;
    const isDefault = modelRow.querySelector(".provider-model-default-toggle")?.checked === true;
    const extrasRaw = modelRow.querySelector(".provider-model-extras")?.value || "{}";

    if (!modelId && !contextWindowRaw && !reasoning && !inputText) continue;
    if (!modelId) {
      if (strict) throw new Error(`Provider ${keyForError} 的第 ${rowIndex + 1} 个模型缺少 ID`);
      continue;
    }

    const inputValues = inputText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    let contextWindow = null;
    if (contextWindowRaw) {
      const parsedWindow = Number(contextWindowRaw);
      if (!Number.isInteger(parsedWindow) || parsedWindow <= 0) {
        if (strict) throw new Error(`Provider ${keyForError} 的模型 ${modelId} 上下文窗口必须是正整数`);
        continue;
      }
      contextWindow = parsedWindow;
    }

    let extras = {};
    try {
      const parsedExtras = JSON.parse(extrasRaw);
      if (parsedExtras && typeof parsedExtras === "object" && !Array.isArray(parsedExtras)) {
        extras = parsedExtras;
      }
    } catch {
      extras = {};
    }

    delete extras.id;
    delete extras.model;
    delete extras.reasoning;
    delete extras.contextWindow;
    delete extras.input;

    const modelName = typeof extras.name === "string" && extras.name.trim() ? extras.name.trim() : modelId;
    const modelPayload = { ...extras, id: modelId, name: modelName };
    if (reasoning) modelPayload.reasoning = true;
    if (contextWindow !== null) modelPayload.contextWindow = contextWindow;
    if (inputValues.length > 0) modelPayload.input = inputValues;
    models.push(modelPayload);
    rowPolicies.push({
      id: modelId,
      allowlisted,
      isDefault
    });
  }

  return { models, rowPolicies };
}

function collectProviderFormState(card, { strict = true } = {}) {
  const key = card.querySelector(".provider-key")?.value.trim() || "";
  const baseUrl = card.querySelector(".provider-base-url")?.value.trim() || "";
  const apiKey = card.querySelector(".provider-api-key")?.value.trim() || "";
  const apiType = normalizeProviderApiKind(card.querySelector(".provider-api-type")?.value.trim() || "");
  const { models, rowPolicies } = collectProviderModelsFromCard(card, { strict, keyForError: key || "未命名" });

  if (strict) {
    if (!key && !baseUrl && !apiKey && models.length === 0) {
      throw new Error("请先填写当前 Provider 配置");
    }
    if (!key) throw new Error("Provider Key 不能为空");
    if (models.length === 0) throw new Error(`Provider ${key} 至少需要一个模型`);
  }

  const providerConfig = {
    baseUrl,
    apiKey,
    api: apiType || "openai-completions",
    models
  };

  const allowlistedModelRefs = [];
  let defaultModelRef = "";
  for (const row of rowPolicies) {
    const modelRef = buildProviderModelRef(key, row.id);
    if (!modelRef) continue;
    if (row.allowlisted || row.isDefault) {
      allowlistedModelRefs.push(modelRef);
    }
    if (row.isDefault) {
      defaultModelRef = modelRef;
    }
  }

  return {
    key,
    providerConfig,
    allowlistedModelRefs,
    defaultModelRef
  };
}

function mergeProviderConfigWithJson(formConfig, jsonConfig) {
  const extras = cloneProviderConfig(jsonConfig);
  for (const key of PROVIDER_MANAGED_KEYS) {
    delete extras[key];
  }
  return { ...extras, ...formConfig };
}

function sanitizeProvidersForSave(providers) {
  const sanitized = cloneProviderConfig(providers);
  for (const [providerKey, provider] of Object.entries(sanitized)) {
    if (!provider || typeof provider !== "object" || Array.isArray(provider)) continue;
    const apiKey = typeof provider.apiKey === "string" ? provider.apiKey.trim() : "";
    if (apiKey === REDACTED_API_KEY_TOKEN) {
      delete provider.apiKey;
      sanitized[providerKey] = provider;
    }
  }
  return sanitized;
}

function buildProvidersPatchForSave(providers, deletedKeys = []) {
  const sanitized = sanitizeProvidersForSave(providers);
  for (const key of deletedKeys) {
    if (!key) continue;
    sanitized[key] = null;
  }
  return sanitized;
}

function sanitizeMemorySearchForSave(value) {
  const sanitized = cloneMemorySearchConfig(value);
  if (!sanitized) return null;
  if (sanitized.remote && typeof sanitized.remote === "object" && !Array.isArray(sanitized.remote)) {
    const apiKey = typeof sanitized.remote.apiKey === "string" ? sanitized.remote.apiKey.trim() : "";
    if (!apiKey || apiKey === REDACTED_API_KEY_TOKEN) {
      delete sanitized.remote.apiKey;
    }
    if (Object.keys(sanitized.remote).length === 0) {
      delete sanitized.remote;
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

function syncProviderJsonFromForm(card) {
  if (!card || card.dataset.jsonSyncLock === "1") return;
  const jsonInput = card.querySelector(".provider-json-config");
  if (!jsonInput) return;

  const { providerConfig } = collectProviderFormState(card, { strict: false });
  const jsonConfig = parseProviderJsonConfig(card, { strict: false, allowEmpty: true }) || {};
  const merged = mergeProviderConfigWithJson(providerConfig, jsonConfig);

  card.dataset.jsonSyncLock = "1";
  jsonInput.value = JSON.stringify(merged, null, 2);
  card.dataset.jsonSyncLock = "0";
}

function captureProviderModelPolicySelections(card) {
  const selections = new Map();
  const rows = Array.from(card?.querySelectorAll("[data-provider-model-row]") || []);

  for (const row of rows) {
    const modelId = row.querySelector(".provider-model-id")?.value.trim() || "";
    if (!modelId) continue;
    selections.set(modelId, {
      allowlisted: row.querySelector(".provider-model-allowlist-toggle")?.checked !== false,
      isDefaultModel: row.querySelector(".provider-model-default-toggle")?.checked === true
    });
  }

  return selections;
}

function fillProviderFormFromJson(card, { silent = false } = {}) {
  const jsonConfig = parseProviderJsonConfig(card, { strict: true, allowEmpty: true });
  if (!jsonConfig || Object.keys(jsonConfig).length === 0) {
    if (!silent) showToast("JSON 为空，无法回填表单", "warning");
    return false;
  }

  const baseUrl =
    (typeof jsonConfig.baseUrl === "string" && jsonConfig.baseUrl) ||
    (typeof jsonConfig.baseURL === "string" && jsonConfig.baseURL) ||
    (typeof jsonConfig.url === "string" && jsonConfig.url) ||
    "";
  const apiKey = (typeof jsonConfig.apiKey === "string" && jsonConfig.apiKey) || "";
  const apiType = normalizeProviderApiKind(jsonConfig.api || jsonConfig.apiType || jsonConfig.type || "");

  const keyInput = card.querySelector(".provider-key");
  const baseUrlInput = card.querySelector(".provider-base-url");
  const apiKeyInput = card.querySelector(".provider-api-key");
  const apiTypeSelect = card.querySelector(".provider-api-type");
  const modelList = card.querySelector(".provider-model-list");
  const currentPolicySelections = captureProviderModelPolicySelections(card);

  if (baseUrlInput) baseUrlInput.value = baseUrl;
  if (apiKeyInput) apiKeyInput.value = apiKey;

  if (apiTypeSelect) {
    if (!Array.from(apiTypeSelect.options).some((opt) => opt.value === apiType)) {
      apiTypeSelect.insertAdjacentHTML("afterbegin", `<option value="${escapeHtml(apiType)}">${escapeHtml(apiType)}</option>`);
    }
    apiTypeSelect.value = apiType;
  }

  const normalizedRows = normalizeProviderModels(jsonConfig.models, true);
  if (modelList) {
    const providerKey = keyInput?.value.trim() || card.getAttribute("data-original-key") || "";
    modelList.innerHTML = normalizedRows.map((row) => {
      const modelRef = buildProviderModelRef(providerKey, row.id);
      const currentPolicy = row.id ? currentPolicySelections.get(row.id) : null;
      return providerModelRowTemplate({
        ...row,
        allowlisted: currentPolicy
          ? currentPolicy.allowlisted
          : modelRef ? (isAllowlistedModelRef(modelRef) || isDefaultModelRef(modelRef)) : true,
        isDefaultModel: currentPolicy
          ? currentPolicy.isDefaultModel
          : modelRef ? isDefaultModelRef(modelRef) : false
      });
    }).join("");
  }

  if (keyInput && !keyInput.value.trim()) {
    keyInput.focus();
  }

  clearProviderJsonError(card);
  syncProviderJsonFromForm(card);
  if (!silent) showToast("已根据 JSON 回填当前 Provider 表单", "success");
  return true;
}

function collectCurrentProvider() {
  const card = document.querySelector("#models-providers-editor [data-provider-card]");
  if (!card) {
    throw new Error("未找到当前 Provider 编辑表单");
  }

  const {
    key,
    providerConfig,
    allowlistedModelRefs,
    defaultModelRef
  } = collectProviderFormState(card, { strict: true });
  const jsonConfig = parseProviderJsonConfig(card, { strict: true, allowEmpty: true });
  const mergedConfig = mergeProviderConfigWithJson(providerConfig, jsonConfig);

  return {
    key,
    providerConfig: mergedConfig,
    allowlistedModelRefs,
    defaultModelRef
  };
}

async function saveCurrentProvider() {
  try {
    const {
      key,
      providerConfig,
      allowlistedModelRefs,
      defaultModelRef
    } = collectCurrentProvider();
    const originalKey = state.providerEditor.originalKey;
    const previousProvider = originalKey ? state.modelProvidersDraft[originalKey] : null;
    const previousApiKey = typeof previousProvider?.apiKey === "string" ? previousProvider.apiKey.trim() : "";
    const currentApiKey = typeof providerConfig.apiKey === "string" ? providerConfig.apiKey.trim() : "";
    const previousWasRedacted = previousApiKey === REDACTED_API_KEY_TOKEN;

    if (currentApiKey === REDACTED_API_KEY_TOKEN) {
      if (state.providerEditor.mode !== "edit" || !previousWasRedacted) {
        throw new Error("`__OPENCLAW_REDACTED__` 是脱敏占位符，请输入真实 API Key");
      }
      if (key !== originalKey) {
        throw new Error("当前 API Key 为脱敏状态，重命名 Provider 前请先填写真实 API Key");
      }
    }

    if (key !== originalKey && Object.prototype.hasOwnProperty.call(state.modelProvidersDraft, key)) {
      throw new Error(`Provider Key 重复：${key}`);
    }

    if (originalKey && originalKey !== key) {
      delete state.modelProvidersDraft[originalKey];
      state.deletedModelProviderKeys.add(originalKey);
    }

    state.deletedModelProviderKeys.delete(key);
    state.modelProvidersDraft[key] = providerConfig;
    applyProviderPolicyDraft({
      previousKey: originalKey,
      previousProvider,
      nextKey: key,
      nextProvider: providerConfig,
      allowlistedModelRefs,
      defaultModelRef
    });
    setProviderEditorDirty(false);
    await closeProviderModal({ force: true });
    showToast(`Provider ${key} 已保存到草稿，点击顶部“保存并应用”后生效`, "success");
  } catch (err) {
    showToast(err.message || String(err), "error");
  }
}

async function deleteCurrentProvider() {
  const targetKey = state.providerEditor.originalKey;
  if (!targetKey) {
    showToast("当前是新增模式，没有可删除的 Provider", "warning");
    return;
  }

  const confirmed = await requestConfirmDialog({
    title: "删除 Provider",
    message: `确定删除 Provider "${targetKey}" 吗？\n删除后需点击顶部“保存并应用”才会真正生效。`,
    confirmText: "确认删除",
    cancelText: "取消",
    variant: "danger"
  });
  if (!confirmed) return;

  if (Object.prototype.hasOwnProperty.call(state.modelProvidersDraft, targetKey)) {
    const targetProvider = state.modelProvidersDraft[targetKey];
    delete state.modelProvidersDraft[targetKey];
    state.deletedModelProviderKeys.add(targetKey);
    applyProviderPolicyDraft({
      previousKey: targetKey,
      previousProvider: targetProvider,
      nextKey: "",
      nextProvider: null,
      allowlistedModelRefs: [],
      defaultModelRef: ""
    });
  }

  setProviderEditorDirty(false);
  await closeProviderModal({ force: true });
  showToast(`Provider ${targetKey} 已从草稿中移除`, "success");
}

// （模型选择器和绑定逻辑已移除）

async function loadModels({ silent = false, rethrow = false } = {}) {
  const content = $("models-content");
  if (!silent && content) {
    content.innerHTML = renderSkeleton(5);
  }

  try {
    const data = await api("/api/models");
    applyLoadedModelsData(data);
    setModelsApplyState("idle");
  } catch (err) {
    if (!silent) {
      showToast(err.message || String(err), "error");
    }
    if (content) {
      content.innerHTML = renderEmpty(
        "fa-solid fa-plug-circle-xmark",
        "无法加载模型配置",
        '请检查网关连接后点击「重新加载」'
      );
    }
    if (rethrow) {
      throw err;
    }
  }
}

async function saveModels() {
  let expectedModelsState = null;
  try {
    if (state.providerModalOpen && state.providerEditor.dirty) {
      showToast("请先保存当前供应商，或取消本次编辑后再执行“保存并应用”", "warning");
      return;
    }

    if (state.modelsApply.phase === "error") {
      setModelsApplyState("restarting", "网关热重启中，正在重新建立连接...");
      await waitForModelsGatewayRecovery({ initialDelayMs: 0 });
      return;
    }

    syncModelsAdvancedDraftsFromDom();

    const providers = buildProvidersPatchForSave(
      state.modelProvidersDraft,
      Array.from(state.deletedModelProviderKeys)
    );
    const agentsDefaultsModels = buildAgentsDefaultsModelsPatchForSave(
      state.agentsDefaultsModelsDraft,
      Array.from(state.deletedAllowlistModelRefs)
    );

    const payload = {
      models: {
        providers
      },
      agentsDefaultsModels,
      agentsDefaultModel: cloneAgentDefaultModelConfig(state.agentsDefaultModelDraft),
      imageModel: cloneAgentModelConfig(state.modelsAdvancedDrafts.imageModel),
      imageGenerationModel: cloneAgentModelConfig(state.modelsAdvancedDrafts.imageGenerationModel),
      pdfModel: cloneAgentModelConfig(state.modelsAdvancedDrafts.pdfModel),
      pdfMaxBytesMb: normalizeOptionalPositiveNumber(state.modelsAdvancedDrafts.pdfMaxBytesMb),
      pdfMaxPages: normalizeOptionalPositiveInteger(state.modelsAdvancedDrafts.pdfMaxPages),
      summarize: cloneOptionalConfigObject(state.modelsAdvancedDrafts.summarize),
      subagents: cloneOptionalConfigObject(state.modelsAdvancedDrafts.subagents),
      memorySearch: sanitizeMemorySearchForSave(state.modelsAdvancedDrafts.memorySearch),
      baseHash: state.modelsHash
    };

    const hasAnyModelsChange = Boolean(
      Object.keys(state.modelProvidersDraft).length > 0
      || state.deletedModelProviderKeys.size > 0
      || Object.keys(state.agentsDefaultsModelsDraft).length > 0
      || state.deletedAllowlistModelRefs.size > 0
      || cloneAgentDefaultModelConfig(state.agentsDefaultModelDraft)
      || payload.imageModel
      || payload.imageGenerationModel
      || payload.pdfModel
      || payload.pdfMaxBytesMb !== null
      || payload.pdfMaxPages !== null
      || payload.summarize
      || payload.subagents
      || payload.memorySearch
    );

    if (!hasAnyModelsChange) {
      showToast("当前没有可保存的模型配置改动", "warning");
      return;
    }

    expectedModelsState = captureExpectedModelsState();

    const btn = $("models-save");
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 保存中...';
      btn.disabled = true;
    }

    const saveResult = await api("/api/models/save", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    await closeProviderModal({ force: true });

    const restart = saveResult?.result?.restart;
    const restartDelayMs = Math.max(800, Number(restart?.delayMs || 0) + 400);

    if (restart?.coalesced) {
      showToast("配置已保存。网关重启已合并到先前的请求中，模型变更可能需要网关完成重启后才会生效。", "warning", 5000);
      setModelsApplyState("restarting", "等待网关完成合并重启...");
    } else {
      showToast("配置已成功下发，正在等待网关热重启...", "info", 1800);
      setModelsApplyState("restarting", "网关热重启中，正在等待重新连接...");
    }
    await waitForModelsGatewayRecovery({ initialDelayMs: restartDelayMs });
  } catch (err) {
    if (expectedModelsState && isLikelyGatewayHotRestartError(err)) {
      showToast("保存响应在网关重启时中断，正在核对配置是否已生效...", "warning", 2600);
      const verification = await verifyModelsSaveApplied(expectedModelsState);
      if (verification.verified) {
        await closeProviderModal({ force: true });
        showToast("配置已确认生效，刚才的断线来自网关热重启。", "success", 2600);
        return;
      }
      setModelsApplyState("error", "网关已断开，但暂时无法确认配置是否生效。请重新加载后核对。");
      showToast("保存结果暂时无法确认，请重新加载后核对配置。", "error", 4000);
      return;
    }
    showToast(err.message || String(err), "error");
  } finally {
    if (state.modelsApply.phase === "idle") {
      setModelsApplyState("idle");
    }
  }
}

function normalizeSkillMissing(missing) {
  const source = missing && typeof missing === "object" ? missing : {};
  const toList = (value) => (Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : []);

  return {
    bins: toList(source.bins),
    anyBins: toList(source.anyBins),
    env: toList(source.env),
    config: toList(source.config),
    os: toList(source.os)
  };
}

function buildSkillNotReadyReasons(skill) {
  const reasons = [];
  if (skill.disabled) reasons.push("已手动停用（enabled=false）");
  if (skill.blockedByAllowlist) reasons.push("未在 allowBundled 白名单中");
  if (skill.missing.bins.length > 0) reasons.push(`缺少命令：${skill.missing.bins.join(", ")}`);
  if (skill.missing.anyBins.length > 0) reasons.push(`至少安装其一命令：${skill.missing.anyBins.join(", ")}`);
  if (skill.missing.env.length > 0) reasons.push(`缺少环境变量：${skill.missing.env.join(", ")}`);
  if (skill.missing.config.length > 0) reasons.push(`缺少配置项：${skill.missing.config.join(", ")}`);
  if (skill.missing.os.length > 0) reasons.push(`系统不兼容：${skill.missing.os.join(", ")}`);
  if (reasons.length === 0) reasons.push("未满足运行条件");
  return reasons;
}

async function loadSkills() {
  const tableActive = $("skills-table-active");
  const tablePending = $("skills-table-pending");
  const tableDisabled = $("skills-table-disabled");
  const tableBlocked = $("skills-table-blocked");

  if (tableActive) tableActive.innerHTML = renderSkeleton(3);
  if (tablePending) tablePending.innerHTML = renderSkeleton(1);

  try {
    const data = await api("/api/skills");
    const skills = data.skills || [];

    if (skills.length === 0) {
      const emptyHtml = renderEmpty("fa-solid fa-box-open", "技能箱是空的", "还没有安装任何技能，快去添加一些吧！");
      if (tableActive) tableActive.innerHTML = emptyHtml;
      if (tablePending) tablePending.innerHTML = emptyHtml;
      if (tableDisabled) tableDisabled.innerHTML = emptyHtml;
      if (tableBlocked) tableBlocked.innerHTML = emptyHtml;
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
        eligible: skill.eligible === true,
        disabled: skill.disabled === true,
        blockedByAllowlist: skill.blockedByAllowlist === true,
        missing: normalizeSkillMissing(skill.missing),
        primaryEnv: skill.primaryEnv || null,
        install: Array.isArray(skill.install) ? skill.install : [],
        emoji: skill.emoji || ""
      }));

    _skillsCache = rows;

    // 划分四个象限
    const activeSkills = rows.filter(s => s.enabled && s.eligible);
    const blockedSkills = rows.filter(s => s.blockedByAllowlist);
    const pendingSkills = rows.filter(s => !s.eligible && !s.blockedByAllowlist);
    const disabledSkills = rows.filter(s => s.eligible && !s.enabled);

    const renderSkillEntry = (skill, { category }) => {
      const cleanName = skill.name.replace(/\s*\(.*?\)/, "");
      const reasons = buildSkillNotReadyReasons(skill);
      let reasonBlock = "";

      if (category === "active") {
        reasonBlock = `
          <div class="skill-hint-active">
            <i class="fa-solid fa-bolt"></i>
            <span>技能活跃中，将自动参与协同</span>
          </div>
        `;
      } else if (category === "blocked") {
        reasonBlock = `
          <div class="skill-hint-block skill-hint-blocked">
            <i class="fa-solid fa-ban"></i>
            <span>被所属节点组的安全白名单拦截，禁止强制运行。</span>
          </div>
        `;
      } else if (category === "pending") {
        const missHtml = reasons.map(r => `<li>${escapeHtml(r)}</li>`).join("");
        reasonBlock = `
          <div class="skill-hint-pending">
            <div class="skill-hint-title">
              <i class="fa-solid fa-triangle-exclamation"></i>缺少必要运行条件
            </div>
            <ul class="skill-hint-list">${missHtml}</ul>
            <div class="skill-hint-note">提示：请在终端服务器补齐环境变量或依赖包后，尝试在此重新开启。</div>
          </div>
        `;
      } else if (category === "disabled") {
        reasonBlock = `
          <div class="skill-hint-block skill-hint-disabled">
            <i class="fa-solid fa-power-off"></i>
            <span>已停用该模块，拨动右侧开关启用即可恢复。</span>
          </div>
        `;
      }

      // 禁用开关判定（被组策略阻止不能开）
      const toggleDisabled = category === "blocked" ? "disabled" : "";

      const statusLabels = {
        active: { text: '运行中', className: 'skill-entry-status-active' },
        pending: { text: '待配置', className: 'skill-entry-status-pending' },
        disabled: { text: '已停用', className: 'skill-entry-status-disabled' },
        blocked: { text: '被拦截', className: 'skill-entry-status-blocked' }
      };
      const statusInfo = statusLabels[category] || { text: '未知', className: 'skill-entry-status-disabled' };
      const toggleClass = category === 'blocked'
        ? 'switch-toggle skill-entry-toggle skill-entry-toggle-blocked'
        : 'switch-toggle skill-entry-toggle';

      return `
        <article class="skill-entry">
          <div class="skill-entry-main">
            <div class="skill-entry-head">
              <strong class="skill-entry-name">${escapeHtml(cleanName)}</strong>
              <span class="skill-chip skill-chip-source">${escapeHtml(skill.source)}</span>
            </div>
            <div class="skill-entry-key">${escapeHtml(skill.key)}</div>
            <div class="skill-entry-description">${escapeHtml(skill.description || "暂无技能描述。")}</div>
            ${reasonBlock}
          </div>
          <div class="skill-entry-side">
            <div class="skill-entry-controls">
              <button type="button" class="skill-config-btn panel-action-btn btn-secondary btn-size-sm" data-skill-config="${escapeHtml(skill.key)}">
                <i class="fa-solid fa-sliders"></i> 配置
              </button>
              <div class="skill-toggle-wrap">
                 <label class="${toggleClass}" aria-label="切换状态">
                  <input type="checkbox" data-skill-toggle="${escapeHtml(skill.key)}" ${skill.enabled ? "checked" : ""} ${toggleDisabled} />
                  <span class="slider"><span class="knob"></span></span>
                </label>
                <span class="skill-entry-status ${statusInfo.className}">${statusInfo.text}</span>
              </div>
            </div>
          </div>
        </article>
      `;
    };

    const renderList = (items, category, emptyMsg) => {
      if (items.length === 0) {
        return `<div class="skill-list-empty">${emptyMsg}</div>`;
      }
      return items.map((skill) => renderSkillEntry(skill, { category })).join("");
    };

    if (tableActive) tableActive.innerHTML = renderList(activeSkills, "active", "没有位于活跃状态的技能。");
    if (tablePending) tablePending.innerHTML = renderList(pendingSkills, "pending", "太棒了，目前所有可用的技能都已就绪！");
    if (tableDisabled) tableDisabled.innerHTML = renderList(disabledSkills, "disabled", "目前没有手动停用的闲置技能。");
    if (tableBlocked) tableBlocked.innerHTML = renderList(blockedSkills, "blocked", "目前没有被系统阻止的技能。");

    // 绑定所有的开关动作并劫持刷新
    const bindToggles = () => {
      for (const toggle of document.querySelectorAll("[data-skill-toggle]")) {
        toggle.addEventListener("change", async () => {
          const skillKey = toggle.getAttribute("data-skill-toggle");
          const enabled = toggle.checked;
          if (!skillKey) return;
          try {
            await api("/api/skills/update", {
              method: "POST",
              body: JSON.stringify({ skillKey, enabled })
            });
            // 变更后立即局部重新拉取，触发流转
            await loadSkills();
          } catch (err) {
            alert(err.message);
            toggle.checked = !enabled;
          }
        });
      }
    };

    bindToggles();

  } catch (err) {
    if (tableActive) tableActive.textContent = err.message;
  }
}

// 绑定技能面板切换事件
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".skills-tab-btn");
  if (!btn) return;

  document.querySelectorAll(".skills-tab-btn").forEach(b => {
    b.classList.remove("active");
  });

  btn.classList.add("active");

  const targetId = btn.getAttribute("data-target") + "-panel";
  document.querySelectorAll(".skills-panel").forEach(p => {
    p.classList.remove("active");
  });

  const panel = document.getElementById(targetId);
  if (panel) {
    panel.classList.add("active");
  }
});

// 绑定技能配置 Modal 流转
function addSkillEnvRow(container, key, value, readonlyKey) {
  const row = document.createElement("div");
  row.className = "env-row";

  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.className = "env-key form-control form-control-mono form-control-sm";
  keyInput.value = key;
  keyInput.placeholder = "变量名";
  if (readonlyKey) {
    keyInput.readOnly = true;
    keyInput.classList.add("is-readonly");
  }

  const valInput = document.createElement("input");
  valInput.type = "text";
  valInput.className = "env-val form-control form-control-mono form-control-sm";
  valInput.value = value;
  valInput.placeholder = "值";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "env-row-delete panel-action-btn btn-secondary btn-size-sm btn-danger";
  deleteBtn.title = "移除";
  deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';

  row.appendChild(keyInput);
  row.appendChild(valInput);
  row.appendChild(deleteBtn);
  container.appendChild(row);
}

function setSkillModalOpen(open) {
  const modal = $("skill-config-modal");
  if (!modal) return;

  state.skillModalOpen = open === true;
  modal.classList.toggle("open", state.skillModalOpen);
  modal.setAttribute("aria-hidden", state.skillModalOpen ? "false" : "true");
  document.body.classList.toggle("skill-modal-open", state.skillModalOpen);

  if (state.skillModalOpen) {
    captureModalFocus("skill-config-modal", { initialSelector: getSkillModalInitialSelector() });
  } else {
    releaseModalFocus("skill-config-modal");
  }
}

document.addEventListener("click", async (e) => {
  // 打开技能配置 Modal
  const configBtn = e.target.closest("[data-skill-config]");
  if (configBtn) {
    const skillKey = configBtn.getAttribute("data-skill-config");
    if (!skillKey) return;

    const skill = _skillsCache.find(s => s.key === skillKey);
    if (!skill) return;

    const modal = $("skill-config-modal");
    if (!modal) return;

    // 填充基本信息
    $("skill-modal-title").textContent = `${skill.emoji ? skill.emoji + " " : ""}${skill.name}`;
    $("skill-config-key").textContent = skill.key;
    $("skill-config-desc").textContent = skill.description || "暂无技能描述。";

    // 状态/缺失信息
    const statusEl = $("skill-config-status");
    const missingItems = [];
    if (skill.missing.bins?.length > 0) missingItems.push(`缺少命令: ${skill.missing.bins.join(", ")}`);
    if (skill.missing.anyBins?.length > 0) missingItems.push(`至少安装其一: ${skill.missing.anyBins.join(", ")}`);
    if (skill.missing.env?.length > 0) missingItems.push(`缺少环境变量: ${skill.missing.env.join(", ")}`);
    if (skill.missing.config?.length > 0) missingItems.push(`缺少配置项: ${skill.missing.config.join(", ")}`);

    if (missingItems.length > 0) {
      statusEl.innerHTML = `
        <div class="form-status-block form-status-warning">
          <div class="form-status-title">
            <i class="fa-solid fa-triangle-exclamation"></i>缺少运行条件
          </div>
          <ul class="form-status-list">
            ${missingItems.map(i => `<li>${escapeHtml(i)}</li>`).join("")}
          </ul>
        </div>`;
    } else if (skill.eligible) {
      statusEl.innerHTML = `
        <div class="form-status-block form-status-success">
          <i class="fa-solid fa-circle-check"></i> 所有运行条件已满足，技能正常工作中。
        </div>`;
    } else {
      statusEl.innerHTML = "";
    }

    // API Key 区域
    const apiKeySection = $("skill-config-apikey-section");
    const apiKeyInput = $("skill-config-apikey");
    if (skill.primaryEnv) {
      apiKeySection?.classList.remove("is-hidden");
      $("skill-config-primary-env").textContent = skill.primaryEnv;
      apiKeyInput.value = "";
    } else {
      apiKeySection?.classList.add("is-hidden");
    }

    // 环境变量区域
    const envRowsContainer = $("skill-config-env-rows");
    const envEmptyHint = $("skill-config-env-empty");
    envRowsContainer.innerHTML = "";
    const missingEnvs = (skill.missing.env || []).filter(e => e !== skill.primaryEnv);
    if (missingEnvs.length > 0) {
      for (const envName of missingEnvs) {
        addSkillEnvRow(envRowsContainer, envName, "", true);
      }
      envEmptyHint?.classList.add("is-hidden");
    } else {
      envEmptyHint?.classList.remove("is-hidden");
    }

    // 安装按钮
    const installBtn = $("skill-config-install-btn");
    if (skill.install?.length > 0 && skill.missing.bins?.length > 0) {
      installBtn?.classList.remove("is-hidden");
      $("skill-config-install-label").textContent = skill.install[0].label || "安装依赖";
      installBtn.setAttribute("data-install-name", skill.name);
      installBtn.setAttribute("data-install-id", skill.install[0].id);
      installBtn.setAttribute("data-skill-key", skill.key);
    } else {
      installBtn?.classList.add("is-hidden");
    }

    // 存储当前 skill key
    $("skill-config-save-btn").setAttribute("data-current-skill", skillKey);

    // 显示 Modal
    setSkillModalOpen(true);
    return;
  }

  // 关闭 Modal
  const closeTrigger = e.target.closest("[data-skill-modal-close]");
  if (closeTrigger) {
    setSkillModalOpen(false);
    return;
  }

  // 添加环境变量行
    if (e.target.closest("#skill-config-env-add")) {
      const envRows = $("skill-config-env-rows");
      if (envRows) {
        addSkillEnvRow(envRows, "", "", false);
        const envEmpty = $("skill-config-env-empty");
        envEmpty?.classList.add("is-hidden");
      }
      return;
    }

  // 删除环境变量行
  if (e.target.closest(".env-row-delete")) {
    const row = e.target.closest(".env-row");
    if (row) row.remove();
    const envRows = $("skill-config-env-rows");
    const envEmpty = $("skill-config-env-empty");
    if (envRows && envEmpty && envRows.children.length === 0) {
      envEmpty.classList.remove("is-hidden");
    }
    return;
  }

  // 保存配置
  const saveBtn = e.target.closest("#skill-config-save-btn");
  if (saveBtn) {
    const skillKey = saveBtn.getAttribute("data-current-skill");
    if (!skillKey) return;

    saveBtn.disabled = true;
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> 正在保存...';

    try {
      const payload = { skillKey };

      // API Key
      const apiKeyInput = $("skill-config-apikey");
      const apiKeySection = $("skill-config-apikey-section");
      if (apiKeySection && !apiKeySection.classList.contains("is-hidden") && apiKeyInput?.value?.trim()) {
        payload.apiKey = apiKeyInput.value.trim();
      }

      // 环境变量
      const envRows = document.querySelectorAll("#skill-config-env-rows .env-row");
      if (envRows.length > 0) {
        const env = {};
        for (const row of envRows) {
          const key = row.querySelector(".env-key")?.value?.trim();
          const val = row.querySelector(".env-val")?.value?.trim();
          if (key) env[key] = val || "";
        }
        if (Object.keys(env).length > 0) {
          payload.env = env;
        }
      }

      await api("/api/skills/update", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      // 关闭弹窗并重载列表
      setSkillModalOpen(false);
      await loadSkills();

    } catch (err) {
      alert(`保存配置时发生错误：\n\n${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
    return;
  }

  // 安装依赖
  const installBtn = e.target.closest("#skill-config-install-btn");
  if (installBtn) {
    const name = installBtn.getAttribute("data-install-name");
    const installId = installBtn.getAttribute("data-install-id");
    if (!name || !installId) return;

    installBtn.disabled = true;
    const originalText = installBtn.innerHTML;
    installBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> 正在安装...';

    try {
      await api("/api/skills/install", {
        method: "POST",
        body: JSON.stringify({ name, installId })
      });
      setSkillModalOpen(false);
      await loadSkills();
    } catch (err) {
      alert(`安装失败：\n\n${err.message}`);
    } finally {
      installBtn.disabled = false;
      installBtn.innerHTML = originalText;
    }
    return;
  }
});

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
    formWrap.classList.add("cron-form-wrap-loading");
    formWrap.classList.remove("cron-form-wrap-ready");
  }

  target.innerHTML = renderSkeleton(4);

  if (!$("cron-job-json").value.trim()) {
    $("cron-job-json").value = JSON.stringify(cronTemplate(), null, 2);
  }

  try {
    const data = await api("/api/cron/list?includeDisabled=true");

    // 数据拉取成功后，开始展示动画
    if (formWrap) {
      formWrap.classList.remove("cron-form-wrap-loading");
      requestAnimationFrame(() => {
        formWrap.classList.add("cron-form-wrap-ready");
      });
    }
    const jobs = data.jobs || [];
    if (jobs.length === 0) {
      target.innerHTML = renderEmpty("fa-solid fa-calendar-xmark", "暂无任务", "计划表里空荡荡的，点击下方模板创建一个？");
      return;
    }

    const html = `<div class="dashboard-grid dashboard-grid-compact">` + jobs.map((r) => {
      const sch = r.schedule || {};
      let badge = '';
      if (sch.kind === 'at') {
        const timeStr = new Date(sch.at).toLocaleString();
        badge = `<span class="cron-badge cron-badge-at"><i class="fa-regular fa-clock icon-prefix-md"></i>一次性: ${timeStr}</span>`;
      } else if (sch.kind === 'cron') {
        let expr = sch.human || sch.expr;
        if (expr && expr.startsWith('在 ')) expr = expr.substring(2);
        if (expr && expr.startsWith('在')) expr = expr.substring(1);
        badge = `<span class="cron-badge cron-badge-cron"><i class="fa-solid fa-rotate icon-prefix-md"></i>周期: ${escapeHtml(expr)}</span>`;
      } else if (sch.kind === 'every') {
        const ms = parseInt(sch.everyMs, 10);
        const desc = ms >= 60000 ? `每 ${Math.round(ms / 60000)} 分钟` : `每 ${Math.round(ms / 1000)} 秒`;
        badge = `<span class="cron-badge cron-badge-every"><i class="fa-solid fa-stopwatch icon-prefix-md"></i>循环: ${desc}</span>`;
      } else {
        badge = `<code class="cron-badge-code">${escapeHtml(JSON.stringify(sch))}</code>`;
      }

      const stateInfo = r.state || {};
      let statusBadge = '<span class="cron-status-empty">-</span>';
      if (typeof stateInfo.runningAtMs === 'number') {
        statusBadge = '<span class="cron-status-running"><i class="fa-solid fa-spinner fa-spin icon-prefix-sm"></i>执行中</span>';
      } else if (stateInfo.lastStatus === 'ok') {
        statusBadge = '<span class="cron-status-ok"><i class="fa-solid fa-check-circle icon-prefix-sm"></i>运行成功</span>';
      } else if (stateInfo.lastStatus === 'error') {
        statusBadge = '<span class="cron-status-error"><i class="fa-solid fa-xmark-circle icon-prefix-sm"></i>运行失败</span>';
      } else if (stateInfo.lastStatus) {
        statusBadge = `<span>${escapeHtml(stateInfo.lastStatus)}</span>`;
      }
      const timeStr = stateInfo.lastRunAtMs ? `<div class="panel-time-note"><i class="fa-regular fa-clock icon-prefix-sm"></i>上次运行时间: ${new Date(stateInfo.lastRunAtMs).toLocaleString()}</div>` : "";

      return `
        <div class="glass-panel glass-panel-card" data-spotlight>
          <div class="panel-head">
            <div class="panel-head-main">
              <strong class="panel-head-title">${escapeHtml(r.name || "(unnamed)")}</strong>
              <span class="panel-head-subtitle">${escapeHtml(r.id)}</span>
            </div>
            <label class="switch-toggle panel-switch-offset">
              <input type="checkbox" data-cron-enabled="${escapeHtml(r.id)}" ${r.enabled ? "checked" : ""} />
              <span class="slider"><span class="knob"></span></span>
            </label>
          </div>
          
          <div class="panel-inline-list">
            ${badge}
          </div>

          <div class="panel-soft-box">
            <div class="panel-soft-text">${statusBadge}</div>
            ${timeStr}
          </div>
          
          <div class="action-btn-row">
            <button data-cron-run="${escapeHtml(r.id)}" class="action-btn play-btn action-btn-fill action-btn-run" title="立即执行"><i class="fa-solid fa-play icon-prefix-md"></i>执行</button>
            <button data-cron-runs="${escapeHtml(r.id)}" class="action-btn log-btn action-btn-fill" title="运行日志"><i class="fa-solid fa-clock-rotate-left icon-prefix-md"></i>日志</button>
            <button data-cron-remove="${escapeHtml(r.id)}" class="action-btn danger-action-btn action-btn-fill" title="删除任务"><i class="fa-solid fa-trash-can icon-prefix-md"></i>删除</button>
          </div>
        </div>
      `;
    }).join("") + `</div>`;

    target.innerHTML = html;

    for (const checkbox of target.querySelectorAll("[data-cron-enabled]")) {
      checkbox.addEventListener("change", async () => {
        const jobId = checkbox.getAttribute("data-cron-enabled");
        const enabled = checkbox.checked;
        if (!jobId) return;
        try {
          await api("/api/cron/update", {
            method: "POST",
            body: JSON.stringify({ jobId, patch: { enabled } })
          });
        } catch (err) {
          showToast(err.message || String(err), "error");
          checkbox.checked = !enabled;
        }
      });
    }

    for (const btn of target.querySelectorAll("[data-cron-run]")) {
      btn.addEventListener("click", async () => {
        const jobId = btn.getAttribute("data-cron-run");
        if (!jobId) return;
        btn.disabled = true;
        const origHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin icon-prefix-md"></i>执行中';
        try {
          await api("/api/cron/run", { method: "POST", body: JSON.stringify({ jobId }) });
          showToast("任务执行完成", "success");
        } catch (err) {
          const msg = (err.message || String(err)).toLowerCase();
          if (msg.includes("timeout") || msg.includes("timed out")) {
            showToast("任务已开始执行，等待完成中…", "info");
          } else {
            showToast(err.message || String(err), "error");
          }
        } finally {
          await loadCron();
          btn.disabled = false;
          btn.innerHTML = origHTML;
        }
      });
    }

    for (const btn of target.querySelectorAll("[data-cron-runs]")) {
      btn.addEventListener("click", async () => {
        const jobId = btn.getAttribute("data-cron-runs");
        if (!jobId) return;
        btn.disabled = true;
        try {
          const runs = await api(`/api/cron/runs?jobId=${encodeURIComponent(jobId)}`);
          const list = Array.isArray(runs) ? runs : (runs?.entries || runs?.runs || runs?.data || []);
          openCronRunsModal(jobId, list);
        } catch (err) {
          showToast(err.message || String(err), "error");
        } finally {
          btn.disabled = false;
        }
      });
    }

    for (const btn of target.querySelectorAll("[data-cron-remove]")) {
      btn.addEventListener("click", async () => {
        const jobId = btn.getAttribute("data-cron-remove");
        if (!jobId) return;
        const confirmed = await requestConfirmDialog({
          title: "删除计划任务",
          message: `确定删除任务 ${jobId} 吗？`,
          confirmText: "确认删除",
          cancelText: "取消",
          variant: "danger"
        });
        if (!confirmed) return;
        try {
          await api("/api/cron/remove", { method: "POST", body: JSON.stringify({ jobId }) });
          showToast(`任务 ${jobId} 已删除`, "success");
          await loadCron();
        } catch (err) {
          showToast(err.message || String(err), "error");
        }
      });
    }
  } catch (err) {
    if (formWrap) {
      formWrap.classList.remove("cron-form-wrap-loading");
      formWrap.classList.add("cron-form-wrap-ready");
    }
    target.textContent = err.message;
  }
}

async function addCronJob() {
  try {
    let job;

    if (state.cronJsonMode) {
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
          parsedMs = evaluateArithmetic(value);
        } catch (e) {
          parsedMs = parseInt(value, 10);
        }
        if (!Number.isFinite(parsedMs) || parsedMs <= 0) {
          showToast("间隔时间格式无效，请输入大于 0 的毫秒值或算式。", "error");
          return;
        }
        schedule.everyMs = Math.round(parsedMs);
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

    await api("/api/cron/add", {
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

function updateNodeCommandOptions(commands) {
  const normalized = Array.from(new Set((commands || []).map((item) => String(item).trim()).filter(Boolean)));
  state.nodeCommandDefaults = normalized;
  const list = $("node-command-options");
  if (list) {
    list.innerHTML = normalized.map((cmd) => `<option value="${escapeHtml(cmd)}"></option>`).join("");
  }
  const commandInput = $("node-command");
  if (commandInput && normalized.length > 0) {
    const current = commandInput.value.trim();
    if (!current || !normalized.includes(current)) {
      commandInput.value = normalized[0];
    }
  }
}

// =========================================
// 用量统计 (Usage / Metrics)
// =========================================

function renderUsageBarSection(title, icon, items, valueKey, labelKey, formatValue) {
  if (!items || items.length === 0) {
    return `
      <div class="glass-panel usage-section" data-spotlight>
        <div class="usage-section-head">
          <i class="${escapeHtml(icon)} usage-section-icon"></i>
          <span class="usage-section-title">${escapeHtml(title)}</span>
        </div>
        ${renderEmpty("fa-solid fa-inbox", "暂无数据", "该模块数据暂时不可用。")}
      </div>`;
  }
  const max = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 1);
  const bars = items.map((item) => {
    const raw = Number(item[valueKey]) || 0;
    const pct = Math.min(100, Math.max(1, (raw / max) * 100));
    const label = escapeHtml(String(item[labelKey] || "-"));
    const display = formatValue ? escapeHtml(formatValue(raw)) : escapeHtml(String(raw));
    return `
      <div class="usage-bar-row">
        <span class="usage-bar-label">${label}</span>
        <div class="usage-bar-track">
          <div class="usage-bar-fill" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <span class="usage-bar-value">${display}</span>
      </div>`;
  }).join("");
  return `
    <div class="glass-panel usage-section" data-spotlight>
      <div class="usage-section-head">
        <i class="${escapeHtml(icon)} usage-section-icon"></i>
        <span class="usage-section-title">${escapeHtml(title)}</span>
      </div>
      <div class="usage-bar-list">${bars}</div>
    </div>`;
}

function renderUsageStatCards(title, icon, stats) {
  if (!stats || stats.length === 0) {
    return `
      <div class="glass-panel usage-section" data-spotlight>
        <div class="usage-section-head">
          <i class="${escapeHtml(icon)} usage-section-icon"></i>
          <span class="usage-section-title">${escapeHtml(title)}</span>
        </div>
        ${renderEmpty("fa-solid fa-inbox", "暂无数据", "该模块数据暂时不可用。")}
      </div>`;
  }
  const cards = stats.map((s) => `
    <div class="usage-stat-card">
      <span class="usage-stat-value">${escapeHtml(s.value)}</span>
      <span class="usage-stat-label">${escapeHtml(s.label)}</span>
    </div>`).join("");
  return `
    <div class="glass-panel usage-section" data-spotlight>
      <div class="usage-section-head">
        <i class="${escapeHtml(icon)} usage-section-icon"></i>
        <span class="usage-section-title">${escapeHtml(title)}</span>
      </div>
      <div class="usage-stat-grid">${cards}</div>
    </div>`;
}

function formatCost(v) {
  return "$" + Number(v).toFixed(2);
}

function formatCount(v) {
  const n = Number(v);
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

async function loadUsage() {
  const container = $("usage-content");
  container.innerHTML = renderSkeleton(5);

  try {
    const data = await api("/api/usage");

    let html = "";

    // 每日用量趋势 — cost.daily[] → { date, totalTokens }
    const daily = (data.cost?.daily || []).slice(-14);
    const dailyItems = daily.map(d => ({
      name: d.date ? d.date.slice(5) : "-",
      value: d.totalTokens || 0
    }));
    html += renderUsageBarSection(
      "每日用量趋势", "fa-solid fa-chart-bar",
      dailyItems, "value", "name", formatCount
    );

    // 模型用量 — sessions.aggregates.byModel[]
    // { provider?, model?, count, totals: { totalTokens, ... } }
    const byModel = data.sessions?.aggregates?.byModel || [];
    const modelItems = byModel
      .filter(m => m.totals && m.totals.totalTokens > 0)
      .map(m => ({
        name: m.model || [m.provider, m.model].filter(Boolean).join("/") || "-",
        value: m.totals.totalTokens
      }))
      .sort((a, b) => b.value - a.value);
    html += renderUsageBarSection(
      "模型用量", "fa-solid fa-microchip",
      modelItems, "value", "name", formatCount
    );

    // 会话统计 — 综合 sessions + cost 数据
    const totals = data.sessions?.totals || data.cost?.totals || {};
    const msgs = data.sessions?.aggregates?.messages || {};
    const tools = data.sessions?.aggregates?.tools || {};
    const sessionCount = (data.sessions?.sessions || []).length;
    const sessionStats = [];
    if (sessionCount > 0) sessionStats.push({ label: "总会话数", value: formatCount(sessionCount) });
    if (msgs.total > 0) sessionStats.push({ label: "消息总数", value: formatCount(msgs.total) });
    if (tools.totalCalls > 0) sessionStats.push({ label: "工具调用", value: formatCount(tools.totalCalls) });
    if (totals.totalTokens > 0) sessionStats.push({ label: "Token 总量", value: formatCount(totals.totalTokens) });
    if (totals.totalCost > 0) sessionStats.push({ label: "累计费用", value: formatCost(totals.totalCost) });
    html += renderUsageStatCards("会话统计", "fa-solid fa-chart-pie", sessionStats);

    container.innerHTML = `<div class="usage-layout">${html}</div>`;
    refreshSpotlightsAfterLayout();
  } catch (err) {
    container.innerHTML = renderEmpty("fa-solid fa-triangle-exclamation", "加载失败", escapeHtml(err.message));
  }
}

async function loadNodes() {
  const target = $("nodes-list");
  const detailPanel = $("nodes-detail");
  if (detailPanel) detailPanel.hidden = true;

  target.innerHTML = renderSkeleton(3);
  try {
    const data = await api("/api/nodes");
    const nodes = data.nodes || [];
    if (nodes.length === 0) {
      target.innerHTML = renderEmpty("fa-solid fa-network-wired", "未发现节点", "当前的什亭之箱还没有连接任何外部节点～");
      updateNodeCommandOptions([]);
      return;
    }
    const rows = nodes.map((node) => ({
      ...node,
      commandList: Array.isArray(node.commands) ? node.commands : [],
      capsList: Array.isArray(node.caps) ? node.caps : [],
      capsDisplay: (node.caps || []).join(", ")
    }));
    const nodeDataMap = new Map(rows.map((row) => [String(row.nodeId || ""), row]));

    const onlineCount = rows.filter((r) => r.connected).length;
    const offlineCount = rows.length - onlineCount;
    const summaryHtml = `
      <div class="node-summary-bar">
        <span class="status-badge status-badge-tight ok"><i class="fa-solid fa-circle icon-prefix-sm"></i>${onlineCount} 在线</span>
        <span class="status-badge status-badge-tight ${offlineCount > 0 ? 'warn' : 'ok'}"><i class="fa-regular fa-circle icon-prefix-sm"></i>${offlineCount} 离线</span>
        <span class="status-badge status-badge-tight dynamic">${rows.length} 总节点</span>
      </div>`;

    const cardsHtml = rows.map((r) => {
      const statusClass = r.connected ? 'ok' : 'warn';
      const statusText = r.connected ? '在线' : '离线';
      const capsCount = r.capsList.length;

      return `
        <div class="glass-panel node-row node-card glass-panel-card" data-node-id="${escapeHtml(r.nodeId)}" data-spotlight>
          <div class="panel-head">
            <div class="panel-head-main">
              <strong class="panel-head-title">${escapeHtml(r.displayName || r.nodeId)}</strong>
              <span class="panel-head-subtitle">${escapeHtml(r.nodeId)}</span>
            </div>
            <span class="status-badge status-badge-tight ${statusClass}">
               <i class="${r.connected ? 'fa-solid fa-link' : 'fa-solid fa-link-slash'} icon-prefix-sm"></i>${statusText}
            </span>
          </div>
          <div class="node-meta-grid">
            <div class="node-meta-item">
              <span class="node-meta-label">运行平台</span>
              <span class="node-meta-value">${escapeHtml(r.platform || "-")}</span>
            </div>
            <div class="node-meta-item">
              <span class="node-meta-label">远程 IP</span>
              <span class="node-meta-value">${escapeHtml(r.remoteIp || "-")}</span>
            </div>
            <div class="node-meta-item">
              <span class="node-meta-label">能力数</span>
              <span class="node-meta-value">${capsCount}</span>
            </div>
            <div class="node-meta-item">
              <span class="node-meta-label">命令数</span>
              <span class="node-meta-value">${r.commandList.length}</span>
            </div>
          </div>
        </div>`;
    }).join("");

    target.innerHTML = summaryHtml + `<div class="dashboard-grid dashboard-grid-compact">${cardsHtml}</div>`;

    for (const card of target.querySelectorAll(".node-card")) {
      const nodeId = card.getAttribute("data-node-id");
      if (!nodeId) continue;
      card.addEventListener("click", () => {
        const nodeData = nodeDataMap.get(nodeId);
        if (nodeData) selectNode(nodeData);
      });
    }

    refreshSpotlightsAfterLayout();
  } catch (err) {
    target.innerHTML = renderEmpty("fa-solid fa-triangle-exclamation", "加载失败", escapeHtml(err.message));
  }
  loadNodePairing();
}

function selectNode(nodeData) {
  const nodeId = String(nodeData.nodeId || "").trim();
  if (!nodeId) return;

  // Highlight selected card
  for (const card of document.querySelectorAll("#nodes-list .node-card")) {
    card.classList.toggle("node-card-selected", card.getAttribute("data-node-id") === nodeId);
  }

  // Populate hidden input + command options
  const nodeInput = $("node-id");
  if (nodeInput) nodeInput.value = nodeId;
  updateNodeCommandOptions(nodeData.commandList || []);

  // Render detail panel
  renderNodeDetail(nodeData);
}

function renderNodeDetail(nodeData) {
  const panel = $("nodes-detail");
  if (!panel) return;

  const nodeId = String(nodeData.nodeId || "");
  const title = $("node-detail-title");
  const subtitle = $("node-detail-subtitle");
  if (title) title.textContent = nodeData.displayName || nodeId;
  if (subtitle) {
    const renameDisabled = !nodeData.connected;
    subtitle.innerHTML = `${escapeHtml(nodeId)} <button type="button" class="node-rename-btn${renameDisabled ? ' disabled' : ''}" ${renameDisabled ? 'disabled title="节点离线时无法重命名"' : `onclick="renameNode('${escapeHtml(nodeId)}','${escapeHtml(String(nodeData.displayName || nodeId).replace(/'/g, "\\'"))}')" title="重命名"`}><i class="fa-solid fa-pen"></i></button>`;
  }

  const body = $("node-detail-body");
  if (!body) return;

  const capsList = Array.isArray(nodeData.capsList) ? nodeData.capsList : [];
  const commandList = Array.isArray(nodeData.commandList) ? nodeData.commandList : [];

  const capsHtml = capsList.length > 0
    ? capsList.map((c) => `<span class="node-tag node-tag-cap">${escapeHtml(c)}</span>`).join("")
    : '<span class="node-detail-empty">无已注册能力</span>';

  const cmdsHtml = commandList.length > 0
    ? commandList.map((c) => `<span class="node-tag node-tag-cmd">${escapeHtml(c)}</span>`).join("")
    : '<span class="node-detail-empty">无可用命令</span>';

  body.innerHTML = `
    <div class="node-detail-section">
      <div class="node-meta-grid">
        <div class="node-meta-item">
          <span class="node-meta-label">运行平台</span>
          <span class="node-meta-value">${escapeHtml(nodeData.platform || "-")}</span>
        </div>
        <div class="node-meta-item">
          <span class="node-meta-label">远程 IP</span>
          <span class="node-meta-value">${escapeHtml(nodeData.remoteIp || "-")}</span>
        </div>
        <div class="node-meta-item">
          <span class="node-meta-label">连接状态</span>
          <span class="status-badge status-badge-tight ${nodeData.connected ? 'ok' : 'warn'}">
            <i class="${nodeData.connected ? 'fa-solid fa-link' : 'fa-solid fa-link-slash'} icon-prefix-sm"></i>${nodeData.connected ? '在线' : '离线'}
          </span>
        </div>
        <div class="node-meta-item">
          <span class="node-meta-label">版本</span>
          <span class="node-meta-value">${escapeHtml(nodeData.version || "-")}</span>
        </div>
      </div>
    </div>
    <div class="node-detail-section">
      <span class="node-detail-section-title">能力 (${capsList.length})</span>
      <div class="node-tag-list">${capsHtml}</div>
    </div>
    <div class="node-detail-section">
      <span class="node-detail-section-title">命令 (${commandList.length})</span>
      <div class="node-tag-list">${cmdsHtml}</div>
    </div>`;

  panel.hidden = false;
  refreshSpotlightsAfterLayout();
}

async function invokeNodeCommand() {
  try {
    const nodeId = $("node-id").value.trim();
    const command = $("node-command").value.trim();
    const params = JSON.parse($("node-params").value || "{}");
    if (!nodeId || !command) throw new Error("请选中节点并填写命令");

    const result = await api("/api/nodes/invoke", {
      method: "POST",
      body: JSON.stringify({ nodeId, command, params, timeoutMs: 15000 })
    });
    $("node-result").textContent = JSON.stringify(result, null, 2);
  } catch (err) {
    showError("node-result", err);
  }
}

async function loadNodePairing() {
  const container = $("nodes-pairing");
  if (!container) return;

  try {
    const data = await api("/api/nodes/pairing");
    const pending = Array.isArray(data.pending) ? data.pending : [];
    const paired = Array.isArray(data.paired) ? data.paired : [];

    let html = "";

    // 配对指引 — 始终显示，折叠式
    html += `
      <details class="glass-panel node-guide-panel" data-spotlight>
        <summary class="node-guide-summary">
          <i class="fa-solid fa-circle-question node-guide-icon"></i>
          <span>如何添加新节点？</span>
          <i class="fa-solid fa-chevron-down node-guide-chevron"></i>
        </summary>
        <div class="node-guide-body">
          <div class="node-guide-steps">
            <div class="node-guide-step">
              <span class="node-guide-step-num">1</span>
              <div class="node-guide-step-content">
                <strong>在远端机器上安装 OpenClaw</strong>
                <code class="node-guide-code">npm i -g openclaw@latest</code>
              </div>
            </div>
            <div class="node-guide-step">
              <span class="node-guide-step-num">2</span>
              <div class="node-guide-step-content">
                <strong>配置网关地址和认证</strong>
                <code class="node-guide-code">openclaw config set gateway.url ws://&lt;网关IP&gt;:18789</code>
                <code class="node-guide-code">openclaw config set gateway.auth.password &lt;密码&gt;</code>
                <p class="node-guide-hint">网关 IP 和密码请在服务器 .env.local 文件中查看。</p>
              </div>
            </div>
            <div class="node-guide-step">
              <span class="node-guide-step-num">3</span>
              <div class="node-guide-step-content">
                <strong>启动网关节点</strong>
                <code class="node-guide-code">openclaw gateway run --bind loopback --port 18789</code>
                <p class="node-guide-hint">节点启动后会自动连接主网关并发起配对请求。</p>
              </div>
            </div>
            <div class="node-guide-step">
              <span class="node-guide-step-num">4</span>
              <div class="node-guide-step-content">
                <strong>在本页面批准配对</strong>
                <p class="node-guide-hint">待配对请求会出现在下方列表，点击「批准」即可完成配对。</p>
              </div>
            </div>
          </div>
        </div>
      </details>`;

    // 待配对请求
    if (pending.length > 0) {
      const pendingCards = pending.map((req) => {
        const name = escapeHtml(req.displayName || req.nodeId || "未命名节点");
        const nodeId = escapeHtml(req.nodeId || "-");
        const platform = escapeHtml(req.platform || "-");
        const ip = escapeHtml(req.remoteIp || "-");
        const requestId = escapeHtml(req.requestId || "");
        const timeAgo = req.ts ? formatTimeAgo(req.ts) : "";
        return `
          <div class="glass-panel node-pairing-card" data-spotlight>
            <div class="panel-head">
              <div class="panel-head-main">
                <strong class="panel-head-title">${name}</strong>
                <span class="panel-head-subtitle">${nodeId}</span>
              </div>
              <span class="status-badge status-badge-tight accent"><i class="fa-solid fa-clock icon-prefix-sm"></i>待配对</span>
            </div>
            <div class="node-meta-grid">
              <div class="node-meta-item">
                <span class="node-meta-label">平台</span>
                <span class="node-meta-value">${platform}</span>
              </div>
              <div class="node-meta-item">
                <span class="node-meta-label">远程 IP</span>
                <span class="node-meta-value">${ip}</span>
              </div>
              ${timeAgo ? `<div class="node-meta-item"><span class="node-meta-label">请求时间</span><span class="node-meta-value">${escapeHtml(timeAgo)}</span></div>` : ""}
            </div>
            <div class="node-pairing-actions">
              <button type="button" class="btn-primary btn-size-sm" onclick="approveNodePairing('${requestId}')"><i class="fa-solid fa-check"></i> 批准</button>
              <button type="button" class="btn-danger btn-size-sm" onclick="rejectNodePairing('${requestId}')"><i class="fa-solid fa-xmark"></i> 拒绝</button>
            </div>
          </div>`;
      }).join("");
      html += `
        <div class="node-pairing-section">
          <h3 class="node-pairing-section-title"><i class="fa-solid fa-handshake"></i> 待配对请求 (${pending.length})</h3>
          <div class="dashboard-grid dashboard-grid-compact">${pendingCards}</div>
        </div>`;
    }

    container.innerHTML = html;
    refreshSpotlightsAfterLayout();
  } catch {
    // 配对功能非关键路径，静默失败
  }
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return Math.floor(diff / 60000) + " 分钟前";
  if (diff < 86400000) return Math.floor(diff / 3600000) + " 小时前";
  return Math.floor(diff / 86400000) + " 天前";
}

async function approveNodePairing(requestId) {
  if (!requestId) return;
  try {
    await api("/api/nodes/pairing/approve", {
      method: "POST",
      body: JSON.stringify({ requestId })
    });
    showToast("配对已批准", "success");
    await loadNodes();
  } catch (err) {
    showToast("批准失败: " + (err.message || err), "error");
  }
}

async function rejectNodePairing(requestId) {
  if (!requestId) return;
  try {
    await api("/api/nodes/pairing/reject", {
      method: "POST",
      body: JSON.stringify({ requestId })
    });
    showToast("配对已拒绝", "success");
    await loadNodePairing();
  } catch (err) {
    showToast("拒绝失败: " + (err.message || err), "error");
  }
}

async function renameNode(nodeId, currentName) {
  if (!nodeId) return;
  const newName = await requestPromptDialog({
    title: "重命名节点",
    message: "请输入新的节点显示名称",
    placeholder: "节点名称",
    defaultValue: currentName || "",
    confirmText: "保存",
    cancelText: "取消"
  });
  if (!newName) return;
  try {
    await api("/api/nodes/rename", {
      method: "POST",
      body: JSON.stringify({ nodeId, displayName: newName })
    });
    showToast("重命名成功", "success");
    await loadNodes();
  } catch (err) {
    showToast("重命名失败: " + (err.message || err), "error");
  }
}
window.approveNodePairing = approveNodePairing;
window.rejectNodePairing = rejectNodePairing;
window.renameNode = renameNode;

function toTrimmedString(value) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeTrimmedStringList(value) {
  const source = Array.isArray(value) ? value : [];
  const deduped = [];
  const seen = new Set();
  for (const item of source) {
    const trimmed = toTrimmedString(item);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    deduped.push(trimmed);
  }
  return deduped;
}

function formatPersonaScope(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toTrimmedString(item)).filter(Boolean).join(", ");
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return toTrimmedString(value);
}

function normalizePersonaMemorySearch(value) {
  const source = value && typeof value === "object" ? value : {};
  const defaultExtraPaths = normalizeTrimmedStringList(source.defaultExtraPaths);
  const agentExtraPaths = normalizeTrimmedStringList(source.agentExtraPaths);
  const effectiveExtraPaths = normalizeTrimmedStringList(
    Array.isArray(source.effectiveExtraPaths)
      ? source.effectiveExtraPaths
      : [...defaultExtraPaths, ...agentExtraPaths]
  );

  return {
    backend: toTrimmedString(source.backend) || "builtin",
    defaultExtraPaths,
    agentExtraPaths,
    effectiveExtraPaths,
    hasAgentOverride: source.hasAgentOverride === true
  };
}

function unwrapPersonaPayload(payload, key) {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    !(key in payload) &&
    payload.data &&
    typeof payload.data === "object"
  ) {
    return payload.data;
  }
  return payload;
}

function isLikelyMissingPersonaFileError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  if (!message || message.includes("api endpoint not found") || message.includes("unsupported agent file")) {
    return false;
  }
  return message.includes("enoent")
    || message.includes("no such file")
    || message.includes("missing file")
    || (message.includes("file") && message.includes("not found"))
    || (message.includes("workspace") && message.includes("not found"));
}

function looksLikeUrl(value) {
  return /^(https?:\/\/|\/)/i.test(toTrimmedString(value));
}

function getPersonaFileLabel(fileName) {
  const name = toTrimmedString(fileName);
  return PERSONA_FILE_LABELS[name.toLowerCase()] || name.replace(/\.md$/i, "") || "未命名文件";
}

function getPersonaFileTabId(fileName) {
  const slug = toTrimmedString(fileName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `persona-file-tab-${slug || "item"}`;
}

function getPersonaAgentGlyph(agent) {
  const emoji = toTrimmedString(agent?.emoji);
  if (emoji) return Array.from(emoji).slice(0, 2).join("");

  const avatar = toTrimmedString(agent?.avatar);
  if (avatar && !looksLikeUrl(avatar)) {
    return Array.from(avatar).slice(0, 2).join("");
  }

  const fallback = toTrimmedString(agent?.displayName || agent?.agentId || "A");
  return Array.from(fallback).slice(0, 1).join("").toUpperCase() || "A";
}

function getPersonaDisplayName(agent) {
  const name = toTrimmedString(agent?.displayName || agent?.agentId || "未命名 Agent");
  const emoji = toTrimmedString(agent?.emoji);
  return emoji ? `${emoji} ${name}` : name;
}

function resetPersonaFileState() {
  state.persona.files = [];
  state.persona.filesWorkspace = "";
  state.persona.selectedFileName = "";
  state.persona.fileContent = "";
  state.persona.fileOriginalContent = "";
  state.persona.fileMissing = false;
  state.persona.filesLoading = false;
  state.persona.fileLoading = false;
  state.persona.fileSaving = false;
  state.persona.filesError = "";
  state.persona.fileError = "";
}

function normalizePersonaAgent(source, fallbackKey = "", index = 0) {
  if (typeof source === "string") {
    const raw = toTrimmedString(source);
    const agentId = raw || toTrimmedString(fallbackKey) || `agent-${index + 1}`;
    return {
      agentId,
      workspace: "",
      defaultWorkspace: PERSONA_DEFAULT_WORKSPACE,
      effectiveWorkspace: PERSONA_DEFAULT_WORKSPACE,
      workspaceSource: "default",
      displayName: raw || agentId,
      emoji: "",
      avatar: "",
      avatarUrl: "",
      theme: "",
      memorySearch: normalizePersonaMemorySearch(null),
      raw: { agentId }
    };
  }

  const item = source && typeof source === "object" ? source : {};
  const identity = item.identity && typeof item.identity === "object" ? item.identity : {};
  const workspace = toTrimmedString(item.workspace || item.root || item.path || item.dir || "");
  const defaultWorkspace = toTrimmedString(item.defaultWorkspace || "") || PERSONA_DEFAULT_WORKSPACE;
  const effectiveWorkspace = toTrimmedString(item.effectiveWorkspace || workspace || defaultWorkspace || PERSONA_DEFAULT_WORKSPACE) || PERSONA_DEFAULT_WORKSPACE;
  const fallbackId = toTrimmedString(fallbackKey) || workspace || `agent-${index + 1}`;
  const agentId = toTrimmedString(item.agentId || item.id || item.key || fallbackId) || fallbackId;
  const displayName = toTrimmedString(identity.name || item.name || item.label || item.displayName || workspace || agentId) || fallbackId;

  return {
    agentId,
    workspace,
    defaultWorkspace,
    effectiveWorkspace,
    workspaceSource: toTrimmedString(item.workspaceSource || "") || (workspace ? "agents.list.workspace" : "default"),
    displayName,
    emoji: toTrimmedString(identity.emoji || item.emoji || ""),
    avatar: toTrimmedString(identity.avatar || item.avatar || ""),
    avatarUrl: toTrimmedString(identity.avatarUrl || item.avatarUrl || ""),
    theme: toTrimmedString(identity.theme || item.theme || ""),
    memorySearch: normalizePersonaMemorySearch(item.memorySearch),
    raw: item
  };
}

function renderPersonaMemorySearchNote(agent) {
  const info = normalizePersonaMemorySearch(agent?.memorySearch);
  const extraPaths = info.effectiveExtraPaths;
  const helperText = info.hasAgentOverride
    ? "当前 Agent 追加了专属记忆检索路径。"
    : "当前 Agent 继承默认记忆检索路径。";

  return `
    <div class="form-status-block persona-memory-note">
      <div class="form-status-title"><i class="fa-solid fa-brain"></i>记忆检索</div>
      <div class="persona-memory-meta">
        <span>后端：<code class="persona-field-note-code">${escapeHtml(info.backend)}</code></span>
        <span>${escapeHtml(helperText)}</span>
      </div>
      <p class="persona-inline-hint persona-memory-copy">
        <code>MEMORY.md</code> 是当前工作区的人格长期记忆文件；如配置了额外路径，检索时还会一并纳入。
      </p>
      ${extraPaths.length > 0 ? `
        <div class="persona-memory-paths" aria-label="记忆检索额外路径列表">
          ${extraPaths.map((item) => `<code class="persona-memory-path">${escapeHtml(item)}</code>`).join("")}
        </div>
      ` : '<div class="persona-memory-empty">当前未配置额外检索路径。</div>'}
    </div>
  `;
}

function normalizePersonaListPayload(payload) {
  const source = unwrapPersonaPayload(payload, "agents");
  let entries = [];

  if (Array.isArray(source)) {
    entries = source.map((item, index) => [String(index), item]);
  } else if (Array.isArray(source?.agents)) {
    entries = source.agents.map((item, index) => [String(index), item]);
  } else if (source?.agents && typeof source.agents === "object") {
    entries = Object.entries(source.agents);
  }

  const defaultId = toTrimmedString(source?.defaultId || "");
  const agents = entries
    .map(([key, item], index) => normalizePersonaAgent(item, key, index))
    .filter((agent) => Boolean(agent.agentId));

  agents.sort((left, right) => {
    if (left.agentId === defaultId && right.agentId !== defaultId) return -1;
    if (right.agentId === defaultId && left.agentId !== defaultId) return 1;
    return getPersonaDisplayName(left).localeCompare(getPersonaDisplayName(right), "zh-CN");
  });

  return {
    defaultId,
    mainKey: toTrimmedString(source?.mainKey || ""),
    scope: formatPersonaScope(source?.scope),
    agents
  };
}

function mergePersonaFileNames(names = []) {
  const ordered = [];
  const seen = new Map();

  const push = (value, { preferIncoming = false } = {}) => {
    const raw = toTrimmedString(value);
    if (!raw) return;
    const key = raw.toLowerCase();
    const existingIndex = seen.get(key);
    if (existingIndex != null) {
      if (preferIncoming) {
        ordered[existingIndex] = raw;
      }
      return;
    }
    seen.set(key, ordered.length);
    ordered.push(raw);
  };

  PERSONA_FALLBACK_FILES.forEach((name) => {
    push(name);
  });
  for (const name of Array.isArray(names) ? names : []) {
    push(name, { preferIncoming: true });
  }
  return ordered;
}

function normalizePersonaFilesPayload(payload) {
  const source = unwrapPersonaPayload(payload, "files");
  let rawFiles = [];

  if (Array.isArray(source)) {
    rawFiles = source;
  } else if (Array.isArray(source?.files)) {
    rawFiles = source.files;
  } else if (Array.isArray(source?.items)) {
    rawFiles = source.items;
  } else if (Array.isArray(source?.names)) {
    rawFiles = source.names;
  }

  const names = rawFiles
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        if (item.name || item.fileName) {
          return item.name || item.fileName || "";
        }
        if (typeof item.path === "string") {
          const segments = item.path.split(/[\\/]/).filter(Boolean);
          return segments[segments.length - 1] || "";
        }
      }
      return "";
    })
    .map((item) => toTrimmedString(item))
    .filter(Boolean);

  return {
    names: mergePersonaFileNames(names),
    workspace: toTrimmedString(source?.workspace || "")
  };
}

function getPersonaEffectiveWorkspace(agent = getSelectedPersonaAgent()) {
  if (!agent) return PERSONA_DEFAULT_WORKSPACE;
  const filesWorkspace = state.persona.selectedAgentId === agent.agentId ? toTrimmedString(state.persona.filesWorkspace) : "";
  return filesWorkspace || toTrimmedString(agent.effectiveWorkspace || agent.workspace || agent.defaultWorkspace || PERSONA_DEFAULT_WORKSPACE) || PERSONA_DEFAULT_WORKSPACE;
}

function getPersonaWorkspaceSourceLabel(agent = getSelectedPersonaAgent()) {
  if (!agent) return "来源：默认兜底 (~/.openclaw/workspace)";
  const filesWorkspace = state.persona.selectedAgentId === agent.agentId ? toTrimmedString(state.persona.filesWorkspace) : "";
  if (filesWorkspace) {
    return "来源：agents.files.list.workspace";
  }

  const source = toTrimmedString(agent.workspaceSource || "default");
  if (source === "agents.list.workspace") return "来源：agents.list.workspace";
  if (source === "agents.defaults.workspace") return "来源：agents.defaults.workspace（继承）";
  return "来源：默认兜底 (~/.openclaw/workspace)";
}

function normalizePersonaFilePayload(payload, fallbackName) {
  const source = unwrapPersonaPayload(payload, "file");
  const file = source?.file && typeof source.file === "object" ? source.file : source;

  return {
    name: toTrimmedString(file?.name || fallbackName) || fallbackName,
    content: typeof file?.content === "string" ? file.content : "",
    missing: file?.missing === true
  };
}

function getSelectedPersonaAgent() {
  return state.persona.agents.find((agent) => agent.agentId === state.persona.selectedAgentId) || null;
}

function resolvePersonaAgentSelection(agents, { preferredAgentId = "", preferredWorkspace = "" } = {}) {
  const normalizedAgents = Array.isArray(agents) ? agents : [];
  const findById = (value) => normalizedAgents.find((agent) => agent.agentId === value)?.agentId || "";
  const findByWorkspace = (value) => normalizedAgents.find((agent) => (agent.effectiveWorkspace || agent.workspace) === value)?.agentId || "";

  return (
    findById(toTrimmedString(preferredAgentId)) ||
    findByWorkspace(toTrimmedString(preferredWorkspace)) ||
    findById(toTrimmedString(state.persona.selectedAgentId)) ||
    findById(toTrimmedString(state.persona.defaultId)) ||
    normalizedAgents[0]?.agentId ||
    ""
  );
}

function resolvePersonaFileSelection(files, preferredFileName = "") {
  const normalizedFiles = Array.isArray(files) ? files : [];
  const candidates = [preferredFileName, state.persona.selectedFileName, PERSONA_FALLBACK_FILES[0]]
    .map((item) => toTrimmedString(item))
    .filter(Boolean);

  for (const candidate of candidates) {
    const matched = normalizedFiles.find((name) => name.toUpperCase() === candidate.toUpperCase());
    if (matched) return matched;
  }

  return normalizedFiles[0] || "";
}

function isPersonaFileDirty() {
  return state.persona.fileContent !== state.persona.fileOriginalContent;
}

function isPersonaMetadataDirty() {
  const agent = getSelectedPersonaAgent();
  const nameInput = $("persona-agent-name");
  const workspaceInput = $("persona-agent-workspace");
  const avatarInput = $("persona-agent-avatar");
  if (!agent || !nameInput || !workspaceInput || !avatarInput) return false;

  const effectiveWorkspace = getPersonaEffectiveWorkspace(agent);
  const isDefaultAgent = agent.agentId === state.persona.defaultId;

  return toTrimmedString(nameInput.value) !== agent.displayName
    || (!isDefaultAgent && toTrimmedString(workspaceInput.value) !== effectiveWorkspace)
    || toTrimmedString(avatarInput.value) !== (agent.avatar || "");
}

function getPersonaDirtyDraftLabels({ ignore = [] } = {}) {
  const ignored = new Set(Array.isArray(ignore) ? ignore : []);
  const labels = [];

  if (!ignored.has("metadata") && isPersonaMetadataDirty()) {
    labels.push("Agent 元数据");
  }
  if (!ignored.has("file") && isPersonaFileDirty()) {
    const fileName = toTrimmedString(state.persona.selectedFileName);
    labels.push(fileName ? `文件「${fileName}」` : "文件内容");
  }

  return labels;
}

async function confirmDiscardPersonaDrafts({ ignore = [], actionLabel = "继续此操作" } = {}) {
  const dirtyLabels = getPersonaDirtyDraftLabels({ ignore });
  if (dirtyLabels.length === 0) return true;

  return requestConfirmDialog({
    title: "放弃未保存修改",
    message: `以下内容尚未保存：${dirtyLabels.join("、")}。继续后将丢失这些修改，确定要${actionLabel}吗？`,
    confirmText: "放弃修改",
    cancelText: "继续编辑",
    variant: "primary"
  });
}

function renderPersonaPanelHeader({ iconClass, title, subtitle, actionsHtml = "" }) {
  return `
    <div class="panel-header persona-panel-header">
      <div>
        <div class="panel-title panel-title-foreground"><i class="${iconClass} panel-title-icon panel-title-icon-accent"></i>${title}</div>
        <p class="persona-panel-caption">${subtitle}</p>
      </div>
      ${actionsHtml ? `<div class="panel-inline-list persona-panel-actions">${actionsHtml}</div>` : ""}
    </div>
  `;
}

function syncPersonaRefreshButtonState() {
  const button = $("persona-refresh");
  if (!button) return;
  button.disabled = state.persona.loading;
  button.innerHTML = state.persona.loading
    ? '<i class="fa-solid fa-spinner fa-spin"></i> 载入中...'
    : '<i class="fa-solid fa-rotate-right"></i> 重新加载';
}

function updatePersonaSummaryPills() {
  const countPill = $("persona-agent-count-pill");
  const defaultPill = $("persona-default-pill");
  const scopePill = $("persona-scope-pill");

  if (countPill) {
    if (state.persona.loading) {
      countPill.textContent = "Agent 列表载入中";
    } else if (state.persona.listError) {
      countPill.textContent = "列表读取失败";
    } else if (state.persona.agents.length === 0) {
      countPill.textContent = "暂无 Agent";
    } else {
      countPill.textContent = `共 ${state.persona.agents.length} 个 Agent`;
    }
  }

  if (defaultPill) {
    defaultPill.textContent = `默认 Agent：${state.persona.defaultId || "--"}`;
  }

  if (scopePill) {
    scopePill.textContent = `作用域：${state.persona.scope || "--"}`;
    scopePill.title = state.persona.mainKey ? `主入口：${state.persona.mainKey}` : "";
  }
}

function renderPersonaAgentList() {
  const container = $("persona-agent-list");
  if (!container) return;

  if (state.persona.loading) {
    container.innerHTML = renderSkeleton(4);
    return;
  }

  if (state.persona.listError) {
    container.innerHTML = renderEmpty(
      "fa-solid fa-circle-exclamation",
      "Agent 列表加载失败",
      escapeHtml(state.persona.listError)
    );
    return;
  }

  if (state.persona.agents.length === 0) {
    container.innerHTML = renderEmpty(
      "fa-solid fa-user-slash",
      "暂无 Agent",
      "点击上方 + 按钮创建一个 Agent，再继续维护人格 / 提示词文件。"
    );
    return;
  }

  container.innerHTML = state.persona.agents
    .map((agent) => {
      const active = agent.agentId === state.persona.selectedAgentId;
      const effectiveWorkspace = getPersonaEffectiveWorkspace(agent);
      const isMain = state.persona.mainKey && (state.persona.mainKey === agent.agentId || state.persona.mainKey === effectiveWorkspace);
      const badges = [];
      if (agent.agentId === state.persona.defaultId) {
        badges.push('<span class="status-badge status-badge-tight accent">默认</span>');
      }
      if (isMain) {
        badges.push('<span class="status-badge status-badge-tight ok">主入口</span>');
      }
      if (agent.theme) {
        badges.push(`<span class="status-badge status-badge-tight dynamic">${escapeHtml(agent.theme)}</span>`);
      }
      return `
        <button type="button" class="persona-agent-card ${active ? "active" : ""}" data-persona-agent="${escapeHtml(agent.agentId)}" aria-pressed="${active ? "true" : "false"}">
          <span class="persona-agent-bubble">${escapeHtml(getPersonaAgentGlyph(agent))}</span>
          <span class="persona-agent-copy">
            <span class="persona-agent-name">${escapeHtml(getPersonaDisplayName(agent))}</span>
            <span class="persona-agent-workspace">${escapeHtml(getPersonaEffectiveWorkspace(agent))}</span>
            <span class="persona-agent-id">${escapeHtml(agent.agentId)}</span>
          </span>
          <span class="persona-agent-badges">${badges.join("")}</span>
        </button>
      `;
    })
    .join("");
}

function renderPersonaMetadataBar() {
  const agent = getSelectedPersonaAgent();
  if (!agent) return "";

  const isMain = state.persona.mainKey && (state.persona.mainKey === agent.agentId || state.persona.mainKey === getPersonaEffectiveWorkspace(agent));
  const isDefaultAgent = agent.agentId === state.persona.defaultId;
  const badges = [];
  if (isDefaultAgent) {
    badges.push('<span class="status-badge status-badge-tight accent">默认</span>');
  }
  if (isMain) {
    badges.push('<span class="status-badge status-badge-tight ok">主入口</span>');
  }
  if (agent.theme) {
    badges.push(`<span class="status-badge status-badge-tight dynamic">${escapeHtml(agent.theme)}</span>`);
  }

  const effectiveWorkspace = getPersonaEffectiveWorkspace(agent);
  const workspaceSourceLabel = getPersonaWorkspaceSourceLabel(agent);

  return `
    <div class="persona-meta-bar" id="persona-meta-bar">
      <div class="persona-meta-bar-summary" data-persona-meta-toggle>
        <span class="persona-agent-bubble persona-meta-bar-glyph">${escapeHtml(getPersonaAgentGlyph(agent))}</span>
        <span class="persona-meta-bar-info">
          <span class="persona-meta-bar-name">${escapeHtml(getPersonaDisplayName(agent))}</span>
          <span class="persona-meta-bar-workspace">${escapeHtml(effectiveWorkspace)}</span>
        </span>
        <span class="persona-meta-bar-badges">${badges.join("")}</span>
        <i class="fa-solid fa-chevron-down persona-meta-bar-chevron"></i>
      </div>
      <div class="persona-meta-bar-detail">
        <form id="persona-metadata-form" class="persona-form">
          <div class="persona-form-grid">
            <div class="config-row">
              <label for="persona-agent-name">显示名称</label>
              <input id="persona-agent-name" type="text" placeholder="例如：阿洛娜主控" />
            </div>
            <div class="config-row">
              <label for="persona-agent-workspace">工作区</label>
              <input id="persona-agent-workspace" type="text" class="form-control-mono" placeholder="例如：agents/arona-main" ${isDefaultAgent ? 'readonly aria-readonly="true"' : ''} />
              <p class="persona-field-note">
                当前生效：<code class="persona-field-note-code">${escapeHtml(effectiveWorkspace)}</code>
                <span class="persona-field-note-source">${escapeHtml(workspaceSourceLabel)}</span>
                ${isDefaultAgent ? '<span class="persona-field-note-warning">默认 Agent 工作区受保护，如需修改请与 🦞 沟通。</span>' : ''}
              </p>
            </div>
            <div class="config-row persona-field-full">
              <label for="persona-agent-avatar">头像字段</label>
              <input id="persona-agent-avatar" type="text" placeholder="可选：填写头像标识或短文本" />
            </div>
          </div>

          <div class="persona-meta-bar-actions">
            ${isDefaultAgent ? '' : `
              <label class="persona-delete-toggle" for="persona-delete-files">
                <input id="persona-delete-files" type="checkbox" />
                <span>删除时同时清理文件</span>
              </label>
            `}
            <div class="form-inline-actions persona-inline-actions-wrap">
              <button id="persona-agent-reset-btn" type="button" class="panel-action-btn btn-secondary btn-ghost" data-persona-agent-reset>恢复原值</button>
              ${isDefaultAgent ? '' : `
                <button id="persona-agent-delete-btn" type="button" class="panel-action-btn btn-secondary btn-danger" data-persona-agent-delete>
                  <i class="fa-regular fa-trash-can"></i> 删除
                </button>
              `}
              <button id="persona-agent-save-btn" type="submit" class="btn-primary btn-primary-strong">
                <i class="fa-solid fa-floppy-disk"></i> 保存元数据
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}

function resetPersonaMetadataDraft() {
  const agent = getSelectedPersonaAgent();
  if (!agent) return;

  const nameInput = $("persona-agent-name");
  const workspaceInput = $("persona-agent-workspace");
  const avatarInput = $("persona-agent-avatar");
  if (nameInput) nameInput.value = agent.displayName;
  if (workspaceInput) workspaceInput.value = getPersonaEffectiveWorkspace(agent);
  if (avatarInput) avatarInput.value = agent.avatar || "";
  syncPersonaMetadataActionState();
}

function getPersonaFileStatusMeta() {
  if (state.persona.fileSaving) {
    return { text: "正在保存", tone: "dynamic" };
  }
  if (state.persona.filesLoading || state.persona.fileLoading) {
    return { text: "文件载入中", tone: "warn" };
  }
  if (state.persona.filesError || state.persona.fileError) {
    return { text: "读取失败", tone: "bad" };
  }
  if (state.persona.fileMissing) {
    return { text: isPersonaFileDirty() ? "待创建" : "文件未创建", tone: "warn" };
  }
  if (isPersonaFileDirty()) {
    return { text: "未保存改动", tone: "dynamic" };
  }
  return { text: "已同步", tone: "ok" };
}

function renderPersonaFilesPanel() {
  const container = $("persona-files-panel");
  if (!container) return;

  const headerBase = renderPersonaPanelHeader({
    iconClass: "fa-solid fa-file-lines",
    title: "人格 / 提示词文件",
    subtitle: "在当前 Agent 工作区内直接维护 Identity、Soul 与系统提示词资产。"
  });

  if (state.persona.loading && state.persona.agents.length === 0) {
    container.innerHTML = `${headerBase}<div class="persona-panel-body persona-panel-body-padding">${renderSkeleton(4)}</div>`;
    return;
  }

  const agent = getSelectedPersonaAgent();
  if (!agent) {
    const subtitle = state.persona.listError
      ? "请先恢复 Agent 列表读取，再继续编辑提示词文件。"
      : "选择一个 Agent 后，就可以查看并编辑它的人格 / 提示词文件。";
    container.innerHTML = `${headerBase}${renderEmpty("fa-solid fa-scroll", "暂无可编辑文件", subtitle)}`;
    return;
  }

  const selectedFile = resolvePersonaFileSelection(state.persona.files, state.persona.selectedFileName);
  const statusMeta = getPersonaFileStatusMeta();
  const headerHtml = renderPersonaPanelHeader({
    iconClass: "fa-solid fa-file-lines",
    title: "人格 / 提示词文件",
    subtitle: `当前 Agent：${escapeHtml(getPersonaDisplayName(agent))}`,
    actionsHtml: `
      <span id="persona-file-status-pill" class="status-badge status-badge-tight ${statusMeta.tone}" role="status" aria-live="polite">${statusMeta.text}</span>
      <button id="persona-file-reload-btn" type="button" class="panel-action-btn btn-secondary" data-persona-file-reload>
        <i class="fa-solid fa-rotate-right"></i> 重新读取
      </button>
      <button id="persona-file-save-btn" type="button" class="btn-primary btn-primary-strong" data-persona-file-save>
        <i class="fa-solid fa-floppy-disk"></i> 保存文件
      </button>
    `
  });

  if (state.persona.filesError) {
    container.innerHTML = `${headerHtml}${renderEmpty("fa-solid fa-file-circle-xmark", "文件列表加载失败", escapeHtml(state.persona.filesError))}`;
    syncPersonaFileEditorState();
    return;
  }

  const tabsHtml = state.persona.files
    .map((fileName) => {
      const active = fileName.toUpperCase() === selectedFile.toUpperCase();
      const tabId = getPersonaFileTabId(fileName);
      return `
        <button id="${escapeHtml(tabId)}" type="button" class="persona-file-tab ${active ? "active" : ""}" data-persona-file-tab="${escapeHtml(fileName)}" title="${escapeHtml(fileName)}" role="tab" aria-selected="${active ? "true" : "false"}" aria-controls="persona-file-panel" tabindex="${active ? "0" : "-1"}">
          ${escapeHtml(getPersonaFileLabel(fileName))}
        </button>
      `;
    })
    .join("");

  const activeTabId = selectedFile ? getPersonaFileTabId(selectedFile) : "";

  let bodyHtml = "";
  if (state.persona.filesLoading || state.persona.fileLoading) {
    bodyHtml = `<div class="persona-panel-body persona-panel-body-padding">${renderSkeleton(5)}</div>`;
  } else if (state.persona.fileError) {
    bodyHtml = renderEmpty("fa-solid fa-file-circle-exclamation", "文件读取失败", escapeHtml(state.persona.fileError));
  } else {
    const effectiveWorkspace = getPersonaEffectiveWorkspace(agent);
    const details = [effectiveWorkspace ? `工作区：${effectiveWorkspace}` : "", agent.agentId !== effectiveWorkspace ? `Agent ID：${agent.agentId}` : ""]
      .filter(Boolean)
      .join(" · ");
    const fileHint = state.persona.fileMissing
      ? `
        <div class="form-status-block form-status-warning persona-file-status-block">
          <div class="form-status-title"><i class="fa-solid fa-triangle-exclamation"></i>文件尚未创建</div>
          <div>${escapeHtml(selectedFile)} 当前不存在，保存后会按当前内容自动创建。</div>
        </div>
      `
      : '<p class="persona-inline-hint persona-file-hint">支持直接编辑纯文本提示词资产，保存后将同步到网关。</p>';

    bodyHtml = `
      <div id="persona-file-panel" class="persona-panel-body persona-file-content" role="tabpanel" aria-labelledby="${escapeHtml(activeTabId)}">
        <div class="persona-file-toolbar">
          <div class="persona-file-copy">
            <div class="persona-file-title">${escapeHtml(selectedFile)}</div>
            <div class="persona-file-subtitle">${escapeHtml(getPersonaFileLabel(selectedFile))}${details ? ` · ${escapeHtml(details)}` : ""}</div>
          </div>
        </div>
        ${fileHint}
        <textarea id="persona-file-editor" class="skeuo-textarea persona-file-editor" rows="20" spellcheck="false" aria-label="${escapeHtml(selectedFile)} 文件内容"></textarea>
      </div>
    `;
  }

  container.innerHTML = `${headerHtml}${renderPersonaMetadataBar()}<div class="persona-file-tabs" role="tablist" aria-label="Persona 文件列表">${tabsHtml}</div>${bodyHtml}`;

  const agent2 = getSelectedPersonaAgent();
  if (agent2) {
    const nameInput = $("persona-agent-name");
    const workspaceInput = $("persona-agent-workspace");
    const avatarInput = $("persona-agent-avatar");
    if (nameInput) nameInput.value = agent2.displayName;
    if (workspaceInput) workspaceInput.value = getPersonaEffectiveWorkspace(agent2);
    if (avatarInput) avatarInput.value = agent2.avatar || "";
    syncPersonaMetadataActionState();
  }

  const editor = $("persona-file-editor");
  if (editor) {
    editor.value = state.persona.fileContent;
  }
  syncPersonaFileEditorState();
}

function syncPersonaMetadataActionState() {
  const saveBtn = $("persona-agent-save-btn");
  const deleteBtn = $("persona-agent-delete-btn");
  const resetBtn = $("persona-agent-reset-btn");
  const dirty = isPersonaMetadataDirty();

  if (saveBtn) {
    saveBtn.disabled = state.persona.metadataSaving || !dirty;
    saveBtn.innerHTML = state.persona.metadataSaving
      ? '<i class="fa-solid fa-spinner fa-spin"></i> 保存中...'
      : '<i class="fa-solid fa-floppy-disk"></i> 保存元数据';
  }
  if (deleteBtn) deleteBtn.disabled = state.persona.metadataSaving;
  if (resetBtn) resetBtn.disabled = state.persona.metadataSaving || !dirty;
}

function syncPersonaFileEditorState() {
  const editor = $("persona-file-editor");
  if (editor) {
    state.persona.fileContent = editor.value;
    editor.readOnly = state.persona.fileLoading || state.persona.fileSaving;
  }

  const statusPill = $("persona-file-status-pill");
  const meta = getPersonaFileStatusMeta();
  if (statusPill) {
    statusPill.className = `status-badge status-badge-tight ${meta.tone}`;
    statusPill.textContent = meta.text;
  }

  const reloadBtn = $("persona-file-reload-btn");
  if (reloadBtn) {
    reloadBtn.disabled = state.persona.filesLoading || state.persona.fileLoading || state.persona.fileSaving || !state.persona.selectedFileName;
  }

  const saveBtn = $("persona-file-save-btn");
  if (saveBtn) {
    const canSave = Boolean(state.persona.selectedFileName)
      && !state.persona.filesLoading
      && !state.persona.fileLoading
      && !state.persona.fileSaving
      && !state.persona.filesError
      && !state.persona.fileError
      && (state.persona.fileMissing || isPersonaFileDirty());
    saveBtn.disabled = !canSave;
    saveBtn.innerHTML = state.persona.fileSaving
      ? '<i class="fa-solid fa-spinner fa-spin"></i> 保存中...'
      : '<i class="fa-solid fa-floppy-disk"></i> 保存文件';
  }
}

async function loadPersona({ preferredAgentId = "", preferredWorkspace = "", preferredFileName = "" } = {}) {
  const requestId = ++state.persona.listRequestId;
  state.persona.loading = true;
  state.persona.listError = "";
  state.persona.metadataSaving = false;
  updatePersonaSummaryPills();
  syncPersonaRefreshButtonState();
  renderPersonaAgentList();
  renderPersonaFilesPanel();

  try {
    const data = await api("/api/agents");
    if (requestId !== state.persona.listRequestId) return;

    const normalized = normalizePersonaListPayload(data);
    state.persona.agents = normalized.agents;
    state.persona.defaultId = normalized.defaultId;
    state.persona.mainKey = normalized.mainKey;
    state.persona.scope = normalized.scope;
    state.persona.loading = false;
    state.persona.selectedAgentId = resolvePersonaAgentSelection(normalized.agents, {
      preferredAgentId,
      preferredWorkspace
    });

    if (!state.persona.selectedAgentId) {
      resetPersonaFileState();
    }

    updatePersonaSummaryPills();
    syncPersonaRefreshButtonState();
    renderPersonaAgentList();
    renderPersonaFilesPanel();

    if (state.persona.selectedAgentId) {
      await loadPersonaFiles(state.persona.selectedAgentId, { preferredFileName });
    }
  } catch (err) {
    if (requestId !== state.persona.listRequestId) return;
    state.persona.loading = false;
    state.persona.listError = err.message || String(err);
    state.persona.agents = [];
    state.persona.defaultId = "";
    state.persona.mainKey = "";
    state.persona.scope = "";
    state.persona.selectedAgentId = "";
    resetPersonaFileState();
    updatePersonaSummaryPills();
    syncPersonaRefreshButtonState();
    renderPersonaAgentList();
    renderPersonaFilesPanel();
  }
}

async function selectPersonaAgent(agentId) {
  const nextId = toTrimmedString(agentId);
  if (!nextId || nextId === state.persona.selectedAgentId) return;

  const shouldContinue = await confirmDiscardPersonaDrafts({ actionLabel: "切换 Agent" });
  if (!shouldContinue) return;

  const preferredFileName = state.persona.selectedFileName;
  state.persona.selectedAgentId = nextId;
  resetPersonaFileState();
  renderPersonaAgentList();
  renderPersonaFilesPanel();
  await loadPersonaFiles(nextId, { preferredFileName });
}

async function loadPersonaFiles(agentId, { preferredFileName = "" } = {}) {
  const currentAgentId = toTrimmedString(agentId);
  if (!currentAgentId) return;

  const requestId = ++state.persona.filesRequestId;
  state.persona.filesLoading = true;
  state.persona.filesError = "";
  state.persona.fileError = "";
  state.persona.fileLoading = false;
  state.persona.fileSaving = false;
  state.persona.files = mergePersonaFileNames([]);
  state.persona.filesWorkspace = "";
  state.persona.selectedFileName = resolvePersonaFileSelection(state.persona.files, preferredFileName);
  state.persona.fileContent = "";
  state.persona.fileOriginalContent = "";
  state.persona.fileMissing = false;
  renderPersonaFilesPanel();

  try {
    const data = await api(`/api/agents/files?agentId=${encodeURIComponent(currentAgentId)}`);
    if (requestId !== state.persona.filesRequestId || state.persona.selectedAgentId !== currentAgentId) return;

    const normalized = normalizePersonaFilesPayload(data);
    state.persona.files = normalized.names;
    state.persona.filesWorkspace = normalized.workspace;
    state.persona.filesLoading = false;
    state.persona.selectedFileName = resolvePersonaFileSelection(state.persona.files, preferredFileName);
    renderPersonaFilesPanel();

    if (state.persona.selectedFileName) {
      await loadPersonaFile(currentAgentId, state.persona.selectedFileName);
    }
  } catch (err) {
    if (requestId !== state.persona.filesRequestId || state.persona.selectedAgentId !== currentAgentId) return;
    state.persona.filesLoading = false;
    if (isLikelyMissingPersonaFileError(err)) {
      state.persona.files = mergePersonaFileNames([]);
      state.persona.filesWorkspace = "";
      state.persona.selectedFileName = resolvePersonaFileSelection(state.persona.files, preferredFileName);
      state.persona.filesError = "";
      renderPersonaFilesPanel();

      if (state.persona.selectedFileName) {
        await loadPersonaFile(currentAgentId, state.persona.selectedFileName);
      }
      return;
    }
    state.persona.files = [];
    state.persona.filesWorkspace = "";
    state.persona.selectedFileName = "";
    state.persona.filesError = err.message || String(err);
    renderPersonaFilesPanel();
  }
}

async function loadPersonaFile(agentId, fileName) {
  const currentAgentId = toTrimmedString(agentId);
  const targetFileName = toTrimmedString(fileName);
  if (!currentAgentId || !targetFileName) return;

  const requestId = ++state.persona.fileRequestId;
  state.persona.selectedFileName = targetFileName;
  state.persona.fileLoading = true;
  state.persona.fileSaving = false;
  state.persona.fileError = "";
  renderPersonaFilesPanel();

  try {
    const data = await api(`/api/agents/file?agentId=${encodeURIComponent(currentAgentId)}&name=${encodeURIComponent(targetFileName)}`);
    if (
      requestId !== state.persona.fileRequestId ||
      state.persona.selectedAgentId !== currentAgentId ||
      state.persona.selectedFileName.toUpperCase() !== targetFileName.toUpperCase()
    ) {
      return;
    }

    const normalized = normalizePersonaFilePayload(data, targetFileName);
    if (!state.persona.files.some((name) => name.toUpperCase() === normalized.name.toUpperCase())) {
      state.persona.files = mergePersonaFileNames([...state.persona.files, normalized.name]);
    }
    state.persona.selectedFileName = normalized.name;
    state.persona.fileContent = normalized.content;
    state.persona.fileOriginalContent = normalized.content;
    state.persona.fileMissing = normalized.missing === true;
    state.persona.fileLoading = false;
    renderPersonaFilesPanel();
  } catch (err) {
    if (requestId !== state.persona.fileRequestId || state.persona.selectedAgentId !== currentAgentId) return;
    state.persona.fileLoading = false;
    if (isLikelyMissingPersonaFileError(err)) {
      if (!state.persona.files.some((name) => name.toLowerCase() === targetFileName.toLowerCase())) {
        state.persona.files = mergePersonaFileNames([...state.persona.files, targetFileName]);
      }
      state.persona.fileContent = "";
      state.persona.fileOriginalContent = "";
      state.persona.fileMissing = true;
      state.persona.fileError = "";
      renderPersonaFilesPanel();
      return;
    }
    state.persona.fileContent = "";
    state.persona.fileOriginalContent = "";
    state.persona.fileMissing = false;
    state.persona.fileError = err.message || String(err);
    renderPersonaFilesPanel();
  }
}

function setPersonaCreateModalOpen(open) {
  const modal = $("persona-create-modal");
  if (!modal) return;
  modal.classList.toggle("open", open);
  modal.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) {
    captureModalFocus("persona-create-modal", { initialSelector: "#persona-create-name" });
  } else {
    releaseModalFocus("persona-create-modal");
  }
}

function openPersonaCreateModal() {
  const form = $("persona-create-form");
  if (form) form.reset();
  setPersonaCreateModalOpen(true);
}

function closePersonaCreateModal() {
  setPersonaCreateModalOpen(false);
}

async function createPersonaAgent() {
  const submitBtn = $("persona-create-submit");
  const name = toTrimmedString($("persona-create-name")?.value);
  const workspace = toTrimmedString($("persona-create-workspace")?.value);
  const emoji = toTrimmedString($("persona-create-emoji")?.value);
  const avatar = toTrimmedString($("persona-create-avatar")?.value);

  if (!name) {
    showToast("请先填写 Agent 名称", "warning");
    return;
  }
  if (!workspace) {
    showToast("请先填写工作区路径", "warning");
    return;
  }

  const shouldContinue = await confirmDiscardPersonaDrafts({ actionLabel: "创建并切换到新 Agent" });
  if (!shouldContinue) return;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 创建中...';
  }

  try {
    const body = { name, workspace };
    if (emoji) body.emoji = emoji;
    if (avatar) body.avatar = avatar;

    const result = await api("/api/agents/create", {
      method: "POST",
      body: JSON.stringify(body)
    });
    const createdAgentId = toTrimmedString(result?.data?.agentId || result?.agentId || "");

    showToast(`Agent ${name} 已创建`, "success");
    closePersonaCreateModal();
    await loadPersona({
      preferredAgentId: createdAgentId,
      preferredWorkspace: workspace,
      preferredFileName: PERSONA_FALLBACK_FILES[0]
    });
  } catch (err) {
    showToast(err.message || String(err), "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> 创建 Agent';
    }
  }
}

async function saveSelectedPersonaAgent() {
  const agent = getSelectedPersonaAgent();
  if (!agent) return;

  const draftName = toTrimmedString($("persona-agent-name")?.value);
  const draftWorkspace = toTrimmedString($("persona-agent-workspace")?.value);
  const draftAvatar = toTrimmedString($("persona-agent-avatar")?.value);
  const effectiveWorkspace = getPersonaEffectiveWorkspace(agent);
  const isDefaultAgent = agent.agentId === state.persona.defaultId;

  if (!draftName) {
    showToast("Agent 名称不能为空", "warning");
    return;
  }
  if (!draftWorkspace) {
    showToast("工作区不能为空", "warning");
    return;
  }
  if (isDefaultAgent && draftWorkspace !== effectiveWorkspace) {
    showToast("默认 Agent 工作区受保护，如需修改请与 🦞 沟通", "warning");
    return;
  }

  const payload = { agentId: agent.agentId };
  if (draftName !== agent.displayName) payload.name = draftName;
  if (!isDefaultAgent && draftWorkspace !== effectiveWorkspace) payload.workspace = draftWorkspace;
  if (draftAvatar !== (agent.avatar || "")) payload.avatar = draftAvatar;

  if (Object.keys(payload).length === 1) {
    showToast("当前没有需要保存的元数据改动", "warning");
    return;
  }

  const shouldContinue = await confirmDiscardPersonaDrafts({
    ignore: ["metadata"],
    actionLabel: "保存元数据并刷新 Agent"
  });
  if (!shouldContinue) return;

  state.persona.metadataSaving = true;
  syncPersonaMetadataActionState();

  try {
    await api("/api/agents/update", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    showToast(`Agent ${draftName} 已更新`, "success");
    await loadPersona({
      preferredAgentId: agent.agentId,
      preferredWorkspace: draftWorkspace,
      preferredFileName: state.persona.selectedFileName
    });
  } catch (err) {
    showToast(err.message || String(err), "error");
  } finally {
    state.persona.metadataSaving = false;
    syncPersonaMetadataActionState();
  }
}

async function deleteSelectedPersonaAgent() {
  const agent = getSelectedPersonaAgent();
  if (!agent) return;
  if (agent.agentId === state.persona.defaultId) {
    showToast("默认 Agent 受保护，不能删除", "warning");
    return;
  }

  const shouldContinue = await confirmDiscardPersonaDrafts({ actionLabel: "删除当前 Agent" });
  if (!shouldContinue) return;

  const deleteFiles = $("persona-delete-files")?.checked === true;
  const label = getPersonaDisplayName(agent);
  const confirmed = await requestConfirmDialog({
    title: "删除 Agent",
    message: deleteFiles
      ? `确定删除 ${label} 吗？\n这会同时删除该 Agent 关联的人格 / 提示词文件。`
      : `确定删除 ${label} 吗？\nAgent 配置会被删除，文件会保留在工作区中。`,
    confirmText: deleteFiles ? "删除 Agent 与文件" : "删除 Agent",
    cancelText: "取消",
    variant: "danger"
  });
  if (!confirmed) return;

  state.persona.metadataSaving = true;
  syncPersonaMetadataActionState();

  try {
    await api("/api/agents/delete", {
      method: "POST",
      body: JSON.stringify({ agentId: agent.agentId, deleteFiles })
    });
    showToast(`Agent ${label} 已删除`, "success");
    await loadPersona();
  } catch (err) {
    showToast(err.message || String(err), "error");
  } finally {
    state.persona.metadataSaving = false;
    syncPersonaMetadataActionState();
  }
}

async function savePersonaFile() {
  const agent = getSelectedPersonaAgent();
  const fileName = toTrimmedString(state.persona.selectedFileName);
  if (!agent || !fileName) return;

  const editor = $("persona-file-editor");
  if (editor) {
    state.persona.fileContent = editor.value;
  }

  if (!state.persona.fileMissing && !isPersonaFileDirty()) {
    showToast("当前文件没有新的改动", "warning");
    return;
  }

  state.persona.fileSaving = true;
  syncPersonaFileEditorState();

  try {
    await api("/api/agents/file", {
      method: "POST",
      body: JSON.stringify({
        agentId: agent.agentId,
        name: fileName,
        content: state.persona.fileContent
      })
    });
    showToast(`${fileName} 已保存`, "success");
    await loadPersonaFile(agent.agentId, fileName);
  } catch (err) {
    showToast(err.message || String(err), "error");
  } finally {
    state.persona.fileSaving = false;
    syncPersonaFileEditorState();
  }
}

function setChatViewActive(active) {
  state.chat.viewActive = active === true;
  if (!state.chat.viewActive) {
    clearChatStreamAnimationScheduler();
    clearChatStreamCursorFadeState();
    toggleChatSessionsPanel(false);
    return;
  }

  if (state.chat.needsRefresh && state.chat.sessionKey) {
    state.chat.needsRefresh = false;
    scheduleChatHistoryRefresh(state.chat.sessionKey, 0);
  }
}

function setChatStatus(status, metadata = {}) {
  state.chat.status = status || "disconnected";
  state.chat.lastStatusReason = String(metadata.reason || "");
  const pill = $("chat-connection-pill");
  updateChatReconnectButton(state.chat.status, metadata);
  if (!pill) return;

  const statusMap = {
    connected: { text: "网关已连接", cls: "ok" },
    connecting: { text: "网关连接中", cls: "warn" },
    reconnecting: { text: "网关重连中", cls: "warn" },
    disconnected: { text: "网关未连接", cls: "bad" }
  };

  const normalized = statusMap[state.chat.status] || statusMap.disconnected;
  let text = normalized.text;
  if (Number.isFinite(metadata.attempt) && state.chat.status === "reconnecting") {
    text = `${normalized.text} (${metadata.attempt})`;
  }

  pill.classList.remove("ok", "warn", "bad");
  pill.classList.add(normalized.cls);
  pill.textContent = text;
}

function updateChatReconnectButton(status, metadata = {}) {
  const button = $("chat-reconnect-btn");
  if (!button) return;

  const normalized = String(status || "disconnected");
  const reason = String(metadata.reason || "").trim();

  if (normalized === "connected") {
    button.classList.add("is-hidden");
    button.disabled = false;
    button.innerHTML = '<i class="fa-solid fa-plug-circle-bolt"></i> 立即重连';
    button.title = "";
    return;
  }

  button.classList.remove("is-hidden");
  button.title = reason ? `最近连接错误：${reason}` : "手动重连网关";

  if (normalized === "connecting" || normalized === "reconnecting") {
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-rotate-right fa-spin"></i> 重连中';
    return;
  }

  button.disabled = false;
  button.innerHTML = '<i class="fa-solid fa-plug-circle-bolt"></i> 立即重连';
}

function syncMessageTextSegment(message) {
  if (!message || typeof message !== "object") return;
  const nextText = String(message.text || "");
  if (!nextText.trim()) return;

  if (!Array.isArray(message.segments)) {
    message.segments = [{ type: "text", text: nextText }];
    return;
  }

  const firstTextIndex = message.segments.findIndex((segment) => segment?.type === "text");
  if (firstTextIndex >= 0) {
    message.segments[firstTextIndex] = { ...message.segments[firstTextIndex], text: nextText };
    return;
  }

  message.segments.unshift({ type: "text", text: nextText });
}

function mergeStreamingText(currentText, incomingText) {
  const current = String(currentText || "") === "思考中..." ? "" : String(currentText || "");
  const incoming = String(incomingText || "");

  if (!incoming) return current;
  if (!current) return incoming;
  if (incoming === current) return current;
  if (incoming.startsWith(current)) return incoming;
  if (current.startsWith(incoming)) return current;
  if (current.includes(incoming)) return current;
  if (incoming.includes(current)) return incoming;

  const maxOverlap = Math.min(current.length, incoming.length);
  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    if (current.slice(-overlap) === incoming.slice(0, overlap)) {
      return `${current}${incoming.slice(overlap)}`;
    }
  }

  return `${current}${incoming}`;
}

function joinStreamTextFromSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return "";
  return segments
    .filter((segment) => segment?.type === "text")
    .map((segment) => String(segment?.text || ""))
    .join("");
}

function clearChatStreamAnimationScheduler({ clearTargets = true } = {}) {
  if (state.chat.streamAnimationTimer) {
    if (state.chat.streamAnimationIsRaf && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(state.chat.streamAnimationTimer);
    } else {
      clearTimeout(state.chat.streamAnimationTimer);
    }
  }

  state.chat.streamAnimationTimer = null;
  state.chat.streamAnimationIsRaf = false;
  state.chat.streamAnimationLastTs = 0;
  state.chat.streamLastDomUpdateTs = 0;

  if (clearTargets) {
    state.chat.streamTargetByMessage.clear();
  }
}

function clearChatStreamCursorFadeState(messageId = "") {
  const clearOne = (id) => {
    const key = String(id || "").trim();
    if (!key) return;

    const timer = state.chat.streamCursorFadeTimers.get(key);
    if (timer) {
      clearTimeout(timer);
    }
    state.chat.streamCursorFadeTimers.delete(key);
    state.chat.streamCursorFadeIds.delete(key);
  };

  const key = String(messageId || "").trim();
  if (key) {
    clearOne(key);
    return;
  }

  for (const id of state.chat.streamCursorFadeTimers.keys()) {
    clearOne(id);
  }
  state.chat.streamCursorFadeIds.clear();
}

function startChatStreamCursorFade(messageId) {
  const key = String(messageId || "").trim();
  if (!key) return;

  clearChatStreamCursorFadeState(key);
  state.chat.streamCursorFadeIds.add(key);

  const timer = setTimeout(() => {
    state.chat.streamCursorFadeTimers.delete(key);
    if (!state.chat.streamCursorFadeIds.delete(key)) return;

    const updated = updateChatMessageRows([key], { scrollOnUpdate: false, forceFull: true });
    if (!updated) {
      renderChatMessages({ autoScroll: false });
    }
  }, CHAT_STREAM_CURSOR_FADE_MS);

  state.chat.streamCursorFadeTimers.set(key, timer);
}

function advanceStreamText(currentText, targetText, deltaMs) {
  const current = String(currentText || "") === "思考中..." ? "" : String(currentText || "");
  const target = String(targetText || "");

  if (!target) return current;
  if (current === target) return current;
  if (!current) return target.slice(0, Math.min(3, target.length));

  if (!target.startsWith(current)) {
    if (current.startsWith(target)) return target;
    return target;
  }

  const gap = target.length - current.length;
  if (gap <= 0) return target;

  // Inspired by OpenWebUI: randomized chunk sizes for natural feel
  // Target ~80-150 chars/s visible speed (rAF fires ~60fps, DOM throttled to ~80ms)
  let charBudget;
  if (gap < 10) {
    // Almost caught up — slow natural finish, 1-2 chars
    charBudget = 1 + Math.floor(Math.random() * 2);
  } else if (gap < 40) {
    // Gentle pace — 2-5 chars per frame
    charBudget = 2 + Math.floor(Math.random() * 4);
  } else if (gap < 120) {
    // Normal streaming — 5-10 chars per frame
    charBudget = 5 + Math.floor(Math.random() * 6);
  } else if (gap < 300) {
    // Catch-up — 10-18 chars per frame
    charBudget = 10 + Math.floor(Math.random() * 9);
  } else {
    // Big backlog — 18-30 chars per frame
    charBudget = 18 + Math.floor(Math.random() * 13);
  }

  const frameScale = Math.max(0.75, Math.min(2.5, (Number(deltaMs) || 16) / 16));
  charBudget = Math.max(1, Math.min(gap, Math.round(charBudget * frameScale)));

  return current + target.slice(current.length, current.length + charBudget);
}

function scheduleChatStreamAnimation() {
  if (state.chat.streamAnimationTimer || state.chat.streamTargetByMessage.size === 0) {
    return;
  }

  const runFrame = (frameTs) => {
    state.chat.streamAnimationTimer = null;
    state.chat.streamAnimationIsRaf = false;

    const nowTs = Number(frameTs) || Date.now();
    const lastTs = state.chat.streamAnimationLastTs || nowTs;
    const deltaMs = Math.max(8, Math.min(48, nowTs - lastTs));
    state.chat.streamAnimationLastTs = nowTs;

    const touched = [];
    let anyCompleted = false;
    for (const [messageId, targetText] of state.chat.streamTargetByMessage.entries()) {
      const id = String(messageId || "").trim();
      if (!id) {
        state.chat.streamTargetByMessage.delete(messageId);
        continue;
      }

      const message = state.chat.messages.find((entry) => entry?.id === id);
      if (!message || message.pending !== true) {
        state.chat.streamTargetByMessage.delete(messageId);
        continue;
      }

      const currentText = String(message.text || "");
      const nextText = advanceStreamText(currentText, targetText, deltaMs);
      if (nextText !== currentText) {
        message.text = nextText;
        syncMessageTextSegment(message);
        touched.push(id);
      }

      if (nextText === String(targetText || "")) {
        state.chat.streamTargetByMessage.delete(messageId);
        anyCompleted = true;
      }
    }

    // Throttle DOM updates: only flush to DOM every ~80ms, or immediately when a stream completes
    if (touched.length > 0) {
      const lastDomTs = state.chat.streamLastDomUpdateTs || 0;
      if (anyCompleted || (nowTs - lastDomTs) >= 80) {
        state.chat.streamLastDomUpdateTs = nowTs;
        const incrementalUpdated = updateChatMessageRows(touched, { scrollOnUpdate: true });
        if (!incrementalUpdated) {
          renderChatMessages();
        }
      }
    }

    if (state.chat.streamTargetByMessage.size > 0) {
      scheduleChatStreamAnimation();
    } else {
      state.chat.streamAnimationLastTs = 0;
      state.chat.streamLastDomUpdateTs = 0;
    }
  };

  if (typeof requestAnimationFrame === "function") {
    state.chat.streamAnimationIsRaf = true;
    state.chat.streamAnimationTimer = requestAnimationFrame(runFrame);
    return;
  }

  state.chat.streamAnimationIsRaf = false;
  state.chat.streamAnimationTimer = setTimeout(() => runFrame(Date.now()), 16);
}

function queuePendingRunDelta(runId, delta) {
  const key = String(runId || "").trim();
  if (!key || !delta) return;

  const pendingId = String(state.chat.pendingRuns.get(key) || "").trim();
  if (!pendingId) return;

  patchPendingAssistantByRun(key, (message) => {
    if (!message || typeof message.text !== "string") return;
    const currentTarget = String(state.chat.streamTargetByMessage.get(pendingId) ?? message.text ?? "");
    const mergedText = mergeStreamingText(currentTarget, String(delta));
    const nextTarget = stripChatControlDirectives(mergedText, { trim: false });

    if (nextTarget !== currentTarget) {
      state.chat.streamTargetByMessage.set(pendingId, nextTarget);
    }
  });

  scheduleChatStreamAnimation();
}

function toggleChatSessionsPanel(forceOpen) {
  const panel = $("chat-sessions-panel");
  const toggle = $("chat-toggle-sessions");
  if (!panel || !toggle) return;

  const next = typeof forceOpen === "boolean" ? forceOpen : !state.chat.mobileSessionsOpen;
  state.chat.mobileSessionsOpen = next;
  panel.classList.toggle("mobile-open", next);
  toggle.setAttribute("aria-expanded", next ? "true" : "false");
}

function getChatSessionItems(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.sessions)) return payload.sessions;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data?.sessions)) return payload.data.sessions;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function normalizeChatSession(session) {
  const key = String(session?.key || session?.sessionKey || "").trim();
  if (!key) return null;

  const title =
    String(session?.label || "").trim() ||
    String(session?.displayName || "").trim() ||
    String(session?.subject || "").trim() ||
    key;

  return {
    key,
    title,
    updatedAt: Number(session?.updatedAt || 0),
    model: String(session?.model || "").trim(),
    channel: String(session?.channel || "").trim()
  };
}

function normalizeSegmentType(rawType) {
  const value = String(rawType || "").trim().toLowerCase();
  if (!value) return "";
  if (value === "text") return "text";
  if (
    value === "thinking" ||
    value === "reasoning" ||
    value === "reasoning_text" ||
    value === "reasoning_summary" ||
    value === "summary_text"
  ) {
    return "thinking";
  }
  if (value === "toolcall" || value === "tool_call" || value === "tooluse" || value === "tool_use") {
    return "toolCall";
  }
  if (value === "toolresult" || value === "tool_result") {
    return "toolResult";
  }
  return "";
}

const REPLY_TO_CURRENT_DIRECTIVE_RE = /\[\[\s*reply(?:[\s_-]*to)?[\s_-]*current\s*\]\]/gi;

function stripChatControlDirectives(rawText, { trim = true } = {}) {
  const text = String(rawText || "");
  if (!text) return "";
  const cleaned = text.replace(REPLY_TO_CURRENT_DIRECTIVE_RE, "").replace(/\n{3,}/g, "\n\n");
  return trim ? cleaned.trim() : cleaned;
}

function tryParseStructuredChunk(rawText) {
  const text = String(rawText || "").trim();
  if (!text.startsWith("{") || !text.endsWith("}")) return null;
  if (!text.includes('"type"')) return null;

  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    const normalizedType = normalizeSegmentType(parsed.type);
    return normalizedType ? parsed : null;
  } catch {
    return null;
  }
}

function stringifySegmentPayload(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function buildChatSegments(source, { allowStructuredString = true, fallbackToolName = "tool" } = {}) {
  const segments = [];

  const appendPiece = (piece) => {
    if (piece === null || piece === undefined) return;

    if (typeof piece === "string") {
      const parsed = allowStructuredString ? tryParseStructuredChunk(piece) : null;
      if (parsed) {
        appendPiece(parsed);
        return;
      }
      const text = stripChatControlDirectives(piece);
      if (text) segments.push({ type: "text", text });
      return;
    }

    if (typeof piece !== "object") {
      segments.push({ type: "text", text: String(piece) });
      return;
    }

    const normalizedType = normalizeSegmentType(piece.type);
    if (normalizedType === "thinking") {
      const summaryText = Array.isArray(piece.summary)
        ? piece.summary
            .map((item) => {
              if (!item || typeof item !== "object") return "";
              return String(item.text || item.summary || "").trim();
            })
            .filter(Boolean)
            .join("\n")
        : "";
      const thinkingText =
        (typeof piece.thinking === "string" && piece.thinking) ||
        (typeof piece.summary === "string" && piece.summary) ||
        summaryText ||
        (typeof piece.text === "string" && piece.text) ||
        "";
      const text = stripChatControlDirectives(thinkingText);
      if (text) segments.push({ type: "thinking", text });
      return;
    }

    if (normalizedType === "toolCall") {
      const name = String(piece.name || piece.toolName || piece.tool_name || fallbackToolName || "tool").trim() || "tool";
      const args = piece.arguments ?? piece.args ?? piece.partialJson ?? piece.input ?? null;
      const toolCallId = String(piece.id || piece.toolCallId || piece.tool_call_id || "").trim();
      segments.push({
        type: "toolCall",
        name,
        args,
        toolCallId,
        partialJson: typeof piece.partialJson === "string" ? piece.partialJson : ""
      });
      return;
    }

    if (normalizedType === "toolResult") {
      const name = String(piece.name || piece.toolName || piece.tool_name || fallbackToolName || "tool").trim() || "tool";
      const text = (
        (typeof piece.text === "string" && piece.text) ||
        (typeof piece.content === "string" && piece.content) ||
        (typeof piece.output === "string" && piece.output) ||
        (typeof piece.result === "string" && piece.result) ||
        (typeof piece.message === "string" && piece.message) ||
        ""
      ).trim();
      const toolCallId = String(piece.toolCallId || piece.tool_call_id || piece.id || "").trim();
      segments.push({
        type: "toolResult",
        name,
        text,
        isError: piece.isError === true || piece.error === true,
        toolCallId
      });
      return;
    }

    const fallbackText =
      (typeof piece.text === "string" && piece.text) ||
      (typeof piece.message === "string" && piece.message) ||
      "";
    const cleanedFallback = stripChatControlDirectives(fallbackText);
    if (cleanedFallback) {
      segments.push({ type: "text", text: cleanedFallback });
    }
  };

  if (Array.isArray(source)) {
    for (const piece of source) appendPiece(piece);
  } else {
    appendPiece(source);
  }

  return segments;
}

function flattenChatContent(content) {
  const segments = buildChatSegments(content, { allowStructuredString: true });
  const text = segments
    .filter((segment) => segment.type === "text")
    .map((segment) => String(segment.text || "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
  return text;
}

function joinTextFromSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return "";
  return segments
    .filter((segment) => segment.type === "text")
    .map((segment) => String(segment.text || "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function createChatRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeChatMessage(item, index = 0) {
  const roleRaw = String(item?.role || item?.type || "assistant").toLowerCase();
  const role = roleRaw.includes("user")
    ? "user"
    : roleRaw.includes("assistant")
      ? "assistant"
      : roleRaw.includes("tool")
        ? "tool"
        : roleRaw.includes("system")
          ? "system"
          : "assistant";

  const isToolResultRole = roleRaw === "toolresult" || roleRaw === "tool_result";
  let segments = buildChatSegments(item?.content, {
    allowStructuredString: role !== "user",
    fallbackToolName: String(item?.toolName || item?.tool_name || "tool").trim() || "tool"
  });

  if (segments.length === 0) {
    const fallbackText =
      (typeof item?.text === "string" && item.text) ||
      (typeof item?.message === "string" && item.message) ||
      "";
    const fallbackTrimmed = stripChatControlDirectives(fallbackText);
    const structuredFallback = role !== "user" ? tryParseStructuredChunk(fallbackTrimmed) : null;
    if (structuredFallback) {
      segments = buildChatSegments([structuredFallback], {
        allowStructuredString: true,
        fallbackToolName: String(item?.toolName || item?.tool_name || "tool").trim() || "tool"
      });
    } else if (fallbackTrimmed) {
      segments = [{ type: "text", text: fallbackTrimmed }];
    }
  }

  if (isToolResultRole) {
    const toolText = joinTextFromSegments(segments) || "(无输出)";
    segments = [{
      type: "toolResult",
      name: String(item?.toolName || item?.tool_name || "tool").trim() || "tool",
      text: toolText,
      isError: item?.isError === true || item?.error === true,
      toolCallId: String(item?.toolCallId || item?.tool_call_id || "").trim()
    }];
  }

  const text = joinTextFromSegments(segments) || "<empty>";

  const tsRaw = Number(item?.ts || item?.createdAt || item?.updatedAt || 0);
  const ts = Number.isFinite(tsRaw) && tsRaw > 0 ? tsRaw : Date.now();
  const id =
    String(item?.messageId || item?.id || "").trim() ||
    `${role}-${ts}-${index}`;

  return {
    id,
    role,
    text,
    segments,
    ts,
    pending: item?.pending === true
  };
}

function formatChatTime(ts) {
  const parsed = Number(ts || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return "";
  try {
    return new Date(parsed).toLocaleTimeString();
  } catch {
    return "";
  }
}

function renderToolPayload(value) {
  const text = stringifySegmentPayload(value).trim();
  if (!text) return "";
  return escapeHtml(text);
}

function renderChatSegment(segment, messageId, segmentIndex, options = {}) {
  if (!segment || typeof segment !== "object") return "";

  if (segment.type === "thinking") {
    const thinkingText = String(segment.text || "").trim();
    if (!thinkingText) return "";
    const openAttr = options.autoOpenThinking ? " open" : "";
    return `
      <details class="chat-segment-thinking" data-msg-id="${escapeHtml(messageId)}" data-seg-index="${segmentIndex}"${openAttr}>
        <summary><i class="fa-regular fa-lightbulb"></i> 思考过程</summary>
        <pre>${escapeHtml(thinkingText)}</pre>
      </details>
    `;
  }

  if (segment.type === "toolCall") {
    const toolName = String(segment.name || "tool").trim() || "tool";
    const argsText = renderToolPayload(segment.args || segment.partialJson || "");
    const callId = String(segment.toolCallId || "").trim();
    return `
      <details class="chat-segment-tool chat-segment-tool-call" data-msg-id="${escapeHtml(messageId)}" data-seg-index="${segmentIndex}">
        <summary>
          <span class="chat-segment-tool-title"><i class="fa-solid fa-screwdriver-wrench"></i> 工具调用 · ${escapeHtml(toolName)}</span>
          <span class="chat-segment-tool-status">执行中</span>
        </summary>
        ${callId ? `<div class="chat-segment-tool-meta">callId: ${escapeHtml(callId)}</div>` : ""}
        ${argsText ? `<pre>${argsText}</pre>` : '<div class="chat-segment-tool-empty">无参数</div>'}
      </details>
    `;
  }

  if (segment.type === "toolResult") {
    const toolName = String(segment.name || "tool").trim() || "tool";
    const resultText = String(segment.text || "").trim() || "(无输出)";
    const openAttr = resultText.length <= 120 ? " open" : "";
    const callId = String(segment.toolCallId || "").trim();
    const statusText = segment.isError ? "失败" : "完成";
    return `
      <details class="chat-segment-tool chat-segment-tool-result${segment.isError ? " is-error" : ""}" data-msg-id="${escapeHtml(messageId)}" data-seg-index="${segmentIndex}"${openAttr}>
        <summary>
          <span class="chat-segment-tool-title"><i class="fa-solid fa-terminal"></i> 工具结果 · ${escapeHtml(toolName)}</span>
          <span class="chat-segment-tool-status">${statusText}</span>
        </summary>
        ${callId ? `<div class="chat-segment-tool-meta">callId: ${escapeHtml(callId)}</div>` : ""}
        <pre>${escapeHtml(resultText)}</pre>
      </details>
    `;
  }

  const rawText = String(segment.text || "");
  const text = options.streamingText === true ? rawText : rawText.trim();
  if (!String(text).trim()) return "";

  if (options.streamingText === true) {
    // "思考中..." placeholder gets a pulsing style, not the typing cursor
    if (text === "思考中..." || text === "思考中") {
      return `<div class="chat-bubble-content chat-bubble-thinking"><span class="thinking-dots">${escapeHtml(text)}</span></div>`;
    }
    const safeText = autoCloseMarkdown(text);
    const html = renderMarkdown(safeText);
    const streamingClass = options.streamCursorFade === true
      ? "chat-bubble-content-streaming chat-bubble-content-stream-finished"
      : "chat-bubble-content-streaming";
    return `<div class="chat-bubble-content ${streamingClass} chat-markdown">${html || escapeHtml(text).replaceAll("\n", "<br>")}</div>`;
  }

  const html = renderMarkdown(text);
  return `<div class="chat-bubble-content chat-markdown">${html || escapeHtml(text).replaceAll("\n", "<br>")}</div>`;
}

function buildRenderableChatSegments(message, options = {}) {
  const source = Array.isArray(message?.segments) ? message.segments : [];
  const orderWeight = (segment) => {
    if (!segment || typeof segment !== "object") return 99;
    if (segment.type === "thinking") return 0;
    if (segment.type === "text") return 1;
    if (segment.type === "toolCall") return 2;
    if (segment.type === "toolResult") return 3;
    return 50;
  };

  const orderedSource = source
    .map((segment, index) => ({ segment, index, weight: orderWeight(segment) }))
    .sort((a, b) => (a.weight - b.weight) || (a.index - b.index));

  const segments = orderedSource
    .map(({ segment, index }) => ({
      html: renderChatSegment(segment, message?.id || "", index, {
        autoOpenThinking: options.autoOpenThinking === true && segment?.type === "thinking",
        streamingText: (options.streaming === true || options.streamCursorFade === true) && segment?.type === "text",
        streamCursorFade: options.streamCursorFade === true && segment?.type === "text"
      }),
      segment
    }))
    .filter((entry) => entry.html);

  if (segments.length > 0) {
    return segments.map((entry) => entry.html).join("");
  }

  const fallbackText = String(message?.text || "").trim();
  if (!fallbackText) return '<div class="chat-bubble-content">(空消息)</div>';
  const html = renderMarkdown(fallbackText);
  return `<div class="chat-bubble-content chat-markdown">${html || escapeHtml(fallbackText).replaceAll("\n", "<br>")}</div>`;
}

function resolveLatestThinkingMessageId(messages) {
  return [...messages]
    .reverse()
    .find(
      (message) =>
        message?.role === "assistant" &&
        message?.pending !== true &&
        Array.isArray(message?.segments) &&
        message.segments.some((segment) => segment?.type === "thinking")
    )?.id || "";
}

function renderChatMessageRow(message, index, latestThinkingMessageId = "") {
  const role = message?.role || "assistant";
  const rowClass = role === "user" ? "chat-message-row user" : "chat-message-row";
  const bubbleClass = role === "user"
    ? "chat-bubble chat-bubble-user"
    : role === "tool"
      ? "chat-bubble chat-bubble-tool"
      : role === "system"
        ? "chat-bubble chat-bubble-system"
        : "chat-bubble chat-bubble-assistant";
  const metaRole = role === "user" ? "你" : role === "tool" ? "工具" : role === "system" ? "系统" : "助手";
  const segmentsHtml = buildRenderableChatSegments(message, {
    autoOpenThinking: role === "assistant" && (message?.pending === true || message?.id === latestThinkingMessageId),
    streaming: message?.pending === true,
    streamCursorFade: state.chat.streamCursorFadeIds.has(message?.id || "")
  });
  const timeText = formatChatTime(message?.ts);
  const pending = message?.pending === true ? "<span class=\"chat-message-pending\">生成中</span>" : "";

  return `
    <div class="${rowClass}" data-msg-index="${index}" data-msg-id="${escapeHtml(message?.id || "")}">
      <article class="${bubbleClass}">
        ${segmentsHtml}
        <footer class="chat-bubble-meta">
          <span>${metaRole}</span>
          <span>${escapeHtml(timeText)}</span>
          ${pending}
        </footer>
      </article>
    </div>
  `;
}

function updateChatMessageRows(messageIds, { scrollOnUpdate = false, forceFull = false } = {}) {
  if (!Array.isArray(messageIds) || messageIds.length === 0) return false;

  const container = $("chat-messages");
  if (!container) return false;
  if (!Array.isArray(state.chat.messages) || state.chat.messages.length === 0) return false;

  const uniqueMessageIds = [...new Set(messageIds.map((id) => String(id || "").trim()).filter(Boolean))];
  if (uniqueMessageIds.length === 0) return false;

  const latestThinkingMessageId = resolveLatestThinkingMessageId(state.chat.messages);
  const nearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 140;

  let updated = false;
  for (const messageId of uniqueMessageIds) {
    const messageIndex = state.chat.messages.findIndex((item) => item?.id === messageId);
    if (messageIndex < 0) continue;
    const message = state.chat.messages[messageIndex];

    const row = container.querySelector(`.chat-message-row[data-msg-id="${escapeSelectorAttrValue(messageId)}"]`);
    if (!row) continue;

    const shouldStreamPatch = !forceFull && (message?.pending === true || state.chat.streamCursorFadeIds.has(messageId));
    if (shouldStreamPatch) {
      const textSegment = Array.isArray(message.segments)
        ? message.segments.find((segment) => segment?.type === "text")
        : null;
      const nextText = String(textSegment?.text || message.text || "");
      const contentNode = row.querySelector(".chat-bubble-content-streaming");

      if (contentNode) {
        const safeText = autoCloseMarkdown(nextText);
        const nextHtml = renderMarkdown(safeText) || escapeHtml(nextText).replaceAll("\n", "<br>");
        if (contentNode.innerHTML !== nextHtml) {
          contentNode.innerHTML = nextHtml;
          updated = true;
        }
        const shouldFadeCursor = state.chat.streamCursorFadeIds.has(messageId) && message?.pending !== true;
        if (contentNode.classList.contains("chat-bubble-content-stream-finished") !== shouldFadeCursor) {
          contentNode.classList.toggle("chat-bubble-content-stream-finished", shouldFadeCursor);
          updated = true;
        }
        continue;
      }
    }

    row.outerHTML = renderChatMessageRow(message, messageIndex, latestThinkingMessageId);
    updated = true;
  }

  if (updated && scrollOnUpdate && nearBottom) {
    scrollChatToBottom(true);
  }

  return updated;
}

function renderChatSessions() {
  const container = $("chat-session-list");
  if (!container) return;

  if (!Array.isArray(state.chat.sessions) || state.chat.sessions.length === 0) {
    container.innerHTML = `
      <div class="chat-empty-state">
        <i class="fa-regular fa-comments"></i>
        <p>暂无可用会话</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.chat.sessions
    .map((session) => {
      const active = session.key === state.chat.sessionKey;
      const timeText = formatChatTime(session.updatedAt) || "--:--:--";
      const subtitle = session.model || session.channel || "未标注模型";
      return `
        <button type="button" class="chat-session-item${active ? " active" : ""}" data-session-key="${escapeHtml(session.key)}">
          <span class="chat-session-title">${escapeHtml(session.title)}</span>
          <span class="chat-session-meta">${escapeHtml(subtitle)}</span>
          <span class="chat-session-time"><i class="fa-regular fa-clock"></i>${escapeHtml(timeText)}</span>
        </button>
      `;
    })
    .join("");
}

function updateChatSessionHeader() {
  const title = $("chat-session-title");
  const subtitle = $("chat-session-subtitle");
  if (!title || !subtitle) return;

  if (!state.chat.sessionKey) {
    title.textContent = "未选择会话";
    subtitle.textContent = "请先选择会话或创建新会话";
    return;
  }

  const session = state.chat.sessions.find((item) => item.key === state.chat.sessionKey);
  title.textContent = session?.title || state.chat.sessionKey;
  subtitle.textContent = session?.model || state.chat.sessionKey;
}

function scrollChatToBottom(force = false) {
  const container = $("chat-messages");
  if (!container) return;

  if (force) {
    container.scrollTop = container.scrollHeight;
    return;
  }

  const nearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 140;
  if (nearBottom) {
    container.scrollTop = container.scrollHeight;
  }
}

function renderChatMessages({ autoScroll = true } = {}) {
  const container = $("chat-messages");
  if (!container) return;

  const messages = Array.isArray(state.chat.messages) ? state.chat.messages : [];
  if (messages.length === 0) {
    container.innerHTML = `
      <div class="chat-empty-state chat-empty-state-main">
        <i class="fa-regular fa-face-smile"></i>
        <p>从下方输入框发送第一条消息，开始调试 Playground。</p>
      </div>
    `;
    return;
  }

  const historyBanner = state.chat.loadingOlderMessages
    ? '<div class="chat-history-banner loading"><i class="fa-solid fa-rotate-right fa-spin"></i> 正在加载更早消息...</div>'
    : state.chat.hasOlderMessages
      ? '<div class="chat-history-banner">上滑继续加载更早消息</div>'
      : "";

  const latestThinkingMessageId = resolveLatestThinkingMessageId(messages);

  container.innerHTML = `${historyBanner}${messages
    .map((message, index) => renderChatMessageRow(message, index, latestThinkingMessageId))
    .join("")}`;

  if (autoScroll) {
    scrollChatToBottom();
  }
}

function setChatSending(sending) {
  state.chat.sending = sending === true;
  const sendBtn = $("chat-send-btn");
  if (!sendBtn) return;

  sendBtn.disabled = state.chat.sending;
  sendBtn.innerHTML = state.chat.sending
    ? '<i class="fa-solid fa-spinner fa-spin"></i> 发送中'
    : '<i class="fa-solid fa-paper-plane"></i> 发送';
}

function scheduleChatHistoryRefresh(sessionKey, delayMs = 180) {
  if (!sessionKey) return;
  if (state.chat.historyRefreshTimer) {
    clearTimeout(state.chat.historyRefreshTimer);
    state.chat.historyRefreshTimer = null;
  }

  state.chat.historyRefreshTimer = setTimeout(() => {
    state.chat.historyRefreshTimer = null;
    loadChatHistory(sessionKey, { silent: true }).catch((error) => {
      console.error(error);
    });
  }, delayMs);
}

function patchPendingAssistantByRun(runId, updater) {
  if (!runId || !state.chat.pendingRuns.has(runId)) return;
  const pendingId = state.chat.pendingRuns.get(runId);
  const index = state.chat.messages.findIndex((item) => item.id === pendingId);
  if (index < 0) return;
  updater(state.chat.messages[index]);
}

function extractEventMessageText(payloadMessage, { trim = true } = {}) {
  if (typeof payloadMessage === "string") {
    return stripChatControlDirectives(payloadMessage, { trim });
  }
  if (!payloadMessage || typeof payloadMessage !== "object") return "";
  if (typeof payloadMessage.text === "string") {
    return stripChatControlDirectives(payloadMessage.text, { trim });
  }
  if (typeof payloadMessage.message === "string") {
    return stripChatControlDirectives(payloadMessage.message, { trim });
  }
  return stripChatControlDirectives(flattenChatContent(payloadMessage.content), { trim });
}

function extractEventMessageSegments(payloadMessage) {
  if (payloadMessage === null || payloadMessage === undefined) return [];

  if (typeof payloadMessage === "string") {
    return buildChatSegments(payloadMessage, { allowStructuredString: true });
  }

  if (Array.isArray(payloadMessage)) {
    return buildChatSegments(payloadMessage, { allowStructuredString: true });
  }

  if (typeof payloadMessage === "object") {
    if (Array.isArray(payloadMessage.content)) {
      return buildChatSegments(payloadMessage.content, { allowStructuredString: true });
    }
    if (typeof payloadMessage.type === "string") {
      return buildChatSegments([payloadMessage], { allowStructuredString: true });
    }
    const fallbackText =
      (typeof payloadMessage.text === "string" && payloadMessage.text) ||
      (typeof payloadMessage.message === "string" && payloadMessage.message) ||
      "";
    const cleaned = stripChatControlDirectives(fallbackText, { trim: false });
    return cleaned ? [{ type: "text", text: cleaned }] : [];
  }

  return [];
}

function mergeStructuredSegmentsIntoMessage(message, incomingSegments) {
  if (!message || typeof message !== "object") return false;
  if (!Array.isArray(incomingSegments) || incomingSegments.length === 0) return false;

  const structured = incomingSegments.filter((segment) => segment && segment.type && segment.type !== "text");
  if (structured.length === 0) return false;

  if (!Array.isArray(message.segments)) {
    message.segments = [];
  }

  let changed = false;

  for (const segment of structured) {
    const type = String(segment?.type || "");
    const toolCallId = String(segment?.toolCallId || "").trim();
    const toolName = String(segment?.name || "").trim();

    const matchIndex = message.segments.findIndex((existing) => {
      if (!existing || existing.type !== type) return false;
      const existingCallId = String(existing.toolCallId || "").trim();
      const existingName = String(existing.name || "").trim();
      if (toolCallId && existingCallId) return toolCallId === existingCallId;
      if (type === "thinking") return true;
      return toolName && existingName && toolName === existingName;
    });

    if (matchIndex < 0) {
      message.segments.push({ ...segment });
      changed = true;
      continue;
    }

    const existing = message.segments[matchIndex];
    if (type === "thinking") {
      const existingText = String(existing.text || "");
      const incomingText = String(segment.text || "");
      const mergedText = mergeStreamingText(existingText, incomingText);
      if (mergedText !== existingText) {
        message.segments[matchIndex] = { ...existing, text: mergedText };
        changed = true;
      }
      continue;
    }

    if (type === "toolCall") {
      const nextArgs = segment.args ?? existing.args ?? null;
      const nextPartialJson = String(segment.partialJson || existing.partialJson || "");
      const updated = {
        ...existing,
        ...segment,
        args: nextArgs,
        partialJson: nextPartialJson
      };
      const before = JSON.stringify(existing);
      const after = JSON.stringify(updated);
      if (before !== after) {
        message.segments[matchIndex] = updated;
        changed = true;
      }
      continue;
    }

    if (type === "toolResult") {
      const existingText = String(existing.text || "");
      const incomingText = String(segment.text || "");
      const mergedText = incomingText || existingText;
      const updated = {
        ...existing,
        ...segment,
        text: mergedText,
        isError: segment.isError === true || existing.isError === true
      };
      const before = JSON.stringify(existing);
      const after = JSON.stringify(updated);
      if (before !== after) {
        message.segments[matchIndex] = updated;
        changed = true;
      }
      continue;
    }
  }

  return changed;
}

function normalizeGatewayAuthMode(value) {
  const mode = String(value || "").toLowerCase();
  if (mode === "none" || mode === "password" || mode === "token") return mode;
  return "unknown";
}

async function ensureChatAuthForFallback(authConfig) {
  if (String(authConfig?.source || "").toLowerCase() !== "fallback") return;
  if (authConfig?.password || authConfig?.token) return;

  const authMode = normalizeGatewayAuthMode(authConfig?.authMode);
  if (authMode === "none") return;
  if (state.chat.manualAuthSecret) return;

  const label = authMode === "token" ? "令牌" : "密码";
  const value = window.prompt(`检测到旧版后端未提供 /api/gateway-auth，请输入网关${label}继续连接：`, "");
  const secret = String(value || "").trim();
  if (!secret) {
    throw new Error(`未提供网关${label}，Chat 无法建立连接`);
  }
  state.chat.manualAuthSecret = secret;
}

function buildChatConnectAuth(authConfig) {
  const auth = {};
  if (typeof authConfig?.password === "string" && authConfig.password) {
    auth.password = authConfig.password;
  }
  if (typeof authConfig?.token === "string" && authConfig.token) {
    auth.token = authConfig.token;
  }

  if (!auth.password && !auth.token && state.chat.manualAuthSecret) {
    const mode = normalizeGatewayAuthMode(authConfig?.authMode);
    if (mode === "token") {
      auth.token = state.chat.manualAuthSecret;
    } else {
      auth.password = state.chat.manualAuthSecret;
    }
  }

  return auth;
}

function isGatewayDisconnectedError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("gateway websocket is not connected") || message.includes("gateway websocket closed");
}

async function chatRequest(method, params = {}) {
  await ensureChatClientConnected();
  if (!state.chat.client) {
    throw new Error("chat client is not ready");
  }

  try {
    return await state.chat.client.request(method, params);
  } catch (error) {
    if (!isGatewayDisconnectedError(error)) {
      throw error;
    }
    await ensureChatClientConnected();
    if (!state.chat.client) {
      throw new Error("chat client is not ready");
    }
    return state.chat.client.request(method, params);
  }
}

async function ensureChatClientConnected() {
  if (!state.chat.client) {
    const authConfig = await fetchGatewayAuthConfig();
    await ensureChatAuthForFallback(authConfig);
    const connectAuth = buildChatConnectAuth(authConfig);
    const client = new GatewayClient({
      requestTimeoutMs: 15000,
      connectTimeoutMs: 15000,
      reconnectBaseDelayMs: 600,
      reconnectMaxDelayMs: 10000,
      maxReconnectAttempts: 10,
      autoReconnect: true
    });

    client.onStatusChange((info) => {
      setChatStatus(info.status, info);
      if (info.status === "disconnected") {
        clearChatStreamAnimationScheduler();
        clearChatStreamCursorFadeState();
      }
      if (info.status === "connected" && state.chat.viewActive) {
        loadChatSessions({ preserveSelection: true }).catch((error) => {
          console.error(error);
        });
      }
    });

    client.onEvent((frame) => {
      if (!frame || frame.event !== "chat") return;

      const payload = frame.payload || {};
      const eventSessionKey = String(payload.sessionKey || "").trim();
      if (!eventSessionKey) return;

      const runId = String(payload.runId || "").trim();
      const eventState = String(payload.state || "").toLowerCase();
      const isCurrentSession = eventSessionKey === state.chat.sessionKey;

      if (!isCurrentSession || !state.chat.viewActive) {
        state.chat.needsRefresh = true;
        return;
      }

      if (runId && state.chat.pendingRuns.has(runId)) {
        const eventSegments = [
          ...extractEventMessageSegments(payload.message),
          ...extractEventMessageSegments(payload.thinking),
          ...extractEventMessageSegments(payload.reasoning),
          ...extractEventMessageSegments(payload.reasoningDelta)
        ];
        let structuredChanged = false;
        const pendingMessageId = String(state.chat.pendingRuns.get(runId) || "").trim();

        patchPendingAssistantByRun(runId, (message) => {
          if (eventState === "delta") {
            structuredChanged = mergeStructuredSegmentsIntoMessage(message, eventSegments) || structuredChanged;
            const delta = joinStreamTextFromSegments(eventSegments) || extractEventMessageText(payload.message, { trim: false });
            if (delta) queuePendingRunDelta(runId, delta);
            return;
          }

          if (eventState === "final" || eventState === "aborted" || eventState === "error") {
            // Pipeline simplified: no more delta flush queue, just snap target text
          }

          if (eventState === "error") {
            message.pending = false;
            message.text = payload.errorMessage || "模型回复失败";
            message.segments = [{ type: "text", text: message.text }];
            state.chat.streamTargetByMessage.delete(message.id);
            clearChatStreamCursorFadeState(message.id);
            return;
          }

          if (eventState === "aborted") {
            message.pending = false;
            message.text = "本次回复已中止";
            message.segments = [{ type: "text", text: message.text }];
            state.chat.streamTargetByMessage.delete(message.id);
            clearChatStreamCursorFadeState(message.id);
            return;
          }

          if (eventState === "final") {
            const finalText = joinTextFromSegments(eventSegments) || extractEventMessageText(payload.message, { trim: true });
            if (finalText) message.text = finalText;
            if (eventSegments.length > 0) {
              message.segments = eventSegments;
            }
            syncMessageTextSegment(message);
            message.pending = false;
            state.chat.streamTargetByMessage.delete(message.id);
            startChatStreamCursorFade(message.id);
          }
        });

        if (eventState === "final" || eventState === "aborted" || eventState === "error") {
          state.chat.pendingRuns.delete(runId);
          if (state.chat.streamTargetByMessage.size === 0) {
            clearChatStreamAnimationScheduler({ clearTargets: false });
          }
        }

        if (eventState !== "delta") {
          if (pendingMessageId && (eventState === "final")) {
            // Keep the existing node for one brief fade-out before the final non-streaming render lands.
            const updated = updateChatMessageRows([pendingMessageId], { scrollOnUpdate: true });
            if (!updated) renderChatMessages();
          } else {
            renderChatMessages();
          }
        } else if (structuredChanged && pendingMessageId) {
          const updated = updateChatMessageRows([pendingMessageId], { scrollOnUpdate: false, forceFull: true });
          if (!updated) {
            renderChatMessages({ autoScroll: false });
          }
        }
      }

      if (eventState === "final" || eventState === "aborted" || eventState === "error") {
        // Delay history refresh so the streaming→final transition is seamless
        scheduleChatHistoryRefresh(eventSessionKey, 1500);
        loadChatSessions({ preserveSelection: true }).catch((error) => {
          console.error(error);
        });
      }
    });

    state.chat.authConfig = authConfig;
    state.chat.client = client;
    try {
      await client.connect(authConfig.url, connectAuth);
    } catch (error) {
      if (String(authConfig?.source || "").toLowerCase() === "fallback") {
        state.chat.manualAuthSecret = "";
      }
      throw error;
    }
    state.chat.initialized = true;
    return;
  }

  if (!state.chat.client.isConnected()) {
    const authConfig = state.chat.authConfig || (await fetchGatewayAuthConfig());
    await ensureChatAuthForFallback(authConfig);
    const connectAuth = buildChatConnectAuth(authConfig);
    state.chat.authConfig = authConfig;
    try {
      await state.chat.client.connect(authConfig.url, connectAuth);
    } catch (error) {
      if (String(authConfig?.source || "").toLowerCase() === "fallback") {
        state.chat.manualAuthSecret = "";
      }
      throw error;
    }
  }
}

async function loadChatSessions({ preserveSelection = true } = {}) {
  const payload = await chatRequest("sessions.list", { limit: 60, includeLastMessage: true });
  const sessions = getChatSessionItems(payload)
    .map((item) => normalizeChatSession(item))
    .filter(Boolean);

  state.chat.sessions = sessions;

  if (preserveSelection && state.chat.sessionKey) {
    const stillExists = sessions.some((item) => item.key === state.chat.sessionKey);
    if (!stillExists) {
      state.chat.sessionKey = sessions[0]?.key || "";
      state.chat.messages = [];
    }
  } else {
    state.chat.sessionKey = sessions[0]?.key || "";
  }

  renderChatSessions();
  updateChatSessionHeader();
}

async function loadChatHistory(sessionKey, { silent = false, limit, preserveScroll = false } = {}) {
  if (!sessionKey) {
    state.chat.messages = [];
    state.chat.hasOlderMessages = false;
    state.chat.loadingOlderMessages = false;
    clearChatStreamAnimationScheduler();
    clearChatStreamCursorFadeState();
    renderChatMessages();
    return { count: 0, limit: 0 };
  }

  const container = $("chat-messages");
  if (container && !silent && !preserveScroll) {
    container.innerHTML = renderSkeleton(4);
  }

  const requestedLimit = Math.max(
    1,
    Math.min(
      state.chat.historyMaxLimit,
      Number.isFinite(Number(limit)) ? Number(limit) : state.chat.historyLimit
    )
  );
  const previousCount = state.chat.messages.length;
  const previousHeight = preserveScroll && container ? container.scrollHeight : 0;
  const previousTop = preserveScroll && container ? container.scrollTop : 0;

  clearChatStreamAnimationScheduler();
  clearChatStreamCursorFadeState();

  const payload = await chatRequest("chat.history", {
    sessionKey,
    limit: requestedLimit
  });

  const messagesRaw = Array.isArray(payload?.messages) ? payload.messages : [];
  state.chat.messages = messagesRaw.map((message, index) => normalizeChatMessage(message, index));
  state.chat.historyLimit = requestedLimit;

  const currentCount = state.chat.messages.length;
  if (currentCount < requestedLimit) {
    state.chat.hasOlderMessages = false;
  } else if (currentCount > previousCount) {
    state.chat.hasOlderMessages = requestedLimit < state.chat.historyMaxLimit;
  } else {
    state.chat.hasOlderMessages = false;
  }

  state.chat.pendingRuns.clear();
  renderChatMessages({ autoScroll: !preserveScroll });

  if (preserveScroll && container) {
    const nextHeight = container.scrollHeight;
    const delta = Math.max(0, nextHeight - previousHeight);
    container.scrollTop = previousTop + delta;
  } else if (silent) {
    scrollChatToBottom(false);
  } else {
    scrollChatToBottom(true);
  }

  return { count: currentCount, limit: requestedLimit };
}

async function loadOlderChatHistory() {
  if (!state.chat.sessionKey) return;
  if (!state.chat.hasOlderMessages) return;
  if (state.chat.loadingOlderMessages) return;
  if (state.chat.sending || state.chat.pendingRuns.size > 0) return;

  const nextLimit = Math.min(state.chat.historyLimit + state.chat.historyBatchSize, state.chat.historyMaxLimit);
  if (nextLimit <= state.chat.historyLimit) {
    state.chat.hasOlderMessages = false;
    renderChatMessages({ autoScroll: false });
    return;
  }

  const previousCount = state.chat.messages.length;
  state.chat.loadingOlderMessages = true;
  renderChatMessages({ autoScroll: false });

  try {
    const result = await loadChatHistory(state.chat.sessionKey, {
      silent: true,
      preserveScroll: true,
      limit: nextLimit
    });

    if (result.count <= previousCount || result.count < nextLimit) {
      state.chat.hasOlderMessages = false;
    } else {
      state.chat.hasOlderMessages = nextLimit < state.chat.historyMaxLimit;
    }
  } catch (error) {
    showToast(error?.message || String(error), "error");
  } finally {
    state.chat.loadingOlderMessages = false;
    renderChatMessages({ autoScroll: false });
  }
}

async function selectChatSession(sessionKey, { reload = true } = {}) {
  const nextKey = String(sessionKey || "").trim();
  if (!nextKey) return;
  if (state.chat.sessionKey === nextKey && !reload) return;

  state.chat.sessionKey = nextKey;
  state.chat.historyLimit = state.chat.historyBatchSize;
  state.chat.hasOlderMessages = false;
  state.chat.loadingOlderMessages = false;
  renderChatSessions();
  updateChatSessionHeader();

  if (reload) {
    await loadChatHistory(nextKey);
  }
}

async function createChatSession() {
  const now = new Date();
  const label = `WebUI ${now.toLocaleString("zh-CN")}`;
  const tempKey = `webui-${Date.now()}`;
  const result = await chatRequest("sessions.patch", {
    key: tempKey,
    label
  });

  const resolvedKey = String(result?.key || tempKey).trim();
  await loadChatSessions({ preserveSelection: false });
  if (resolvedKey) {
    await selectChatSession(resolvedKey, { reload: true });
  }
  showToast("已创建新会话", "success", 1800);
}

async function sendChatMessage(text) {
  await ensureChatClientConnected();

  const message = String(text || "").trim();
  if (!message) return;
  if (!state.chat.sessionKey) {
    throw new Error("请先选择会话");
  }

  if (state.chat.sending) return;
  setChatSending(true);

  const userMessage = {
    id: `local-user-${Date.now()}`,
    role: "user",
    text: message,
    segments: [{ type: "text", text: message }],
    ts: Date.now()
  };
  const pendingAssistant = {
    id: `local-assistant-${Date.now()}`,
    role: "assistant",
    text: "思考中...",
    segments: [{ type: "text", text: "思考中..." }],
    ts: Date.now(),
    pending: true
  };

  state.chat.messages.push(userMessage, pendingAssistant);
  renderChatMessages();
  scrollChatToBottom(true);

  try {
    const idempotencyKey = createChatRequestId();
    const result = await chatRequest("chat.send", {
      sessionKey: state.chat.sessionKey,
      message,
      idempotencyKey
    });

    const runId = String(result?.runId || "").trim();
    if (runId) {
      state.chat.pendingRuns.set(runId, pendingAssistant.id);
    } else {
      pendingAssistant.pending = false;
      pendingAssistant.text = "回复已提交，请稍后刷新会话查看结果";
      renderChatMessages();
    }

    await loadChatSessions({ preserveSelection: true });
  } catch (error) {
    pendingAssistant.pending = false;
    pendingAssistant.text = `发送失败：${error instanceof Error ? error.message : String(error)}`;
    renderChatMessages();
    throw error;
  } finally {
    setChatSending(false);
  }
}

function ensureChatBindings() {
  if (state.chat.bindingsReady) return;

  const sessionList = $("chat-session-list");
  sessionList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-session-key]");
    if (!button) return;
    const sessionKey = button.getAttribute("data-session-key");
    if (!sessionKey) return;

    selectChatSession(sessionKey, { reload: true }).catch((error) => {
      showToast(error.message || String(error), "error");
    });

    if (window.matchMedia("(max-width: 1024px)").matches) {
      toggleChatSessionsPanel(false);
    }
  });

  $("chat-new-session")?.addEventListener("click", async () => {
    try {
      await createChatSession();
    } catch (error) {
      showToast(error.message || String(error), "error");
    }
  });

  const input = $("chat-input");
  input?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey) return;
    event.preventDefault();
    $("chat-input-form")?.requestSubmit();
  });

  input?.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 240)}px`;
  });

  $("chat-toggle-sessions")?.addEventListener("click", () => {
    toggleChatSessionsPanel();
  });

  $("chat-messages")?.addEventListener("scroll", () => {
    const container = $("chat-messages");
    if (!container) return;
    if (container.scrollTop > 72) return;
    if (!state.chat.viewActive || !state.chat.hasOlderMessages || state.chat.loadingOlderMessages) return;

    loadOlderChatHistory().catch((error) => {
      showToast(error?.message || String(error), "error");
    });
  }, { passive: true });

  $("chat-reconnect-btn")?.addEventListener("click", async () => {
    try {
      setChatStatus("connecting", { reason: state.chat.lastStatusReason });
      await ensureChatClientConnected();
      await loadChatSessions({ preserveSelection: true });
      if (state.chat.sessionKey) {
        await loadChatHistory(state.chat.sessionKey, { silent: true });
      }
      showToast("网关连接已恢复", "success", 1600);
    } catch (error) {
      const message = error?.message || String(error);
      setChatStatus("disconnected", { reason: message });
      showToast(message, "error");
    }
  });

  $("chat-input-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = $("chat-input")?.value || "";
    if (!text.trim()) return;
    try {
      await sendChatMessage(text);
      if ($("chat-input")) {
        $("chat-input").value = "";
        $("chat-input").style.height = "";
      }
    } catch (error) {
      showToast(error.message || String(error), "error");
    }
  });

  state.chat.bindingsReady = true;
}

async function loadChat() {
  ensureChatBindings();
  setChatViewActive(true);

  try {
    setChatStatus(state.chat.initialized ? state.chat.status : "connecting");
    await ensureChatClientConnected();
    await loadChatSessions({ preserveSelection: true });

    if (!state.chat.sessionKey) {
      state.chat.messages = [];
      state.chat.hasOlderMessages = false;
      state.chat.loadingOlderMessages = false;
      renderChatMessages();
      return;
    }

    updateChatSessionHeader();
    const shouldReloadHistory = state.chat.needsRefresh || state.chat.messages.length === 0;
    state.chat.needsRefresh = false;
    if (shouldReloadHistory) {
      await loadChatHistory(state.chat.sessionKey);
    } else {
      renderChatMessages();
    }
  } catch (error) {
    state.chat.needsRefresh = true;
    state.chat.messages = [];
    state.chat.hasOlderMessages = false;
    state.chat.loadingOlderMessages = false;
    renderChatMessages();
    setChatStatus("disconnected", { reason: error?.message || String(error) });
    showToast(error.message || String(error), "error");
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
    const keywordRaw = $("logs-keyword").value.trim();
    const keyword = keywordRaw.toLowerCase();
    const lines = (data.lines || []).map(normalizeLogLine).filter(Boolean);
    const filtered = keyword ? lines.filter((line) => line.toLowerCase().includes(keyword)) : lines;

    appendLogLines(filtered, keywordRaw);
  } catch (err) {
    const keywordRaw = $("logs-keyword")?.value.trim() || "";
    appendLogLines([`[error] ${err.message}`], keywordRaw);
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
  if (!$("logs-output")?.textContent?.trim()) {
    setLogsOutputPlaceholder("等待日志输出...");
  }

  if (!$("logs-output").dataset.bound) {
    $("logs-output").dataset.bound = "1";
    $("logs-toggle").addEventListener("click", () => {
      if (state.logsLive) stopLogStream();
      else startLogStream();
    });

    $("logs-clear").addEventListener("click", () => {
      state.logsCursor = null;
      setLogsOutputPlaceholder("日志已清空，等待新输出...");
    });

    $("logs-keyword").addEventListener("input", () => {
      setLogsOutputPlaceholder("正在筛选日志...");
      state.logsCursor = null;
      pullLogs();
    });
  }
}

function logoutBasicAuth() {
  localStorage.removeItem("openclaw_token");
  window.location.href = "/login.html";
}

function bindEvents() {
  // 最高优：确保配置面板的控制大按钮随时就绪
  $("models-save")?.addEventListener("click", saveModels);
  $("models-reload")?.addEventListener("click", loadModels);
  $("models-provider-add")?.addEventListener("click", () => openProviderModal({ mode: "create" }));
  $("models-provider-save-current")?.addEventListener("click", saveCurrentProvider);
  $("models-provider-delete-current")?.addEventListener("click", deleteCurrentProvider);

  for (const nav of document.querySelectorAll("#nav-menu .nav-item")) {
    nav.addEventListener("click", async (event) => {
      event.preventDefault();
      const nextView = nav.dataset.view || "";
      if (!nextView) return;

      if (state.currentView === "persona" && nextView !== "persona") {
        const shouldContinue = await confirmDiscardPersonaDrafts({ actionLabel: "切换到其他视图" });
        if (!shouldContinue) return;
      }

      setView(nextView);
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

  const overviewRefreshBtn = $("overview-refresh");
  if (overviewRefreshBtn) {
    overviewRefreshBtn.addEventListener("click", async () => {
      if (overviewRefreshBtn.disabled) return;
      const label = overviewRefreshBtn.innerHTML;
      overviewRefreshBtn.disabled = true;
      overviewRefreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 刷新中';
      try {
        await Promise.all([loadOverview(), loadSystemLoad()]);
      } finally {
        overviewRefreshBtn.disabled = false;
        overviewRefreshBtn.innerHTML = label;
      }
    });
  }

  const overviewRestartBtn = $("overview-restart");
  if (overviewRestartBtn) {
    overviewRestartBtn.addEventListener("click", handleGatewayRestart);
  }

  const overviewDoctorBtn = $("overview-doctor");
  if (overviewDoctorBtn) {
    overviewDoctorBtn.addEventListener("click", handleGatewayDoctor);
  }

  // Doctor modal close handlers
  const doctorModal = $("doctor-modal");
  if (doctorModal) {
    doctorModal.querySelectorAll("[data-doctor-close]").forEach((el) => {
      el.addEventListener("click", closeDoctorModal);
    });
  }

  const usageRefreshBtn = $("usage-refresh");
  if (usageRefreshBtn) {
    usageRefreshBtn.addEventListener("click", async () => {
      if (usageRefreshBtn.disabled) return;
      const label = usageRefreshBtn.innerHTML;
      usageRefreshBtn.disabled = true;
      usageRefreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 刷新中';
      try {
        await loadUsage();
      } finally {
        usageRefreshBtn.disabled = false;
        usageRefreshBtn.innerHTML = label;
      }
    });
  }

  $("persona-refresh")?.addEventListener("click", async () => {
    const shouldContinue = await confirmDiscardPersonaDrafts({ actionLabel: "重新加载 Persona 数据" });
    if (!shouldContinue) return;

    await loadPersona({
      preferredAgentId: state.persona.selectedAgentId,
      preferredFileName: state.persona.selectedFileName
    });
  });

  $("persona-create-trigger")?.addEventListener("click", () => {
    openPersonaCreateModal();
  });

  $("persona-create-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createPersonaAgent();
  });

  $("persona-create-submit")?.addEventListener("click", async () => {
    await createPersonaAgent();
  });

  const personaCreateModal = $("persona-create-modal");
  personaCreateModal?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-persona-create-modal-close]")) return;
    closePersonaCreateModal();
  });

  $("persona-agent-list")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-persona-agent]");
    if (!button) return;
    const agentId = button.getAttribute("data-persona-agent") || "";
    await selectPersonaAgent(agentId);
  });

  $("persona-files-panel")?.addEventListener("submit", async (event) => {
    if (!event.target.closest("#persona-metadata-form")) return;
    event.preventDefault();
    await saveSelectedPersonaAgent();
  });

  $("persona-files-panel")?.addEventListener("click", async (event) => {
    if (event.target.closest("[data-persona-meta-toggle]")) {
      const bar = $("persona-meta-bar");
      if (bar) bar.classList.toggle("open");
      return;
    }

    if (event.target.closest("[data-persona-agent-reset]")) {
      resetPersonaMetadataDraft();
      return;
    }
    if (event.target.closest("[data-persona-agent-delete]")) {
      await deleteSelectedPersonaAgent();
      return;
    }

    const tab = event.target.closest("[data-persona-file-tab]");
    if (tab) {
      const fileName = tab.getAttribute("data-persona-file-tab") || "";
      const agent = getSelectedPersonaAgent();
      if (!agent || !fileName || fileName.toUpperCase() === state.persona.selectedFileName.toUpperCase()) return;
      const shouldContinue = await confirmDiscardPersonaDrafts({
        ignore: ["metadata"],
        actionLabel: "切换到其他文件"
      });
      if (!shouldContinue) return;
      await loadPersonaFile(agent.agentId, fileName);
      return;
    }

    if (event.target.closest("[data-persona-file-reload]")) {
      const agent = getSelectedPersonaAgent();
      if (!agent || !state.persona.selectedFileName) return;
      const shouldContinue = await confirmDiscardPersonaDrafts({
        ignore: ["metadata"],
        actionLabel: "重新读取当前文件"
      });
      if (!shouldContinue) return;
      await loadPersonaFile(agent.agentId, state.persona.selectedFileName);
      return;
    }

    if (event.target.closest("[data-persona-file-save]")) {
      await savePersonaFile();
    }
  });

  $("persona-files-panel")?.addEventListener("input", (event) => {
    if (event.target.id === "persona-file-editor") {
      state.persona.fileContent = event.target.value;
      syncPersonaFileEditorState();
      return;
    }
    if (["persona-agent-name", "persona-agent-workspace", "persona-agent-avatar"].includes(event.target.id)) {
      syncPersonaMetadataActionState();
    }
  });

  const modelsContent = $("models-content");
  modelsContent?.addEventListener("click", async (event) => {
    if (event.target.closest("[data-models-advanced-toggle]")) {
      syncModelsAdvancedDraftsFromDom();
      state.modelsAdvancedExpanded = !state.modelsAdvancedExpanded;
      renderModelsAdvancedPanels();
      return;
    }

    const addFallbackBtn = event.target.closest("[data-agent-model-add-fallback]");
    if (addFallbackBtn) {
      const modelKey = addFallbackBtn.getAttribute("data-agent-model-add-fallback") || "";
      const list = document.querySelector(`[data-agent-model-fallback-list="${modelKey}"]`);
      const nextIndex = list?.querySelectorAll(`[data-agent-model-row="${modelKey}"]`).length || 0;
      list?.insertAdjacentHTML("beforeend", dedicatedModelFallbackRowTemplate(modelKey, "", nextIndex));
      list?.querySelector(`[data-agent-model-row="${modelKey}"]:last-child input`)?.focus();
      syncModelsAdvancedDraftsFromDom();
      return;
    }

    const removeFallbackBtn = event.target.closest("[data-agent-model-remove-fallback]");
    if (removeFallbackBtn) {
      const confirmed = await requestConfirmDialog({
        title: "删除备选模型",
        message: "确定删除此备选模型吗？",
        confirmText: "确认删除",
        cancelText: "取消",
        variant: "danger"
      });
      if (!confirmed) return;
      const row = removeFallbackBtn.closest("[data-agent-model-row]");
      row?.remove();
      state.configModalDirty = true;
      syncModelsAdvancedDraftsFromDom();
      return;
    }

    const memorySecretToggle = event.target.closest("[data-memory-secret-toggle]");
    if (memorySecretToggle) {
      const input = document.querySelector("[data-memory-search-api-key]");
      if (!input) return;
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      memorySecretToggle.classList.toggle("active", reveal);
      memorySecretToggle.setAttribute("aria-label", reveal ? "隐藏 Embedding API Key" : "显示 Embedding API Key");
      memorySecretToggle.setAttribute("title", reveal ? "隐藏 Embedding API Key" : "显示 Embedding API Key");
      const icon = memorySecretToggle.querySelector("i");
      if (icon) icon.className = reveal ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
      return;
    }

    if (event.target.closest("[data-provider-matrix-add]")) {
      openProviderModal({ mode: "create" });
      return;
    }

    const card = event.target.closest(".provider-card");
    if (card) {
      const providerKey = card.getAttribute("data-provider-key") || "";
      openProviderModal({ mode: "edit", providerKey });
      return;
    }

    const advConfigCard = event.target.closest("[data-advanced-config-card]");
    if (advConfigCard) {
      openAdvancedConfigModal(advConfigCard.getAttribute("data-advanced-config-card") || "");
      return;
    }

    if (event.target.closest("[data-config-modal-close]")) {
      await closeAdvancedConfigModal();
      return;
    }
  });

  modelsContent?.addEventListener("input", (event) => {
    if (!event.target.closest(".models-config-stack") && !event.target.closest("#models-config-modal")) return;
    if (event.target.closest("#models-config-modal")) state.configModalDirty = true;
    syncModelsAdvancedDraftsFromDom();
  });

  modelsContent?.addEventListener("change", (event) => {
    if (!event.target.closest(".models-config-stack") && !event.target.closest("#models-config-modal")) return;
    if (event.target.closest("#models-config-modal")) state.configModalDirty = true;
    syncModelsAdvancedDraftsFromDom();
  });

  const providerModal = $("models-provider-modal");
  providerModal?.addEventListener("click", async (event) => {
    if (!event.target.closest("[data-provider-modal-close]")) return;
    await closeProviderModal();
  });

  const confirmModal = $("global-confirm-modal");
  confirmModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-confirm-accept]")) {
      settleConfirmDialog(true);
      return;
    }
    if (event.target.closest("[data-confirm-cancel]")) {
      settleConfirmDialog(false);
    }
  });

  const cronRunsModal = $("cron-runs-modal");
  cronRunsModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-cron-runs-close]")) {
      closeCronRunsModal();
    }
  });

  document.addEventListener("keydown", async (event) => {
    if (event.key !== "Escape") return;
    if (document.body.classList.contains("cron-runs-modal-open")) {
      event.preventDefault();
      closeCronRunsModal();
      return;
    }
    if (state.confirmDialog.open) {
      event.preventDefault();
      settleConfirmDialog(false);
      return;
    }
    if (state.skillModalOpen) {
      event.preventDefault();
      setSkillModalOpen(false);
      return;
    }
    if (state.currentView === "chat" && state.chat.mobileSessionsOpen) {
      event.preventDefault();
      toggleChatSessionsPanel(false);
      return;
    }
    if ($("models-config-modal")?.classList.contains("show")) {
      event.preventDefault();
      await closeAdvancedConfigModal();
      return;
    }
    if (!state.providerModalOpen) return;
    event.preventDefault();
    await closeProviderModal();
  });

  const providerEditor = $("models-providers-editor");
  providerEditor?.addEventListener("click", (event) => {
    const applyJsonBtn = event.target.closest("[data-provider-json-apply]");
    if (applyJsonBtn) {
      const card = applyJsonBtn.closest("[data-provider-card]");
      if (!card) return;
      try {
        const updated = fillProviderFormFromJson(card);
        if (updated) setProviderEditorDirty(true);
      } catch (err) {
        showToast(`JSON 回填失败：${err.message || String(err)}`, "error");
      }
      return;
    }

    const addModelBtn = event.target.closest("[data-provider-model-add]");
    if (addModelBtn) {
      const card = addModelBtn.closest("[data-provider-card]");
      const list = card?.querySelector(".provider-model-list");
      appendProviderModelRow(list);
      const input = list?.querySelector(".provider-model-row:last-child .provider-model-id");
      input?.focus();
      setProviderEditorDirty(true);
      if (card) syncProviderJsonFromForm(card);
      return;
    }

    const removeModelBtn = event.target.closest("[data-provider-model-remove]");
    if (removeModelBtn) {
      const card = removeModelBtn.closest("[data-provider-card]");
      const row = removeModelBtn.closest("[data-provider-model-row]");
      row?.remove();
      const list = card?.querySelector(".provider-model-list");
      if (list && !list.querySelector("[data-provider-model-row]")) appendProviderModelRow(list);
      setProviderEditorDirty(true);
      if (card) syncProviderJsonFromForm(card);
      return;
    }

    const toggleBtn = event.target.closest("[data-secret-toggle]");
    if (!toggleBtn) return;
    const card = toggleBtn.closest("[data-provider-card]");
    const input = card?.querySelector(".provider-api-key");
    if (!input) return;

    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    toggleBtn.classList.toggle("active", reveal);
    toggleBtn.setAttribute("aria-label", reveal ? "隐藏 API Key" : "显示 API Key");
    toggleBtn.setAttribute("title", reveal ? "隐藏 API Key" : "显示 API Key");
    const icon = toggleBtn.querySelector("i");
    if (icon) icon.className = reveal ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
  });

  providerEditor?.addEventListener("input", (event) => {
    const card = event.target.closest("[data-provider-card]");
    if (!card) return;
    setProviderEditorDirty(true);
    if (event.target.classList.contains("provider-json-config")) return;
    syncProviderJsonFromForm(card);
  });

  providerEditor?.addEventListener("change", (event) => {
    const card = event.target.closest("[data-provider-card]");
    if (!card) return;
    if (event.target.classList.contains("provider-model-default-toggle") && event.target.checked) {
      const row = event.target.closest("[data-provider-model-row]");
      const allowlistToggle = row?.querySelector(".provider-model-allowlist-toggle");
      if (allowlistToggle) allowlistToggle.checked = true;
    }
    if (event.target.classList.contains("provider-model-allowlist-toggle") && !event.target.checked) {
      const row = event.target.closest("[data-provider-model-row]");
      const defaultToggle = row?.querySelector(".provider-model-default-toggle");
      if (defaultToggle) defaultToggle.checked = false;
    }
    setProviderEditorDirty(true);
    if (event.target.classList.contains("provider-json-config")) return;
    syncProviderJsonFromForm(card);
  });

  $("models-alias-add")?.addEventListener("click", () => {
    const container = $("models-alias-editor");
    if (!container) return;
    const row = document.createElement("div");
    row.className = "alias-row";
    row.style.cssText = "background: rgba(128,128,128,0.08); padding: 10px 12px; border-radius: 10px; border: 1px solid var(--glass-border);";
    row.innerHTML = `
      <div style="flex: 1; min-width: 0; position: relative;">
        <i class="fa-solid fa-quote-left" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.75rem; pointer-events: none;"></i>
        <input type="text" class="alias-key" placeholder="别名 (如 rightcode)" value="" style="padding-left: 32px; margin: 0; width: 100%;" />
      </div>
      <i class="fa-solid fa-arrow-right" style="color: var(--text-muted); font-size: 0.8rem; flex-shrink: 0;"></i>
      <div style="flex: 2; min-width: 0; position: relative;">
        <i class="fa-solid fa-microchip" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.8rem; pointer-events: none;"></i>
        <input type="text" class="alias-target" placeholder="目标模型 ID (如 rightcode/gpt-5.3-codex)" value="" style="padding-left: 32px; margin: 0; width: 100%;" />
      </div>
      <button type="button" class="alias-remove danger-action-btn btn-danger" title="删除"><i class="fa-regular fa-trash-can"></i></button>
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
  state.cronJsonMode = false;

  if (tabForm && tabJson) {
    tabForm.addEventListener("click", () => {
      tabForm.classList.add("active");
      tabJson.classList.remove("active");
      viewForm.classList.remove("is-hidden");
      viewJson.classList.remove("active");
      state.cronJsonMode = false;
    });
    tabJson.addEventListener("click", () => {
      tabJson.classList.add("active");
      tabForm.classList.remove("active");
      viewJson.classList.add("active");
      viewForm.classList.add("is-hidden");
      state.cronJsonMode = true;
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
        valInput.classList.remove("cron-value-visible");
        timePicker.classList.remove("is-hidden");
      } else if (v === "at") {
        valLabel.textContent = "指定日期时间 (ISO格式)";
        timePicker.classList.add("is-hidden");
        valInput.classList.add("cron-value-visible");

        // 生成一个友好的默认值（当前时间后一小时）
        const tzOffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(Date.now() - tzOffset + 3600000)).toISOString().slice(0, 16);
        valInput.type = "datetime-local";
        valInput.value = localISOTime;

      } else if (v === "every") {
        valLabel.textContent = "间隔时间";
        timePicker.classList.add("is-hidden");
        valInput.classList.add("cron-value-visible");
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
  $("node-detail-close")?.addEventListener("click", () => {
    const panel = $("nodes-detail");
    if (panel) panel.hidden = true;
    for (const card of document.querySelectorAll("#nodes-list .node-card")) {
      card.classList.remove("node-card-selected");
    }
  });
  const nodesRefreshBtn = $("nodes-refresh");
  if (nodesRefreshBtn) {
    nodesRefreshBtn.addEventListener("click", async () => {
      if (nodesRefreshBtn.disabled) return;
      const label = nodesRefreshBtn.innerHTML;
      nodesRefreshBtn.disabled = true;
      nodesRefreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 刷新中';
      try {
        await loadNodes();
      } finally {
        nodesRefreshBtn.disabled = false;
        nodesRefreshBtn.innerHTML = label;
      }
    });
  }
}

async function bootstrap() {
  bindEvents();
  setModelsApplyState("idle");
  initLogsView();
  await loadHealth();
  setView("overview");
}

bootstrap();
