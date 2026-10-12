# HSC Support Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the approved support checklist and Teaching Hub design while preserving the generator's educational behavior.

**Architecture:** Keep the existing controllers and data. Add a shared support UI helper with controller-owned adapters, and a presentation sheet using canonical kit tokens/classes. Progress and setup layout are derived from actual controller screens, not a replacement workflow.

**Tech Stack:** Static HTML/CSS, vanilla JavaScript, Node test runner and Playwright.

**Spec:** `docs/superpowers/specs/2026-10-12-hsc-support-design.md`

## Global Constraints
- Keep Paper 1 Sections I/II and Paper 2 Modules A/B/C.
- Keep question pools, level mark ranges, directive-verb rules, timer durations and review requirements unchanged.
- Hidden timer means invisible clock, never stopped timer.
- Load the kit from widget-relative files; work under GitHub Pages subpaths.
- No live deployment or main-branch mutation.

## Review Focus
- Level changes and reset after manual support overrides.
- Locked scaffolds remain locked in the UI and effective controller profile.
- Support preferences survive setup rerenders and never leak between sections.
- Hidden timers continue counting down and forward actions still reach review.
- All five sections, loading errors, small viewports and keyboard use remain coherent.

### Task 1: Controller-owned support checklist
**Files:** generator HTML, `hsc-support.js`, `tests/support.test.cjs`, `package.json`.
**Interfaces:** `HscSupport.mount(container,key,{level,values,set,reset})`; adapter calls existing override/profile functions; `HscSupport.timerHidden(key)` returns a session-local presentation preference.
- [x] Add browser tests for setup checklist, level locks/reset, level question filters, all five section adapters and hidden timers.
- [x] Run `npm test`; observe failures for missing checklist.
- [x] Add helper and mount adapters at each setup rendering point; persist hidden-clock defaults in existing timer initialization; retain question-filter controls.
- [x] Run the browser suite and the existing Module C data validator.

### Task 2: Shared visual language and guided-page hierarchy
**Files:** generator HTML, `hsc-practice.css`, `design-kit/css/*`, tests and vendor provenance README.
**Interfaces:** existing controller navigation calls `HscSupport.progress(key,screen)`; CSS uses copied kit tokens/components; the DOM helper adds kit classes to controller-rendered controls.
- [x] Add assertions for paper navigation, current progress, actual font/token usage, no overflow and primary navigation after a completed writing response.
- [x] Observe failing assertions, then add the kit sheets and page presentation.
- [x] Add two-column setup, labelled support rows/examples, accessible level selection and progress, and collapse secondary skip/explanation controls.
- [x] Run the full HSC suite, data validation, syntax checks and `git diff --check`; inspect real setup/read/write views.
- [x] Request a fresh review and address actionable findings. Commit and PR handoff follow the verified implementation.

## Execution ledger
- Baseline: existing Module C validator passes; no HSC package/test suite existed. Sparse checkout is clean on `codex/hsc-support-redesign`.
- Pre-flight: support adapters own state; presentation must not mutate controller profiles, timers or data selection.
- Ruling: implement inline because the user asked to implement the reviewed mockup. No additional design approval required.

- Task 1 complete: all five support adapters, reset/locks and session-local writing-clock preferences implemented.
- Task 2 complete: canonical kit assets, Teaching presentation, progress and task hierarchy implemented.
- Fresh reviewer findings: stale Section II menus, hidden-clock label, full-paper clock preference and full-paper reading progress. All four reproduced with failing tests, fixed, and covered by the passing suite.
- Additional verification findings: dynamic annotation fields needed kit form styling; activity aria-pressed state needed synchronization. Both reproduced before fixing and covered by tests.
- Final verification: npm test 16/16; existing Module C data validation passes; every inline script and the helper parse; git diff --check passes. Question selection, assembly, exam composition and CONFIG (including timings) remain byte-for-byte unchanged from the base commit.
- No deferred review findings. No question-bank, deployment or main-branch changes.
