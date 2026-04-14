// Source module: world constants, seed generation, materials, tribes, and proto/archetype setup.

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
  nextInspectorTime: 0,
  nextHudTime: 0,
  forecast: null,
  hudCache: {
    world: '',
    view: ''
  },
  dirty: {
    world: true,
    selection: true,
    history: true,
    inspector: true,
    hud: true
  }
};

let state = null;
let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
let lastFrame = performance.now();
let accumulator = 0;
let frameCounter = 0;

function markUiDirty(scope='all'){
  if(scope === 'all'){
    ui.dirty.world = true;
    ui.dirty.selection = true;
    ui.dirty.history = true;
    ui.dirty.inspector = true;
    ui.dirty.hud = true;
    return;
  }
  if(scope === 'world'){
    ui.dirty.world = true;
    ui.dirty.inspector = true;
    ui.dirty.hud = true;
    return;
  }
  if(scope === 'selection'){
    ui.dirty.selection = true;
    ui.dirty.inspector = true;
    ui.dirty.hud = true;
    return;
  }
  if(scope === 'history'){
    ui.dirty.history = true;
    ui.dirty.inspector = true;
    return;
  }
  if(scope === 'inspector'){
    ui.dirty.inspector = true;
    return;
  }
  if(scope === 'hud'){
    ui.dirty.hud = true;
  }
}

function resetUiRuntimeState(){
  ui.lastInspector = 0;
  ui.nextInspectorTime = 0;
  ui.nextHudTime = 0;
  ui.hudCache.world = '';
  ui.hudCache.view = '';
  markUiDirty('all');
}

function replaceWorldState(nextState){
  state = nextState;
  resetUiRuntimeState();
  return state;
}

function setSelectedEntity(nextSelection){
  const prev = ui.selected;
  if(
    prev?.type === nextSelection?.type &&
    prev?.id === nextSelection?.id
  ){
    return ui.selected;
  }
  ui.selected = nextSelection;
  markUiDirty('selection');
  return ui.selected;
}

function pulseUiState(){
  if(!state) return;
  const inspectorEvery = ui.selected ? 0.18 : 0.35;
  if(state.time >= ui.nextInspectorTime){
    ui.nextInspectorTime = state.time + inspectorEvery;
    markUiDirty('inspector');
  }
  if(state.time >= ui.nextHudTime){
    ui.nextHudTime = state.time + 0.12;
    markUiDirty('hud');
  }
}

function setNodeText(node, text){
  if(node && node.textContent !== text) node.textContent = text;
}

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

function generateOrigin(rng){
  return {
    angularity: randRange(rng, -1, 1),
    elasticity: randRange(rng, -1, 1),
    branching: randRange(rng, -1, 1),
    contrast: randRange(rng, -1, 1),
    adhesion: randRange(rng, -1, 1),
    pulse: randRange(rng, -1, 1),
    density: randRange(rng, -1, 1),
    volatility: randRange(rng, -1, 1)
  };
}
function describeOrigin(origin){
  return [
    niceBias(origin.angularity, 'rounded', 'angular'),
    niceBias(origin.elasticity, 'brittle', 'elastic'),
    niceBias(origin.branching, 'clustered', 'branching'),
    niceBias(origin.contrast, 'low contrast', 'high contrast'),
    niceBias(origin.adhesion, 'fragmenting', 'adhesive'),
    niceBias(origin.pulse, 'rigid', 'pulsing'),
    niceBias(origin.density, 'sparse', 'dense'),
    niceBias(origin.volatility, 'stable', 'volatile')
  ];
}
function generatePalette(rng, origin){
  const baseHue = randRange(rng, 18, 345);
  const contrast = (origin.contrast + 1) * 0.5;
  const satBase = lerp(20, 58, contrast);
  return {
    baseHue,
    background: hsl(baseHue + 210, 26 + satBase * 0.08, 6 + contrast * 4),
    panel: hsl(baseHue + 180, 18 + satBase * 0.1, 10),
    line: hsl(baseHue + 10, 24 + contrast * 18, 68 - contrast * 22),
    fertile: hsl(baseHue + 110, 48, 58, 0.85),
    danger: hsl(baseHue - 12, 72, 64, 0.88),
    stable: hsl(baseHue + 185, 38, 58, 0.82),
    volatile: hsl(baseHue + 300, 58, 65, 0.8)
  };
}
function generateMotion(origin, rng){
  const elasticity = (origin.elasticity + 1) * 0.5;
  const pulse = (origin.pulse + 1) * 0.5;
  const density = (origin.density + 1) * 0.5;
  const volatility = (origin.volatility + 1) * 0.5;
  return {
    accel: lerp(38, 92, 1 - density * 0.65),
    drag: lerp(1.25, 3.8, density * 0.85 + (1 - elasticity) * 0.18),
    turnLag: lerp(0.06, 0.34, density * 0.5 + (1 - elasticity) * 0.5),
    wobble: lerp(0.04, 0.36, elasticity * 0.75 + pulse * 0.25),
    bounce: lerp(0.04, 0.32, elasticity),
    staccato: lerp(0.0, 0.65, volatility * 0.7 + (1 - elasticity) * 0.3),
    pulseRate: lerp(0.7, 2.4, pulse),
    carryLag: lerp(0.05, 0.32, density * 0.6 + elasticity * 0.2),
    recoil: lerp(0.02, 0.18, volatility * 0.6 + elasticity * 0.4),
    idleSway: lerp(0.03, 0.22, elasticity * 0.7 + pulse * 0.3),
    routeBias: lerp(0.25, 0.82, 1 - volatility * 0.45 + (1 - density) * 0.25 + origin.branching * 0.15)
  };
}

function generateWorldLaws(origin, materials, macro){
  const norm = {
    angularity: (origin.angularity + 1) * 0.5,
    elasticity: (origin.elasticity + 1) * 0.5,
    branching: (origin.branching + 1) * 0.5,
    contrast: (origin.contrast + 1) * 0.5,
    adhesion: (origin.adhesion + 1) * 0.5,
    pulse: (origin.pulse + 1) * 0.5,
    density: (origin.density + 1) * 0.5,
    volatility: (origin.volatility + 1) * 0.5
  };

  let avgFlex = 0, avgLoad = 0, avgStick = 0, avgSharp = 0, avgEnergy = 0, avgDurability = 0;
  for(const mat of materials){
    avgFlex += mat.stats.flex;
    avgLoad += mat.stats.load;
    avgStick += mat.stats.stick;
    avgSharp += mat.stats.sharp;
    avgEnergy += mat.stats.energy;
    avgDurability += mat.stats.durability;
  }
  const inv = 1 / Math.max(1, materials.length);
  avgFlex *= inv;
  avgLoad *= inv;
  avgStick *= inv;
  avgSharp *= inv;
  avgEnergy *= inv;
  avgDurability *= inv;

  return {
    embodimentPressure: clamp(
      0.38 + norm.adhesion * 0.16 + norm.density * 0.12 + avgLoad * 0.10 + avgDurability * 0.12 - norm.volatility * 0.08,
      0.28,
      1.02
    ),
    organizationBias: clamp(
      0.36 + norm.branching * 0.12 + norm.adhesion * 0.14 + avgStick * 0.12 + avgLoad * 0.06 - norm.volatility * 0.05,
      0.26,
      1.04
    ),
    complexityBias: clamp(
      0.34 + norm.elasticity * 0.12 + norm.pulse * 0.12 + avgFlex * 0.10 + avgEnergy * 0.12 + avgSharp * 0.05,
      0.24,
      1.06
    ),
    memoryBias: clamp(
      0.34 + norm.density * 0.10 + (1 - norm.volatility) * 0.10 + avgStick * 0.06 + avgDurability * 0.08,
      0.24,
      1.04
    ),
    signalingBias: clamp(
      0.30 + norm.pulse * 0.16 + norm.contrast * 0.12 + avgEnergy * 0.10,
      0.18,
      1.04
    ),
    emergenceThreshold: clamp(
      0.80 + norm.volatility * 0.06 - norm.adhesion * 0.04 + (avgLoad < 0.28 ? 0.03 : 0),
      0.70,
      0.92
    ),
    stabilizationTime: lerp(7.5, 11.5, norm.volatility),
    protoGrowthRate: lerp(0.85, 1.18, norm.pulse * 0.6 + norm.elasticity * 0.4)
  };
}

function macroRegionLabels(){
  return ['fertile cradle', 'stable hollow', 'defensive corridor', 'volatile surge', 'harsh reach'];
}

function countCreaturesByZone(){
  const counts = Object.fromEntries(macroRegionLabels().map(label => [label, 0]));
  for(const cr of state.creatures){
    if(!cr.alive) continue;
    const zone = regionLabelAt(cr.x, cr.y, state.macro);
    counts[zone] = (counts[zone] || 0) + 1;
  }
  return counts;
}

function countProtoByZone(){
  const counts = Object.fromEntries(macroRegionLabels().map(label => [label, 0]));
  for(const cell of state.protoCells){
    const zone = cell.homeZone || cell.niche || regionLabelAt(cell.x, cell.y, state.macro);
    counts[zone] = (counts[zone] || 0) + 1;
  }
  return counts;
}

function countActiveCampsByZone(){
  const counts = Object.fromEntries(macroRegionLabels().map(label => [label, 0]));
  for(const camp of state.camps){
    if(camp.abandoned) continue;
    const zone = regionLabelAt(camp.x, camp.y, state.macro);
    counts[zone] = (counts[zone] || 0) + 1;
  }
  return counts;
}

function campZoneDiversityBias(zone, campCounts=null){
  const counts = campCounts || countActiveCampsByZone();
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const desired = Math.max(1, Math.ceil((total + 1) / Math.max(3, macroRegionLabels().length)));
  return clamp((desired - (counts[zone] || 0)) / desired, -0.85, 1.25);
}

function zoneCreatureFloor(){
  const active = new Set(
    state.protoCells.map(cell => cell.homeZone || cell.niche || regionLabelAt(cell.x, cell.y, state.macro))
  );
  return Math.max(10, Math.floor(CREATURE_EMERGENCE_TARGET / Math.max(3, Math.min(5, active.size || 1))));
}

function protoZoneDiversityBias(cell, creatureCounts=null){
  const counts = creatureCounts || countCreaturesByZone();
  const zone = cell.homeZone || cell.niche || regionLabelAt(cell.x, cell.y, state.macro);
  const floor = zoneCreatureFloor();
  return clamp((floor - (counts[zone] || 0)) / floor, -0.7, 1.2);
}

function protoZoneCongestion(cell, protoCounts=null){
  const counts = protoCounts || countProtoByZone();
  const zone = cell.homeZone || cell.niche || regionLabelAt(cell.x, cell.y, state.macro);
  const count = counts[zone] || 0;
  return clamp((count - 8) / 10, 0, 1.4);
}

function protoEmergenceScore(cell, env, mat, zoneBias=0, zoneCongestion=0){
  const laws = state.laws;
  const energyNorm = clamp(cell.energy / 100, 0, 1);
  const maturityNorm = clamp(cell.maturity / 1.2, 0, 1);

  return clamp(
    cell.organization * 0.22 +
    cell.complexity * 0.20 +
    cell.embodiment * 0.22 +
    maturityNorm * 0.20 +
    energyNorm * 0.10 +
    cell.traits.memory * 0.05 +
    cell.traits.signaling * 0.04 +
    env.safe * 0.04 +
    env.resource * 0.04 +
    mat.signal * 0.04 +
    laws.embodimentPressure * 0.04 +
    laws.organizationBias * 0.04 +
    laws.complexityBias * 0.04 -
    zoneCongestion * 0.05 +
    env.danger * 0.03 -
    env.volatility * 0.01 +
    Math.max(0, zoneBias) * 0.12,
    0,
    1.6
  );
}

function protoReadyForEmbodiment(cell){
  const threshold = Math.max(0.58, state.laws.emergenceThreshold - 0.08);
  const stableTimeNeeded = Math.max(4.5, state.laws.stabilizationTime * 0.6);

  return (
    cell.maturity >= 0.88 &&
    cell.energy > 56 &&
    cell.organization >= PROTO_MIN_ORGANIZATION &&
    cell.complexity >= PROTO_MIN_COMPLEXITY &&
    cell.embodiment >= PROTO_MIN_EMBODIMENT &&
    cell.emergence.score >= threshold &&
    cell.emergence.stabilityTime >= stableTimeNeeded &&
    !cell.spawned &&
    (state.time - cell.lastSpawnTime) > PROTO_EMERGENCE_COOLDOWN
  );
}

function buildArchetypeFromProto(cell){
  const env = sampleEnv(cell.x, cell.y);
  const mat = state.materials[cell.materialId];
  const tribeId = chooseTribeForSpawn(cell.materialId, cell.niche);
  const tribe = getTribe(tribeId);

  const modules = {
    core: weightedPick(state.rng, CORE_KEYS, key => {
      if(key === 'slab') return 0.3 + cell.embodiment * 1.4 + mat.stats.load * 1.2 + mat.stats.durability * 1.0 + mat.stats.mass * 0.5;
      if(key === 'bulb') return 0.3 + cell.complexity * 1.0 + mat.stats.energy * 0.9 + mat.stats.insulation * 0.6 + env.fertility * 0.4;
      if(key === 'spindle') return 0.3 + cell.traits.mobility * 1.3 + mat.stats.flex * 1.0 + env.passability * 0.9;
      if(key === 'ring') return 0.3 + cell.organization * 1.2 + cell.traits.signaling * 0.8 + env.stability * 0.7 + env.safe * 0.6;
      if(key === 'wedge') return 0.3 + cell.traits.aggression * 1.2 + mat.stats.sharp * 1.1 + env.danger * 0.8;
      return 1;
    }),
    move: weightedPick(state.rng, MOVE_KEYS, key => {
      if(key === 'legs') return 0.3 + cell.embodiment * 1.1 + env.passability * 1.0 + env.stability * 0.5;
      if(key === 'fins') return 0.3 + cell.traits.mobility * 0.9 + mat.stats.flex * 0.7 + env.fertility * 0.4;
      if(key === 'tendrils') return 0.3 + cell.complexity * 1.0 + cell.traits.manipulation * 0.9 + mat.stats.stick * 0.8 + env.cover * 0.4;
      if(key === 'pads') return 0.3 + cell.traits.sheltering * 1.0 + env.safe * 0.8 + env.cover * 0.8;
      if(key === 'segmented') return 0.3 + cell.complexity * 0.9 + cell.traits.mobility * 0.8 + env.volatility * 0.8;
      return 1;
    }),
    grasp: weightedPick(state.rng, GRASP_KEYS, key => {
      if(key === 'claws') return 0.3 + cell.traits.aggression * 1.1 + mat.stats.sharp * 1.0;
      if(key === 'prongs') return 0.3 + cell.embodiment * 0.9 + mat.stats.load * 0.7 + cell.organization * 0.6;
      if(key === 'tenders') return 0.3 + cell.traits.signaling * 0.8 + cell.traits.memory * 0.8 + mat.stats.flex * 0.8;
      if(key === 'scoop') return 0.3 + cell.traits.sheltering * 0.7 + env.resource * 0.8 + mat.stats.mass * 0.4;
      if(key === 'jaws') return 0.3 + cell.traits.aggression * 1.2 + env.danger * 0.8;
      return 1;
    }),
    utility: weightedPick(state.rng, UTILITY_KEYS, key => {
      if(key === 'pouch') return 0.3 + env.resource * 1.0 + mat.stats.mass * 0.5 + cell.organization * 0.4;
      if(key === 'shield') return 0.3 + cell.traits.sheltering * 1.0 + env.danger * 0.8 + mat.stats.durability * 0.7;
      if(key === 'spike') return 0.3 + cell.traits.aggression * 1.0 + mat.stats.sharp * 1.0;
      if(key === 'nester') return 0.3 + cell.traits.sheltering * 1.1 + cell.traits.memory * 0.9 + env.cover * 0.7;
      if(key === 'harness') return 0.3 + cell.organization * 1.1 + cell.embodiment * 0.8 + mat.stats.load * 0.6;
      return 1;
    }),
    shell: weightedPick(state.rng, SHELL_KEYS, key => {
      if(key === 'none') return 0.3 + cell.traits.mobility * 0.8 + env.volatility * 0.6;
      if(key === 'plates') return 0.3 + cell.embodiment * 1.0 + mat.stats.durability * 1.0 + env.danger * 0.8;
      if(key === 'frill') return 0.3 + cell.traits.signaling * 1.1 + state.laws.signalingBias * 0.8;
      if(key === 'ring') return 0.3 + cell.organization * 1.0 + env.safe * 0.8 + env.stability * 0.7;
      if(key === 'hood') return 0.3 + cell.traits.sheltering * 1.0 + cell.traits.memory * 0.7 + env.cover * 0.7;
      return 1;
    })
  };

  return {
    id: state.archetypes.length + state.lineages.length + cell.id,
    name: nameFromSyllables(state.rng),
    tribeId,
    modules,
    scale: clamp(
      0.82 + cell.embodiment * 0.28 + mat.stats.mass * 0.10 + mat.stats.load * 0.10 - mat.stats.flex * 0.04,
      0.72,
      1.34
    ),
    hueShift: (tribe ? tribe.palette.primaryHue - state.palette.baseHue : 0) + mat.signal * 16 - env.danger * 8
  };
}

function generateMaterials(rng, origin, palette){
  const count = randInt(rng, 8, 10);
  const choices = shuffle(rng, STRUCTURES).slice(0, count);
  const materials = [];
  for(let i = 0; i < choices.length; i++){
    const st = choices[i];
    const hueShift = randRange(rng, -65, 65) + i * (360 / count) * 0.22 + origin.contrast * 18;
    const sat = lerp(34, 72, (origin.contrast + 1) * 0.5) + randRange(rng, -8, 8);
    const light = 42 + randRange(rng, -10, 10) + st.stats.insulation * 10 - st.stats.mass * 8;
    const physical = st.stats.flex > 0.7 ? 'elastic' : st.stats.stick > 0.7 ? 'adhesive' : st.stats.durability > 0.7 ? 'durable' : st.stats.sharp > 0.7 ? 'brittle-sharp' : 'mixed';
    const visual = origin.angularity > 0.2 ? (st.edge === 'soft' ? 'faceted-soft' : 'broken-edge') : (st.edge === 'jagged' ? 'wobbling-jag' : 'curved-edge');
    const name = `${nameFromSyllables(rng)} ${st.key.replace('-like','').replace('ous','ous')}`;
    const anchors = [
      { x: randRange(rng, 180, WORLD_W - 180), y: randRange(rng, 180, WORLD_H - 180), r: randRange(rng, 240, 480) },
      { x: randRange(rng, 180, WORLD_W - 180), y: randRange(rng, 180, WORLD_H - 180), r: randRange(rng, 220, 520) }
    ];
    materials.push({
      id: i,
      name,
      structure: st.key,
      physical,
      visual,
      utility: st.utility,
      stats: JSON.parse(JSON.stringify(st.stats)),
      prefs: JSON.parse(JSON.stringify(st.prefs)),
      motif: st.motif,
      edge: st.edge,
      hue: mod(palette.baseHue + hueShift, 360),
      sat: clamp(sat, 18, 88),
      light: clamp(light, 24, 74),
      anchors,
      signal: round(st.stats.sharp * 0.42 + st.stats.load * 0.3 + st.stats.stick * 0.28, 2)
    });
  }
  return materials;
}
function getTribe(id){
  return state?.indexes?.tribes?.get(id) || state?.tribes?.find(t => t.id === id) || null;
}

function forkTribeFrom(parentTribeId, reason='split'){
  const parent = getTribe(parentTribeId);
  if(!parent) return null;

  const id = state.tribes.length;
  const tribe = JSON.parse(JSON.stringify(parent));
  tribe.id = id;
  tribe.parentTribeId = parent.id;
  tribe.name = `${nameFromSyllables(state.rng)} ${pick(state.rng, ['Fold','Wake','Choir','Ring','March'])}`;
  tribe.palette.primaryHue = mod(parent.palette.primaryHue + randRange(state.rng, -24, 24), 360);
  tribe.palette.secondaryHue = mod(parent.palette.secondaryHue + randRange(state.rng, -28, 28), 360);
  tribe.palette.glowHue = mod(parent.palette.glowHue + randRange(state.rng, -32, 32), 360);

  tribe.doctrine.migration = clamp(parent.doctrine.migration + randRange(state.rng, -0.18, 0.18), 0, 1);
  tribe.doctrine.aggression = clamp(parent.doctrine.aggression + randRange(state.rng, -0.18, 0.18), 0, 1);
  tribe.doctrine.ritual = clamp(parent.doctrine.ritual + randRange(state.rng, -0.18, 0.18), 0, 1);
  tribe.doctrine.memory = clamp(parent.doctrine.memory + randRange(state.rng, -0.18, 0.18), 0, 1);
  tribe.doctrine.curiosity = clamp(parent.doctrine.curiosity + randRange(state.rng, -0.18, 0.18), 0, 1);

  tribe.bodyStyle.silhouette = chance(state.rng, 0.45) ? pick(state.rng, SILHOUETTE_TYPES) : tribe.bodyStyle.silhouette;
  tribe.bodyStyle.pattern = chance(state.rng, 0.45) ? pick(state.rng, PATTERN_TYPES) : tribe.bodyStyle.pattern;
  tribe.bodyStyle.ornament = chance(state.rng, 0.45) ? pick(state.rng, ORNAMENT_TYPES) : tribe.bodyStyle.ornament;
  tribe.bodyStyle.motionStyle = chance(state.rng, 0.45) ? pick(state.rng, MOTION_STYLES) : tribe.bodyStyle.motionStyle;
  tribe.shelterStyle.layout = chance(state.rng, 0.5) ? pick(state.rng, SHELTER_LAYOUTS) : tribe.shelterStyle.layout;
  tribe.shelterStyle.icon = pick(state.rng, SYMBOL_TOKENS);

  tribe.symbolSet = shuffle(state.rng, SYMBOL_TOKENS).slice(0, 4);
  tribe.myths = [...parent.myths.slice(0, 2), `${reason}-${tribe.shelterStyle.icon}`];

  tribe.relationMap = {};
  for(const other of state.tribes){
    tribe.relationMap[other.id] = randRange(state.rng, -1, 1);
    other.relationMap[tribe.id] = randRange(state.rng, -1, 1);
  }

  state.tribes.push(tribe);
  return tribe;
}
function generatePhenotype(rng, modules, tribe){
  return {
    silhouette: tribe?.bodyStyle?.silhouette || pick(rng, SILHOUETTE_TYPES),
    pattern: tribe?.bodyStyle?.pattern || pick(rng, PATTERN_TYPES),
    ornament: tribe?.bodyStyle?.ornament || pick(rng, ORNAMENT_TYPES),
    motionStyle: tribe?.bodyStyle?.motionStyle || pick(rng, MOTION_STYLES),
    glyph: pick(rng, tribe?.symbolSet || SYMBOL_TOKENS),
    echoHue: randRange(rng, -18, 18)
  };
}
function generateTribes(rng, materials, count=TRIBE_COUNT){
  const tribeNames = ['Host','Choir','Fold','Wake','Ring','Band','Cairn','March','Spiral','Veil'];
  const tribes = [];

  for(let i = 0; i < count; i++){
    const sacred = pick(rng, materials);
    let taboo = pick(rng, materials);
    if(taboo.id === sacred.id) taboo = materials[(taboo.id + 1) % materials.length];

    const tribe = {
      id: i,
      name: `${nameFromSyllables(rng)} ${pick(rng, tribeNames)}`,
      parentTribeId: null,
      palette: {
        primaryHue: mod(sacred.hue + randRange(rng, -20, 20), 360),
        secondaryHue: mod(sacred.hue + randRange(rng, 35, 90), 360),
        glowHue: mod(sacred.hue + randRange(rng, 110, 180), 360)
      },
      doctrine: {
        migration: randRange(rng, 0.12, 0.92),
        aggression: randRange(rng, 0.08, 0.88),
        ritual: randRange(rng, 0.18, 0.96),
        memory: randRange(rng, 0.28, 0.98),
        curiosity: randRange(rng, 0.18, 0.94)
      },
      bodyStyle: {
        silhouette: pick(rng, SILHOUETTE_TYPES),
        pattern: pick(rng, PATTERN_TYPES),
        ornament: pick(rng, ORNAMENT_TYPES),
        motionStyle: pick(rng, MOTION_STYLES)
      },
      shelterStyle: {
        layout: pick(rng, SHELTER_LAYOUTS),
        density: randRange(rng, 0.22, 0.92),
        icon: pick(rng, SYMBOL_TOKENS)
      },
      symbolSet: shuffle(rng, SYMBOL_TOKENS).slice(0, 4),
      sacredMaterialId: sacred.id,
      tabooMaterialId: taboo.id,
      myths: [
        `ancestor-${pick(rng, ['hearth','spiral','path','ring'])}`,
        `taboo-${taboo.name.toLowerCase().replace(/\s+/g,'-')}`,
        `sacred-${sacred.name.toLowerCase().replace(/\s+/g,'-')}`
      ],
      relationMap: {}
    };

    tribes.push(tribe);
  }

  for(const a of tribes){
    for(const b of tribes){
      if(a.id === b.id) continue;
      a.relationMap[b.id] = randRange(rng, -1, 1);
    }
  }

  return tribes;
}
function chooseTribeForSpawn(materialId, zone){
  const tribe = weightedPick(state.rng, state.tribes, item => {
    let score = 1;
    if(item.sacredMaterialId === materialId) score += 2.25;
    if(item.tabooMaterialId === materialId) score *= 0.25;
    if(zone.includes('fertile') && item.doctrine.ritual > 0.55) score += 0.45;
    if(zone.includes('harsh') && item.doctrine.aggression > 0.55) score += 0.45;
    if(zone.includes('stable') && item.doctrine.memory > 0.55) score += 0.45;
    if(zone.includes('corridor') && item.doctrine.migration > 0.55) score += 0.45;
    return score;
  });
  return tribe.id;
}
function generateMacro(rng){
  function point(m=220){ return {x: randRange(rng, m, WORLD_W - m), y: randRange(rng, m, WORLD_H - m)}; }
  let fertile = point(), harsh = point(), volatile = point(), stable = point();
  for(let n = 0; n < 20; n++){
    if(dist(fertile.x, fertile.y, harsh.x, harsh.y) < WORLD_W * 0.22) harsh = point();
    if(dist(fertile.x, fertile.y, stable.x, stable.y) < WORLD_W * 0.18) stable = point();
    if(dist(volatile.x, volatile.y, stable.x, stable.y) < WORLD_W * 0.18) volatile = point();
  }
  return {
    fertile: { ...fertile, r: randRange(rng, 260, 380) },
    harsh: { ...harsh, r: randRange(rng, 260, 420) },
    volatile: { ...volatile, r: randRange(rng, 240, 380) },
    stable: { ...stable, r: randRange(rng, 220, 340) },
    corridor: { ax: stable.x, ay: stable.y, bx: fertile.x, by: fertile.y, width: randRange(rng, 80, 150) }
  };
}
function regionLabelAt(x, y, macro){
  const a = circleInfluence(x,y,macro.fertile.x,macro.fertile.y,macro.fertile.r);
  const b = circleInfluence(x,y,macro.harsh.x,macro.harsh.y,macro.harsh.r);
  const c = circleInfluence(x,y,macro.volatile.x,macro.volatile.y,macro.volatile.r);
  const d = circleInfluence(x,y,macro.stable.x,macro.stable.y,macro.stable.r);
  const e = corridorInfluence(x,y,macro.corridor);
  const best = Math.max(a,b,c,d,e);
  if(best === a) return 'fertile cradle';
  if(best === b) return 'harsh reach';
  if(best === c) return 'volatile surge';
  if(best === d) return 'stable hollow';
  return 'defensive corridor';
}
function generateStaticFields(seedInt, origin, materials, macro){
  const fertility = new Array(GRID_W * GRID_H).fill(0);
  const danger = new Array(GRID_W * GRID_H).fill(0);
  const passability = new Array(GRID_W * GRID_H).fill(0);
  const cover = new Array(GRID_W * GRID_H).fill(0);
  const volatility = new Array(GRID_W * GRID_H).fill(0);
  const stability = new Array(GRID_W * GRID_H).fill(0);
  const resource = new Array(GRID_W * GRID_H).fill(0);
  const safe = new Array(GRID_W * GRID_H).fill(0);
  const materialA = new Array(GRID_W * GRID_H).fill(0);
  const materialB = new Array(GRID_W * GRID_H).fill(0);
  const materialMix = new Array(GRID_W * GRID_H).fill(0);

  for(let gy = 0; gy < GRID_H; gy++){
    for(let gx = 0; gx < GRID_W; gx++){
      const idx = gy * GRID_W + gx;
      const x = (gx + 0.5) * CELL_W;
      const y = (gy + 0.5) * CELL_H;
      const nx = gx / GRID_W;
      const ny = gy / GRID_H;
      const edge = Math.min(nx, 1 - nx, ny, 1 - ny) * 2;
      const fertileBoost = circleInfluence(x, y, macro.fertile.x, macro.fertile.y, macro.fertile.r);
      const harshBoost = circleInfluence(x, y, macro.harsh.x, macro.harsh.y, macro.harsh.r);
      const volatileBoost = circleInfluence(x, y, macro.volatile.x, macro.volatile.y, macro.volatile.r);
      const stableBoost = circleInfluence(x, y, macro.stable.x, macro.stable.y, macro.stable.r);
      const corridor = corridorInfluence(x, y, macro.corridor);

      const f1 = fbm(seedInt + 1001, nx * 2.8, ny * 2.8);
      const f2 = ridged(seedInt + 1002, nx * 4.1 + 1.3, ny * 4.7 - 0.8);
      const d1 = fbm(seedInt + 2001, nx * 3.4 - 0.4, ny * 3.7 + 2.1);
      const p1 = fbm(seedInt + 3001, nx * 4.8 + 3.6, ny * 4.2 - 1.2);
      const c1 = fbm(seedInt + 4001, nx * 2.2 - 4.7, ny * 2.6 + 3.0);
      const v1 = fbm(seedInt + 5001, nx * 5.4 + 0.7, ny * 5.6 - 2.5);
      const ridge = ridged(seedInt + 6001, nx * 5.1, ny * 5.1);

      const fert = clamp(0.20 + 0.30 * f1 + 0.22 * f2 + 0.40 * fertileBoost - 0.24 * harshBoost + 0.08 * origin.elasticity - 0.08 * (1 - edge), 0, 1);
      const dang = clamp(0.12 + 0.28 * d1 + 0.16 * (1 - f2) + 0.52 * harshBoost + 0.22 * volatileBoost - 0.28 * stableBoost + 0.14 * origin.volatility + 0.08 * (1 - edge), 0, 1);
      const pass = clamp(0.18 + 0.40 * p1 + 0.16 * corridor + 0.14 * f2 - 0.18 * harshBoost - 0.12 * (origin.density + 1) * 0.5, 0, 1);
      const cov = clamp(0.12 + 0.32 * c1 + 0.24 * fertileBoost + 0.18 * stableBoost + 0.10 * ((origin.branching + 1) * 0.5) - 0.08 * harshBoost, 0, 1);
      const vol = clamp(0.10 + 0.28 * v1 + 0.18 * ridge + 0.52 * volatileBoost - 0.34 * stableBoost + 0.14 * ((origin.volatility + 1) * 0.5), 0, 1);
      const stab = clamp(0.18 + 0.32 * (1 - vol) + 0.36 * stableBoost + 0.10 * pass - 0.10 * harshBoost, 0, 1);
      const res = clamp(fert * 0.54 + cov * 0.18 + pass * 0.14 + stab * 0.14 - dang * 0.10, 0, 1);
      const safeVal = clamp(cov * 0.32 + pass * 0.18 + stab * 0.30 - dang * 0.52 + fert * 0.08, 0, 1);

      fertility[idx] = fert;
      danger[idx] = dang;
      passability[idx] = pass;
      cover[idx] = cov;
      volatility[idx] = vol;
      stability[idx] = stab;
      resource[idx] = res;
      safe[idx] = safeVal;

      let bestA = -1, bestB = -1, valA = -1, valB = -1;
      for(const mat of materials){
        const pref = mat.prefs;
        const envScore = (fert * pref.fertility + dang * pref.danger + pass * pref.passability + cov * pref.cover + vol * pref.volatility + stab * pref.stability) / 3.2;
        const a1 = circleInfluence(x, y, mat.anchors[0].x, mat.anchors[0].y, mat.anchors[0].r);
        const a2 = circleInfluence(x, y, mat.anchors[1].x, mat.anchors[1].y, mat.anchors[1].r) * 0.85;
        const anchorScore = Math.max(a1, a2);
        const noise = fbm(seedInt + 9000 + mat.id * 13, nx * 7.4 + mat.id, ny * 7.2 - mat.id, 2);
        const score = envScore * 0.68 + anchorScore * 0.28 + noise * 0.04;
        if(score > valA){
          bestB = bestA; valB = valA;
          bestA = mat.id; valA = score;
        }else if(score > valB){
          bestB = mat.id; valB = score;
        }
      }
      materialA[idx] = bestA;
      materialB[idx] = bestB < 0 ? bestA : bestB;
      materialMix[idx] = clamp((valA - valB) * 0.9 + 0.2, 0.05, 1);
    }
  }

  return { fertility, danger, passability, cover, volatility, stability, resource, safe, materialA, materialB, materialMix };
}
function sampleGrid(arr, x, y){
  const gx = clamp(x / CELL_W - 0.5, 0, GRID_W - 1);
  const gy = clamp(y / CELL_H - 0.5, 0, GRID_H - 1);
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const x1 = Math.min(GRID_W - 1, x0 + 1), y1 = Math.min(GRID_H - 1, y0 + 1);
  const tx = gx - x0, ty = gy - y0;
  const i00 = y0 * GRID_W + x0;
  const i10 = y0 * GRID_W + x1;
  const i01 = y1 * GRID_W + x0;
  const i11 = y1 * GRID_W + x1;
  return lerp(lerp(arr[i00], arr[i10], tx), lerp(arr[i01], arr[i11], tx), ty);
}
function sampleCell(fields, x, y){
  const gx = clamp(Math.floor(x / CELL_W), 0, GRID_W - 1);
  const gy = clamp(Math.floor(y / CELL_H), 0, GRID_H - 1);
  const idx = gy * GRID_W + gx;
  return idx;
}
function sampleBaseEnv(x, y){
  const idx = sampleCell(state.static, x, y);
  const terrain = sampleTerrainEdits(x, y);
  return {
    fertility: clamp(state.static.fertility[idx] + terrain.fertility, 0, 1),
    danger: clamp(state.static.danger[idx] + terrain.danger, 0, 1),
    passability: clamp(state.static.passability[idx] + terrain.passability, 0, 1),
    cover: clamp(state.static.cover[idx] + terrain.cover, 0, 1),
    volatility: clamp(state.static.volatility[idx] + terrain.volatility, 0, 1),
    stability: clamp(state.static.stability[idx] + terrain.stability, 0, 1),
    resource: clamp(state.static.resource[idx] + terrain.resource, 0, 1),
    safe: clamp(state.static.safe[idx] + terrain.safe, 0, 1),
    materialId: state.static.materialA[idx],
    materialId2: state.static.materialB[idx],
    materialMix: state.static.materialMix[idx],
    zone: regionLabelAt(x, y, state.macro)
  };
}
function sampleEnv(x, y){
  const idx = sampleCell(state.static, x, y);
  const fertBase = state.static.fertility[idx];
  const dangerBase = state.static.danger[idx];
  const vol = state.static.volatility[idx];
  const worldPulse = Math.sin(state.time * 0.08) * 0.08;
  const tide = Math.sin((x * 0.002 + y * 0.0016) + state.time * (0.22 + state.motion.pulseRate * 0.18)) * 0.5 + 0.5;
  const dang = clamp(dangerBase + (vol * 0.18 * tide) + worldPulse, 0, 1);
  const fertDrift = clamp(fertBase + (state.motion.pulseRate - 1.2) * 0.02 * Math.sin(state.time * 0.5 + x * 0.003) - worldPulse, 0, 1);
  const nudges = sampleNudges(x, y);
  const terrain = sampleTerrainEdits(x, y);
  const fertility = clamp(fertDrift + nudges.fertility + terrain.fertility, 0, 1);
  const danger = clamp(dang + nudges.danger + terrain.danger, 0, 1);
  const passability = clamp(state.static.passability[idx] + terrain.passability, 0, 1);
  const cover = clamp(state.static.cover[idx] + terrain.cover, 0, 1);
  const volatility = clamp(vol + nudges.volatility + terrain.volatility, 0, 1);
  const stability = clamp(state.static.stability[idx] + nudges.stability + terrain.stability, 0, 1);
  const resource = clamp(state.static.resource[idx] + nudges.resource + terrain.resource, 0, 1);
  const safe = clamp(state.static.safe[idx] + nudges.safe + terrain.safe, 0, 1);
  return {
    fertility,
    danger,
    passability,
    cover,
    volatility,
    stability,
    resource,
    safe,
    materialId: state.static.materialA[idx],
    materialId2: state.static.materialB[idx],
    materialMix: state.static.materialMix[idx],
    zone: regionLabelAt(x, y, state.macro),
    protoFlux: clamp((fertility * 0.42 + resource * 0.34 + safe * 0.28 + nudges.proto) - danger * 0.24 - volatility * 0.08, 0, 1.4)
  };
}
function sampleBoundaryForce(cr, range=58){
  let fx = 0;
  let fy = 0;
  let pressure = 0;

  for(const frag of nearbyFromBuckets(state.spatial?.placedFragments, cr.x, cr.y, range)){
    if(frag.state !== 'placed') continue;
    if(frag.siteId == null || frag.siteId === cr.campId) continue;
    if(frag.kind !== 'wall' && frag.kind !== 'spike' && frag.kind !== 'watch' && frag.kind !== 'marker') continue;

    const dx = cr.x - frag.x;
    const dy = cr.y - frag.y;
    const d = Math.hypot(dx, dy);
    const radius = Math.max(18, frag.size * 2.2 + (frag.kind === 'spike' ? 16 : 10));
    if(d <= 0.001 || d > radius) continue;

    const strength = (1 - d / radius) * (frag.kind === 'spike' ? 1.35 : frag.kind === 'watch' ? 1.1 : 0.95);
    fx += dx / d * strength;
    fy += dy / d * strength;
    pressure += strength;
  }

  return { fx, fy, pressure };
}

function currentEra(){
  return ERA_STAGES[Math.min(state.eraIndex, ERA_STAGES.length - 1)];
}
function sampleNudges(x, y){
  const out = { fertility:0, danger:0, resource:0, safe:0, volatility:0, stability:0, proto:0 };
  if(!state || !state.nudges) return out;
  for(const nudge of state.nudges){
    const life = 1 - nudge.age / nudge.ttl;
    if(life <= 0) continue;
    const influence = circleInfluence(x, y, nudge.x, nudge.y, nudge.radius) * life * life;
    if(influence <= 0) continue;
    if(nudge.kind === 'bloom'){
      out.fertility += 0.18 * influence;
      out.resource += 0.22 * influence;
      out.volatility += 0.05 * influence;
      out.proto += 0.24 * influence;
    }else if(nudge.kind === 'shelter'){
      out.danger -= 0.24 * influence;
      out.safe += 0.22 * influence;
      out.stability += 0.18 * influence;
      out.resource += 0.06 * influence;
    }
  }
  return out;
}
function addTerrainEdit(kind, x, y, extra={}){
  if(!state) return null;
  if(!state.terrainEdits) state.terrainEdits = [];
  const radius = extra.radius ?? (kind === 'road' ? 14 : kind === 'pit' ? 20 : 18);
  const mergeRange = radius * 0.55;
  const existing = state.terrainEdits.find(edit =>
    edit.kind === kind &&
    edit.campId === (extra.campId ?? null) &&
    dist(edit.x, edit.y, x, y) < mergeRange
  );
  if(existing){
    existing.x = lerp(existing.x, x, 0.35);
    existing.y = lerp(existing.y, y, 0.35);
    existing.radius = lerp(existing.radius, radius, 0.25);
    existing.strength = clamp(existing.strength + (extra.strength ?? 0.16), 0.04, 1.4);
    existing.materialId = extra.materialId ?? existing.materialId;
    existing.age = 0;
    return existing;
  }
  const edit = {
    id: state.nextIds.terrain++,
    kind,
    x,
    y,
    radius,
    strength: clamp(extra.strength ?? 0.22, 0.04, 1.4),
    materialId: extra.materialId ?? sampleBaseEnv(x, y).materialId,
    campId: extra.campId ?? null,
    age: 0,
    phase: extra.phase ?? randRange(state.rng, 0, Math.PI * 2)
  };
  state.terrainEdits.push(edit);
  if(state.terrainEdits.length > MAX_TERRAIN_EDITS){
    state.terrainEdits.sort((a, b) => (b.strength - a.strength) || (a.age - b.age));
    state.terrainEdits.length = MAX_TERRAIN_EDITS;
  }
  return edit;
}
function sampleTerrainEdits(x, y){
  const out = { fertility:0, danger:0, resource:0, safe:0, volatility:0, stability:0, passability:0, cover:0, height:0 };
  if(!state?.terrainEdits?.length) return out;
  const nearby = nearbyFromBuckets(state.spatial?.terrainEdits, x, y, 84);
  for(const edit of nearby){
    const influence = circleInfluence(x, y, edit.x, edit.y, edit.radius) * edit.strength;
    if(influence <= 0) continue;
    if(edit.kind === 'pit'){
      out.resource -= 0.22 * influence;
      out.passability -= 0.14 * influence;
      out.danger += 0.10 * influence;
      out.cover += 0.03 * influence;
      out.height -= 0.9 * influence;
    }else if(edit.kind === 'road'){
      out.passability += 0.22 * influence;
      out.safe += 0.08 * influence;
      out.cover -= 0.06 * influence;
      out.stability += 0.05 * influence;
      out.height -= 0.16 * influence;
    }else if(edit.kind === 'berm'){
      out.cover += 0.18 * influence;
      out.safe += 0.12 * influence;
      out.danger -= 0.08 * influence;
      out.passability -= 0.05 * influence;
      out.height += 0.55 * influence;
    }else if(edit.kind === 'ramp'){
      out.passability += 0.14 * influence;
      out.safe += 0.04 * influence;
      out.stability += 0.03 * influence;
      out.height += 0.12 * influence;
    }else if(edit.kind === 'shrine'){
      out.safe += 0.12 * influence;
      out.stability += 0.14 * influence;
      out.fertility += 0.04 * influence;
      out.volatility -= 0.04 * influence;
      out.height += 0.28 * influence;
    }else if(edit.kind === 'stockpile'){
      out.resource += 0.08 * influence;
      out.safe += 0.06 * influence;
      out.cover += 0.08 * influence;
      out.passability -= 0.04 * influence;
      out.height += 0.34 * influence;
    }else if(edit.kind === 'scar'){
      out.danger += 0.18 * influence;
      out.volatility += 0.12 * influence;
      out.safe -= 0.08 * influence;
      out.resource -= 0.05 * influence;
      out.height -= 0.32 * influence;
    }
  }
  return out;
}
function nudgeFocusPoint(){
  if(ui.selected){
    if(ui.selected.type === 'camp'){
      const camp = getCamp(ui.selected.id);
      if(camp) return { x: camp.x, y: camp.y, label: camp.name, campId: camp.id };
    }
    if(ui.selected.type === 'creature'){
      const cr = getCreature(ui.selected.id);
      if(cr) return { x: cr.x, y: cr.y, label: lineageLabel(cr), campId: cr.campId || null };
    }
    if(ui.selected.type === 'fragment'){
      const frag = getFragment(ui.selected.id);
      if(frag) return { x: frag.x, y: frag.y, label: state.materials[frag.materialId].name, campId: frag.siteId || null };
    }
  }
  return { x: camera.x, y: camera.y, label: getZoomMode(), campId: null };
}
function applyNudge(kind){
  const focus = nudgeFocusPoint();
  state.nudges.push({
    id: state.nextIds.nudge++,
    kind,
    x: focus.x,
    y: focus.y,
    radius: kind === 'bloom' ? 190 : 220,
    ttl: kind === 'bloom' ? 68 : 82,
    age: 0
  });
  if(state.nudges.length > 12) state.nudges.shift();
  const label = kind === 'bloom' ? 'bloom pulse' : 'shelter pulse';
  recordEvent('nudge', `${label} applied near ${focus.label}`, focus.x, focus.y, focus.campId);
  refreshInspector(true);
}
function updateNudges(dt){
  if(!state.nudges.length) return;
  for(const nudge of state.nudges) nudge.age += dt;
  state.nudges = state.nudges.filter(nudge => nudge.age < nudge.ttl);
}
function makeProtoCell(x, y, materialId){
  const env = sampleEnv(x, y);
  const mat = state.materials[materialId];

  const organization = clamp(
    env.safe * 0.28 +
    env.stability * 0.24 +
    mat.stats.stick * 0.16 +
    mat.stats.load * 0.10 +
    state.laws.organizationBias * 0.18,
    0.08,
    1.0
  );

  const complexity = clamp(
    env.resource * 0.22 +
    env.fertility * 0.18 +
    mat.stats.flex * 0.14 +
    mat.stats.energy * 0.18 +
    state.laws.complexityBias * 0.18,
    0.08,
    1.0
  );

  const embodiment = clamp(
    env.passability * 0.12 +
    env.cover * 0.10 +
    mat.stats.durability * 0.18 +
    mat.stats.load * 0.18 +
    state.laws.embodimentPressure * 0.22,
    0.08,
    1.0
  );

  return {
    id: state.nextIds.proto++,
    x,
    y,
    homeX: x,
    homeY: y,
    vx: randRange(state.rng, -2, 2),
    vy: randRange(state.rng, -2, 2),
    materialId,
    age: 0,
    energy: randRange(state.rng, 34, 78),
    maturity: randRange(state.rng, 0.08, 0.28),
    stability: clamp((env.safe + env.stability + mat.stats.durability) * 0.33, 0.15, 0.95),
    phase: randRange(state.rng, 0, Math.PI * 2),
    niche: env.zone,
    homeZone: env.zone,
    spawned: false,
    lineageId: null,
    splits: 0,
    lastSplitTime: -999,
    lastSpawnTime: -999,
    organization,
    complexity,
    embodiment,
    traits: {
      mobility: clamp(env.passability * 0.34 + mat.stats.flex * 0.28 + state.laws.complexityBias * 0.10, 0.05, 1),
      manipulation: clamp(env.resource * 0.22 + mat.stats.stick * 0.22 + mat.stats.sharp * 0.18, 0.05, 1),
      sheltering: clamp(env.safe * 0.20 + env.cover * 0.26 + mat.stats.insulation * 0.24 + mat.stats.load * 0.10, 0.05, 1),
      aggression: clamp(env.danger * 0.28 + env.volatility * 0.14 + mat.stats.sharp * 0.26, 0.05, 1),
      signaling: clamp(state.laws.signalingBias * 0.28 + mat.stats.energy * 0.22 + env.volatility * 0.12, 0.05, 1),
      memory: clamp(state.laws.memoryBias * 0.30 + env.stability * 0.18 + env.safe * 0.14 + mat.stats.stick * 0.10, 0.05, 1)
    },
    emergence: {
      score: 0,
      stabilityTime: 0,
      ready: false
    }
  };
}
function seedProtoCells(sites){
  state.protoCells.length = 0;
  const anchorSites = [
    { x: state.macro.fertile.x, y: state.macro.fertile.y },
    { x: state.macro.stable.x, y: state.macro.stable.y },
    { x: (state.macro.corridor.ax + state.macro.corridor.bx) * 0.5, y: (state.macro.corridor.ay + state.macro.corridor.by) * 0.5 },
    { x: state.macro.volatile.x, y: state.macro.volatile.y }
  ];

  for(const site of sites.slice(0, 8)){
    const count = randInt(state.rng, 1, 2);
    for(let i = 0; i < count; i++){
      const x = clamp(site.x + randRange(state.rng, -90, 90), 24, WORLD_W - 24);
      const y = clamp(site.y + randRange(state.rng, -90, 90), 24, WORLD_H - 24);
      const env = sampleBaseEnv(x, y);
      const matId = state.rng() < env.materialMix ? env.materialId : env.materialId2;
      state.protoCells.push(makeProtoCell(x, y, matId));
      if(state.protoCells.length >= MAX_PROTO_CELLS) return;
    }
  }

  for(const site of anchorSites){
    const count = randInt(state.rng, 3, 5);
    for(let i = 0; i < count; i++){
      const x = clamp(site.x + randRange(state.rng, -120, 120), 24, WORLD_W - 24);
      const y = clamp(site.y + randRange(state.rng, -120, 120), 24, WORLD_H - 24);
      const env = sampleBaseEnv(x, y);
      const matId = state.rng() < env.materialMix ? env.materialId : env.materialId2;
      state.protoCells.push(makeProtoCell(x, y, matId));
      if(state.protoCells.length >= MAX_PROTO_CELLS) return;
    }
  }
}
function pickProtoEmergenceCandidates(limit=4){
  const ready = state.protoCells
    .filter(cell => protoReadyForEmbodiment(cell))
    .sort((a, b) => b.emergence.score - a.emergence.score);

  const chosen = [];
  const zoneSeen = new Set();
  for(const cell of ready){
    const zone = regionLabelAt(cell.x, cell.y, state.macro);
    if(zoneSeen.has(zone)) continue;
    chosen.push(cell);
    zoneSeen.add(zone);
    if(chosen.length >= limit) return chosen;
  }

  for(const cell of ready){
    if(chosen.includes(cell)) continue;
    if(chosen.every(other => dist(cell.x, cell.y, other.x, other.y) > 220)){
      chosen.push(cell);
    }
    if(chosen.length >= limit) break;
  }

  return chosen;
}
function desiredEraIndex(){
  let target = ERA_INDEX.genesis;

  if(state.time >= 8) target = ERA_INDEX.environment;
  if(state.time >= 22) target = ERA_INDEX.materials;
  if(state.time >= 40) target = ERA_INDEX.proto;

  const readyProto = state.protoCells.filter(cell => protoReadyForEmbodiment(cell)).length;
  if(state.time >= 52 || readyProto >= 1) target = ERA_INDEX.creatures;

  const activeCamps = state.camps.filter(camp => !camp.abandoned).length;
  if(state.time >= 108 || activeCamps > 0 || state.creatures.length >= 18) target = ERA_INDEX.place;

  const settled = state.camps.some(camp => !camp.abandoned && camp.level >= 2);
  if(state.time >= 190 || (activeCamps >= 3 && settled)) target = ERA_INDEX.settlements;

  const p = progressionMetrics();

  if(
    state.time >= 260 ||
    p.exchangeCamps >= 2 ||
    (p.camps >= 3 && p.avgDomesticity > 0.42)
  ){
    target = ERA_INDEX.exchange;
  }

  if(
    state.time >= 340 ||
    p.symbolicCamps >= 2 ||
    (p.exchangeCamps >= 2 && p.avgDomesticity > 0.48)
  ){
    target = ERA_INDEX.symbols;
  }

  if(
    state.time >= 440 ||
    p.frontierPairs >= 2 ||
    (p.exchangeCamps >= 2 && p.symbolicCamps >= 2)
  ){
    target = ERA_INDEX.frontiers;
  }

  if(
    state.time >= 560 ||
    p.warPairs >= 1 ||
    p.recentRaids >= 2
  ){
    target = ERA_INDEX.wars;
  }

  if(
    state.time >= 760 ||
    p.alliances >= 1 ||
    (p.settlements >= 4 && p.exchangeCamps >= 3)
  ){
    target = ERA_INDEX.confederacies;
  }

  return target;
}
function eraAnchor(key){
  if(key === 'environment') return { x:(state.macro.corridor.ax + state.macro.corridor.bx) * 0.5, y:(state.macro.corridor.ay + state.macro.corridor.by) * 0.5 };
  if(key === 'materials') return { x:state.macro.stable.x, y:state.macro.stable.y };
  if(key === 'proto'){
    const cell = state.protoCells[0];
    return cell ? { x:cell.x, y:cell.y } : { x:state.macro.fertile.x, y:state.macro.fertile.y };
  }
  if(key === 'creatures'){
    const cell = state.protoCells.find(item => item.spawned) || state.protoCells[0];
    return cell ? { x:cell.x, y:cell.y } : { x:state.macro.stable.x, y:state.macro.stable.y };
  }
  if(key === 'place' || key === 'settlements'){
    const camp = state.camps.slice().sort((a,b)=>b.score-a.score)[0];
    return camp ? { x:camp.x, y:camp.y } : { x:state.macro.stable.x, y:state.macro.stable.y };
  }
  return { x:WORLD_W * 0.5, y:WORLD_H * 0.5 };
}
function onEraUnlocked(era){
  if(era.key === 'materials'){
    while(state.fragments.length < Math.min(MATERIAL_SEED_COUNT, MAX_LOOSE_FRAGMENTS, MAX_FRAGMENTS)) spawnAmbientFragment(true);
  }else if(era.key === 'creatures'){
    const ready = pickProtoEmergenceCandidates(5);
    for(const cell of ready) spawnCreaturesFromProto(cell);
  }else if(era.key === 'place'){
    for(const cr of state.creatures){
      if(cr.campId) continue;
      const currentBase = sampleBaseEnv(cr.anchorX, cr.anchorY);
      const candidate = pickCampExpansionSite(cr.x, cr.y, 'found');
      if(candidate.score > currentBase.safe + currentBase.resource - currentBase.danger * 0.5 + 0.12 && candidate.spacing < 0.95){
        cr.anchorX = candidate.x;
        cr.anchorY = candidate.y;
      }
      cr.anchorAffinity = Math.max(cr.anchorAffinity, 68);
      const env = sampleBaseEnv(cr.anchorX, cr.anchorY);
      rememberCreature(cr, 'safe', {
        x: cr.anchorX,
        y: cr.anchorY,
        materialId: env.materialId,
        zone: env.zone
      }, 0.65);
      rememberCreature(cr, 'home', {
        x: cr.anchorX,
        y: cr.anchorY,
        materialId: env.materialId,
        zone: env.zone,
        note: 'place-making anchor'
      }, 0.52);
    }
    primeNomadFoundingFronts();
  }else if(era.key === 'settlements'){
    for(const camp of state.camps){
      camp.culture.build = clamp(camp.culture.build + 0.08, 0, 1);
    }
  }else if(era.key === 'exchange'){
    for(const camp of state.camps){
      ensureCampLexicon(camp);
      buildHouseholdEconomy(camp);
    }
  }else if(era.key === 'symbols'){
    for(const camp of state.camps){
      ensureCampLexicon(camp);
      camp.symbols.hearth = clamp((camp.symbols.hearth || 0) + 0.2, 0, 2);
    }
  }else if(era.key === 'frontiers'){
    for(const camp of state.camps){
      camp.culture.defense = clamp(camp.culture.defense + 0.08, 0, 1);
    }
  }else if(era.key === 'wars'){
    for(const camp of state.camps){
      camp.culture.aggression = clamp(camp.culture.aggression + 0.06, 0, 1);
    }
  }else if(era.key === 'confederacies'){
    for(const camp of state.camps){
      camp.society.cohesion = clamp(camp.society.cohesion + 0.08, 0, 1);
    }
  }

  const anchor = eraAnchor(era.key);
  recordEvent('era', `${era.name} era: ${era.summary}`, anchor.x, anchor.y, null);
}
function advanceEras(){
  const target = desiredEraIndex();
  while(state.eraIndex < target){
    state.eraIndex++;
    onEraUnlocked(ERA_STAGES[state.eraIndex]);
  }
}
function spawnCreaturesFromProto(cell){
  if(state.creatures.length >= MAX_CREATURES) return false;

  const localMat = state.materials[cell.materialId];
  const archetype = buildArchetypeFromProto(cell);
  const lin = makeLineage(state.rng, archetype, cell.lineageId || null, archetype.tribeId);

  lin.history.push({ t: state.time, text: `embodied from ${localMat.name} proto-life in ${cell.niche}` });
  state.lineages.push(lin);

  const clusterSize = clamp(
    Math.round(3 + cell.organization * 2 + cell.complexity * 2 + cell.embodiment * 2),
    3,
    Math.min(8, MAX_CREATURES - state.creatures.length)
  );

  for(let i = 0; i < clusterSize; i++){
    const a = randRange(state.rng, 0, Math.PI * 2);
    const r = randRange(state.rng, 10, 42);
    const cr = makeCreature(cell.x + Math.cos(a) * r, cell.y + Math.sin(a) * r, lin.id, null);
    cr.age = randRange(state.rng, 0, 36);
    cr.energy = randRange(state.rng, 68, 92);
    cr.anchorX = cell.x;
    cr.anchorY = cell.y;
    cr.anchorAffinity = state.eraIndex >= ERA_INDEX.place ? randRange(state.rng, 72, 88) : randRange(state.rng, 34, 58);
    cr.state = 'wander';
    cr.reason = 'embodying proto-law';
    cr.favoriteMaterialId = cell.materialId;
    cr.memory = clamp(0.72 + cell.traits.memory * 0.45 + randRange(state.rng, -0.08, 0.08), 0.55, 1.45);
    cr.householdId = `proto:${cell.id}`;
    rememberEpisode(cr, 'origin', { x:cell.x, y:cell.y, materialId:cell.materialId, zone:cell.niche }, 0.8);
    addSymbolToken(cr, 'fertile-mark', 0.28);
    state.creatures.push(cr);
  }

  if(state.fragments.length < MAX_FRAGMENTS - 4){
    const depositCount = randInt(state.rng, 2, 5);
    for(let i = 0; i < depositCount; i++){
      const frag = makeFragment(
        cell.x + randRange(state.rng, -24, 24),
        cell.y + randRange(state.rng, -24, 24),
        cell.materialId,
        { kind:'reactive', decay: 240, shade: 6 }
      );
      state.fragments.push(frag);
    }
  }

  cell.spawned = true;
  cell.lineageId = lin.id;
  cell.lastSpawnTime = state.time;
  cell.energy *= 0.42;
  cell.maturity *= 0.46;
  cell.emergence.ready = false;
  cell.emergence.stabilityTime = 0;

  recordEvent('lineage', `${lin.name} objectively embodied from ${localMat.name} proto-life`, cell.x, cell.y, null);
  return true;
}
function updateProtoLife(dt){
  if(state.eraIndex < ERA_INDEX.proto) return;

  const newborn = [];
  const creatureZoneCounts = countCreaturesByZone();
  const protoZoneCounts = countProtoByZone();
  const zoneFloor = zoneCreatureFloor();

  for(const cell of state.protoCells){
    const env = sampleEnv(cell.x, cell.y);
    const mat = state.materials[cell.materialId];
    const zoneBias = protoZoneDiversityBias(cell, creatureZoneCounts);
    const zoneCongestion = protoZoneCongestion(cell, protoZoneCounts);
    const cycle = 0.55 + Math.sin(state.time * (0.5 + state.motion.pulseRate) + cell.phase) * 0.45;

    const intake =
      env.protoFlux * 4.2 +
      mat.stats.energy * 1.8 +
      cycle -
      env.danger * 1.6 +
      Math.max(0, zoneBias) * 0.6 -
      zoneCongestion * 0.25;

    cell.age += dt;
    cell.energy = clamp(cell.energy + dt * state.laws.protoGrowthRate * (intake - 1.8), 0, 140);
    cell.maturity = clamp(
      cell.maturity + dt * clamp(cell.energy / 120, 0, 1.2) * (0.022 + env.safe * 0.018 + env.resource * 0.012 + Math.max(0, zoneBias) * 0.008),
      0,
      1.7
    );

    const homeDx = cell.homeX - cell.x;
    const homeDy = cell.homeY - cell.y;
    cell.vx = lerp(cell.vx, Math.cos(cell.phase + state.time * 0.18) * (1 - cell.stability) * 8 + homeDx * 0.045, dt * 0.2);
    cell.vy = lerp(cell.vy, Math.sin(cell.phase + state.time * 0.21) * (1 - cell.stability) * 8 + homeDy * 0.045, dt * 0.2);
    cell.x = clamp(cell.x + cell.vx * dt, 16, WORLD_W - 16);
    cell.y = clamp(cell.y + cell.vy * dt, 16, WORLD_H - 16);
    cell.niche = regionLabelAt(cell.x, cell.y, state.macro);

    if(cell.energy < 10) cell.maturity *= 0.96;

    const organizationTarget = clamp(
      env.safe * 0.28 +
      env.stability * 0.28 +
      mat.stats.stick * 0.20 +
      mat.stats.load * 0.14 +
      state.laws.organizationBias * 0.20 +
      clamp(cell.maturity / 1.2, 0, 1) * 0.24 -
      env.volatility * 0.08 +
      Math.max(0, zoneBias) * 0.08,
      0,
      1.3
    );

    const complexityTarget = clamp(
      env.resource * 0.22 +
      env.fertility * 0.18 +
      mat.stats.flex * 0.18 +
      mat.stats.energy * 0.20 +
      mat.stats.sharp * 0.08 +
      state.laws.complexityBias * 0.20 +
      clamp(cell.maturity / 1.2, 0, 1) * 0.28 +
      cell.splits * 0.04 +
      Math.max(0, zoneBias) * 0.08,
      0,
      1.3
    );

    const embodimentTarget = clamp(
      env.passability * 0.16 +
      env.cover * 0.14 +
      mat.stats.durability * 0.20 +
      mat.stats.load * 0.18 +
      mat.stats.mass * 0.10 +
      state.laws.embodimentPressure * 0.22 +
      clamp(cell.maturity / 1.2, 0, 1) * 0.24 -
      env.danger * 0.03 +
      Math.max(0, zoneBias) * 0.06,
      0,
      1.3
    );

    cell.organization = lerp(cell.organization, organizationTarget, dt * 0.12);
    cell.complexity = lerp(cell.complexity, complexityTarget, dt * 0.12);
    cell.embodiment = lerp(cell.embodiment, embodimentTarget, dt * 0.12);

    const mobilityTarget = clamp(env.passability * 0.34 + mat.stats.flex * 0.26 + cell.complexity * 0.14, 0, 1.2);
    const manipulationTarget = clamp(env.resource * 0.18 + mat.stats.stick * 0.18 + mat.stats.sharp * 0.18 + cell.complexity * 0.18, 0, 1.2);
    const shelteringTarget = clamp(env.safe * 0.18 + env.cover * 0.20 + mat.stats.insulation * 0.20 + mat.stats.load * 0.08 + cell.organization * 0.10, 0, 1.2);
    const aggressionTarget = clamp(env.danger * 0.24 + mat.stats.sharp * 0.18 + env.volatility * 0.10 + cell.embodiment * 0.08, 0, 1.2);
    const signalingTarget = clamp(state.laws.signalingBias * 0.22 + mat.stats.energy * 0.18 + cell.complexity * 0.12 + cell.organization * 0.08, 0, 1.2);
    const memoryTarget = clamp(state.laws.memoryBias * 0.24 + env.stability * 0.18 + env.safe * 0.14 + mat.stats.stick * 0.08 + cell.organization * 0.10, 0, 1.2);

    cell.traits.mobility = lerp(cell.traits.mobility, mobilityTarget, dt * 0.10);
    cell.traits.manipulation = lerp(cell.traits.manipulation, manipulationTarget, dt * 0.10);
    cell.traits.sheltering = lerp(cell.traits.sheltering, shelteringTarget, dt * 0.10);
    cell.traits.aggression = lerp(cell.traits.aggression, aggressionTarget, dt * 0.10);
    cell.traits.signaling = lerp(cell.traits.signaling, signalingTarget, dt * 0.10);
    cell.traits.memory = lerp(cell.traits.memory, memoryTarget, dt * 0.10);

    cell.emergence.score = protoEmergenceScore(cell, env, mat, zoneBias, zoneCongestion);

    const objectivelyReady =
      cell.maturity >= 0.85 &&
      cell.energy > 54 &&
      cell.organization >= PROTO_MIN_ORGANIZATION &&
      cell.complexity >= PROTO_MIN_COMPLEXITY &&
      cell.embodiment >= PROTO_MIN_EMBODIMENT &&
      cell.emergence.score >= Math.max(0.55, state.laws.emergenceThreshold - 0.12);

    if(objectivelyReady){
      cell.emergence.stabilityTime += dt;
    }else{
      cell.emergence.stabilityTime = Math.max(0, cell.emergence.stabilityTime - dt * 1.4);
    }

    cell.emergence.ready = cell.emergence.stabilityTime >= state.laws.stabilizationTime;

    if(
      cell.energy > 94 &&
      cell.maturity > 0.68 &&
      cell.organization > 0.46 &&
      state.protoCells.length + newborn.length < MAX_PROTO_CELLS &&
      zoneCongestion < 1.1 &&
      (state.time - cell.lastSplitTime) > (18 - env.safe * 6)
    ){
      cell.lastSplitTime = state.time;
      cell.splits++;
      newborn.push(makeProtoCell(
        clamp(cell.x + randRange(state.rng, -36, 36), 16, WORLD_W - 16),
        clamp(cell.y + randRange(state.rng, -36, 36), 16, WORLD_H - 16),
        chance(state.rng, 0.72) ? cell.materialId : sampleEnv(cell.x, cell.y).materialId
      ));
      cell.energy *= 0.72;
    }

    if(
      state.eraIndex >= ERA_INDEX.creatures &&
      protoReadyForEmbodiment(cell) &&
      (
        state.creatures.length < CREATURE_EMERGENCE_TARGET ||
        (creatureZoneCounts[cell.homeZone || cell.niche] || 0) < zoneFloor
      ) &&
      state.creatures.length < MAX_CREATURES
    ){
      const before = state.creatures.length;
      spawnCreaturesFromProto(cell);
      const spawned = state.creatures.length - before;
      if(spawned > 0){
        const zone = cell.homeZone || cell.niche;
        creatureZoneCounts[zone] = (creatureZoneCounts[zone] || 0) + spawned;
      }
    }
  }


  if(newborn.length) state.protoCells.push(...newborn);
}

function chooseModuleKey(rng, keys, weights){
  return weightedPick(rng, keys, key => weights[key] || 1);
}
function generateArchetype(rng, origin, index){
  const angular = (origin.angularity + 1) * 0.5;
  const elastic = (origin.elasticity + 1) * 0.5;
  const branch = (origin.branching + 1) * 0.5;
  const pulse = (origin.pulse + 1) * 0.5;
  const density = (origin.density + 1) * 0.5;

  const coreWeights = { bulb:1 + elastic, spindle:1 + (1-density), slab:1 + density + angular, ring:1 + pulse, wedge:1 + angular };
  const moveWeights = { legs:1 + angular * 0.5, fins:1 + elastic * 0.8, tendrils:1 + branch + pulse, pads:1 + density, segmented:1 + pulse + branch * 0.4 };
  const graspWeights = { claws:1 + angular, prongs:1 + density*0.4, tenders:1 + elastic + branch * 0.6, scoop:1 + density*0.7, jaws:1 + angular * 0.8 };
  const utilityWeights = { pouch:1 + density*0.8, shield:1 + angular*0.6, spike:1 + angular + (origin.volatility+1)*0.35, nester:1 + branch*0.8 + pulse*0.2, harness:1 + (1-density) + branch*0.2 };
  const shellWeights = { none:1 + elastic*0.5 + (1-density), plates:1 + angular + density, frill:1 + branch, ring:1 + pulse + density*0.3, hood:1 + elastic*0.3 + pulse*0.3 };

  const modules = {
    core: chooseModuleKey(rng, CORE_KEYS, coreWeights),
    move: chooseModuleKey(rng, MOVE_KEYS, moveWeights),
    grasp: chooseModuleKey(rng, GRASP_KEYS, graspWeights),
    utility: chooseModuleKey(rng, UTILITY_KEYS, utilityWeights),
    shell: chooseModuleKey(rng, SHELL_KEYS, shellWeights)
  };

  return {
    id:index,
    name: nameFromSyllables(rng),
    modules,
    scale: randRange(rng, 0.82, 1.22),
    hueShift: randRange(rng, -28, 28)
  };
}
function makeLineage(rng, archetype, parentId=null, tribeId=null){
  const resolvedTribeId = tribeId != null
    ? tribeId
    : (archetype.tribeId != null ? archetype.tribeId : randInt(rng, 0, Math.max(0, state.tribes.length - 1)));

  const tribe = getTribe(resolvedTribeId);

  const lin = {
    id: state.nextIds.lineage++,
    name: nameFromSyllables(rng),
    parentId,
    tribeId: resolvedTribeId,
    modules: JSON.parse(JSON.stringify(archetype.modules)),
    scale: clamp(archetype.scale + randRange(rng, -0.08, 0.08), 0.72, 1.32),
    hueShift: archetype.hueShift + randRange(rng, -14, 14),
    roleBias: ROLE_ORDER[randInt(rng, 0, ROLE_ORDER.length - 1)],
    phenotype: generatePhenotype(rng, archetype.modules, tribe),
    history:[]
  };

  return lin;
}
function mutateModules(rng, modules){
  const out = JSON.parse(JSON.stringify(modules));
  const slots = ['core','move','grasp','utility','shell'];
  const slot = pick(rng, slots);
  if(slot === 'core') out.core = pick(rng, CORE_KEYS);
  if(slot === 'move') out.move = pick(rng, MOVE_KEYS);
  if(slot === 'grasp') out.grasp = pick(rng, GRASP_KEYS);
  if(slot === 'utility') out.utility = pick(rng, UTILITY_KEYS);
  if(slot === 'shell') out.shell = pick(rng, SHELL_KEYS);
  return out;
}
