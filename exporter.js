function exportHtml(state) {
  const lines = state.lines;
  const lc    = lines.length;

  // Per-line CSS
  let lineCSS = '';
  lines.forEach(line => {
    const c = line.color, lc2 = line.lightColor, s = line.id;
    lineCSS += `
.${s}-line{stroke:${c};stroke-width:6;stroke-linecap:round;stroke-linejoin:round;fill:none;}
.${s}-node{fill:${c};stroke:${lc2};stroke-width:5;}
.${s}-jtext{fill:#fff;font-size:24px;font-weight:700;text-anchor:middle;dominant-baseline:central;font-family:Arial,Helvetica,sans-serif;}
.${s}-label-box{fill:${c};}
.${s}-label-text{fill:#fff;font-size:24px;font-weight:700;dominant-baseline:central;font-family:Arial,Helvetica,sans-serif;}
.${s}-competition-line{stroke:${c};stroke-width:6;stroke-linecap:round;fill:none;}
.${s}-competition-node{stroke:${c};stroke-width:6;fill:none;}
.${s}-competition-node:hover,.competition-clickable:hover .${s}-competition-node{fill:${lc2};}
.${s}-competition-title{fill:${c};font-size:20px;font-weight:700;font-family:Arial,Helvetica,sans-serif;}
.${s}-program-pill{stroke:${c};stroke-width:6;fill:${lc2};}
.${s}-program-title{fill:${c};font-size:26px;font-weight:700;text-anchor:middle;dominant-baseline:central;font-family:Arial,Helvetica,sans-serif;}
.${s}-tunnel-line{stroke-width:4;stroke-linecap:round;stroke-linejoin:round;fill:none;}
.${s}-tunnel-node{fill:#fff;stroke:${c};stroke-width:6;}
.${s}-tunnel-node:hover,.competition-clickable:hover .${s}-tunnel-node{fill:${lc2};}
.${s}-tunnel-mid-dot{fill:${c};}
.${s}-tunnel-title{fill:${c};font-size:18px;font-weight:700;font-family:Arial,Helvetica,sans-serif;}
.${s}-tunnel-badge-halo{fill:none;stroke:${lc2};stroke-width:2;}
.${s}-tunnel-badge{fill:${c};}
.${s}-tunnel-badge-text{fill:#fff;font-size:13px;font-weight:700;text-anchor:middle;dominant-baseline:central;font-family:Arial,Helvetica,sans-serif;}
`;
  });

  // Build COMP_DATA entries
  const compEntries = [];
  lines.forEach(line => {
    line.competitions.forEach(comp => {
      const id          = `comp-${line.id}-${comp.id}`;
      const routes      = line.subtracks.map(s => comp.subtracks.includes(s.id));
      const routeLabels = line.subtracks.map(s => s.label);
      compEntries.push(`'${id}':${JSON.stringify({
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
      })}`);
    });
  });

  // SVG inner content — reuse renderer pure functions
  let svgInner = svgYearSkeleton(state.title);
  lines.forEach((line, i) => { svgInner += svgLine(line, i, lc); });
  lines.forEach((line, i) => { svgInner += svgPrograms(line, i, lc); });
  lines.forEach((line, i) => { svgInner += svgCompetitions(line, i, lc); });
  svgInner += svgMapKey(lines);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(state.title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#fff;font-family:Arial,Helvetica,sans-serif;}
#svg-wrap{overflow:auto;padding:24px;}
#zoom-bar{position:fixed;top:12px;right:12px;display:flex;gap:6px;z-index:10;}
#zoom-bar button{padding:6px 12px;border:1px solid #dde1e7;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;}
.line{stroke:#ced4db;stroke-width:3;stroke-dasharray:8,6;fill:none;}
.node{fill:#6f7681;stroke:#ced4db;stroke-width:3;}
.label{fill:#fff;font-size:20px;font-weight:700;text-anchor:middle;dominant-baseline:central;font-family:Arial,Helvetica,sans-serif;}
.month-label{fill:#ced4db;font-size:18px;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;}
.map-title{fill:#001489;font-size:84px;font-weight:700;font-family:Arial,Helvetica,sans-serif;}
.competition-clickable{cursor:pointer;}
${lineCSS}
.comp-card-backdrop{display:none;position:fixed;inset:0;background:rgba(0,10,40,0.4);z-index:100;}
.comp-card{display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:380px;max-width:calc(100vw - 40px);background:#fff;border-radius:16px;box-shadow:0 18px 50px rgba(0,10,40,0.35);z-index:101;overflow:hidden;}
.comp-card-header{display:flex;align-items:flex-start;gap:14px;padding:22px 24px 18px;color:#fff;}
.comp-card-badge{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0;}
.comp-card-type{font-size:11px;letter-spacing:0.5px;text-transform:uppercase;opacity:0.85;margin-bottom:2px;}
.comp-card-title{font-size:18px;font-weight:700;line-height:1.25;}
.comp-card-close{margin-left:auto;background:none;border:none;cursor:pointer;font-size:20px;color:rgba(255,255,255,0.8);padding:0;flex-shrink:0;}
.comp-card-routebar{display:flex;gap:8px;padding:10px 24px;flex-wrap:wrap;}
.comp-card-route{padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;background:#f0f2f5;color:#6f7681;}
.comp-card-route.active{color:#fff;}
.comp-card-body{padding:18px 24px 22px;}
.comp-card-row{display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;border-bottom:1px solid #f0f2f5;}
.comp-card-row-label{font-size:11px;letter-spacing:0.5px;text-transform:uppercase;color:#6f7681;}
.comp-card-row-value{font-size:14px;color:#333a45;font-weight:600;}
.comp-card-desc{font-size:13px;line-height:1.55;color:#333a45;margin-top:12px;}
.comp-card-footer{display:block;padding:14px 24px;background:#f8f9fb;border-top:1px solid #eef0f3;font-size:14px;font-weight:600;text-decoration:none;color:#001489;}
</style>
</head>
<body>
<div id="zoom-bar">
  <button onclick="zoomOut()">−</button>
  <button onclick="zoomReset()">Reset</button>
  <button onclick="zoomIn()">+</button>
</div>
<div id="svg-wrap">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${C.W} ${C.H}" id="main-svg">
${svgInner}
</svg>
</div>

<div class="comp-card-backdrop" id="compCardBackdrop" onclick="closeCompCard()"></div>
<div class="comp-card" id="compCard">
  <div class="comp-card-header" id="compCardHeader">
    <div class="comp-card-badge" id="compCardBadge"></div>
    <div>
      <div class="comp-card-type" id="compCardType"></div>
      <div class="comp-card-title" id="compCardTitle"></div>
    </div>
    <button type="button" class="comp-card-close" onclick="closeCompCard()">✕</button>
  </div>
  <div class="comp-card-routebar" id="compCardRoutebar"></div>
  <div class="comp-card-body">
    <div id="compCardRows"></div>
    <p class="comp-card-desc" id="compCardDesc"></p>
  </div>
  <a class="comp-card-footer" id="compCardFooter" href="#" target="_blank">Learn More →</a>
</div>

<script>
var COMP_DATA={${compEntries.join(',\n')}};
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function openCompCard(id){
  var d=COMP_DATA[id];if(!d)return;
  document.getElementById('compCardHeader').style.background=d.color;
  document.getElementById('compCardBadge').textContent=d.badge;
  document.getElementById('compCardBadge').style.background=d.badgeBg;
  document.getElementById('compCardBadge').style.color=d.badgeFg;
  document.getElementById('compCardType').textContent=d.type;
  document.getElementById('compCardTitle').textContent=d.title;
  var rb=document.getElementById('compCardRoutebar');
  rb.style.background=d.routebarBg;
  rb.innerHTML=(d.routeLabels||['Foundation','Rozelle','Senior']).map(function(lbl,i){
    return '<span class="comp-card-route'+(d.routes[i]?' active':'')+'"'+(d.routes[i]?' style="background:'+d.color+'"':'')+'>'+lbl+'</span>';
  }).join('');
  document.getElementById('compCardRows').innerHTML=d.rows.map(function(r){
    return '<div class="comp-card-row"><span class="comp-card-row-label">'+r[0]+'</span><span class="comp-card-row-value">'+esc(r[1])+'</span></div>';
  }).join('');
  document.getElementById('compCardDesc').textContent=d.desc;
  var f=document.getElementById('compCardFooter');
  f.href=d.link||'#';f.style.display=d.link?'block':'none';
  document.getElementById('compCardBackdrop').style.display='block';
  document.getElementById('compCard').style.display='block';
}
function closeCompCard(){
  document.getElementById('compCardBackdrop').style.display='none';
  document.getElementById('compCard').style.display='none';
}
var _scale=0.15;
function _applyZoom(){var s=document.getElementById('main-svg');s.style.width=${C.W}*_scale+'px';s.style.height=${C.H}*_scale+'px';}
function zoomIn(){_scale=Math.min(_scale*1.3,2);_applyZoom();}
function zoomOut(){_scale=Math.max(_scale/1.3,0.05);_applyZoom();}
function zoomReset(){_scale=0.15;_applyZoom();}
window.onload=_applyZoom;
</script>
</body>
</html>`;
}
