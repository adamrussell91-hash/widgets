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
