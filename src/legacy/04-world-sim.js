function populateWorld(){
  const sites = findPromisingSites(8);

  state.tribes = generateTribes(state.rng, state.materials, TRIBE_COUNT);

  const archetypes = [];
  const archCount = randInt(state.rng, 6, 10);
  for(let i = 0; i < archCount; i++){
    const arch = generateArchetype(state.rng, state.origin, i);
    arch.tribeId = randInt(state.rng, 0, state.tribes.length - 1);
    archetypes.push(arch);
  }

  state.archetypes = archetypes;
  state.pendingSites = sites;
  seedProtoCells(sites);
  state.lineages.length = 0;
  state.camps.length = 0;
  state.creatures.length = 0;
  state.fragments.length = 0;
  state.deposits = generateDeposits(DEPOSIT_COUNT);
}

function spawnAmbientFragment(initial=false){
  if(state.eraIndex < ERA_INDEX.materials || state.fragments.length >= MAX_FRAGMENTS || !(state.deposits || []).length) return;
  const looseCount = state.fragments.reduce((sum, frag) => sum + (frag.state === 'loose' ? 1 : 0), 0);
  if(looseCount >= MAX_LOOSE_FRAGMENTS) return;
  let tries = 0;
  while(tries++ < 24){
    const deposit = pick(state.rng, state.deposits.filter(item => item.quantity > 1.2));
    if(!deposit) return;
    const chanceScore = depositAvailability(deposit) * 0.64 + deposit.richness * 0.3;
    if(!initial && state.rng() > chanceScore) continue;
    const angle = randRange(state.rng, -Math.PI, Math.PI);
    const radius = randRange(state.rng, deposit.radius * 0.28, deposit.radius * 0.8);
    const frag = createChunkFromDeposit(deposit, {
      x: clamp(deposit.x + Math.cos(angle) * radius, 12, WORLD_W - 12),
      y: clamp(deposit.y + Math.sin(angle) * radius, 12, WORLD_H - 12),
      state: 'loose',
      vx: Math.cos(angle) * randRange(state.rng, 1, 6),
      vy: Math.sin(angle) * randRange(state.rng, 1, 6)
    }, false);
    if(!frag) continue;
    state.fragments.push(frag);
    return;
  }
}

function creaturePower(cr){
  const offense = cr.stats.attack * 1.15 + cr.stats.speed / 80;
  const defense = cr.stats.defense * 0.85 + cr.stats.stability * 0.3;
  const carry = cr.carriedId ? (getFragment(cr.carriedId)?.usefulness || 0) * 0.4 : 0;
  return offense + defense + carry;
}
function worldTitle(origin){
  const parts = [];
  parts.push(origin.angularity > 0.2 ? 'Facet' : origin.angularity < -0.2 ? 'Curve' : 'Fold');
  parts.push(origin.pulse > 0.2 ? 'Pulse' : origin.elasticity < -0.2 ? 'Crack' : 'Drift');
  parts.push(origin.volatility > 0.2 ? 'March' : 'Hollow');
  return parts.join(' ');
}

function newWorld(seedStr){
  ui.paused = false;
  pauseBtn.textContent = 'Pause';
  const seedInt = hashString(seedStr);
  const rng = mulberry32(seedInt);
  state = {
    version: 4,
    seedStr,
    seedInt,
    rng,
    time: 0,
    worldName: worldTitle(generateOrigin(mulberry32(seedInt))),
    origin: null,
    palette: null,
    motion: null,
    materials: [],
    laws: null,
    macro: null,
    static: null,
    camps: [],
    lineages: [],
    archetypes: [],
    creatures: [],
    fragments: [],
    deposits: [],
    terrainEdits: [],
    protoCells: [],
    nudges: [],
    pendingSites: [],
    activeSignals: [],
    recentRaids: [],
    events: [],
    trails: new Array(GRID_W * GRID_H).fill(0),
    snapshots: [],
    migrationFlows: [],
    remnants: [],
    combatFx: [],
    forecast: null,
    eraIndex: 0,
    nextIds: { creature:1, fragment:1, deposit:1, terrain:1, camp:1, lineage:1, event:1, proto:1, nudge:1 },
    lastSnapshot: 0,
    lastAmbientSpawn: 0
  };
  state.origin = generateOrigin(rng);
  state.palette = generatePalette(rng, state.origin);
  state.motion = generateMotion(state.origin, rng);
  state.materials = generateMaterials(rng, state.origin, state.palette);
  state.macro = generateMacro(rng);
  state.laws = generateWorldLaws(state.origin, state.materials, state.macro);
  state.static = generateStaticFields(seedInt, state.origin, state.materials, state.macro);
  state.worldName = `${seededWords(seedInt)} / ${worldTitle(state.origin)}`;
  populateWorld();
  recordEvent('founding', `world seeded from ${seedStr}`, WORLD_W * 0.5, WORLD_H * 0.5, null);
  recordEvent('era', `Genesis era: ${ERA_STAGES[0].summary}`, WORLD_W * 0.5, WORLD_H * 0.5, null);
  camera.x = state.macro.stable.x;
  camera.y = state.macro.stable.y;
  camera.zoom = camera.targetZoom = 0.46;
  ui.selected = null;
  ui.replay = false;
  ui.liveBackup = null;
  ui.pauseBeforeReplay = false;
  accumulator = 0;
  updateSpeedLabel();
  clearForecast();
  rebuildIndexes();
  recordSnapshot();
  refreshInspector(true);
}

function recordEvent(type, text, x, y, campId=null){
  state.events.push({
    id: state.nextIds.event++,
    type,
    text,
    x, y,
    campId,
    time: state.time
  });
  if(state.events.length > 120) state.events.shift();
  if(campId){
    const camp = getCamp(campId);
    if(camp){
      camp.history.push({ t: state.time, text });
      if(camp.history.length > 18) camp.history.shift();
    }
  }
}
function nearestCamp(x, y, limit=1e9){
  let best = null, bestD = limit * limit;
  const pool = nearbyFromBuckets(state.spatial?.camps, x, y, limit);
  for(const camp of pool){
    if(camp.abandoned) continue;
    const d2 = distSq(x,y,camp.x,camp.y);
    if(d2 < bestD){ bestD = d2; best = camp; }
  }
  return best;
}
function campSpacingPenalty(x, y, preferred=280){
  let penalty = 0;
  for(const camp of nearbyFromBuckets(state.spatial?.camps, x, y, preferred * 1.8)){
    if(camp.abandoned) continue;
    const d = dist(x, y, camp.x, camp.y);
    if(d > preferred * 1.8) continue;
    const pressure = Math.max(0, 1 - d / (preferred * 1.8));
    penalty += pressure * pressure * (1.4 + camp.population * 0.026 + camp.level * 0.22);
  }
  return penalty;
}
function pickCampExpansionSite(originX, originY, mode='found'){
  let best = null;
  let bestScore = -Infinity;
  const activeCamps = state.camps.filter(camp => !camp.abandoned).length;
  const earlyFrontier = mode === 'found' && activeCamps < 2;
  const originZone = regionLabelAt(originX, originY, state.macro);
  const campCounts = countActiveCampsByZone();
  const localPressure = campSpacingPenalty(originX, originY, mode === 'split' ? 360 : 320);
  const minRadius = mode === 'split'
    ? 320
    : earlyFrontier
      ? 180
      : 150 + Math.min(180, localPressure * 70);
  const maxRadius = mode === 'split'
    ? 920
    : earlyFrontier
      ? 760
      : 640 + Math.min(280, activeCamps * 24 + localPressure * 90);
  const sampleCount = mode === 'split' ? 36 : 56;
  const candidates = [];

  for(let i = 0; i < sampleCount; i++){
    const ang = randRange(state.rng, -Math.PI, Math.PI);
    const rad = randRange(state.rng, minRadius, maxRadius);
    const x = clamp(originX + Math.cos(ang) * rad, 24, WORLD_W - 24);
    const y = clamp(originY + Math.sin(ang) * rad, 24, WORLD_H - 24);
    candidates.push({ x, y, strategic:false });
  }

  for(const site of state.pendingSites || []){
    candidates.push({ x:site.x, y:site.y, strategic:true });
  }

  for(const candidate of candidates){
    const x = candidate.x;
    const y = candidate.y;
    const env = sampleBaseEnv(x, y);
    const zone = env.zone || regionLabelAt(x, y, state.macro);
    const d = dist(originX, originY, x, y);
    const spacing = campSpacingPenalty(x, y, mode === 'split' ? 380 : 330);
    const zoneBias = campZoneDiversityBias(zone, campCounts);
    const distanceReward = mode === 'split'
      ? clamp((d - 260) / 520, 0, 1.1)
      : earlyFrontier
        ? clamp(d / 620, 0, 0.7)
        : clamp((d - 170) / 520, 0, 1.05);
    const tooNearPenalty = mode === 'split'
      ? 0
      : clamp((180 - d) / 180, 0, 1) * (activeCamps >= 1 ? 0.42 : 0.18);
    const sameZonePenalty = zone === originZone && (campCounts[zone] || 0) > 0
      ? clamp((campCounts[zone] - 1) * 0.16, 0, 0.52)
      : 0;
    const score =
      env.safe * 1.16 +
      env.resource * 0.98 +
      env.cover * 0.2 +
      env.passability * 0.2 -
      env.danger * 1.08 -
      spacing * 1.12 +
      zoneBias * 0.44 +
      distanceReward * 0.34 +
      (candidate.strategic ? 0.18 + zoneBias * 0.08 : 0) -
      tooNearPenalty -
      sameZonePenalty;

    if(score > bestScore){
      bestScore = score;
      best = { x, y, env, score, spacing, zoneBias, strategic:!!candidate.strategic };
    }
  }

  return best || { x:originX, y:originY, env:sampleBaseEnv(originX, originY), score:-Infinity, spacing:0 };
}
function campHouseholdRecord(camp, householdId){
  return camp.households?.find(h => h.id === householdId) || camp.households?.[0] || null;
}
function strongestHouseholdNeed(house){
  let bestKey = 'shelter';
  let bestValue = -Infinity;
  for(const key of Object.keys(HOUSEHOLD_TARGETS)){
    const value = (house?.deficit?.[key] || 0) - (house?.surplus?.[key] || 0) * 0.25;
    if(value > bestValue){
      bestValue = value;
      bestKey = key;
    }
  }
  return bestKey;
}
function nearestThreat(cr, range=90){
  let best = null, bestD = range * range;
  const pool = nearbyFromBuckets(state.spatial?.creatures, cr.x, cr.y, range);
  for(const other of pool){
    if(other.id === cr.id || !other.alive) continue;
    if(other.campId === cr.campId && other.lineageId === cr.lineageId) continue;
    const d2 = distSq(cr.x, cr.y, other.x, other.y);
    if(d2 < bestD){
      const threat = creaturePower(other) * (other.campId && other.campId !== cr.campId ? 1.1 : 0.8);
      if(threat > creaturePower(cr) * 0.65 || chance(state.rng, 0.18)) {
        best = other;
        bestD = d2;
      }
    }
  }
  return best;
}
function materialPickupScore(cr, camp, house, materialId, distance, weight, usefulness, energyValue, richness=0){
  const mat = state.materials[materialId];
  let score = usefulness * 1.3 + (energyValue || 0) * (cr.energy < 35 ? 1.3 : 0.25);
  score -= weight > cr.stats.carry * 1.15 ? 3.5 : weight * 0.05;
  if(camp){
    score += camp.culture.prefMaterials[materialId] * 0.9;
    score += mat.stats.load * 0.25 + mat.stats.stick * 0.2 + mat.stats.sharp * (camp.culture.defense * 0.35);
    const profile = materialNeedProfile(materialId);
    score += (house?.deficit?.food || 0) * profile.food * 0.12;
    score += (house?.deficit?.shelter || 0) * profile.shelter * 0.08;
    score += (house?.deficit?.defense || 0) * profile.defense * 0.08;
    score += (house?.deficit?.ritual || 0) * profile.ritual * 0.06;
    score += (house?.deficit?.trade || 0) * profile.trade * 0.05;
    if(cr.role === 'builder') score += profile.shelter * 0.45 + profile.defense * 0.35 + profile.ritual * 0.18;
    if(cr.role === 'carrier') score += profile.food * 0.2 + profile.trade * 0.25;
  }else{
    score += sampleEnv(cr.x, cr.y).safe * 0.12;
  }
  if(cr.favoriteMaterialId === materialId) score += 0.85 + (cr.memory || 1) * 0.25;
  score += richness * 0.48;
  score -= distance * 0.006;
  return score;
}
function bestFragmentFor(cr, range=180){
  let best = null;
  let bestScore = -Infinity;
  const camp = getCamp(cr.campId);
  const house = camp ? campHouseholdRecord(camp, cr.householdId) : null;
  for(const frag of nearbyFromBuckets(state.spatial?.looseFragments, cr.x, cr.y, range)){
    if(frag.state !== 'loose') continue;
    const d2 = distSq(cr.x, cr.y, frag.x, frag.y);
    if(d2 > range * range) continue;
    const distance = Math.sqrt(d2);
    const score = materialPickupScore(cr, camp, house, frag.materialId, distance, frag.weight, frag.usefulness, frag.energyValue, 0);
    if(score > bestScore){
      bestScore = score;
      best = {
        type: 'fragment',
        id: frag.id,
        x: frag.x,
        y: frag.y,
        materialId: frag.materialId,
        weight: frag.weight,
        usefulness: frag.usefulness,
        energyValue: frag.energyValue,
        score
      };
    }
  }
  return best;
}
function bestDepositFor(cr, range=240){
  let best = null;
  let bestScore = -Infinity;
  const camp = getCamp(cr.campId);
  const house = camp ? campHouseholdRecord(camp, cr.householdId) : null;
  for(const deposit of nearbyFromBuckets(state.spatial?.deposits, cr.x, cr.y, range)){
    if((deposit.quantity || 0) < 0.95) continue;
    const d2 = distSq(cr.x, cr.y, deposit.x, deposit.y);
    if(d2 > range * range) continue;
    const spec = depositYieldSpec(deposit);
    if(spec.weight > cr.stats.carry * 1.35) continue;
    const distance = Math.sqrt(d2);
    let score = materialPickupScore(cr, camp, house, deposit.materialId, distance, spec.weight, spec.usefulness, spec.energyValue, deposit.richness);
    score += depositAvailability(deposit) * 1.4;
    if(camp && dist(camp.x, camp.y, deposit.x, deposit.y) < camp.territoryRadius * 1.6) score += 0.8;
    if(score > bestScore){
      bestScore = score;
      best = {
        type: 'deposit',
        id: deposit.id,
        x: deposit.x,
        y: deposit.y,
        materialId: deposit.materialId,
        weight: spec.weight,
        usefulness: spec.usefulness,
        energyValue: spec.energyValue,
        quantity: deposit.quantity,
        score
      };
    }
  }
  return best;
}
function bestMaterialTargetFor(cr, range=220){
  const loose = bestFragmentFor(cr, range * 0.82);
  const deposit = bestDepositFor(cr, range);
  if(!loose) return deposit;
  if(!deposit) return loose;
  return deposit.score > loose.score + 0.45 ? deposit : loose;
}
function edibleFragmentNear(cr, range=120){
  let best = null, bestScore = -Infinity;
  for(const frag of nearbyFromBuckets(state.spatial?.looseFragments, cr.x, cr.y, range)){
    if(frag.state !== 'loose' || frag.energyValue < 0.2) continue;
    const d2 = distSq(cr.x, cr.y, frag.x, frag.y);
    if(d2 > range * range) continue;
    const score = frag.energyValue * 1.8 - Math.sqrt(d2) * 0.01;
    if(score > bestScore){
      bestScore = score;
      best = {
        type: 'fragment',
        id: frag.id,
        x: frag.x,
        y: frag.y,
        materialId: frag.materialId,
        energyValue: frag.energyValue,
        score
      };
    }
  }
  return best;
}
function edibleDepositNear(cr, range=150){
  let best = null, bestScore = -Infinity;
  for(const deposit of nearbyFromBuckets(state.spatial?.deposits, cr.x, cr.y, range)){
    if((deposit.quantity || 0) < 0.95) continue;
    const spec = depositYieldSpec(deposit);
    if(spec.energyValue < 0.2) continue;
    if(spec.weight > cr.stats.carry * 1.35) continue;
    const d2 = distSq(cr.x, cr.y, deposit.x, deposit.y);
    if(d2 > range * range) continue;
    const score = spec.energyValue * 1.95 + deposit.richness * 0.24 - Math.sqrt(d2) * 0.009;
    if(score > bestScore){
      bestScore = score;
      best = {
        type: 'deposit',
        id: deposit.id,
        x: deposit.x,
        y: deposit.y,
        materialId: deposit.materialId,
        energyValue: spec.energyValue,
        quantity: deposit.quantity,
        score
      };
    }
  }
  return best;
}
function bestEdibleMaterialTarget(cr, range=140){
  const loose = edibleFragmentNear(cr, range * 0.82);
  const deposit = edibleDepositNear(cr, range);
  if(!loose) return deposit;
  if(!deposit) return loose;
  return deposit.score > loose.score + 0.25 ? deposit : loose;
}
function depositFieldAround(x, y, range=220){
  let richness = 0;
  let count = 0;
  for(const deposit of nearbyFromBuckets(state.spatial?.deposits, x, y, range)){
    if((deposit.quantity || 0) <= 0.1) continue;
    const d = dist(x, y, deposit.x, deposit.y);
    if(d > range) continue;
    const influence = clamp(1 - d / range, 0, 1) * (0.35 + depositAvailability(deposit) * 0.65);
    richness += deposit.richness * influence;
    count += influence;
  }
  return { richness, count };
}
function countNearbyNomads(x, y, radius=120){
  return getNearbyNomads(x, y, radius).length;
}
function findBetterZone(cr, mode='safe'){
  let best = null;
  let bestScore = -Infinity;
  const camp = getCamp(cr.campId);
  const memoryType = mode === 'resource' ? 'resource' : mode === 'safe' ? 'safe' : 'home';
  const remembered = strongestMemory(cr, memoryType);
  if(remembered && remembered.x != null){
    const env = sampleEnv(remembered.x, remembered.y);
    best = { x:remembered.x, y:remembered.y, env };
    bestScore = remembered.strength * 1.1 + (mode === 'safe' ? env.safe : env.resource);
  }
  for(let i = 0; i < 12; i++){
    const ang = randRange(state.rng, -Math.PI, Math.PI);
    const rad = randRange(state.rng, 80, mode === 'migrate' ? 520 : 220);
    const x = clamp(cr.x + Math.cos(ang) * rad, 20, WORLD_W - 20);
    const y = clamp(cr.y + Math.sin(ang) * rad, 20, WORLD_H - 20);
    const env = sampleEnv(x, y);
    const spacingPenalty = mode === 'migrate' ? campSpacingPenalty(x, y, 340) : 0;
    let score = 0;
    if(mode === 'safe'){
      score = env.safe * 1.3 + env.cover * 0.35 + env.passability * 0.18 - env.danger * 1.2;
    }else if(mode === 'resource'){
      score = env.resource * 1.25 + env.fertility * 0.42 + env.safe * 0.3 - env.danger * 0.6;
    }else{
      score = env.safe * 0.9 + env.resource * 0.8 + env.passability * 0.22 - env.danger * 0.7 - env.volatility * 0.15 - spacingPenalty;
      if(camp) score += dist(x,y,camp.x,camp.y) * 0.0002;
    }
    if(score > bestScore){
      bestScore = score;
      best = {x, y, env};
    }
  }
  return best || {x:cr.x,y:cr.y,env:sampleEnv(cr.x,cr.y)};
}
function pickCampJoinTarget(cr){
  const rememberedHome = strongestMemory(cr, 'home');
  const rememberedSafe = strongestMemory(cr, 'safe');
  const rememberedResource = strongestMemory(cr, 'resource');
  const localBase = sampleBaseEnv(cr.x, cr.y);
  const localFoundingScore = localBase.safe + localBase.resource * 0.9 - localBase.danger * 0.85 - campSpacingPenalty(cr.x, cr.y, 280) * 0.28;
  const activeCamps = state.camps.filter(camp => !camp.abandoned).length;
  if((cr.foundingDrive || 0) > 2.1 && localFoundingScore > 0.34) return null;
  if(activeCamps < 5 && localFoundingScore > 0.24) return null;

  if(rememberedHome?.campId){
    const homeCamp = getCamp(rememberedHome.campId);
    if(homeCamp && !homeCamp.abandoned){
      const homeDist = dist(cr.x, cr.y, homeCamp.x, homeCamp.y);
      if(homeDist < 620) return homeCamp;
    }
  }

  let best = null;
  let score = -Infinity;
  const peerCount = getNearbyNomads(cr.x, cr.y, 110).length;
  if(activeCamps < 5 && peerCount >= 1 && ((cr.foundingDrive || 0) > 1.2 || localFoundingScore > 0.12)) return null;

  for(const camp of nearbyFromBuckets(state.spatial?.camps, cr.x, cr.y, 520)){
    if(camp.abandoned) continue;

    const d = dist(cr.x, cr.y, camp.x, camp.y);
    if(d > 520) continue;

    const env = sampleEnv(camp.x, camp.y);
    const localMatId = sampleEnv(cr.x, cr.y).materialId;
    const matBias = camp.culture.prefMaterials[localMatId] || 0;

    const homeBias = rememberedHome && rememberedHome.campId === camp.id
      ? rememberedHome.strength * 1.35
      : 0;
    if(activeCamps < 3 && homeBias <= 0 && d > 240) continue;

    const safeBias = rememberedSafe && rememberedSafe.x != null
      ? Math.max(0, 1 - dist(rememberedSafe.x, rememberedSafe.y, camp.x, camp.y) / 240) * rememberedSafe.strength * 0.5
      : 0;

    const resourceBias = rememberedResource && rememberedResource.x != null
      ? Math.max(0, 1 - dist(rememberedResource.x, rememberedResource.y, camp.x, camp.y) / 280) * rememberedResource.strength * 0.28
      : 0;

    const householdBias =
      camp.householdCount * 0.16 +
      camp.domesticity * 0.8 +
      camp.society.cohesion * 0.5;

    const crowdPenalty = camp.population > 30 ? (camp.population - 30) * 0.08 : 0;

    const s =
      (camp.score * 0.09) +
      (env.safe * 0.95) +
      (env.resource * 0.72) +
      (matBias * 0.45) +
      (homeBias + safeBias + resourceBias) +
      householdBias +
      (peerCount * 0.06) -
      crowdPenalty -
      (d * 0.0027) -
      Math.max(0, localFoundingScore - 0.18) * (activeCamps < 5 ? 6.4 : 3.4);

    if(s > score){
      score = s;
      best = camp;
    }
  }

  return best;
}
function campNeedsMaterial(camp){
  return camp.storedCount < Math.max(4, camp.population * 0.7) || camp.placedCount < Math.max(2, camp.population * 0.35);
}
function removeFragment(fragmentId){
  const frag = getFragment(fragmentId);
  if(frag){
    frag.state = 'spent';
    frag.siteId = null;
    frag.holderId = null;
  }
  const index = state.fragments.findIndex(item => item.id === fragmentId);
  if(index >= 0) state.fragments.splice(index, 1);
}
function nearestCampDeposit(camp, range=Math.max(220, camp.territoryRadius * 1.9)){
  let best = null;
  let bestScore = -Infinity;
  for(const deposit of nearbyFromBuckets(state.spatial?.deposits, camp.x, camp.y, range)){
    if((deposit.quantity || 0) < 0.95) continue;
    const d = dist(camp.x, camp.y, deposit.x, deposit.y);
    if(d > range) continue;
    const score = deposit.richness * 1.6 + depositAvailability(deposit) * 1.25 - d * 0.0024;
    if(score > bestScore){
      bestScore = score;
      best = deposit;
    }
  }
  return best;
}
function projectLabel(kind){
  if(kind === 'quarry') return 'quarry';
  if(kind === 'road') return 'road braid';
  if(kind === 'berm') return 'berm ring';
  if(kind === 'ramp') return 'ramp cut';
  if(kind === 'shrine') return 'ritual node';
  return kind || 'project';
}
function chooseCampProject(camp){
  const tribe = getTribe(camp.tribeId);
  const deposit = nearestCampDeposit(camp);
  const depositGoal = deposit ? { x: deposit.x, y: deposit.y, materialId: deposit.materialId, depositId: deposit.id } : null;

  if(depositGoal && (camp.resourcePressure < 3.2 || camp.storedCount < Math.max(4, camp.population * 0.55))){
    return {
      kind: 'quarry',
      x: depositGoal.x,
      y: depositGoal.y,
      depositId: depositGoal.depositId,
      materialId: depositGoal.materialId,
      progress: 0,
      target: 6 + camp.population * 0.22 + deposit.richness * 2.2,
      startedAt: state.time,
      lastWorked: state.time,
      routeT: 0
    };
  }

  if(depositGoal && camp.pathDensity < 0.16){
    return {
      kind: 'road',
      x: lerp(camp.x, depositGoal.x, 0.55),
      y: lerp(camp.y, depositGoal.y, 0.55),
      depositId: depositGoal.depositId,
      materialId: depositGoal.materialId,
      progress: 0,
      target: 5 + dist(camp.x, camp.y, depositGoal.x, depositGoal.y) / 110,
      startedAt: state.time,
      lastWorked: state.time,
      routeT: 0
    };
  }

  if(camp.localDanger > 0.42 || (camp.structureScores?.defense || 0) < Math.max(2, camp.population * 0.16)){
    const ang = camp.routeAngle + randRange(state.rng, -0.95, 0.95);
    return {
      kind: 'berm',
      x: clamp(camp.x + Math.cos(ang) * camp.homeRadius * randRange(state.rng, 0.82, 1.05), 22, WORLD_W - 22),
      y: clamp(camp.y + Math.sin(ang) * camp.homeRadius * randRange(state.rng, 0.82, 1.05), 22, WORLD_H - 22),
      depositId: null,
      materialId: camp.dominantMaterial,
      progress: 0,
      target: 4 + camp.population * 0.18,
      startedAt: state.time,
      lastWorked: state.time,
      routeT: 0
    };
  }

  if(depositGoal){
    return {
      kind: 'ramp',
      x: lerp(camp.x, depositGoal.x, 0.72),
      y: lerp(camp.y, depositGoal.y, 0.72),
      depositId: depositGoal.depositId,
      materialId: depositGoal.materialId,
      progress: 0,
      target: 4 + dist(camp.x, camp.y, depositGoal.x, depositGoal.y) / 170,
      startedAt: state.time,
      lastWorked: state.time,
      routeT: 0
    };
  }

  if(tribe && tribe.doctrine.ritual > 0.48 && camp.domesticity > 0.3){
    const a = randRange(state.rng, 0, Math.PI * 2);
    const r = randRange(state.rng, camp.homeRadius * 0.28, camp.homeRadius * 0.56);
    return {
      kind: 'shrine',
      x: clamp(camp.x + Math.cos(a) * r, 20, WORLD_W - 20),
      y: clamp(camp.y + Math.sin(a) * r, 20, WORLD_H - 20),
      depositId: null,
      materialId: camp.dominantMaterial,
      progress: 0,
      target: 3.6 + camp.level * 1.2,
      startedAt: state.time,
      lastWorked: state.time,
      routeT: 0
    };
  }

  return null;
}
function completeCampProject(camp, note=null){
  const project = camp.activeProject;
  if(!project) return;
  const materialId = project.materialId ?? camp.dominantMaterial;
  if(project.kind === 'shrine'){
    state.fragments.push(makeFragment(project.x, project.y, materialId, {
      state: 'placed',
      siteId: camp.id,
      kind: 'hearth',
      placedAt: state.time,
      ownerHouseholdId: camp.householdNodes[0]?.id || null,
      size: 12
    }));
    camp.symbols.hearth = clamp((camp.symbols.hearth || 0) + 0.22, 0, 1.6);
  }else if(project.kind === 'berm'){
    state.fragments.push(makeFragment(project.x, project.y, materialId, {
      state: 'placed',
      siteId: camp.id,
      kind: 'wall',
      placedAt: state.time,
      ownerHouseholdId: camp.householdNodes[0]?.id || null,
      size: 11
    }));
  }else if(project.kind === 'quarry'){
    state.fragments.push(makeFragment(project.x, project.y, materialId, {
      state: 'placed',
      siteId: camp.id,
      kind: 'workshop',
      placedAt: state.time,
      ownerHouseholdId: camp.householdNodes[0]?.id || null,
      size: 11
    }));
  }
  recordEvent('project', note || `${camp.name} completed a ${projectLabel(project.kind)}`, project.x, project.y, camp.id);
  rememberCamp(camp, 'build', { x:project.x, y:project.y, materialId, note:project.kind }, 0.42);
  camp.projectCooldown = randRange(state.rng, 8, 16);
  camp.activeProject = null;
}
function updateCampProjects(camp, dt){
  camp.projectCooldown = Math.max(0, (camp.projectCooldown || 0) - dt);
  const project = camp.activeProject;
  if(project){
    project.lastWorked = project.lastWorked || state.time;
    if(project.depositId){
      const deposit = getDeposit(project.depositId);
      if(!deposit || deposit.quantity < 0.12){
        recordEvent('decline', `${camp.name} lost its ${projectLabel(project.kind)}`, project.x, project.y, camp.id);
        camp.activeProject = null;
        camp.projectCooldown = randRange(state.rng, 5, 10);
        return;
      }
      project.materialId = deposit.materialId;
      if(project.kind === 'road'){
        project.x = lerp(camp.x, deposit.x, 0.55);
        project.y = lerp(camp.y, deposit.y, 0.55);
      }else if(project.kind === 'ramp'){
        project.x = lerp(camp.x, deposit.x, 0.72);
        project.y = lerp(camp.y, deposit.y, 0.72);
      }else if(project.kind === 'quarry'){
        project.x = deposit.x;
        project.y = deposit.y;
      }
    }
    if(state.time - project.lastWorked > 34){
      recordEvent('decline', `${camp.name} abandoned a ${projectLabel(project.kind)}`, project.x, project.y, camp.id);
      camp.activeProject = null;
      camp.projectCooldown = randRange(state.rng, 6, 12);
      return;
    }
    if(project.progress >= project.target){
      completeCampProject(camp);
    }
    return;
  }

  if(camp.projectCooldown > 0 || camp.population < 3) return;
  const next = chooseCampProject(camp);
  if(!next) return;
  camp.activeProject = next;
  recordEvent('project', `${camp.name} began a ${projectLabel(next.kind)}`, next.x, next.y, camp.id);
}
function campProjectMaterialTarget(camp, cr){
  const project = camp?.activeProject;
  if(!project || !project.depositId) return null;
  const deposit = getDeposit(project.depositId);
  if(!deposit || deposit.quantity < 0.95) return null;
  const spec = depositYieldSpec(deposit);
  if(spec.weight > cr.stats.carry * 1.35) return null;
  const d = dist(cr.x, cr.y, deposit.x, deposit.y);
  let score = 9 + spec.usefulness * 8 + deposit.richness * 2.2 - d * 0.01;
  if(project.kind === 'quarry') score += 5.2;
  if(project.kind === 'road' || project.kind === 'ramp') score += 3.1;
  return {
    type: 'deposit',
    id: deposit.id,
    x: deposit.x,
    y: deposit.y,
    materialId: deposit.materialId,
    weight: spec.weight,
    usefulness: spec.usefulness,
    energyValue: spec.energyValue,
    quantity: deposit.quantity,
    score,
    projectKind: project.kind
  };
}
function recordProjectExtraction(camp, worker, deposit){
  const project = camp?.activeProject;
  if(!project || project.depositId !== deposit.id) return;
  project.progress += 0.4 + deposit.richness * 0.2;
  project.lastWorked = state.time;
  addTerrainEdit('pit',
    clamp(deposit.x + randRange(state.rng, -deposit.radius * 0.35, deposit.radius * 0.35), 12, WORLD_W - 12),
    clamp(deposit.y + randRange(state.rng, -deposit.radius * 0.35, deposit.radius * 0.35), 12, WORLD_H - 12),
    { campId:camp.id, materialId:deposit.materialId, radius:clamp(deposit.radius * 0.4, 12, 22), strength:0.1 + deposit.richness * 0.04 }
  );
  if(state.rng() < 0.18){
    addTerrainEdit('ramp',
      lerp(camp.x, deposit.x, 0.74) + randRange(state.rng, -12, 12),
      lerp(camp.y, deposit.y, 0.74) + randRange(state.rng, -12, 12),
      { campId:camp.id, materialId:deposit.materialId, radius:16, strength:0.09 }
    );
  }
  if(deposit.quantity <= 0.3 && !deposit.depletedNotified){
    deposit.depletedNotified = true;
    recordEvent('decline', `${state.materials[deposit.materialId].name} seam thinned near ${camp.name}`, deposit.x, deposit.y, camp.id);
  }
  const incidentP = 0.014 + sampleEnv(deposit.x, deposit.y).volatility * 0.035;
  if(state.rng() < incidentP){
    addTerrainEdit('scar', deposit.x + randRange(state.rng, -10, 10), deposit.y + randRange(state.rng, -10, 10), {
      campId: camp.id,
      materialId: deposit.materialId,
      radius: clamp(deposit.radius * 0.55, 14, 28),
      strength: 0.3
    });
    for(const other of getCampMembers(camp.id)){
      if(!other.alive) continue;
      const d = dist(other.x, other.y, deposit.x, deposit.y);
      if(d > 86) continue;
      other.hp -= randRange(state.rng, 4, 14) * (1 - d / 86);
      rememberCreature(other, 'threat', { x:deposit.x, y:deposit.y, campId:camp.id, note:'quarry rupture' }, 0.34);
    }
    recordEvent('rupture', `${camp.name} triggered a quarry rupture`, deposit.x, deposit.y, camp.id);
  }
}
function attemptProjectWork(camp, builder){
  const project = camp.activeProject;
  if(!project) return false;
  const frag = chooseStoredFragment(camp, builder);
  if(!frag) return false;

  let px = project.x;
  let py = project.y;
  if(project.depositId){
    const deposit = getDeposit(project.depositId);
    if(deposit){
      if(project.kind === 'road'){
        project.routeT = clamp((project.routeT || 0) + 1 / Math.max(3, project.target), 0, 1);
        px = lerp(camp.x, deposit.x, clamp(project.routeT + randRange(state.rng, -0.04, 0.04), 0.1, 0.96));
        py = lerp(camp.y, deposit.y, clamp(project.routeT + randRange(state.rng, -0.04, 0.04), 0.1, 0.96));
        addTerrainEdit('road', px, py, { campId:camp.id, materialId:frag.materialId, radius:15, strength:0.11 });
      }else if(project.kind === 'ramp'){
        px = lerp(camp.x, deposit.x, 0.72) + randRange(state.rng, -12, 12);
        py = lerp(camp.y, deposit.y, 0.72) + randRange(state.rng, -12, 12);
        addTerrainEdit('ramp', px, py, { campId:camp.id, materialId:frag.materialId, radius:17, strength:0.13 });
      }else if(project.kind === 'quarry'){
        px = deposit.x + randRange(state.rng, -18, 18);
        py = deposit.y + randRange(state.rng, -18, 18);
        addTerrainEdit(state.rng() < 0.65 ? 'ramp' : 'road', px, py, { campId:camp.id, materialId:frag.materialId, radius:16, strength:0.1 });
      }
    }
  }else if(project.kind === 'berm'){
    px = project.x + randRange(state.rng, -18, 18);
    py = project.y + randRange(state.rng, -18, 18);
    addTerrainEdit('berm', px, py, { campId:camp.id, materialId:frag.materialId, radius:20, strength:0.14 });
  }else if(project.kind === 'shrine'){
    px = project.x + randRange(state.rng, -10, 10);
    py = project.y + randRange(state.rng, -10, 10);
    addTerrainEdit('shrine', px, py, { campId:camp.id, materialId:frag.materialId, radius:16, strength:0.12 });
  }

  project.progress += 1 + state.materials[frag.materialId].stats.load * 0.18;
  project.lastWorked = state.time;
  rememberCamp(camp, 'build', { x:px, y:py, materialId:frag.materialId, note:project.kind }, 0.26);
  rememberCreature(builder, 'home', { x:px, y:py, campId:camp.id, householdId:builder.householdId, materialId:frag.materialId, note:project.kind }, 0.18);
  builder.energy = clamp(builder.energy - 2.2, 0, 100);
  removeFragment(frag.id);

  if(project.progress >= project.target){
    completeCampProject(camp);
  }
  return true;
}
function campTerrainSignature(camp){
  const out = { road:0, berm:0, shrine:0, stockpile:0, pit:0, scar:0, ramp:0 };
  if(!camp) return out;
  const radius = Math.max(96, camp.territoryRadius * 1.2);
  for(const edit of nearbyFromBuckets(state.spatial?.terrainEdits, camp.x, camp.y, radius)){
    if(edit.campId !== camp.id) continue;
    if(dist(camp.x, camp.y, edit.x, edit.y) > radius) continue;
    out[edit.kind] = (out[edit.kind] || 0) + edit.strength;
  }
  return out;
}
function refreshCampStockpiles(camp){
  if(!camp || !camp.householdNodes?.length || camp.storedCount <= 1) return;
  const clusters = Math.min(3, 1 + Math.floor(camp.storedCount / 10));
  const nodes = camp.householdNodes
    .slice()
    .sort((a, b) => ((b.count || 0) + (b.young || 0) * 0.8) - ((a.count || 0) + (a.young || 0) * 0.8))
    .slice(0, clusters);
  let ordinal = 0;
  for(const node of nodes){
    const strength = clamp(0.08 + camp.storedCount / Math.max(18, camp.population * 2.4) + (node.count || 0) * 0.015, 0.06, 0.52);
    addTerrainEdit('stockpile',
      node.x + randRange(state.rng, -5, 5),
      node.y + randRange(state.rng, -5, 5),
      {
        campId: camp.id,
        materialId: camp.dominantMaterial,
        radius: clamp(10 + (node.count || 0) * 0.9 + ordinal * 1.6, 10, 22),
        strength
      }
    );
    ordinal++;
  }
}
function seedResourceUpwelling(camp, sourceDeposit=null){
  if((state.deposits || []).length > DEPOSIT_COUNT + 14) return null;
  let target = pickCampExpansionSite(camp.x, camp.y, 'resources');
  if(!target || target.score < -0.25){
    const a = randRange(state.rng, 0, Math.PI * 2);
    const r = randRange(state.rng, 220, 420);
    target = {
      x: clamp(camp.x + Math.cos(a) * r, 32, WORLD_W - 32),
      y: clamp(camp.y + Math.sin(a) * r, 32, WORLD_H - 32),
      score: 0
    };
  }
  if(dist(camp.x, camp.y, target.x, target.y) < 160){
    const a = randRange(state.rng, 0, Math.PI * 2);
    const r = randRange(state.rng, 200, 380);
    target.x = clamp(camp.x + Math.cos(a) * r, 32, WORLD_W - 32);
    target.y = clamp(camp.y + Math.sin(a) * r, 32, WORLD_H - 32);
  }

  const env = sampleBaseEnv(target.x, target.y);
  let materialId = env.materialId;
  if(sourceDeposit && chance(state.rng, 0.42)){
    materialId = sourceDeposit.materialId;
  }else if(env.materialMix > 0.52){
    materialId = chance(state.rng, 0.5) ? env.materialId2 : env.materialId;
  }
  const mat = state.materials[materialId];
  const richness = clamp(env.resource * 0.82 + mat.stats.load * 0.18 + randRange(state.rng, 0.08, 0.32), 0.34, 1.32);
  const deposit = makeDeposit(target.x, target.y, materialId, {
    richness,
    capacity: 8 + env.resource * 12 + mat.stats.load * 3,
    radius: clamp(20 + richness * 16 + mat.stats.load * 5, 18, 38),
    zone: env.zone,
    regen: DEPOSIT_REGEN * (0.76 + richness * 0.28)
  });
  deposit.quantity = clamp(deposit.quantity * randRange(state.rng, 0.55, 0.9), 4, deposit.capacity);
  state.deposits.push(deposit);

  if(!state.pendingSites) state.pendingSites = [];
  state.pendingSites.push({ x:deposit.x, y:deposit.y, materialId:deposit.materialId, zone:deposit.zone, note:'upwelling' });
  if(state.pendingSites.length > 20) state.pendingSites.shift();

  state.migrationFlows.push({ x1:camp.x, y1:camp.y, x2:deposit.x, y2:deposit.y, t:state.time });
  if(state.migrationFlows.length > 24) state.migrationFlows.shift();

  camp.routeAngle = Math.atan2(deposit.y - camp.y, deposit.x - camp.x);
  rememberCamp(camp, 'resource', {
    x: deposit.x,
    y: deposit.y,
    materialId: deposit.materialId,
    zone: deposit.zone,
    note: 'upwelling'
  }, 0.44);
  return deposit;
}
function triggerCampSchism(camp){
  if(camp.population < 10) return false;
  const target = pickCampExpansionSite(camp.x, camp.y, 'schism');
  if(!target || target.score < -0.3) return false;

  const movers = getCampMembers(camp.id)
    .filter(cr => cr.alive && cr.age > 70 && cr.hp > 42)
    .sort((a, b) => {
      const aScore = (a.role === 'builder' ? 1.4 : 0) + (a.role === 'scout' ? 1.2 : 0) + (100 - a.anchorAffinity) * 0.012;
      const bScore = (b.role === 'builder' ? 1.4 : 0) + (b.role === 'scout' ? 1.2 : 0) + (100 - b.anchorAffinity) * 0.012;
      return bScore - aScore;
    })
    .slice(0, randInt(state.rng, 2, 4));
  if(movers.length < 2) return false;

  const splinter = chance(state.rng, 0.72) ? forkTribeFrom(camp.tribeId, 'schism') : null;
  camp.lastSplit = state.time;
  addTerrainEdit('scar', camp.x + randRange(state.rng, -16, 16), camp.y + randRange(state.rng, -16, 16), {
    campId: camp.id,
    materialId: camp.dominantMaterial,
    radius: 22,
    strength: 0.28
  });
  addTerrainEdit('shrine', target.x, target.y, {
    campId: camp.id,
    materialId: splinter?.sacredMaterialId ?? camp.dominantMaterial,
    radius: 18,
    strength: 0.18
  });

  for(const cr of movers){
    cr.campId = null;
    cr.householdId = null;
    cr.anchorX = target.x + randRange(state.rng, -42, 42);
    cr.anchorY = target.y + randRange(state.rng, -42, 42);
    cr.anchorAffinity = 34;
    cr.foundingDrive = Math.max(cr.foundingDrive || 0, 2.4);
    cr.state = 'migrate';
    cr.reason = `following a splinter omen from ${camp.name}`;
    cr.targetX = cr.anchorX;
    cr.targetY = cr.anchorY;
    rememberCreature(cr, 'home', { x:target.x, y:target.y, zone:regionLabelAt(target.x, target.y, state.macro), note:'schism front' }, 0.36);
    addSacredSite(cr, target.x, target.y, 'ancestor', 0.26);
    if(splinter){
      cr.tribeId = splinter.id;
      cr.mind.semantic.tribeAffinity[splinter.id] = 1;
      cr.mind.symbolic.mythsHeard = Object.fromEntries((splinter.myths || []).map(myth => [myth, 0.7]));
    }
  }

  state.migrationFlows.push({ x1:camp.x, y1:camp.y, x2:target.x, y2:target.y, t:state.time });
  if(state.migrationFlows.length > 24) state.migrationFlows.shift();
  emitSignal(camp.x, camp.y, camp.id, camp.tribeId, 'ritual', 0.58, SIGNAL_TTL * 1.2);
  recordEvent('schism', `${camp.name} split into a splinter doctrine`, camp.x, camp.y, camp.id);
  return true;
}
function updateCampEmergentPressure(camp, dt){
  refreshCampStockpiles(camp);
  const signature = campTerrainSignature(camp);
  camp.terrainSignature = signature;

  const project = camp.activeProject;
  if(project && project.kind === 'road' && project.progress >= project.target * 0.72 && signature.road > 0.28 && state.time - camp.lastBreakthrough > 42){
    const deposit = project.depositId ? getDeposit(project.depositId) : nearestCampDeposit(camp, Math.max(260, camp.territoryRadius * 2.1));
    if(deposit){
      for(let t = 0.12; t < 0.96; t += 0.14){
        addTerrainEdit('road',
          lerp(camp.x, deposit.x, t) + randRange(state.rng, -10, 10),
          lerp(camp.y, deposit.y, t) + randRange(state.rng, -10, 10),
          { campId:camp.id, materialId:project.materialId ?? deposit.materialId, radius:13, strength:0.08 }
        );
      }
      addTerrainEdit('ramp',
        lerp(camp.x, deposit.x, 0.84) + randRange(state.rng, -10, 10),
        lerp(camp.y, deposit.y, 0.84) + randRange(state.rng, -10, 10),
        { campId:camp.id, materialId:project.materialId ?? deposit.materialId, radius:16, strength:0.08 }
      );
      rememberCamp(camp, 'safe', {
        x: deposit.x,
        y: deposit.y,
        campId: camp.id,
        materialId: deposit.materialId,
        note: 'route breakthrough'
      }, 0.34);
      camp.routeAngle = Math.atan2(deposit.y - camp.y, deposit.x - camp.x);
      camp.lastBreakthrough = state.time;
      recordEvent('breakthrough', `${camp.name} carved a route braid to ${state.materials[deposit.materialId].name}`, deposit.x, deposit.y, camp.id);
    }
  }

  if(camp.resourcePressure < -2.8 && camp.depositAccess < 0.22 && state.time - camp.lastUpwelling > 56){
    const sourceDeposit = project?.depositId ? getDeposit(project.depositId) : nearestCampDeposit(camp, Math.max(260, camp.territoryRadius * 2.4));
    const deposit = seedResourceUpwelling(camp, sourceDeposit);
    if(deposit){
      camp.lastUpwelling = state.time;
      recordEvent('upwelling', `${state.materials[deposit.materialId].name} upwelling drew ${camp.name} outward`, deposit.x, deposit.y, camp.id);
    }
  }

  if(camp.society.tradition > 0.34 && signature.shrine > 0.14 && camp.domesticity > 0.4 && state.time - camp.lastRitualBoom > 54){
    const ritualP = dt * (0.002 + camp.society.tradition * 0.006 + signature.shrine * 0.002);
    if(state.rng() < ritualP){
      const marker = camp.ritualMarkers.length ? pick(state.rng, camp.ritualMarkers) : null;
      const rx = marker
        ? marker.x
        : clamp(camp.x + Math.cos(camp.routeAngle + randRange(state.rng, -1.1, 1.1)) * camp.homeRadius * randRange(state.rng, 0.35, 0.7), 24, WORLD_W - 24);
      const ry = marker
        ? marker.y
        : clamp(camp.y + Math.sin(camp.routeAngle + randRange(state.rng, -1.1, 1.1)) * camp.homeRadius * randRange(state.rng, 0.35, 0.7), 24, WORLD_H - 24);
      addTerrainEdit('shrine', rx, ry, {
        campId: camp.id,
        materialId: camp.dominantMaterial,
        radius: 18,
        strength: 0.16
      });
      emitSignal(rx, ry, camp.id, camp.tribeId, 'ritual', 0.62, SIGNAL_TTL * 1.25);
      for(const cr of getCampMembers(camp.id).slice(0, 6)){
        addSacredSite(cr, rx, ry, 'ancestor', 0.24);
        rememberCreature(cr, 'safe', { x:rx, y:ry, campId:camp.id, note:'ritual bloom' }, 0.18);
      }
      rememberCamp(camp, 'safe', { x:rx, y:ry, campId:camp.id, materialId:camp.dominantMaterial, note:'ritual bloom' }, 0.32);
      camp.lastRitualBoom = state.time;
      recordEvent('ritual', `${camp.name} entered a ritual bloom`, rx, ry, camp.id);
    }
  }

  if(camp.population >= 12 && camp.society.cohesion < 0.34 && camp.society.memoryLoad > 2.4 && camp.culture.migrate > 0.46 && state.time - camp.lastSchism > 90){
    const schismP = dt * (0.0015 + Math.max(0, 0.45 - camp.society.cohesion) * 0.016 + camp.society.memoryLoad * 0.0014);
    if(state.rng() < schismP && triggerCampSchism(camp)){
      camp.lastSchism = state.time;
    }
  }
}
function chooseStoredFragment(camp, builder){
  let best = null;
  let bestScore = -Infinity;

  for(const frag of getCampStoredFragments(camp.id)){
    if(frag.state !== 'stored') continue;
    const mat = state.materials[frag.materialId];
    let score = frag.usefulness;
    score += mat.stats.load * 0.4 + mat.stats.stick * camp.culture.build * 0.3 + mat.stats.sharp * camp.culture.defense * 0.3;
    score -= frag.weight * 0.03;
    if(builder.role === 'guard') score += mat.stats.sharp * 0.4;
    if(builder.role === 'builder') score += mat.stats.load * 0.2 + mat.stats.stick * 0.2;

    if(score > bestScore){
      bestScore = score;
      best = frag;
    }
  }

  return best;
}
function updateAnchor(cr, env, dt){
  if(cr.state === 'rest' || cr.state === 'graze' || cr.state === 'wander' || cr.state === 'settle'){
    const stay = env.safe * 0.7 + env.resource * 0.45 - env.danger * 0.3;
    if(dist(cr.x, cr.y, cr.anchorX, cr.anchorY) < 120){
      cr.anchorX = lerp(cr.anchorX, cr.x, 0.04);
      cr.anchorY = lerp(cr.anchorY, cr.y, 0.04);
      cr.anchorAffinity = clamp(cr.anchorAffinity + dt * (0.6 + stay) * (cr.memory || 1), 0, 100);
    }else{
      cr.anchorX = lerp(cr.anchorX, cr.x, 0.03);
      cr.anchorY = lerp(cr.anchorY, cr.y, 0.03);
      cr.anchorAffinity = clamp(cr.anchorAffinity - dt * 0.5 / Math.max(0.6, cr.memory || 1), 0, 100);
    }
  }else{
    cr.anchorAffinity = clamp(cr.anchorAffinity - dt * 0.15, 0, 100);
  }
  if(cr.campId){
    const camp = getCamp(cr.campId);
    if(camp){
      cr.anchorX = lerp(cr.anchorX, camp.x, 0.05);
      cr.anchorY = lerp(cr.anchorY, camp.y, 0.05);
      cr.anchorAffinity = clamp(cr.anchorAffinity + dt * 0.1 * (cr.memory || 1), 0, 100);
      if(cr.favoriteMaterialId == null && camp.dominantMaterial != null) cr.favoriteMaterialId = camp.dominantMaterial;
    }
  }
}
function thinkCreature(cr){
  if(!cr.alive) return;

  const env = sampleEnv(cr.x, cr.y);
  const camp = getCamp(cr.campId);
  const house = camp ? campHouseholdRecord(camp, cr.householdId) : null;
  const urgentNeed = house ? strongestHouseholdNeed(house) : null;
  const tribe = getTribe(cr.tribeId);
  const project = camp?.activeProject || null;

  const enemy = nearestThreat(cr, 110);
  const safeSpot = findBetterZone(cr, 'safe');
  const resSpot = findBetterZone(cr, 'resource');
  const migrateSpot = findBetterZone(cr, 'migrate');
  const usefulTarget = !cr.carriedId ? bestMaterialTargetFor(cr, camp ? 260 : 220) : null;
  const edibleTarget = !cr.carriedId ? bestEdibleMaterialTarget(cr, camp ? 170 : 140) : null;
  const projectTarget = camp && !cr.carriedId ? campProjectMaterialTarget(camp, cr) : null;
  const nearbyCamp = !camp ? pickCampJoinTarget(cr) : null;
  const rememberedHome = strongestMemory(cr, 'home');
  const rememberedSafe = strongestMemory(cr, 'safe');
  const ritualSite = camp ? chooseRitualSite(cr, camp) : null;

  const zoneSafety = cr.mind.semantic.zoneSafety[env.zone] ?? env.safe;
  const localMaterialValue = cr.mind.semantic.materialValue[env.materialId] ?? env.resource;
  const hearthBias = cr.mind.symbolic.tokens.hearth || 0;
  const returnBias = cr.mind.symbolic.tokens['safe-return'] || 0;
  const woundBias = cr.mind.symbolic.tokens.wound || 0;

  cr.power = creaturePower(cr);

  const intents = [];

  if(enemy && (env.danger > 0.42 || cr.energy < 54 || creaturePower(enemy) > cr.power * 1.02)){
    intents.push({
      name: 'flee',
      score: 100,
      x: camp ? camp.x : safeSpot.x,
      y: camp ? camp.y : safeSpot.y,
      id: enemy.id,
      reason: camp ? `fleeing toward ${camp.name}` : `fleeing ${enemy.role}`,
      ttl: 3.5
    });
  }

  if(cr.hp < 28){
    intents.push({
      name: 'flee',
      score: 120,
      x: camp ? camp.x : safeSpot.x,
      y: camp ? camp.y : safeSpot.y,
      reason: camp ? `returning to ${camp.name} hurt` : 'retreating from danger',
      ttl: 3
    });
  }

  if(cr.energy < 22){
    if(env.fertility > 0.52 && env.danger < 0.58){
      intents.push({
        name: 'graze',
        score: 14 + env.fertility * 8 + zoneSafety * 4,
        x: cr.x,
        y: cr.y,
        reason: 'feeding from fertile ground',
        ttl: 3.5
      });
    }

    if(edibleTarget){
      intents.push({
        name: 'collect',
        score: 16 + edibleTarget.energyValue * 12 - dist(cr.x, cr.y, edibleTarget.x, edibleTarget.y) * 0.015 + (edibleTarget.type === 'deposit' ? 1.2 : 0),
        x: edibleTarget.x,
        y: edibleTarget.y,
        id: edibleTarget.id,
        targetType: edibleTarget.type,
        reason: `recovering nutrient ${state.materials[edibleTarget.materialId].name}${edibleTarget.type === 'deposit' ? ' from a seam' : ''}`,
        ttl: 4
      });
    }

    intents.push({
      name: 'forage',
      score: 10 + resSpot.env.resource * 7 + (1 - env.resource) * 4,
      x: resSpot.x,
      y: resSpot.y,
      reason: 'seeking energy',
      ttl: 4.5
    });
  }

  if(cr.carriedId){
    if(camp){
      intents.push({
        name: 'return',
        score: 20 + camp.score * 0.05 + hearthBias * 3 + returnBias * 2 + (project ? 1.2 : 0),
        x: camp.x,
        y: camp.y,
        id: camp.id,
        reason: `carrying back to ${camp.name}`,
        ttl: 5.5
      });
    }else{
      intents.push({
        name: 'settle',
        score: 11 + returnBias * 4 + safeSpot.env.safe * 5,
        x: safeSpot.x,
        y: safeSpot.y,
        reason: 'holding useful material and testing safe ground',
        ttl: 5
      });
    }
  }else{
    if(projectTarget && (cr.role === 'carrier' || cr.role === 'builder' || cr.role === 'forager')){
      const projectName = projectLabel(projectTarget.projectKind || project?.kind);
      intents.push({
        name: 'collect',
        score: projectTarget.score + 4.8,
        x: projectTarget.x,
        y: projectTarget.y,
        id: projectTarget.id,
        targetType: projectTarget.type,
        reason: `${projectName} work for ${camp.name}`,
        ttl: 5
      });
    }
    if(usefulTarget){
      const sacredBias = tribe && usefulTarget.materialId === tribe.sacredMaterialId ? 3.2 : 0;
      const tabooPenalty = tribe && usefulTarget.materialId === tribe.tabooMaterialId ? 5.0 : 0;
      const materialName = state.materials[usefulTarget.materialId].name;

      intents.push({
        name: 'collect',
        score: 6 + usefulTarget.usefulness * 8 + sacredBias - tabooPenalty - dist(cr.x, cr.y, usefulTarget.x, usefulTarget.y) * 0.012 + (usefulTarget.type === 'deposit' ? 1.3 : 0),
        x: usefulTarget.x,
        y: usefulTarget.y,
        id: usefulTarget.id,
        targetType: usefulTarget.type,
        reason: camp
          ? `retrieving ${materialName}${usefulTarget.type === 'deposit' ? ' from a seam' : ''} for ${camp.name}`
          : `testing ${materialName}${usefulTarget.type === 'deposit' ? ' seam' : ''}`,
        ttl: 4.5
      });
    }
  }

  if(camp){
    if(project && cr.role === 'builder' && camp.storedCount > 0){
      intents.push({
        name: 'build',
        score: 18 + camp.culture.build * 9 + camp.depositAccess * 2.4 + (project.kind === 'berm' ? camp.localDanger * 6 : 0) + (project.kind === 'shrine' ? hearthBias * 3 : 0),
        x: project.x,
        y: project.y,
        id: camp.id,
        targetType: 'project',
        reason: `${projectLabel(project.kind)} work for ${camp.name}`,
        ttl: 5.2
      });
    }

    if(cr.role === 'builder' && campNeedsMaterial(camp) && camp.storedCount > 1 && state.time - camp.lastBuild > 6){
      intents.push({
        name: 'build',
        score: 14 + camp.culture.build * 8 + (camp.symbols.hearth || 0) * 2 + (house?.deficit?.shelter || 0) * 0.35 + (house?.deficit?.defense || 0) * 0.28 + (house?.deficit?.ritual || 0) * 0.18,
        x: camp.x,
        y: camp.y,
        id: camp.id,
        reason: urgentNeed ? `building ${urgentNeed} structures for ${camp.name}` : `reinforcing ${camp.name}`,
        ttl: 4.2
      });
    }

    intents.push({
      name: 'rest',
      score: 4 + (100 - cr.energy) * 0.08 + hearthBias * 2 + camp.localSafe * 4 - woundBias,
      x: camp.x,
      y: camp.y,
      id: camp.id,
      reason: `recovering at ${camp.name}`,
      ttl: 3.8
    });

    if(tribe && tribe.doctrine.ritual > 0.46 && ritualSite && cr.energy > 38){
      intents.push({
        name: 'ritual',
        score: 5 + tribe.doctrine.ritual * 8 + camp.domesticity * 4 + hearthBias * 2,
        x: ritualSite.x,
        y: ritualSite.y,
        reason: `circling a symbolic site at ${camp.name}`,
        ttl: 5.6
      });
    }

    if(cr.role === 'scout' || (tribe && tribe.doctrine.curiosity > 0.62)){
      intents.push({
        name: 'scout',
        score: 4 + (tribe ? tribe.doctrine.curiosity * 8 : 2) + (1 - env.resource) * 2 + Math.max(0, -camp.resourcePressure) * 0.08,
        x: migrateSpot.x,
        y: migrateSpot.y,
        reason: `probing beyond ${camp.name}`,
        ttl: 5.5
      });
    }

    intents.push({
      name: 'wander',
      score: 3 + zoneSafety * 2 + localMaterialValue * 2 - woundBias * 1.5,
      x: (camp.x + resSpot.x) * 0.5,
      y: (camp.y + resSpot.y) * 0.5,
      id: camp.id,
      reason: `ranging from ${camp.name}`,
      ttl: 4.2
    });
  }else{
    if(nearbyCamp){
      const affinity = cr.mind.semantic.tribeAffinity[nearbyCamp.tribeId] || 0.5;
      const trust = rememberedHome && rememberedHome.campId === nearbyCamp.id ? rememberedHome.strength : 0;

      intents.push({
        name: 'migrate',
        score: 8 + nearbyCamp.domesticity * 6 + affinity * 3 + trust * 3 + returnBias * 2,
        x: nearbyCamp.x,
        y: nearbyCamp.y,
        id: nearbyCamp.id,
        reason: `drawn toward ${nearbyCamp.name}`,
        ttl: 5.5
      });
    }

    if(cr.anchorAffinity > 46 && env.safe > 0.42 && env.resource > 0.36){
      intents.push({
        name: 'settle',
        score: 7 + cr.anchorAffinity * 0.08 + env.safe * 5 + env.resource * 4 + returnBias * 2 + (cr.foundingDrive || 0) * 2.6 + (cr.carriedId ? 2 : 0),
        x: cr.anchorX,
        y: cr.anchorY,
        reason: (cr.foundingDrive || 0) > 3 ? 'holding a repeat hearth zone' : 'repeating a safe return site',
        ttl: 5.8
      });
    }

    intents.push({
      name: 'wander',
      score: 3 + zoneSafety * 2 + (tribe ? tribe.doctrine.curiosity * 3 : 1),
      x: resSpot.x,
      y: resSpot.y,
      reason: 'wandering the frontier',
      ttl: 4
    });
  }

  if(!intents.length){
    intents.push({
      name: 'wander',
      score: 1,
      x: resSpot.x,
      y: resSpot.y,
      reason: 'default wandering',
      ttl: 3.5
    });
  }

  const best = chooseIntent(cr, intents);
  if(best) setIntent(cr, best);
}
function moveCreature(cr, dt){
  const env = sampleEnv(cr.x, cr.y);
  const camp = getCamp(cr.campId);
  const carryFrag = cr.carriedId ? getFragment(cr.carriedId) : null;

  updateAnchor(cr, env, dt);
  updateFoundingDrive(cr, env, dt);

  let goalX = cr.targetX, goalY = cr.targetY;
  const dx = goalX - cr.x, dy = goalY - cr.y;
  const targetDist = Math.hypot(dx, dy);
  let desiredAngle = targetDist > 1 ? Math.atan2(dy, dx) : cr.angle;
  const turnDelta = angNorm(desiredAngle - cr.angle);
  cr.angle += turnDelta * clamp(dt * cr.stats.turn * 0.35, 0, 0.5);

  let motive = 0.85;
  if(cr.state === 'flee') motive = 1.35;
  if(cr.state === 'graze' || cr.state === 'rest') motive = 0.08;
  if(cr.state === 'build') motive = 0.25;
  if(cr.state === 'settle') motive = targetDist > 60 ? 0.55 : 0.12;

  const worldPulse = 1 + state.motion.wobble * 0.35 * Math.sin(state.time * state.motion.pulseRate + cr.phase);
  const stacc = state.motion.staccato > 0.02 ? (Math.sin(state.time * (1.8 + state.motion.pulseRate) + cr.phase) > 0 ? 1 : (1 - state.motion.staccato)) : 1;
  const carrySlow = carryFrag ? clamp(1 - carryFrag.weight / (cr.stats.carry * 1.8), 0.35, 1) : 1;
  const accel = state.motion.accel * motive * worldPulse * stacc * carrySlow;
  const drag = state.motion.drag * (1 + (carryFrag ? carryFrag.weight / 30 : 0));

  const avoid = env.danger > 0.46 ? findBetterZone(cr, 'safe') : null;
  if(avoid && cr.state !== 'flee'){
    desiredAngle += angNorm(Math.atan2(avoid.y - cr.y, avoid.x - cr.x) - desiredAngle) * 0.08;
  }

  cr.vx += Math.cos(cr.angle) * accel * dt;
  cr.vy += Math.sin(cr.angle) * accel * dt;
  cr.vx *= Math.exp(-drag * dt * 0.08);
  cr.vy *= Math.exp(-drag * dt * 0.08);

  if(env.danger > 0.72){
    const safer = findBetterZone(cr, 'safe');
    cr.vx += (safer.x - cr.x) * dt * 0.12;
    cr.vy += (safer.y - cr.y) * dt * 0.12;
  }

  const boundaryForce = sampleBoundaryForce(cr);
  if(boundaryForce.pressure > 0){
    const wallScale = cr.campId ? 0.55 : 1.0;
    cr.vx += boundaryForce.fx * dt * 26 * wallScale;
    cr.vy += boundaryForce.fy * dt * 26 * wallScale;
    if(!cr.campId && boundaryForce.pressure > 0.5){
      cr.reason = 'turned by built boundaries';
    }
  }

  const speedNow = Math.hypot(cr.vx, cr.vy);
  const speedNorm = clamp(speedNow / Math.max(1, cr.stats.speed * 0.95), 0, 1.6);
  cr.gaitPhase = (cr.gaitPhase ?? cr.phase * Math.PI * 2) + dt * (1.5 + speedNow * 0.22);
  cr.stepStrength = lerp(cr.stepStrength ?? 0, speedNorm * clamp(motive, 0.08, 1.3), clamp(dt * 5.5, 0, 1));
  cr.visualLean = lerp(cr.visualLean ?? 0, speedNorm * 0.24, clamp(dt * 5.2, 0, 1));
  cr.turnVisual = lerp(cr.turnVisual ?? 0, turnDelta, clamp(dt * 6.5, 0, 1));
  cr.loadVisual = lerp(
    cr.loadVisual ?? 0,
    carryFrag ? clamp(carryFrag.weight / Math.max(1, cr.stats.carry * 1.15), 0, 1.1) : 0,
    clamp(dt * 3.5, 0, 1)
  );

  cr.x = clamp(cr.x + cr.vx * dt, 10, WORLD_W - 10);
  cr.y = clamp(cr.y + cr.vy * dt, 10, WORLD_H - 10);

  if(targetDist < Math.max(14, cr.stats.radius * 1.7)){
    if(cr.state === 'rest' || cr.state === 'graze'){
      cr.vx *= 0.7;
      cr.vy *= 0.7;
    }else if(cr.state === 'wander'){
      cr.targetX += randRange(state.rng, -60, 60);
      cr.targetY += randRange(state.rng, -60, 60);
    }
  }

  const trailIdx = sampleCell(state.static, cr.x, cr.y);
  const trailAdd = (cr.campId ? 0.08 : 0.03) + (cr.carriedId ? 0.07 : 0) + (cr.state === 'migrate' ? 0.04 : 0);
  state.trails[trailIdx] = clamp(state.trails[trailIdx] + trailAdd * dt, 0, 1);
  if(camp && (cr.carriedId || cr.state === 'return' || cr.state === 'build') && state.rng() < dt * (0.06 + trailAdd * 0.28)){
    addTerrainEdit('road',
      cr.x + randRange(state.rng, -6, 6),
      cr.y + randRange(state.rng, -6, 6),
      {
        campId: camp.id,
        materialId: camp.dominantMaterial,
        radius: 13,
        strength: 0.045 + trailAdd * 0.22
      }
    );
  }

  if(cr.state === 'graze'){
    cr.energy = clamp(cr.energy + dt * (5.8 * env.fertility) * cr.stats.rest, 0, 100);
    cr.hp = clamp(cr.hp + dt * 0.6, 0, 100);
  }else if(cr.state === 'rest'){
    cr.energy = clamp(cr.energy + dt * (3.2 * cr.stats.rest), 0, 100);
    cr.hp = clamp(cr.hp + dt * 0.5, 0, 100);
  }

  if(carryFrag){
    rememberCreature(cr, 'material', { x:carryFrag.x, y:carryFrag.y, materialId:carryFrag.materialId }, 0.04 * dt);
    const offs = 12 + carryFrag.weight * 0.8;
    const lag = 0.2 + state.motion.carryLag + carryFrag.weight * 0.01;
    const tx = cr.x - Math.cos(cr.angle) * offs + Math.sin(state.time * 3 + cr.phase) * state.motion.recoil * 20;
    const ty = cr.y - Math.sin(cr.angle) * offs + Math.cos(state.time * 3 + cr.phase) * state.motion.recoil * 20;
    carryFrag.x = lerp(carryFrag.x, tx, clamp(dt / lag, 0, 1));
    carryFrag.y = lerp(carryFrag.y, ty, clamp(dt / lag, 0, 1));
    carryFrag.rot += dt * 2 * (cr.vx * 0.01 + cr.vy * 0.01);
  }

  if(cr.state === 'collect' && cr.targetId){
    if(cr.targetType === 'deposit'){
      const deposit = getDeposit(cr.targetId);
      if(deposit && deposit.quantity >= 0.95 && dist(cr.x, cr.y, deposit.x, deposit.y) < Math.max(18, deposit.radius * 0.68)){
        const frag = extractChunkFromDeposit(deposit, cr);
        if(frag){
          state.fragments.push(frag);
          cr.carriedId = frag.id;
          cr.reason = `carrying ${state.materials[frag.materialId].name} block`;
          rememberCreature(cr, 'resource', {
            x: deposit.x,
            y: deposit.y,
            materialId: deposit.materialId,
            zone: deposit.zone,
            note: `${state.materials[deposit.materialId].name} seam`
          }, 0.34);
          if(camp){
            rememberCamp(camp, 'resource', {
              x: deposit.x,
              y: deposit.y,
              materialId: deposit.materialId,
              note: `${state.materials[deposit.materialId].name} seam`
            }, 0.2);
            recordProjectExtraction(camp, cr, deposit);
          }
        }
      }
    }else{
      const frag = getFragment(cr.targetId);
      if(frag && frag.state === 'loose' && dist(cr.x, cr.y, frag.x, frag.y) < cr.stats.radius + frag.size + 4){
        if(frag.weight <= cr.stats.carry * 1.35){
          frag.state = 'carried';
          frag.holderId = cr.id;
          frag.siteId = null;
          cr.carriedId = frag.id;
          cr.reason = `carrying ${state.materials[frag.materialId].name}`;
        }
      }
    }
  }

  if(cr.state === 'return' && camp && cr.carriedId && dist(cr.x, cr.y, camp.x, camp.y) < camp.homeRadius){
    depositFragment(cr, camp);
  }

  if(cr.state === 'build' && camp){
    const project = camp.activeProject;
    if(project && dist(cr.x, cr.y, project.x, project.y) < Math.max(26, camp.homeRadius * 0.34)){
      if(attemptProjectWork(camp, cr)){
        cr.reason = `${projectLabel(project.kind)} work`;
      }
    }else if(dist(cr.x, cr.y, camp.x, camp.y) < camp.homeRadius * 0.9){
      attemptBuild(camp, cr);
    }
  }

  if(cr.state === 'settle' && !cr.campId && cr.anchorAffinity > 52 && dist(cr.x, cr.y, cr.anchorX, cr.anchorY) < 52){
    attemptCampFormation(cr);
  }

  if(!cr.campId && cr.foundingDrive > 3.2 && dist(cr.x, cr.y, cr.anchorX, cr.anchorY) < 60 && env.safe > 0.4 && env.resource > 0.34){
    const formationChance = dt * clamp(0.08 + (cr.foundingDrive - 3.2) * 0.14, 0.08, 0.42);
    if(state.rng() < formationChance) attemptCampFormation(cr);
  }

  if(cr.state === 'migrate' && !cr.campId){
    const join = pickCampJoinTarget(cr);
    if(join && dist(cr.x, cr.y, join.x, join.y) < join.homeRadius * 0.95 && join.population < 24 && (cr.foundingDrive || 0) < 3.2){
      assignCreatureToCamp(cr, join);
      cr.reason = `joining ${join.name}`;
      recordEvent('migration', `${lineageLabel(cr)} joined ${join.name}`, cr.x, cr.y, join.id);
    }
  }
}
function depositFragment(cr, camp){
  const frag = getFragment(cr.carriedId);
  if(!frag) return;
  frag.state = 'stored';
  frag.holderId = null;
  frag.siteId = camp.id;
  frag.placedAt = null;
  frag.ownerHouseholdId = cr.householdId || camp.householdNodes[0]?.id || null;
  const clusterTight = clamp(0.25 + (state.origin.adhesion + 1) * 0.22, 0.18, 0.72);
  const angle = state.rng() * Math.PI * 2;
  const radius = randRange(state.rng, 4, 16 + (1 - clusterTight) * 26);
  frag.x = camp.x + Math.cos(angle) * radius;
  frag.y = camp.y + Math.sin(angle) * radius;
  frag.rot = randRange(state.rng, -Math.PI, Math.PI);
  rememberCreature(cr, 'home', { x:camp.x, y:camp.y, campId:camp.id, householdId:cr.householdId, materialId:frag.materialId }, 0.28);
  rememberCamp(camp, 'resource', { x:frag.x, y:frag.y, materialId:frag.materialId, householdId:cr.householdId }, 0.24);
  cr.carriedId = null;
  cr.energy = clamp(cr.energy - 1, 0, 100);
}
function attemptBuild(camp, builder){
  if(state.time - camp.lastBuild < 6) return false;
  const frag = chooseStoredFragment(camp, builder);
  if(!frag) return false;
  const mat = state.materials[frag.materialId];
  const profile = materialNeedProfile(frag.materialId);
  const house = campHouseholdRecord(camp, builder.householdId);
  const need = strongestHouseholdNeed(house);
  let kind = 'wall';

  if(need === 'food' || need === 'trade') kind = profile.trade > 0.55 || profile.food > 0.5 ? 'store' : 'workshop';
  else if(need === 'ritual') kind = profile.ritual > 0.58 ? 'hearth' : 'marker';
  else if(need === 'defense') kind = camp.localDanger >= 0.46 && mat.stats.sharp > 0.42 ? 'spike' : mat.stats.durability > 0.52 ? 'watch' : 'wall';
  else if(need === 'shelter') kind = profile.shelter > 0.65 ? 'shelter' : 'wall';

  if(camp.localDanger < 0.34 && kind === 'wall' && camp.placedCount > camp.population * 0.35) kind = 'hearth';

  const count = camp.placedCount + 1;
  const houseNode = camp.householdNodes.find(node => node.id === (builder.householdId || frag.ownerHouseholdId)) || camp.householdNodes[0] || { id:builder.householdId || `camp:${camp.id}:core`, x:camp.x, y:camp.y };
  const defensive = kind === 'wall' || kind === 'spike' || kind === 'watch' || kind === 'marker';
  const angle = defensive
    ? (camp.culture.defense > 0.52
      ? (count * (Math.PI * 2 / Math.max(6, camp.population + 2))) + state.origin.branching * 0.2
      : camp.routeAngle + randRange(state.rng, -camp.routeSpread, camp.routeSpread))
    : randRange(state.rng, -Math.PI, Math.PI);
  let radius = defensive
    ? camp.homeRadius * (kind === 'marker' ? randRange(state.rng, 0.84, 1.18) : randRange(state.rng, 0.74, kind === 'spike' ? 1.14 : 1.0))
    : randRange(state.rng, kind === 'hearth' ? 5 : 10, kind === 'hearth' ? 16 : 24);
  frag.state = 'placed';
  frag.kind = kind;
  frag.ownerHouseholdId = houseNode.id;
  frag.placedAt = state.time;
  frag.x = defensive ? camp.x + Math.cos(angle) * radius : houseNode.x + Math.cos(angle) * radius;
  frag.y = defensive ? camp.y + Math.sin(angle) * radius : houseNode.y + Math.sin(angle) * radius;
  frag.rot = angle + (kind === 'wall' ? Math.PI * 0.5 : 0) + randRange(state.rng, -0.4, 0.4);
  frag.size = clamp(frag.size * (kind === 'wall' || kind === 'watch' ? 1.18 : kind === 'store' || kind === 'workshop' ? 1.3 : kind === 'hearth' ? 1.08 : 1.22), 4, 22);
  frag.decay += 240;
  frag.shade += kind === 'hearth' ? 10 : kind === 'spike' ? -5 : 4;
  camp.lastBuild = state.time;
  rememberCreature(builder, 'home', { x:camp.x, y:camp.y, campId:camp.id, householdId:builder.householdId }, 0.3);
  rememberCamp(camp, 'build', { x:frag.x, y:frag.y, materialId:frag.materialId, householdId:frag.ownerHouseholdId, note:kind }, 0.34);
  builder.energy = clamp(builder.energy - 2.5, 0, 100);
  return true;
}
function attemptCampFormation(founder){
  if(state.eraIndex < ERA_INDEX.place || founder.campId || founder.anchorAffinity < 48) return;
  const site = pickCampExpansionSite(founder.anchorX, founder.anchorY, 'found');
  const x = site.x;
  const y = site.y;
  const env = site.env;
  const spreadRelief = Math.max(0, site.zoneBias || 0);
  const activeCamps = state.camps.filter(camp => !camp.abandoned).length;
  const nearCamp = nearestCamp(x, y, 340);
  if(nearCamp && dist(x, y, nearCamp.x, nearCamp.y) < 340) return;
  const safeFloor = clamp(0.38 - spreadRelief * 0.10 - (site.strategic ? 0.03 : 0), 0.28, 0.38);
  const resourceFloor = clamp(0.34 - spreadRelief * 0.08 - (site.strategic ? 0.02 : 0), 0.24, 0.34);
  const scoreFloor = 0.22 - spreadRelief * 0.08 - (site.strategic ? 0.03 : 0);
  const spacingLimit = 0.95 + spreadRelief * 0.10;
  if(env.safe < safeFloor || env.resource < resourceFloor || site.spacing > spacingLimit || site.score < scoreFloor) return;

  const founderHome = strongestMemory(founder, 'home');
  const nearbyNomads = getNearbyNomads(founder.x, founder.y, 220).filter(other => other.id !== founder.id);

  const aligned = nearbyNomads.filter(other => {
    const otherHome = strongestMemory(other, 'home');
    const sharedHome =
      founderHome && otherHome &&
      founderHome.x != null && otherHome.x != null &&
      dist(founderHome.x, founderHome.y, otherHome.x, otherHome.y) < 140;

    const sharedAnchor = dist(other.anchorX, other.anchorY, x, y) < 168;
    const returnBias = other.mind.symbolic.tokens['safe-return'] || 0;
    const travelReady = dist(other.x, other.y, founder.x, founder.y) < 180;
    return travelReady && (other.anchorAffinity > 20 || (other.foundingDrive || 0) > 1.5 || sharedAnchor || sharedHome || other.carriedId || returnBias > 0.16);
  });

  const founderSupport = (founder.foundingDrive || 0) + (founder.carriedId ? 0.9 : 0);
  if(aligned.length < 1 && founderSupport < (activeCamps < 2 ? 2.7 : 3.5) && founder.anchorAffinity < (activeCamps < 2 ? 58 : 66)) return;

  const camp = makeCamp(x, y, founder.lineageId, aligned.length < 2);
  camp.tribeId = founder.tribeId;
  const tribe = getTribe(founder.tribeId);
  if(tribe){
    camp.culture.colorHue = tribe.palette.primaryHue;
    camp.myths = tribe.myths.slice(0, 2);
  }
  state.camps.push(camp);

  const founders = [founder, ...aligned.slice(0, 5)];
  for(const cr of founders){
    cr.x = camp.x + randRange(state.rng, -18, 18);
    cr.y = camp.y + randRange(state.rng, -18, 18);
    cr.vx = 0;
    cr.vy = 0;
    cr.targetX = camp.x + randRange(state.rng, -24, 24);
    cr.targetY = camp.y + randRange(state.rng, -24, 24);
    assignCreatureToCamp(cr, camp);
    cr.state = 'rest';
    cr.reason = `settling ${camp.name}`;
    cr.foundingDrive = 0;
    rememberCreature(cr, 'home', {
      x: camp.x,
      y: camp.y,
      campId: camp.id,
      householdId: cr.householdId,
      note: camp.name,
      zone: env.zone
    }, 0.85);
  }

  rememberCamp(camp, 'founding', {
    x: camp.x,
    y: camp.y,
    lineageId: founder.lineageId,
    householdId: founder.householdId
  }, 0.8);

  camp.level = founders.length >= 3 || site.zoneBias > 0.72 ? 1 : 0;
  camp.homeRadius = clamp(camp.homeRadius + founders.length * 2.5, 56, 86);
  camp.symbols.hearth = clamp(camp.symbols.hearth + founders.length * 0.08 + founderSupport * 0.04, 0, 1.2);
  camp.householdCount = new Set(founders.map(cr => cr.householdId)).size;

  const starterDrops = clamp(founders.length + (site.strategic ? 1 : 0), 2, 5);
  const homeHouseholdId = founders[0]?.householdId || null;
  for(let i = 0; i < starterDrops; i++){
    const matId = state.rng() < 0.72 ? env.materialId : env.materialId2;
    const frag = makeFragment(
      camp.x + randRange(state.rng, -14, 14),
      camp.y + randRange(state.rng, -14, 14),
      matId,
      {
        state: 'stored',
        siteId: camp.id,
        ownerHouseholdId: homeHouseholdId,
        rot: randRange(state.rng, -Math.PI, Math.PI)
      }
    );
    state.fragments.push(frag);
  }

  recordEvent('founding', `${camp.name} founded`, x, y, camp.id);
}
function handleConflict(cr, dt){
  const enemy = nearestThreat(cr, 46);
  if(!enemy) return;
  const camp = getCamp(cr.campId);
  const canFight = cr.role === 'guard' || cr.stats.attack + cr.stats.defense > enemy.stats.attack + enemy.stats.defense * 0.85 || (camp && camp.culture.aggression > 0.55);
  if(canFight && cr.energy > 24 && enemy.energy > 0){
    rememberCreature(cr, 'threat', { x:enemy.x, y:enemy.y, campId:enemy.campId, lineageId:enemy.lineageId }, 0.24 * dt);
    cr.state = 'fight';
    cr.reason = `pressuring ${lineageLabel(enemy)}`;
    const ang = Math.atan2(enemy.y - cr.y, enemy.x - cr.x);
    const weaponBoost = cr.carriedId ? (getFragment(cr.carriedId)?.usefulness || 0) * 4 : 0;
    const damage = dt * randRange(state.rng, 8.5, 11.5) * (cr.stats.attack + weaponBoost * 0.08);
    enemy.hp -= damage;
    enemy.hitFlash = clamp((enemy.hitFlash || 0) + 0.95, 0, 1.6);
    cr.attackFlash = clamp((cr.attackFlash || 0) + 0.75, 0, 1.2);
    addSymbolToken(enemy, 'wound', 0.05 + damage * 0.012);
    const knock = damage * 0.18 / Math.max(0.55, enemy.stats.stability);
    enemy.vx += Math.cos(ang) * knock;
    enemy.vy += Math.sin(ang) * knock;
    cr.vx -= Math.cos(ang) * knock * 0.28;
    cr.vy -= Math.sin(ang) * knock * 0.28;
    enemy.reason = `under attack by ${lineageLabel(cr)}`;
    if(enemy.hp > 0 && enemy.state !== 'fight'){
      enemy.state = enemy.hp < 28 ? 'flee' : 'fight';
    }
    spawnCombatFx('hit', lerp(cr.x, enemy.x, 0.62), lerp(cr.y, enemy.y, 0.62), camp ? camp.culture.colorHue : state.palette.baseHue, 0.8 + damage * 0.018);
    cr.vx *= 0.94; cr.vy *= 0.94;
    if(enemy.hp <= 0){
      killCreature(enemy, `killed by ${lineageLabel(cr)}`);
      cr.energy = clamp(cr.energy + 4, 0, 100);
    }
  }
}
function killCreature(cr, reason){
  if(!cr.alive) return;
  cr.alive = false;
  spawnDeathRemnant(cr);
  const camp = getCamp(cr.campId);
  spawnCombatFx('death', cr.x, cr.y, camp ? camp.culture.colorHue : state.palette.baseHue, 1.2 + cr.stats.radius * 0.18);
  if(camp) rememberCamp(camp, 'loss', { x:cr.x, y:cr.y, lineageId:cr.lineageId, householdId:cr.householdId }, 0.5);
  recordEvent('death', `${lineageLabel(cr)} ${reason}`, cr.x, cr.y, cr.campId);
  if(cr.carriedId){
    const frag = getFragment(cr.carriedId);
    if(frag){
      frag.state = 'loose';
      frag.holderId = null;
      frag.siteId = null;
      frag.x = cr.x;
      frag.y = cr.y;
    }
  }
  const env = sampleEnv(cr.x, cr.y);
  if(state.fragments.length < MAX_FRAGMENTS){
    const husk = makeFragment(cr.x + randRange(state.rng, -6, 6), cr.y + randRange(state.rng, -6, 6), env.materialId, { kind:'husk', decay: 180, shade:-18 });
    state.fragments.push(husk);
  }
}
function lineageLabel(cr){
  const lin = getLineage(cr.lineageId);
  return lin ? lin.name : 'lineage';
}
function attemptReproduce(cr, dt){
  if(cr.reproCooldown > 0 || cr.energy < 75 || cr.age < 120 || state.creatures.length >= MAX_CREATURES) return;

  const camp = getCamp(cr.campId);
  if(camp){
    if(distSq(cr.x,cr.y,camp.x,camp.y) > (camp.homeRadius * 1.5)**2) return;
    if(camp.population > 28 && camp.resourcePressure < -2) return;
  }else{
    const env = sampleEnv(cr.x,cr.y);
    if(env.safe < 0.42 || env.resource < 0.42) return;
  }

  // Look for a partner
  let partner = null;
  const range = 42;
  for(const other of nearbyFromBuckets(state.spatial?.creatures, cr.x, cr.y, range)){
    if(other === cr || !other.alive || other.age < 120 || other.reproCooldown > 0 || other.energy < 70) continue;
    if(other.tribeId !== cr.tribeId) continue; // Same tribe only for now
    if(distSq(cr.x, cr.y, other.x, other.y) < range * range){
      partner = other;
      break;
    }
  }

  const isBonding = !!partner;
  const energyCost = isBonding ? 18 : 34;
  if(cr.energy < energyCost) return;

  cr.reproCooldown = randRange(state.rng, 80, 140);
  cr.energy -= energyCost;
  if(partner){
    partner.reproCooldown = randRange(state.rng, 80, 140);
    partner.energy -= energyCost;
    spawnCombatFx('bond', (cr.x + partner.x) * 0.5, (cr.y + partner.y) * 0.5, camp ? camp.culture.colorHue : state.palette.baseHue, 1.2);
  }

  let lineageId = cr.lineageId;
  const mutationP = isBonding ? 0.04 : 0.12;
  if(chance(state.rng, mutationP)){
    const parent = getLineage(cr.lineageId);
    const mutatedModules = mutateModules(state.rng, parent.modules);
    const parentTribe = getTribe(parent.tribeId);
    const childLineage = {
      id: state.nextIds.lineage++,
      name: `${parent.name}-${String.fromCharCode(65 + randInt(state.rng,0,20))}`,
      parentId: parent.id,
      tribeId: parent.tribeId,
      modules: mutatedModules,
      scale: clamp(parent.scale + randRange(state.rng, -0.08, 0.08), 0.7, 1.36),
      hueShift: parent.hueShift + randRange(state.rng, -12, 12),
      roleBias: pick(state.rng, ROLE_ORDER),
      phenotype: generatePhenotype(state.rng, mutatedModules, parentTribe),
      history:[]
    };
    state.lineages.push(childLineage);
    lineageId = childLineage.id;
    recordEvent('lineage', `${childLineage.name} ${isBonding ? 'bonded' : 'split'} from ${parent.name}`, cr.x, cr.y, cr.campId);
  }

  const child = makeCreature(
    cr.x + randRange(state.rng,-8,8),
    cr.y + randRange(state.rng,-8,8),
    lineageId,
    cr.campId
  );

  child.energy = isBonding ? 64 : 48;
  child.age = 0;
  child.memory = clamp((cr.memory || 1) + randRange(state.rng, -0.1, 0.1), 0.55, 1.45);
  child.parentId = cr.id;
  child.favoriteMaterialId = cr.favoriteMaterialId != null
    ? cr.favoriteMaterialId
    : (camp ? camp.dominantMaterial : sampleEnv(cr.x, cr.y).materialId);

  child.householdId = cr.householdId || (camp ? (typeof householdKeyFor === 'function' ? householdKeyFor(child, camp, cr.id) : `h:${cr.id}`) : null);
  child.reproCooldown = randRange(state.rng, 100, 180);
  child.reason = isBonding ? 'bonded in the light' : 'split from the self';

  if(typeof inheritPlaceMemory === 'function') inheritPlaceMemory(cr, child, camp);

  rememberCreature(cr, 'kin', {
    x: child.x,
    y: child.y,
    householdId: child.householdId,
    campId: child.campId
  }, 0.5);

  if(partner) {
    rememberCreature(partner, 'kin', { x: child.x, y: child.y, campId: child.campId }, 0.5);
  }

  if(camp){
    rememberCamp(camp, 'kin', {
      x: child.x,
      y: child.y,
      householdId: child.householdId,
      lineageId: child.lineageId
    }, 0.34);
  }

  state.creatures.push(child);
}
function updateCreatures(dt){
  const live = [];
  for(const cr of state.creatures){
    if(!cr.alive) continue;
    const lodDist = dist(cr.x, cr.y, camera.x, camera.y) / Math.max(camera.zoom, 0.15);
    const lod = lodDist < 900 ? 1 : lodDist < 1700 ? 0.72 : 0.45;
    const step = dt * lod;
    cr.age += step;
    cr.energy -= step * (0.48 + cr.stats.radius * 0.013 + (cr.carriedId ? 0.14 : 0) + (cr.state === 'fight' ? 0.38 : 0));
    cr.reproCooldown -= step;
    cr.thinkTimer -= step;
    cr.hitFlash = Math.max(0, (cr.hitFlash || 0) - step * 3.8);
    cr.attackFlash = Math.max(0, (cr.attackFlash || 0) - step * 4.6);
    decayIntent(cr, step);
    updateCreatureMemory(cr, step);

    if(cr.thinkTimer <= 0 || shouldFormNewIntent(cr)){
      thinkCreature(cr);
      cr.thinkTimer = randRange(state.rng, 0.45, 1.0) / lod;
    }
    maybeBroadcastCreatureSignal(cr, step);
    moveCreature(cr, step);
    handleConflict(cr, step);
    attemptReproduce(cr, step);
    if(cr.age > cr.lifespan) killCreature(cr, 'aged out');
    else if(cr.energy <= 0) killCreature(cr, 'starved');
    else if(cr.hp <= 0) killCreature(cr, 'collapsed');
    if(cr.alive) live.push(cr);
  }
  state.creatures = live;
}
function computeCampMetrics(camp){
  camp.members.length = 0;
  camp.population = 0;
  camp.storeCounts.fill(0);
  camp.storedCount = 0;
  camp.placedCount = 0;
  const baseEnv = sampleBaseEnv(camp.x, camp.y);
  const depositField = depositFieldAround(camp.x, camp.y, Math.max(180, camp.territoryRadius || 160));
  camp.localDanger = baseEnv.danger;
  camp.localResource = baseEnv.resource;
  camp.localSafe = baseEnv.safe;

  let routeVecX = 0;
  let routeVecY = 0;
  const lineageCounts = new Map();
  const roleSet = new Set();
  const householdMap = new Map();
  let offspring = 0;
  let defenseStructures = 0;
  let shelterStructures = 0;
  let industryStructures = 0;
  let ritualStructures = 0;

  const members = getCampMembers(camp.id);
  const fragments = getCampFragments(camp.id);

  for(const cr of members){
    if(!cr.alive) continue;

    if(!cr.householdId) assignCreatureToHousehold(cr, camp);

    camp.population++;
    camp.members.push(cr.id);

    routeVecX += Math.cos(Math.atan2(cr.targetY - camp.y, cr.targetX - camp.x));
    routeVecY += Math.sin(Math.atan2(cr.targetY - camp.y, cr.targetX - camp.x));

    lineageCounts.set(cr.lineageId, (lineageCounts.get(cr.lineageId) || 0) + 1);
    roleSet.add(cr.role);

    if(cr.age < 120) offspring++;

    if(!householdMap.has(cr.householdId)){
      householdMap.set(cr.householdId, {
        id: cr.householdId,
        count: 0,
        young: 0,
        x: 0,
        y: 0,
        lineageId: cr.lineageId
      });
    }

    const house = householdMap.get(cr.householdId);
    house.count++;
    house.x += cr.x;
    house.y += cr.y;
    if(cr.age < 120) house.young++;
  }

  for(const frag of fragments){
    if(frag.state === 'stored'){
      camp.storedCount++;
      camp.storeCounts[frag.materialId]++;
    }else if(frag.state === 'placed'){
      camp.placedCount++;
      camp.storeCounts[frag.materialId]++;
      if(frag.kind === 'wall' || frag.kind === 'spike' || frag.kind === 'watch' || frag.kind === 'marker') defenseStructures += 1;
      if(frag.kind === 'shelter' || frag.kind === 'hearth') shelterStructures += 1;
      if(frag.kind === 'store' || frag.kind === 'workshop') industryStructures += 1;
      if(frag.kind === 'hearth' || frag.kind === 'marker') ritualStructures += 1;
    }
  }

  camp.localDanger = clamp(baseEnv.danger - defenseStructures * 0.04 - shelterStructures * 0.012, 0, 1);
  camp.localSafe = clamp(baseEnv.safe + shelterStructures * 0.032 + defenseStructures * 0.024 + ritualStructures * 0.012, 0, 1);
  camp.localResource = clamp(baseEnv.resource + industryStructures * 0.03 + camp.storedCount * 0.004 + depositField.richness * 0.12 + depositField.count * 0.05, 0, 1);
  camp.depositAccess = clamp(depositField.richness * 0.4 + depositField.count * 0.18, 0, 1.4);
  camp.structureScores = { defense:defenseStructures, shelter:shelterStructures, industry:industryStructures, ritual:ritualStructures };

  const domCount = Math.max(...camp.storeCounts);
  camp.dominantMaterial = domCount > 0
    ? camp.storeCounts.indexOf(domCount)
    : sampleEnv(camp.x, camp.y).materialId;

  if(routeVecX || routeVecY) camp.routeAngle = Math.atan2(routeVecY, routeVecX);

  camp.homeRadius = clamp(52 + camp.population * 2.4 + camp.placedCount * 1.6 + camp.level * 18, 50, 180);

  const localTrail = sampleGrid(state.trails, camp.x, camp.y);

  camp.householdNodes = [...householdMap.values()]
    .map(house => ({
      id: house.id,
      count: house.count,
      young: house.young,
      lineageId: house.lineageId,
      x: house.x / house.count,
      y: house.y / house.count
    }))
    .sort((a,b)=>b.count-a.count);

  camp.householdCount = camp.householdNodes.length;
  camp.offspringCount = offspring;
  camp.roleDiversity = roleSet.size / ROLE_ORDER.length;
  camp.lineageMix = lineageCounts.size;
  camp.pathDensity = localTrail;

  camp.domesticity = clamp(
    (camp.storedCount + camp.placedCount * 1.35 + offspring * 2.2 + camp.population * 0.65) /
    (18 + camp.population * 1.6),
    0,
    1
  );

  camp.territoryRadius = clamp(
    lerp(camp.territoryRadius || 120, camp.homeRadius * (1.22 + camp.level * 0.12 + camp.domesticity * 0.4), 0.16),
    90,
    420
  );

  camp.score =
    camp.population * 1.6 +
    camp.storedCount * 0.9 +
    camp.placedCount * 1.25 +
    localTrail * 12 +
    camp.householdCount * 1.8 +
    camp.domesticity * 8;

  camp.resourcePressure =
    camp.localResource * 14 +
    camp.depositAccess * 2.2 +
    camp.storedCount * 0.4 -
    camp.population * 1.6 -
    camp.localDanger * 4.2 -
    camp.householdCount * 0.4;
}

function updateCampCulture(camp, dt){
  const totalStore = camp.storeCounts.reduce((a,b)=>a+b,0) || 1;
  for(let i = 0; i < camp.culture.prefMaterials.length; i++){
    const target = camp.storeCounts[i] / totalStore;
    camp.culture.prefMaterials[i] = lerp(camp.culture.prefMaterials[i], target, dt * 0.04);
  }
  camp.culture.defense = lerp(camp.culture.defense, clamp(camp.localDanger * 0.85 + (camp.population > 12 ? 0.12 : 0), 0, 1), dt * 0.04);
  camp.culture.build = lerp(camp.culture.build, clamp(camp.localSafe * 0.4 + camp.storedCount / (camp.population + 3) * 0.25 + camp.domesticity * 0.24 + 0.2, 0, 1), dt * 0.04);
  camp.culture.migrate = lerp(camp.culture.migrate, clamp(sampleEnv(camp.x,camp.y).volatility * 0.72 + Math.max(0, -camp.resourcePressure) * 0.08 - camp.domesticity * 0.16, 0, 1), dt * 0.035);
  camp.culture.aggression = lerp(camp.culture.aggression, clamp(camp.localDanger * 0.48 + state.materials[camp.dominantMaterial].stats.sharp * 0.44, 0, 1), dt * 0.05);
  camp.culture.colorHue = lerp(camp.culture.colorHue, state.materials[camp.dominantMaterial].hue, dt * 0.1);

  let stronger = null;
  let strongerScore = camp.score;
  for(const other of state.camps){
    if(other.id === camp.id || other.abandoned) continue;
    const d = dist(camp.x,camp.y,other.x,other.y);
    if(d > 540) continue;
    if(other.score > strongerScore * 1.18){
      stronger = other;
      strongerScore = other.score;
    }
  }
  if(stronger){
    camp.culture.build = lerp(camp.culture.build, stronger.culture.build, dt * 0.01);
    camp.culture.defense = lerp(camp.culture.defense, stronger.culture.defense, dt * 0.008);
    camp.routeSpread = lerp(camp.routeSpread, stronger.routeSpread, dt * 0.008);
  }
}
function updateCampSociety(camp, dt){
  updateCampMemory(camp, dt);
  const threatMemory = strongestMemory({ collectiveMemory: camp.collectiveMemory }, 'threat');
  const resourceMemory = strongestMemory({ collectiveMemory: camp.collectiveMemory }, 'resource');
  camp.rivalCampId = threatMemory?.campId || null;
  camp.society.cohesion = lerp(camp.society.cohesion, clamp(camp.domesticity * 0.55 + camp.householdCount / Math.max(1, camp.population + 1), 0, 1), dt * 0.03);
  camp.society.tradition = lerp(camp.society.tradition, clamp((camp.collectiveMemory.length * 0.1) + camp.domesticity * 0.45, 0, 1), dt * 0.025);
  camp.society.expansion = lerp(camp.society.expansion, clamp(camp.culture.migrate * 0.4 + camp.culture.build * 0.3 + Math.max(0, camp.resourcePressure) * 0.04, 0, 1), dt * 0.025);
  camp.society.memoryLoad = camp.collectiveMemory.reduce((sum, memory) => sum + memory.strength, 0);
  if(threatMemory) camp.culture.aggression = lerp(camp.culture.aggression, clamp(camp.culture.aggression + threatMemory.strength * 0.08, 0, 1), dt * 0.08);
  if(resourceMemory) camp.culture.build = lerp(camp.culture.build, clamp(camp.culture.build + resourceMemory.strength * 0.04, 0, 1), dt * 0.06);
  shareCampKnowledge(camp, dt);
}

function updateCampRitualMarkers(camp, dt){
  const tribe = getTribe(camp.tribeId);
  if(!tribe) return;

  if(!camp.ritualMarkers) camp.ritualMarkers = [];

  const needMarker =
    camp.domesticity > 0.38 &&
    camp.population >= 4 &&
    camp.ritualMarkers.length < Math.min(4, 1 + Math.floor(camp.level));

  if(needMarker && state.rng() < 0.02 * dt){
    const a = randRange(state.rng, 0, Math.PI * 2);
    const r = randRange(state.rng, camp.homeRadius * 0.22, camp.homeRadius * 0.75);
    camp.ritualMarkers.push({
      x: camp.x + Math.cos(a) * r,
      y: camp.y + Math.sin(a) * r,
      token: pick(state.rng, tribe.symbolSet || SYMBOL_TOKENS),
      strength: randRange(state.rng, 0.4, 0.9)
    });
  }

  for(const marker of camp.ritualMarkers){
    marker.strength = clamp(marker.strength + dt * 0.002, 0, 1.2);
  }
}

function updateCampLevels(camp){
  const prev = camp.level;
  let nextLevel = 0;
  if(camp.score < 5) nextLevel = 0;
  else if(camp.score < 15) nextLevel = 1;
  else if(camp.score < 28) nextLevel = 2;
  else if(camp.score < 46) nextLevel = 3;
  else nextLevel = 4;
  if(state.eraIndex < ERA_INDEX.place) nextLevel = Math.min(nextLevel, 1);
  if(state.eraIndex < ERA_INDEX.settlements) nextLevel = Math.min(nextLevel, 3);
  camp.level = nextLevel;

  if(camp.population === 0){
    camp.decline += 0.8;
  }else{
    camp.decline = Math.max(0, camp.decline - 0.3);
  }
  if(camp.decline > 40 && !camp.abandoned){
    camp.abandoned = true;
    recordEvent('decline', `${camp.name} abandoned`, camp.x, camp.y, camp.id);
  }
  if(prev !== camp.level){
    camp.lastLevelChange = state.time;
    if(camp.level > prev) recordEvent('growth', `${camp.name} became ${KIND_NAMES[camp.level]}`, camp.x, camp.y, camp.id);
    else recordEvent('decline', `${camp.name} fell to ${KIND_NAMES[camp.level]}`, camp.x, camp.y, camp.id);
  }
}
function maybeSplitCamp(camp){
  if(state.eraIndex < ERA_INDEX.settlements || camp.population < 16 || camp.resourcePressure >= 1.5 || state.time - camp.lastSplit < 40) return;
  if(camp.culture.migrate < 0.58) return;

  const movers = getCampMembers(camp.id)
    .filter(c => c.alive && c.age > 80)
    .sort((a, b) => {
      const aScore = (a.role === 'scout' ? 2 : 0) + (a.role === 'carrier' ? 1 : 0) + (100 - a.anchorAffinity) * 0.01;
      const bScore = (b.role === 'scout' ? 2 : 0) + (b.role === 'carrier' ? 1 : 0) + (100 - b.anchorAffinity) * 0.01;
      return bScore - aScore;
    })
    .slice(0, randInt(state.rng, 2, 4));

  if(movers.length < 2) return;

  camp.lastSplit = state.time;
  const target = pickCampExpansionSite(camp.x, camp.y, 'split');
  if(target.score < -0.1) return;
  const splinter = chance(state.rng, 0.55) ? forkTribeFrom(camp.tribeId, 'splinter') : null;

  for(const cr of movers){
    cr.campId = null;
    cr.anchorX = target.x + randRange(state.rng, -50, 50);
    cr.anchorY = target.y + randRange(state.rng, -50, 50);
    cr.anchorAffinity = 45;
    cr.state = 'migrate';
    cr.reason = `splitting from ${camp.name}`;
    cr.targetX = cr.anchorX;
    cr.targetY = cr.anchorY;

    if(splinter){
      cr.tribeId = splinter.id;
      cr.mind.semantic.tribeAffinity[splinter.id] = 1;
      cr.mind.symbolic.mythsHeard = Object.fromEntries((splinter.myths || []).map(m => [m, 0.6]));
    }
  }

  state.migrationFlows.push({ x1:camp.x, y1:camp.y, x2:target.x, y2:target.y, t:state.time });
  if(state.migrationFlows.length > 24) state.migrationFlows.shift();

  recordEvent('migration', `${camp.name} sent out a splinter group`, camp.x, camp.y, camp.id);
}
function updateCamps(dt){
  for(const camp of state.camps){
    computeCampMetrics(camp);
    buildHouseholdEconomy(camp);
    updateCampCulture(camp, dt);
    updateCampRitualMarkers(camp, dt);
    updateCampSociety(camp, dt);
    updateCampProjects(camp, dt);
    updateCampEmergentPressure(camp, dt);
    attemptCampExchange(camp, dt);
    attemptIntercampTrade(camp, dt);
    updateCampLexiconDrift(camp, dt);
    updateCampFrontiers(camp, dt);
    updateCampLevels(camp);
    maybeSplitCamp(camp);
  }

  state.camps = state.camps.filter(c =>
    !c.abandoned ||
    c.placedCount > 0 ||
    c.storedCount > 0 ||
    state.time - (c.history.at(-1)?.t || 0) < 240
  );
}
function updateDeposits(dt){
  if(!(state.deposits || []).length) return;
  for(const deposit of state.deposits){
    deposit.cooldown = Math.max(0, (deposit.cooldown || 0) - dt);
    const regenBoost = deposit.zone === 'fertile cradle' ? 1.08 : deposit.zone === 'stable hollow' ? 1.04 : 1;
    deposit.quantity = clamp(deposit.quantity + dt * deposit.regen * regenBoost, 0, deposit.capacity);
  }
}
function updateTerrainEdits(dt){
  if(!(state.terrainEdits || []).length) return;
  state.terrainEdits = state.terrainEdits.filter(edit => {
    edit.age += dt;
    if(edit.kind === 'scar'){
      edit.strength = Math.max(0, edit.strength - dt * 0.004);
      return edit.strength > 0.04;
    }
    if(edit.kind === 'pit'){
      edit.strength = Math.max(0.06, edit.strength - dt * 0.00045);
    }
    if(edit.kind === 'road'){
      const camp = edit.campId != null ? getCamp(edit.campId) : null;
      if(camp) edit.strength = clamp(edit.strength + dt * 0.0006, 0.04, 1.2);
      else edit.strength = Math.max(0, edit.strength - dt * 0.0014);
      return edit.strength > 0.05;
    }
    if(edit.kind === 'shrine'){
      const camp = edit.campId != null ? getCamp(edit.campId) : null;
      if(camp){
        edit.strength = clamp(edit.strength + dt * 0.0003 * (camp.society.tradition + 0.2), 0.06, 1.2);
      }else{
        edit.strength = Math.max(0, edit.strength - dt * 0.0009);
      }
      return edit.strength > 0.05;
    }
    if(edit.kind === 'stockpile'){
      const camp = edit.campId != null ? getCamp(edit.campId) : null;
      const target = camp ? clamp(camp.storedCount / Math.max(8, camp.population + 4) * 0.34, 0.04, 1.1) : 0;
      edit.strength = lerp(edit.strength, target, clamp(dt * 0.22, 0, 1));
      return edit.strength > 0.05;
    }
    return true;
  });
}
function updateFragments(dt){
  const kept = [];
  for(const frag of state.fragments){
    frag.age += dt;
    if(frag.state === 'loose'){
      frag.vx *= 0.96;
      frag.vy *= 0.96;
      frag.x = clamp(frag.x + frag.vx * dt, 6, WORLD_W - 6);
      frag.y = clamp(frag.y + frag.vy * dt, 6, WORLD_H - 6);
      if(frag.age > frag.decay && state.rng() < 0.0015 * dt && frag.kind !== 'husk') continue;
    }else if(frag.state === 'stored' || frag.state === 'placed'){
      const camp = getCamp(frag.siteId);
      if(!camp){
        frag.state = 'loose';
        frag.siteId = null;
      }
    }else if(frag.state === 'carried'){
      if(!getCreature(frag.holderId)){
        frag.state = 'loose';
        frag.holderId = null;
      }
    }
    kept.push(frag);
  }
  state.fragments = kept;
  const looseCount = state.fragments.reduce((sum, frag) => sum + (frag.state === 'loose' ? 1 : 0), 0);
  if(state.eraIndex >= ERA_INDEX.materials && state.time - state.lastAmbientSpawn > 6.4 && state.fragments.length < MAX_FRAGMENTS && looseCount < MAX_LOOSE_FRAGMENTS){
    state.lastAmbientSpawn = state.time;
    if(state.rng() < 0.42) spawnAmbientFragment(false);
  }
}
function decayTrails(dt){
  const decay = Math.exp(-dt * 0.018);
  for(let i = 0; i < state.trails.length; i++){
    state.trails[i] *= decay;
  }
}
function updateWorld(dt){
  state.time += dt;
  advanceEras();
  updateNudges(dt);
  updateActiveSignals(dt);
  if(state.eraIndex >= ERA_INDEX.materials) updateDeposits(dt);
  updateTerrainEdits(dt);
  decayTrails(dt);
  updateProtoLife(dt);
  if(state.eraIndex >= ERA_INDEX.place && state.camps.filter(camp => !camp.abandoned).length < 3 && (state.time % 12) < dt){
    primeNomadFoundingFronts();
  }
  rebuildIndexes();
  if(state.eraIndex >= ERA_INDEX.creatures) updateCreatures(dt);
  if(state.eraIndex >= ERA_INDEX.materials) updateFragments(dt);
  rebuildIndexes();
  if(state.eraIndex >= ERA_INDEX.place) updateCamps(dt);
  updateTransientFx(dt);
  rebuildIndexes();
  if(state.time - state.lastSnapshot > SNAPSHOT_INTERVAL){
    state.lastSnapshot = state.time;
    recordSnapshot();
  }
}

function serializeWorld(includeSnapshots=true){
  return {
    version: state.version,
    seedStr: state.seedStr,
    seedInt: state.seedInt,
    time: state.time,
    worldName: state.worldName,
    origin: state.origin,
    palette: state.palette,
    motion: state.motion,
    materials: state.materials,
    tribes: state.tribes,
    laws: state.laws,
    macro: state.macro,
    camps: state.camps,
    lineages: state.lineages,
    archetypes: state.archetypes,
    creatures: state.creatures,
    fragments: state.fragments,
    deposits: state.deposits,
    terrainEdits: state.terrainEdits,
    protoCells: state.protoCells,
    nudges: state.nudges,
    pendingSites: state.pendingSites,
    activeSignals: state.activeSignals,
    recentRaids: state.recentRaids,
    events: state.events,
    trails: state.trails,
    nextIds: state.nextIds,
    lastSnapshot: state.lastSnapshot,
    lastAmbientSpawn: state.lastAmbientSpawn,
    migrationFlows: state.migrationFlows,
    eraIndex: state.eraIndex,
    snapshots: includeSnapshots ? state.snapshots : []
  };
}

function loadWorld(data, preserveSnapshots=false){
  const priorSnapshots = preserveSnapshots && state ? state.snapshots : (data.snapshots || []);
  state = JSON.parse(JSON.stringify(data));
  state.version = state.version || 4;
  state.tribes = state.tribes || [];
  state.laws = state.laws || generateWorldLaws(state.origin, state.materials, state.macro);
  state.deposits = state.deposits || [];
  state.terrainEdits = state.terrainEdits || [];
  state.protoCells = state.protoCells || [];
  state.nudges = state.nudges || [];
  state.pendingSites = state.pendingSites || [];
  state.activeSignals = state.activeSignals || [];
  state.recentRaids = state.recentRaids || [];
  state.remnants = state.remnants || [];
  state.combatFx = state.combatFx || [];
  state.nextIds = Object.assign({ creature:1, fragment:1, deposit:1, terrain:1, camp:1, lineage:1, event:1, proto:1, nudge:1 }, state.nextIds || {});
  if(state.eraIndex == null){
    state.eraIndex = state.camps.length ? (state.camps.some(camp => camp.level >= 2) ? ERA_INDEX.settlements : ERA_INDEX.place) : state.creatures.length ? ERA_INDEX.creatures : state.fragments.length ? ERA_INDEX.materials : ERA_INDEX.genesis;
  }
  state.rng = mulberry32(state.seedInt + Math.floor(state.time * 1000));
  state.static = generateStaticFields(state.seedInt, state.origin, state.materials, state.macro);
  if(!state.deposits.length) state.deposits = generateDeposits(DEPOSIT_COUNT);
  state.snapshots = priorSnapshots;
  for(const cell of state.protoCells){
    cell.homeX = cell.homeX ?? cell.x;
    cell.homeY = cell.homeY ?? cell.y;
    cell.homeZone = cell.homeZone || cell.niche || regionLabelAt(cell.homeX, cell.homeY, state.macro);
    cell.niche = cell.niche || cell.homeZone;
    cell.organization = cell.organization ?? 0.2;
    cell.complexity = cell.complexity ?? 0.2;
    cell.embodiment = cell.embodiment ?? 0.2;
    cell.lastSplitTime = cell.lastSplitTime ?? -999;
    cell.lastSpawnTime = cell.lastSpawnTime ?? -999;
    cell.traits = cell.traits || {
      mobility: 0.2,
      manipulation: 0.2,
      sheltering: 0.2,
      aggression: 0.2,
      signaling: 0.2,
      memory: 0.2
    };
    cell.emergence = cell.emergence || {
      score: 0,
      stabilityTime: 0,
      ready: false
    };
  }
  for(const camp of state.camps){
    camp.foundingEra = camp.foundingEra ?? state.eraIndex;
    camp.householdCount = camp.householdCount || 0;
    camp.offspringCount = camp.offspringCount || 0;
    camp.roleDiversity = camp.roleDiversity || 0;
    camp.lineageMix = camp.lineageMix || 0;
    camp.domesticity = camp.domesticity || 0;
    camp.pathDensity = camp.pathDensity || 0;
    camp.territoryRadius = camp.territoryRadius || 120;
    camp.rivalCampId = camp.rivalCampId || null;
    camp.householdNodes = camp.householdNodes || [];
    camp.households = camp.households || [];
    camp.collectiveMemory = camp.collectiveMemory || [];
    camp.lexicon = camp.lexicon || {};
    camp.signalUse = camp.signalUse || {};
    camp.exchange = camp.exchange || { totalVolume:0, neighborVolume:{}, lastTransfer:0, lastExternalTrade:0 };
    camp.diplomacy = camp.diplomacy || { relations:{} };
    camp.war = camp.war || { lastRaid:-999, victories:0, losses:0 };
    camp.ritualMarkers = camp.ritualMarkers || [];
    camp.society = camp.society || { cohesion:0.4, tradition:0.15, expansion:0.2, memoryLoad:0 };
    camp.depositAccess = camp.depositAccess || 0;
    camp.activeProject = camp.activeProject || null;
    camp.projectCooldown = camp.projectCooldown || 0;
    camp.terrainSignature = camp.terrainSignature || { road:0, berm:0, shrine:0, stockpile:0, pit:0, scar:0, ramp:0 };
    camp.lastUpwelling = camp.lastUpwelling || 0;
    camp.lastBreakthrough = camp.lastBreakthrough || 0;
    camp.lastRitualBoom = camp.lastRitualBoom || 0;
    camp.lastSchism = camp.lastSchism || 0;
  }
  for(const deposit of state.deposits){
    deposit.richness = clamp(deposit.richness ?? 0.5, 0.18, 1.35);
    deposit.capacity = Math.max(4, Math.round(deposit.capacity ?? (6 + deposit.richness * 10)));
    deposit.quantity = clamp(deposit.quantity ?? deposit.capacity, 0, deposit.capacity);
    deposit.radius = deposit.radius || clamp(20 + deposit.richness * 18, 18, 42);
    deposit.regen = deposit.regen || (DEPOSIT_REGEN * (0.9 + deposit.richness * 0.4));
    deposit.zone = deposit.zone || regionLabelAt(deposit.x, deposit.y, state.macro);
    deposit.cooldown = deposit.cooldown || 0;
    deposit.phase = deposit.phase ?? randRange(state.rng, 0, Math.PI * 2);
    if(!deposit.lumps?.length){
      deposit.lumps = generateDepositPattern(hashString(`${state.seedStr}:${deposit.x.toFixed(1)}:${deposit.y.toFixed(1)}:${deposit.materialId}`), deposit.radius, deposit.richness);
    }
    deposit.depletedNotified = !!deposit.depletedNotified;
  }
  for(const edit of state.terrainEdits){
    edit.radius = edit.radius || 18;
    edit.strength = clamp(edit.strength ?? 0.4, 0.04, 1.4);
    edit.age = edit.age || 0;
    edit.kind = edit.kind || 'pit';
    edit.materialId = edit.materialId ?? sampleEnv(edit.x, edit.y).materialId;
    edit.phase = edit.phase ?? randRange(state.rng, 0, Math.PI * 2);
    edit.campId = edit.campId ?? null;
  }
  for(const frag of state.fragments){
    if(frag.placedAt === undefined){
      frag.placedAt = frag.state === 'placed'
        ? Math.max(0, state.time - Math.min(6, frag.age || 0))
        : null;
    }
  }
  for(const cr of state.creatures){
    const lineage = state.lineages.find(l => l.id === cr.lineageId);
    if(lineage) cr.stats = deriveCreatureStats(lineage);
    cr.memory = cr.memory || randRange(state.rng, 0.7, 1.25);
    if(cr.favoriteMaterialId === undefined) cr.favoriteMaterialId = null;
    if(cr.parentId === undefined) cr.parentId = null;
    if(cr.householdId === undefined) cr.householdId = null;
    if(cr.birthTime === undefined) cr.birthTime = 0;
    if(cr.foundingDrive === undefined) cr.foundingDrive = 0;
    if(cr.targetType === undefined) cr.targetType = null;
    if(cr.hitFlash === undefined) cr.hitFlash = 0;
    if(cr.attackFlash === undefined) cr.attackFlash = 0;
    if(cr.gaitPhase === undefined) cr.gaitPhase = cr.phase * Math.PI * 2;
    if(cr.stepStrength === undefined) cr.stepStrength = 0;
    if(cr.visualLean === undefined) cr.visualLean = 0;
    if(cr.turnVisual === undefined) cr.turnVisual = 0;
    if(cr.loadVisual === undefined) cr.loadVisual = 0;
    cr.lastSignalTime = cr.lastSignalTime || 0;
    if(!cr.memories) cr.memories = [];
  }
  rebuildIndexes();
  ui.selected = null;
  clearForecast();
  refreshInspector(true);
}

function recordSnapshot(){
  const snap = serializeWorld(false);
  state.snapshots.push(JSON.parse(JSON.stringify(snap)));
  if(state.snapshots.length > SNAPSHOT_MAX) state.snapshots.shift();
  timeline.max = String(state.snapshots.length);
  timeline.value = String(state.snapshots.length);
  timelineLabel.textContent = 'live';
}
function enterReplay(index){
  if(index >= state.snapshots.length){ exitReplay(); return; }
  if(!ui.replay){
    ui.liveBackup = serializeWorld(true);
    ui.pauseBeforeReplay = ui.paused;
  }
  ui.replay = true;
  ui.paused = true;
  clearForecast();
  pauseBtn.textContent = 'Play';
  loadWorld(state.snapshots[index], true);
  timelineLabel.textContent = `snapshot ${index + 1}/${state.snapshots.length}`;
}
function exitReplay(){
  if(!ui.replay) return;
  const backup = ui.liveBackup;
  const pausedBeforeReplay = ui.pauseBeforeReplay;
  ui.replay = false;
  if(backup){
    loadWorld(backup, false);
  }
  ui.liveBackup = null;
  ui.pauseBeforeReplay = false;
  ui.paused = pausedBeforeReplay;
  clearForecast();
  timeline.value = String(state.snapshots.length);
  timelineLabel.textContent = 'live';
  pauseBtn.textContent = ui.paused ? 'Play' : 'Pause';
}
function saveWorldToFile(){
  const blob = new Blob([JSON.stringify(serializeWorld(true), null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.seedStr.replace(/[^a-z0-9_-]+/gi,'_') || 'world'}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function setCanvasSize(){
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
