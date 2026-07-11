# Module C Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author and validate the 6 JSON data files Module C needs (rubrics, syllabus, mentor texts, stimulus, custom stems, questions), with a Node-based validation script that enforces the build brief's quantitative targets and schema rules.

**Architecture:** Six flat JSON files under `hsc-short-answer/data/`, matching the existing `module{A,B}*.json` naming convention. A single Node script (`hsc-short-answer/scripts/validate-module-c-data.js`, CommonJS, zero dependencies, matching the existing `scripts/calibrate.js` convention) asserts file shape, counts, and cross-file id references. No HTML/controller changes happen in this plan — this is Plan 1 of 2 for Module C (see `docs/superpowers/specs/2026-07-03-module-c-craft-of-writing-design.md`). Plan 2 (controller + screens) is written separately once this data exists, so the controller can be built against real files instead of speculative shapes.

**Tech Stack:** Node.js built-ins only (`fs`, `path`, `assert`, `node:test`) — no npm install, no package.json, matching the project's existing no-build-step convention.

**Source of truth:** All content below is transcribed verbatim from the Notion build brief "HSC Module C Craft of Writing Tool (Module C), Build Brief for Claude Code" (base spec + "Amendments v2" section, which overrides the base spec on conflict). Amendment corrections already applied in the JSON below are called out inline in each task.

---

## File Structure

```
hsc-short-answer/
  data/
    moduleCRubrics.json       # 5 rubrics: rubric-writing, rubric-reflection, rubric-analysis,
                               # rubric-reflection-comparison, rubric-reflection-short
    moduleCSyllabus.json      # 6 audit points + overarchingInquiryQuestion
    moduleCMentorTexts.json   # 14 craft moves (McCann x4, Brooks x4, Smith x4, persuasive x2)
    moduleCStimulus.json      # 20 entries: 10 image (assetSupplied true) + 10 written
    moduleCCustomStems.json   # 3 seed stems for "Make your own" mode (Amendment K)
    moduleCQuestions.json     # 27 entries: 7 authentic (2019-2025) + 20 teacher-authored
  scripts/
    validate-module-c-data.js  # new — validates all 6 files above
```

Each data-file task follows the same rhythm: extend the validator with the checks for that file (the "test"), run it and watch it fail because the file doesn't exist yet, author the file with the real content, run the validator again and watch it pass, commit both files together.

---

### Task 1: Scaffold the validation script

**Files:**
- Create: `hsc-short-answer/scripts/validate-module-c-data.js`

- [ ] **Step 1: Write the scaffold**

```javascript
// Run: node scripts/validate-module-c-data.js
// Validates the Module C data bank files against the build brief's
// quantitative targets and schema rules. Exits 1 on any failure.

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing data file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  console.log('Module C data validation starting...');
  console.log('\nAll Module C data files pass validation.');
}

main();
```

- [ ] **Step 2: Run it to confirm the scaffold executes cleanly**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected: prints both log lines, exits 0. (Nothing is validated yet — this just proves the scaffold runs before we add real checks.)

- [ ] **Step 3: Commit**

```bash
cd "hsc-short-answer" && git add scripts/validate-module-c-data.js && git commit -m "chore: scaffold Module C data validator"
```

---

### Task 2: `moduleCRubrics.json`

**Files:**
- Modify: `hsc-short-answer/scripts/validate-module-c-data.js`
- Create: `hsc-short-answer/data/moduleCRubrics.json`

This file holds 5 rubrics: the 2 base rubrics from the original spec (`rubric-writing`, `rubric-reflection`) plus 3 added by Amendments v2 (`rubric-analysis`, `rubric-reflection-comparison`, `rubric-reflection-short`). Amendment H is applied here: `rubric-reflection`'s band ranges are converted from qualitative labels (top/high/sound/limited/minimal) to numeric ranges (9 to 10 / 7 to 8 / 5 to 6 / 3 to 4 / 1 to 2).

- [ ] **Step 1: Add the validation function (the failing test)**

Add this function above `main()`, and add the two lines shown inside `main()`:

```javascript
function validateRubrics(rubrics) {
  const requiredIds = ['rubric-writing', 'rubric-reflection', 'rubric-analysis', 'rubric-reflection-comparison', 'rubric-reflection-short'];
  for (const id of requiredIds) {
    assert.ok(rubrics[id], `moduleCRubrics.json is missing required rubric "${id}"`);
    const r = rubrics[id];
    assert.strictEqual(r.bands.length, 5, `rubric "${id}" must have exactly 5 bands`);
    assert.ok(Array.isArray(r.assessmentCriteria) && r.assessmentCriteria.length > 0, `rubric "${id}" missing assessmentCriteria`);
    for (const band of r.bands) {
      assert.ok(typeof band.descriptor === 'string' && band.descriptor.length > 0, `rubric "${id}" band ${band.band} missing a descriptor`);
      assert.ok(typeof band.range === 'string' && band.range.length > 0, `rubric "${id}" band ${band.band} missing a range`);
    }
  }
}
```

In `main()`, add before the final `console.log`:
```javascript
  const rubrics = loadJSON('moduleCRubrics.json');
  validateRubrics(rubrics);
  console.log('moduleCRubrics.json OK');
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected: `Error: Missing data file: .../data/moduleCRubrics.json`

- [ ] **Step 3: Create `moduleCRubrics.json`**

```json
{
  "rubric-writing": {
    "id": "rubric-writing",
    "scaleMarks": 20,
    "note": "Descriptors are scaled to the part marks at display time, see the scaling rule below.",
    "assessmentCriteria": [
      "composes an imaginative, discursive or persuasive piece that responds to the question and stimulus",
      "crafts language deliberately and purposefully for audience, purpose and form",
      "controls language and structure appropriate to audience, purpose, context and selected form"
    ],
    "bands": [
      { "band": 5, "range": "17 to 20", "descriptor": "Composes a sophisticated and engaging imaginative, discursive or persuasive piece of writing that skilfully responds to the question and stimulus. Crafts language skilfully. Demonstrates skilful control of language and structure appropriate to audience, purpose, context and selected form." },
      { "band": 4, "range": "13 to 16", "descriptor": "Composes an engaging imaginative, discursive or persuasive piece of writing that effectively responds to the question and stimulus. Crafts language effectively. Demonstrates effective control of language and structure appropriate to audience, purpose, context and selected form." },
      { "band": 3, "range": "9 to 12", "descriptor": "Composes a sound imaginative, discursive or persuasive piece of writing that responds to the question and stimulus. Uses language competently. Demonstrates sound control of language and structure appropriate to audience, purpose, context and selected form." },
      { "band": 2, "range": "5 to 8", "descriptor": "Composes a limited piece of writing which attempts to respond to the question and stimulus. Uses language variably. Demonstrates variable control of language and structure." },
      { "band": 1, "range": "1 to 4", "descriptor": "Attempts to compose a piece of imaginative, discursive or persuasive writing. Demonstrates limited control of language." }
    ],
    "markerRewards": [
      "take an idea from the stimulus and develop it, so the stimulus drives the piece rather than being described or tacked on",
      "offer conceptual insight, with realistic character and setting rather than an action driven plot",
      "sustain a cohesive throughline with a clear controlling idea, so engagement does not dip in and out",
      "craft language with deliberate and consistent purpose, so the reader feels the effect without the purpose being painfully obvious",
      "control audience, purpose and form together, with purposeful variation in sentence length, vocabulary and paragraphing",
      "deploy craft learned from an accomplished model rather than writing generic creative or discursive prose"
    ],
    "markerImprovements": [
      "moving beyond a very literal interpretation of the stimulus",
      "making crafting visible and deliberate rather than merely competent language use",
      "avoiding cliche in idea, character and plot",
      "pushing past the predictable first idea toward a more original controlling concept",
      "matching scope to the marks and time rather than over plotting",
      "controlling expression, punctuation and structure so the piece is not one undifferentiated slab"
    ]
  },
  "rubric-reflection": {
    "id": "rubric-reflection",
    "scaleMarks": 10,
    "note": "Descriptors are scaled to the reflection part marks at display time. Band ranges are numeric per Amendment H (v2), not the qualitative top/high/sound/limited/minimal labels from the base spec.",
    "assessmentCriteria": [
      "explains how the study of texts has informed deliberate choices in the composition",
      "analyses and evaluates own craft rather than merely narrating what was done",
      "expresses ideas clearly using language appropriate to purpose and form"
    ],
    "bands": [
      { "band": 5, "range": "9 to 10", "descriptor": "Skilfully explains and evaluates how the study of texts has informed deliberate craft choices in the composition, using well selected examples from the student's own writing. Expresses ideas with clarity and control." },
      { "band": 4, "range": "7 to 8", "descriptor": "Effectively explains how the study of texts has informed craft choices, with clear examples from the student's own writing. Expresses ideas clearly." },
      { "band": 3, "range": "5 to 6", "descriptor": "Explains in a sound way how the study of texts has informed some choices, with some reference to the student's own writing. Expresses ideas adequately." },
      { "band": 2, "range": "3 to 4", "descriptor": "Describes some aspects of the composition with limited connection to the study of texts. Expresses ideas variably." },
      { "band": 1, "range": "1 to 2", "descriptor": "Attempts to comment on the composition. Demonstrates limited control of language." }
    ],
    "markerRewards": [
      "name specific craft choices in the student's own piece and explain why they were made",
      "connect those choices to a specific studied or mentor text, showing genuine influence rather than a dropped in title",
      "evaluate the effect of the choices on audience and purpose, not just narrate the process"
    ],
    "markerImprovements": [
      "moving from narrating what was done to evaluating why it works",
      "anchoring the reflection in precise examples from the student's own writing",
      "showing the influence of a studied text concretely rather than by assertion"
    ]
  },
  "rubric-analysis": {
    "id": "rubric-analysis",
    "scaleMarks": 5,
    "note": "For the 2022 (a) part and any future short analysis part. Fixed at 5 marks, not scaled further.",
    "assessmentCriteria": [
      "analyses how language shapes meaning in the extract",
      "supports analysis with well selected textual detail",
      "expresses ideas with clarity"
    ],
    "bands": [
      { "band": 5, "range": "5", "descriptor": "Analyses skilfully how language shapes meaning in the extract, supported by well selected textual detail. Expresses ideas with clarity and control." },
      { "band": 4, "range": "4", "descriptor": "Analyses effectively how language shapes meaning, with clear textual detail. Expresses ideas clearly." },
      { "band": 3, "range": "3", "descriptor": "Explains soundly how language shapes meaning, with some textual detail. Expresses ideas adequately." },
      { "band": 2, "range": "2", "descriptor": "Describes some aspects of language with limited textual detail. Expresses ideas variably." },
      { "band": 1, "range": "1", "descriptor": "Attempts to comment on the extract. Demonstrates limited control of language." }
    ]
  },
  "rubric-reflection-comparison": {
    "id": "rubric-reflection-comparison",
    "scaleMarks": 10,
    "note": "For the 2019 (b) part and any future comparison style reflection that compares the student's own piece with a prescribed text rather than tracing influence.",
    "assessmentCriteria": [
      "compares specific crafting choices in the student's own piece with crafting choices in at least one prescribed text",
      "uses precise textual evidence from both",
      "evaluates the effect of the choices on audience and purpose"
    ],
    "bands": [
      { "band": 5, "range": "9 to 10", "descriptor": "Skilfully explains and evaluates how crafting choices in the student's own piece compare with crafting choices in at least one prescribed text, using well selected examples from both texts. Expresses ideas with clarity and control." },
      { "band": 4, "range": "7 to 8", "descriptor": "Effectively explains how crafting choices in the student's own piece compare with crafting choices in at least one prescribed text, with clear examples from both texts. Expresses ideas clearly." },
      { "band": 3, "range": "5 to 6", "descriptor": "Explains in a sound way how some crafting choices in the student's own piece compare with crafting choices in at least one prescribed text, with some reference to both texts. Expresses ideas adequately." },
      { "band": 2, "range": "3 to 4", "descriptor": "Describes some aspects of the composition with limited connection to a prescribed text. Expresses ideas variably." },
      { "band": 1, "range": "1 to 2", "descriptor": "Attempts to comment on the composition. Demonstrates limited control of language." }
    ],
    "markerRewards": [
      "name specific craft choices in the student's own piece and explain why they were made",
      "connect those choices to a specific studied or mentor text, showing genuine influence rather than a dropped in title",
      "evaluate the effect of the choices on audience and purpose, not just narrate the process",
      "compares crafting across texts rather than describing them in turn",
      "matches evidence from the student's own piece against evidence from the prescribed text",
      "evaluates the shared effect on emotion or meaning"
    ]
  },
  "rubric-reflection-short": {
    "id": "rubric-reflection-short",
    "scaleMarks": 8,
    "note": "For the 2023 (b) and 2025 (b) parts. Same assessment criteria as rubric-reflection, rebanded to 8 marks.",
    "assessmentCriteria": [
      "explains how the study of texts has informed deliberate choices in the composition",
      "analyses and evaluates own craft rather than merely narrating what was done",
      "expresses ideas clearly using language appropriate to purpose and form"
    ],
    "bands": [
      { "band": 5, "range": "7 to 8", "descriptor": "Skilfully explains and evaluates how crafting choices in the student's own writing shape meaning, using well selected examples. Expresses ideas with clarity and control." },
      { "band": 4, "range": "6", "descriptor": "Effectively explains how crafting choices shape meaning, with clear examples. Expresses ideas clearly." },
      { "band": 3, "range": "4 to 5", "descriptor": "Explains soundly how some crafting choices shape meaning, with some examples. Expresses ideas adequately." },
      { "band": 2, "range": "3", "descriptor": "Describes some crafting choices with limited connection to meaning. Expresses ideas variably." },
      { "band": 1, "range": "1 to 2", "descriptor": "Attempts to comment on the composition. Demonstrates limited control of language." }
    ],
    "markerRewards": [
      "name specific craft choices in the student's own piece and explain why they were made",
      "connect those choices to a specific studied or mentor text, showing genuine influence rather than a dropped in title",
      "evaluate the effect of the choices on audience and purpose, not just narrate the process"
    ],
    "markerImprovements": [
      "moving from narrating what was done to evaluating why it works",
      "anchoring the reflection in precise examples from the student's own writing",
      "showing the influence of a studied text concretely rather than by assertion"
    ]
  }
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected: `moduleCRubrics.json OK` then the final success line.

- [ ] **Step 5: Commit**

```bash
cd "hsc-short-answer" && git add scripts/validate-module-c-data.js data/moduleCRubrics.json && git commit -m "data: add moduleCRubrics.json (5 rubrics, Amendment A and H applied)"
```

---

### Task 3: `moduleCSyllabus.json`

**Files:**
- Modify: `hsc-short-answer/scripts/validate-module-c-data.js`
- Create: `hsc-short-answer/data/moduleCSyllabus.json`

- [ ] **Step 1: Add the validation function**

```javascript
function validateSyllabus(syllabus) {
  assert.strictEqual(syllabus.auditPoints.length, 6, `moduleCSyllabus.json must hold exactly 6 audit points, found ${syllabus.auditPoints.length}`);
  assert.ok(typeof syllabus.overarchingInquiryQuestion === 'string' && syllabus.overarchingInquiryQuestion.length > 0, 'moduleCSyllabus.json is missing overarchingInquiryQuestion');
  const ids = new Set();
  for (const p of syllabus.auditPoints) {
    assert.ok(!ids.has(p.id), `duplicate syllabus audit point id "${p.id}"`);
    ids.add(p.id);
    assert.ok(typeof p.text === 'string' && p.text.length > 0, `audit point "${p.id}" missing text`);
  }
}
```

In `main()`, add:
```javascript
  const syllabus = loadJSON('moduleCSyllabus.json');
  validateSyllabus(syllabus);
  console.log('moduleCSyllabus.json OK');
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected: `Error: Missing data file: .../data/moduleCSyllabus.json`

- [ ] **Step 3: Create `moduleCSyllabus.json`**

```json
{
  "overarchingInquiryQuestion": "What does it mean to write with power and precision, and how do accomplished writers make deliberate craft decisions that serve a specific audience, purpose and form?",
  "auditPoints": [
    { "id": "s1", "text": "strengthen and extend skills and confidence as an accomplished writer across imaginative, discursive and persuasive forms" },
    { "id": "s2", "text": "use language to convey ideas and emotions with power and precision" },
    { "id": "s3", "text": "make deliberate craft decisions in voice, syntax, imagery and structure for a specific audience, purpose and form" },
    { "id": "s4", "text": "draw on the study of prescribed and mentor texts as models for your own composition" },
    { "id": "s5", "text": "respond to an unseen stimulus by developing an idea from it rather than describing it" },
    { "id": "s6", "text": "reflect on and evaluate your own composing choices where a reflection is required" }
  ]
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected: `moduleCSyllabus.json OK` then the final success line.

- [ ] **Step 5: Commit**

```bash
cd "hsc-short-answer" && git add scripts/validate-module-c-data.js data/moduleCSyllabus.json && git commit -m "data: add moduleCSyllabus.json"
```

---

### Task 4: `moduleCMentorTexts.json`

**Files:**
- Modify: `hsc-short-answer/scripts/validate-module-c-data.js`
- Create: `hsc-short-answer/data/moduleCMentorTexts.json`

- [ ] **Step 1: Add the validation function**

```javascript
function validateMentorTexts(mentorTexts) {
  assert.ok(mentorTexts.length >= 12, `moduleCMentorTexts.json must hold at least 12 craft moves, found ${mentorTexts.length}`);
  const byAuthor = {};
  const ids = new Set();
  for (const m of mentorTexts) {
    assert.ok(!ids.has(m.id), `duplicate mentor move id "${m.id}"`);
    ids.add(m.id);
    assert.ok(['imaginative', 'discursive', 'persuasive'].includes(m.form), `mentor move "${m.id}" has invalid form "${m.form}"`);
    assert.ok(typeof m.move === 'string' && m.move.length > 0, `mentor move "${m.id}" missing move`);
    assert.ok(typeof m.tryPrompt === 'string' && m.tryPrompt.length > 0, `mentor move "${m.id}" missing tryPrompt`);
    byAuthor[m.author] = (byAuthor[m.author] || 0) + 1;
  }
  for (const author of ['Colum McCann', 'Geraldine Brooks', 'Zadie Smith']) {
    assert.ok(byAuthor[author] >= 3, `mentor text author "${author}" must have at least 3 craft moves, found ${byAuthor[author] || 0}`);
  }
}
```

In `main()`, add:
```javascript
  const mentorTexts = loadJSON('moduleCMentorTexts.json');
  validateMentorTexts(mentorTexts);
  console.log('moduleCMentorTexts.json OK');
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected: `Error: Missing data file: .../data/moduleCMentorTexts.json`

- [ ] **Step 3: Create `moduleCMentorTexts.json`**

```json
[
  { "id": "craft-mccann-01", "text": "What Time Is It Now, Where You Are?", "author": "Colum McCann", "form": "imaginative", "move": "Cumulative sentence", "description": "A sentence that opens with a main clause then keeps adding participial and descriptive phrases, so meaning accrues in layers.", "tryPrompt": "Write one cumulative sentence that opens on a clear image then adds three layers of detail without a full stop." },
  { "id": "craft-mccann-02", "text": "What Time Is It Now, Where You Are?", "author": "Colum McCann", "form": "imaginative", "move": "Mise en abyme", "description": "A story about the making of a story, so the act of composition is visible inside the piece.", "tryPrompt": "Write a short passage where a writer figure shapes the very scene the reader is reading." },
  { "id": "craft-mccann-03", "text": "What Time Is It Now, Where You Are?", "author": "Colum McCann", "form": "imaginative", "move": "Second person address", "description": "Addressing a you, which pulls the reader into the frame and blurs writer, character and reader.", "tryPrompt": "Write an opening in the second person that makes the reader feel implicated in the scene." },
  { "id": "craft-mccann-04", "text": "What Time Is It Now, Where You Are?", "author": "Colum McCann", "form": "imaginative", "move": "Metafictive intrusion", "description": "The narrator steps out to comment on the choices being made, foregrounding craft.", "tryPrompt": "Write two sentences where the narrator pauses to weigh a choice about how the scene should go." },
  { "id": "craft-brooks-01", "text": "A Home in Fiction", "author": "Geraldine Brooks", "form": "discursive", "move": "Oscillation between anecdote and idea", "description": "Moving between a personal story and a broader reflection, so the idea is earned through experience.", "tryPrompt": "Write a short passage that opens on an anecdote then turns to a larger idea it raises." },
  { "id": "craft-brooks-02", "text": "A Home in Fiction", "author": "Geraldine Brooks", "form": "discursive", "move": "Intertextual reference", "description": "Drawing on other texts and writers to open out the reflection.", "tryPrompt": "Write a sentence that uses another text or writer to deepen your own point, woven in not dropped in." },
  { "id": "craft-brooks-03", "text": "A Home in Fiction", "author": "Geraldine Brooks", "form": "discursive", "move": "Open ended reflection", "description": "Ending on a question or an unresolved thought rather than a neat conclusion.", "tryPrompt": "Write a closing that leaves the idea open without tying it off too neatly." },
  { "id": "craft-brooks-04", "text": "A Home in Fiction", "author": "Geraldine Brooks", "form": "discursive", "move": "Earning the right to speculate", "description": "Building enough grounded detail that a broader speculation feels warranted.", "tryPrompt": "Write a passage that lays down concrete detail then earns a speculative claim from it." },
  { "id": "craft-smith-01", "text": "That Crafty Feeling", "author": "Zadie Smith", "form": "discursive", "move": "Sectioned structure", "description": "Organising the piece into named or numbered sections that stage the thinking.", "tryPrompt": "Sketch two short sections with headings that move an idea forward in stages." },
  { "id": "craft-smith-02", "text": "That Crafty Feeling", "author": "Zadie Smith", "form": "discursive", "move": "Register shift", "description": "Moving between the colloquial and the analytical for effect and control of tone.", "tryPrompt": "Write a passage that shifts once from a casual register to a precise analytical one." },
  { "id": "craft-smith-03", "text": "That Crafty Feeling", "author": "Zadie Smith", "form": "discursive", "move": "Extended metaphor", "description": "Carrying one governing metaphor across the piece to hold the ideas together.", "tryPrompt": "Choose one metaphor for the writing process and extend it across three sentences." },
  { "id": "craft-smith-04", "text": "That Crafty Feeling", "author": "Zadie Smith", "form": "discursive", "move": "Metalanguage of craft", "description": "Naming the moves of writing itself, so the reflection on craft is precise.", "tryPrompt": "Write a sentence that names a specific craft move and what it does, precisely." },
  { "id": "craft-persuasive-01", "text": "Unit persuasive craft", "author": "Unit teaching", "form": "persuasive", "move": "Anecdote as evidence", "description": "Opening on a concrete story that grounds and warms the argument before the claim.", "tryPrompt": "Write an opening anecdote that makes a reader care before you state your stance." },
  { "id": "craft-persuasive-02", "text": "Unit persuasive craft", "author": "Unit teaching", "form": "persuasive", "move": "Counterargument and rebuttal", "description": "Naming the strongest opposing view then answering it, which builds credibility.", "tryPrompt": "Write a sentence that concedes the best counterargument then turns it to your advantage." }
]
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected: `moduleCMentorTexts.json OK` then the final success line.

- [ ] **Step 5: Commit**

```bash
cd "hsc-short-answer" && git add scripts/validate-module-c-data.js data/moduleCMentorTexts.json && git commit -m "data: add moduleCMentorTexts.json (14 verified craft moves)"
```

---

### Task 5: `moduleCStimulus.json`

**Files:**
- Modify: `hsc-short-answer/scripts/validate-module-c-data.js`
- Create: `hsc-short-answer/data/moduleCStimulus.json`

The 10 image entries are already `assetSupplied: true` — Adam already has these asset files (`1.jpg`–`10.jpg`), separate from the two still-outstanding authentic exam images handled in Task 6.

- [ ] **Step 1: Add the validation function**

```javascript
function validateStimulus(stimulus) {
  assert.strictEqual(stimulus.length, 20, `moduleCStimulus.json must hold exactly 20 entries, found ${stimulus.length}`);
  const images = stimulus.filter(s => s.kind === 'image');
  const written = stimulus.filter(s => s.kind === 'written');
  assert.strictEqual(images.length, 10, `moduleCStimulus.json must hold exactly 10 image entries, found ${images.length}`);
  assert.strictEqual(written.length, 10, `moduleCStimulus.json must hold exactly 10 written entries, found ${written.length}`);
  const ids = new Set();
  for (const s of stimulus) {
    assert.ok(!ids.has(s.id), `duplicate stimulus id "${s.id}"`);
    ids.add(s.id);
    assert.ok(Array.isArray(s.conceptTags) && s.conceptTags.length > 0, `stimulus "${s.id}" missing conceptTags`);
  }
  for (const img of images) {
    assert.strictEqual(img.assetSupplied, true, `image stimulus "${img.id}" must have assetSupplied true`);
    assert.ok(typeof img.description === 'string' && img.description.length > 0, `image stimulus "${img.id}" missing description`);
  }
  for (const w of written) {
    assert.ok(typeof w.stimulusText === 'string' && w.stimulusText.length > 0, `written stimulus "${w.id}" missing stimulusText`);
    assert.ok(typeof w.useMode === 'string' && w.useMode.length > 0, `written stimulus "${w.id}" missing useMode`);
  }
}
```

In `main()`, add:
```javascript
  const stimulus = loadJSON('moduleCStimulus.json');
  validateStimulus(stimulus);
  console.log('moduleCStimulus.json OK');
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected: `Error: Missing data file: .../data/moduleCStimulus.json`

- [ ] **Step 3: Create `moduleCStimulus.json`**

```json
[
  { "id": "img-modC-01", "kind": "image", "assetPath": "/images/module-c/1.jpg", "assetSupplied": true, "description": "A single open doorway standing alone in an empty grass field with no walls around it, warm light spilling through the frame while the sky behind is overcast and grey, shot at dawn with a shallow depth of field. Themes, threshold, change, the unknown, choice.", "conceptTags": ["change", "place", "memory"] },
  { "id": "img-modC-02", "kind": "image", "assetPath": "/images/module-c/2.jpg", "assetSupplied": true, "description": "An old wooden chair beside a rain streaked window in a dim room, a thin shaft of afternoon light falling across a fine layer of dust and one faded photograph resting face down on the seat, quiet sepia and slate tones. Themes, memory, the past, absence, time.", "conceptTags": ["isolation", "threshold", "time"] },
  { "id": "img-modC-03", "kind": "image", "assetPath": "/images/module-c/3.jpg", "assetSupplied": true, "description": "A large public station clock photographed from behind, its translucent glowing face lit by bright morning light with the mechanism visible in reverse and blurred commuters far below, cool blue and amber tones. Themes, time, perspective, the unseen, routine.", "conceptTags": ["connection", "distance", "longing"] },
  { "id": "img-modC-04", "kind": "image", "assetPath": "/images/module-c/4.jpg", "assetSupplied": true, "description": "A single lit window in a dark apartment block at dusk, warm golden light from one room while every other window sits in cool blue shadow, an atmospheric wide shot. Themes, home, belonging, solitude, connection.", "conceptTags": ["change", "journey", "uncertainty"] },
  { "id": "img-modC-05", "kind": "image", "assetPath": "/images/module-c/5.jpg", "assetSupplied": true, "description": "Two tin cans joined by a long taut string stretched across a wide empty landscape, the string sagging slightly beneath an overcast sky above dry pale earth, minimalist and faintly surreal. Themes, communication, distance, relationships, silence.", "conceptTags": ["home", "belonging", "absence"] },
  { "id": "img-modC-06", "kind": "image", "assetPath": "/images/module-c/6.jpg", "assetSupplied": true, "description": "A narrow dirt path splitting into two through tall golden grass, one branch bright under sun and the other fading into low mist toward distant hills, late afternoon light. Themes, journey, choice, uncertainty, the future.", "conceptTags": ["nature", "scale", "the sublime"] },
  { "id": "img-modC-07", "kind": "image", "assetPath": "/images/module-c/7.jpg", "assetSupplied": true, "description": "A single bare tree on a small island of earth surrounded by still water that mirrors a pale sky, one green shoot at the base of the trunk, muted teal and grey tones with a calm reflective light. Themes, isolation, resilience, renewal, endurance.", "conceptTags": ["work", "routine", "quiet dignity"] },
  { "id": "img-modC-08", "kind": "image", "assetPath": "/images/module-c/8.jpg", "assetSupplied": true, "description": "A weathered mirror leaning against a brick wall in an alley, reflecting not the wall opposite but a wide open sea and sky, the two realities meeting at the mirror's edge, quietly uncanny in natural daylight. Themes, identity, perception, the hidden self, escape.", "conceptTags": ["childhood", "memory", "loss"] },
  { "id": "img-modC-09", "kind": "image", "assetPath": "/images/module-c/9.jpg", "assetSupplied": true, "description": "A child's paper boat on the still surface of a dawn puddle, the reflection of a vast sky and the first light stretching far below it as ripples spread softly outward, an intimate warm close up. Themes, hope, anticipation, fragility, imagination.", "conceptTags": ["city", "anonymity", "connection"] },
  { "id": "img-modC-10", "kind": "image", "assetPath": "/images/module-c/10.jpg", "assetSupplied": true, "description": "A stretch of wet sand at low tide holding a single line of footprints that leads toward the water and stops, the tide just reaching the last print under soft grey morning light, a quiet muted monochrome shore. Themes, the trace we leave, transience, memory, solitude.", "conceptTags": ["transformation", "light", "hope"] },
  { "id": "txt-modC-01", "kind": "written", "stimulusText": "We tell ourselves stories in order to live.", "attribution": "Joan Didion, The White Album", "useMode": "respond-to-idea", "useInstruction": "Take this idea as a starting point. You do not have to quote it.", "conceptTags": ["technology", "change", "identity"] },
  { "id": "txt-modC-02", "kind": "written", "stimulusText": "The door was open.", "useMode": "incorporate-as-opening-line", "useInstruction": "Begin your piece with this line.", "conceptTags": ["threshold", "choice", "the unknown"] },
  { "id": "txt-modC-03", "kind": "written", "stimulusText": "Local library to close after ninety years", "useMode": "respond-to-headline", "useInstruction": "Write a piece that responds to this headline in a form of your choosing where the question allows.", "conceptTags": ["community", "loss", "memory"] },
  { "id": "txt-modC-04", "kind": "written", "stimulusText": "The past is a foreign country: they do things differently there.", "attribution": "L. P. Hartley, The Go-Between", "useMode": "incorporate-as-line", "useInstruction": "Begin or end your piece with this line.", "conceptTags": ["aftermath", "memory", "change"] },
  { "id": "txt-modC-05", "kind": "written", "stimulusText": "Threshold", "useMode": "single-word", "useInstruction": "Use this single word as your point of departure.", "conceptTags": ["transition", "liminality", "choice"] },
  { "id": "txt-modC-06", "kind": "written", "stimulusText": "No man is an island, entire of itself.", "attribution": "John Donne, Devotions upon Emergent Occasions", "useMode": "respond-to-idea", "useInstruction": "Take this idea as the concern of your piece.", "conceptTags": ["communication", "relationships", "silence"] },
  { "id": "txt-modC-07", "kind": "written", "stimulusText": "The world breaks everyone, and afterward many are strong at the broken places.", "attribution": "Ernest Hemingway, A Farewell to Arms", "useMode": "incorporate-as-line", "useInstruction": "Begin your piece with this line.", "conceptTags": ["return", "change", "time"] },
  { "id": "txt-modC-08", "kind": "written", "stimulusText": "Memory believes before knowing remembers.", "attribution": "William Faulkner, Light in August", "useMode": "respond-to-idea", "useInstruction": "Take this idea as a starting point for imaginative or discursive writing.", "conceptTags": ["memory", "truth", "storytelling"] },
  { "id": "txt-modC-09", "kind": "written", "stimulusText": "the last light on the water", "useMode": "fragment", "useInstruction": "Use this fragment as an image to build from.", "conceptTags": ["endings", "beauty", "transience"] },
  { "id": "txt-modC-10", "kind": "written", "stimulusText": "We are all in the gutter, but some of us are looking at the stars.", "attribution": "Oscar Wilde, Lady Windermere's Fan", "useMode": "respond-to-idea", "useInstruction": "Take this idea as the concern of your piece.", "conceptTags": ["home", "belonging", "identity"] }
]
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected: `moduleCStimulus.json OK` then the final success line.

- [ ] **Step 5: Commit**

```bash
cd "hsc-short-answer" && git add scripts/validate-module-c-data.js data/moduleCStimulus.json && git commit -m "data: add moduleCStimulus.json (10 image + 10 written)"
```

---

### Task 6: `moduleCCustomStems.json`

**Files:**
- Modify: `hsc-short-answer/scripts/validate-module-c-data.js`
- Create: `hsc-short-answer/data/moduleCCustomStems.json`

This is the seed bank for "Make your own" mode (Amendment K) — the tool looks up a stem by shape signature rather than ever generating one. The brief provides 3 seed stems and says to extend by hand later to at least 2 per signature; the validator only enforces basic shape correctness on what exists now, not the eventual 2-per-signature target, since that's future authoring work, not a build blocker.

- [ ] **Step 1: Add the validation function**

```javascript
function validateCustomStems(stems) {
  assert.ok(stems.length >= 3, `moduleCCustomStems.json must hold at least the 3 authored seed stems, found ${stems.length}`);
  const ids = new Set();
  for (const s of stems) {
    assert.ok(!ids.has(s.id), `duplicate custom stem id "${s.id}"`);
    ids.add(s.id);
    assert.ok(typeof s.signature === 'string' && s.signature.length > 0, `custom stem "${s.id}" missing signature`);
    assert.ok(typeof s.stemTemplate === 'string' && s.stemTemplate.length > 0, `custom stem "${s.id}" missing stemTemplate`);
  }
}
```

In `main()`, add:
```javascript
  const customStems = loadJSON('moduleCCustomStems.json');
  validateCustomStems(customStems);
  console.log('moduleCCustomStems.json OK');
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected: `Error: Missing data file: .../data/moduleCCustomStems.json`

- [ ] **Step 3: Create `moduleCCustomStems.json`**

```json
[
  { "id": "cs-01", "signature": "imag|image|noref|nomentor", "stemTemplate": "Use the image below as the stimulus for a piece of formList writing that explores a moment of consequence." },
  { "id": "cs-02", "signature": "imag|written|ref|mentor", "stemTemplate": "(a) Use the stimulus below as the starting point for a piece of formList writing.\n(b) Reflect on how your study of your prescribed texts has informed the crafting choices you made in part (a)." },
  { "id": "cs-03", "signature": "disc,pers|choice|ref|nomentor", "stemTemplate": "(a) Choose one of the stimuli provided and use it as the starting point for a piece of formList writing.\n(b) Justify how your specific language choices in part (a) served your audience and purpose." }
]
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected: `moduleCCustomStems.json OK` then the final success line.

- [ ] **Step 5: Commit**

```bash
cd "hsc-short-answer" && git add scripts/validate-module-c-data.js data/moduleCCustomStems.json && git commit -m "data: add moduleCCustomStems.json seed bank for Make your own mode"
```

---

### Task 7: `moduleCQuestions.json`

**Files:**
- Modify: `hsc-short-answer/scripts/validate-module-c-data.js`
- Create: `hsc-short-answer/data/moduleCQuestions.json`

This is the big one: 7 authentic questions (2019–2025, transcribed verbatim from the brief's authentic reference section) plus 20 teacher-authored questions covering the full shape matrix. Amendment B rubric rewiring is applied here:
- `modC-2019` part `p2`: `rubric-reflection` → `rubric-reflection-comparison`
- `modC-2022` part `p1`: `rubric-reflection` → `rubric-analysis`, and the "provisional" note is removed
- `modC-2023` part `p2`: `rubric-reflection` → `rubric-reflection-short`
- `modC-2025` part `p2`: `rubric-reflection` → `rubric-reflection-short`

The two authentic questions with image stimuli (2021, 2025) carry `assetSupplied: false` for their own dedicated exam images (distinct from the already-supplied 10 practice stimulus images from Task 5) — these two stay excluded from the live serving pool until Adam supplies `/images/module-c/auth-2021.jpg` and `auth-2025.jpg`.

- [ ] **Step 1: Add the validation function**

This implements the build brief's "3. Data schema validation" checks plus the "2. Data bank quantitative targets" shape-matrix coverage.

```javascript
function validateQuestions(questions, rubrics, stimulus) {
  const stimulusIds = new Set(stimulus.map(s => s.id));
  const rubricIds = new Set(Object.keys(rubrics));
  const ids = new Set();
  const authentic = questions.filter(q => q.isAuthenticPastQuestion === true);
  const teacherAuthored = questions.filter(q => q.isAuthenticPastQuestion === false);

  assert.ok(questions.length >= 27, `moduleCQuestions.json must hold at least 27 entries, found ${questions.length}`);
  assert.strictEqual(authentic.length, 7, `moduleCQuestions.json must hold exactly 7 authentic questions, found ${authentic.length}`);
  assert.ok(teacherAuthored.length >= 20, `moduleCQuestions.json must hold at least 20 teacher authored questions, found ${teacherAuthored.length}`);

  const years = authentic.map(q => q.year).sort((a, b) => a - b);
  assert.deepStrictEqual(years, [2019, 2020, 2021, 2022, 2023, 2024, 2025], 'authentic questions must cover exactly one entry per year 2019 to 2025');

  for (const q of questions) {
    assert.ok(!ids.has(q.id), `duplicate question id "${q.id}"`);
    ids.add(q.id);
    assert.ok(typeof q.stemText === 'string' && q.stemText.length > 0, `question "${q.id}" missing stemText`);

    const shape = q.shape;
    const partsSum = shape.parts.reduce((sum, p) => sum + p.marks, 0);
    assert.strictEqual(shape.totalMarks, 20, `question "${q.id}" shape.totalMarks must equal 20`);
    assert.strictEqual(partsSum, 20, `question "${q.id}" parts marks must sum to 20, summed to ${partsSum}`);

    assert.ok(Array.isArray(shape.formOptions) && shape.formOptions.length > 0, `question "${q.id}" formOptions must be a non-empty array`);
    for (const f of shape.formOptions) {
      assert.ok(['imaginative', 'discursive', 'persuasive'].includes(f), `question "${q.id}" has invalid form "${f}"`);
    }

    assert.ok(['none', 'image', 'written', 'choice'].includes(shape.stimulus.type), `question "${q.id}" has invalid stimulus type "${shape.stimulus.type}"`);
    if (shape.stimulus.type === 'written' && shape.stimulus.stimulusId) {
      assert.ok(stimulusIds.has(shape.stimulus.stimulusId), `question "${q.id}" references unknown stimulusId "${shape.stimulus.stimulusId}"`);
    }
    if (shape.stimulus.type === 'image' && shape.stimulus.stimulusId) {
      assert.ok(stimulusIds.has(shape.stimulus.stimulusId), `question "${q.id}" references unknown stimulusId "${shape.stimulus.stimulusId}"`);
    }
    if (shape.stimulus.type === 'written') {
      assert.ok(shape.stimulus.stimulusText || shape.stimulus.stimulusId, `question "${q.id}" written stimulus needs stimulusText or stimulusId`);
    }
    if (shape.stimulus.type === 'image') {
      assert.ok(shape.stimulus.stimulusId || 'assetPath' in shape.stimulus, `question "${q.id}" image stimulus needs stimulusId or assetPath`);
    }
    if (shape.stimulus.type === 'choice') {
      assert.ok(Array.isArray(shape.stimulus.allowedStimulusIds) && shape.stimulus.allowedStimulusIds.length > 0, `question "${q.id}" choice stimulus needs allowedStimulusIds`);
      for (const sid of shape.stimulus.allowedStimulusIds) {
        assert.ok(stimulusIds.has(sid), `question "${q.id}" references unknown stimulusId "${sid}" in allowedStimulusIds`);
      }
    }

    assert.ok(Array.isArray(shape.parts) && shape.parts.length > 0, `question "${q.id}" parts must be a non-empty array`);
    const reflectionParts = shape.parts.filter(p => p.type === 'reflection');
    if (shape.reflection.required) {
      assert.strictEqual(reflectionParts.length, 1, `question "${q.id}" declares reflection.required true but does not have exactly one reflection part`);
      assert.strictEqual(reflectionParts[0].marks, shape.reflection.marks, `question "${q.id}" reflection part marks must equal shape.reflection.marks`);
    } else {
      assert.strictEqual(reflectionParts.length, 0, `question "${q.id}" declares reflection.required false but has a reflection part`);
    }

    for (const part of shape.parts) {
      assert.ok(['writing', 'reflection', 'analysis'].includes(part.type), `question "${q.id}" part "${part.id}" has invalid type "${part.type}"`);
      assert.ok(part.marks > 0, `question "${q.id}" part "${part.id}" marks must be positive`);
      assert.ok(rubricIds.has(part.rubricId), `question "${q.id}" part "${part.id}" references unknown rubricId "${part.rubricId}"`);
      if (part.type === 'writing') {
        assert.ok(Array.isArray(part.formOptions), `question "${q.id}" writing part "${part.id}" missing formOptions`);
        for (const f of part.formOptions) {
          assert.ok(shape.formOptions.includes(f), `question "${q.id}" writing part "${part.id}" formOptions must be a subset of shape.formOptions`);
        }
      }
    }
  }

  const matches = {
    'single imaginative': q => q.shape.formOptions.length === 1 && q.shape.formOptions[0] === 'imaginative',
    'single discursive': q => q.shape.formOptions.length === 1 && q.shape.formOptions[0] === 'discursive',
    'single persuasive': q => q.shape.formOptions.length === 1 && q.shape.formOptions[0] === 'persuasive',
    'choice of two or three forms': q => q.shape.formOptions.length > 1,
    'composition plus reflection': q => q.shape.reflection.required === true,
    'image stimulus': q => q.shape.stimulus.type === 'image',
    'written stimulus': q => q.shape.stimulus.type === 'written',
    'no stimulus': q => q.shape.stimulus.type === 'none'
  };
  for (const [label, test] of Object.entries(matches)) {
    const count = questions.filter(test).length;
    assert.ok(count >= 3, `shape matrix coverage: need at least 3 questions matching "${label}", found ${count}`);
  }

  // Amendment B rubric rewiring, confirmed by TC-34
  const byId = Object.fromEntries(questions.map(q => [q.id, q]));
  const rewiredChecks = [
    ['modC-2019', 'p2', 'rubric-reflection-comparison'],
    ['modC-2022', 'p1', 'rubric-analysis'],
    ['modC-2023', 'p2', 'rubric-reflection-short'],
    ['modC-2025', 'p2', 'rubric-reflection-short']
  ];
  for (const [qId, partId, expectedRubricId] of rewiredChecks) {
    const q = byId[qId];
    assert.ok(q, `expected authentic question "${qId}" to exist for Amendment B rubric check`);
    const part = q.shape.parts.find(p => p.id === partId);
    assert.ok(part, `expected part "${partId}" on question "${qId}" for Amendment B rubric check`);
    assert.strictEqual(part.rubricId, expectedRubricId, `question "${qId}" part "${partId}" must reference "${expectedRubricId}" per Amendment B, found "${part.rubricId}"`);
  }
}
```

In `main()`, add:
```javascript
  const questions = loadJSON('moduleCQuestions.json');
  validateQuestions(questions, rubrics, stimulus);
  console.log('moduleCQuestions.json OK');
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected: `Error: Missing data file: .../data/moduleCQuestions.json`

- [ ] **Step 3: Create `moduleCQuestions.json`**

```json
[
  { "id": "modC-2019", "isAuthenticPastQuestion": true, "year": 2019, "stemText": "(a) Continue this extract as a piece of imaginative, discursive or persuasive writing that evokes a particular emotional response in the reader.\nNote: You are NOT required to write out the extract as part of your response.\n(b) Compare how you have used language in part (a) to evoke emotion with the way writing has been crafted in at least ONE prescribed text from Module C.", "shape": { "formOptions": ["imaginative", "discursive", "persuasive"], "stimulus": { "type": "written", "stimulusText": "Twice before, a book had turned him inside out and altered who he was, had blasted apart his assumptions about the world and thrust him onto a new ground where everything in the world suddenly looked different — and would remain different for the rest of time, for as long as he himself went on living in time and occupied space in the world.", "attribution": "Paul Auster, 4 3 2 1", "useMode": "continue-the-extract", "instruction": "Continue the extract. You are not required to write out the extract." }, "reflection": { "required": true, "marks": 10, "prompt": "Compare how you have used language in part (a) to evoke emotion with the way writing has been crafted in at least ONE prescribed text from Module C.", "mentorTextExpected": true }, "parts": [ { "id": "p1", "type": "writing", "marks": 10, "rubricId": "rubric-writing", "formOptions": ["imaginative", "discursive", "persuasive"] }, { "id": "p2", "type": "reflection", "marks": 10, "rubricId": "rubric-reflection-comparison", "mentorTextExpected": true } ], "totalMarks": 20 } },
  { "id": "modC-2020", "isAuthenticPastQuestion": true, "year": 2020, "stemText": "Compose a piece of imaginative writing that begins with the words in the stimulus below.\nNote: You are NOT required to write out the extract as part of your response.", "shape": { "formOptions": ["imaginative"], "stimulus": { "type": "written", "stimulusText": "Some things are unknowable. A person's secrets may be revealed by the things they leave behind; but what are they, those supposedly uncovered secrets? They are words, ideas ... Dry and dead as dust.", "attribution": "Jenny Sinclair, Tamby East", "useMode": "begin-with-these-words", "instruction": "Begin your piece with these words. You are not required to write out the extract." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["imaginative"] } ], "totalMarks": 20 } },
  { "id": "modC-2021", "isAuthenticPastQuestion": true, "year": 2021, "stemText": "(a) Use the image provided to craft a central metaphor in a piece of imaginative, discursive or persuasive writing.\n(b) Evaluate how your study of figurative language in The Craft of Writing influenced the creative decisions you made in part (a). In your response, make reference to one or more of your prescribed texts.", "shape": { "formOptions": ["imaginative", "discursive", "persuasive"], "stimulus": { "type": "image", "assetPath": "/images/module-c/auth-2021.jpg", "assetSupplied": false, "attribution": "© Agim Sulaj", "placeholderText": "Authentic 2021 image stimulus. Adam to save the asset from the Past Module C Questions page. Do not analyse this placeholder.", "authoringNote": "Source image is a hand reaching through a wire fence to draw footprints, © Agim Sulaj.", "instruction": "Use the image provided to craft a central metaphor." }, "reflection": { "required": true, "marks": 10, "prompt": "Evaluate how your study of figurative language in The Craft of Writing influenced the creative decisions you made in part (a). In your response, make reference to one or more of your prescribed texts.", "mentorTextExpected": true }, "parts": [ { "id": "p1", "type": "writing", "marks": 10, "rubricId": "rubric-writing", "formOptions": ["imaginative", "discursive", "persuasive"] }, { "id": "p2", "type": "reflection", "marks": 10, "rubricId": "rubric-reflection", "mentorTextExpected": true } ], "totalMarks": 20 } },
  { "id": "modC-2022", "isAuthenticPastQuestion": true, "year": 2022, "stemText": "(a) Explore how personal fulfilment is expressed by the writer. In your response, make reference to at least ONE language device or stylistic feature in the extract.\n(b) Craft an imaginative or discursive piece of writing that explores a shared experience which brings about a sense of fulfilment.", "shape": { "formOptions": ["imaginative", "discursive"], "stimulus": { "type": "written", "stimulusText": "Her mind wandered. Last night had been something. Alive. Yes. She had felt alive. Kindled. Lit. Blazing. She had forgotten the way being around other people could feel ... The sharing of food. The sharing of stories. The gathering around a fire. Elemental. And no one had required anything of her. She had been allowed to just listen. To absorb. She'd forgotten how much she was capable of absorbing.", "attribution": "Vanessa McCausland, extract from The Beautiful Words", "useMode": "analyse-then-compose", "instruction": "Part (a) analyses this extract. Part (b) composes a new piece on a shared experience that brings fulfilment." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "analysis", "marks": 5, "rubricId": "rubric-analysis", "note": "This part analyses the extract, it is not a reflection on the student's own writing." }, { "id": "p2", "type": "writing", "marks": 15, "rubricId": "rubric-writing", "formOptions": ["imaginative", "discursive"] } ], "totalMarks": 20 } },
  { "id": "modC-2023", "isAuthenticPastQuestion": true, "year": 2023, "stemText": "(a) Use this extract as the stimulus for an imaginative or discursive piece of writing that explores the hope that comes with anticipation.\n(b) Justify how the stylistic choices you have made in part (a) demonstrate the hope that comes with anticipation. In your response, make detailed reference to your writing in part (a).", "shape": { "formOptions": ["imaginative", "discursive"], "stimulus": { "type": "written", "stimulusText": "In the middle of the night, around four am, sometimes/often/but not always, a bird sings a four-note song at intervals. It doesn't wake me up but when I lie there I hear it and imagine it is letting all the other birds and the rest of us know that all is well. Morning is coming.", "attribution": "Stephanie Radok, Under the Bed", "useMode": "respond-to-extract", "instruction": "Use this extract as the stimulus." }, "reflection": { "required": true, "marks": 8, "prompt": "Justify how the stylistic choices you have made in part (a) demonstrate the hope that comes with anticipation. In your response, make detailed reference to your writing in part (a).", "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 12, "rubricId": "rubric-writing", "formOptions": ["imaginative", "discursive"] }, { "id": "p2", "type": "reflection", "marks": 8, "rubricId": "rubric-reflection-short", "mentorTextExpected": false } ], "totalMarks": 20 } },
  { "id": "modC-2024", "isAuthenticPastQuestion": true, "year": 2024, "stemText": "Craft a discursive or persuasive piece of writing that incorporates the ideas in the stimulus above.", "shape": { "formOptions": ["discursive", "persuasive"], "stimulus": { "type": "written", "stimulusText": "For all the benefits gained by time-saving inventions, there's much to be said for going back to basics ... So, could there be benefits to leading a life less convenient?", "attribution": "Jessica Powell, Worth the while", "useMode": "incorporate-the-ideas", "instruction": "Incorporate the ideas in the stimulus." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["discursive", "persuasive"] } ], "totalMarks": 20 } },
  { "id": "modC-2025", "isAuthenticPastQuestion": true, "year": 2025, "stemText": "(a) Craft an imaginative piece of writing which incorporates the provided image as the focus of your narrative.\n(b) Explain how you have incorporated the provided image to shape meaning in your narrative, making close reference to your specific language choices in part (a).", "shape": { "formOptions": ["imaginative"], "stimulus": { "type": "image", "assetPath": "/images/module-c/auth-2025.jpg", "assetSupplied": false, "attribution": "Licensed under CC BY 2.0", "placeholderText": "Authentic 2025 image stimulus. Adam to save the asset from the Past Module C Questions page. Do not analyse this placeholder.", "authoringNote": "Source image is a large station clock viewed from behind against light, licensed under CC BY 2.0.", "instruction": "Incorporate the provided image as the focus of your narrative." }, "reflection": { "required": true, "marks": 8, "prompt": "Explain how you have incorporated the provided image to shape meaning in your narrative, making close reference to your specific language choices in part (a).", "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 12, "rubricId": "rubric-writing", "formOptions": ["imaginative"] }, { "id": "p2", "type": "reflection", "marks": 8, "rubricId": "rubric-reflection-short", "mentorTextExpected": false } ], "totalMarks": 20 } },
  { "id": "modC-var-01", "stemText": "Use the image below as the stimulus for a piece of imaginative writing that explores a moment of change.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["imaginative"], "stimulus": { "type": "image", "stimulusId": "img-modC-01", "instruction": "Use the image as the stimulus. Take an idea from it, do not merely describe it." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["imaginative"] } ], "totalMarks": 20 } },
  { "id": "modC-var-02", "stemText": "Begin a piece of imaginative writing with the line, The door was open.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["imaginative"], "stimulus": { "type": "written", "stimulusId": "txt-modC-02", "instruction": "Begin your piece with this line." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["imaginative"] } ], "totalMarks": 20 } },
  { "id": "modC-var-03", "stemText": "Compose a piece of imaginative writing that explores the idea of belonging.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["imaginative"], "stimulus": { "type": "none", "stimulusId": null, "instruction": null }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["imaginative"] } ], "totalMarks": 20 } },
  { "id": "modC-var-04", "stemText": "Using the idea in the stimulus below as a starting point, compose a piece of discursive writing.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["discursive"], "stimulus": { "type": "written", "stimulusId": "txt-modC-01", "instruction": "Take this idea as a starting point. You do not have to quote it." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["discursive"] } ], "totalMarks": 20 } },
  { "id": "modC-var-05", "stemText": "Compose a piece of discursive writing that explores what it means to change your mind.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["discursive"], "stimulus": { "type": "none", "stimulusId": null, "instruction": null }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["discursive"] } ], "totalMarks": 20 } },
  { "id": "modC-var-06", "stemText": "Use the image below as the stimulus for a piece of discursive writing about home.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["discursive"], "stimulus": { "type": "image", "stimulusId": "img-modC-05", "instruction": "Use the image as the stimulus. Take an idea from it, do not merely describe it." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["discursive"] } ], "totalMarks": 20 } },
  { "id": "modC-var-07", "stemText": "Respond to the headline in the stimulus below with a piece of persuasive writing.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["persuasive"], "stimulus": { "type": "written", "stimulusId": "txt-modC-03", "instruction": "Respond to this headline. Develop a clear stance." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["persuasive"] } ], "totalMarks": 20 } },
  { "id": "modC-var-08", "stemText": "Compose a piece of persuasive writing that argues for the value of doing something slowly.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["persuasive"], "stimulus": { "type": "none", "stimulusId": null, "instruction": null }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["persuasive"] } ], "totalMarks": 20 } },
  { "id": "modC-var-09", "stemText": "Use the image below as the stimulus for a piece of persuasive writing.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["persuasive"], "stimulus": { "type": "image", "stimulusId": "img-modC-09", "instruction": "Use the image as the stimulus. Take an idea from it and develop a stance." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["persuasive"] } ], "totalMarks": 20 } },
  { "id": "modC-var-10", "stemText": "Compose a piece of imaginative OR discursive writing that explores the idea of a turning point.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["imaginative", "discursive"], "stimulus": { "type": "none", "stimulusId": null, "instruction": null }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["imaginative", "discursive"] } ], "totalMarks": 20 } },
  { "id": "modC-var-11", "stemText": "Using the line in the stimulus below, compose a piece of imaginative OR discursive writing.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["imaginative", "discursive"], "stimulus": { "type": "written", "stimulusId": "txt-modC-04", "instruction": "Begin or end your piece with this line." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["imaginative", "discursive"] } ], "totalMarks": 20 } },
  { "id": "modC-var-12", "stemText": "Use the image below as the stimulus for a piece of imaginative OR discursive writing.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["imaginative", "discursive"], "stimulus": { "type": "image", "stimulusId": "img-modC-02", "instruction": "Use the image as the stimulus. Take an idea from it, do not merely describe it." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["imaginative", "discursive"] } ], "totalMarks": 20 } },
  { "id": "modC-var-13", "stemText": "Using the idea in the stimulus below, compose a piece of imaginative, discursive OR persuasive writing.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["imaginative", "discursive", "persuasive"], "stimulus": { "type": "written", "stimulusId": "txt-modC-06", "instruction": "Take this idea as the concern of your piece." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["imaginative", "discursive", "persuasive"] } ], "totalMarks": 20 } },
  { "id": "modC-var-14", "stemText": "(a) Compose a piece of imaginative writing that explores memory.\n(b) Reflect on how your study of the mentor texts has shaped the composing choices in your response to part (a).", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["imaginative"], "stimulus": { "type": "none", "stimulusId": null, "instruction": null }, "reflection": { "required": true, "marks": 5, "prompt": "Reflect on how your study of the mentor texts has shaped the composing choices in your response.", "mentorTextExpected": true }, "parts": [ { "id": "p1", "type": "writing", "marks": 15, "rubricId": "rubric-writing", "formOptions": ["imaginative"] }, { "id": "p2", "type": "reflection", "marks": 5, "rubricId": "rubric-reflection", "mentorTextExpected": true } ], "totalMarks": 20 } },
  { "id": "modC-var-15", "stemText": "(a) Using the idea in the stimulus below, compose a piece of discursive writing.\n(b) Explain how your study of the mentor texts has influenced the choices you made in part (a).", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["discursive"], "stimulus": { "type": "written", "stimulusId": "txt-modC-08", "instruction": "Take this idea as a starting point." }, "reflection": { "required": true, "marks": 8, "prompt": "Explain how your study of the mentor texts has influenced the choices you made.", "mentorTextExpected": true }, "parts": [ { "id": "p1", "type": "writing", "marks": 12, "rubricId": "rubric-writing", "formOptions": ["discursive"] }, { "id": "p2", "type": "reflection", "marks": 8, "rubricId": "rubric-reflection", "mentorTextExpected": true } ], "totalMarks": 20 } },
  { "id": "modC-var-16", "stemText": "(a) Use the image below as the stimulus for a piece of imaginative writing.\n(b) Reflect on how your study of the mentor texts informed the composing choices in part (a).", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["imaginative"], "stimulus": { "type": "image", "stimulusId": "img-modC-10", "instruction": "Use the image as the stimulus. Take an idea from it, do not merely describe it." }, "reflection": { "required": true, "marks": 10, "prompt": "Reflect on how your study of the mentor texts informed the composing choices in your response.", "mentorTextExpected": true }, "parts": [ { "id": "p1", "type": "writing", "marks": 10, "rubricId": "rubric-writing", "formOptions": ["imaginative"] }, { "id": "p2", "type": "reflection", "marks": 10, "rubricId": "rubric-reflection", "mentorTextExpected": true } ], "totalMarks": 20 } },
  { "id": "modC-var-17", "stemText": "(a) Using the line in the stimulus below, compose a piece of imaginative OR discursive writing.\n(b) Reflect on how your study of the mentor texts shaped the choices you made in part (a).", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["imaginative", "discursive"], "stimulus": { "type": "written", "stimulusId": "txt-modC-07", "instruction": "Begin your piece with this line." }, "reflection": { "required": true, "marks": 5, "prompt": "Reflect on how your study of the mentor texts shaped the choices you made.", "mentorTextExpected": true }, "parts": [ { "id": "p1", "type": "writing", "marks": 15, "rubricId": "rubric-writing", "formOptions": ["imaginative", "discursive"] }, { "id": "p2", "type": "reflection", "marks": 5, "rubricId": "rubric-reflection", "mentorTextExpected": true } ], "totalMarks": 20 } },
  { "id": "modC-var-18", "stemText": "(a) Compose a piece of persuasive writing on a matter you care about.\n(b) Explain how the mentor texts you studied influenced the way you crafted part (a).", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["persuasive"], "stimulus": { "type": "none", "stimulusId": null, "instruction": null }, "reflection": { "required": true, "marks": 6, "prompt": "Explain how the mentor texts you studied influenced the way you crafted your response.", "mentorTextExpected": true }, "parts": [ { "id": "p1", "type": "writing", "marks": 14, "rubricId": "rubric-writing", "formOptions": ["persuasive"] }, { "id": "p2", "type": "reflection", "marks": 6, "rubricId": "rubric-reflection", "mentorTextExpected": true } ], "totalMarks": 20 } },
  { "id": "modC-var-19", "stemText": "Use the image below as the stimulus for a piece of imaginative OR discursive writing that explores scale and the individual.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["imaginative", "discursive"], "stimulus": { "type": "image", "stimulusId": "img-modC-06", "instruction": "Use the image as the stimulus. Take an idea from it, do not merely describe it." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["imaginative", "discursive"] } ], "totalMarks": 20 } },
  { "id": "modC-var-20", "stemText": "Choose ONE of the two stimuli below and use it as the starting point for a piece of discursive writing.", "isAuthenticPastQuestion": false, "shape": { "formOptions": ["discursive"], "stimulus": { "type": "choice", "allowedStimulusIds": ["txt-modC-09", "txt-modC-10"], "instruction": "Choose one of the two stimuli and develop an idea from it." }, "reflection": { "required": false, "marks": 0, "prompt": null, "mentorTextExpected": false }, "parts": [ { "id": "p1", "type": "writing", "marks": 20, "rubricId": "rubric-writing", "formOptions": ["discursive"] } ], "totalMarks": 20 } }
]
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected: `moduleCQuestions.json OK` then `All Module C data files pass validation.`

- [ ] **Step 5: Commit**

```bash
cd "hsc-short-answer" && git add scripts/validate-module-c-data.js data/moduleCQuestions.json && git commit -m "data: add moduleCQuestions.json (7 authentic 2019-2025 + 20 teacher-authored, Amendment B rubric rewiring applied)"
```

---

### Task 8: Final end-to-end check

**Files:** none new — this confirms Tasks 1–7 compose correctly.

- [ ] **Step 1: Run the full validator one more time**

Run: `node hsc-short-answer/scripts/validate-module-c-data.js`
Expected output, in order:
```
Module C data validation starting...
moduleCRubrics.json OK
moduleCSyllabus.json OK
moduleCMentorTexts.json OK
moduleCStimulus.json OK
moduleCCustomStems.json OK
moduleCQuestions.json OK

All Module C data files pass validation.
```

- [ ] **Step 2: Confirm all 6 data files and the validator are committed**

Run: `git -C "hsc-short-answer" status --short`
Expected: empty output (clean tree) — everything from Tasks 1–7 is already committed.

- [ ] **Step 3: Note what's still outstanding for Adam**

No code change here — just a confirmation. Two things remain outside this plan's scope, both already flagged in the data with `assetSupplied: false`:
- `modC-2021`'s image stimulus needs `/images/module-c/auth-2021.jpg` supplied, then `assetSupplied` flipped to `true`.
- `modC-2025`'s image stimulus needs `/images/module-c/auth-2025.jpg` supplied, then `assetSupplied` flipped to `true`.

These two entries are excluded from the live serving pool until then — that exclusion logic is a **runtime** behavior implemented in Plan 2's controller (`load()`/selection function), not something this data-layer plan builds.

---

## What's Next

This plan delivers the complete, validated data layer. **Plan 2** (not yet written) covers the bespoke Module C controller: tab wiring in `hsc-short-answer.html`, the `CONFIG.moduleC` / `CONTENT.moduleC` blocks (including the checklist templates, `stimulusChecklistBranches`, rubric translation dictionary, margin-protocol-by-form config, and drill definitions — none of which are fetched JSON files, they live as JS constants alongside the controller per the existing Module A/B pattern), the FRAME stepper, the per-part screen flow, dynamic slider-count resolution, the craft-chain margin protocol, "Make your own" mode, and pool preview. Plan 2 should be written once this data lands, so the controller is built against real files rather than speculative shapes — and verified via the Claude Preview browser tools (start the dev server, walk each screen state, screenshot key states) rather than an automated UI test suite, since the sibling Module A/B controllers have no automated UI tests either and this codebase has no DOM-testing framework.
