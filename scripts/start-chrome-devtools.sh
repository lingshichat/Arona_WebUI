#!/usr/bin/env bash
set -euo pipefail

PORT=9222
UPDATE_TOOL_CONFIGS=true
CODEX_CONFIG="${HOME}/.codex/config.toml"
OPENCODE_CONFIG="${HOME}/.config/opencode/opencode.json"

info() {
  printf '[INFO] %s\n' "$*"
}

ok() {
  printf '[ OK ] %s\n' "$*"
}

warn() {
  printf '[WARN] %s\n' "$*"
}

err() {
  printf '[ERR ] %s\n' "$*" >&2
}

usage() {
  cat <<'EOF'
Usage: ./scripts/start-chrome-devtools.sh [--port 9222] [--no-config-update]

Starts a dedicated Windows Chrome instance with the DevTools remote debugging
endpoint enabled, probes which URL is reachable from WSL, and optionally syncs
Codex, Claude Code, and OpenCode chrome-devtools MCP configs to that URL.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --port)
      if [ $# -lt 2 ]; then
        err "--port requires a value"
        exit 1
      fi
      PORT="$2"
      shift 2
      ;;
    --no-config-update)
      UPDATE_TOOL_CONFIGS=false
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      err "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Missing required command: $1"
    exit 1
  fi
}

start_windows_chrome() {
  local chrome_exe_override="${WIN_CHROME_EXE:-}"
  if [ -n "$chrome_exe_override" ] && [[ "$chrome_exe_override" = /* ]]; then
    chrome_exe_override="$(wslpath -w "$chrome_exe_override")"
  fi
  local ps_script
  ps_script=$(cat <<'EOF'
$ErrorActionPreference = "Stop"
$port = "__PORT__"
$profileDir = Join-Path $Env:TEMP "chrome-devtools-mcp"
function Resolve-ChromePath {
  $candidates = New-Object System.Collections.Generic.List[string]

  if ($Env:WIN_CHROME_EXE_PS) {
    [void]$candidates.Add($Env:WIN_CHROME_EXE_PS)
  }

  try {
    $cmd = Get-Command chrome.exe -ErrorAction Stop
    if ($cmd -and $cmd.Source) {
      [void]$candidates.Add($cmd.Source)
    }
  } catch {}

  foreach ($registryPath in @(
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe",
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"
  )) {
    try {
      $item = Get-ItemProperty $registryPath -ErrorAction Stop
      $appPath = $item.'(default)'
      if ($appPath) {
        [void]$candidates.Add($appPath)
      }
    } catch {}
  }

  foreach ($candidate in @(
    (Join-Path $Env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${Env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $Env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
  )) {
    if ($candidate) {
      [void]$candidates.Add($candidate)
    }
  }

  $resolved = $candidates |
    Where-Object { $_ -and (Test-Path -LiteralPath $_) } |
    Select-Object -Unique |
    Select-Object -First 1

  if (-not $resolved) {
    throw "Chrome not found. Install Google Chrome or add chrome.exe to App Paths."
  }

  return $resolved
}

$chromePath = Resolve-ChromePath
$launchArgs = @(
  "/c",
  "start",
  "",
  ('"{0}"' -f $chromePath),
  "--remote-debugging-port=$port",
  "--remote-debugging-address=0.0.0.0",
  "--user-data-dir=$profileDir",
  "about:blank"
)
Start-Process -FilePath "cmd.exe" -ArgumentList $launchArgs | Out-Null

Write-Output $chromePath
EOF
)
  ps_script="${ps_script/__PORT__/$PORT}"
  WIN_CHROME_EXE_PS="$chrome_exe_override" \
    powershell.exe -NoProfile -NonInteractive -Command "$ps_script"
}

probe_browser_url() {
  local browser_url="$1"
  curl --silent --show-error --max-time 2 "${browser_url}/json/version" >/dev/null 2>&1
}

wait_for_browser_url() {
  local browser_url="$1"
  local attempt=1
  while [ "$attempt" -le 20 ]; do
    if probe_browser_url "$browser_url"; then
      return 0
    fi
    sleep 0.5
    attempt=$((attempt + 1))
  done
  return 1
}

update_codex_config() {
  local browser_url="$1"

  if [ ! -f "$CODEX_CONFIG" ]; then
    warn "Codex config not found at $CODEX_CONFIG, skipping MCP config sync."
    return 0
  fi

  if grep -q -- "--browser-url=${browser_url}" "$CODEX_CONFIG"; then
    ok "Codex MCP is already pointing at ${browser_url}"
    return 0
  fi

  local backup_path
  backup_path="${CODEX_CONFIG}.bak.$(date +%s)"
  cp "$CODEX_CONFIG" "$backup_path"

  if grep -q -- '--browser-url=http://' "$CODEX_CONFIG"; then
    sed -i "s#--browser-url=http://[^\"]*#--browser-url=${browser_url}#g" "$CODEX_CONFIG"
    ok "Updated Codex MCP browser URL to ${browser_url}"
    info "Backup saved to ${backup_path}"
  else
    warn "No existing --browser-url entry found in ${CODEX_CONFIG}; config not changed."
  fi
}

update_claude_config() {
  local browser_url="$1"

  if ! command -v claude >/dev/null 2>&1; then
    warn "Claude Code CLI not found, skipping Claude MCP config sync."
    return 0
  fi

  if claude mcp get chrome-devtools >/dev/null 2>&1; then
    claude mcp remove -s user chrome-devtools >/dev/null 2>&1 || true
  fi

  claude mcp add -s user chrome-devtools -- \
    npx -y chrome-devtools-mcp@latest \
    "--browser-url=${browser_url}" \
    --no-usage-statistics >/dev/null
  ok "Updated Claude Code MCP browser URL to ${browser_url}"
}

update_opencode_config() {
  local browser_url="$1"

  if [ ! -f "$OPENCODE_CONFIG" ]; then
    warn "OpenCode config not found at $OPENCODE_CONFIG, skipping OpenCode MCP config sync."
    return 0
  fi

  local backup_path
  backup_path="${OPENCODE_CONFIG}.bak.$(date +%s)"
  cp "$OPENCODE_CONFIG" "$backup_path"

  OPENCODE_CONFIG_PATH="$OPENCODE_CONFIG" OPENCODE_BROWSER_URL="$browser_url" node <<'EOF'
const fs = require("fs");

const configPath = process.env.OPENCODE_CONFIG_PATH;
const browserUrl = process.env.OPENCODE_BROWSER_URL;
const raw = fs.readFileSync(configPath, "utf8");
const json = JSON.parse(raw);

if (!json.mcp || typeof json.mcp !== "object") {
  json.mcp = {};
}

json.mcp["chrome-devtools"] = {
  command: [
    "npx",
    "-y",
    "chrome-devtools-mcp@latest",
    `--browser-url=${browserUrl}`,
    "--no-usage-statistics"
  ],
  enabled: true,
  type: "local"
};

fs.writeFileSync(configPath, `${JSON.stringify(json, null, 2)}\n`);
EOF

  ok "Updated OpenCode MCP browser URL to ${browser_url}"
  info "Backup saved to ${backup_path}"
}

require_cmd powershell.exe
require_cmd curl

windows_host_ip="$(awk '/^nameserver / { print $2; exit }' /etc/resolv.conf 2>/dev/null || true)"
candidate_urls=("http://127.0.0.1:${PORT}")

if [ -n "${windows_host_ip}" ] && [ "${windows_host_ip}" != "127.0.0.1" ]; then
  candidate_urls+=("http://${windows_host_ip}:${PORT}")
fi

info "Starting Windows Chrome with remote debugging on port ${PORT}..."
chrome_path="$(start_windows_chrome | tr -d '\r')"
ok "Chrome launched from ${chrome_path}"

working_url=""
for browser_url in "${candidate_urls[@]}"; do
  info "Probing ${browser_url} from WSL..."
  if wait_for_browser_url "$browser_url"; then
    working_url="$browser_url"
    break
  fi
done

if [ -z "$working_url" ]; then
  err "Chrome started, but WSL could not reach the DevTools endpoint."
  printf '\nTry these checks manually:\n'
  printf '  curl http://127.0.0.1:%s/json/version\n' "$PORT"
  if [ -n "${windows_host_ip}" ] && [ "${windows_host_ip}" != "127.0.0.1" ]; then
    printf '  curl http://%s:%s/json/version\n' "$windows_host_ip" "$PORT"
  fi
  exit 1
fi

ok "WSL can reach Chrome DevTools at ${working_url}"

if [ "$UPDATE_TOOL_CONFIGS" = true ]; then
  update_codex_config "$working_url"
  update_claude_config "$working_url"
  update_opencode_config "$working_url"
else
  info "Skipped Codex, Claude, and OpenCode MCP config sync; use ${working_url} in your MCP configs if needed."
fi

printf '\n'
printf 'Ready.\n'
printf 'Chrome DevTools URL: %s\n' "$working_url"
printf 'You may need to restart Codex, Claude Code, or OpenCode if the MCP config changed.\n'
