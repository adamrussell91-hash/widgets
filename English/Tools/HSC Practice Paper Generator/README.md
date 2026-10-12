# HSC Question Generator

Open `HSC-Practice-Paper-Generator.html` through a static server. All question data and shared CSS use relative paths, including on GitHub Pages. There is no new production dependency or build step.

## Support controls

Each section's existing level supplies support defaults. The checklist explains and controls the supports that controller already provides. Required question scaffolds remain locked. Changing level restores its support defaults, and **Reset to level defaults** clears support overrides without clearing a chosen question-verb filter.

**Show the writing timer** controls clock visibility only; timings continue unchanged. Section I full papers keep their reading clock visible and apply the visibility preference during writing. Full papers otherwise use their existing fixed exam conditions. Module C exposes its existing FRAME setting and clock visibility rather than offering essay-only checklists or planning overrides.

The practice progress line groups the existing screens into setup, question unpacking, planning where applicable, writing and review. All confidence, marking, comparison, syllabus and reflection stages remain in their controllers.

## Tests

```sh
npm install
npx playwright install chromium
npm test
npm run validate:data
```

To use an already installed Chrome executable, set `HSC_CHROME` to its absolute path before `npm test`. Tests serve the real static page and local JSON data on an ephemeral localhost port. They cover all five sections, level locks/reset, paper structure, actual writing-to-review transitions, hidden clocks, full-paper phases, dynamic form recipes, activity accessibility state and responsive overflow.

## Design kit

`design-kit/` is a copy of the canonical shared kit, with its CSS import dependencies. `hsc-practice.css` supplies this widget's layout; `hsc-support.js` supplies the shared checklist and presentation helpers. See `design-kit/README.md` for update provenance.
