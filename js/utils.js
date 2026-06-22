const C = {
  W: 6800, H: 5650,
  TRACK_TOP: 200, TRACK_BOTTOM: 5450,
  MAP_LEFT: 150, MAP_RIGHT: 6620,
  T1: 900, T2: 1900, T3: 3150, T4: 4150, YEAR_END: 5150,
  TITLE_X: 3400, TITLE_Y: 100,
  MONTH_RANGES: {
    1:[700,900], 2:[900,1150], 3:[1150,1400], 4:[1400,1900],
    5:[1900,2200], 6:[2200,2550], 7:[2550,3150],
    8:[3150,3483], 9:[3483,4150], 10:[4150,4483],
    11:[4483,4817], 12:[4817,5150],
  },
  MONTH_NAMES: ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'line';
}

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2,'0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d + 2)/6; break;
      case b: h = ((r-g)/d + 4)/6; break;
    }
  }
  return [h*360, s, l];
}

function hslToRgb(h, s, l) {
  h /= 360;
  const hue2rgb = (p,q,t) => { if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; };
  if (s === 0) { const v = Math.round(l*255); return [v,v,v]; }
  const q = l<0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
  return [hue2rgb(p,q,h+1/3), hue2rgb(p,q,h), hue2rgb(p,q,h-1/3)].map(v => Math.round(v*255));
}

function deriveLightColor(hex) {
  const [r,g,b] = hexToRgb(hex);
  const [h,s,l] = rgbToHsl(r,g,b);
  // Push lightness to 95%, cap saturation at 65%
  const [lr,lg,lb] = hslToRgb(h, Math.min(s, 0.65), 0.95);
  return rgbToHex(lr,lg,lb);
}

// Returns SVG X for a sub-track given its line index and sub-track index
function computeSubtrackX(lineIndex, lineCount, subtrackIndex, subtrackCount) {
  const available = C.MAP_RIGHT - C.MAP_LEFT;
  const lineSlot = available / Math.max(lineCount, 1);
  const lineStart = C.MAP_LEFT + lineIndex * lineSlot;
  const pad = lineSlot * 0.18;
  const zone = lineSlot - 2 * pad;
  if (subtrackCount < 1) return Math.round(lineStart + lineSlot / 2);
  if (subtrackCount === 1) return Math.round(lineStart + lineSlot / 2);
  const gap = zone / (subtrackCount - 1);
  return Math.round(lineStart + pad + subtrackIndex * gap);
}

// Returns the days in a given month (use year 2026)
function daysInMonth(month) {
  return new Date(2026, month, 0).getDate();
}

// Returns SVG Y for a date string "YYYY-MM-DD"
function dateToY(dateStr) {
  const [, , mm, dd] = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/) || [];
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  if (!month || !C.MONTH_RANGES[month]) return C.T1;
  const [yStart, yEnd] = C.MONTH_RANGES[month];
  const days = daysInMonth(month);
  return Math.round(yStart + ((day - 1) / days) * (yEnd - yStart));
}

// Returns SVG Y for a month name string e.g. "Mar"
function monthNameToY(name) {
  const idx = C.MONTH_NAMES.indexOf(name);
  if (idx < 1) return C.T1;
  const [yStart, yEnd] = C.MONTH_RANGES[idx];
  return Math.round((yStart + yEnd) / 2);
}
