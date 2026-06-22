const STORAGE_KEY = 'mindworks-builder';

function defaultState() {
  return { title: 'MindWorks 2026', lines: [] };
}

function cloneState(s) { return JSON.parse(JSON.stringify(s)); }

let MAP_STATE = defaultState();

function autosave() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(MAP_STATE)); } catch(e) {}
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { MAP_STATE = JSON.parse(raw); return true; }
  } catch(e) {}
  return false;
}

function setState(newState) {
  MAP_STATE = newState;
  autosave();
}

function addLine(line) {
  MAP_STATE.lines.push(line);
  autosave();
}

function updateLine(lineId, patch) {
  const line = MAP_STATE.lines.find(l => l.id === lineId);
  if (line) { Object.assign(line, patch); autosave(); }
}

function deleteLine(lineId) {
  MAP_STATE.lines = MAP_STATE.lines.filter(l => l.id !== lineId);
  autosave();
}

function addProgram(lineId, program) {
  const line = MAP_STATE.lines.find(l => l.id === lineId);
  if (line) { line.programs.push(program); autosave(); }
}

function updateProgram(lineId, programId, patch) {
  const line = MAP_STATE.lines.find(l => l.id === lineId);
  if (!line) return;
  const prog = line.programs.find(p => p.id === programId);
  if (prog) { Object.assign(prog, patch); autosave(); }
}

function deleteProgram(lineId, programId) {
  const line = MAP_STATE.lines.find(l => l.id === lineId);
  if (line) { line.programs = line.programs.filter(p => p.id !== programId); autosave(); }
}

function addCompetition(lineId, comp) {
  const line = MAP_STATE.lines.find(l => l.id === lineId);
  if (line) { line.competitions.push(comp); autosave(); }
}

function updateCompetition(lineId, compId, patch) {
  const line = MAP_STATE.lines.find(l => l.id === lineId);
  if (!line) return;
  const comp = line.competitions.find(c => c.id === compId);
  if (comp) { Object.assign(comp, patch); autosave(); }
}

function deleteCompetition(lineId, compId) {
  const line = MAP_STATE.lines.find(l => l.id === lineId);
  if (line) { line.competitions = line.competitions.filter(c => c.id !== compId); autosave(); }
}

function newLine(title, letter, color) {
  return {
    id: slugify(title) || uid(),
    title,
    letter: (letter || title[0] || 'L').slice(0,1).toUpperCase(),
    color,
    lightColor: deriveLightColor(color),
    subtracks: [
      { id: uid(), label: 'Foundation' },
      { id: uid(), label: 'Rozelle' },
      { id: uid(), label: 'Senior' },
    ],
    programs: [],
    competitions: [],
  };
}

function newProgram(title, subtracks, startMonth, endMonth) {
  return { id: uid(), title, subtracks, startMonth, endMonth };
}

function newCompetition(title, type, date, subtracks, attachedToProgram, rows, desc, link) {
  return {
    id: uid(), title, type, date, subtracks,
    attachedToProgram: attachedToProgram || null,
    rows, desc, link,
  };
}
