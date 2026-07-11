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

function main() {
  console.log('Module C data validation starting...');
  const rubrics = loadJSON('moduleCRubrics.json');
  validateRubrics(rubrics);
  console.log('moduleCRubrics.json OK');
  const syllabus = loadJSON('moduleCSyllabus.json');
  validateSyllabus(syllabus);
  console.log('moduleCSyllabus.json OK');
  const mentorTexts = loadJSON('moduleCMentorTexts.json');
  validateMentorTexts(mentorTexts);
  console.log('moduleCMentorTexts.json OK');
  const stimulus = loadJSON('moduleCStimulus.json');
  validateStimulus(stimulus);
  console.log('moduleCStimulus.json OK');
  const customStems = loadJSON('moduleCCustomStems.json');
  validateCustomStems(customStems);
  console.log('moduleCCustomStems.json OK');
  const questions = loadJSON('moduleCQuestions.json');
  validateQuestions(questions, rubrics, stimulus);
  console.log('moduleCQuestions.json OK');
  console.log('\nAll Module C data files pass validation.');
}

main();
