# HSC generator: clearer support and Teaching Hub presentation

Approved reference: the three-view interactive mockup reviewed in this chat on 12/10/26.

Keep Paper 1 Sections I/II and Paper 2 Modules A/B/C as the primary navigation. Keep all question banks, mark ranges, directive-verb filters, modes, timer durations, mandatory scaffolds, confidence gates, self-marking, syllabus audits, comparison and reports. Do not introduce a difficulty selector or change what a level means.

Show an explicit support checklist beside activity and level choices. A level supplies defaults; changing level restores its support defaults while retaining question-filter selections. Each item has a short explanation and, when helpful, an expandable example. Locked scaffold settings are labelled and cannot be toggled. Only existing section-specific support features are offered. Add timer visibility as a presentation preference; hidden timers continue running. Reset support restores level defaults.

Use the canonical hub-design-kit CSS tokens and component recipes, copied into this static widget with their import dependencies. Use Teaching overlay, Inter, cotton/paper, navy primary actions, Wave focus/selection, token spacing/radii, readable source texts and glass panels. This is a classroom widget; do not add hub rail or sign-in.

Use an always-visible practice progress line: Set up → Read & unpack → Plan (essay/craft sections) → Write → Review & reflect. Retain all actual substeps. Keep one clear primary forward action per current task; place reading readiness next to the scaffold/confidence task. Secondary skip actions remain available under More actions. Replace jargon-heavy support descriptions with task language, without replacing the teaching methods.

Scope: the generator and its own CSS/JS, vendored kit assets, regression tests and docs. No changes to other widgets, kit source, question data, deployment or main branch.

Implementation calls: section-specific checkbox mappings use the existing override values; the checklist-open switch maps unticked to collapsed (or hidden at an existing hidden default). Detailed/light planning stays available as a subordinate choice. Module C exposes FRAME and timer visibility and describes its existing planning/review rather than promising essay-only supports. Timer preferences last within the page session.
