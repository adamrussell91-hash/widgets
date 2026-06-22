let scale = 0.15;

function applyZoom() {
  const svg = document.getElementById('main-svg');
  if (svg) { svg.style.width = C.W * scale + 'px'; svg.style.height = C.H * scale + 'px'; }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function downloadFile(content, filename, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

document.addEventListener('DOMContentLoaded', () => {

  // Restore autosave
  const restored = loadFromLocalStorage();

  // Sync title input
  const titleInput = document.getElementById('map-title');
  titleInput.value = MAP_STATE.title;
  titleInput.addEventListener('input', () => {
    MAP_STATE.title = titleInput.value;
    autosave();
    renderMap(MAP_STATE);
    applyZoom();
  });

  // Zoom
  document.getElementById('btn-zoom-in').addEventListener('click',    () => { scale = Math.min(scale * 1.3, 2);    applyZoom(); });
  document.getElementById('btn-zoom-out').addEventListener('click',   () => { scale = Math.max(scale / 1.3, 0.05); applyZoom(); });
  document.getElementById('btn-zoom-reset').addEventListener('click', () => { scale = 0.15; applyZoom(); });

  // Add element buttons
  document.getElementById('btn-add-line').addEventListener('click', () => openDrawer('line', null));
  document.getElementById('btn-add-program').addEventListener('click', () => {
    if (!MAP_STATE.lines.length) { showToast('Add a line first'); return; }
    openDrawer('program', null);
  });
  document.getElementById('btn-add-competition').addEventListener('click', () => {
    if (!MAP_STATE.lines.length) { showToast('Add a line first'); return; }
    openDrawer('competition', null);
  });

  // Save JSON
  document.getElementById('btn-save-json').addEventListener('click', () => {
    downloadFile(JSON.stringify(MAP_STATE, null, 2), 'mindworks-map.json', 'application/json');
    showToast('Saved mindworks-map.json');
  });

  // Load JSON
  document.getElementById('btn-load-json').addEventListener('click', () => {
    document.getElementById('input-load-json').click();
  });
  document.getElementById('input-load-json').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (MAP_STATE.lines.length && !confirm('Replace the current map with the loaded file?')) return;
      try {
        setState(JSON.parse(ev.target.result));
        document.getElementById('map-title').value = MAP_STATE.title;
        renderMap(MAP_STATE);
        applyZoom();
        showToast('Map loaded');
      } catch { showToast('Invalid JSON file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Export HTML
  document.getElementById('btn-export-html').addEventListener('click', () => {
    downloadFile(exportHtml(MAP_STATE), 'timeline-canvas.html', 'text/html');
    showToast('Exported timeline-canvas.html');
  });

  // Competition card close
  document.getElementById('compCardClose').addEventListener('click', closeCompCard);
  document.getElementById('compCardBackdrop').addEventListener('click', closeCompCard);

  // Drawer save / cancel / close
  document.getElementById('drawer-save').addEventListener('click',    submitDrawer);
  document.getElementById('drawer-cancel').addEventListener('click',  closeDrawer);
  document.getElementById('drawer-close').addEventListener('click',   closeDrawer);
  document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);

  // Canvas click — open drawer to edit the clicked element
  document.getElementById('canvas').addEventListener('click', e => {
    // Don't intercept competition card clicks (handled by onclick on the <g>)
    if (e.target.closest('.competition-clickable')) return;
    const el = e.target.closest('[data-builder-type]');
    if (!el) return;
    const { builderType, lineId, programId, compId } = el.dataset;
    openDrawer(builderType, { lineId, programId, compId });
  });

  // Right-click context menu
  const ctxMenu = document.getElementById('context-menu');
  let _ctxTarget = null;

  document.getElementById('canvas').addEventListener('contextmenu', e => {
    e.preventDefault();
    ctxMenu.style.display = 'none';
    const el = e.target.closest('[data-builder-type]');
    if (!el) return;
    _ctxTarget = el.dataset;
    ctxMenu.style.left = e.clientX + 'px';
    ctxMenu.style.top  = e.clientY + 'px';
    ctxMenu.style.display = 'block';
  });

  document.addEventListener('click', e => {
    if (!ctxMenu.contains(e.target)) ctxMenu.style.display = 'none';
  });

  ctxMenu.querySelector('.ctx-edit').addEventListener('click', () => {
    ctxMenu.style.display = 'none';
    if (_ctxTarget) openDrawer(_ctxTarget.builderType, _ctxTarget);
  });

  ctxMenu.querySelector('.ctx-delete').addEventListener('click', () => {
    ctxMenu.style.display = 'none';
    if (!_ctxTarget) return;
    const { builderType, lineId, programId, compId } = _ctxTarget;
    if (!confirm(`Delete this ${builderType}?`)) return;
    if      (builderType === 'line')        deleteLine(lineId);
    else if (builderType === 'program')     deleteProgram(lineId, programId);
    else if (builderType === 'competition') deleteCompetition(lineId, compId);
    renderMap(MAP_STATE);
    applyZoom();
    showToast(`${builderType[0].toUpperCase() + builderType.slice(1)} deleted`);
  });

  // Autosave notice
  if (restored && MAP_STATE.lines.length) {
    const notice = document.createElement('div');
    notice.id = 'autosave-notice';
    notice.style.display = 'block';
    notice.innerHTML = 'Map restored from autosave. <button type="button" id="btn-dismiss-notice">Dismiss</button>';
    document.body.appendChild(notice);
    notice.querySelector('#btn-dismiss-notice').addEventListener('click', () => notice.remove());
    setTimeout(() => notice.remove(), 5000);
  }

  // Initial render
  renderMap(MAP_STATE);
  applyZoom();
});
