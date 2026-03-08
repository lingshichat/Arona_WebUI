# Persona Editor State

> Executable contract for `state.persona`, request-order guards, draft protection, and file editor behavior.

---

## Scenario: Persona List / File Loading and Draft Protection

### 1. Scope / Trigger
- Trigger: changes to `state.persona`, `/api/agents*` integration, file tab logic, or navigation away from the Persona view.
- Why this needs a spec: Persona is a multi-request editor. Without a written state contract, slow or out-of-order responses will overwrite the current selection and silently lose drafts.

### 2. Signatures

#### `state.persona`
```js
{
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
}
```

#### Guarded async entry points
- `loadPersona({ preferredAgentId?, preferredWorkspace?, preferredFileName? })`
- `loadPersonaFiles(agentId, { preferredFileName? })`
- `loadPersonaFile(agentId, fileName)`
- `confirmDiscardPersonaDrafts({ ignore?, actionLabel? })`

### 3. Contracts

#### Request ordering / race protection
- Every async load increments a monotonically increasing request id.
- A response may update state **only if**:
  - its request id still matches the latest counter, and
  - the currently selected agent / file still matches the request target where applicable
- Old responses must be ignored silently instead of trying to merge.

#### Agent selection contract
- Browser normalizes agent payloads into a common shape with `agentId`, `displayName`, `effectiveWorkspace`, `workspaceSource`, etc.
- Selected agent resolution order is:
  1. explicit `preferredAgentId`
  2. explicit `preferredWorkspace`
  3. current `state.persona.selectedAgentId`
  4. `state.persona.defaultId`
  5. first normalized agent

#### File tab contract
- File tabs are the union of:
  - backend-returned file names
  - fixed fallback order:
    `IDENTITY.md`, `SOUL.md`, `AGENTS.md`, `TOOLS.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`
- File selection resolution order is:
  1. explicit preferred file
  2. current selected file
  3. first fallback file
  4. first available file

#### Missing-file behavior
- Missing persona files are a **valid editable state**, not a fatal state.
- `fileMissing = true` means:
  - editor opens with empty content
  - status pill becomes “文件未创建” / “待创建”
  - current implementation allows direct save/create while `fileMissing = true`, even if the editor is still empty; if product later requires non-empty creation, that is a code change rather than an existing contract

#### Draft protection contract
- Unsaved draft types are tracked separately:
  - metadata draft (`name`, `workspace`, `avatar`)
  - file content draft
- Before these actions, UI must confirm discard when relevant:
  - switching away from Persona view
  - switching agent
  - switching file
  - reloading Persona data
  - creating a new agent
  - deleting current agent
  - saving metadata while file draft is dirty

#### Default-agent UI contract
- Default agent workspace is rendered read-only.
- Default agent delete button is hidden.
- Browser warning copy must match backend protection behavior; frontend should not offer flows that backend will always reject.

#### Layout contract (simplified UI)
- **Sidebar**: Agent list only (no create panel). "+" button in header opens `#persona-create-modal`.
- **Create modal** (`#persona-create-modal`): uses `provider-modal-shell` pattern with `captureModalFocus`/`releaseModalFocus`. On success calls `closePersonaCreateModal()` then `loadPersona()`.
- **Right panel**: single `#persona-files-panel` (no separate metadata panel).
- **Metadata bar** (`.persona-meta-bar`): collapsible bar between panel header and file tabs, rendered by `renderPersonaMetadataBar()` returning an HTML string consumed by `renderPersonaFilesPanel()`.
  - Collapsed: shows agent glyph, name, workspace, badges, chevron toggle.
  - Expanded (`.open`): shows name/workspace/avatar form + save/reset/delete actions.
  - Toggle via `[data-persona-meta-toggle]` click handler on `persona-files-panel`.
- When no agent is selected, the metadata bar is not rendered.

### 4. Validation & Error Matrix

| Condition | State / UI behavior |
|---|---|
| Persona list request fails | clear agent selection, reset file state, show list error empty state |
| Files request returns ENOENT-style missing state | keep fallback tabs, continue into empty-file flow |
| Single file request returns missing state | `fileMissing = true`, `fileContent = ""`, `fileOriginalContent = ""` |
| Stale list/files/file response arrives late | ignore it completely |
| Metadata save in progress | disable save/delete/reset buttons |
| File save/load in progress | editor read-only, reload/save buttons disabled |
| No selected agent | files panel renders empty guidance state; metadata bar is hidden |

### 5. Good / Base / Bad Cases
- Good:
  - slow network returns old file content after the user already switched tabs; UI ignores the stale response
  - selecting an agent with no files still opens fallback tabs and allows creating `IDENTITY.md`
  - switching to another view prompts before discarding unsaved Persona edits
- Base:
  - clean state with no drafts allows immediate view/agent/file switching
- Bad:
  - old file response overwrites the currently selected file
  - missing file becomes a hard error instead of a creatable state
  - metadata dirty check ignores protected default-agent workspace rules

### 6. Tests Required
- Race protection
  - start two list/file loads in sequence and ensure only the latest applies
  - switch agent while previous file request is in flight; old response must be ignored
- Draft protection
  - dirty metadata prompts on agent/view switch
  - dirty file content prompts on file/view switch and reload
  - saving metadata while file is dirty still prompts correctly
- Missing-file flow
  - absent file opens with `missing=true`
  - first save transitions from “待创建” to “已同步”
- Default-agent guardrails
  - workspace input is read-only for default agent
  - delete action is unavailable for default agent

### 7. Wrong vs Correct

#### Wrong
```js
const data = await api(`/api/agents/file?agentId=${agentId}&name=${fileName}`);
state.persona.fileContent = data.file.content;
```

#### Correct
```js
const requestId = ++state.persona.fileRequestId;
const data = await api(`/api/agents/file?agentId=${agentId}&name=${fileName}`);

if (
  requestId !== state.persona.fileRequestId ||
  state.persona.selectedAgentId !== agentId ||
  state.persona.selectedFileName.toUpperCase() !== fileName.toUpperCase()
) {
  return;
}

state.persona.fileContent = data.file.content;
```

#### Wrong
```js
state.persona.files = backendFiles;
```

#### Correct
```js
state.persona.files = mergePersonaFileNames(backendFiles);
// Preserve fallback tabs so missing core files remain creatable.
```
