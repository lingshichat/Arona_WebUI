## Bug Analysis: 模型白名单勾选在保存前被静默回填冲掉

### 1. Root Cause Category
- **Category**: C - Change Propagation Failure
- **Specific Cause**: 模型管理页新增了每个模型行的策略状态（`allowlisted` / `isDefault`），但旧的 JSON 双向编辑辅助链路没有一起更新。`collectCurrentProvider()` 在提交前仍会调用 `fillProviderFormFromJson()`，它会按旧的 JSON / draft 状态重建模型行，导致用户刚在 UI 里勾选的“允许 Agent 使用”在真正组装 payload 前就被覆盖掉。

### 2. Why Fixes Failed (if applicable)
1. **第一次修复**：把 `ECONNRESET` 当成主要问题，补了“保存后自动核验配置是否生效”。
   原因：这是症状层修复，解决了“结果未知”的提示问题，但没有解决“发送前状态已经丢失”的根因。
2. **第二次修复**：尝试在 `fillProviderFormFromJson()` 中保留当前行的策略选择。
   原因：方向接近，但浏览器仍可能吃旧缓存，而且只修 backfill helper 不如直接去掉提交前的隐式 backfill 更可靠。
3. **最终修复**：移除 `collectCurrentProvider()` 中的静默 `fillProviderFormFromJson()`，让 JSON -> 表单回填只发生在用户显式点击“回填表单”时。
   结果：`GLM-5` 在 UI 中勾选“允许 Agent 使用”后，保存当前供应商、保存并应用、重新打开弹窗时都能保持勾选。

### 3. Prevention Mechanisms
| Priority | Mechanism | Specific Action | Status |
|----------|-----------|-----------------|--------|
| P0 | Documentation | 在 `cross-layer-thinking-guide.md` 增加“双来源表单状态”陷阱，明确禁止在提交前做隐式 JSON -> 表单回填 | DONE |
| P0 | Documentation | 在 `code-reuse-thinking-guide.md` 增加“render / collect / sync / fill helper 必须一起搜”的 gotcha | DONE |
| P1 | Documentation | 在 `guides/index.md` 增加新触发器：表单既支持结构化字段又支持 JSON 编辑时，必须做 cross-layer 思考 | DONE |
| P1 | Architecture | 让提交路径只读取当前表单状态；JSON 回填只能由显式按钮触发 | DONE |
| P1 | Runtime | 对 `config.patch` 过程中出现的 `ECONNRESET` / 热重启断链做保存后核验 | DONE |
| P2 | Test Coverage | 增加一条浏览器级回归测试：勾选白名单 -> 保存当前供应商 -> 保存并应用 -> 重新打开仍保持勾选 | TODO |

### 4. Systematic Expansion
- **Similar Issues**:
  - 模型页现有的 `syncProviderJsonFromForm()` / `fillProviderFormFromJson()` / `collectCurrentProvider()` 这组 helper 以后再加字段时仍有同类风险
  - 任何“表单 + 原始 JSON”双编辑面都可能复发，尤其是 Cron / 未来的节点或 Agent 配置页
- **Design Improvement**:
  - 对双编辑面的提交规则做统一约束：提交只读当前表单状态；原始 JSON 只能通过显式“应用 / 回填”参与
  - 新的策略字段不应只存在于 DOM，最好尽量进入可比较/可验证的 draft state
- **Process Improvement**:
  - 新增表单字段时，把 `render* / collect* / sync* / fill*` 当成一个固定搜索清单
  - 遇到“保存成功提示异常”时，先验证 payload 是否真包含新状态，再考虑网络 / 重启层

### 5. Knowledge Capture
- [x] 更新 `.trellis/spec/guides/cross-layer-thinking-guide.md`
- [x] 更新 `.trellis/spec/guides/code-reuse-thinking-guide.md`
- [x] 更新 `.trellis/spec/guides/index.md`
- [x] 在任务目录记录本次 bug 分析
- [ ] `src/templates/markdown/spec/` 不存在，当前无法执行模板同步；若后续引入模板目录，应补上同步流程
