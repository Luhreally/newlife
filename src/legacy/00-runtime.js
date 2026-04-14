const WORLD_W = 1920;
const WORLD_H = 1280;
const GRID_W = 96;
const GRID_H = 64;
const CELL_W = WORLD_W / GRID_W;
const CELL_H = WORLD_H / GRID_H;
const ISO_X_SCALE = 0.92;
const ISO_Y_SCALE = 0.48;
const ISO_Z_SCALE = 0.9;
const MAX_CREATURES = 104;
const INITIAL_CREATURES = 72;
const MAX_FRAGMENTS = 144;
const INITIAL_FRAGMENTS = 40;
const MAX_LOOSE_FRAGMENTS = 36;
const DEPOSIT_COUNT = 54;
const DEPOSIT_REGEN = 0.028;
const SNAPSHOT_INTERVAL = 20;
const SNAPSHOT_MAX = 18;
const SIM_BASE = 1.7;
const MAX_PROTO_CELLS = 48;
const MATERIAL_SEED_COUNT = 36;
const CREATURE_EMERGENCE_TARGET = 72;
const MEMORY_LIMIT = 10;
const SPATIAL_BUCKET = 160;

const FIXED_STEP = 1 / 30;
const MAX_SUBSTEPS_NORMAL = 16;
const MAX_SUBSTEPS_TURBO = 220;
const MAX_REMNANTS = 120;
const MAX_COMBAT_FX = 160;
const TRIBE_COUNT = 6;
const MAX_TERRAIN_EDITS = 240;
const FORECAST_SAMPLES = 48;
const FORECAST_STEP = 12;
const INTENT_MIN_TTL = 3.5;
const INTENT_MAX_TTL = 7.5;
const SIGNAL_MEANINGS = ['food','danger','home','trade','ritual','raid','mourn'];
const SIGNAL_RADIUS = 180;
const SIGNAL_TTL = 18;
const HOUSEHOLD_TARGETS = {
  food: 6,
  shelter: 5,
  defense: 4,
  ritual: 2,
  trade: 3
};
const CAMP_TRANSFER_COOLDOWN = 10;
const INTERCAMP_TRADE_RADIUS = 560;
const INTERCAMP_TRADE_COOLDOWN = 28;
const RAID_RADIUS = 540;
const RAID_COOLDOWN = 36;
const RELATION_DECAY = 0.008;

const PROTO_MIN_ORGANIZATION = 0.44;
const PROTO_MIN_COMPLEXITY = 0.42;
const PROTO_MIN_EMBODIMENT = 0.40;
const PROTO_EMERGENCE_COOLDOWN = 16;

const SILHOUETTE_TYPES = ['kite','coil','fan','pillar','rune'];
const PATTERN_TYPES = ['bands','eyes','mesh','halo','fracture'];
const ORNAMENT_TYPES = ['spines','frill','streamers','crest','dust'];
const MOTION_STYLES = ['stutter','glide','orbit','pivot','weave'];
const SHELTER_LAYOUTS = ['ring','fan','spine','cluster','ladder'];
const SYMBOL_TOKENS = [
  'hearth',
  'wound',
  'ancestor',
  'safe-return',
  'split-path',
  'rival-fire',
  'fertile-mark',
  'sharp-stone'
];

const ERA_STAGES = [
  { key:'genesis', name:'Genesis', unlockTime:0, summary:'origin tensions condense into a world logic' },
  { key:'environment', name:'Environment', unlockTime:8, summary:'regions differentiate into stable and unstable zones' },
  { key:'materials', name:'Materials', unlockTime:22, summary:'matter families emerge with structural affordances' },
  { key:'proto', name:'Proto-Life', unlockTime:40, summary:'reactive niches begin cycling and holding shape' },
  { key:'creatures', name:'Creatures', unlockTime:64, summary:'embodied agents emerge from those niches' },
  { key:'place', name:'Place-Making', unlockTime:108, summary:'return paths, stores, and defended homes appear' },
  { key:'settlements', name:'Settlements', unlockTime:190, summary:'villages, rivalry, and regional memory take hold' },
  { key:'exchange', name:'Exchange', unlockTime:260, summary:'surplus and deficit begin routing matter between households and camps' },
  { key:'symbols', name:'Symbols', unlockTime:340, summary:'signals, ritual markers, and proto-language begin stabilizing' },
  { key:'frontiers', name:'Frontiers', unlockTime:440, summary:'territories overlap, border memory thickens, diplomacy hardens' },
  { key:'wars', name:'Wars', unlockTime:560, summary:'raids, retaliation, and organized defense emerge from scarcity and grievance' },
  { key:'confederacies', name:'Confederacies', unlockTime:760, summary:'alliances, shared lexicons, and multi-camp blocs appear' }
];
const ERA_INDEX = Object.fromEntries(ERA_STAGES.map((era, index) => [era.key, index]));

const STRUCTURES = [





  { key:'shard-like', prefs:{fertility:0.15,danger:0.82,passability:0.58,cover:0.20,volatility:0.62,stability:0.28}, stats:{mass:0.62,durability:0.42,flex:0.12,stick:0.15,sharp:0.95,load:0.38,insulation:0.14,energy:0.04}, motif:'splinter', edge:'broken', utility:'sharp' },
  { key:'fibrous', prefs:{fertility:0.82,danger:0.28,passability:0.48,cover:0.72,volatility:0.36,stability:0.56}, stats:{mass:0.26,durability:0.52,flex:0.92,stick:0.36,sharp:0.24,load:0.44,insulation:0.40,energy:0.23}, motif:'vein', edge:'frayed', utility:'flexible' },
  { key:'plated', prefs:{fertility:0.34,danger:0.52,passability:0.62,cover:0.28,volatility:0.18,stability:0.88}, stats:{mass:0.72,durability:0.92,flex:0.16,stick:0.24,sharp:0.58,load:0.92,insulation:0.30,energy:0.02}, motif:'plate', edge:'faceted', utility:'load-bearing' },
  { key:'porous', prefs:{fertility:0.74,danger:0.18,passability:0.50,cover:0.76,volatility:0.20,stability:0.70}, stats:{mass:0.18,durability:0.38,flex:0.28,stick:0.24,sharp:0.10,load:0.22,insulation:0.88,energy:0.42}, motif:'dots', edge:'soft', utility:'insulating' },
  { key:'nodular', prefs:{fertility:0.48,danger:0.34,passability:0.44,cover:0.54,volatility:0.30,stability:0.72}, stats:{mass:0.46,durability:0.68,flex:0.26,stick:0.28,sharp:0.18,load:0.74,insulation:0.42,energy:0.12}, motif:'bead', edge:'lumpy', utility:'stackable' },
  { key:'membranous', prefs:{fertility:0.62,danger:0.38,passability:0.40,cover:0.66,volatility:0.74,stability:0.22}, stats:{mass:0.22,durability:0.26,flex:0.86,stick:0.82,sharp:0.08,load:0.14,insulation:0.58,energy:0.34}, motif:'film', edge:'curved', utility:'adhesive' },
  { key:'layered', prefs:{fertility:0.42,danger:0.32,passability:0.74,cover:0.44,volatility:0.16,stability:0.84}, stats:{mass:0.54,durability:0.82,flex:0.34,stick:0.18,sharp:0.32,load:0.76,insulation:0.66,energy:0.05}, motif:'band', edge:'stepped', utility:'durable' },
  { key:'waxy', prefs:{fertility:0.56,danger:0.22,passability:0.30,cover:0.58,volatility:0.56,stability:0.34}, stats:{mass:0.34,durability:0.42,flex:0.72,stick:0.76,sharp:0.12,load:0.22,insulation:0.54,energy:0.28}, motif:'smear', edge:'melted', utility:'adhesive' },
  { key:'latticed', prefs:{fertility:0.40,danger:0.44,passability:0.86,cover:0.48,volatility:0.24,stability:0.66}, stats:{mass:0.28,durability:0.62,flex:0.58,stick:0.20,sharp:0.36,load:0.62,insulation:0.52,energy:0.08}, motif:'mesh', edge:'spoked', utility:'lightweight' },
  { key:'sintered', prefs:{fertility:0.18,danger:0.78,passability:0.54,cover:0.18,volatility:0.82,stability:0.18}, stats:{mass:0.78,durability:0.74,flex:0.06,stick:0.10,sharp:0.68,load:0.64,insulation:0.12,energy:0.01}, motif:'crust', edge:'jagged', utility:'durable' },
  { key:'filament', prefs:{fertility:0.68,danger:0.24,passability:0.68,cover:0.60,volatility:0.42,stability:0.42}, stats:{mass:0.16,durability:0.34,flex:0.98,stick:0.38,sharp:0.22,load:0.30,insulation:0.48,energy:0.18}, motif:'threads', edge:'streamed', utility:'flexible' },
  { key:'spongy', prefs:{fertility:0.80,danger:0.14,passability:0.32,cover:0.82,volatility:0.26,stability:0.62}, stats:{mass:0.20,durability:0.22,flex:0.56,stick:0.36,sharp:0.06,load:0.14,insulation:0.92,energy:0.48}, motif:'pore', edge:'blunt', utility:'insulating' }
];

const CORE_TYPES = {
  bulb:{name:'bulb', size:1.0, speed:1.0, carry:0.85, stability:0.76, defense:0.56, rest:0.86, shape:'round'},
  spindle:{name:'spindle', size:0.84, speed:1.22, carry:0.58, stability:0.56, defense:0.42, rest:0.72, shape:'lens'},
  slab:{name:'slab', size:1.24, speed:0.78, carry:1.20, stability:1.12, defense:0.98, rest:0.92, shape:'block'},
  ring:{name:'ring', size:1.02, speed:0.96, carry:0.74, stability:0.86, defense:0.84, rest:0.96, shape:'ring'},
  wedge:{name:'wedge', size:0.94, speed:1.10, carry:0.62, stability:0.66, defense:0.68, rest:0.76, shape:'wedge'}
};

const MOVE_TYPES = {
  legs:{name:'legs', speed:1.16, turn:1.0, limbs:4, rhythm:'step'},
  fins:{name:'fins', speed:1.00, turn:0.82, limbs:2, rhythm:'glide'},
  tendrils:{name:'tendrils', speed:0.90, turn:1.18, limbs:6, rhythm:'pulse'},
  pads:{name:'pads', speed:0.82, turn:1.08, limbs:4, rhythm:'shuffle'},
  segmented:{name:'segmented', speed:1.04, turn:0.90, limbs:8, rhythm:'wave'}
};

const GRASP_TYPES = {
  claws:{name:'claws', grasp:1.00, attack:1.10, build:0.74},
  prongs:{name:'prongs', grasp:0.90, attack:0.82, build:0.92},
  tenders:{name:'tenders', grasp:0.82, attack:0.46, build:1.08},
  scoop:{name:'scoop', grasp:1.08, attack:0.32, build:1.18},
  jaws:{name:'jaws', grasp:0.74, attack:1.22, build:0.48}
};

const UTILITY_TYPES = {
  pouch:{name:'pouch', carry:1.24, defense:0.72, attack:0.58, build:0.84, rest:0.88},
  shield:{name:'shield', carry:0.78, defense:1.24, attack:0.72, build:0.44, rest:0.84},
  spike:{name:'spike', carry:0.72, defense:0.84, attack:1.26, build:0.36, rest:0.70},
  nester:{name:'nester', carry:0.82, defense:0.90, attack:0.54, build:1.24, rest:1.14},
  harness:{name:'harness', carry:1.02, defense:0.90, attack:0.74, build:0.90, rest:0.80}
};

const SHELL_TYPES = {
  none:{name:'none', defense:0.76, stability:0.76, speed:1.00, rest:0.86},
  plates:{name:'plates', defense:1.24, stability:1.18, speed:0.86, rest:1.02},
  frill:{name:'frill', defense:0.92, stability:0.88, speed:0.96, rest:0.90},
  ring:{name:'ring', defense:1.08, stability:1.00, speed:0.90, rest:1.00},
  hood:{name:'hood', defense:0.96, stability:0.84, speed:0.98, rest:1.06}
};

const CORE_KEYS = Object.keys(CORE_TYPES);
const MOVE_KEYS = Object.keys(MOVE_TYPES);
const GRASP_KEYS = Object.keys(GRASP_TYPES);
const UTILITY_KEYS = Object.keys(UTILITY_TYPES);
const SHELL_KEYS = Object.keys(SHELL_TYPES);
const ROLE_ORDER = ['carrier','guard','builder','scout','forager'];
const KIND_NAMES = ['proto-site','camp','structured cluster','village','stronghold'];
const EVENT_COLORS = {
  founding:'rgba(155,230,255,0.9)',
  growth:'rgba(172,255,188,0.9)',
  decline:'rgba(255,174,122,0.9)',
  death:'rgba(255,130,120,0.95)',
  lineage:'rgba(230,178,255,0.95)',
  migration:'rgba(255,225,130,0.95)',
  era:'rgba(130,200,255,0.92)',
  nudge:'rgba(255,242,176,0.96)',
  trade:'rgba(132,255,219,0.95)',
  raid:'rgba(255,120,120,0.98)',
  alliance:'rgba(160,210,255,0.95)',
  project:'rgba(174,255,150,0.95)',
  rupture:'rgba(255,148,112,0.96)',
  ritual:'rgba(255,214,138,0.96)',
  upwelling:'rgba(144,236,255,0.95)',
  schism:'rgba(248,168,255,0.96)',
  breakthrough:'rgba(188,255,184,0.96)'
};

const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
const seedInput = document.getElementById('seedInput');
const pauseBtn = document.getElementById('pauseBtn');
const speedBtn = document.getElementById('speedBtn');
const newSeedBtn = document.getElementById('newSeedBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const fitBtn = document.getElementById('fitBtn');
const bloomBtn = document.getElementById('bloomBtn');
const shelterBtn = document.getElementById('shelterBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const loadInput = document.getElementById('loadInput');
const timeline = document.getElementById('timeline');
const timelineLabel = document.getElementById('timelineLabel');
const worldPanel = document.getElementById('worldPanel');
const selectionPanel = document.getElementById('selectionPanel');
const historyPanel = document.getElementById('historyPanel');
const hudWorld = document.getElementById('hudWorld');
const hudView = document.getElementById('hudView');

const slowerBtn = document.getElementById('slowerBtn');
const fasterBtn = document.getElementById('fasterBtn');
const turboBtn = document.getElementById('turboBtn');
const forecast60Btn = document.getElementById('forecast60Btn');
const forecast180Btn = document.getElementById('forecast180Btn');
const commitForecastBtn = document.getElementById('commitForecastBtn');

const overlayInputs = {
  influence: document.getElementById('ovInfluence'),
  routes: document.getElementById('ovRoutes'),
  regional: document.getElementById('ovRegional'),
  material: document.getElementById('ovMaterial'),
  culture: document.getElementById('ovCulture'),
  proto: document.getElementById('ovProto'),
  events: document.getElementById('ovEvents')
};

const camera = {
  x: WORLD_W * 0.5,
  y: WORLD_H * 0.5,
  zoom: 0.46,
  targetZoom: 0.46,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragWorldX: 0,
  dragWorldY: 0,
  moved: false
};

const ui = {
  paused: false,
  speedIndex: 3,
  speeds: [0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32],
  turbo: false,
  selected: null,
  replay: false,
  liveBackup: null,
  pauseBeforeReplay: false,
  hover: null,
  lastInspector: 0,
  forecast: null
};

let state = null;
let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
let lastFrame = performance.now();
let accumulator = 0;
let frameCounter = 0;

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t){ return a + (b - a) * t; }
function invLerp(a, b, v){ return (v - a) / (b - a || 1); }
function smoothstep(t){ t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function easeInOut(t){ t = clamp(t,0,1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) * 0.5; }
function fract(v){ return v - Math.floor(v); }
function mod(n,m){ return ((n % m) + m) % m; }
function dist(ax, ay, bx, by){ const dx = bx - ax, dy = by - ay; return Math.hypot(dx, dy); }
function distSq(ax, ay, bx, by){ const dx = bx - ax, dy = by - ay; return dx*dx + dy*dy; }
function angNorm(a){ while(a > Math.PI) a -= Math.PI * 2; while(a < -Math.PI) a += Math.PI * 2; return a; }
function hsl(h,s,l,a=1){ return `hsla(${mod(h,360).toFixed(1)}, ${clamp(s,0,100).toFixed(1)}%, ${clamp(l,0,100).toFixed(1)}%, ${a})`; }
function alpha(col, a){ return col.replace(/[\d.]+\)$/,(m)=>`${a})`); }
function round(v, p=1){ const q = Math.pow(10,p); return Math.round(v*q)/q; }
function chance(rng, p){ return rng() < p; }
function hashString(str){
  let h = 2166136261 >>> 0;
  for(let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += h << 13; h ^= h >>> 7;
  h += h << 3; h ^= h >>> 17;
  h += h << 5;
  return h >>> 0;
}
function mulberry32(a){
  return function(){
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function randRange(rng, a, b){ return a + (b - a) * rng(); }
function randInt(rng, a, b){ return Math.floor(randRange(rng, a, b + 1)); }
function pick(rng, arr){ return arr[Math.floor(rng() * arr.length)]; }
function shuffle(rng, arr){
  const out = arr.slice();
  for(let i = out.length - 1; i > 0; i--){
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function weightedPick(rng, items, fn){
  let total = 0;
  for(const item of items) total += Math.max(0, fn(item));
  if(total <= 0) return items[Math.floor(rng() * items.length)];
  let r = rng() * total;
  for(const item of items){
    r -= Math.max(0, fn(item));
    if(r <= 0) return item;
  }
  return items[items.length - 1];
}
function hash2(seed, x, y){
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967295;
}
function valueNoise(seed, x, y){
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const v00 = hash2(seed, xi, yi);
  const v10 = hash2(seed, xi + 1, yi);
  const v01 = hash2(seed, xi, yi + 1);
  const v11 = hash2(seed, xi + 1, yi + 1);
  const a = lerp(v00, v10, u);
  const b = lerp(v01, v11, u);
  return lerp(a, b, v);
}
function fbm(seed, x, y, octaves=4){
  let total = 0, amp = 0.5, freq = 1, norm = 0;
  for(let i = 0; i < octaves; i++){
    total += valueNoise(seed + i * 101, x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.02;
  }
  return total / norm;
}
function ridged(seed, x, y){
  return 1 - Math.abs(fbm(seed, x, y, 4) * 2 - 1);
}
function circleInfluence(x,y,cx,cy,r){
  const d = dist(x,y,cx,cy);
  return clamp(1 - d / r, 0, 1);
}
function segmentDistance(px, py, ax, ay, bx, by){
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx*dx + dy*dy || 1), 0, 1);
  return dist(px, py, ax + dx * t, ay + dy * t);
}
function corridorInfluence(x, y, corr){
  const d = segmentDistance(x, y, corr.ax, corr.ay, corr.bx, corr.by);
  const along = 1 - clamp(d / corr.width, 0, 1);
  return smoothstep(along);
}
function seededWords(seed){
  const rng = mulberry32(seed);
  const a = ['woven','knife','soft','hollow','plate','frayed','shelled','quiet','ember','pulsed','bone','glaze','rift','dense','branch','low','vein','lattice','drift','ashen'];
  const b = ['hollow','field','march','nest','river','reach','edge','memory','cradle','route','flood','spire','knot','band','fold','stronghold','basin','crawl','ridge','trace'];
  return `${pick(rng,a)} ${pick(rng,b)}`;
}
function nameFromSyllables(rng, suffix=''){
  const parts = ['ka','zu','or','ni','va','shi','tek','ul','ae','th','ra','mon','xe','lya','vor','qui','da','sen','io','pel'];
  const n = chance(rng, 0.55) ? 2 : 3;
  let s = '';
  for(let i = 0; i < n; i++) s += pick(rng, parts);
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return suffix ? `${s} ${suffix}` : s;
}
function niceBias(v, neg, pos){
  return v < -0.2 ? neg : v > 0.2 ? pos : `balanced ${neg}/${pos}`;
}
function moduleName(mods){
  return `${mods.core}/${mods.move}/${mods.grasp}/${mods.utility}/${mods.shell}`;
}
function bar(v){
  return `<div class="bar"><span style="width:${clamp(v,0,1) * 100}%"></span></div>`;
}
function fmtSecs(t){
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2,'0')}`;
}
function worldToScreenAtCamera(x, y, zoom, camX, camY, z=0){
  const dx = x - camX;
  const dy = y - camY;
  return {
    x: (dx - dy) * ISO_X_SCALE * zoom + canvas.width / (2 * dpr),
    y: (dx + dy) * ISO_Y_SCALE * zoom - z * ISO_Z_SCALE * zoom + canvas.height / (2 * dpr)
  };
}
function worldToScreen(x, y, z=0){
  return worldToScreenAtCamera(x, y, camera.zoom, camera.x, camera.y, z);
}
function screenDeltaToWorld(dx, dy, zoom){
  const invX = dx / (ISO_X_SCALE * zoom);
  const invY = dy / (ISO_Y_SCALE * zoom);
  return {
    x: (invX + invY) * 0.5,
    y: (invY - invX) * 0.5
  };
}
function screenToWorldAt(x, y, zoom){
  const delta = screenDeltaToWorld(
    x - canvas.width / (2 * dpr),
    y - canvas.height / (2 * dpr),
    zoom
  );
  return {
    x: delta.x + camera.x,
    y: delta.y + camera.y
  };
}
function screenToWorld(x, y){
  return screenToWorldAt(x, y, camera.zoom);
}
function visibleWorldBounds(pad=1){
  const corners = [
    screenToWorld(0, 0),
    screenToWorld(canvas.width / dpr, 0),
    screenToWorld(canvas.width / dpr, canvas.height / dpr),
    screenToWorld(0, canvas.height / dpr)
  ];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for(const p of corners){
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return {
    minX: clamp(minX - CELL_W * pad, 0, WORLD_W),
    minY: clamp(minY - CELL_H * pad, 0, WORLD_H),
    maxX: clamp(maxX + CELL_W * pad, 0, WORLD_W),
    maxY: clamp(maxY + CELL_H * pad, 0, WORLD_H)
  };
}
function worldAngleToScreen(angle){
  return Math.atan2(
    (Math.cos(angle) + Math.sin(angle)) * ISO_Y_SCALE,
    (Math.cos(angle) - Math.sin(angle)) * ISO_X_SCALE
  );
}
function pathPolygon(points){
  if(!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for(let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}
function isoQuadPoints(x, y, w, h, z=0){
  return [
    worldToScreen(x, y, z),
    worldToScreen(x + w, y, z),
    worldToScreen(x + w, y + h, z),
    worldToScreen(x, y + h, z)
  ];
}
function drawIsoTile(x, y, w, h, height, topFill, eastFill, southFill, stroke=null){
  const top = isoQuadPoints(x, y, w, h, height);
  const base = isoQuadPoints(x, y, w, h, 0);

  if(height > 0.1){
    pathPolygon([top[1], top[2], base[2], base[1]]);
    ctx.fillStyle = eastFill;
    ctx.fill();

    pathPolygon([top[2], top[3], base[3], base[2]]);
    ctx.fillStyle = southFill;
    ctx.fill();
  }

  pathPolygon(top);
  ctx.fillStyle = topFill;
  ctx.fill();

  if(stroke){
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  return { top, base };
}
function drawGroundShadow(sx, sy, rx, ry, alphaValue){
  ctx.fillStyle = `rgba(0,0,0,${alphaValue})`;
  ctx.beginPath();
  ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawIsoPrismLocal(halfW, halfH, height, topFill, eastFill, southFill, stroke=null, options={}){
  options = options || {};
  const hideEast = !!options.hideEast;
  const hideSouth = !!options.hideSouth;
  const top = [
    { x:0, y:-height - halfH },
    { x:halfW, y:-height },
    { x:0, y:-height + halfH },
    { x:-halfW, y:-height }
  ];
  const base = [
    { x:0, y:-halfH },
    { x:halfW, y:0 },
    { x:0, y:halfH },
    { x:-halfW, y:0 }
  ];

  if(!hideEast){
    pathPolygon([top[1], top[2], base[2], base[1]]);
    ctx.fillStyle = eastFill;
    ctx.fill();
  }

  if(!hideSouth){
    pathPolygon([top[2], top[3], base[3], base[2]]);
    ctx.fillStyle = southFill;
    ctx.fill();
  }

  pathPolygon(top);
  ctx.fillStyle = topFill;
  ctx.fill();

  if(stroke){
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
function drawChunkyRoofLocal(halfW, halfH, bodyHeight, rise, topFill, eastFill, southFill, stroke=null, options={}){
  options = options || {};
  ctx.save();
  ctx.translate(0, -bodyHeight);
  drawIsoPrismLocal(
    halfW * 1.08,
    halfH * 1.22,
    rise,
    topFill,
    eastFill,
    southFill,
    stroke,
    options
  );
  if(stroke){
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -rise - halfH * 1.18);
    ctx.lineTo(0, -rise + halfH * 1.18);
    ctx.stroke();
  }
  ctx.restore();
}
function focusedCampIdForCutaway(){
  if(ui.selected){
    if(ui.selected.type === 'camp') return ui.selected.id;
    if(ui.selected.type === 'creature') return getCreature(ui.selected.id)?.campId || null;
    if(ui.selected.type === 'fragment') return getFragment(ui.selected.id)?.siteId || null;
  }
  if(camera.zoom < 1.7) return null;
  const near = nearestCamp(camera.x, camera.y, 180);
  if(!near) return null;
  return dist(camera.x, camera.y, near.x, near.y) < near.homeRadius * 1.2 ? near.id : null;
}
function structureCutawayState(fragment){
  if(camera.zoom < 1.25 || fragment.state !== 'placed') return { active:false, alpha:1 };
  const camp = getCamp(fragment.siteId);
  const focusedCampId = focusedCampIdForCutaway();
  if(!camp || !focusedCampId || camp.id !== focusedCampId) return { active:false, alpha:1 };
  const frontness = (fragment.x + fragment.y) - (camp.x + camp.y);
  const radial = dist(fragment.x, fragment.y, camp.x, camp.y);
  const openKind = fragment.kind === 'shelter' || fragment.kind === 'store' || fragment.kind === 'workshop' || fragment.kind === 'wall' || fragment.kind === 'watch';
  if(!openKind) return { active:false, alpha:1 };
  if(frontness < camp.homeRadius * 0.04 || radial > camp.homeRadius * 1.04) return { active:false, alpha:1 };
  return {
    active: true,
    alpha: clamp(0.18 + frontness / Math.max(1, camp.homeRadius * 4.8), 0.18, 0.34)
  };
}
function getZoomMode(){
  if(camera.zoom < 0.28) return 'isometric / world';
  if(camera.zoom < 0.72) return 'isometric / regional';
  if(camera.zoom < 1.55) return 'isometric / settlement';
  if(camera.zoom < 3.2) return 'isometric / local-life';
  return 'isometric / micro';
}
function updateSpeedLabel(){
  speedBtn.textContent = `${ui.speeds[ui.speedIndex]}x`;
  turboBtn.textContent = ui.turbo ? 'Turbo On' : 'Turbo Off';
}
