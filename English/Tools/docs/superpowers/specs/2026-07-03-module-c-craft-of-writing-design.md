# Module C: Craft of Writing — Design Spec
Date: 2026-07-03

## Overview

A new tab in the existing `hsc-short-answer.html` single-page tool, covering Paper 2, Section III: Module C, The Craft of Writing (20 marks). The student is served a question, deconstructs it, plans, writes an imaginative/discursive/persuasive piece by hand (sometimes plus a reflection), self-marks against an authentic rubric, calibrates confidence against result, and reflects.

The defining property of Module C, and the reason it needs its own controller rather than reusing the existing generic module engine: **a question is not one fixed shape**. It varies independently across four axes — form, stimulus, reflection, and mark-split — and every downstream screen (timers, self-mark categories, slider counts, margin-protocol symbols) must be driven by the served question's resolved shape, never hardcoded.

Source of truth for all requirements: Notion page "HSC Module C Craft of Writing Tool (Module C), Build Brief for Claude Code" plus its "Amendments v2" section, which **overrides the base spec on any conflict**.

---

## Architecture

### Decision: bespoke controller, not the generic factory

The existing tool has a shared `makeController(cfgKey)` factory (hsc-short-answer.html:4167–4921) that both Module A and Module B plug into via a `CONFIG.moduleA` / `CONFIG.moduleB` block (hsc-short-answer.html:1435–1490). That factory hardcodes assumptions that Module C breaks:

| Factory assumption | Module C reality |
|---|---|
| One `st.q` object per attempt, single marks total | `parts[]` array, each with its own marks; total displayed as a split |
| `M.categories` — fixed static array per module | Category set resolved per served question (5, 6, 9, or 10 depending on stimulus/reflection) |
| One CAST stepper, one confidence-slider pass | FRAME stepper (5 steps) + conditional form-chooser gate + prepared-piece stress test |
| One write screen, one timer, one pacing-segment array | Per-part write screens, each independently timed off `part.marks` |
| One self-mark screen against `q.markingBands` | Per-part self-mark against a `rubricId` lookup, with band ranges scaled to part marks at render time |
| Fixed 5-slot data loader (questions/quotes/syllabus/critics/stimulus) | Different file set: questions/stimulus/mentorTexts/rubrics(dictionary)/syllabus |
| `features: {...}` boolean flags toggle static panel presence | Shape-conditional branching within one flow (form gate only if >1 option; reflection screens only if present; 4th margin symbol changes by form) |

Given this, Module C gets its own controller function, written from scratch but structurally mirroring the existing screen-by-screen shape (setup → read → deconstruct → confidence → plan → write → self-mark → evidence/craft check → result+attribution → syllabus audit → compare/climb → reflect → report). It reuses:
- All shared CSS classes and design tokens (`--color-accent`, `.btn-primary`, `.s-level-btn`/`.s-mode-btn` toggle classes, panel/report-card/slider-row/checklist-row/band-ladder-row/rubric-hl hover-card classes)
- The coach voice and copy conventions (no-mark language, hidden provenance, rubric-translation dictionary hover pattern)
- The deterministic evidence-normalization algorithm (lowercase, straighten quotes, strip non-alphanumerics, collapse whitespace, substring match — never fuzzy) for the parts of Module C that use it (craft-move / stimulus-usefulness self-checks are explicitly *not* verified this way per the brief — see Known Mechanisms below)
- The validation-and-retry question-selection algorithm shape (filter pool → variety-window exclusion → random pick → validate → retry up to `maxPickAttempts` → calm empty-pool fallback with targeted relaxations, per Amendment G)

### Tab wiring

The disabled placeholder tab already exists:
```html
<button class="section-tab section-tab-disabled" data-section="5" disabled title="Coming soon">Module C<span class="section-tab-sub">Coming soon</span></button>
```
(hsc-short-answer.html:683), and `showSection(n)` hard-returns on `n === 5` (hsc-short-answer.html:3908). Both get un-gated: remove `disabled`/`section-tab-disabled`/the title, change the sub-label to the real one, and replace the early return with the same `app-moduleA`/`app-moduleB` show/hide wiring pattern, calling into the new Module C controller's `show()`.

### Data path convention (correcting the brief)

The brief's example `CONFIG.moduleC.dataFiles` block uses absolute paths (`/data/moduleCQuestions.json`). The working codebase instead resolves `base = CONFIG.dataPath` and fetches `base + f.questions` with **relative filenames only** (hsc-short-answer.html:4245–4248), so the tool keeps working from a project subpath (e.g. GitHub Pages). Module C's `dataFiles` block will use the same relative-filename convention as Module A/B, not the brief's literal example.

---

## Data Layer — 5 new JSON files

All content below is authored verbatim in the Notion brief (base spec + Amendments v2 data-contract sections) — this is a transcription task, not new authoring, except where flagged.

### `moduleCQuestions.json`
- 7 authentic past questions (2019–2025), `isAuthenticPastQuestion: true`, transcribed verbatim from the brief's "Authentic reference" section.
- ≥20 teacher-authored questions covering the full shape matrix: ≥3 each of single imaginative, single discursive, single persuasive, choice imaginative/discursive, composition+reflection, image stimulus, written stimulus, no stimulus.
- Each entry carries a `shape` object (`formOptions`, `stimulus` type, optional `reflection`, `parts[]` with per-part marks/rubricId/timing) rather than the flat `verb`/`marks` shape used by Section II/Module A/B.
- Two authentic questions (2021, 2025) reference image assets not yet supplied (`/images/module-c/auth-2021.jpg`, `auth-2025.jpg`) — ship as `assetSupplied: false` and exclude from the live serving pool until Adam provides those two files, same pattern as the existing Module A 2021 placeholder. This is narrower than it first appeared: the 10 practice stimulus images are already supplied and live (see `moduleCStimulus.json` below) — only these two authentic-exam images are outstanding.

### `moduleCStimulus.json`
- Exactly 20 entries (10 image + 10 written), fully authored in the brief with descriptions/concept tags/attributions.
- The 10 image entries reference `/images/module-c/1.jpg`–`10.jpg` and are already `assetSupplied: true` (Adam has these) — they go live immediately, no placeholder handling needed.

### `moduleCMentorTexts.json`
- 14 verified craft-move entries: `craft-mccann-01..04` (imaginative), `craft-brooks-01..04` (discursive), `craft-smith-01..04` (discursive), `craft-persuasive-01..02` (unit teaching, not tied to a named mentor text). Exceeds the brief's ≥12 minimum.
- Each entry: `id`, `text` (mentor text title), `author`, `form`, `move`, `description`, `tryPrompt`.
- Extend only with unit-accurate moves; never invent a mentor-text claim (explicit brief invariant).

### `moduleCRubrics.json`
- A dictionary (not a flat array) keyed by `rubricId`, looked up per-part rather than attached to the question.
- 2 base rubrics (`rubric-writing`, `rubric-reflection`), transcribed verbatim, `scaleMarks: 20` with a documented scaling rule (band ranges scaled to actual part marks at display time).
- 3 amendment rubrics (`rubric-analysis` 5 marks, `rubric-reflection-comparison` 10 marks, `rubric-reflection-short` 8 marks), also transcribed verbatim, used by specific authentic questions (see Amendments reconciliation below).

### `moduleCSyllabus.json`
- 6 Module C audit points + 1 standalone `overarchingInquiryQuestion` field, transcribed verbatim.

### Checklist templates & rubric-translation dictionary
- Writing checklist: 7 items (w1–w7). Reflection checklist: 5 items (r1–r5). Both fully authored in the brief.
- `stimulusChecklistBranches` config block (Amendment D): exact wording per `useMode`, 7 branches.
- Rubric translation dictionary: 16-row starter table given verbatim, target ≥24 entries (matching the ≥18/target-30 pattern used by Section II/Module B).

---

## Amendments v2 reconciliation (must happen before data transcription)

Amendments v2 explicitly supersede the base spec on conflict. Before writing any JSON, do a line-by-line diff of the base spec's "Engineering specification, exact values" section against the amendment section "J. CONFIG.moduleC updates" (and the other lettered amendments A–K), and produce one resolved values table. Known deltas already identified:
- Base `writingCategoryCount: 5` is removed; "control" splits into two categories (`structure-and-scope`, `expression-and-mechanics`) — category count becomes dynamic (5/6/9/10), never hardcoded.
- Attribution option `"luck"` → `"familiarity with the shape"`.
- Reflection rubric bands: qualitative labels → numeric ranges.
- 2022 question's part (a): base spec flags it provisional against `rubric-reflection`; Amendment B rewires it to `rubric-analysis`. Use the amended wiring.
- `syllabusPointCount`, `drillTypeCount`, `bandCount` are restated identically in both base and amendments — no change, just confirm no silent drift beyond what's listed above.

This reconciliation is a discrete implementation-plan step, not something to resolve ad hoc while transcribing.

---

## Screen Flow

Mirrors the existing S0–S12 shape, generalized for `parts[]`:

1. **Setup** — mode select (single question / timed exam / "Make your own"), level select (Foundation/Consolidation/Exam).
2. **Question Shape card** (persistent, shown on every subsequent screen) — renders all four axes in plain words: form choice (or fixed form), stimulus type, reflection presence + marks, mark split (e.g. "Writing 15, Reflection 5, total 20"), plus the scope indicator (marks → prose page-length guide, e.g. "20 marks: about two pages foolscap" — never a bracketed word/minute count).
3. **Form gate** (conditional — only if `formOptions.length > 1`) — student picks a form before proceeding.
4. **Read** — question stem + stimulus (if any) shown.
5. **FRAME stepper** — Form, Reflection, Allocation, Material, Entry idea. Level 1 locked-on, Level 2 on-by-default, Level 3 off (same toggle shape as CAST/CUBE).
6. **Prepared-piece stress test** (Levels 1–2 gate) — targets walking in with a memorised piece regardless of the question.
7. **Five-step ideation scaffold**.
8. **Confidence sliders** — dynamic count (5/6/9/10) driven by resolved categories for the writing part; a separate pass for the reflection part if present.
9. **Plan** (level-dependent scaffolding, fades by level; after-answer structures never fade).
10. **Write** — one screen per part, in `parts[]` order. Each part's timer derives from `part.marks * writingSecondsPerMark`; pacing segments summed per part.
11. **Self-mark** — craft-chain margin protocol: triangle (craft move) → square (effect) → circle (stimulus link) → 4th symbol conditional on chosen form (diamond for imaginative/discursive conceptual insight, arrow for persuasive claim+warrant/rebuttal). Repeated per part against that part's `rubricId`, with band ranges scaled to the part's marks at render time.
12. **Stimulus usefulness self-check** and **craft transfer self-check** — checkbox-driven, explicitly *not* deterministic text-match verifiers (unlike the Module A/B evidence checker) since Module C writing has no fixed answer to verify against. Each checkbox's visibility/state handler is scoped narrowly to its own panel only (see Known Gotchas).
13. **Result + attribution** — per-part result sliders, gap = result − confidence, 5 fixed attribution options (amended list), same `attributionNoteMaxChars`.
14. **Syllabus/rubric audit** — 6 points + the standalone overarching inquiry question.
15. **Compare / climb one band** — rubric-translation dictionary hover cards, same hover/click toggle pattern (official vs. student-voice wording) as Section II/Module B.
16. **Reflection** — free-text "next time I want to focus on."
17. **Session report** — screenshot-only: focus list, what was practised, calibration snapshot, coverage map, "keep your own copies" prompt. No download.

### "Make your own" mode (Amendment K)
A third top-level mode beyond single-response/timed-exam. Student dials form/stimulus/mark-split/mentor-toggle directly. Resolved against a small fixed `moduleCCustomStems.json`-style bank keyed by shape signature — **never generated on the fly**.

### Pool preview before serving (Amendment G)
When filter overrides are active, show a match count and name which override shrank the pool, before serving a question. On an empty pool, offer targeted relaxations in a specified order — never a silent fallback to an unrelated question.

### Micro-skill drill gym
9 drill types (vs. Section II's 6 / Module B's 8), keyed to Module C marker patterns: open with power, bend the stimulus, cumulative sentence, register shift, and others named in the brief.

---

## Exact-wording invariants (from the brief, verbatim requirements)

- Never: "You are Band X" / "Your mark is" / "The tool thinks" / "This scores low."
- Always instead: "If this is the descriptor you selected" / "The next descriptor asks for."
- `isAuthenticPastQuestion` and `year` are never surfaced in any UI element.
- Never state or imply there is no NESA sample for a question (this exact false claim is explicitly tested against — TC-28).
- Ticking "craft" or "form" in self-mark requires naming a specific technique from the per-form fixed list (~9–13 named techniques per form) — never ticking the category in the abstract.

---

## Known Gotchas To Avoid Repeating (from prior Module A/B build)

1. **CSS active-fill bug.** Toggle buttons need both the JS `.active` class swap *and* a matching CSS rule. The shared rule already covers `.s-level-btn.active`/`.s-mode-btn.active`/`.s2-level-btn.active`/`.s2-mode-btn.active` (hsc-short-answer.html:483–486). Any new Module C button type (form-chooser, stimulus-choice) must either reuse these exact class names or get added to that shared selector at build time — don't add a new per-module selector and don't forget the CSS half of a JS toggle.
2. **`skipToNext()` needs an explicit screen-name → next-screen function map** (mirroring hsc-short-answer.html:4887–4907), never "click the first enabled `.btn-primary`" — the latter silently no-ops when the primary button starts disabled pending required input. Module C's map will have more states given per-part write/self-mark screens.
3. **Every screen-render function must set `st.screen = '<name>'` at entry** — this is what the skip-map depends on.
4. **Render `q.stemText` (and the Question Shape card) on every screen that plausibly needs it**, including write screens — this was previously missed on a write screen in the generic factory.
5. **Scope each self-check checkbox's change handler to its own panel only**, not to sibling panels — a prior bug had one checkbox's handler recompute unrelated panels' visibility.
6. **Desktop-only gate**: wire `layout.minViewportPx: 1024` exactly like Module A/B's `show()` gate (hsc-short-answer.html:4911–4913) — `#app-modulec-main` will render empty below 1024px width, which matters for local verification.
7. **Local preview sandboxing**: reading/serving files under this Desktop/Documents path can silently fail for some tools (Bash `grep`/shell reads returned empty with no error on this file during design research, while the Read tool worked fine). For dev-server preview, copy the HTML + `data/` into scratchpad and serve from there, consistent with prior practice on this project.

---

## Config shape (illustrative — final values resolved during Amendments reconciliation)

```javascript
moduleC: {
  key: 'moduleC', sectionN: 5,
  tabLabel: 'Module C',
  fullHeading: 'Paper 2, Section III: Module C, The Craft of Writing',
  totalMarks: 20, bandCount: 5,
  writingSecondsPerMark: /* resolved from amendments */,
  planningSeconds: 300, drillSeconds: 240, tickMs: 1000,
  slider: { min: 0, max: 100, step: 1 },
  attributionOptions: ['preparation', 'the question', 'effort', 'stress', 'familiarity with the shape'],
  attributionNoteMaxChars: 200,
  selection: { varietyWindow: 4, maxPickAttempts: 20 },
  evidence: { minNormalisedChars: 8 },
  layout: { minViewportPx: 1024 },
  defaultLevel: 1,
  dataFiles: { questions: 'moduleCQuestions.json', stimulus: 'moduleCStimulus.json', mentorTexts: 'moduleCMentorTexts.json', rubrics: 'moduleCRubrics.json', syllabus: 'moduleCSyllabus.json' },
  drillTypeCount: 9,
  frame: { level1: 'on-locked', level2: 'on-default', level3: 'off' }
}
```

---

## Definition of Done

- Module C tab is un-gated in the tab bar and `showSection`, matches the existing `Paper 2: Modules` bracket styling.
- All 5 data files exist, transcribed verbatim from the brief with Amendments v2 applied, and pass a basic shape/count check (7 authentic + ≥20 teacher-authored questions, 20 stimulus entries, 14 mentor-text moves, 5 rubrics, 6+1 syllabus points).
- A question with any valid shape combination (form choice or fixed, any stimulus type, with/without reflection) can be served, deconstructed via FRAME, planned, written per-part, self-marked per-part against the correct scaled rubric, calibrated, and produces a session report — end to end, no console errors.
- Slider/category counts are read from the resolved question's categories at runtime in every case — never hardcoded to 5/6/9/10 anywhere in the controller.
- The 4th margin-protocol symbol correctly switches between diamond (imaginative/discursive) and arrow (persuasive) based on the chosen form.
- "Make your own" mode resolves only against the fixed custom-stems bank — never fabricates a question.
- Pool preview and empty-pool relaxation behave per Amendment G when overrides are active.
- Entries referencing unsupplied image assets are excluded from the live serving pool and clearly flagged, not silently broken.
- No UI element ever reveals `isAuthenticPastQuestion`/`year`, ever claims no sample exists, or ever gives a mark/band verdict in forbidden language.
- Desktop-only gate (≥1024px) behaves identically to Module A/B.
- Tool still has zero network/model calls, zero persistence, for Module C exactly as for every other tab.
