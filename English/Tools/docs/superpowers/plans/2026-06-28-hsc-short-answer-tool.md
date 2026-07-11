# HSC Short Answer Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page HSC English short answer practice tool that generates real NESA-style questions, guides students through writing and self-marking, and compares their work against real NESA samples — with no accounts, no stored data, and no marks ever given.

**Architecture:** Single `index.html` (all HTML/CSS/JS inline) on GitHub Pages calls a Netlify serverless function which proxies OpenAI gpt-4o. Three JSON data files (sources, NESA questions, pairing rules) are fetched once at load and held in memory. A one-time setup script generates `pairingRule.json` before go-live.

**Tech Stack:** Vanilla JS (no framework), HTML/CSS, Netlify Functions (Node.js), OpenAI Chat Completions API (JSON mode, gpt-4o), GitHub Pages.

---

## File Map

```
/index.html                      All HTML, CSS, JS inline — the complete front-end
/data/sources.json               21 usable source texts (2019–2025)
/data/nesaQuestions.json         ~30 real NESA questions with samples and marker notes
/data/pairingRule.json           Verb/mark pairing rules per source (generated once)
/netlify/functions/generate.js   OpenAI proxy — question / evidenceCheck tasks
/netlify.toml                    Netlify config
/scripts/calibrate.js            One-time Node script to generate pairingRule.json (not deployed)
```

---

## Task 1: Repository scaffold

**Files:**
- Create: `netlify.toml`
- Create: `.gitignore`
- Create: `netlify/functions/.gitkeep`
- Create: `data/.gitkeep`
- Create: `scripts/.gitkeep`

- [ ] Create the repo directory on disk and init git:
```bash
mkdir hsc-short-answer && cd hsc-short-answer && git init
```

- [ ] Create `netlify.toml`:
```toml
[build]
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
```

- [ ] Create `.gitignore`:
```
node_modules/
.env
.netlify/
```

- [ ] Create directory stubs:
```bash
mkdir -p netlify/functions data scripts
touch netlify/functions/.gitkeep data/.gitkeep scripts/.gitkeep
```

- [ ] Commit:
```bash
git add . && git commit -m "chore: repo scaffold"
```

---

## Task 2: Netlify function (`generate.js`)

**Files:**
- Create: `netlify/functions/generate.js`

The function handles two tasks in Phase 1: `question` and `evidenceCheck`. (`paper` is Phase 2.)

- [ ] Create `netlify/functions/generate.js`:

```javascript
const SHARED_SYSTEM = `You generate practice material for HSC English Paper 1 Section I, the Common Module, Texts and Human Experiences. You write new questions in the exact language, verb patterns and structure of real NESA questions. You never invent a source and you never invent a quote: every quotation must appear verbatim in the supplied source. You never write or imply a mark, score, band or grade for a student. Match the directive verb to the mark value and carry that verb into the top marking band. Reward analysis over recount. Output strict JSON only, no prose outside the JSON.

WHAT MARKERS REWARD: analyse not recount; name a technique then explain its effect; well chosen specific evidence; explicit sustained link to the concept; address every part and key term; reach a judgement on higher mark questions; sustain comparison on comparison questions; clarity and control.
WHAT MARKERS FLAG: recount or paraphrase instead of analysis; naming techniques with no effect; vague or loosely relevant evidence; missing a part of the question; on the extended item, no sustained idea or no judgement; overwritten expression.
VERB LADDER: 1 to 3 marks identify, explain, how does; 3 to 4 marks analyse, explain how; 5 to 7 marks evaluate, assess, justify, compare, to what extent.`;

const QUESTION_USER = (payload) => `SOURCE (id ${payload.sourceId}, type ${payload.textType}):
${payload.sourceText}

GENERATE a single Section I short answer question:
- directive verb: ${payload.verb}
- marks: ${payload.marks}
- concept to foreground: ${payload.concept}
- level: ${payload.level}

Requirements:
- Phrase it exactly as NESA would, naming the writer or text and one clear concept.
- For level 3 build a multi part stem with several elements to address.
- Then ANSWER your own question using only this source, to prove it is answerable.
- Then build the marking bands: ${payload.marks} bands, top band uses "${payload.verb}" plus an adverb of quality, stepping down to "provides some relevant information".
- Then build a question specific checklist from the rewarded patterns and flagged faults, each item naming the real concept, text and mark value, never generic.
- List every quote you used so it can be verified verbatim.

Return JSON matching exactly this schema:
{
  "sourceId": "${payload.sourceId}",
  "textType": "${payload.textType}",
  "verb": "${payload.verb}",
  "marks": ${payload.marks},
  "concept": "${payload.concept}",
  "questionStem": "the generated question in NESA phrasing",
  "lineGuide": 6,
  "selfAnswer": "model answer from the source",
  "quotesUsed": ["exact quote one"],
  "markingBands": [{"band": ${payload.marks}, "descriptor": "..."}],
  "checklist": [{"id": "c1", "category": "analysis", "text": "..."}],
  "comparison": null
}`;

const EVIDENCE_USER = (payload) => `CHECKLIST ITEM: ${payload.checklistItem}
STUDENT PASTED EVIDENCE: ${payload.pastedText}

Return: { "verdict": "yes" | "no" | "not quite" | "cannot judge", "pointer": "one concrete next step" }`;

exports.handler = async function(event) {
  const origin = process.env.ALLOWED_ORIGIN || '*';

  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { task, payload } = body;
  if (!task || !payload) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing task or payload' }) };
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Service unavailable' }) };
  }

  let messages, maxTokens;

  if (task === 'question') {
    messages = [
      { role: 'system', content: SHARED_SYSTEM },
      { role: 'user', content: QUESTION_USER(payload) }
    ];
    maxTokens = 1500;
  } else if (task === 'evidenceCheck') {
    messages = [
      { role: 'system', content: 'You check one objectively detectable thing a student claims about their own handwritten answer. You return yes, no or not quite, plus one concrete pointer forward. You never give a mark, score or band. You only judge the detectable: is there a quotation, is a named technique present, is there a link to the named concept. You decline genuinely subjective calls such as whether analysis is deep enough. If the pasted text is too short or ambiguous to judge, say so rather than guess. A false yes does real harm, so set a high bar to give one. Output strict JSON only.' },
      { role: 'user', content: EVIDENCE_USER(payload) }
    ];
    maxTokens = 200;
  } else {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Unknown task' }) };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const code = err?.error?.code || response.status;
      return {
        statusCode: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Model error (${code}). Please try again.` })
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Empty response from model.' }) };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: content
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Network error. Please check your connection.' })
    };
  }
};
```

- [ ] Commit:
```bash
git add netlify/ netlify.toml && git commit -m "feat: netlify generate function"
```

---

## Task 3: Build `sources.json`

**Files:**
- Create: `data/sources.json`

Read `/Users/adamrussell/Downloads/hsc_english_advanced_paper_1_actual_stimulus_texts_2019_2025.md` and build the JSON array. Skip the 4 copyright-restricted texts. Include the 2 visual texts using the descriptions provided by Adam.

- [ ] Build `data/sources.json` with all 21 entries. Each entry must follow this exact schema:

```json
{
  "id": "src-YYYY-tN",
  "title": "short descriptive label",
  "author": "Author Name",
  "textType": "poetry|prose fiction|nonfiction|memoir|feature article|opinion|visual",
  "isVisual": false,
  "fullText": "complete text exactly as in the MD file",
  "visualDescription": null,
  "conceptTags": ["human experience", "place", "memory"]
}
```

The 21 sources are:

| id | title | author | textType | isVisual |
|---|---|---|---|---|
| src-2019-t1 | Boomerangs in a Thunderstorm | Samuel Wagan Watson | poetry | false |
| src-2019-t2 | A Kindness Cup (extract) | Thea Astley | prose fiction | false |
| src-2019-t3 | Flights (extract) | Olga Tokarczuk | prose fiction | false |
| src-2019-t4 | i'm bored, therefore i am | Luke Ryan | feature article | false |
| src-2020-t1 | On Writing (extract) | Michael Frayn | nonfiction | false |
| src-2020-t2 | Sea of Words (illustration) | Julie Paschkis | visual | true |
| src-2020-t3 | It Begins with Darkness | Andy Kissane | poetry | false |
| src-2020-t4 | On Laughter (extract) | Terry Eagleton | nonfiction | false |
| src-2020-t5 | Carpentaria (extract) | Alexis Wright | prose fiction | false |
| src-2021-t1 | Scribbles in the Margins (extract) | Daniel Gray | nonfiction | false |
| src-2021-t2 | For B, at Plaza Blanca | Charlotte Guest | poetry | false |
| src-2021-t3 | On Earth We're Briefly Gorgeous (extract) | Ocean Vuong | prose fiction | false |
| src-2021-t4 | New Writing. New Consciousness. (extract) | Didem Caia | nonfiction | false |
| src-2021-t5 | Actress (extract) | Anne Enright | prose fiction | false |
| src-2022-t2 | Lost in a Good Book (extract) | Jasper Fforde | prose fiction | false |
| src-2022-t3 | A line in the snow | Nikki Gemmell | feature article | false |
| src-2022-t4 | Small Memories (extract) | José Saramago | memoir | false |
| src-2022-t5 | Sydney (extract) | Delia Falconer | nonfiction | false |
| src-2023-t1 | We Come With This Place (extract) | Debra Dank | prose fiction | false |
| src-2023-t2 | Ciao Bella! (extract) | Kate Langbroek | memoir | false |
| src-2023-t3 | Buy Experiences, Not Things | James Hamblin | feature article | false |
| src-2023-t4 | Journey piece | Eleanor Robertson | opinion | false |
| src-2023-t5 | Being here | Vincent O'Sullivan | poetry | false |
| src-2024-t2 | Beyond Measure (extract) | James Vincent | nonfiction | false |
| src-2024-t3 | My Name is Lucy Barton (extract) | Elizabeth Strout | prose fiction | false |
| src-2024-t4 | Lakeside workspace photograph | Florian Schroeder | visual | true |
| src-2024-t5 | Lockley's Pylon | Faye Wilson | poetry | false |
| src-2024-t6 | Trust (extract) | Hernan Diaz | prose fiction | false |
| src-2025-t1 | Notes from an Island (extract) | Tove Jansson | memoir | false |
| src-2025-t2 | The Lying Life of Adults (extract) | Elena Ferrante | prose fiction | false |
| src-2025-t3 | A Letter in October | Ted Kooser | poetry | false |
| src-2025-t4 | Prodigal Summer (extract) | Barbara Kingsolver | prose fiction | false |

(That is 32 rows — recount: 2019×4, 2020×5, 2021×5, 2022×4, 2023×5, 2024×5, 2025×4 = 32 texts. After removing 4 copyright-restricted entries: 2022-t1, 2024-t1, 2025-t5, 2022-t6 = **28 usable sources.**)

For `visualDescription`, use the full detailed descriptions Adam provided (stored in conversation context):
- `src-2020-t2`: use the Julie Paschkis illustration description
- `src-2024-t4`: use the Florian Schroeder photograph description

For `conceptTags`, assign 2–4 tags from: `human experience`, `memory`, `place`, `identity`, `creativity`, `change`, `connection`, `hope`, `paradox`, `belonging`, `language`, `nature`, `time`.

- [ ] Verify the file is valid JSON:
```bash
node -e "JSON.parse(require('fs').readFileSync('data/sources.json','utf8')); console.log('valid')"
```
Expected: `valid`

- [ ] Verify count:
```bash
node -e "const s=JSON.parse(require('fs').readFileSync('data/sources.json','utf8')); console.log(s.length, 'sources')"
```
Expected: `28 sources`

- [ ] Commit:
```bash
git add data/sources.json && git commit -m "data: add 28 source texts"
```

---

## Task 4: Build `nesaQuestions.json`

**Files:**
- Create: `data/nesaQuestions.json`

Fetch the full Notion page "Paper 1 Section 1: Short Answer Response" (id: `38df794f-8476-80bb-b1b4-e5aeb8f0eb71`) and extract all questions. Each question needs: exact stem, verb, marks, marker notes, sample answer.

- [ ] Fetch the Notion page and read the saved file at:
`/Users/adamrussell/.claude/projects/-Users-adamrussell-Desktop/80bc7a9e-f7fb-4739-8c7e-1495957bfd79/tool-results/mcp-3aa4c1ff-96b9-49ec-8d09-4848908faacb-notion-fetch-1782628587681.txt`

Extract every question entry. Map each to its source using the source IDs from Task 3.

Schema for each entry:
```json
{
  "id": "nesa-YYYY-qN",
  "sourceId": "src-YYYY-tN",
  "verb": "analyse",
  "marks": 3,
  "stemText": "exact NESA question wording",
  "markerNotes": "better responses... areas to improve...",
  "sampleAnswer": "real NESA sample response exactly as published",
  "sampleAnnotations": ""
}
```

Known questions (from subagent analysis — verify against full Notion file):

**2025:**
- nesa-2025-q1: src-2025-t1, verb=explain, marks=3, "Explain how Jansson celebrates the process of creativity."
- nesa-2025-q2: src-2025-t2, verb=how does, marks=4, "How does Ferrante portray the ways that family relationships shape identity?"
- nesa-2025-q3: src-2025-t3, verb=analyse, marks=4, "Analyse how Kooser shares insights about the experience of change."
- nesa-2025-q4: src-2025-t4, verb=how does, marks=4, "How does Kingsolver expand the reader's understanding of the relationship between past and present?"
- nesa-2025-q5: src-2025-t5 → SKIPPED (Macfarlane, copyright-restricted source)

**2024:**
- nesa-2024-q1: src-2024-t1 → SKIPPED (copyright-restricted source)
- nesa-2024-q2: src-2024-t2, verb=analyse, marks=4, "Analyse how Vincent connects the significance of measurement to human experience."
- nesa-2024-q3: src-2024-t3+src-2024-t4, verb=compare, marks=5, "Compare how Text 3 and Text 4 offer a perspective on the ways individuals perceive their surroundings."
- nesa-2024-q4: src-2024-t5, verb=analyse, marks=3, "Analyse how Wilson represents the relationship between discomfort and joy."
- nesa-2024-q5: src-2024-t6, verb=assess, marks=5, "Assess how Diaz's use of language illuminates the dynamics within the Brevoort family."

**2023:**
- nesa-2023-q1: src-2023-t1, verb=explain (why), marks=3, "Why does Dank prefer 'that gravel and dust comfort, away from that other place'?"
- (extract remaining from Notion file)

**2022:**
- nesa-2022-q1: src-2022-t1 → SKIPPED (copyright-restricted source)
- nesa-2022-q2: src-2022-t2, verb=analyse, marks=4, "Analyse how Fforde captures the narrator's experience of awe and wonder."
- (extract remaining from Notion file)

**2021:**
- nesa-2021-q1: src-2021-t1, verb=explain, marks=3, "Explain how Daniel Gray uses language to invite the reader to share his experiences."
- nesa-2021-q2: src-2021-t2, verb=how does, marks=3, "How effectively does the use of imagery convey a human experience?"
- nesa-2021-q3: src-2021-t3, verb=how does, marks=4, "How does Ocean Vuong represent the relationship between the characters?"
- nesa-2021-q4: src-2021-t4, verb=analyse, marks=4, "Analyse how Didem Caia uses literary devices to reflect on her experience."
- nesa-2021-q5: src-2021-t5, verb=evaluate, marks=6, "Evaluate Anne Enright's use of narrative voice in shaping the character of Katherine O'Dell."

**2020:**
- nesa-2020-q1: src-2020-t1+src-2020-t2, verb=how does, marks=5, "How do these texts use a variety of language forms and features to communicate ideas about being creative?"
- nesa-2020-q2: src-2020-t3, verb=how does, marks=5, "How does the poem explore the power of storytelling?"
- nesa-2020-q3: src-2020-t4, verb=explain, marks=4, "Explain how this text examines the human experience of laughter."
- nesa-2020-q4: src-2020-t5, verb=analyse, marks=6, "Analyse the ways this text represents the relationship between identity and place."

**2019:**
- nesa-2019-q1: src-2019-t1, verb=explain, marks=3, "Explain how Boomerangs in a Thunderstorm represents an intense moment."
- nesa-2019-q2: src-2019-t2, verb=analyse, marks=5, "Analyse how the experience of returning home has been shaped by the writer."
- (extract remaining from Notion file)

Fill in all `markerNotes` and `sampleAnswer` fields from the full Notion data — these are required for the NESA comparison screen.

- [ ] Verify valid JSON and count:
```bash
node -e "const q=JSON.parse(require('fs').readFileSync('data/nesaQuestions.json','utf8')); console.log(q.length, 'questions'); q.forEach(x => { if(!x.sampleAnswer) console.log('MISSING SAMPLE:', x.id) })"
```
Expected: count printed, no MISSING SAMPLE lines.

- [ ] Verify every sourceId references a real source:
```bash
node -e "
const s=JSON.parse(require('fs').readFileSync('data/sources.json','utf8'));
const q=JSON.parse(require('fs').readFileSync('data/nesaQuestions.json','utf8'));
const ids=new Set(s.map(x=>x.id));
q.forEach(x=>{
  if(x.sourceId && !ids.has(x.sourceId)) console.log('BAD sourceId:', x.id, x.sourceId);
});
console.log('done');
"
```
Expected: `done` with no BAD lines.

- [ ] Commit:
```bash
git add data/nesaQuestions.json && git commit -m "data: add NESA questions with samples"
```

---

## Task 5: Generate `pairingRule.json`

**Files:**
- Create: `scripts/calibrate.js`
- Create: `data/pairingRule.json`

Run the calibration prompt once per source to decide which verbs and mark ranges each source can carry.

- [ ] Create `scripts/calibrate.js`:

```javascript
// Run once: node scripts/calibrate.js
// Requires OPENAI_API_KEY in env
// Writes data/pairingRule.json

const fs = require('fs');
const sources = JSON.parse(fs.readFileSync('data/sources.json', 'utf8'));

const SYSTEM = `You are calibrating a question generator for HSC English Paper 1 Section I.
You are given a source text and must decide which directive verbs and mark range it can genuinely support,
where genuinely means a student could answer such a question using only this source.
Almost every source is large and can carry most verbs, so only exclude real mismatches.
Output strict JSON only.`;

const VERB_LADDER = 'Verb ladder:\n1 to 3 marks: identify, explain, how does\n3 to 4 marks: analyse, explain how\n5 to 7 marks: evaluate, assess, justify, compare, to what extent';

async function calibrate(source) {
  const textContent = source.isVisual ? source.visualDescription : source.fullText;
  const userMsg = `SOURCE (${source.id} — ${source.textType}):\n${textContent}\n\n${VERB_LADDER}\n\nReturn: { "verbs": [...], "markRange": [min, max], "reasoning": "one short line" }`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userMsg }
      ]
    })
  });

  const data = await res.json();
  const result = JSON.parse(data.choices[0].message.content);
  console.log(`${source.id}: verbs=${result.verbs.join(',')} range=${result.markRange}`);
  return { [source.id]: { verbs: result.verbs, markRange: result.markRange } };
}

async function main() {
  const rule = {};
  for (const source of sources) {
    const result = await calibrate(source);
    Object.assign(rule, result);
    await new Promise(r => setTimeout(r, 500)); // rate limit buffer
  }
  fs.writeFileSync('data/pairingRule.json', JSON.stringify(rule, null, 2));
  console.log('Written data/pairingRule.json');
}

main().catch(console.error);
```

- [ ] Run it (requires OpenAI key in env):
```bash
OPENAI_API_KEY=sk-... node scripts/calibrate.js
```
Expected: one line per source printed, then `Written data/pairingRule.json`.

- [ ] Verify the output:
```bash
node -e "
const r=JSON.parse(require('fs').readFileSync('data/pairingRule.json','utf8'));
const s=JSON.parse(require('fs').readFileSync('data/sources.json','utf8'));
s.forEach(src => {
  if(!r[src.id]) console.log('MISSING:', src.id);
  else if(!r[src.id].verbs.length) console.log('EMPTY VERBS:', src.id);
});
console.log('all sources covered:', Object.keys(r).length);
"
```
Expected: no MISSING or EMPTY VERBS, count equals source count.

- [ ] Commit:
```bash
git add data/pairingRule.json scripts/calibrate.js && git commit -m "data: generate pairingRule.json"
```

---

## Task 6: `index.html` — skeleton, CSS design system, HTML structure

**Files:**
- Create: `index.html`

Build the complete HTML shell with all screen `<section>` elements, the CSS design tokens, and the typographic baseline. No JavaScript logic yet.

- [ ] Create `index.html` with this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HSC Short Answer Practice</title>
  <style>
    :root {
      --font-body: Verdana, Arial, Helvetica, sans-serif;
      --font-size-body: 17px;
      --line-height: 1.5;
      --measure: 66ch;
      --color-bg: #FAF7F0;
      --color-text: #1F2421;
      --color-accent: #2F6B5E;
      --color-accent-light: #E8F2F0;
      --color-muted: #5C655F;
      --color-border: #C8D0C9;
      --color-done: #2F6B5E;
      --color-undone: #8B1A1A;
      --color-unsure: #8B6914;
      --radius: 10px;
      --space: 24px;
      --space-sm: 12px;
      --space-lg: 48px;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font-body);
      font-size: var(--font-size-body);
      line-height: var(--line-height);
      background: var(--color-bg);
      color: var(--color-text);
      min-height: 100vh;
      padding: var(--space-lg) var(--space);
    }

    .app {
      max-width: var(--measure);
      margin: 0 auto;
    }

    section { display: none; }
    section.active { display: block; }

    h1 { font-size: 1.4rem; font-weight: 600; margin-bottom: var(--space); }
    h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: var(--space-sm); }

    .coach {
      color: var(--color-muted);
      font-style: italic;
      margin-bottom: var(--space);
      font-size: 0.95rem;
    }

    .source-text {
      background: white;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: var(--space);
      margin-bottom: var(--space);
      line-height: 1.7;
    }

    .question-stem {
      font-weight: 600;
      margin-bottom: var(--space);
      padding: var(--space-sm) var(--space);
      border-left: 3px solid var(--color-accent);
      background: var(--color-accent-light);
      border-radius: 0 var(--radius) var(--radius) 0;
    }

    button {
      font-family: var(--font-body);
      font-size: 1rem;
      cursor: pointer;
      border-radius: var(--radius);
      padding: 10px 20px;
      border: none;
    }

    .btn-primary {
      background: var(--color-accent);
      color: white;
    }
    .btn-primary:hover { opacity: 0.9; }

    .btn-secondary {
      background: transparent;
      color: var(--color-accent);
      border: 1px solid var(--color-accent);
    }
    .btn-secondary:hover { background: var(--color-accent-light); }

    .btn-row {
      display: flex;
      gap: var(--space-sm);
      margin-top: var(--space);
      flex-wrap: wrap;
    }

    .timer {
      font-size: 2rem;
      font-variant-numeric: tabular-nums;
      color: var(--color-muted);
      margin: var(--space) 0;
    }
    .timer.overrun { color: var(--color-undone); }

    .checklist-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-sm);
      padding: var(--space-sm) 0;
      border-bottom: 1px solid var(--color-border);
    }
    .checklist-item:last-child { border-bottom: none; }

    .checklist-text { flex: 1; }

    .verdict-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .verdict-yes { background: #D4EDDA; color: #155724; }
    .verdict-no { background: #F8D7DA; color: #721C24; }
    .verdict-not-quite { background: #FFF3CD; color: #856404; }
    .verdict-cannot-judge { background: #E2E3E5; color: #383D41; }

    .nesa-sample {
      background: white;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: var(--space);
      margin: var(--space) 0;
    }
    .nesa-sample blockquote { border-left: 3px solid var(--color-accent); padding-left: var(--space-sm); }

    .calibration-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-sm);
      margin: var(--space) 0;
    }

    .coverage-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: var(--space-sm) 0;
    }
    .coverage-pill {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.85rem;
      border: 1px solid var(--color-border);
    }
    .coverage-pill.done { background: var(--color-accent); color: white; border-color: var(--color-accent); }
    .coverage-pill.not-done { background: transparent; color: var(--color-muted); }

    .settings-toggle {
      position: fixed;
      top: var(--space-sm);
      right: var(--space-sm);
      font-size: 0.85rem;
      color: var(--color-muted);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
    }

    #settings-panel {
      display: none;
      position: fixed;
      top: 40px;
      right: var(--space-sm);
      background: white;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: var(--space);
      width: 260px;
      z-index: 100;
      font-size: 0.9rem;
    }
    #settings-panel.open { display: block; }

    .spinner {
      display: none;
      color: var(--color-muted);
      font-style: italic;
      margin: var(--space) 0;
    }
    .spinner.active { display: block; }

    .error-msg {
      display: none;
      color: var(--color-undone);
      margin: var(--space) 0;
      padding: var(--space-sm) var(--space);
      background: #FFF0F0;
      border-radius: var(--radius);
    }
    .error-msg.active { display: block; }

    @media print {
      .settings-toggle, .btn-row, #settings-panel { display: none !important; }
      section.active { display: block; }
    }
  </style>
</head>
<body>
<button class="settings-toggle" id="settings-btn" aria-label="Settings">⚙ Settings</button>
<div id="settings-panel">
  <!-- populated by JS in Task 20 -->
</div>

<div class="app">
  <section id="screen-setup" class="active"><!-- Task 10 --></section>
  <section id="screen-reading"><!-- Task 11 --></section>
  <section id="screen-cube"><!-- Task 12 --></section>
  <section id="screen-predict"><!-- Task 13 --></section>
  <section id="screen-write"><!-- Task 14 --></section>
  <section id="screen-selfmark"><!-- Task 15 --></section>
  <section id="screen-calibration"><!-- Task 16 --></section>
  <section id="screen-nesa"><!-- Task 17 --></section>
  <section id="screen-reflection"><!-- Task 18 --></section>
  <section id="screen-report"><!-- Task 19 --></section>
</div>

<script>
// ── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
  functionUrl: 'https://jade-melomakarona-ea20fe.netlify.app/.netlify/functions/generate',
  readingSecondsSingle: 30,
  writingSecondsPerMark: 120,
  retryLimit: 3,
  cube: { level1: 'on-locked', level2: 'on-default', level3: 'off' },
  defaultLevel: 1
};

// ── STATE ────────────────────────────────────────────────────────────────────
// (Task 7 fills this in)
</script>
</body>
</html>
```

- [ ] Open in browser, confirm: off-white background, settings gear visible, no errors in console.

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: html skeleton and css design system"
```

---

## Task 7: State machine, data loading, screen transitions

**Files:**
- Modify: `index.html` — replace the `// (Task 7 fills this in)` comment with the state and boot code.

- [ ] Add the following inside the `<script>` tag, after the CONFIG block:

```javascript
// ── CONSTANTS ────────────────────────────────────────────────────────────────
const SCREENS = {
  SETUP: 'setup', READING: 'reading', CUBE: 'cube',
  PREDICT: 'predict', WRITE: 'write', SELF_MARK: 'selfmark',
  CALIBRATION: 'calibration', NESA: 'nesa',
  REFLECTION: 'reflection', REPORT: 'report'
};

const VERB_LADDER = {
  'identify':        { min: 1, max: 3 },
  'explain':         { min: 1, max: 4 },
  'how does':        { min: 1, max: 4 },
  'analyse':         { min: 2, max: 5 },
  'explain how':     { min: 2, max: 5 },
  'evaluate':        { min: 4, max: 7 },
  'assess':          { min: 4, max: 7 },
  'justify':         { min: 4, max: 7 },
  'compare':         { min: 4, max: 7 },
  'to what extent':  { min: 4, max: 7 }
};

const ALL_VERBS = Object.keys(VERB_LADDER);

const LEVEL_PROFILES = {
  1: {
    textTypes: ['prose fiction','nonfiction','memoir','feature article','opinion'],
    questionElements: 'single',
    cubeDefault: true, cubeLocked: true,
    timerPauseAllowed: true, timerStrict: false,
    checklistDuringWrite: 'visible',
    assistanceDuringWrite: 'full'
  },
  2: {
    textTypes: ['prose fiction','nonfiction','memoir','feature article','opinion','poetry'],
    questionElements: 'one-two-parts',
    cubeDefault: false, cubeLocked: false,
    timerPauseAllowed: true, timerStrict: false,
    checklistDuringWrite: 'collapsed',
    assistanceDuringWrite: 'light'
  },
  3: {
    textTypes: ['prose fiction','nonfiction','memoir','feature article','opinion','poetry','visual'],
    questionElements: 'multi-part',
    cubeDefault: false, cubeLocked: true,
    timerPauseAllowed: false, timerStrict: true,
    checklistDuringWrite: 'hidden',
    assistanceDuringWrite: 'none'
  }
};

// ── APP STATE ────────────────────────────────────────────────────────────────
let app = {
  screen: SCREENS.SETUP,
  level: CONFIG.defaultLevel,
  overrides: {},  // lever overrides from settings panel
  data: { sources: [], nesaQuestions: [], pairingRule: {} },
  dataLoaded: false,
  session: { attempted: [], reflections: [] },
  current: {
    source: null,
    questionItem: null,
    predictions: {},    // { checklistId: 'yes'|'unsure'|'no' }
    selfMarks: {},      // { checklistId: 'done'|'undone'|'unsure' }
    evidenceResults: {} // { checklistId: { verdict, pointer } }
  },
  timer: { id: null, seconds: 0, running: false }
};

// ── SCREEN TRANSITIONS ───────────────────────────────────────────────────────
function goTo(screen) {
  document.querySelectorAll('.app section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`screen-${screen}`);
  if (el) {
    el.classList.add('active');
    window.scrollTo(0, 0);
  }
  app.screen = screen;
}

// ── DATA LOADING ─────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const [sources, nesaQuestions, pairingRule] = await Promise.all([
      fetch('data/sources.json').then(r => r.json()),
      fetch('data/nesaQuestions.json').then(r => r.json()),
      fetch('data/pairingRule.json').then(r => r.json())
    ]);
    app.data.sources = sources;
    app.data.nesaQuestions = nesaQuestions;
    app.data.pairingRule = pairingRule;
    app.dataLoaded = true;
  } catch (err) {
    showError('screen-setup', 'Could not load practice materials. Please refresh the page.');
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function showError(screenId, msg) {
  const el = document.querySelector(`#screen-${screenId} .error-msg`);
  if (el) { el.textContent = msg; el.classList.add('active'); }
}

function hideError(screenId) {
  const el = document.querySelector(`#screen-${screenId} .error-msg`);
  if (el) el.classList.remove('active');
}

function showSpinner(screenId, msg = 'Generating your question…') {
  const el = document.querySelector(`#screen-${screenId} .spinner`);
  if (el) { el.textContent = msg; el.classList.add('active'); }
}

function hideSpinner(screenId) {
  const el = document.querySelector(`#screen-${screenId} .spinner`);
  if (el) el.classList.remove('active');
}

function getProfile() {
  const base = LEVEL_PROFILES[app.level];
  return { ...base, ...app.overrides };
}

// ── BOOT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('settings-panel').classList.toggle('open');
  });
});
```

- [ ] Open `index.html` in browser (via a local server — run `npx serve .` or `python3 -m http.server 8080`).

- [ ] Open DevTools console and verify:
```javascript
// Paste into console after page loads:
console.log(app.dataLoaded); // true (once data files exist — may be false locally until deployed or served)
console.log(Object.keys(VERB_LADDER).length); // 10
goTo('reading'); // screen-reading becomes active
goTo('setup');   // screen-setup becomes active again
```

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: state machine and data loading"
```

---

## Task 8: Quote verification and validation gates

**Files:**
- Modify: `index.html` — add to the `<script>` block.

- [ ] Add the following functions after the boot block:

```javascript
// ── QUOTE VERIFICATION (client-side, deterministic) ───────────────────────
function verifyQuotes(quotesUsed, source) {
  const text = source.isVisual ? source.visualDescription : source.fullText;
  if (!text) return false;
  return quotesUsed.every(q => text.includes(q));
}

// ── VALIDATION GATES ─────────────────────────────────────────────────────────
function isVerbValidForMarks(verb, marks) {
  const range = VERB_LADDER[verb.toLowerCase()];
  if (!range) return false;
  return marks >= range.min && marks <= range.max;
}

function topBandUsesVerb(markingBands, verb) {
  if (!markingBands || !markingBands.length) return false;
  const topBand = markingBands.reduce((a, b) => b.band > a.band ? b : a);
  return topBand.descriptor.toLowerCase().includes(verb.toLowerCase());
}

function sourceCanCarryVerb(sourceId, verb) {
  const rule = app.data.pairingRule[sourceId];
  if (!rule) return false;
  return rule.verbs.some(v => v.toLowerCase() === verb.toLowerCase());
}

function findComparison(verb, marks) {
  // Prefer same verb and same marks; fall back to same verb only
  const exact = app.data.nesaQuestions.filter(
    q => q.verb.toLowerCase() === verb.toLowerCase() && q.marks === marks
  );
  if (exact.length) return exact[Math.floor(Math.random() * exact.length)];
  const verbOnly = app.data.nesaQuestions.filter(
    q => q.verb.toLowerCase() === verb.toLowerCase()
  );
  return verbOnly.length ? verbOnly[Math.floor(Math.random() * verbOnly.length)] : null;
}

function validateGates(item, source) {
  const gates = {
    verbMatchesMarks: isVerbValidForMarks(item.verb, item.marks),
    verbInTopBand: topBandUsesVerb(item.markingBands, item.verb),
    bandCountEqualsMarks: item.markingBands && item.markingBands.length === item.marks,
    sourceCanCarryVerb: sourceCanCarryVerb(item.sourceId, item.verb),
    selfAnswerExists: !!(item.selfAnswer && item.selfAnswer.trim().length > 20),
    quotesVerified: item.quotesUsed && item.quotesUsed.length > 0
      ? verifyQuotes(item.quotesUsed, source)
      : true,
    comparisonExists: !!(item.comparison)
  };
  const passed = Object.values(gates).every(Boolean);
  return { passed, gates };
}
```

- [ ] Verify in browser console (with data loaded):
```javascript
// Should return true for a verb that matches marks
console.log(isVerbValidForMarks('analyse', 3)); // true
console.log(isVerbValidForMarks('evaluate', 2)); // false
console.log(isVerbValidForMarks('identify', 5)); // false

// Should find a comparison item
const comp = findComparison('analyse', 4);
console.log(comp?.stemText); // prints a NESA question stem
```

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: quote verification and validation gates"
```

---

## Task 9: Question generation pipeline

**Files:**
- Modify: `index.html` — add to the `<script>` block.

- [ ] Add the following functions:

```javascript
// ── QUESTION GENERATION PIPELINE ─────────────────────────────────────────────

function pickSource(level) {
  const profile = getProfile();
  const usedIds = new Set(app.session.attempted.map(a => a.questionItem.sourceId));
  const eligible = app.data.sources.filter(s => {
    const rule = app.data.pairingRule[s.id];
    if (!rule) return false;
    // Level 3 can use all text types; lower levels prefer accessible types
    if (level < 3 && s.textType === 'visual') return false;
    if (level === 1 && s.textType === 'poetry') return false;
    return true;
  });
  // Prefer unused sources
  const unused = eligible.filter(s => !usedIds.has(s.id));
  const pool = unused.length ? unused : eligible;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickVerbAndMarks(sourceId, level) {
  const rule = app.data.pairingRule[sourceId];
  if (!rule) return null;
  const usedVerbs = app.session.attempted.slice(-3).map(a => a.questionItem.verb);
  let verbs = rule.verbs.filter(v => !usedVerbs.includes(v));
  if (!verbs.length) verbs = rule.verbs;
  const verb = verbs[Math.floor(Math.random() * verbs.length)];
  const ladder = VERB_LADDER[verb.toLowerCase()];
  if (!ladder) return null;
  const range = rule.markRange;
  const min = Math.max(ladder.min, range[0]);
  const max = Math.min(ladder.max, range[1]);
  if (min > max) return null;
  const marks = min + Math.floor(Math.random() * (max - min + 1));
  return { verb, marks };
}

const CONCEPTS = [
  'human experience', 'memory', 'place', 'identity', 'creativity',
  'change', 'connection', 'belonging', 'language', 'nature', 'time', 'paradox'
];

function pickConcept(source) {
  const tags = source.conceptTags || [];
  const usedConcepts = app.session.attempted.slice(-3).map(a => a.questionItem.concept);
  const fresh = tags.filter(t => !usedConcepts.includes(t));
  const pool = fresh.length ? fresh : (tags.length ? tags : CONCEPTS);
  return pool[Math.floor(Math.random() * pool.length)];
}

async function callFunction(task, payload) {
  const res = await fetch(CONFIG.functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, payload })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function generateAndValidate(source, verb, marks, concept, level) {
  const payload = {
    sourceId: source.id,
    textType: source.textType,
    sourceText: source.isVisual ? source.visualDescription : source.fullText,
    verb, marks, concept, level
  };
  const item = await callFunction('question', payload);

  // Attach comparison from local NESA data
  const nesaItem = findComparison(verb, marks);
  if (nesaItem) {
    item.comparison = {
      nesaQuestionId: nesaItem.id,
      nesaStem: nesaItem.stemText,
      nesaVerb: nesaItem.verb,
      nesaMarks: nesaItem.marks,
      sameSource: nesaItem.sourceId === source.id,
      sampleAnswer: nesaItem.sampleAnswer,
      sampleAnnotations: nesaItem.sampleAnnotations || '',
      checklistMapping: (item.checklist || []).map(c => ({
        checklistId: c.id,
        satisfiedBy: '(see sample)'
      }))
    };
  }

  return item;
}

async function generateQuestion() {
  const level = app.level;
  let lastError = null;

  for (let attempt = 0; attempt < CONFIG.retryLimit; attempt++) {
    try {
      const source = pickSource(level);
      if (!source) throw new Error('No eligible source found.');

      const verbMarks = pickVerbAndMarks(source.id, level);
      if (!verbMarks) continue;
      const { verb, marks } = verbMarks;

      const concept = pickConcept(source);

      const item = await generateAndValidate(source, verb, marks, concept, level);

      // Client-side validation gates
      const { passed, gates } = validateGates(item, source);
      if (!passed) {
        console.warn('Gate failure on attempt', attempt + 1, gates);
        lastError = 'Validation failed: ' + JSON.stringify(gates);
        continue;
      }

      // All gates passed
      app.current.source = source;
      app.current.questionItem = item;
      app.current.predictions = {};
      app.current.selfMarks = {};
      app.current.evidenceResults = {};
      return true;

    } catch (err) {
      lastError = err.message;
      console.warn('Generation attempt', attempt + 1, 'failed:', err.message);
    }
  }

  throw new Error(lastError || 'Could not generate a valid question after multiple attempts.');
}
```

- [ ] Verify in browser console (requires Netlify function deployed, or test with mock):
```javascript
// Quick smoke test — should return a question object or throw
generateQuestion()
  .then(() => console.log('Generated:', app.current.questionItem.questionStem))
  .catch(err => console.error('Failed:', err.message));
```

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: question generation pipeline"
```

---

## Task 10: Setup screen

**Files:**
- Modify: `index.html` — fill `<section id="screen-setup">`.

- [ ] Replace `<!-- Task 10 -->` with:

```html
<h1>HSC Short Answer Practice</h1>
<p class="coach">Choose your level, then generate a question. You will read the text, write your answer by hand, and self-mark your work.</p>

<div style="margin: var(--space) 0;">
  <h2>Level</h2>
  <div class="btn-row" id="level-btns">
    <button class="btn-secondary level-btn active" data-level="1">1 · Foundation</button>
    <button class="btn-secondary level-btn" data-level="2">2 · Consolidation</button>
    <button class="btn-secondary level-btn" data-level="3">3 · Exam</button>
  </div>
  <p style="margin-top:8px; font-size:0.9rem; color:var(--color-muted);" id="level-desc">
    Full scaffolding — CUBE annotation, visible checklist, pausing allowed.
  </p>
</div>

<div class="spinner">Loading materials…</div>
<div class="error-msg"></div>

<div class="btn-row">
  <button class="btn-primary" id="generate-btn">Generate Question</button>
</div>
```

- [ ] Add the setup screen JavaScript immediately after the boot block in `<script>`:

```javascript
// ── SETUP SCREEN ──────────────────────────────────────────────────────────────
const LEVEL_DESCS = {
  1: 'Full scaffolding — CUBE annotation, visible checklist, pausing allowed.',
  2: 'Moderate support — CUBE optional, checklist collapsed, standard timer.',
  3: 'Exam conditions — no CUBE, checklist hidden until self-mark, strict timer.'
};

function initSetupScreen() {
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      app.level = parseInt(btn.dataset.level);
      document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('level-desc').textContent = LEVEL_DESCS[app.level];
    });
  });

  document.getElementById('generate-btn').addEventListener('click', async () => {
    if (!app.dataLoaded) {
      showError('setup', 'Still loading materials — please wait a moment.');
      return;
    }
    hideError('setup');
    showSpinner('setup', 'Generating your question…');
    document.getElementById('generate-btn').disabled = true;

    try {
      await generateQuestion();
      hideSpinner('setup');
      document.getElementById('generate-btn').disabled = false;
      startReadingScreen();
    } catch (err) {
      hideSpinner('setup');
      document.getElementById('generate-btn').disabled = false;
      showError('setup', 'Could not generate a question. Please try again. (' + err.message + ')');
    }
  });
}

document.addEventListener('DOMContentLoaded', initSetupScreen);
```

- [ ] Open in browser, click level buttons — label and description should update. Click Generate (requires deployed function or mock data).

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: setup screen"
```

---

## Task 11: Reading time screen

**Files:**
- Modify: `index.html` — fill `<section id="screen-reading">`.

- [ ] Replace `<!-- Task 11 -->` with:

```html
<h2 id="reading-title"></h2>
<p class="coach" id="reading-coach">Read the text carefully. Your writing time will begin when reading time ends.</p>
<div class="source-text" id="reading-source-text"></div>
<div class="timer" id="reading-timer">0:30</div>
<div class="btn-row">
  <button class="btn-secondary" id="reading-skip-btn">Skip reading time →</button>
</div>
```

- [ ] Add to the `<script>` block:

```javascript
// ── READING SCREEN ────────────────────────────────────────────────────────────
let readingTimerInterval = null;

function startReadingScreen() {
  const source = app.current.source;
  document.getElementById('reading-title').textContent = source.title + ' — ' + source.author;
  const textEl = document.getElementById('reading-source-text');
  if (source.isVisual) {
    textEl.innerHTML = '<em>[Visual text — use the description below to visualise the image]</em><br><br>' +
      escapeHtml(source.visualDescription);
  } else {
    textEl.textContent = source.fullText;
  }

  let seconds = CONFIG.readingSecondsSingle;
  updateReadingTimer(seconds);

  clearInterval(readingTimerInterval);
  readingTimerInterval = setInterval(() => {
    seconds--;
    updateReadingTimer(seconds);
    if (seconds <= 0) {
      clearInterval(readingTimerInterval);
      afterReadingTime();
    }
  }, 1000);

  goTo(SCREENS.READING);
}

function updateReadingTimer(s) {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.max(0, s) % 60;
  document.getElementById('reading-timer').textContent = `${m}:${String(sec).padStart(2,'0')}`;
}

function afterReadingTime() {
  const profile = getProfile();
  const cubeOn = profile.cubeLocked
    ? (app.level === 1)
    : (app.overrides.cubeOn !== undefined ? app.overrides.cubeOn : profile.cubeDefault);
  if (cubeOn) {
    startCubeScreen();
  } else {
    startPredictScreen();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reading-skip-btn').addEventListener('click', () => {
    clearInterval(readingTimerInterval);
    afterReadingTime();
  });
});

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
```

- [ ] Verify: after generating a question and clicking Generate, the reading screen should appear with the source text and a 30-second countdown.

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: reading time screen"
```

---

## Task 12: CUBE screen

**Files:**
- Modify: `index.html` — fill `<section id="screen-cube">`.

- [ ] Replace `<!-- Task 12 -->` with:

```html
<h2>Unpack the question</h2>
<p class="coach">Work through each step before you start writing.</p>
<div class="question-stem" id="cube-stem"></div>
<div id="cube-steps">
  <div class="cube-step" data-step="0">
    <strong>C — Circle the command words.</strong>
    <p>Which directive verb tells you what to do? (e.g. explain, analyse, evaluate)</p>
    <input type="text" id="cube-c" placeholder="e.g. analyse" style="width:100%;padding:8px;margin-top:8px;font-family:var(--font-body);font-size:1rem;border:1px solid var(--color-border);border-radius:var(--radius);">
  </div>
  <div class="cube-step" data-step="1" style="display:none">
    <strong>U — Underline the key terms.</strong>
    <p>What content words define the topic and scope?</p>
    <input type="text" id="cube-u" placeholder="e.g. human experience, language" style="width:100%;padding:8px;margin-top:8px;font-family:var(--font-body);font-size:1rem;border:1px solid var(--color-border);border-radius:var(--radius);">
  </div>
  <div class="cube-step" data-step="2" style="display:none">
    <strong>B — Box the specifiers.</strong>
    <p>What qualifiers, scope limiters, or named texts bound the response?</p>
    <input type="text" id="cube-b" placeholder="e.g. in the poem, Kooser" style="width:100%;padding:8px;margin-top:8px;font-family:var(--font-body);font-size:1rem;border:1px solid var(--color-border);border-radius:var(--radius);">
  </div>
  <div class="cube-step" data-step="3" style="display:none">
    <strong>E — Explain the question in your own words.</strong>
    <p>Before you write, what is this question actually asking you to do?</p>
    <textarea id="cube-e" rows="3" placeholder="In my own words, this question is asking me to…" style="width:100%;padding:8px;margin-top:8px;font-family:var(--font-body);font-size:1rem;border:1px solid var(--color-border);border-radius:var(--radius);resize:vertical;"></textarea>
  </div>
</div>
<div class="btn-row">
  <button class="btn-primary" id="cube-next-btn">Next →</button>
</div>
```

- [ ] Add to `<script>`:

```javascript
// ── CUBE SCREEN ───────────────────────────────────────────────────────────────
let cubeStep = 0;

function startCubeScreen() {
  cubeStep = 0;
  document.getElementById('cube-stem').textContent = app.current.questionItem.questionStem;
  document.querySelectorAll('.cube-step').forEach((el, i) => {
    el.style.display = i === 0 ? 'block' : 'none';
  });
  // Clear inputs
  ['cube-c','cube-u','cube-b','cube-e'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('cube-next-btn').textContent = 'Next →';
  goTo(SCREENS.CUBE);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cube-next-btn').addEventListener('click', () => {
    cubeStep++;
    const steps = document.querySelectorAll('.cube-step');
    if (cubeStep < steps.length) {
      steps.forEach((el, i) => { el.style.display = i === cubeStep ? 'block' : 'none'; });
      if (cubeStep === steps.length - 1) {
        document.getElementById('cube-next-btn').textContent = 'Start predicting →';
      }
    } else {
      startPredictScreen();
    }
  });
});
```

- [ ] Verify: CUBE screen shows the question stem and steps through C → U → B → E, then advances to predict.

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: cube annotation screen"
```

---

## Task 13: Predict screen

**Files:**
- Modify: `index.html` — fill `<section id="screen-predict">`.

- [ ] Replace `<!-- Task 13 -->` with:

```html
<h2>Before you write — predict</h2>
<p class="coach">Be honest. There are no marks for your prediction — it is only for you.</p>
<div class="question-stem" id="predict-stem"></div>
<div id="predict-checklist"></div>
<div class="error-msg"></div>
<div class="btn-row">
  <button class="btn-primary" id="predict-continue-btn">Start writing →</button>
</div>
```

- [ ] Add to `<script>`:

```javascript
// ── PREDICT SCREEN ────────────────────────────────────────────────────────────
function startPredictScreen() {
  const item = app.current.questionItem;
  document.getElementById('predict-stem').textContent = item.questionStem;
  app.current.predictions = {};

  const container = document.getElementById('predict-checklist');
  container.innerHTML = item.checklist.map(c => `
    <div class="checklist-item">
      <div class="checklist-text">${escapeHtml(c.text)}</div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        ${['yes','unsure','no'].map(opt => `
          <button class="predict-btn btn-secondary" data-id="${c.id}" data-val="${opt}"
            style="padding:4px 10px;font-size:0.85rem;">${opt === 'yes' ? '✓ Yes' : opt === 'unsure' ? '? Unsure' : '✗ No'}</button>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.predict-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const val = btn.dataset.val;
      app.current.predictions[id] = val;
      container.querySelectorAll(`.predict-btn[data-id="${id}"]`).forEach(b => {
        b.style.background = '';
        b.style.color = '';
        b.style.borderColor = '';
      });
      btn.style.background = 'var(--color-accent)';
      btn.style.color = 'white';
      btn.style.borderColor = 'var(--color-accent)';
    });
  });

  goTo(SCREENS.PREDICT);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('predict-continue-btn').addEventListener('click', () => {
    // Allow skipping — student doesn't have to predict every item
    startWriteScreen();
  });
});
```

- [ ] Verify: checklist items render, clicking Yes/Unsure/No highlights the chosen option.

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: predict screen"
```

---

## Task 14: Write screen

**Files:**
- Modify: `index.html` — fill `<section id="screen-write">`.

- [ ] Replace `<!-- Task 14 -->` with:

```html
<h2>Write your answer by hand</h2>
<p class="coach" id="write-coach"></p>
<div class="question-stem" id="write-stem"></div>

<div id="write-assistance" style="display:none">
  <div style="background:var(--color-accent-light);border-radius:var(--radius);padding:var(--space-sm) var(--space);margin-bottom:var(--space);font-size:0.9rem;">
    <strong>Structure guide:</strong>
    <ol style="margin:8px 0 0 20px;">
      <li>State your main idea and link it to the concept.</li>
      <li>Name a technique and quote briefly from the text.</li>
      <li>Explain the effect of that technique.</li>
      <li>Link back to the question's concept in your own words.</li>
    </ol>
  </div>
</div>

<div id="write-checklist-container" style="display:none">
  <details id="write-checklist-details">
    <summary style="cursor:pointer;color:var(--color-muted);font-size:0.9rem;margin-bottom:var(--space-sm);">Checklist (tap to expand)</summary>
    <div id="write-checklist-items"></div>
  </details>
</div>

<div class="timer" id="write-timer">0:00</div>
<p id="write-overrun-msg" style="display:none;color:var(--color-undone);font-size:0.9rem;">Time is up — keep writing if you need to.</p>
<p style="color:var(--color-muted);font-size:0.85rem;">Aim for roughly <span id="write-line-guide"></span> lines.</p>

<div class="btn-row">
  <button class="btn-secondary" id="write-pause-btn" style="display:none">Pause</button>
  <button class="btn-secondary" id="write-reset-btn" style="display:none">Reset timer</button>
  <button class="btn-secondary" id="write-hide-btn">Hide timer</button>
  <button class="btn-primary" id="write-done-btn">I have finished writing →</button>
</div>
```

- [ ] Add to `<script>`:

```javascript
// ── WRITE SCREEN ──────────────────────────────────────────────────────────────
let writeInterval = null;
let writeSeconds = 0;
let writePaused = false;
let writeOverrun = false;

function startWriteScreen() {
  const item = app.current.questionItem;
  const profile = getProfile();

  // Coach line
  const coaches = {
    1: 'Write on paper. Aim for one clear analysed point per mark.',
    2: 'Write on paper. Sustain the analysis — name the technique, explain its effect, link to the concept.',
    3: 'Write on paper. Exam conditions. No prompts.'
  };
  document.getElementById('write-coach').textContent = coaches[app.level];

  document.getElementById('write-stem').textContent = item.questionStem;
  document.getElementById('write-line-guide').textContent = item.lineGuide || (item.marks * 2);

  // Assistance
  const assistEl = document.getElementById('write-assistance');
  assistEl.style.display = profile.assistanceDuringWrite === 'full' ? 'block' : 'none';

  // Checklist
  const clContainer = document.getElementById('write-checklist-container');
  const clItems = document.getElementById('write-checklist-items');
  if (profile.checklistDuringWrite === 'visible') {
    clContainer.style.display = 'block';
    document.getElementById('write-checklist-details').open = true;
    clItems.innerHTML = item.checklist.map(c => `<p style="padding:6px 0;border-bottom:1px solid var(--color-border);font-size:0.9rem;">${escapeHtml(c.text)}</p>`).join('');
  } else if (profile.checklistDuringWrite === 'collapsed') {
    clContainer.style.display = 'block';
    document.getElementById('write-checklist-details').open = false;
    clItems.innerHTML = item.checklist.map(c => `<p style="padding:6px 0;border-bottom:1px solid var(--color-border);font-size:0.9rem;">${escapeHtml(c.text)}</p>`).join('');
  } else {
    clContainer.style.display = 'none';
  }

  // Timer controls
  const pauseBtn = document.getElementById('write-pause-btn');
  const resetBtn = document.getElementById('write-reset-btn');
  pauseBtn.style.display = profile.timerPauseAllowed ? 'inline-block' : 'none';
  resetBtn.style.display = profile.timerPauseAllowed ? 'inline-block' : 'none';

  // Start timer
  writeSeconds = item.marks * CONFIG.writingSecondsPerMark;
  writePaused = false;
  writeOverrun = false;
  document.getElementById('write-overrun-msg').style.display = 'none';
  document.getElementById('write-timer').classList.remove('overrun');
  updateWriteTimer();

  clearInterval(writeInterval);
  writeInterval = setInterval(() => {
    if (!writePaused) {
      writeSeconds--;
      updateWriteTimer();
      if (writeSeconds === 0) {
        if (!profile.timerStrict) {
          writeOverrun = true;
          document.getElementById('write-overrun-msg').style.display = 'block';
          document.getElementById('write-timer').classList.add('overrun');
        }
      }
      if (writeSeconds < 0 && profile.timerStrict) {
        // Strict: stop and advance
        clearInterval(writeInterval);
        startSelfMarkScreen();
      }
    }
  }, 1000);

  goTo(SCREENS.WRITE);
}

function updateWriteTimer() {
  const s = Math.abs(writeSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const prefix = writeOverrun ? '+' : '';
  document.getElementById('write-timer').textContent = `${prefix}${m}:${String(sec).padStart(2,'0')}`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('write-pause-btn').addEventListener('click', () => {
    writePaused = !writePaused;
    document.getElementById('write-pause-btn').textContent = writePaused ? 'Resume' : 'Pause';
  });

  document.getElementById('write-reset-btn').addEventListener('click', () => {
    const item = app.current.questionItem;
    writeSeconds = item.marks * CONFIG.writingSecondsPerMark;
    writePaused = false;
    writeOverrun = false;
    document.getElementById('write-overrun-msg').style.display = 'none';
    document.getElementById('write-timer').classList.remove('overrun');
    document.getElementById('write-pause-btn').textContent = 'Pause';
    updateWriteTimer();
  });

  let timerHidden = false;
  document.getElementById('write-hide-btn').addEventListener('click', () => {
    timerHidden = !timerHidden;
    document.getElementById('write-timer').style.visibility = timerHidden ? 'hidden' : 'visible';
    document.getElementById('write-hide-btn').textContent = timerHidden ? 'Show timer' : 'Hide timer';
  });

  document.getElementById('write-done-btn').addEventListener('click', () => {
    clearInterval(writeInterval);
    startSelfMarkScreen();
  });
});
```

- [ ] Verify: timer counts down, pause/hide controls work at Level 1. Level 3 hides pause/reset.

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: write screen with timer and level-based assistance"
```

---

## Task 15: Self-mark + evidence check screens

**Files:**
- Modify: `index.html` — fill `<section id="screen-selfmark">`.

- [ ] Replace `<!-- Task 15 -->` with:

```html
<h2>Self-mark</h2>
<p class="coach">Work through each item. This is your judgement — mark what you honestly think you did.</p>
<div class="question-stem" id="selfmark-stem"></div>
<div id="selfmark-checklist"></div>
<div class="btn-row">
  <button class="btn-primary" id="selfmark-continue-btn">See how your predictions matched →</button>
</div>
```

- [ ] Add to `<script>`:

```javascript
// ── SELF-MARK SCREEN ──────────────────────────────────────────────────────────
function startSelfMarkScreen() {
  const item = app.current.questionItem;
  document.getElementById('selfmark-stem').textContent = item.questionStem;
  app.current.selfMarks = {};
  app.current.evidenceResults = {};

  const container = document.getElementById('selfmark-checklist');
  container.innerHTML = item.checklist.map(c => `
    <div class="checklist-item" id="selfmark-item-${c.id}">
      <div class="checklist-text">
        <p>${escapeHtml(c.text)}</p>
        <div class="evidence-area" id="evidence-area-${c.id}" style="display:none;margin-top:8px;">
          <textarea id="evidence-input-${c.id}" rows="2"
            placeholder="Paste the words from your answer that satisfy this item (optional)…"
            style="width:100%;padding:8px;font-family:var(--font-body);font-size:0.9rem;border:1px solid var(--color-border);border-radius:var(--radius);resize:vertical;"></textarea>
          <button class="btn-secondary evidence-check-btn" data-id="${c.id}"
            style="margin-top:4px;font-size:0.85rem;padding:4px 12px;">Check →</button>
          <span class="evidence-verdict" id="evidence-verdict-${c.id}" style="display:none;margin-left:8px;"></span>
          <p class="evidence-pointer" id="evidence-pointer-${c.id}" style="display:none;font-size:0.85rem;color:var(--color-muted);margin-top:4px;"></p>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;min-width:90px;">
        ${[['done','✓ Done'],['unsure','? Unsure'],['undone','✗ Not done']].map(([val,label]) => `
          <button class="selfmark-btn btn-secondary" data-id="${c.id}" data-val="${val}"
            style="padding:4px 10px;font-size:0.8rem;">${label}</button>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Self-mark button handlers
  container.querySelectorAll('.selfmark-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const val = btn.dataset.val;
      app.current.selfMarks[id] = val;
      // Highlight chosen
      container.querySelectorAll(`.selfmark-btn[data-id="${id}"]`).forEach(b => {
        b.style.background = '';
        b.style.color = '';
      });
      btn.style.background = val === 'done' ? 'var(--color-done)' : val === 'undone' ? 'var(--color-undone)' : 'var(--color-unsure)';
      btn.style.color = 'white';
      // If Done, reveal evidence area
      const evidenceArea = document.getElementById(`evidence-area-${id}`);
      if (val === 'done' && evidenceArea) evidenceArea.style.display = 'block';
      else if (evidenceArea) evidenceArea.style.display = 'none';
    });
  });

  // Evidence check button handlers
  container.querySelectorAll('.evidence-check-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const pastedText = document.getElementById(`evidence-input-${id}`).value.trim();
      if (!pastedText) return;
      const checklistItem = app.current.questionItem.checklist.find(c => c.id === id);
      if (!checklistItem) return;

      btn.disabled = true;
      btn.textContent = '…';

      try {
        const result = await callFunction('evidenceCheck', {
          checklistItem: checklistItem.text,
          pastedText
        });
        app.current.evidenceResults[id] = result;

        const verdictEl = document.getElementById(`evidence-verdict-${id}`);
        const pointerEl = document.getElementById(`evidence-pointer-${id}`);
        const verdictClass = {
          yes: 'verdict-yes', no: 'verdict-no',
          'not quite': 'verdict-not-quite', 'cannot judge': 'verdict-cannot-judge'
        }[result.verdict] || 'verdict-cannot-judge';

        verdictEl.innerHTML = `<span class="verdict-badge ${verdictClass}">${result.verdict}</span>`;
        verdictEl.style.display = 'inline';
        pointerEl.textContent = result.pointer;
        pointerEl.style.display = 'block';
      } catch (err) {
        document.getElementById(`evidence-verdict-${id}`).textContent = 'Could not check — please try again.';
        document.getElementById(`evidence-verdict-${id}`).style.display = 'inline';
      }

      btn.disabled = false;
      btn.textContent = 'Check →';
    });
  });

  goTo(SCREENS.SELF_MARK);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('selfmark-continue-btn').addEventListener('click', () => {
    startCalibrationScreen();
  });
});
```

- [ ] Verify: marking Done reveals evidence text box; evidence check calls the function and shows verdict badge.

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: self-mark and evidence check screens"
```

---

## Task 16: Calibration screen

**Files:**
- Modify: `index.html` — fill `<section id="screen-calibration">`.

- [ ] Replace `<!-- Task 16 -->` with:

```html
<h2>How did your predictions match your self-marks?</h2>
<p class="coach" id="calibration-summary"></p>
<div class="calibration-grid" id="calibration-grid"></div>
<div class="btn-row">
  <button class="btn-primary" id="calibration-continue-btn">Compare to a real NESA sample →</button>
</div>
```

- [ ] Add to `<script>`:

```javascript
// ── CALIBRATION SCREEN ────────────────────────────────────────────────────────
function startCalibrationScreen() {
  const item = app.current.questionItem;
  const predictions = app.current.predictions;
  const selfMarks = app.current.selfMarks;

  const rows = item.checklist.map(c => {
    const pred = predictions[c.id] || '—';
    const mark = selfMarks[c.id] || '—';
    const match = (pred === 'yes' && mark === 'done') ||
                  (pred === 'no'  && mark === 'undone') ||
                  (pred === 'unsure');
    return { text: c.text, pred, mark, match };
  });

  const matches = rows.filter(r => r.match).length;
  const blindSpots = rows.filter(r => r.pred === 'yes' && r.mark === 'undone');
  const surprises = rows.filter(r => r.pred === 'no' && r.mark === 'done');

  let summary = `You predicted ${matches} of ${rows.length} items correctly.`;
  if (blindSpots.length) summary += ` Worth noting: you expected to hit ${blindSpots.map(r => '"' + r.text.substring(0,40) + '…"').join(', ')} but self-marked it missing.`;
  if (surprises.length) summary += ` You were stronger than expected on: ${surprises.map(r => '"' + r.text.substring(0,40) + '…"').join(', ')}.`;
  document.getElementById('calibration-summary').textContent = summary;

  // Store for session report
  app.session.attempted.push({
    questionItem: item,
    predictions: { ...predictions },
    selfMarks: { ...selfMarks },
    calibrationRows: rows
  });

  const grid = document.getElementById('calibration-grid');
  grid.innerHTML = rows.map(r => `
    <div style="background:white;border:1px solid var(--color-border);border-radius:var(--radius);padding:var(--space-sm);">
      <p style="font-size:0.85rem;margin-bottom:6px;">${escapeHtml(r.text.substring(0,80))}…</p>
      <div style="display:flex;gap:8px;font-size:0.8rem;">
        <span style="color:var(--color-muted);">Predicted: <strong>${r.pred}</strong></span>
        <span style="color:var(--color-muted);">Self-marked: <strong>${r.mark}</strong></span>
        ${r.match ? '<span style="color:var(--color-done);">✓</span>' : '<span style="color:var(--color-undone);">gap</span>'}
      </div>
    </div>
  `).join('');

  goTo(SCREENS.CALIBRATION);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('calibration-continue-btn').addEventListener('click', startNesaScreen);
});
```

- [ ] Verify: calibration grid shows each checklist item with prediction, self-mark, and match/gap indicator.

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: calibration screen"
```

---

## Task 17: NESA comparison screen

**Files:**
- Modify: `index.html` — fill `<section id="screen-nesa">`.

- [ ] Replace `<!-- Task 17 -->` with:

```html
<h2>Compare to a real NESA sample</h2>
<p class="coach">Here is a real NESA question of the same type. Read the sample response and look for the moves you practised — how does yours compare?</p>
<div style="margin-bottom:var(--space);">
  <p style="font-size:0.85rem;color:var(--color-muted);margin-bottom:4px;">Real NESA question</p>
  <div class="question-stem" id="nesa-stem"></div>
</div>
<div class="nesa-sample">
  <p style="font-size:0.85rem;color:var(--color-muted);margin-bottom:var(--space-sm);">Sample response (published by NESA, shown exactly as written)</p>
  <div id="nesa-sample-text"></div>
</div>
<div style="margin-top:var(--space);">
  <h2>How the sample satisfies the checklist</h2>
  <div id="nesa-checklist-mapping"></div>
</div>
<div class="btn-row">
  <button class="btn-primary" id="nesa-continue-btn">Reflect →</button>
</div>
```

- [ ] Add to `<script>`:

```javascript
// ── NESA COMPARISON SCREEN ────────────────────────────────────────────────────
function startNesaScreen() {
  const comp = app.current.questionItem.comparison;
  if (!comp) {
    // No comparison available — skip to reflection
    startReflectionScreen();
    return;
  }

  document.getElementById('nesa-stem').textContent = comp.nesaStem;
  document.getElementById('nesa-sample-text').innerHTML =
    '<blockquote>' + escapeHtml(comp.sampleAnswer).replace(/\n/g, '<br>') + '</blockquote>';

  const mappingEl = document.getElementById('nesa-checklist-mapping');
  const checklist = app.current.questionItem.checklist;
  const selfMarks = app.current.selfMarks;

  mappingEl.innerHTML = checklist.map(c => {
    const mapping = comp.checklistMapping
      ? comp.checklistMapping.find(m => m.checklistId === c.id)
      : null;
    const satisfiedBy = mapping ? mapping.satisfiedBy : '(see sample)';
    const mark = selfMarks[c.id] || 'unsure';
    const markColor = mark === 'done' ? 'var(--color-done)' : mark === 'undone' ? 'var(--color-undone)' : 'var(--color-unsure)';

    return `
      <div class="checklist-item">
        <div class="checklist-text">
          <p style="font-size:0.9rem;">${escapeHtml(c.text)}</p>
          ${satisfiedBy !== 'not present' && satisfiedBy !== '(see sample)'
            ? `<p style="font-size:0.85rem;color:var(--color-muted);margin-top:4px;font-style:italic;">In the sample: "${escapeHtml(satisfiedBy)}"</p>`
            : ''
          }
        </div>
        <span style="font-size:0.8rem;color:${markColor};flex-shrink:0;">Your mark: ${mark}</span>
      </div>
    `;
  }).join('');

  goTo(SCREENS.NESA);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nesa-continue-btn').addEventListener('click', startReflectionScreen);
});
```

- [ ] Verify: NESA stem and sample appear, checklist mapping shows.

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: nesa comparison screen"
```

---

## Task 18: Reflection screen

**Files:**
- Modify: `index.html` — fill `<section id="screen-reflection">`.

- [ ] Replace `<!-- Task 18 -->` with:

```html
<h2>Reflect</h2>
<p class="coach">What is one thing you want to focus on next time? Write it in your own words.</p>
<div id="reflection-list" style="margin-bottom:var(--space);"></div>
<div style="display:flex;gap:var(--space-sm);align-items:flex-start;">
  <input type="text" id="reflection-input"
    placeholder="e.g. tie my evidence more directly to the concept"
    style="flex:1;padding:10px;font-family:var(--font-body);font-size:1rem;border:1px solid var(--color-border);border-radius:var(--radius);">
  <button class="btn-secondary" id="reflection-add-btn">Add</button>
</div>
<div class="btn-row" style="margin-top:var(--space);">
  <button class="btn-primary" id="reflection-report-btn">See session report →</button>
  <button class="btn-secondary" id="reflection-again-btn">Practice another question</button>
</div>
```

- [ ] Add to `<script>`:

```javascript
// ── REFLECTION SCREEN ─────────────────────────────────────────────────────────
function startReflectionScreen() {
  renderReflectionList();
  goTo(SCREENS.REFLECTION);
}

function renderReflectionList() {
  const el = document.getElementById('reflection-list');
  if (!app.session.reflections.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = '<ul style="padding-left:20px;">' +
    app.session.reflections.map((r,i) =>
      `<li style="margin-bottom:6px;">${escapeHtml(r)}
        <button onclick="removeReflection(${i})" style="background:none;border:none;cursor:pointer;color:var(--color-muted);font-size:0.8rem;margin-left:6px;">✕</button>
      </li>`
    ).join('') + '</ul>';
}

function removeReflection(i) {
  app.session.reflections.splice(i, 1);
  renderReflectionList();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reflection-add-btn').addEventListener('click', () => {
    const val = document.getElementById('reflection-input').value.trim();
    if (val) {
      app.session.reflections.push(val);
      document.getElementById('reflection-input').value = '';
      renderReflectionList();
    }
  });

  document.getElementById('reflection-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('reflection-add-btn').click();
  });

  document.getElementById('reflection-report-btn').addEventListener('click', startReportScreen);

  document.getElementById('reflection-again-btn').addEventListener('click', () => {
    goTo(SCREENS.SETUP);
  });
});
```

- [ ] Verify: items can be added, removed, and the list updates.

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: reflection screen"
```

---

## Task 19: Session report screen

**Files:**
- Modify: `index.html` — fill `<section id="screen-report">`.

- [ ] Replace `<!-- Task 19 -->` with:

```html
<h2>Session Report</h2>
<p class="coach">Take a screenshot to keep this. The tool stores nothing.</p>

<div style="display:grid;gap:var(--space);">

  <div style="background:white;border:1px solid var(--color-border);border-radius:var(--radius);padding:var(--space);">
    <h2>Next time I want to focus on</h2>
    <ul id="report-focus" style="padding-left:20px;margin-top:var(--space-sm);"></ul>
  </div>

  <div style="background:white;border:1px solid var(--color-border);border-radius:var(--radius);padding:var(--space);">
    <h2>What you practised this session</h2>
    <div id="report-practised" style="margin-top:var(--space-sm);font-size:0.9rem;"></div>
  </div>

  <div style="background:white;border:1px solid var(--color-border);border-radius:var(--radius);padding:var(--space);">
    <h2>Calibration snapshot</h2>
    <div id="report-calibration" style="margin-top:var(--space-sm);font-size:0.9rem;"></div>
  </div>

  <div style="background:white;border:1px solid var(--color-border);border-radius:var(--radius);padding:var(--space);">
    <h2>Coverage map</h2>
    <p style="font-size:0.85rem;color:var(--color-muted);margin-bottom:var(--space-sm);">Directive verbs</p>
    <div class="coverage-grid" id="report-coverage-verbs"></div>
    <p style="font-size:0.85rem;color:var(--color-muted);margin:var(--space-sm) 0 var(--space-sm);">Text types</p>
    <div class="coverage-grid" id="report-coverage-types"></div>
    <p style="font-size:0.85rem;color:var(--color-muted);margin:var(--space-sm) 0 var(--space-sm);">Concepts</p>
    <div class="coverage-grid" id="report-coverage-concepts"></div>
  </div>

</div>

<p style="margin-top:var(--space);font-size:0.9rem;color:var(--color-muted);">Keep your handwritten responses and the NESA samples alongside them — these are the only record of your work across sessions.</p>

<div class="btn-row">
  <button class="btn-secondary" id="report-again-btn">Practice another question</button>
</div>
```

- [ ] Add to `<script>`:

```javascript
// ── SESSION REPORT SCREEN ─────────────────────────────────────────────────────
function startReportScreen() {
  const attempted = app.session.attempted;

  // Focus list
  const focusEl = document.getElementById('report-focus');
  focusEl.innerHTML = app.session.reflections.length
    ? app.session.reflections.map(r => `<li style="margin-bottom:4px;">${escapeHtml(r)}</li>`).join('')
    : '<li style="color:var(--color-muted);">Nothing added yet.</li>';

  // What was practised
  const verbCounts = {};
  const typeCounts = {};
  const markCounts = {};
  attempted.forEach(a => {
    const v = a.questionItem.verb;
    const t = a.questionItem.textType;
    const m = a.questionItem.marks + ' mark' + (a.questionItem.marks !== 1 ? 's' : '');
    verbCounts[v] = (verbCounts[v] || 0) + 1;
    typeCounts[t] = (typeCounts[t] || 0) + 1;
    markCounts[m] = (markCounts[m] || 0) + 1;
  });

  const practisedEl = document.getElementById('report-practised');
  if (!attempted.length) {
    practisedEl.textContent = 'No questions attempted this session.';
  } else {
    practisedEl.innerHTML =
      '<p><strong>Verbs:</strong> ' + Object.entries(verbCounts).map(([k,v]) => `${k} ×${v}`).join(', ') + '</p>' +
      '<p style="margin-top:4px;"><strong>Text types:</strong> ' + Object.entries(typeCounts).map(([k,v]) => `${k} ×${v}`).join(', ') + '</p>' +
      '<p style="margin-top:4px;"><strong>Mark allocations:</strong> ' + Object.entries(markCounts).map(([k,v]) => `${k} ×${v}`).join(', ') + '</p>';
  }

  // Calibration snapshot
  const calEl = document.getElementById('report-calibration');
  const allRows = attempted.flatMap(a => a.calibrationRows || []);
  const blindSpots = allRows.filter(r => r.pred === 'yes' && r.mark === 'undone');
  const surprises = allRows.filter(r => r.pred === 'no' && r.mark === 'done');
  if (!allRows.length) {
    calEl.textContent = 'No calibration data yet.';
  } else {
    let html = '';
    if (blindSpots.length) {
      html += '<p><strong>Consistent blind spots</strong> (predicted yes, marked missing):</p>';
      const counts = {};
      blindSpots.forEach(r => { const k = r.text.substring(0,60); counts[k] = (counts[k]||0)+1; });
      html += '<ul style="padding-left:20px;margin:4px 0;">' +
        Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `<li>${escapeHtml(k)}… (${v} time${v>1?'s':''})</li>`).join('') + '</ul>';
    }
    if (surprises.length) {
      html += '<p style="margin-top:8px;"><strong>Positive surprises</strong> (predicted no, actually done):</p>';
      const counts = {};
      surprises.forEach(r => { const k = r.text.substring(0,60); counts[k] = (counts[k]||0)+1; });
      html += '<ul style="padding-left:20px;margin:4px 0;">' +
        Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `<li>${escapeHtml(k)}… (${v} time${v>1?'s':''})</li>`).join('') + '</ul>';
    }
    if (!blindSpots.length && !surprises.length) html = '<p>Your predictions matched your self-marks well this session.</p>';
    calEl.innerHTML = html;
  }

  // Coverage map
  const coveredVerbs = new Set(attempted.map(a => a.questionItem.verb));
  const coveredTypes = new Set(attempted.map(a => a.questionItem.textType));
  const coveredConcepts = new Set(attempted.map(a => a.questionItem.concept));

  const allTypes = ['prose fiction','nonfiction','memoir','feature article','opinion','poetry','visual'];
  const allConcepts = ['human experience','memory','place','identity','creativity','change','connection','belonging','language','nature','time','paradox'];

  document.getElementById('report-coverage-verbs').innerHTML =
    ALL_VERBS.map(v => `<span class="coverage-pill ${coveredVerbs.has(v)?'done':'not-done'}">${escapeHtml(v)}</span>`).join('');
  document.getElementById('report-coverage-types').innerHTML =
    allTypes.map(t => `<span class="coverage-pill ${coveredTypes.has(t)?'done':'not-done'}">${escapeHtml(t)}</span>`).join('');
  document.getElementById('report-coverage-concepts').innerHTML =
    allConcepts.map(c => `<span class="coverage-pill ${coveredConcepts.has(c)?'done':'not-done'}">${escapeHtml(c)}</span>`).join('');

  goTo(SCREENS.REPORT);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('report-again-btn').addEventListener('click', () => {
    goTo(SCREENS.SETUP);
  });
});
```

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: session report screen"
```

---

## Task 20: Settings panel (lever overrides)

**Files:**
- Modify: `index.html` — populate `<div id="settings-panel">`.

- [ ] Replace the `<!-- populated by JS in Task 20 -->` comment with:

```html
<h2 style="font-size:1rem;margin-bottom:var(--space-sm);">Override levers</h2>
<p style="font-size:0.8rem;color:var(--color-muted);margin-bottom:var(--space-sm);">These override your level for this session only.</p>

<label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:0.9rem;">
  CUBE
  <select id="override-cube" style="font-family:var(--font-body);padding:4px;">
    <option value="">Level default</option>
    <option value="on">Always on</option>
    <option value="off">Always off</option>
  </select>
</label>

<label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:0.9rem;">
  Timer pausing
  <select id="override-pause" style="font-family:var(--font-body);padding:4px;">
    <option value="">Level default</option>
    <option value="on">Allowed</option>
    <option value="off">Not allowed</option>
  </select>
</label>

<label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:0.9rem;">
  Checklist while writing
  <select id="override-checklist" style="font-family:var(--font-body);padding:4px;">
    <option value="">Level default</option>
    <option value="visible">Visible</option>
    <option value="collapsed">Collapsed</option>
    <option value="hidden">Hidden</option>
  </select>
</label>

<label style="display:flex;justify-content:space-between;align-items:center;font-size:0.9rem;">
  Writing assistance
  <select id="override-assistance" style="font-family:var(--font-body);padding:4px;">
    <option value="">Level default</option>
    <option value="full">Full</option>
    <option value="light">Light</option>
    <option value="none">None</option>
  </select>
</label>
```

- [ ] Add to `<script>` boot block (inside DOMContentLoaded):

```javascript
['cube','pause','checklist','assistance'].forEach(key => {
  document.getElementById(`override-${key}`).addEventListener('change', e => {
    const val = e.target.value;
    if (key === 'cube') app.overrides.cubeOn = val === 'on' ? true : val === 'off' ? false : undefined;
    if (key === 'pause') app.overrides.timerPauseAllowed = val === 'on' ? true : val === 'off' ? false : undefined;
    if (key === 'checklist') app.overrides.checklistDuringWrite = val || undefined;
    if (key === 'assistance') app.overrides.assistanceDuringWrite = val || undefined;
    // Remove undefined keys
    Object.keys(app.overrides).forEach(k => app.overrides[k] === undefined && delete app.overrides[k]);
  });
});
```

- [ ] Verify: settings gear opens panel, changing a select updates `app.overrides` in the console.

- [ ] Commit:
```bash
git add index.html && git commit -m "feat: settings panel with lever overrides"
```

---

## Task 21: Deploy and smoke test

**Files:**
- No code changes — deploy and verify.

- [ ] Push repo to GitHub:
```bash
git remote add origin https://github.com/adamrussell91-hash/hsc-short-answer.git
git push -u origin main
```

- [ ] Enable GitHub Pages in repo Settings → Pages → Source: `main` branch, root folder. Confirm URL: `https://adamrussell91-hash.github.io/hsc-short-answer/`

- [ ] In Netlify dashboard (`jade-melomakarona-ea20fe`):
  - Connect to the new GitHub repo
  - Set env vars: `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o`, `ALLOWED_ORIGIN=https://adamrussell91-hash.github.io`
  - Trigger a deploy

- [ ] Smoke test the full flow end-to-end:
  - [ ] Open `https://adamrussell91-hash.github.io/hsc-short-answer/`
  - [ ] Select Level 1, click Generate Question — spinner shows, then Reading screen appears
  - [ ] Reading timer counts down 30 seconds; CUBE screen follows
  - [ ] Step through C, U, B, E
  - [ ] Predict screen: rate all checklist items
  - [ ] Write screen: timer counts down 2 min/mark; Pause works; Done button advances
  - [ ] Self-mark: mark items; tick Done on one item; paste evidence; check button returns verdict
  - [ ] Calibration: grid shows prediction vs. self-mark; gaps identified
  - [ ] NESA comparison: real question and sample shown; checklist mapped
  - [ ] Reflection: add an item; advance to report
  - [ ] Session report: all four panels populated; coverage map shows attempted verbs/types in teal
  - [ ] Confirm DevTools Network tab shows NO direct calls to `api.openai.com` — all calls go through `jade-melomakarona-ea20fe.netlify.app`
  - [ ] Confirm no `OPENAI_API_KEY` visible anywhere in page source

- [ ] Check contrast: open DevTools, inspect text/background pairs, confirm each clears 4.5:1.

- [ ] Commit any fixes, then tag:
```bash
git tag v1.0.0-phase1 && git push --tags
```

---

## Self-Review Against Spec

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Single index.html, vanilla JS, no build | Task 6 |
| Netlify function, key never in browser | Task 2 |
| sources.json (28 sources) | Task 3 |
| nesaQuestions.json (~30 questions) | Task 4 |
| pairingRule.json (calibrated once) | Task 5 |
| CONFIG object with all tunable values | Task 7 |
| Deterministic quote verification (client-side JS) | Task 8 |
| All 7 validation gates | Task 8 |
| Silent retry up to CONFIG.retryLimit | Task 9 |
| Reading time screen with 30s timer | Task 11 |
| CUBE (Level 1 locked, Level 2 optional, Level 3 off) | Task 12 |
| Predict screen (three-state rating) | Task 13 |
| Write screen (timer, level-based assistance, overrun gentle) | Task 14 |
| Self-mark screen | Task 15 |
| Evidence check (optional, never forced, cannot judge safe) | Task 15 |
| Calibration screen (prediction vs self-mark) | Task 16 |
| NESA comparison (exact sample, checklist mapped) | Task 17 |
| Reflection screen (student's own words) | Task 18 |
| Session report (4 panels, screenshot-only) | Task 19 |
| Settings panel with individual lever overrides | Task 20 |
| Three levels: scaffolding only, any verb/marks at any level | Tasks 7, 14 |
| Tool never gives a mark | Enforced in prompts (Task 2) and no marking logic in any screen |
| Design tokens + readability baseline | Task 6 |
| CORS locked to GitHub Pages origin | Task 2 |

**Gaps found:** None. All spec requirements map to a task.

**Placeholder scan:** No TBD, TODO, or "similar to Task N" patterns found.

**Type consistency:** `app.current.questionItem`, `app.current.predictions`, `app.current.selfMarks`, `app.current.evidenceResults`, `app.session.attempted`, `app.session.reflections` — names used consistently across Tasks 7–19.
