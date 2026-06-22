// COMP_DATA populated by registerCompCard, read by openCompCard
const COMP_DATA = {};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Inject per-line CSS classes into <head> so the inline SVG preview is styled
function injectLineStyles(line) {
  const id = `line-style-${line.id}`;
  let el = document.getElementById(id);
  if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
  const c = line.color, lc = line.lightColor, s = line.id;
  el.textContent = `
.${s}-line{stroke:${c};stroke-width:6;stroke-linecap:round;stroke-linejoin:round;fill:none;}
.${s}-node{fill:${c};stroke:${lc};stroke-width:5;}
.${s}-jtext{fill:#fff;font-size:24px;font-weight:700;text-anchor:middle;dominant-baseline:central;font-family:Arial,Helvetica,sans-serif;}
.${s}-label-box{fill:${c};}
.${s}-label-text{fill:#fff;font-size:24px;font-weight:700;dominant-baseline:central;font-family:Arial,Helvetica,sans-serif;}
.${s}-competition-line{stroke:${c};stroke-width:6;stroke-linecap:round;fill:none;}
.${s}-competition-node{stroke:${c};stroke-width:6;fill:none;}
.${s}-competition-node:hover,.competition-clickable:hover .${s}-competition-node{fill:${lc};}
.${s}-competition-title{fill:${c};font-size:20px;font-weight:700;font-family:Arial,Helvetica,sans-serif;}
.${s}-program-pill{stroke:${c};stroke-width:6;fill:${lc};}
.${s}-program-title{fill:${c};font-size:26px;font-weight:700;text-anchor:middle;dominant-baseline:central;font-family:Arial,Helvetica,sans-serif;}
.${s}-tunnel-line{stroke-width:4;stroke-linecap:round;stroke-linejoin:round;fill:none;}
.${s}-tunnel-node{fill:#fff;stroke:${c};stroke-width:6;}
.${s}-tunnel-node:hover,.competition-clickable:hover .${s}-tunnel-node{fill:${lc};}
.${s}-tunnel-mid-dot{fill:${c};}
.${s}-tunnel-title{fill:${c};font-size:18px;font-weight:700;font-family:Arial,Helvetica,sans-serif;}
.${s}-tunnel-badge-halo{fill:none;stroke:${lc};stroke-width:2;}
.${s}-tunnel-badge{fill:${c};}
.${s}-tunnel-badge-text{fill:#fff;font-size:13px;font-weight:700;text-anchor:middle;dominant-baseline:central;font-family:Arial,Helvetica,sans-serif;}
`;
}

function svgBaseStyles() {
  return `<style>
.line{stroke:#ced4db;stroke-width:3;stroke-dasharray:8,6;fill:none;}
.node{fill:#6f7681;stroke:#ced4db;stroke-width:3;}
.label{fill:#fff;font-size:20px;font-weight:700;text-anchor:middle;dominant-baseline:central;font-family:Arial,Helvetica,sans-serif;}
.month-label{fill:#ced4db;font-size:18px;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;}
.map-title{fill:#001489;font-size:84px;font-weight:700;font-family:Arial,Helvetica,sans-serif;}
.competition-clickable{cursor:pointer;}
</style>`;
}

// --- Year skeleton ---

function svgYearSkeleton(title) {
  const terms = [
    { label: 'T1', y: C.T1, months: ['Feb','Mar','Apr'] },
    { label: 'T2', y: C.T2, months: ['May','Jun','Jul'] },
    { label: 'T3', y: C.T3, months: ['Aug','Sep'] },
    { label: 'T4', y: C.T4, months: ['Oct','Nov','Dec'] },
  ];
  let out = `<text class="map-title" x="${C.TITLE_X}" y="${C.TITLE_Y}" text-anchor="middle">${esc(title)}</text>`;

  for (const t of terms) {
    out += `<line class="line" x1="${C.MAP_LEFT}" y1="${t.y}" x2="${C.MAP_RIGHT}" y2="${t.y}"/>`;
    out += `<circle class="node" cx="${C.MAP_LEFT}" cy="${t.y}" r="18"/>`;
    out += `<text class="label" x="${C.MAP_LEFT}" y="${t.y}">${t.label}</text>`;
    out += `<circle class="node" cx="${C.MAP_RIGHT}" cy="${t.y}" r="18"/>`;
    out += `<text class="label" x="${C.MAP_RIGHT}" y="${t.y}">${t.label}</text>`;
    let my = t.y + 250;
    for (const m of t.months) {
      out += `<text class="month-label" x="20" y="${my}" transform="rotate(-90 20 ${my})">${m}</text>`;
      my += 250;
    }
  }
  out += `<line class="line" x1="${C.MAP_LEFT}" y1="${C.YEAR_END}" x2="${C.MAP_RIGHT}" y2="${C.YEAR_END}"/>`;
  return out;
}

// --- Lines and sub-tracks ---

function svgLine(line, lineIndex, lineCount) {
  const slug = line.id;
  const stCount = line.subtracks.length;
  let out = `<g id="line-${slug}">`;
  line.subtracks.forEach((st, stIdx) => {
    const x = computeSubtrackX(lineIndex, lineCount, stIdx, stCount);
    out += `<line class="${slug}-line" x1="${x}" y1="${C.TRACK_TOP}" x2="${x}" y2="${C.TRACK_BOTTOM}"/>`;
    // Top terminus — clickable to edit the line
    out += `<g data-builder-type="line" data-line-id="${slug}" style="cursor:pointer">`;
    out += `<circle class="${slug}-node" cx="${x}" cy="${C.TRACK_TOP}" r="36"/>`;
    out += `<text class="${slug}-jtext" x="${x}" y="${C.TRACK_TOP}">${esc(line.letter)}</text>`;
    out += `</g>`;
    out += `<rect class="${slug}-label-box" x="${x+50}" y="${C.TRACK_TOP-28}" width="220" height="56" rx="10"/>`;
    out += `<text class="${slug}-label-text" x="${x+68}" y="${C.TRACK_TOP}">${esc(st.label)}</text>`;
    // Bottom terminus
    out += `<circle class="${slug}-node" cx="${x}" cy="${C.TRACK_BOTTOM}" r="36"/>`;
    out += `<text class="${slug}-jtext" x="${x}" y="${C.TRACK_BOTTOM}">${esc(line.letter)}</text>`;
    out += `<rect class="${slug}-label-box" x="${x+50}" y="${C.TRACK_BOTTOM-28}" width="220" height="56" rx="10"/>`;
    out += `<text class="${slug}-label-text" x="${x+68}" y="${C.TRACK_BOTTOM}">${esc(st.label)}</text>`;
  });
  out += `</g>`;
  return out;
}

// --- Programs (pills) ---

function svgPrograms(line, lineIndex, lineCount) {
  if (!line.programs.length) return '';
  const slug = line.id;
  const stCount = line.subtracks.length;
  let out = `<g id="programs-${slug}">`;

  line.programs.forEach(prog => {
    const stIndices = prog.subtracks
      .map(stId => line.subtracks.findIndex(s => s.id === stId))
      .filter(i => i >= 0);
    if (!stIndices.length) return;

    const startIdx = C.MONTH_NAMES.indexOf(prog.startMonth);
    const endIdx   = C.MONTH_NAMES.indexOf(prog.endMonth);
    const yTop = startIdx >= 1 ? C.MONTH_RANGES[startIdx][0] : C.T1;
    const yBot = endIdx   >= 1 ? C.MONTH_RANGES[endIdx][1]   : C.YEAR_END;
    const pillH = yBot - yTop;
    const centreY = Math.round(yTop + pillH / 2);

    stIndices.forEach(stIdx => {
      const x = computeSubtrackX(lineIndex, lineCount, stIdx, stCount);
      out += `<g data-builder-type="program" data-line-id="${slug}" data-program-id="${prog.id}" style="cursor:pointer">`;
      out += `<rect class="${slug}-program-pill" x="${x-45}" y="${yTop}" width="90" height="${pillH}" rx="45" ry="45"/>`;
      out += `<text class="${slug}-program-title" x="${x}" y="${centreY}" transform="rotate(90 ${x} ${centreY})">${esc(prog.title)}</text>`;
      out += `</g>`;
    });
  });

  out += `</g>`;
  return out;
}

// --- Competitions ---

function compTrackXs(line, lineIndex, lineCount, comp) {
  const stCount = line.subtracks.length;
  return comp.subtracks
    .map(stId => line.subtracks.findIndex(s => s.id === stId))
    .filter(i => i >= 0)
    .sort((a, b) => a - b)
    .map(stIdx => computeSubtrackX(lineIndex, lineCount, stIdx, stCount));
}

function svgSingleComp(slug, trackX, cy, nodeX, label, compId, goRight) {
  const stubEndX = goRight ? nodeX - 20.4 : nodeX + 20.4;
  const anchor   = goRight ? 'start' : 'end';
  const labelX   = goRight ? nodeX + 31.6 : nodeX - 31.6;
  const lines    = label.split('\n');
  let labelSvg;
  if (lines.length === 1) {
    labelSvg = `<text class="${slug}-competition-title" x="${labelX}" y="${cy - 30}" text-anchor="${anchor}">${esc(lines[0])}</text>`;
  } else {
    labelSvg = `<text class="${slug}-competition-title" x="${labelX}" y="${cy - 42}" text-anchor="${anchor}">${esc(lines[0])}</text>
<text class="${slug}-competition-title" x="${labelX}" y="${cy - 18}" text-anchor="${anchor}">${esc(lines[1])}</text>`;
  }
  return `<line class="${slug}-competition-line" x1="${trackX}" y1="${cy}" x2="${stubEndX}" y2="${cy}"/>
<g id="${compId}" class="competition-clickable" data-builder-type="competition" data-line-id="${slug}" data-comp-id="${compId}" onclick="openCompCard('${compId}')">
  <circle class="${slug}-competition-node" cx="${nodeX}" cy="${cy}" r="19.6"/>
  ${labelSvg}
</g>`;
}

function svgTunnelComp(line, xs, cy, label, compId, tunnelN) {
  const slug = line.id;
  const x1 = xs[0], x2 = xs[xs.length - 1];
  const span = x2 - x1;
  const dipY    = cy + 18;
  const stepIn  = Math.round(x1 + span * 0.23);
  const dipIn   = Math.round(x1 + span * 0.28);
  const dipOut  = Math.round(x2 - span * 0.28);
  const stepOut = Math.round(x2 - span * 0.23);
  const midX    = Math.round((dipIn + dipOut) / 2);
  const gradId  = `tunnelFade-${slug}-${tunnelN}`;
  const labelX  = x2 + 36;
  const parts   = label.split('\n');
  const line1   = esc(parts[0] || '');
  const line2   = esc(parts[1] || '');

  // Mid-dots on intermediate sub-tracks (between first and last)
  let midDots = '';
  for (let i = 1; i < xs.length - 1; i++) {
    midDots += `<circle class="${slug}-tunnel-mid-dot" cx="${xs[i]}" cy="${cy}" r="10"/>`;
  }

  return `<g>
<defs>
<linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}">
  <stop offset="0%"   stop-color="${line.color}" stop-opacity="1"/>
  <stop offset="50%"  stop-color="${line.color}" stop-opacity="0.1"/>
  <stop offset="100%" stop-color="${line.color}" stop-opacity="1"/>
</linearGradient>
</defs>
<path class="${slug}-tunnel-line" d="M ${x1},${cy} L ${stepIn},${cy} L ${dipIn},${dipY} L ${dipOut},${dipY} L ${stepOut},${cy} L ${x2},${cy}" stroke="url(#${gradId})" stroke-linejoin="round"/>
<ellipse class="${slug}-tunnel-node" cx="${x1}" cy="${cy}" rx="22" ry="16"/>
<circle class="${slug}-tunnel-mid-dot" cx="${midX}" cy="${dipY}" r="10"/>
${midDots}
<ellipse class="${slug}-tunnel-node" cx="${x2}" cy="${cy}" rx="22" ry="16"/>
<g class="tunnel-titlegroup">
  <text class="${slug}-tunnel-title" x="${labelX}" y="${cy-11}" text-anchor="start" dominant-baseline="central">${line1}</text>
  <text class="${slug}-tunnel-title" x="${labelX}" y="${cy+11}" text-anchor="start" dominant-baseline="central">${line2}</text>
</g>
<g id="${compId}" class="competition-clickable" data-builder-type="competition" data-line-id="${slug}" data-comp-id="${compId}" onclick="openCompCard('${compId}')">
  <ellipse cx="${x1}" cy="${cy}" rx="22" ry="16" fill="transparent" stroke="none"/>
  <ellipse cx="${x2}" cy="${cy}" rx="22" ry="16" fill="transparent" stroke="none"/>
</g>
</g>`;
}

function registerCompCard(comp, line) {
  const id = `comp-${line.id}-${comp.id}`;
  const routes     = line.subtracks.map(s => comp.subtracks.includes(s.id));
  const routeLabels = line.subtracks.map(s => s.label);
  COMP_DATA[id] = {
    color: line.color, badgeBg: line.lightColor, badgeFg: '#fff',
    badge: line.letter, routebarBg: line.lightColor,
    type: comp.type, title: comp.title, routes, routeLabels,
    rows: [
      ['Month',     comp.rows.month     || ''],
      ['Years',     comp.rows.years     || ''],
      ['Level',     comp.rows.level     || ''],
      ['Organiser', comp.rows.organiser || ''],
      ['Location',  comp.rows.location  || ''],
    ].filter(r => r[1]),
    desc: comp.desc || '',
    link: comp.link || '',
  };
}

function svgCompetitions(line, lineIndex, lineCount) {
  if (!line.competitions.length) return '';
  const slug = line.id;
  let out = `<g id="competitions-${slug}">`;
  let tunnelN = 0;

  const sorted = [...line.competitions].sort((a, b) => a.date.localeCompare(b.date));

  sorted.forEach(comp => {
    const cy    = dateToY(comp.date);
    const compId = `comp-${slug}-${comp.id}`;
    const xs    = compTrackXs(line, lineIndex, lineCount, comp);
    if (!xs.length) return;
    registerCompCard(comp, line);

    if (xs.length === 1) {
      const nodeX = xs[0] + 140;
      out += svgSingleComp(slug, xs[0], cy, nodeX, comp.title, compId, true);
    } else {
      tunnelN++;
      out += svgTunnelComp(line, xs, cy, comp.title, compId, tunnelN);
    }
  });

  out += `</g>`;
  return out;
}

// --- Map key ---

function svgMapKey(lines) {
  if (!lines.length) return '';
  const kx = C.MAP_RIGHT + 30, ky = 20;
  const h  = lines.length * 40 + 60;
  let out  = `<g id="map-key">`;
  out += `<rect x="${kx-10}" y="${ky-10}" width="250" height="${h}" rx="8" fill="#fff" stroke="#ced4db" stroke-width="1"/>`;
  out += `<text x="${kx}" y="${ky+18}" font-size="18" font-weight="700" fill="#1a1a2e" font-family="Arial,Helvetica,sans-serif">Lines</text>`;
  lines.forEach((line, i) => {
    const y = ky + 48 + i * 36;
    out += `<circle cx="${kx+12}" cy="${y}" r="12" fill="${line.color}"/>`;
    out += `<text x="${kx+30}" y="${y}" dominant-baseline="central" font-size="16" fill="#333a45" font-family="Arial,Helvetica,sans-serif">${esc(line.title)}</text>`;
  });
  out += `</g>`;
  return out;
}

// --- Main entry point ---

function renderMap(state) {
  // Clear stale COMP_DATA
  Object.keys(COMP_DATA).forEach(k => delete COMP_DATA[k]);

  state.lines.forEach(injectLineStyles);

  const lc = state.lines.length;
  let inner = svgYearSkeleton(state.title);
  state.lines.forEach((line, i) => { inner += svgLine(line, i, lc); });
  state.lines.forEach((line, i) => { inner += svgPrograms(line, i, lc); });
  state.lines.forEach((line, i) => { inner += svgCompetitions(line, i, lc); });
  inner += svgMapKey(state.lines);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${C.W} ${C.H}" id="main-svg">
${svgBaseStyles()}
${inner}
</svg>`;
  document.getElementById('canvas').innerHTML = svg;
}

// --- Competition modal card (live preview) ---

function openCompCard(id) {
  const d = COMP_DATA[id];
  if (!d) return;
  document.getElementById('compCardHeader').style.background = d.color;
  document.getElementById('compCardBadge').textContent  = d.badge;
  document.getElementById('compCardBadge').style.background = d.badgeBg;
  document.getElementById('compCardBadge').style.color  = d.badgeFg;
  document.getElementById('compCardType').textContent   = d.type;
  document.getElementById('compCardTitle').textContent  = d.title;
  const rb = document.getElementById('compCardRoutebar');
  rb.style.background = d.routebarBg;
  rb.innerHTML = (d.routeLabels || ['Foundation','Rozelle','Senior']).map((lbl, i) =>
    `<span class="comp-card-route${d.routes[i] ? ' active' : ''}" ${d.routes[i] ? `style="background:${d.color}"` : ''}>${lbl}</span>`
  ).join('');
  document.getElementById('compCardRows').innerHTML = d.rows.map(r =>
    `<div class="comp-card-row"><span class="comp-card-row-label">${r[0]}</span><span class="comp-card-row-value">${esc(r[1])}</span></div>`
  ).join('');
  document.getElementById('compCardDesc').textContent = d.desc;
  const footer = document.getElementById('compCardFooter');
  footer.href = d.link || '#';
  footer.style.display = d.link ? 'block' : 'none';
  document.getElementById('compCardBackdrop').style.display = 'block';
  document.getElementById('compCard').style.display = 'block';
}

function closeCompCard() {
  document.getElementById('compCardBackdrop').style.display = 'none';
  document.getElementById('compCard').style.display = 'none';
}
