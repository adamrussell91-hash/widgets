/* Presentation only. Each existing controller owns its support values. */
(() => {
  'use strict';
  const timerPreferences = new Map();
  const screens = new Map();
  let activeKey = 's1';
  const sectionNames = {
    s1: ['Paper 1 · Section I', 'Short answer practice'],
    s2: ['Paper 1 · Section II', 'Common Module essay'],
    moduleA: ['Paper 2 · Module A', 'Textual Conversations'],
    moduleB: ['Paper 2 · Module B', 'Critical Study'],
    moduleC: ['Paper 2 · Module C', 'Craft of Writing']
  };
  function escape(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
  function progress(key, screen) {
    screens.set(key, screen);
    if (key !== activeKey) return;
    const names = sectionNames[key];
    document.getElementById('hsc-eyebrow').textContent = names[0];
    document.getElementById('hsc-title').textContent = names[1];
    const steps = key === 's1' ? ['Set up','Read & unpack','Write','Review & reflect'] : ['Set up','Read & unpack','Plan','Write','Review & reflect'];
    let index = screen === 'setup' || screen === 'customSetup' ? 0 : /^(reading|exam-reading|question|frame|formChooser|confidence|breaker)$/.test(screen) ? 1 : screen === 'plan' ? 2 : /^(write|exam-writing|drill)$/.test(screen) ? (key === 's1' ? 2 : 3) : steps.length - 1;
    const node = document.getElementById('hsc-progress');
    node.innerHTML = steps.map((label,i) => '<span class="hsc-step' + (i === index ? ' is-current' : i < index ? ' is-done' : '') + '" data-practice-step' + (i === index ? ' aria-current="step"' : '') + '><b>' + (i+1) + '</b>' + label + '</span>').join('');
    document.getElementById('hsc-supporting').textContent = index === 0 ? 'Choose your level, see your support, then start practice.' : index === 1 ? 'Read your question, then work through one task at a time.' : steps[index] === 'Write' ? 'Write on paper, with your question and chosen support in view.' : 'Keep moving through your practice, one step at a time.';
  }
  function activate(key) {
    activeKey = key;
    progress(key, screens.get(key) || 'setup');
  }
  function decorate(container) {
    const matching = selector => [ ...(container.matches?.(selector) ? [container] : []), ...container.querySelectorAll(selector) ];
    matching('.btn-primary,.btn-secondary,.btn-ghost').forEach(el => {
      el.classList.add('btn');
      el.classList.toggle('btn--primary', el.classList.contains('btn-primary'));
      el.classList.toggle('btn--secondary', el.classList.contains('btn-secondary'));
      el.classList.toggle('btn--ghost', el.classList.contains('btn-ghost'));
      if (el.matches('[data-level],[data-mode],[data-modeval]')) el.setAttribute('aria-pressed', String(el.classList.contains('active')));
    });
    matching('select,textarea,input[type="text"],input:not([type])').forEach(el => {
      el.classList.add(el.tagName === 'SELECT' ? 'hub-select' : el.tagName === 'TEXTAREA' ? 'hub-textarea' : 'hub-input');
      // Domain fields retain width/flow, while the kit owns their form chrome.
      ['border','borderRadius','padding','fontFamily','fontSize'].forEach(property => el.style[property] = '');
    });
    container.querySelectorAll('.panel,.report-card,.exam-review-card').forEach(el => el.classList.add('hub-card'));
    container.querySelectorAll('[data-nav="skip"],#s1-nav-skip,#s2-nav-skip').forEach(button => {
      if (button.closest('.hsc-more-actions')) return;
      const details = document.createElement('details'); details.className = 'hsc-more-actions';
      details.innerHTML = '<summary>More actions</summary>';
      button.before(details); details.append(button);
    });
  }
  function layout(container) {
    if (container.querySelector('.hsc-setup-layout')) return;
    const layout = document.createElement('div'); layout.className = 'hsc-setup-layout';
    const options = document.createElement('div'); options.className = 'hub-card hsc-practice-options';
    const title = document.createElement('h2'); title.textContent = 'Your practice'; options.append(title);
    [...container.children].forEach(child => {
      if (child.tagName === 'H1') { child.hidden = true; return; }
      if (child.matches('p.coach')) {
        const about = document.createElement('details'); about.className = 'hsc-about';
        about.innerHTML = '<summary>About this practice</summary>'; about.append(child); options.append(about); return;
      }
      options.append(child);
    });
    layout.append(options); container.append(layout);
  }
  function mount(container, key, adapter) {
    layout(container);
    // Static Section II setup is reused: initSetup recreates its old menus.
    // Remove them on every mount, even when the checklist already exists.
    container.querySelectorAll('[data-key="cast"],[data-key="planning"],[data-key="pacing"],[data-key="checklist"]').forEach(el => el.closest('label').remove());
    container.querySelectorAll('details:has([data-key="verbFamily"]) > summary').forEach(el => el.textContent = 'Question options');
    let card = container.querySelector('[data-support-section]');
    if (card) { card.refresh(); return; }
    card = document.createElement('div'); card.className = 'hub-card hsc-support-card'; card.dataset.supportSection = key;
    container.querySelector('.hsc-setup-layout').append(card);
    const method = key === 's1' ? 'CUBE' : key === 'moduleC' ? 'FRAME' : 'CAST';
    const rows = [
      ['question', 'Help me unpack the question', method + ': work through what the question asks, one prompt at a time.', 'Find the instruction word first. Then identify the ideas and evidence your answer needs.'],
      ...(key === 's1' ? [['assistance','Show a writing structure guide','A short sequence to help connect evidence to your explanation.','Main idea → technique and quotation → effect → link to the question.']] : key !== 'moduleC' ? [['planning','Show planning prompts','Organise your main idea and supporting points before writing.','Start with an answer to the question. Build each paragraph around one point and specific evidence.']] : []),
      ...(key !== 'moduleC' ? [['checklist','Keep my checklist open while writing','Keep the requirements beside the question. Untick to collapse it.','']] : []),
      ['timer','Show the writing timer','Hide or show the clock while writing. The time allowance stays the same.',''],
      ...(key === 's1' ? [['pause','Allow timer pausing','Pause when you need a break, then continue where you left off.','']] : key !== 'moduleC' ? [['pacing','Show pacing reminders','See when it may be time to move to the next part of your essay.','']] : [])
    ];
    card.innerHTML = '<div class="hsc-support-head"><h2>Your support</h2><button type="button" class="hsc-text-action" data-support-reset>Reset to level defaults</button></div>' +
      '<p class="hsc-meta">Tick the help you want. Fixed settings are labelled.</p>' + rows.map(([id,title,description,example]) =>
        '<div class="hsc-support-row"><label><input type="checkbox" class="hub-check" data-support="' + id + '"><span><strong>' + title + '</strong><span class="hsc-lock" data-lock="' + id + '"></span><span class="hsc-hint" data-hint="' + id + '">' + description + '</span></span></label>' +
        (example ? '<details><summary>See an example</summary><div class="hsc-support-example">' + example + '</div></details>' : '') +
        (id === 'planning' ? '<label class="hsc-planning-depth" hidden>Planning detail<select class="hub-select" data-planning-depth><option value="full">Detailed prompts</option><option value="light">Brief prompts</option></select></label>' : '') + '</div>').join('') +
      (key === 'moduleC' ? '<p class="hsc-meta">Planning and the review after writing follow the existing Module C workflow at every level.</p>' : '') +
      '<p class="hsc-support-summary" aria-live="polite"></p>';
    function refresh() {
      const values = adapter.get();
      const levelNames = ['Foundation','Consolidation',key === 's1' ? 'Extension' : 'Exam'];
      const selected = [];
      rows.forEach(([id,title]) => {
        const input = card.querySelector('[data-support="' + id + '"]');
        input.checked = id === 'timer' ? !timerHidden(key) : id === 'planning' ? values.planning !== 'none' : Boolean(values[id]);
        input.disabled = id === 'question' && values.questionLocked;
        card.querySelector('[data-lock="' + id + '"]').textContent = input.disabled ? (input.checked ? 'Required at this level' : 'Off at this level') : '';
        if (input.checked) selected.push(title.toLowerCase());
      });
      const depth = card.querySelector('[data-planning-depth]');
      if (depth) { depth.parentElement.hidden = values.planning === 'none'; depth.value = values.planning === 'full' ? 'full' : 'light'; }
      if (key === 's1') card.querySelector('[data-hint="checklist"]').textContent = values.level === 3 ? 'Normally hidden at Extension; self-review still follows writing.' : 'Keep the requirements beside the question. Untick to collapse it.';
      card.querySelector('.hsc-support-summary').textContent = levelNames[values.level-1] + ' · ' + (selected.length ? selected.join(' · ') : 'No optional support selected');
      container.querySelectorAll('[data-level]').forEach(el => el.setAttribute('aria-pressed', String(Number(el.dataset.level) === values.level)));
      decorate(container);
    }
    card.refresh = refresh;
    card.querySelectorAll('[data-support]').forEach(input => input.addEventListener('change', () => {
      const field = input.dataset.support;
      if (field === 'timer') timerPreferences.set(key, !input.checked);
      else adapter.set(field, input.checked);
      refresh();
    }));
    card.querySelector('[data-planning-depth]')?.addEventListener('change', e => { adapter.set('planningDepth', e.target.value); refresh(); });
    card.querySelector('[data-support-reset]').addEventListener('click', () => { adapter.reset(); timerPreferences.delete(key); refresh(); });
    // Old advanced menus retain question filters; support choices now live here.
    container.querySelectorAll('[data-key="cast"],[data-key="planning"],[data-key="pacing"],[data-key="checklist"]').forEach(el => el.closest('label').remove());
    container.querySelectorAll('details:has([data-key="verbFamily"]) > summary').forEach(el => el.textContent = 'Question options');
    refresh(); progress(key, 'setup');
  }
  function timerHidden(key) { return timerPreferences.get(key) === true; }
  function refresh(key) { document.querySelector('[data-support-section="' + key + '"]')?.refresh(); }
  function resetTimer(key) { timerPreferences.delete(key); }
  function setTimerHidden(key, hidden) { timerPreferences.set(key, hidden); refresh(key); }
  window.HscSupport = { mount, progress, activate, decorate, timerHidden, setTimerHidden, refresh, resetTimer };
  document.addEventListener('DOMContentLoaded', () => {
    activate('s1'); decorate(document);
    document.addEventListener('click', event => {
      const choice = event.target.closest('[data-mode],[data-modeval]');
      if (choice) { const row = choice.closest('.btn-row'); if (row) decorate(row); }
    });
    document.querySelectorAll('.section-tab').forEach(el => {
      el.setAttribute('aria-pressed', String(el.classList.contains('active')));
      el.addEventListener('click', () => {
        document.querySelectorAll('.section-tab').forEach(tab => tab.setAttribute('aria-pressed', String(tab === el)));
        activate(['s1','s2','moduleA','moduleB','moduleC'][Number(el.dataset.section)-1]);
      });
    });
    // Dynamic module screens need the same component recipes as static screens.
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === 1) decorate(node); }));
    });
    document.querySelectorAll('.app').forEach(node => observer.observe(node, { childList:true, subtree:true }));
    document.querySelectorAll('.confidence-why').forEach(el => {
      const details = document.createElement('details'); details.className = 'hsc-confidence-explanation';
      details.innerHTML = '<summary>Why rate confidence?</summary>'; el.before(details); details.append(el);
    });
    const ready = document.getElementById('reading-ready-btn');
    document.getElementById('reading-right-panel').append(ready);
    document.getElementById('s2-q-right').append(document.getElementById('s2-q-continue'));
    const preview = document.getElementById('reading-checklist-preview');
    const previewContainer = preview.parentElement;
    const checklistDetails = document.createElement('details');
    checklistDetails.className = 'hsc-reading-checklist';
    checklistDetails.innerHTML = '<summary>What your answer needs</summary>';
    previewContainer.replaceChildren(checklistDetails); checklistDetails.append(preview);
  });
})();
