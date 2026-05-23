@../../CLAUDE-andrej.md

# QuickClip Capture Plugin — Reference

Obsidian plugin in `plugin/` of the QuickClip-Capture repo. Handles **rendering** and **clip management** — not organize/archive (that's `QuickClip-Organize`).

See parent `CLAUDE.md` for shared schemas (`clipsHistory.json`, `type` inference, version plan) and project interaction overview.

---

## What It Does

**Rendering (DOM-only — never modifies `.md` files):**
- `> [!quote] Clip` callout + metadata table → styled `.qc-highlight-card` in Reading view
- Full-page clips (`clip_type: full-page`) → reading header with author, date, site, word count, reading time, scroll progress bar

**Clip management (`ClipManagerView`):**
- Lists all clips from `.quickclip/clipsHistory.json` grouped by domain
- Each row: type badge, title, text snippet, date, file path, hover-reveal delete button
- Delete removes clip from `clipsHistory.json` and from the `.md` file
  - `full-page` clips: entire `.md` file deleted
  - `highlight` clips: clip block identified by `Captured` date string, removed from file

---

## File Structure

```
plugin/
  src/
    main.ts                  ← Plugin entry point
    types.ts                 ← ClipType, Clip, UrlEntry, ClipsIndex, ClipRef interfaces
    clipsIndex.ts            ← loadIndex, saveIndex, getAllClips, deleteClip, removeHighlightFromFile
    renderers/
      highlight.ts           ← processHighlight, scanAndTransform, buildCard
      fullPage.ts            ← processFullPage, injectFullPageHeader, injectHeader
    views/
      ClipManagerView.ts     ← ItemView for clip list + delete
  styles.css
  manifest.json
  esbuild.config.mjs
  package.json
  tsconfig.json
```

---

## Dev Workflow

```bash
cd plugin/
npm run dev         # esbuild watch — outputs main.js to plugin/
```

Copy `main.js`, `styles.css`, `manifest.json` to `.obsidian/plugins/quickclip-capture/` and reload. With Hot Reload plugin: `npm run dev` triggers live reloading automatically.

---

## Key Technical Decisions

**`MarkdownRenderChild.onload()` pattern** — `MarkdownPostProcessor` fires before elements are attached (`parentElement` is null). `ctx.addChild(new MarkdownRenderChild(el))` defers to `onload()` which fires after attachment. `requestAnimationFrame` retry handles edge cases where `parentElement` is still null in `onload()`.

**Live Preview guard** — `MarkdownPostProcessor` fires in both Live Preview and Reading view. Guard: `if (el.closest('.cm-editor')) return`.

**Per-section `nextElementSibling` approach** — Obsidian renders sections lazily. Each callout section finds its own metadata table via `calloutSection.nextElementSibling` — works regardless of when the section appears in the scroll.

**`active-leaf-change` fallback** — Obsidian tears down and rebuilds preview DOM on file switch. `workspace.on('active-leaf-change')` with 100 ms timeout re-runs `scanAndTransform` and `injectFullPageHeader` after navigation.

**CSS separator fix** — The `---` HR between clips renders as a sibling after the table section. When the table is hidden with `display: none`, the HR still renders. Fix: add class `qc-table-hidden` to the table section, use `.markdown-preview-section .qc-table-hidden + *` to hide the adjacent sibling. No `!important` — higher specificity wins.

**Tag rendering** — Tags use `<a class="tag">` (Obsidian native class) for vault tag search integration. External links use `<a class="external-link">`.

---

## CSS Classes

| Class | Element |
|---|---|
| `.qc-highlight-card` | Outer card container |
| `.qc-highlight-quote` | Clip text content |
| `.qc-highlight-quote--image` | Modifier for image-only clips |
| `.qc-highlight-note` | Inline annotation from `[!note]` callout |
| `.qc-highlight-meta` | Bottom meta row (tags + actions) |
| `.qc-highlight-tags` | Tag chips container |
| `.qc-highlight-actions` | View link + captured date row |
| `.qc-view-link` | "View with highlight ↗" link |
| `.qc-captured` | Captured date stamp |
| `.qc-table-hidden` | Marker class on hidden metadata table section |
| `.qc-reading-header` | Full-page reading header |
| `.qc-reading-meta` | Author · date · site · word count row |
| `.qc-progress-bar` | Scroll progress bar container |
| `.qc-progress-fill` | Scroll progress fill (width animated via scroll event) |
| `.qc-manager` | Clip Manager view container |
| `.qc-clip-row` | Single clip row |
| `.qc-clip-badge` | Clip type badge |
| `.qc-delete-btn` | Delete button (opacity 0, revealed on row hover) |

---

## Behavioral Guidelines

**Think before coding.** State assumptions explicitly. Surface tradeoffs. Ask when unclear.

**Simplicity first.** Minimum code that solves the problem. No speculative features, abstractions for single-use code, or error handling for impossible scenarios.

**Surgical changes.** Touch only what you must. Don't improve adjacent code. Match existing style. Remove only what YOUR changes made unused.

**Goal-driven execution.** Define success criteria before starting. For multi-step tasks, state a brief plan with verify steps.
