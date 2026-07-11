# Module C Controller Part 1 (Setup → Confidence) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working slice of the Module C tab: a student can open the tab, get a served question of any shape, see it deconstructed via the Question Shape card and FRAME, choose a form when offered (via the prepared-piece stress test), and rate per-criterion confidence — with every count, label and gate driven by the served question's actual shape, never hardcoded.

**Architecture:** A new bespoke controller function `makeModuleCController()`, added to the *same* shared `<script>` IIFE that already defines `makeController`/`CONTENT`/`window.__moduleShow` (hsc-short-answer.html, the block starting `<!-- ══ Paper 2 module engine (Module A / Module B) ══ -->`). It is bespoke, not a call to `makeController('moduleC')`, because Module C's question shape varies across 4 axes (form/stimulus/reflection/mark-split) in ways the generic factory doesn't support — see `docs/superpowers/specs/2026-07-03-module-c-craft-of-writing-design.md` for the full rationale. It reuses the same helpers (`$`, `esc`), the same `CONFIG`/`CONTENT` object shape, the same CSS classes, and registers into the existing `window.__moduleShow` dispatcher exactly like `moduleA`/`moduleB` do, so `showSection(5)` needs only a one-line change.

**Scope of this plan (Part 1 of 3):** States S0–S4 of the base spec's screen state machine (Setup, Read+Shape-card, FRAME, Form-chooser+stress-test, Confidence). **Part 2** will cover S5–S13 (Plan, Write, Self-mark+margin-protocol, Checks, Result+Attribution, Syllabus audit, Compare/climb, Reflection, Report). **Part 3** will cover the timed-exam mode, the micro-skill drill gym, "Make your own" mode (Amendment K), and pool preview (Amendment G). The Level-1 "concept unpacking panel" is deferred to Part 2 as well, since the brief only sketches it conceptually and doesn't author its content dictionary — it is not required for the core flow to work correctly.

**Tech Stack:** Vanilla JS, inline in `hsc-short-answer.html`, no build step, no dependencies. This is DOM-rendering code with no automated test harness in this codebase (Module A/B have none either) — verification for each task is a manual browser check using the Claude Preview tools (start the dev server, click through, inspect state), not an automated test run. Data files (`moduleC{Rubrics,Syllabus,MentorTexts,Stimulus,CustomStems,Questions}.json`) already exist and are validated — see `docs/superpowers/plans/2026-07-03-module-c-data-layer.md`.

---

## File Structure

Single file modified throughout: `hsc-short-answer/hsc-short-answer.html`. No new files. Changes land in 4 regions of the existing file:

1. **Tab bar markup** (~line 683): un-gate the disabled "Module C" tab.
2. **New container markup** (near the existing `app-moduleA`/`app-moduleB` divs): add `app-moduleC` + `moduleC-desktop-gate` divs.
3. **`showSection(n)`** (~line 3907): remove the `n === 5` early return, wire `n === 5` to `window.__moduleShow('moduleC')`.
4. **The Paper 2 module engine `<script>` block** (~line 3976 onward): add `CONFIG.moduleC`, `CONTENT.moduleC`, the new `makeModuleCController()` function, and update the `window.__moduleShow` dispatcher to call it instead of `makeController('moduleC')`.

---

## Local Preview Setup (read before Task 1)

Two known environment gotchas apply to every task in this plan:

- **Sandboxing:** reading/serving files under this Desktop/Documents path can behave oddly for some tools. If `Bash`'s `grep`/`cat` return nothing on `hsc-short-answer.html` even though the content exists, use the `Read` tool instead — it works reliably. For running a local dev server to preview, copy `hsc-short-answer.html` and the `data/` folder into a scratch directory and serve from there if the in-place server won't start.
- **Desktop-only gate:** the app hides its main content below `layout.minViewportPx` (1024px). When verifying in the Claude Preview browser, resize the viewport to at least 1024px wide first, or `#app-moduleC-main` will render empty and look broken when it isn't.

---

### Task 1: Un-gate the Module C tab and add its container markup

**Files:**
- Modify: `hsc-short-answer/hsc-short-answer.html` (tab bar, container markup, `showSection`)

- [ ] **Step 1: Read the current tab bar and `showSection` code**

Read `hsc-short-answer.html` around the tab bar (search for `Module C` — it's inside the `Paper 2: Modules` `paper-group`, currently rendered as a disabled placeholder) and around `showSection(n)` (search for `Module C — disabled placeholder`). Also read the markup for the existing `app-moduleA`/`app-moduleB` container divs and their desktop-gate divs (search for `moduleA-desktop-gate` and `app-moduleA`) so the new Module C markup matches their structure exactly (same classes, same nesting).

- [ ] **Step 2: Un-gate the tab button**

Change:
```html
<button class="section-tab section-tab-disabled" data-section="5" disabled title="Coming soon">Module C<span class="section-tab-sub">Coming soon</span></button>
```
to:
```html
<button class="section-tab" data-section="5">Module C<span class="section-tab-sub">Craft of Writing</span></button>
```

- [ ] **Step 3: Add the `app-moduleC` container markup**

Immediately after the closing `</div>` of the `app-moduleB` container (find it by reading the existing Module B block in full so the new block matches its exact structure — same `desktop-gate` div with the same inner "built for a laptop or desktop" message, same `-main` div), add a new block with the same shape but `moduleC` ids:
```html
<div class="app wide" id="app-moduleC" style="display:none;">
  <div class="desktop-gate" id="moduleC-desktop-gate">
    <p>This tool is built for a laptop or desktop.</p>
  </div>
  <div id="app-moduleC-main"></div>
</div>
```
(Match the exact desktop-gate inner markup/copy used by `moduleA-desktop-gate` — copy it verbatim, don't invent new wording.)

- [ ] **Step 4: Wire `showSection(5)`**

Change:
```javascript
function showSection(n) {
  if (n === 5) return; // Module C — disabled placeholder
```
to:
```javascript
function showSection(n) {
```
And add, alongside the existing `n === 3`/`n === 4` lines:
```javascript
  $('app-moduleC').style.display = n === 5 ? 'block' : 'none';
```
And alongside the existing `if (n === 3 ...)`/`if (n === 4 ...)` lines:
```javascript
  if (n === 5 && window.__moduleShow) { $('app-moduleC').classList.add('wide'); window.__moduleShow('moduleC'); }
```

- [ ] **Step 5: Verify in browser**

Use the Claude Preview tools: start the dev server (copy the HTML + `data/` to scratch first if the in-place server won't start), resize viewport to at least 1024px wide, navigate to the tool, click the "Module C" tab. Expected: the tab is now clickable (not greyed out), switches to a blank `app-moduleC-main` area (no controller exists yet, so nothing renders — that's expected for this task), and no console errors appear. Check `preview_console_logs` for errors.

- [ ] **Step 6: Commit**

```bash
git add hsc-short-answer.html && git commit -m "feat: un-gate Module C tab and add container markup"
```

---

### Task 2: `CONFIG.moduleC` and `CONTENT.moduleC` blocks

**Files:**
- Modify: `hsc-short-answer/hsc-short-answer.html` (add to the existing `CONFIG` object and `CONTENT` object inside the Paper 2 module engine script)

This task adds only data/config — no rendering logic yet. All values below are the base spec's values with every Amendments-v2 change already applied (dynamic category counts instead of a hardcoded `writingCategoryCount`, amended attribution options, margin-protocol-by-form, scope-guidance-by-marks, pool-preview/custom-mode flags for later parts).

- [ ] **Step 1: Add `CONFIG.moduleC`**

Add this as a new key inside the existing `CONFIG` object (find `moduleB: { ... }` and add `moduleC` as a sibling after it, inside the object, before its closing `}`):

```javascript
  moduleC: {
    key: 'moduleC', sectionN: 5,
    tabLabel: 'Module C',
    fullHeading: 'Paper 2, Section III: Module C, The Craft of Writing',
    totalMarks: 20, bandCount: 5,
    writingSecondsPerMark: 120,
    planningSeconds: 300, drillSeconds: 240, tickMs: 1000,
    slider: { min: 0, max: 100, step: 1, initial: null },
    attributionOptions: ['preparation', 'the question', 'effort', 'stress', 'familiarity with the shape'],
    attributionNoteMaxChars: 200,
    selection: { varietyWindow: 4, maxPickAttempts: 20 },
    forms: ['imaginative', 'discursive', 'persuasive'],
    frame: { level1: 'on-locked', level2: 'on-default', level3: 'off' },
    segmentedPacing: { level1: true, level2: true, level3: false },
    reflectionCategoryCount: 4,
    syllabusPointCount: 6,
    drillTypeCount: 9,
    layout: { minViewportPx: 1024, leftPanelPercent: 60, rightPanelPercent: 40, gapPx: 24 },
    nudgeAtSegmentEnd: true,
    nudgeRepeat: false,
    marginProtocolByForm: {
      imaginative: { fourth: 'diamond', meaning: 'moment of conceptual insight' },
      discursive: { fourth: 'diamond', meaning: 'turn from anecdote to earned idea' },
      persuasive: { fourth: 'arrow', meaning: 'claim landed with warrant or rebuttal' }
    },
    scopeGuidanceByMarks: {
      '20': 'about two pages foolscap',
      '15': 'about one and a half pages foolscap',
      '12': 'about one and a quarter pages foolscap',
      '10': 'about one page foolscap',
      '8': 'about three quarters of a page foolscap',
      '5': 'about half a page foolscap'
    },
    poolPreview: { enabled: true },
    customMode: { enabled: true, reflectionMaxMarks: 10, writingMinMarks: 10 },
    defaultLevel: 1,
    dataFiles: {
      questions: 'moduleCQuestions.json',
      stimulus: 'moduleCStimulus.json',
      mentorTexts: 'moduleCMentorTexts.json',
      rubrics: 'moduleCRubrics.json',
      syllabus: 'moduleCSyllabus.json',
      customStems: 'moduleCCustomStems.json'
    }
  }
```

Note: `dataFiles` uses relative filenames (not the brief's literal `/data/...` example) to match this codebase's `CONFIG.dataPath`-relative convention (see `load()` in `makeController`, which does `const base = CONFIG.dataPath, f = cfg.dataFiles;`).

- [ ] **Step 2: Add `CONTENT.moduleC`**

Add this as a new key inside the existing `CONTENT` object (sibling of `moduleA`/`moduleB`):

```javascript
    moduleC: {
      setupCoach: 'A single 20-mark Craft of Writing task. The question varies in form, stimulus, reflection and mark split — the Question Shape card always shows you exactly what you have been asked to produce. You plan and write by hand, then self-mark against the authentic rubric. The tool never gives you a mark — it holds up the yardstick.',
      writingChecklistCategories: ['stimulus', 'idea', 'craft', 'form', 'structure-and-scope', 'expression-and-mechanics'],
      reflectionChecklistCategories: ['choice', 'connection', 'evaluation', 'expression'],
      critDef: {
        stimulus: 'Taking one idea from the stimulus and developing it across the piece, so it drives the writing rather than being described or tacked on.',
        idea: 'A clear controlling idea and conceptual insight, rather than a piece driven by plot and event.',
        craft: 'A deliberate craft move learned from a mentor text, named and visible in the piece.',
        form: 'Honouring the conventions of the chosen form, imaginative, discursive or persuasive.',
        'structure-and-scope': 'Scope matched to the marks and time, with a shape that holds together start to finish.',
        'expression-and-mechanics': 'Controlled expression, punctuation and sentence variety throughout.',
        choice: 'Naming a specific craft decision in the student\'s own piece.',
        connection: 'Tying that decision to a studied or mentor text with genuine influence.',
        evaluation: 'Judging the effect of the choice rather than narrating the process.',
        expression: 'Clarity and control in the reflection\'s own writing.'
      },
      frameSteps: [
        { key: 'form', label: 'F — Form', help: 'Identify every form the question allows. Where a choice is offered, commit to one for a stated reason, then honour its conventions.', ph: 'This question allows… I am choosing… because…' },
        { key: 'reflection', label: 'R — Reflection', help: 'Determine whether a reflection is required, what it asks, and which studied or mentor texts it expects you to draw on.', ph: 'A reflection is / is not required. It asks…' },
        { key: 'allocation', label: 'A — Allocation', help: 'Read how the marks are split across parts and convert that into a time plan.', ph: 'The marks split as… so my time plan is…' },
        { key: 'material', label: 'M — Material', help: 'Identify the stimulus type and decide how you will genuinely use it, not just refer to it.', ph: 'The stimulus is… I will use it by…' },
        { key: 'entryIdea', label: 'E — Entry idea', help: 'State the controlling idea or concept your piece will explore, in your own words, before you write.', ph: 'My piece will explore the idea that…' }
      ],
      formSafeguardFeatures: {
        imaginative: ['narrative voice', 'cumulative sentence', 'second person address', 'mise en abyme', 'in medias res', 'imagery', 'motif', 'symbolism', 'shifting time', 'dialogue', 'free indirect discourse', 'sentence rhythm', 'show not tell'],
        discursive: ['oscillation between anecdote and idea', 'personal voice', 'intertextual reference', 'sectioned structure', 'register shift', 'extended metaphor', 'rhetorical question', 'open ended reflection', 'digression that earns its place'],
        persuasive: ['thesis and stance', 'anecdote as evidence', 'inclusive language', 'rhetorical question', 'tricolon', 'high modality', 'counterargument and rebuttal', 'call to action', 'controlled tone']
      },
      stressTestBoxes: [
        { key: 'wordsToHonour', label: 'The exact words from this question and stimulus my piece must honour' },
        { key: 'formChoice', label: 'The form this question actually allows, and the one I am choosing' },
        { key: 'preparedMisfit', label: 'Any prepared idea I am tempted to reuse, and the one part of it that does not fit this question' },
        { key: 'bendPlan', label: 'How I will bend my idea so the stimulus drives it, or why I am starting fresh' }
      ],
      dict: [
        { phrase: 'Skilfully responds to the stimulus', plain: 'You take one idea from the stimulus and grow it across the whole piece, so it drives the writing rather than sitting on top of it.' },
        { phrase: 'Crafts language skilfully', plain: 'Your choices of voice, syntax and imagery are deliberate and the reader feels the effect without you pointing to it.' },
        { phrase: 'Sophisticated and engaging', plain: 'There is a real idea underneath, the character and setting feel true, and the reader stays invested all the way through.' },
        { phrase: 'Skilful control of language and structure', plain: 'Sentence length, vocabulary and paragraphing all vary on purpose and serve your point, start to finish.' },
        { phrase: 'Stimulus is tacked on', plain: 'The stimulus is only mentioned or described, not developed. This usually limits the response because Module C rewards a stimulus that drives the piece.' },
        { phrase: 'Crafting not present', plain: 'The language is competent but nothing feels like a deliberate choice. This usually limits the response because Module C rewards visible, purposeful craft.' },
        { phrase: 'Cliche', plain: 'A ready made idea, character or phrase a reader has seen many times. Replace it with something precise and your own.' },
        { phrase: 'Over plotting', plain: 'Too much action and event crowding out language craft and idea. This usually limits the response because Module C rewards insight over plot.' },
        { phrase: 'Controlling idea', plain: 'The one concept your piece is really about, that a reader could name after reading it.' },
        { phrase: 'Power and precision', plain: 'Every word earns its place and the writing hits hard because it is exact, not because it is loud.' },
        { phrase: 'Discursive', plain: 'Exploratory writing that moves between personal experience and bigger ideas, thinking on the page rather than arguing to win.' },
        { phrase: 'Imaginative', plain: 'Creative writing that carries an idea through character, setting and voice, not just a sequence of events.' },
        { phrase: 'Persuasive', plain: 'Writing that takes a clear stance and moves the reader toward it with controlled, deliberate technique.' },
        { phrase: 'Reflection that narrates', plain: 'A reflection that only retells what you did. Move to why the choice works and what it does to the reader.' },
        { phrase: 'Deliberate craft choice', plain: 'A technique you chose on purpose for an effect, that you could point to and explain.' },
        { phrase: 'Honours the form', plain: 'The piece uses the moves that belong to the form you chose and does not accidentally drift into another form.' }
      ]
    }
```

- [ ] **Step 3: Verify in browser**

No new rendering exists yet. Verify only that the page still loads with no console errors (a JS syntax error in the object literals would break the whole script). Use `preview_console_logs` with `level: 'error'` after reloading.

- [ ] **Step 4: Commit**

```bash
git add hsc-short-answer.html && git commit -m "feat: add CONFIG.moduleC and CONTENT.moduleC blocks"
```

---

### Task 3: `makeModuleCController()` skeleton, data loading, and shape resolution

**Files:**
- Modify: `hsc-short-answer/hsc-short-answer.html`

This is the core state/data plumbing: loading the 6 data files, picking a question, and resolving its shape into the concrete per-part structure every later screen reads from. No rendering yet — just the pure logic plus a `show()` that proves the plumbing works by logging to console.

- [ ] **Step 1: Add the controller skeleton**

Add this new function inside the same IIFE as `makeController`, placed right after `makeController`'s closing `}` (before `const controllers = {};`):

```javascript
  function makeModuleCController() {
    const cfg = CONFIG.moduleC;
    const M = CONTENT.moduleC;
    const mainEl = $('app-moduleC-main');
    let data = { questions: [], stimulus: [], mentorTexts: [], rubrics: {}, syllabus: null, customStems: [] };
    let loaded = false;
    let st = fresh();
    let timers = {};

    function fresh() {
      return {
        screen: null, mode: 'single', level: cfg.defaultLevel, overrides: {},
        servedSignatures: [],
        q: null, resolvedShape: null, chosenForm: null,
        frame: { form: '', reflection: '', allocation: '', material: '', entryIdea: '' },
        stressTest: { wordsToHonour: '', formChoice: '', preparedMisfit: '', bendPlan: '' },
        confidence: {}, result: {}, attribution: { choice: null, note: '' },
        studentVoice: false
      };
    }

    const clearT = () => { Object.values(timers).forEach(t => clearInterval(t)); timers = {}; };
    const render = html => { clearT(); mainEl.innerHTML = html; window.scrollTo(0, 0); };
    const esc2 = esc;

    // ── Data load ───────────────────────────────────────────────────────────
    async function load() {
      if (loaded) return true;
      const base = CONFIG.dataPath, f = cfg.dataFiles;
      const [questions, stimulus, mentorTexts, rubrics, syllabus, customStems] = await Promise.all([
        fetch(base + f.questions).then(r => r.json()),
        fetch(base + f.stimulus).then(r => r.json()),
        fetch(base + f.mentorTexts).then(r => r.json()),
        fetch(base + f.rubrics).then(r => r.json()),
        fetch(base + f.syllabus).then(r => r.json()),
        fetch(base + f.customStems).then(r => r.json())
      ]);
      data = { questions, stimulus, mentorTexts, rubrics, syllabus, customStems };
      loaded = true;
      return true;
    }

    // ── Shape signature (for variety-window selection, Part 3) ───────────────
    function shapeSignature(q) {
      const forms = q.shape.formOptions.length > 1 ? 'choice' : q.shape.formOptions[0];
      const stim = q.shape.stimulus.type;
      const refl = q.shape.reflection.required ? 'ref' : 'noref';
      return forms + '|' + stim + '|' + refl;
    }

    // ── Selection ───────────────────────────────────────────────────────────
    function servable(q) {
      if (q.shape.stimulus.type === 'image' && 'assetSupplied' in q.shape.stimulus && q.shape.stimulus.assetSupplied === false) return false;
      return true;
    }
    function selectQuestion() {
      const pool = data.questions.filter(servable);
      if (!pool.length) return null;
      const distinctSignatures = new Set(pool.map(shapeSignature)).size;
      const win = Math.min(cfg.selection.varietyWindow, distinctSignatures);
      const recent = st.servedSignatures.slice(-win);
      let cands = pool.filter(q => recent.indexOf(shapeSignature(q)) === -1);
      if (!cands.length) cands = pool;
      const pick = cands[Math.floor(Math.random() * cands.length)];
      st.servedSignatures.push(shapeSignature(pick));
      return pick;
    }

    // ── Shape resolution: turns a bank question into everything the UI needs ─
    function resolveStimulus(q) {
      const s = q.shape.stimulus;
      if (s.type === 'none') return null;
      if (s.type === 'choice') {
        return { type: 'choice', options: s.allowedStimulusIds.map(id => data.stimulus.find(e => e.id === id)), instruction: s.instruction };
      }
      if (s.stimulusId) {
        const entry = data.stimulus.find(e => e.id === s.stimulusId);
        return Object.assign({ instruction: s.instruction }, entry);
      }
      // authentic questions embed their stimulus inline rather than referencing the bank
      return s;
    }
    function parseRange(range) {
      const m = String(range).match(/^(\d+)(?:\s+to\s+(\d+))?$/);
      if (!m) throw new Error('Unrecognised band range format: "' + range + '"');
      const lo = parseInt(m[1], 10);
      const hi = m[2] ? parseInt(m[2], 10) : lo;
      return [lo, hi];
    }
    function scaleBand(band, partMarks, scaleMarks) {
      // Most reflection-bearing questions have a writing part worth fewer than
      // 20 marks, and several teacher-authored reflection parts are worth fewer
      // than rubric-reflection's native 10 — so scaling is the common case, not
      // an edge case. Rule (from the brief): keep the descriptor wording
      // verbatim, scale each band's numeric range to the part marks, rounding
      // to whole marks. When partMarks already equals scaleMarks, return the
      // band unchanged (this is the majority case for single 20-mark writing
      // parts and for rubrics already authored at their only usage size).
      if (partMarks === scaleMarks) return band;
      const [lo, hi] = parseRange(band.range);
      const scale = partMarks / scaleMarks;
      const scaledLo = Math.max(1, Math.round(lo * scale));
      const scaledHi = Math.round(hi * scale);
      const range = scaledLo === scaledHi ? String(scaledLo) : (scaledLo + ' to ' + scaledHi);
      return Object.assign({}, band, { range });
    }
    function resolvePart(part) {
      const rubric = data.rubrics[part.rubricId];
      if (!rubric) throw new Error('Unknown rubricId "' + part.rubricId + '"');
      const bands = rubric.bands.map(b => scaleBand(b, part.marks, rubric.scaleMarks));
      return Object.assign({}, part, { rubric, bands });
    }
    function resolveShape(q) {
      const stimulus = resolveStimulus(q);
      const parts = q.shape.parts.map(resolvePart);
      return {
        formOptions: q.shape.formOptions,
        stimulus,
        reflection: q.shape.reflection,
        parts,
        totalMarks: q.shape.totalMarks
      };
    }

    function nextQuestion() {
      const q = selectQuestion();
      if (!q) return false;
      st.q = q;
      st.resolvedShape = resolveShape(q);
      st.chosenForm = q.shape.formOptions.length === 1 ? q.shape.formOptions[0] : null;
      st.frame = { form: '', reflection: '', allocation: '', material: '', entryIdea: '' };
      st.stressTest = { wordsToHonour: '', formChoice: '', preparedMisfit: '', bendPlan: '' };
      st.confidence = {}; st.result = {}; st.attribution = { choice: null, note: '' };
      return true;
    }

    // ── Public show ─────────────────────────────────────────────────────────
    async function show() {
      const gate = $('moduleC-desktop-gate');
      if (window.innerWidth < cfg.layout.minViewportPx) { gate.classList.add('show'); mainEl.style.display = 'none'; return; }
      gate.classList.remove('show'); mainEl.style.display = 'block';
      if (!loaded) {
        try { await load(); } catch (err) { mainEl.innerHTML = '<div class="error-msg">Could not load the Module C materials. ' + esc2(err.message) + '</div>'; return; }
      }
      if (!mainEl.innerHTML.trim()) initSetup();
    }

    function initSetup() {
      st.screen = 'setup';
      render('<p style="color:var(--color-muted);">Module C setup screen placeholder — implemented in Task 4.</p>');
    }

    return { show };
  }
```

- [ ] **Step 2: Wire the dispatcher to use the new controller for `moduleC`**

Change:
```javascript
  const controllers = {};
  window.__moduleShow = function (key) {
    if (!controllers[key]) {
      controllers[key] = makeController(key);
      window.addEventListener('resize', () => { if ($('app-' + key).style.display !== 'none') controllers[key].show(); });
    }
    controllers[key].show();
  };
```
to:
```javascript
  const controllers = {};
  window.__moduleShow = function (key) {
    if (!controllers[key]) {
      controllers[key] = key === 'moduleC' ? makeModuleCController() : makeController(key);
      window.addEventListener('resize', () => { if ($('app-' + key).style.display !== 'none') controllers[key].show(); });
    }
    controllers[key].show();
  };
```

- [ ] **Step 3: Verify in browser**

Reload, click the Module C tab (viewport ≥1024px). Expected: the placeholder text "Module C setup screen placeholder — implemented in Task 4." renders, no console errors. Then use `preview_eval` to sanity-check the data loaded correctly, e.g.:
```javascript
// after clicking into Module C once (so load() has run)
fetch('data/moduleCQuestions.json').then(r => r.json()).then(d => console.log('questions:', d.length))
```
Expected: `questions: 27` (this just confirms the file is reachable at the path the app will actually fetch from — the real proof comes from Task 4 rendering real content). Also resize the viewport below 1024px and confirm the desktop-gate message appears and `app-moduleC-main` hides; resize back above 1024px and confirm it returns.

**Exhaustively check `resolveShape()`/`scaleBand()` against all 27 questions, not just a few clicked at random.** These are pure functions over the fetched JSON with no DOM dependency, so they can be verified standalone via `preview_eval` without touching the app's internal closures — paste this (it re-implements the same scaling logic to cross-check independently, deliberately not just calling into the app):
```javascript
Promise.all([
  fetch('data/moduleCQuestions.json').then(r => r.json()),
  fetch('data/moduleCRubrics.json').then(r => r.json())
]).then(([questions, rubrics]) => {
  function parseRange(range) {
    const m = String(range).match(/^(\d+)(?:\s+to\s+(\d+))?$/);
    const lo = parseInt(m[1], 10), hi = m[2] ? parseInt(m[2], 10) : lo;
    return [lo, hi];
  }
  let failures = [];
  questions.forEach(q => {
    q.shape.parts.forEach(part => {
      const rubric = rubrics[part.rubricId];
      if (!rubric) { failures.push(q.id + '/' + part.id + ': unknown rubricId'); return; }
      rubric.bands.forEach(b => {
        try {
          if (part.marks !== rubric.scaleMarks) {
            const [lo, hi] = parseRange(b.range);
            const scale = part.marks / rubric.scaleMarks;
            const sLo = Math.max(1, Math.round(lo * scale)), sHi = Math.round(hi * scale);
            if (sLo > sHi) failures.push(q.id + '/' + part.id + ' band ' + b.band + ': scaled lo>hi (' + sLo + '>' + sHi + ')');
          }
        } catch (e) { failures.push(q.id + '/' + part.id + ' band ' + b.band + ': ' + e.message); }
      });
    });
  });
  console.log(failures.length === 0 ? 'ALL 27 QUESTIONS SCALE CLEANLY' : 'FAILURES: ' + JSON.stringify(failures, null, 2));
});
```
Expected console output: `ALL 27 QUESTIONS SCALE CLEANLY`. If this fails for any question, the real `resolveShape()` will throw when that question is served (via `parseRange`'s regex not matching, or a similar issue) — fix `scaleBand`/`parseRange` before moving on, don't defer this to Part 2, since `nextQuestion()` is called from Task 4 onward and a crash here blocks the whole flow for that shape.

- [ ] **Step 4: Commit**

```bash
git add hsc-short-answer.html && git commit -m "feat: add makeModuleCController skeleton with data load and shape resolution"
```

---

### Task 4: Setup screen (mode, level, start)

**Files:**
- Modify: `hsc-short-answer/hsc-short-answer.html`

- [ ] **Step 1: Replace the `initSetup` placeholder**

Replace the placeholder `initSetup` function from Task 3 with:

```javascript
    function initSetup() {
      st.screen = 'setup';
      render(
        '<h1>' + esc2(cfg.fullHeading) + '</h1>' +
        '<p class="coach">' + esc2(M.setupCoach) + '</p>' +
        '<div style="margin:var(--space) 0;"><h2>Level</h2><div class="btn-row" id="moduleC-level-btns" style="margin-top:6px;">' +
        [[1, '1 · Foundation'], [2, '2 · Consolidation'], [3, '3 · Exam']].map(([v, l]) =>
          '<button class="btn-secondary s-level-btn' + (st.level === v ? ' active' : '') + '" data-level="' + v + '">' + l + '</button>').join('') +
        '</div></div>' +
        '<div class="spinner" id="moduleC-setup-spinner" style="display:none;">Loading materials…</div>' +
        '<div class="error-msg" id="moduleC-setup-error"></div>' +
        '<div class="btn-row"><button class="btn-primary" id="moduleC-start-btn">Get a question</button></div>'
      );
      mainEl.querySelectorAll('.s-level-btn').forEach(b => b.addEventListener('click', () => {
        st.level = parseInt(b.dataset.level);
        mainEl.querySelectorAll('.s-level-btn').forEach(x => x.classList.toggle('active', x === b));
      }));
      $('moduleC-start-btn').addEventListener('click', startFlow);
    }
    async function startFlow() {
      const sp = $('moduleC-setup-spinner'), errEl = $('moduleC-setup-error');
      errEl.textContent = '';
      if (!loaded) {
        sp.style.display = 'block';
        try { await load(); } catch (err) { sp.style.display = 'none'; errEl.textContent = 'Could not load the materials. ' + err.message; return; }
        sp.style.display = 'none';
      }
      if (!nextQuestion()) { errEl.textContent = 'No questions match right now. This should not happen with the full bank — check the console.'; return; }
      questionScreen();
    }
    function questionScreen() {
      st.screen = 'question';
      render('<p style="color:var(--color-muted);">Question screen placeholder — implemented in Task 5.</p>');
    }
```

Note: mode selection (single / timed exam / drill / make-your-own) is deferred to Part 3 — this task only wires Level, since Part 1's scope is the single-response flow at any level.

- [ ] **Step 2: Verify in browser**

Reload, open the Module C tab. Expected: heading "Paper 2, Section III: Module C, The Craft of Writing", the coach line, three level buttons (Foundation/Consolidation/Exam) that toggle `.active` correctly when clicked (use `preview_inspect` on `.s-level-btn.active` to confirm it actually fills green — this exact CSS class pairing was the source of a known past bug, see the plan's "Known Gotchas" in the design spec, so don't skip this check), and a "Get a question" button. Click it — expected: the placeholder text "Question screen placeholder — implemented in Task 5." appears with no console errors.

- [ ] **Step 3: Commit**

```bash
git add hsc-short-answer.html && git commit -m "feat: Module C setup screen (level selection, get a question)"
```

---

### Task 5: Question Shape card

**Files:**
- Modify: `hsc-short-answer/hsc-short-answer.html`

The Question Shape card is a persistent banner rendering all four axes in plain words. It must appear on every subsequent screen in this plan (and Part 2/3), so build it now as a standalone function every screen calls.

- [ ] **Step 1: Add `questionShapeCardHtml()`**

Add this function near the top of `makeModuleCController` (after `resolveShape`, before `nextQuestion`):

```javascript
    function formsLine() {
      const opts = st.resolvedShape.formOptions;
      if (opts.length === 1) return opts[0];
      if (st.chosenForm) return st.chosenForm + ' (chosen)';
      return 'Choose one, ' + opts.join(' or ');
    }
    function stimulusLine() {
      const s = st.resolvedShape.stimulus;
      if (!s) return 'No stimulus';
      if (s.type === 'choice') return 'Choice of stimulus, develop an idea from the one you pick';
      if (s.kind === 'image' || s.type === 'image') return 'Image stimulus, develop an idea from it';
      return 'Written stimulus, develop an idea from it';
    }
    function reflectionLine() {
      const r = st.resolvedShape.reflection;
      return r.required ? 'Reflection required, worth ' + r.marks : 'No reflection';
    }
    function marksLine() {
      const parts = st.resolvedShape.parts;
      if (parts.length === 1) return 'Writing ' + parts[0].marks + ', total ' + st.resolvedShape.totalMarks;
      return parts.map(p => (p.type === 'writing' ? 'Writing' : p.type === 'reflection' ? 'Reflection' : 'Analysis') + ' ' + p.marks).join(', ') + ', total ' + st.resolvedShape.totalMarks;
    }
    function scopeLine() {
      return st.resolvedShape.parts.map(p => (cfg.scopeGuidanceByMarks[String(p.marks)] || '') ).filter(Boolean).join(' · ');
    }
    function questionShapeCardHtml() {
      return '<div class="report-card" id="moduleC-shape-card">' +
        '<div class="panel-label">Question Shape</div>' +
        '<div class="obj-item">• Form: ' + esc2(formsLine()) + '</div>' +
        '<div class="obj-item">• Stimulus: ' + esc2(stimulusLine()) + '</div>' +
        '<div class="obj-item">• Reflection: ' + esc2(reflectionLine()) + '</div>' +
        '<div class="obj-item">• Marks: ' + esc2(marksLine()) + '</div>' +
        '<div class="obj-item" style="color:var(--color-muted);font-size:0.85rem;">• Scope guidance: ' + esc2(scopeLine()) + '</div>' +
        '</div>';
    }
    function refreshShapeCard() {
      const el = $('moduleC-shape-card');
      if (el) el.outerHTML = questionShapeCardHtml();
    }
```

`refreshShapeCard()` is what later tasks call after the student chooses a form, so the card updates from "Choose one, imaginative or discursive" to "imaginative (chosen)" without a full screen re-render.

- [ ] **Step 2: Verify in browser (via a temporary call)**

This function isn't wired into a screen yet — Task 6 does that. To verify it now, use `preview_eval` after clicking "Get a question" on the setup screen:
```javascript
// exposes the card HTML to eyeball in the console — remove after checking
document.getElementById('app-moduleC-main').innerHTML += '';
```
Actually, simplest verification: temporarily change `questionScreen()`'s placeholder body from Task 4 to `render(questionShapeCardHtml())` for this check only, reload, click through Setup → Get a question, and visually confirm the card renders sensibly for a few different served questions (reload and re-click a few times to see different shapes — some with a reflection line, some without, some with "Choose one, ..." for multi-form questions). Revert `questionScreen()` back to its Task-4 placeholder afterward (Task 6 replaces it properly).

- [ ] **Step 3: Commit**

```bash
git add hsc-short-answer.html && git commit -m "feat: Question Shape card rendering functions"
```

---

### Task 6: Question screen — stem, stimulus, Question Shape card

**Files:**
- Modify: `hsc-short-answer/hsc-short-answer.html`

- [ ] **Step 1: Replace the `questionScreen` placeholder**

```javascript
    function stimulusBlockHtml() {
      const s = st.resolvedShape.stimulus;
      if (!s) return '';
      if (s.type === 'choice') {
        return '<div class="report-card"><div class="panel-label">Choose one stimulus</div>' +
          s.options.map(o => stimulusEntryHtml(o)).join('') +
          '<p style="font-size:0.85rem;color:var(--color-muted);">' + esc2(s.instruction) + '</p></div>';
      }
      return '<div class="report-card"><div class="panel-label">Stimulus</div>' + stimulusEntryHtml(s) +
        '<p style="font-size:0.85rem;color:var(--color-muted);">' + esc2(s.instruction || '') + '</p></div>';
    }
    function stimulusEntryHtml(s) {
      if (s.kind === 'image' || s.type === 'image') {
        if (s.assetSupplied === false) return '<div class="image-placeholder">' + esc2(s.placeholderText || 'Image stimulus placeholder.') + '</div>';
        return '<img src="' + esc2(s.assetPath) + '" alt="Stimulus image" style="max-width:100%;border-radius:var(--radius);">';
      }
      let h = '<div class="stimulus-block">' + esc2(s.stimulusText) + '</div>';
      if (s.attribution) h += '<p style="font-size:0.8rem;color:var(--color-muted);">— ' + esc2(s.attribution) + '</p>';
      return h;
    }
    function questionScreen() {
      st.screen = 'question';
      const q = st.q;
      render(
        '<div class="btn-row" style="justify-content:flex-start;margin-bottom:var(--space-sm);"><button class="btn-ghost" data-nav="home">⌂ Setup</button></div>' +
        questionShapeCardHtml() +
        '<div class="report-card"><div class="panel-label">The question</div><p style="white-space:pre-wrap;">' + esc2(q.stemText) + '</p></div>' +
        stimulusBlockHtml() +
        '<div class="btn-row"><button class="btn-primary" id="moduleC-q-continue">Continue →</button></div>'
      );
      mainEl.querySelectorAll('[data-nav="home"]').forEach(b => b.addEventListener('click', initSetup));
      $('moduleC-q-continue').addEventListener('click', frameScreen);
    }
    function frameScreen() {
      st.screen = 'frame';
      render('<p style="color:var(--color-muted);">FRAME screen placeholder — implemented in Task 7.</p>');
    }
```

- [ ] **Step 2: Verify in browser**

Reload, Setup → Get a question, several times (reload between attempts to get different shapes). Expected each time: the Question Shape card renders correctly for that question's actual shape (cross-check by reading the question stem shown against the matching entry in `moduleCQuestions.json` by stem text). Confirm: the stem text renders with line breaks preserved (`white-space:pre-wrap`) for two-part `(a)/(b)` questions. Confirm stimulus renders correctly for at least one written-stimulus question (with attribution shown) and one image-stimulus question with `assetSupplied: true` (e.g. `modC-var-01`, which uses `img-modC-01`).

Note: `modC-2021` and `modC-2025` (the two `assetSupplied: false` authentic questions) will never appear via normal "Get a question" clicks, because Task 3's `servable()` correctly excludes them from the selection pool — that's the intended behaviour, not a bug to chase here. To verify the placeholder-rendering branch in `stimulusEntryHtml()` still works correctly for when those images are eventually supplied, use `preview_eval` to force it directly rather than waiting on random selection:
```javascript
// Run this after Setup → Get a question has been clicked once, then check the rendered output
// (this only proves the branch executes correctly; it does not change what nextQuestion() would ever pick)
```
Since `st`/`data`/`resolveStimulus` are closed over inside `makeModuleCController` and not exposed on `window`, the practical check is simpler: temporarily read `data/moduleCQuestions.json`'s `modC-2021` entry, and manually trace `resolveStimulus()`/`stimulusEntryHtml()` against it by inspection (both are short, pure functions — confirm by reading the code that `assetSupplied === false` takes the placeholder branch, never the `<img>` branch, for that shape). Confirm the "⌂ Setup" button returns to setup.

- [ ] **Step 3: Commit**

```bash
git add hsc-short-answer.html && git commit -m "feat: Module C question screen (stem, stimulus, Question Shape card)"
```

---

### Task 7: FRAME stepper

**Files:**
- Modify: `hsc-short-answer/hsc-short-answer.html`

FRAME is on-locked at Level 1, on-by-default (toggle-able) at Level 2, off at Level 3 — same toggle shape as CAST/CUBE in the sibling modules.

- [ ] **Step 1: Add `frameOn()` and the stepper**

```javascript
    function frameOn() {
      if (st.level === 1) return true;
      if (st.level === 2) return st.overrides.frame !== 'off';
      return st.overrides.frame === 'on';
    }
    let frameStep = 0;
    function frameScreen() {
      st.screen = 'frame';
      if (!frameOn()) { afterFrame(); return; }
      frameStep = 0;
      renderFrameStep();
    }
    function renderFrameStep() {
      const step = M.frameSteps[frameStep], last = frameStep === M.frameSteps.length - 1;
      render(
        questionShapeCardHtml() +
        '<div class="cast-annotation-box"><div class="panel-label">FRAME the question</div>' +
        '<div class="step-dots">' + M.frameSteps.map((_, i) => '<div class="step-dot ' + (i < frameStep ? 'done' : i === frameStep ? 'active' : '') + '"></div>').join('') + '</div>' +
        '<p style="font-size:0.8rem;color:var(--color-muted);margin:6px 0;">Step ' + (frameStep + 1) + ' of ' + M.frameSteps.length + '</p>' +
        '<strong>' + esc2(step.label) + '</strong><p style="font-size:0.88rem;color:var(--color-muted);margin:6px 0;">' + esc2(step.help) + '</p>' +
        '<textarea id="moduleC-frame-input" rows="2" placeholder="' + esc2(step.ph) + '" style="width:100%;padding:8px;font-family:var(--font-body);border:1px solid var(--color-border);border-radius:var(--radius);resize:vertical;"></textarea>' +
        '<div class="btn-row"><button class="btn-primary" id="moduleC-frame-next">' + (last ? 'Continue →' : 'Next →') + '</button></div></div>'
      );
      const inp = $('moduleC-frame-input'); inp.value = st.frame[step.key] || '';
      $('moduleC-frame-next').addEventListener('click', () => {
        st.frame[step.key] = $('moduleC-frame-input').value.trim();
        frameStep++;
        if (frameStep < M.frameSteps.length) renderFrameStep();
        else afterFrame();
      });
    }
    function afterFrame() {
      formChooserScreen();
    }
    function formChooserScreen() {
      st.screen = 'formChooser';
      render('<p style="color:var(--color-muted);">Form chooser placeholder — implemented in Task 8.</p>');
    }
```

- [ ] **Step 2: Verify in browser**

Reload, Setup at Level 1 → Get a question → Continue. Expected: FRAME stepper appears, on-locked (no way to skip it at Level 1), 5 steps in order (F/R/A/M/E per the labels above), each with its own help text and placeholder, "Next →" advancing through steps and "Continue →" on the last one. Type something in a step, go back... actually there's no back button in this minimal version — that's fine, going back isn't required by this plan's scope (base spec only requires forward gates for S0–S4; back-navigation is a `skipToNext()`-style concern deferred to Part 2 alongside the rest of the screen map). Confirm the Question Shape card stays visible above the stepper. Now test Level 3: go back to Setup, pick Level 3, get a question, Continue — expected: FRAME is skipped entirely (goes straight to the form-chooser placeholder).

- [ ] **Step 3: Commit**

```bash
git add hsc-short-answer.html && git commit -m "feat: Module C FRAME stepper (5 steps, level-gated)"
```

---

### Task 8: Form chooser gate + prepared-piece stress test

**Files:**
- Modify: `hsc-short-answer/hsc-short-answer.html`

The form chooser only appears when `formOptions.length > 1`. At Levels 1–2 it's gated behind the prepared-piece stress test (4 required boxes at Level 1, a lighter checklist at Level 2). At Level 3 it's a bare choice with no stress test.

- [ ] **Step 1: Replace the `formChooserScreen` placeholder**

```javascript
    function needsFormChoice() {
      return st.resolvedShape.formOptions.length > 1;
    }
    function stressTestRequired() {
      return st.level === 1 || st.level === 2;
    }
    function formChooserScreen() {
      st.screen = 'formChooser';
      if (!needsFormChoice()) { st.chosenForm = st.resolvedShape.formOptions[0]; afterFormChoice(); return; }
      if (stressTestRequired()) { stressTestScreen(); return; }
      renderFormChoiceOnly();
    }
    function renderFormChoiceOnly() {
      render(
        questionShapeCardHtml() +
        '<div class="report-card"><div class="panel-label">Choose your form</div>' +
        '<div class="btn-row" id="moduleC-form-btns">' +
        st.resolvedShape.formOptions.map(f => '<button class="btn-secondary s-mode-btn" data-form="' + f + '">' + f + '</button>').join('') +
        '</div></div>'
      );
      mainEl.querySelectorAll('[data-form]').forEach(b => b.addEventListener('click', () => {
        st.chosenForm = b.dataset.form;
        afterFormChoice();
      }));
    }
    function stressTestScreen() {
      render(
        questionShapeCardHtml() +
        '<div class="report-card"><div class="panel-label">Before you choose a form: the prepared-piece stress test</div>' +
        '<p class="coach">Do not walk in with a memorised piece and dump it regardless of the question. Answer honestly.</p>' +
        M.stressTestBoxes.map(box =>
          '<div class="plan-slot"><div class="plan-slot-label">' + esc2(box.label) + '</div>' +
          '<textarea rows="2" class="stress-field" data-k="' + box.key + '" style="width:100%;padding:8px;font-family:var(--font-body);border:1px solid var(--color-border);border-radius:var(--radius);"></textarea></div>'
        ).join('') +
        '<div class="btn-row"><button class="btn-primary" id="moduleC-stress-continue" disabled>Choose your form →</button></div></div>'
      );
      const check = () => {
        mainEl.querySelectorAll('.stress-field').forEach(el => { st.stressTest[el.dataset.k] = el.value.trim(); });
        $('moduleC-stress-continue').disabled = !Object.values(st.stressTest).every(v => v);
      };
      mainEl.querySelectorAll('.stress-field').forEach(el => el.addEventListener('input', check));
      $('moduleC-stress-continue').addEventListener('click', renderFormChoiceOnly);
    }
    function afterFormChoice() {
      refreshShapeCard();
      confidenceScreen();
    }
    function confidenceScreen() {
      st.screen = 'confidence';
      render('<p style="color:var(--color-muted);">Confidence screen placeholder — implemented in Task 9.</p>');
    }
```

Note: `refreshShapeCard()` after `afterFormChoice()` won't actually find `#moduleC-shape-card` in the DOM at that point since the screen is about to fully re-render anyway in `confidenceScreen()` — it's harmless (silently no-ops per its `if (el)` guard) but only meaningfully useful once a later screen updates the card without a full re-render. Leave it in; it's correct defensive code, not dead code, once Part 2 adds screens where the form is chosen without navigating away.

- [ ] **Step 2: Verify in browser**

Test all three combinations:
1. **Single-form question, any level:** Setup → Get a question repeatedly until you land one with only 1 form option (e.g. `modC-2020`-shaped or `modC-var-01`-shaped) → Continue through FRAME (or skip at L3) → expected: no form-chooser screen appears at all, goes straight to the confidence placeholder, and `st.chosenForm` is set correctly (verify via the Question Shape card showing the single form, not "Choose one...").
2. **Multi-form question, Level 1 or 2:** find a question with `formOptions.length > 1` (e.g. `modC-2019`, `modC-var-10`) → expected: the stress test appears first with 4 required boxes, "Choose your form →" stays disabled until all 4 are filled, then the form-choice buttons appear, clicking one advances and the Question Shape card should now show that form as "(chosen)" rather than "Choose one, ...".
3. **Multi-form question, Level 3:** same question at Level 3 → expected: no FRAME, no stress test, straight to the bare form-choice buttons.

- [ ] **Step 3: Commit**

```bash
git add hsc-short-answer.html && git commit -m "feat: Module C form chooser gate and prepared-piece stress test"
```

---

### Task 9: Per-criterion confidence sliders (dynamic category count)

**Files:**
- Modify: `hsc-short-answer/hsc-short-answer.html`

This is the task the whole "never hardcode the slider count" invariant is about. The category set is resolved from the served question's parts at render time: a writing part contributes its writing categories (6 if it has a stimulus, 5 if `stimulus.type === 'none'`, per Amendment C — "control" is always split into `structure-and-scope` and `expression-and-mechanics`); a reflection part, if present, always contributes its 4 reflection categories. Valid totals are therefore 5, 6, 9, or 10 — never hardcoded anywhere.

- [ ] **Step 1: Add category resolution and the slider screen**

```javascript
    function writingCategoriesFor(part) {
      const stimulusPresent = st.resolvedShape.stimulus !== null;
      return stimulusPresent ? M.writingChecklistCategories : M.writingChecklistCategories.filter(c => c !== 'stimulus');
    }
    function resolvedCategories() {
      const cats = [];
      st.resolvedShape.parts.forEach(part => {
        if (part.type === 'writing') writingCategoriesFor(part).forEach(c => cats.push({ cat: c, partId: part.id, group: 'writing' }));
        else if (part.type === 'reflection') M.reflectionChecklistCategories.forEach(c => cats.push({ cat: c, partId: part.id, group: 'reflection' }));
        // 'analysis' parts (the 2022 shape) do not render confidence/result sliders in this plan's scope —
        // deferred to Part 2 alongside the analysis rubric's self-mark screen.
      });
      return cats;
    }
    function sliderSet(prefix, cats, store) {
      return cats.map(c => '<div class="crit-slider-row"><div class="crit-label">' + esc2(c.cat) + '</div>' +
        '<div class="crit-def">' + esc2(M.critDef[c.cat] || '') + '</div>' +
        '<div class="slider-row"><input type="range" id="moduleC-' + prefix + '-' + c.cat + '-' + c.partId + '" min="' + cfg.slider.min + '" max="' + cfg.slider.max + '" step="' + cfg.slider.step + '" value="50" data-key="' + c.cat + '__' + c.partId + '">' +
        '<span class="slider-value" id="moduleC-' + prefix + '-' + c.cat + '-' + c.partId + '-v">' + (store[c.cat + '__' + c.partId] == null ? '—' : store[c.cat + '__' + c.partId]) + '</span></div></div>').join('');
    }
    function wireSliders(prefix, cats, store, onChange) {
      cats.forEach(c => {
        const key = c.cat + '__' + c.partId;
        const el = $('moduleC-' + prefix + '-' + c.cat + '-' + c.partId);
        el.addEventListener('input', () => {
          store[key] = parseInt(el.value);
          $('moduleC-' + prefix + '-' + c.cat + '-' + c.partId + '-v').textContent = store[key];
          onChange();
        });
      });
    }
    function allSet(cats, store) { return cats.every(c => store[c.cat + '__' + c.partId] != null); }
    function confidenceScreen() {
      st.screen = 'confidence';
      const cats = resolvedCategories();
      render(
        questionShapeCardHtml() +
        '<div class="confidence-block"><div class="panel-label">Before you plan: how confident are you, per criterion?</div>' +
        '<p style="font-size:0.85rem;color:var(--color-muted);">Rate each criterion for the ' + esc2(st.chosenForm) + ' piece' + (st.resolvedShape.reflection.required ? ' and the reflection' : '') + '.</p>' +
        sliderSet('conf', cats, st.confidence) + '</div>' +
        '<div class="btn-row"><button class="btn-primary" id="moduleC-conf-continue" disabled>Continue to planning →</button></div>'
      );
      wireSliders('conf', cats, st.confidence, () => { $('moduleC-conf-continue').disabled = !allSet(cats, st.confidence); });
      $('moduleC-conf-continue').addEventListener('click', () => { planScreen(); });
    }
    function planScreen() {
      st.screen = 'plan';
      render('<p style="color:var(--color-muted);">Planning screen placeholder — implemented in Part 2 of this plan series.</p>');
    }
```

Note: `writingCategoriesFor(part)` takes a `part` argument for symmetry with the rest of the per-part resolution pipeline, but per Amendment C only branches on whether the served question has a stimulus at all — the same value for every writing part on a given question, since Module C never has more than one writing part per question in the current bank.

- [ ] **Step 2: Verify in browser — this is the most important check in this task**

Test all 4 valid category counts by reloading and getting questions until you find each shape (cross-reference `data/moduleCQuestions.json` by id/shape to know what to expect before you click):
1. **No-stimulus, composition-only** (e.g. `modC-var-03`, `modC-var-05`, `modC-var-08`): expect **5** sliders (stimulus category absent).
2. **With-stimulus, composition-only** (e.g. `modC-var-01`, `modC-2020`, `modC-2024`): expect **6** sliders.
3. **No-stimulus, composition+reflection** (e.g. `modC-var-14`, `modC-var-18`): expect **9** sliders (5 writing... wait, no-stimulus writing is 5, plus 4 reflection = **9**).
4. **With-stimulus, composition+reflection** (e.g. `modC-2019`, `modC-2023`, `modC-var-16`): expect **10** sliders (6 writing + 4 reflection). (Note: `modC-2021` and `modC-2025` would also match this shape on paper, but per Task 3's `servable()` they're excluded from the pool until their images are supplied — don't expect to see them here, same as the note in Task 6.)

For each, drag every slider and confirm "Continue to planning →" stays disabled until literally every rendered slider has been touched, then enables. Confirm dragging one slider only updates its own displayed value (no cross-talk between sliders — this mirrors a past bug class in the sibling modules where a handler wasn't scoped narrowly enough). Use `preview_snapshot` to count the actual number of range inputs rendered and confirm it matches the expected count exactly for at least 2 of the 4 cases above.

- [ ] **Step 3: Commit**

```bash
git add hsc-short-answer.html && git commit -m "feat: Module C dynamic per-criterion confidence sliders (5/6/9/10)"
```

---

### Task 10: Final review pass for this plan

**Files:** none new.

- [ ] **Step 1: Full click-through**

Starting fresh (reload), run the complete S0–S4 flow at least 6 times across different levels and shapes: Level 1 single-form no-stimulus, Level 1 multi-form with-stimulus, Level 2 multi-form no-reflection, Level 2 single-form with-reflection, Level 3 multi-form, Level 3 single-form. For each, confirm: no console errors (`preview_console_logs` with `level: 'error'`), the Question Shape card is accurate throughout, FRAME/stress-test correctly appear or are skipped per level and shape, and the confidence slider count is correct per the shape.

- [ ] **Step 2: Confirm the CSS active-fill gotcha didn't recur**

Use `preview_inspect` on a `.s-level-btn.active` and an `s-mode-btn.active` (if any were used) to confirm `background-color` actually renders the accent green, not just the class being present with no visual effect. This class pair already has a matching CSS rule from the Module A/B work — this check just confirms Module C's buttons reuse those exact class names rather than inventing new unstyled ones.

- [ ] **Step 3: Commit (if any fixes were needed) or confirm clean**

If Step 1 or 2 surfaced anything, fix it and commit. Otherwise this task requires no commit — it's a verification-only checkpoint marking the end of Part 1.

---

## What's Next

This plan covers S0–S4 only (Setup, Read, FRAME, Form chooser + stress test, Confidence). **Part 2** (not yet written) continues from here: Plan → Write (per-part looping with mark-derived timing) → Self-mark with the craft-chain margin protocol (triangle/square/circle + form-dependent 4th symbol) → optional stimulus/craft self-checks → Result + attribution + calibration gap → Syllabus audit → Compare/climb-one-band with the rubric translation dictionary → Reflection → Session report. **Part 3** adds the timed-exam mode, the 9-drill micro-skill gym, "Make your own" mode (Amendment K), and pool preview before serving (Amendment G). Each part should be written once the previous part is built and working, so later plans are grounded in real, running code rather than speculation.
