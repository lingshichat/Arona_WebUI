# Design System

> Implementation-first frontend spec extracted from `docs/design.md`, Phase 0-3 delivery, `public/styles.css`, and current UI code.

---

## Overview

Arona WebUI uses a **token-first glassmorphism system** with dark mode as the default. New UI should extend the existing CSS variable and component family structure instead of inventing one-off colors, radii, or motion curves.

Core principles already landed in code:

- dark default, light theme override via `[data-theme="light"]`
- glass panels + subtle borders + layered shadows
- motion durations centralized in tokens
- spotlight / ambient effects must degrade cleanly under `prefers-reduced-motion`
- shared button / badge / panel classes should be reused before adding new component-specific styling
- admin / control surfaces are **data-dense first**: clarity, trust, and readable form structure beat decorative flourish

### Product Fit: Admin / Gateway Console

For this project, external design research best matches a dark enterprise control surface:

- “enterprise gateway” / admin dashboard visual language
- conservative accent usage
- high-contrast dark mode
- technical typography for ids / model refs / machine-readable strings

This means new UI should feel like an operator console, not a marketing page:

- prefer calm, conservative surfaces over playful highlight colors
- reserve semantic colors for explicit status signals, not ordinary content labels
- treat forms and control panels as operational UI, not decorative cards

---

## Token Contract

Use the existing CSS custom properties in `public/styles.css:1-78` as the source of truth.

| Token group | Tokens | Use |
|---|---|---|
| Background | `--bg-deep`, `--bg-base`, `--bg-elevated` | page canvas and elevated shells |
| Surface | `--surface`, `--surface-hover` | card / control backgrounds |
| Text | `--foreground`, `--foreground-muted`, `--foreground-subtle`, `--text-*` | readable text hierarchy |
| Accent | `--accent`, `--accent-bright`, `--accent-glow` | CTA, focus, glow, emphasis |
| Border | `--border-default`, `--border-hover`, `--border-accent` | panel/control borders |
| Semantic | `--success`, `--warning`, `--danger` (+ glow variants) | status and destructive states |
| Shadow | `--shadow-multi-layer`, `--shadow-multi-hover`, `--shadow-cta` | layered depth and CTA glow |
| Motion | `--motion-duration-fast`, `--motion-duration-base`, `--motion-duration-slow`, `--motion-ease-out` | all transitions / animations |
| Typography | `--font-mono` | code / ids / machine text |

### Rules
- Prefer `var(--token)` over hard-coded colors, shadows, or easing values.
- When adding a new semantic state, extend the token layer first if the state will appear in multiple places.
- Light theme adjustments should usually override tokens or shared semantic classes, not duplicate full component trees.

### Example
```css
.my-new-card {
  background: var(--surface);
  border: 1px solid var(--border-default);
  color: var(--foreground);
  box-shadow: var(--shadow-multi-layer);
  transition: box-shadow var(--motion-duration-slow) var(--motion-ease-out);
}
```

---

## Shared Component Families

### Panels and elevated surfaces
- `.glass-panel` is the base elevated surface.
- Use it for dashboard cards, node cards, modal shells, and content sections before inventing a new panel primitive.
- If a panel only needs local spacing/layout changes, compose with extra classes instead of cloning the whole glass treatment.

### Buttons and action controls
- Primary CTA: `.btn-primary`
- Secondary action: `.btn-secondary` or `.panel-action-btn`
- Low-emphasis action: `.btn-ghost`
- Destructive action: `.btn-danger` / `.danger-action-btn`
- Size modifiers: `.btn-size-sm`, `.btn-size-xs`, `.btn-block`

Use shared button classes for interaction states. Only add local styles for spacing/layout, not to redefine hover/focus/active language.

### Status and metadata
- `.status-badge` and its tone variants are the default status capsule.
- Use semantic tones (`ok`, `warn`, `bad`, `accent`, `dynamic`) consistently across views.
- **Warning**: light theme keeps a broad base `.status-badge` restyle. Existing tones used by the app have dedicated overrides, but any newly introduced badge tone must add its own light-theme override instead of assuming the base badge style will preserve meaning.
- For admin/data chips (model ids, provider names, route labels), default to the neutral chip language first.
- Do **not** recolor normal text/chips to green/yellow/red just because the underlying item is “available”, “default”, or “selected”.
- If a state matters, expose it through:
  - a nearby `.status-badge`
  - helper copy
  - explicit label text / icon
  - layout grouping
  rather than colorizing the content token itself.

### Spotlight-enabled cards
- Add `data-spotlight` to interactive elevated surfaces that should receive pointer-driven light.
- The effect is implemented by runtime JS adding `.spotlight-lens`; component CSS must not depend on spotlight being present to remain readable.

### Form / modal system
- Reuse the existing modal shell, field spacing, and focus behaviors.
- Inputs should inherit token-based backgrounds/borders and rely on the global `:focus-visible` outline instead of custom ad-hoc rings.
- In form-heavy admin modals, use **visible field labels** and helper text before inventing new control metaphors.
- One-off custom switches / glowing pills / chip-toggles should be avoided unless there is already a shared primitive in the repo.
- For policy-like choices (“enabled”, “default”, “allow”), prefer native checkbox / radio inputs with clear labels unless a shared existing control family is already established.
- Dense forms should be structured in two layers:
  - field rows for raw values
  - a separate options / policy row for toggles and secondary choices

### Single-line admin controls
- Single-line admin controls should share the same geometry in both themes:
  - height / min-height: `48px`
  - border radius: `12px`
  - horizontal padding: `16px`
- This applies to:
  - `input.skeuo-input`
  - custom select trigger `.select-display`
  - number fields enhanced by `.number-field-shell`
- Light theme may change surface, border, and shadow language, but should not silently change the geometry. If a control feels taller or thinner in light mode, treat it as a regression.

> **Warning**: custom select triggers implemented with `<button>` must explicitly set `appearance: none`, `-webkit-appearance: none`, `box-sizing: border-box`, and an explicit height/min-height.
>
> Otherwise browser-native button chrome will leak back in and the select will end up taller than adjacent inputs even if the visual CSS looks “the same”.

> **Warning**: when re-skinning `.skeuo-input`, match or exceed the specificity of the base `input:not([type="checkbox"]):not([type="radio"])` rule.
>
> Prefer selectors like `input.skeuo-input:not([type="checkbox"]):not([type="radio"])` instead of `.skeuo-input` alone; otherwise the generic form rule can silently win and revert padding, radius, and shadows.

---

## Motion Contract

### Required motion rules
- Use `--motion-duration-*` and `--motion-ease-out`.
- Hover movement is small and precise:
  - translate: usually `-1px` to `-2px`
  - active scale: around `0.98`
- Avoid spring/bounce motion.
- Spotlight, blob, toast, skeleton shimmer, and stream animation must remain optional polish — the feature must still work when motion is disabled.
- Current repo still contains a few legacy hard-coded timings / easings. Treat them as migration leftovers, not patterns to copy into new work.

### `prefers-reduced-motion`
The project already treats reduced motion as a contract:

- all motion duration tokens collapse to `1ms`
- ambient blob / decorative animations stop
- `.spotlight-lens` becomes visually disabled

When adding a new animation, wire it through the shared motion tokens or the same reduced-motion gate.

---

## Accessibility and Theme Contract

### Focus and keyboard
- Rely on the global `:focus-visible` outline (`public/styles.css:96-106`) unless a component has a stronger documented reason.
- Modal and drawer interactions must keep keyboard flow intact; visual polish must not break Tab / Escape behavior.
- Inputs, radios, and checkboxes in admin forms should remain obviously interactive in both themes without requiring hover to reveal affordance.

### Theme switching
- Dark mode is the baseline in `:root`.
- Light mode is applied through `[data-theme="light"]` overrides.
- Prefer theme-safe tokens and semantic classes over duplicating per-component hard-coded colors.

### Color independence
- Accent color is emphasis, not the only source of meaning.
- Pair state colors with iconography, label text, or placement when the state matters.
- If a user cannot distinguish green from neutral, or if the UI is viewed in grayscale, critical state should still be understandable.

### Admin Form Rules

- Placeholder text is an example, not the primary label.
- Technical inputs (model ids, provider keys, API endpoints, aliases) should keep labels visible at all times.
- Required-ness should be explicit when applicable.
- Submission feedback must have a visible loading / success / error state.
- Inline validation and field-local errors are preferred over a single generic error area at the top.

---

## Wrong vs Correct

### Wrong: hard-coded one-off visual language
```css
.custom-card {
  background: #111;
  color: #fff;
  transition: all 0.6s ease;
}
```

### Correct: extend the existing system
```css
.custom-card {
  background: var(--surface);
  color: var(--foreground);
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-multi-layer);
  transition:
    box-shadow var(--motion-duration-slow) var(--motion-ease-out),
    transform var(--motion-duration-fast) var(--motion-ease-out);
}

.custom-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-multi-hover);
}
```

### Wrong: custom spotlight-only readability
```css
.card-copy {
  color: transparent;
}
```

### Correct: spotlight is additive only
```css
.card-copy {
  color: var(--foreground);
}

[data-spotlight] .spotlight-lens {
  pointer-events: none;
}
```

---

## Review Checklist

- [ ] 是否优先复用现有 token，而不是硬编码颜色 / 阴影 / easing？
- [ ] 是否优先复用 `.glass-panel` / `.btn-*` / `.status-badge` 等共享类族？
- [ ] 是否把“后台控制台的值展示”和“状态表达”分开了，而不是给普通内容直接染语义色？
- [ ] 表单是否优先使用可见 label + 原生 checkbox/radio，而不是一次性私造控件？
- [ ] 新动效是否接入了共享 motion token？
- [ ] `prefers-reduced-motion` 下是否仍然可用？
- [ ] light / dark 主题下都是否可读？
- [ ] 焦点态、键盘流和可访问性没有被视觉定制破坏？
