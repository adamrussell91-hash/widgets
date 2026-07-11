# HSC Short Answer Tool — Design Spec
Date: 2026-06-28

## Overview

A web tool for a single HSC English student practising Paper 1, Section I (Common Module: Texts and Human Experiences) at home and alone. The student reads a real unseen text, answers a freshly generated short answer question, writes by hand on paper, self-marks against a question-specific checklist, then compares against a real NESA question and sample of the same type.

The tool generates new questions in the exact language and structure of real NESA questions. It never invents a source or a quote. It never gives a mark.

---

## Architecture

### Stack
- **Front end:** Single self-contained `index.html` — all HTML, CSS, JavaScript inline. Vanilla JS, no framework, no build step. Hosted on GitHub Pages.
- **Model proxy:** Netlify serverless function (`netlify/functions/generate.js`). Holds the OpenAI API key. The browser never calls OpenAI directly.
- **Model:** OpenAI gpt-4o via Chat Completions API. JSON mode (`response_format: { type: "json_object" }`). Temperature 0.2.
- **Data:** Three JSON files fetched once at load, held in memory only. Nothing written back.

### Repository
**GitHub:** `adamrussell91-hash/hsc-short-answer`
**GitHub Pages URL:** `https://adamrussell91-hash.github.io/hsc-short-answer/`
**Netlify project:** `jade-melomakarona-ea20fe`
**Function URL:** `https://jade-melomakarona-ea20fe.netlify.app/.netlify/functions/generate`

### Repository layout
```
/index.html
/data/sources.json
/data/nesaQuestions.json
/data/pairingRule.json
/netlify/functions/generate.js
/netlify.toml
```

### Netlify environment variables (set in dashboard)
- `OPENAI_API_KEY` — OpenAI key
- `OPENAI_MODEL` — `gpt-4o`
- `ALLOWED_ORIGIN` — `https://adamrussell91-hash.github.io`

### CORS
`Access-Control-Allow-Origin` locked to `ALLOWED_ORIGIN`. Handles `OPTIONS` preflight.

---

## Data Layer

### sources.json — 21 usable source texts (2019–2025)
Built from the provided stimulus file. Each entry:
```json
{
  "id": "src-YYYY-tN",
  "title": "short label",
  "author": "writer name",
  "textType": "prose fiction | memoir | nonfiction | feature article | opinion | poetry | visual",
  "isVisual": false,
  "fullText": "complete extract as plain text",
  "visualDescription": "only for isVisual true",
  "conceptTags": ["human experience", "memory", "place"]
}
```

Two visual texts included with full descriptions:
- `src-2020-t2` — Julie Paschkis illustration (writing as voyage, language, creativity)
- `src-2024-t4` — Florian Schroeder photograph (technology vs. nature, perception, place)

Four texts skipped entirely (copyright-restricted, no stub):
- 2022 Text 1 (Nine Spice Mix poem)
- 2024 Text 1 (nonfiction)
- 2025 Text 5 (Macfarlane Underland)
- 2022 Text 6 (photograph — no description provided)

### nesaQuestions.json — ~30 real NESA questions (2019–2025)
Built from Notion page "Paper 1 Section 1: Short Answer Response". Each entry:
```json
{
  "id": "nesa-YYYY-qN",
  "sourceId": "src-YYYY-tN",
  "verb": "analyse",
  "marks": 3,
  "stemText": "exact NESA question wording",
  "markerNotes": "better responses and areas to improve",
  "sampleAnswer": "real NESA sample response, shown exactly as published",
  "sampleAnnotations": "NESA marker commentary if any"
}
```

### pairingRule.json — generated once at setup
Claude Code runs the calibration prompt from the Build Brief in a batch across all 21 sources. Decides which verbs and mark ranges each source can genuinely carry. Written once; not maintained at runtime.

---

## Netlify Function (`generate.js`)

One endpoint, three tasks switched by a `task` field in the POST body.

### Task routing
| Task | Payload | Returns | Max tokens |
|---|---|---|---|
| `question` | sourceId, verb, marks, concept, level, full source text | Full output schema item | ~1500 |
| `paper` | sources summary, level | `{ questions: [...], totalMarks: 20 }` | ~8000 |
| `evidenceCheck` | checklistItem, pastedText | `{ verdict, pointer }` | ~200 |

### Behaviour
- Reads key from `process.env.OPENAI_API_KEY`, model from `process.env.OPENAI_MODEL`
- CORS locked to `process.env.ALLOWED_ORIGIN`
- On OpenAI error: returns clean status + short message, never raw error or key
- Never logs source text content

### Output schema for a generated item
```json
{
  "sourceId": "src-01",
  "textType": "prose fiction",
  "verb": "analyse",
  "marks": 3,
  "concept": "memory",
  "questionStem": "generated question in NESA phrasing",
  "lineGuide": 6,
  "selfAnswer": "model answer from source — hidden from student",
  "quotesUsed": ["exact quote one", "exact quote two"],
  "markingBands": [
    { "band": 3, "descriptor": "Analyses effectively how ..." },
    { "band": 2, "descriptor": "Explains how ..." },
    { "band": 1, "descriptor": "Provides some relevant information ..." }
  ],
  "checklist": [
    { "id": "c1", "category": "analysis", "text": "Have I analysed how the writer's use of [technique] shapes meaning, rather than retelling what happens?" },
    { "id": "c2", "category": "concept", "text": "Have I tied my point directly to [concept]?" },
    { "id": "c3", "category": "evidence", "text": "Is my quotation short, precise and clearly relevant to [concept]?" }
  ],
  "comparison": {
    "nesaQuestionId": "nesa-12",
    "nesaStem": "real NESA question wording",
    "nesaVerb": "analyse",
    "nesaMarks": 3,
    "sameSource": true,
    "sampleAnswer": "real NESA sample, shown exactly",
    "sampleAnnotations": "NESA marker commentary if any",
    "checklistMapping": [
      { "checklistId": "c1", "satisfiedBy": "segment of sample that shows this move" }
    ]
  }
}
```

---

## Generation Pipeline

1. **Pick from controlled pools** — choose source, then verb and concept. Vary across a session to avoid repetition.
2. **Generate stem** — apply verb and mark pattern in real NESA phrasing. One writer/text named, one clear concept.
3. **Self-answer check** — model answers its own question from the source alone. Discard and regenerate if it cannot.
4. **Deterministic quote verification** — every quote checked by exact text search against the source string in JavaScript (client-side). Not by model judgement. Any quote not found verbatim rejects the question.
5. **Marking bands** — band count equals marks. Top band: verb + adverb of quality. Steps down to "provides some relevant information."
6. **Question-specific checklist** — built fresh for this exact question. Never generic.
7. **Comparison item** — real NESA question of same verb and mark value, with sample and annotations.
8. **Validation gates** (all must pass before display):
   - Verb matches mark allocation per the ladder
   - Verb carries into top marking band
   - Band count equals marks
   - Source can carry that verb under pairingRule.json
   - Model self-answered from source
   - Every quote passes deterministic exact-text verification
   - Comparison item exists
9. **Silent retry** up to 3 attempts on gate failure. If still failing, calm retry message to student.

---

## Single-Question UI Flow (Phase 1)

### Screen 1 — Setup
Mode selection (Single Question only in Phase 1). Level selection (Foundation / Consolidation / Exam). Short calm coach line. No login, no name.

### Screen 2 — Reading Time
Source text shown. 30-second countdown (config). Answer field locked. CUBE annotation available at Level 1.

### Screen 3 — CUBE (conditional)
Level 1: always on. Level 2: optional, off by default. Level 3: off.
Four steps over the question stem: C (circle command words), U (underline key terms), B (box specifiers), E (explain in own words).

### Screen 4 — Predict
Checklist items shown. Student rates each: expects to do this / not sure / unlikely. Stored in memory for this question only.

### Screen 5 — Write
Writing timer: 2 min/mark (config). Level 1: sentence prompts + worked structure visible. Level 2: light prompts, collapsed. Level 3: blank. Overrun: marked gently, never locks out.

### Screen 6 — Self Mark
Same checklist. Student marks each: Done / Not done / Unsure. Coach reminds them this is their judgement.

### Screen 7 — Evidence Check (optional)
Beside any ticked item: text box to paste words from handwritten answer. Returns verdict + one pointer. Never forced. Never accepts a full answer.

### Screen 8 — Calibration
Prediction vs. self-mark side by side. Gaps named plainly. Carried into session report.

### Screen 9 — NESA Comparison
Real NESA question (same verb + marks) + sample shown. Coach frames: *here's a real question of the same type — how does yours compare?* Checklist annotated against sample item by item. Sample shown exactly as published.

### Screen 10 — Reflection
Student builds "next time I want to focus on" list in own words. Feeds session report.

### Screen 11 — Session Report
Screenshot-only. Four panels:
- Focus list (from reflection)
- What was practised (verb/text type/mark counts)
- Calibration snapshot (prediction vs. self-mark gaps)
- Coverage map (concepts/verbs/text types covered vs. not)

Prompt: keep handwritten work and NESA samples.

---

## Three Difficulty Levels

Levels differ only in **scaffolding and support** — not in verb, mark range, or question type. Any level can receive any verb or mark allocation.

| Lever | Level 1 Foundation | Level 2 Consolidation | Level 3 Exam |
|---|---|---|---|
| Mark range | any | any | any |
| Directive verbs | any | any | any |
| Question elements | single, focused | one or two linked parts | multi-part stems |
| Texts | accessible prose/nonfiction | denser text, occasional poetry | dense poetry, multimodal, or two texts |
| CUBE | always on, locked | optional, off by default | off |
| Timer | visible, generous, pausing allowed | 2 min/mark, standard | 2 min/mark, strict, no pausing |
| Checklist | visible while writing | available but collapsed | hidden until self-mark |
| Writing assistance | sentence prompts + worked structure | light prompts, fewer hints | none |
| After-answer structures | full, always | full, always | full, always |

Individual levers are independently overridable from a settings panel. No persistence across sessions.

Within-session nudge: if a student misses the same checklist item repeatedly, the coach can suggest easing that one lever down a level. One-question suggestion only.

---

## Core Invariants

1. The tool never gives a mark, score, band or grade for the student's own answer. Ever.
2. Every quote in a generated question is verified by exact text search against the source. No verbatim match = question rejected.
3. A generated question must be answerable from its source (proven by self-answer check).
4. The directive verb matches the mark allocation per the verb ladder.
5. No student data is stored. Session-only.
6. NESA samples are shown exactly as published — never edited or paraphrased.

---

## Design System

**Palette:**
```css
:root {
  --font-body: Verdana, Arial, Helvetica, sans-serif;
  --font-size-body: 17px;
  --line-height: 1.5;
  --measure: 66ch;
  --color-bg: #FAF7F0;
  --color-text: #1F2421;
  --color-accent: #2F6B5E;
  --color-muted: #5C655F;
  --radius: 10px;
  --space: 24px;
}
```

- Soft off-white background, dark text, single muted teal accent
- All text/background pairs: minimum 4.5:1 contrast
- Line length ~66ch, line spacing 1.5
- One thing on screen at a time. Generous white space. No decorative motion.
- Navigation and settings tucked away during a response

**The coach:** calm, encouraging, concrete. Speaks only at defined moments (setup, predict, self-mark, NESA comparison, reflection). No points, badges, streaks, or game furniture. No comparison against other students.

---

## CONFIG Object

```javascript
const CONFIG = {
  functionUrl: "https://jade-melomakarona-ea20fe.netlify.app/.netlify/functions/generate",
  readingSecondsSingle: 30,
  writingSecondsPerMark: 120,
  retryLimit: 3,
  paper: {
    totalMarks: 20,
    questionCount: 6,
    readingSeconds: 600,
    writingSeconds: 2700
  },
  cube: { level1: "on-locked", level2: "on-default", level3: "off" },
  defaultLevel: 1
}
```

---

## Phase 2 — Practice Paper (after Phase 1 ships)

Generates a full 20-mark Section I paper in one pass. 10-minute reading window, then a single 45-minute writing timer. Student can regenerate one question at a time while keeping the rest intact (same verb, marks, text type preserved). After writing: same predict → self-mark → NESA comparison per question, then whole-paper session report. No new architecture — reuses everything from Phase 1.

---

## Definition of Done (Phase 1)

- Student can run the complete single-question flow end-to-end from the deployed URL
- Every generated question passes all validation gates including deterministic quote verification
- OpenAI key exists only in Netlify env, never reaches the browser
- Three levels behave per the table (scaffolding fades, after-answer structures constant)
- Individual lever overrides work
- Tool never shows a mark, never invents a source or quote, stores nothing between sessions
- Design matches quiet-coach direction, all contrast pairs clear 4.5:1
- All tunable values in the CONFIG object
