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
