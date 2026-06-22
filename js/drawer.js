let _drawerContext = null;
let _drawerData    = {};

function openDrawer(type, context) {
  _drawerContext = { type, ...(context || {}) };
  _drawerData    = {};
  const titles   = { line: context ? 'Edit Line' : 'Add Line', program: context ? 'Edit Program' : 'Add Program', competition: context ? 'Edit Competition' : 'Add Competition' };
  document.getElementById('drawer-title').textContent  = titles[type] || 'Edit';
  document.getElementById('drawer-body').innerHTML     = _renderForm(type, context);
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-backdrop').style.display = 'block';
  _bindFormEvents(type);
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-backdrop').style.display = 'none';
  _drawerContext = null;
}

function _field(label, inputHtml) {
  return `<div class="form-group"><label class="form-label">${label}</label>${inputHtml}</div>`;
}

function _renderForm(type, context) {
  if (type === 'line')        return _renderLineForm(context);
  if (type === 'program')     return _renderProgramForm(context);
  if (type === 'competition') return _renderCompForm(context);
  return '';
}

// ---- LINE FORM ----

function _renderLineForm(context) {
  const line = context?.lineId ? MAP_STATE.lines.find(l => l.id === context.lineId) : null;
  const subtracks = line ? line.subtracks.map(s => ({ ...s })) : [
    { id: uid(), label: 'Foundation' },
    { id: uid(), label: 'Rozelle' },
    { id: uid(), label: 'Senior' },
  ];
  _drawerData.subtracks = subtracks;

  const stRows = subtracks.map((st, i) =>
    `<div class="subtrack-row" data-idx="${i}">
      <input class="form-input subtrack-name" data-idx="${i}" value="${esc(st.label)}" placeholder="Sub-track name">
      <button type="button" class="btn-remove-subtrack" data-idx="${i}">✕</button>
    </div>`
  ).join('');

  return _field('Line name',              `<input id="f-line-title"  class="form-input" value="${esc(line?.title || '')}" placeholder="e.g. Justice">`) +
         _field('Letter (shown in node)', `<input id="f-line-letter" class="form-input" maxlength="1" value="${esc(line?.letter || '')}" placeholder="J" style="width:60px">`) +
         _field('Primary colour',         `<input id="f-line-color"  type="color" value="${line?.color || '#001489'}" style="height:36px;width:60px;border:1px solid #dde1e7;border-radius:6px;padding:2px;cursor:pointer">`) +
         _field('Sub-tracks',             `<div class="subtrack-list" id="subtrack-list">${stRows}</div><button type="button" id="btn-add-subtrack">+ Add sub-track</button>`);
}

function _bindLineEvents() {
  document.getElementById('subtrack-list')?.addEventListener('input', e => {
    if (e.target.classList.contains('subtrack-name')) {
      _drawerData.subtracks[parseInt(e.target.dataset.idx)].label = e.target.value;
    }
  });
  document.getElementById('subtrack-list')?.addEventListener('click', e => {
    if (e.target.classList.contains('btn-remove-subtrack')) {
      _drawerData.subtracks.splice(parseInt(e.target.dataset.idx), 1);
      document.getElementById('drawer-body').innerHTML = _renderLineForm(_drawerContext);
      _bindLineEvents();
    }
  });
  document.getElementById('btn-add-subtrack')?.addEventListener('click', () => {
    _drawerData.subtracks.push({ id: uid(), label: '' });
    document.getElementById('drawer-body').innerHTML = _renderLineForm(_drawerContext);
    _bindLineEvents();
  });
}

function _submitLineForm() {
  const title  = document.getElementById('f-line-title').value.trim();
  const letter = document.getElementById('f-line-letter').value.trim().slice(0,1).toUpperCase();
  const color  = document.getElementById('f-line-color').value;
  if (!title || !letter) { alert('Line name and letter are required'); return; }
  const subtracks = _drawerData.subtracks.filter(s => s.label.trim());
  if (!subtracks.length) { alert('At least one sub-track is required'); return; }
  const lightColor = deriveLightColor(color);
  if (_drawerContext.lineId) {
    updateLine(_drawerContext.lineId, { title, letter, color, lightColor, subtracks });
  } else {
    const id = slugify(title) || uid();
    addLine({ id, title, letter, color, lightColor, subtracks, programs: [], competitions: [] });
  }
  closeDrawer();
  renderMap(MAP_STATE);
  if (typeof applyZoom === 'function') applyZoom();
}

// ---- PROGRAM FORM ----

function _renderProgramForm(context) {
  const lineId  = context?.lineId || MAP_STATE.lines[0]?.id || '';
  const line    = MAP_STATE.lines.find(l => l.id === lineId);
  const prog    = context?.programId ? line?.programs.find(p => p.id === context.programId) : null;

  const lineOpts = MAP_STATE.lines.map(l =>
    `<option value="${l.id}" ${l.id === lineId ? 'selected' : ''}>${esc(l.title)}</option>`
  ).join('');

  const stBoxes = (line?.subtracks || []).map(st =>
    `<label class="form-checkbox-row">
      <input type="checkbox" name="prog-st" value="${st.id}" ${prog?.subtracks.includes(st.id) ? 'checked' : ''}>
      ${esc(st.label)}
    </label>`
  ).join('');

  const months   = C.MONTH_NAMES.slice(1);
  const mOpts    = sel => months.map(m => `<option value="${m}" ${sel === m ? 'selected' : ''}>${m}</option>`).join('');

  return _field('Line',        `<select id="f-prog-line" class="form-select">${lineOpts}</select>`) +
         _field('Title',       `<input id="f-prog-title" class="form-input" value="${esc(prog?.title || '')}" placeholder="Program name">`) +
         _field('Sub-tracks',  `<div class="form-checkbox-group" id="prog-st-group">${stBoxes}</div>`) +
         _field('Start month', `<select id="f-prog-start" class="form-select">${mOpts(prog?.startMonth || 'Feb')}</select>`) +
         _field('End month',   `<select id="f-prog-end"   class="form-select">${mOpts(prog?.endMonth   || 'Oct')}</select>`);
}

function _bindProgEvents() {
  document.getElementById('f-prog-line')?.addEventListener('change', e => {
    const line = MAP_STATE.lines.find(l => l.id === e.target.value);
    const group = document.getElementById('prog-st-group');
    if (group && line) {
      group.innerHTML = line.subtracks.map(st =>
        `<label class="form-checkbox-row"><input type="checkbox" name="prog-st" value="${st.id}"> ${esc(st.label)}</label>`
      ).join('');
    }
  });
}

function _submitProgramForm() {
  const lineId     = document.getElementById('f-prog-line').value;
  const title      = document.getElementById('f-prog-title').value.trim();
  const startMonth = document.getElementById('f-prog-start').value;
  const endMonth   = document.getElementById('f-prog-end').value;
  const subtracks  = [...document.querySelectorAll('input[name="prog-st"]:checked')].map(cb => cb.value);
  if (!title) { alert('Program title is required'); return; }
  if (_drawerContext.programId) {
    updateProgram(_drawerContext.lineId, _drawerContext.programId, { title, subtracks, startMonth, endMonth });
  } else {
    addProgram(lineId, newProgram(title, subtracks, startMonth, endMonth));
  }
  closeDrawer();
  renderMap(MAP_STATE);
  if (typeof applyZoom === 'function') applyZoom();
}

// ---- COMPETITION FORM ----

function _renderCompForm(context) {
  const lineId = context?.lineId || MAP_STATE.lines[0]?.id || '';
  const line   = MAP_STATE.lines.find(l => l.id === lineId);
  const comp   = context?.compId ? line?.competitions.find(c => c.id === context.compId) : null;
  const r      = comp?.rows || {};

  const lineOpts = MAP_STATE.lines.map(l =>
    `<option value="${l.id}" ${l.id === lineId ? 'selected' : ''}>${esc(l.title)}</option>`
  ).join('');

  const stBoxes = (line?.subtracks || []).map(st =>
    `<label class="form-checkbox-row">
      <input type="checkbox" name="comp-st" value="${st.id}" ${comp?.subtracks.includes(st.id) ? 'checked' : ''}>
      ${esc(st.label)}
    </label>`
  ).join('');

  const typeOpts  = ['Competition','Event','Exhibition','Program'].map(t =>
    `<option value="${t}" ${comp?.type === t ? 'selected' : ''}>${t}</option>`
  ).join('');

  const levelOpts = ['All Abilities','Beginners','High Ability','Multiple Levels'].map(t =>
    `<option value="${t}" ${r.level === t ? 'selected' : ''}>${t}</option>`
  ).join('');

  const progOpts = `<option value="">— None —</option>` +
    (line?.programs || []).map(p =>
      `<option value="${p.id}" ${comp?.attachedToProgram === p.id ? 'selected' : ''}>${esc(p.title)}</option>`
    ).join('');

  return _field('Line',                `<select id="f-comp-line" class="form-select">${lineOpts}</select>`) +
         _field('Title',               `<input id="f-comp-title" class="form-input" value="${esc(comp?.title || '')}" placeholder="Competition name">`) +
         _field('Type',                `<select id="f-comp-type" class="form-select">${typeOpts}</select>`) +
         _field('Date',                `<input id="f-comp-date" type="date" class="form-input" value="${comp?.date || ''}">`) +
         _field('Sub-tracks',          `<div class="form-checkbox-group" id="comp-st-group">${stBoxes}</div>`) +
         _field('Attached to program', `<select id="f-comp-prog" class="form-select">${progOpts}</select>`) +
         _field('Years',               `<input id="f-comp-years"     class="form-input" value="${esc(r.years || '')}" placeholder="e.g. Years 9–12">`) +
         _field('Level',               `<select id="f-comp-level" class="form-select">${levelOpts}</select>`) +
         _field('Organiser',           `<input id="f-comp-organiser" class="form-input" value="${esc(r.organiser || '')}" placeholder="Organisation name">`) +
         _field('Location',            `<input id="f-comp-location"  class="form-input" value="${esc(r.location  || '')}" placeholder="City or venue">`) +
         _field('Description',         `<textarea id="f-comp-desc" class="form-textarea" placeholder="One-paragraph description">${esc(comp?.desc || '')}</textarea>`) +
         _field('Link',                `<input id="f-comp-link" type="url" class="form-input" value="${esc(comp?.link || '')}" placeholder="https://">`);
}

function _bindCompEvents() {
  document.getElementById('f-comp-line')?.addEventListener('change', e => {
    const line  = MAP_STATE.lines.find(l => l.id === e.target.value);
    const group = document.getElementById('comp-st-group');
    if (group && line) {
      group.innerHTML = line.subtracks.map(st =>
        `<label class="form-checkbox-row"><input type="checkbox" name="comp-st" value="${st.id}"> ${esc(st.label)}</label>`
      ).join('');
    }
  });
}

function _submitCompForm() {
  const lineId           = document.getElementById('f-comp-line').value;
  const title            = document.getElementById('f-comp-title').value.trim();
  const type             = document.getElementById('f-comp-type').value;
  const date             = document.getElementById('f-comp-date').value;
  const subtracks        = [...document.querySelectorAll('input[name="comp-st"]:checked')].map(cb => cb.value);
  const attachedToProgram = document.getElementById('f-comp-prog').value || null;
  const rows = {
    month:     date ? C.MONTH_NAMES[parseInt(date.split('-')[1], 10)] : '',
    years:     document.getElementById('f-comp-years').value.trim(),
    level:     document.getElementById('f-comp-level').value,
    organiser: document.getElementById('f-comp-organiser').value.trim(),
    location:  document.getElementById('f-comp-location').value.trim(),
  };
  const desc = document.getElementById('f-comp-desc').value.trim();
  const link = document.getElementById('f-comp-link').value.trim();

  if (!title)            { alert('Competition title is required'); return; }
  if (!date)             { alert('Date is required'); return; }
  if (!subtracks.length) { alert('Select at least one sub-track'); return; }

  if (_drawerContext.compId) {
    updateCompetition(_drawerContext.lineId, _drawerContext.compId, { title, type, date, subtracks, attachedToProgram, rows, desc, link });
  } else {
    addCompetition(lineId, newCompetition(title, type, date, subtracks, attachedToProgram, rows, desc, link));
  }
  closeDrawer();
  renderMap(MAP_STATE);
  if (typeof applyZoom === 'function') applyZoom();
}

// ---- Bind form events by type ----

function _bindFormEvents(type) {
  if (type === 'line')        _bindLineEvents();
  if (type === 'program')     _bindProgEvents();
  if (type === 'competition') _bindCompEvents();
}

// ---- Drawer save dispatcher ----

function submitDrawer() {
  if (!_drawerContext) return;
  if (_drawerContext.type === 'line')        _submitLineForm();
  else if (_drawerContext.type === 'program')     _submitProgramForm();
  else if (_drawerContext.type === 'competition') _submitCompForm();
}
