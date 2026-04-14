function bucketKey(ix, iy){ return `${ix},${iy}`; }
function buildSpatialBuckets(items){
  const buckets = new Map();
  for(const item of items){
    const x = item.x ?? item.anchorX;
    const y = item.y ?? item.anchorY;
    const key = bucketKey(Math.floor(x / SPATIAL_BUCKET), Math.floor(y / SPATIAL_BUCKET));
    if(!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }
  return buckets;
}
function nearbyFromBuckets(buckets, x, y, range){
  if(!buckets) return [];
  const out = [];
  const cx = Math.floor(x / SPATIAL_BUCKET);
  const cy = Math.floor(y / SPATIAL_BUCKET);
  const span = Math.ceil(range / SPATIAL_BUCKET);
  for(let oy = -span; oy <= span; oy++){
    for(let ox = -span; ox <= span; ox++){
      const list = buckets.get(bucketKey(cx + ox, cy + oy));
      if(list) out.push(...list);
    }
  }
  return out;
}
function rebuildIndexes(){
  const lineages = new Map(state.lineages.map(item => [item.id, item]));
  const camps = new Map(state.camps.map(item => [item.id, item]));
  const creatures = new Map(state.creatures.map(item => [item.id, item]));
  const fragments = new Map(state.fragments.map(item => [item.id, item]));
  const deposits = new Map((state.deposits || []).map(item => [item.id, item]));
  const terrainEdits = new Map((state.terrainEdits || []).map(item => [item.id, item]));
  const tribes = new Map(state.tribes.map(item => [item.id, item]));

  const campMembers = new Map();
  const campStoredFragments = new Map();
  const campPlacedFragments = new Map();
  const campAllFragments = new Map();

  const liveCreatures = [];
  const liveNomads = [];
  const activeCamps = state.camps.filter(camp => !camp.abandoned);

  for(const creature of state.creatures){
    if(!creature.alive) continue;
    liveCreatures.push(creature);

    if(creature.campId != null){
      if(!campMembers.has(creature.campId)) campMembers.set(creature.campId, []);
      campMembers.get(creature.campId).push(creature);
    }else{
      liveNomads.push(creature);
    }
  }

  for(const fragment of state.fragments){
    if(fragment.siteId == null) continue;

    if(!campAllFragments.has(fragment.siteId)) campAllFragments.set(fragment.siteId, []);
    campAllFragments.get(fragment.siteId).push(fragment);

    if(fragment.state === 'stored'){
      if(!campStoredFragments.has(fragment.siteId)) campStoredFragments.set(fragment.siteId, []);
      campStoredFragments.get(fragment.siteId).push(fragment);
    }else if(fragment.state === 'placed'){
      if(!campPlacedFragments.has(fragment.siteId)) campPlacedFragments.set(fragment.siteId, []);
      campPlacedFragments.get(fragment.siteId).push(fragment);
    }
  }

  state.indexes = {
    lineages,
    camps,
    creatures,
    fragments,
    deposits,
    terrainEdits,
    tribes,
    campMembers,
    campStoredFragments,
    campPlacedFragments,
    campAllFragments,
    nomads: liveNomads
  };

  state.spatial = {
    camps: buildSpatialBuckets(activeCamps),
    creatures: buildSpatialBuckets(liveCreatures),
    deposits: buildSpatialBuckets((state.deposits || []).filter(deposit => deposit.quantity > 0.1)),
    terrainEdits: buildSpatialBuckets((state.terrainEdits || []).filter(edit => (edit.strength || 0) > 0.04)),
    fragments: buildSpatialBuckets(state.fragments),
    placedFragments: buildSpatialBuckets(state.fragments.filter(fragment => fragment.state === 'placed')),
    looseFragments: buildSpatialBuckets(state.fragments.filter(fragment => fragment.state === 'loose')),
    nomads: buildSpatialBuckets(liveNomads)
  };
}
function getLineage(id){ return state.indexes?.lineages.get(id) || state.lineages.find(l => l.id === id) || null; }
function getCamp(id){ return state.indexes?.camps.get(id) || state.camps.find(c => c.id === id) || null; }
function getCreature(id){ return state.indexes?.creatures.get(id) || state.creatures.find(c => c.id === id) || null; }
function getFragment(id){ return state.indexes?.fragments.get(id) || state.fragments.find(f => f.id === id) || null; }
function getDeposit(id){ return state.indexes?.deposits.get(id) || (state.deposits || []).find(d => d.id === id) || null; }
function trimMemories(memories){
  memories.sort((a, b) => (b.strength - a.strength) || (a.age - b.age));
  if(memories.length > MEMORY_LIMIT) memories.length = MEMORY_LIMIT;
}
function reinforceMemory(list, type, payload, strength=0.35){
  const merge = list.find(memory => memory.type === type && ((payload.campId && memory.campId === payload.campId) || (payload.materialId != null && memory.materialId === payload.materialId) || (payload.householdId && memory.householdId === payload.householdId) || (payload.x != null && memory.x != null && dist(payload.x, payload.y, memory.x, memory.y) < 90)));
  const target = merge || { type, age:0, strength:0, note:'', x:null, y:null, campId:null, lineageId:null, materialId:null, householdId:null, zone:null };
  target.age = 0;
  target.strength = clamp(target.strength + strength, 0, 1.8);
  Object.assign(target, payload);
  if(!merge) list.push(target);
  trimMemories(list);
  return target;
}
function decayMemories(list, dt){
  for(const memory of list){
    memory.age += dt;
    memory.strength *= Math.exp(-dt * 0.014);
  }
  return list.filter(memory => memory.strength > 0.08 && memory.age < 900);
}
function rememberCreature(creature, type, payload={}, strength=0.35){
  if(!creature.memories) creature.memories = [];
  reinforceMemory(creature.memories, type, payload, strength);
}
function rememberCamp(camp, type, payload={}, strength=0.28){
  if(!camp.collectiveMemory) camp.collectiveMemory = [];
  reinforceMemory(camp.collectiveMemory, type, payload, strength);
}
function strongestMemory(owner, type){
  const list = owner?.memories || owner?.collectiveMemory || [];
  let best = null;
  for(const memory of list){
    if(type && memory.type !== type) continue;
    if(!best || memory.strength > best.strength) best = memory;
  }
  return best;
}
function updateSemanticMemory(creature, key, value, strength=0.08){
  if(!creature.mind?.semantic) return;
  const sem = creature.mind.semantic;
  if(!sem[key]) sem[key] = {};
  const entry = sem[key];
  const existing = entry[value] || 0;
  entry[value] = clamp(existing + strength, 0, 1.5);
}
function getSemanticValue(creature, key, value){
  return creature?.mind?.semantic?.[key]?.[value] || 0;
}
function addSacredSite(creature, x, y, type='ancestor', strength=0.3){
  if(!creature.mind?.symbolic?.sacredSites) return;
  const sites = creature.mind.symbolic.sacredSites;
  sites.push({ x, y, type, strength, age:0 });
  if(sites.length > 6) sites.shift();
}
function updateSacredSites(creature, dt){
  if(!creature.mind?.symbolic?.sacredSites) return;
  const sites = creature.mind.symbolic.sacredSites;
  for(const site of sites){
    site.age += dt;
    site.strength *= Math.exp(-dt * 0.012);
  }
  while(sites.length > 0 && sites[0].strength < 0.08) sites.shift();
}
function pushGoal(creature, goalType, targetX, targetY, priority=1.0){
  if(!creature.mind?.goals) return;
  creature.mind.goals.push({
    type: goalType,
    x: targetX,
    y: targetY,
    priority,
    age: 0
  });
  creature.mind.goals.sort((a,b) => b.priority - a.priority);
  if(creature.mind.goals.length > 5) creature.mind.goals.pop();
}
function updateGoals(creature, dt){
  if(!creature.mind?.goals) return;
  const goals = creature.mind.goals;
  for(const goal of goals){
    goal.age += dt;
    goal.priority *= Math.exp(-dt * 0.025);
  }
  while(goals.length > 0 && goals[0].priority < 0.15) goals.shift();
}
function pickTopGoal(creature){
  if(!creature.mind?.goals?.length) return null;
  return creature.mind.goals[0];
}
function getCampMembers(campId){
  return state.indexes?.campMembers.get(campId) || [];
}
function getCampStoredFragments(campId){
  return state.indexes?.campStoredFragments.get(campId) || [];
}
function getCampPlacedFragments(campId){
  return state.indexes?.campPlacedFragments.get(campId) || [];
}
function getCampFragments(campId){
  return state.indexes?.campAllFragments.get(campId) || [];
}
function getNearbyNomads(x, y, range=140){
  const out = [];
  for(const cr of nearbyFromBuckets(state.spatial?.nomads, x, y, range)){
    if(!cr.alive || cr.campId) continue;
    if(distSq(x, y, cr.x, cr.y) < range * range) out.push(cr);
  }
  return out;
}
function copyMemoryPayload(memory){
  return {
    x: memory.x,
    y: memory.y,
    campId: memory.campId ?? null,
    lineageId: memory.lineageId ?? null,
    materialId: memory.materialId ?? null,
    householdId: memory.householdId ?? null,
    zone: memory.zone ?? null,
    note: memory.note ?? ''
  };
}
function shareMemorySamples(sourceMemories, receiver, dt, strengthScale=0.04, maxCount=2){
  if(!sourceMemories?.length) return;
  const ranked = sourceMemories
    .slice()
    .sort((a, b) => (b.strength - a.strength) || (a.age - b.age))
    .slice(0, maxCount);

  for(const memory of ranked){
    if(memory.x == null || memory.y == null) continue;
    rememberCreature(
      receiver,
      memory.type,
      copyMemoryPayload(memory),
      strengthScale * dt * clamp(memory.strength, 0.2, 1.2)
    );
  }
}

function householdKeyFor(creature, camp, seed=0){
  return `${camp.id}:${creature.lineageId}:${seed || creature.parentId || creature.id}`;
}
function assignCreatureToHousehold(creature, camp, householdId=null){
  creature.householdId = householdId || creature.householdId || householdKeyFor(creature, camp);
}
function addSymbolToken(holder, token, amount=0.1){
  if(holder?.mind?.symbolic?.tokens){
    holder.mind.symbolic.tokens[token] = clamp((holder.mind.symbolic.tokens[token] || 0) + amount, 0, 4);
    return;
  }
  if(holder?.symbols){
    holder.symbols[token] = clamp((holder.symbols[token] || 0) + amount, 0, 4);
  }
}
function decaySymbolBag(bag, dt, floor=0){
  for(const key of Object.keys(bag)){
    bag[key] = Math.max(floor, bag[key] * Math.exp(-dt * 0.01));
    if(bag[key] < 0.02) delete bag[key];
  }
}
function rememberEpisode(creature, type, payload={}, strength=0.35){
  rememberCreature(creature, type, payload, strength);
  creature.mind.episodic.unshift({ t: state.time, type, payload, strength });
  if(creature.mind.episodic.length > 12) creature.mind.episodic.length = 12;
}
function semanticBlend(map, key, target, rate=0.08){
  map[key] = lerp(map[key] ?? 0.5, target, rate);
}
function shareMind(source, target, factor=0.05){
  if(!source || !target || source.id === target.id) return;

  shareMemorySamples(source.memories || [], target, 1, factor, 2);

  if(source.mind?.symbolic?.tokens){
    for(const [token, value] of Object.entries(source.mind.symbolic.tokens)){
      addSymbolToken(target, token, value * factor * 0.6);
    }
  }

  if(source.tribeId != null){
    target.mind.semantic.tribeAffinity[source.tribeId] = clamp(
      (target.mind.semantic.tribeAffinity[source.tribeId] || 0.5) + factor * 0.5,
      0,
      1.5
    );
  }
}

function shareCampKnowledge(camp, dt){
  const members = getCampMembers(camp.id);
  if(members.length < 2) return;

  const houses = new Map();
  for(const member of members){
    if(!houses.has(member.householdId)) houses.set(member.householdId, []);
    houses.get(member.householdId).push(member);
  }

  for(const group of houses.values()){
    for(let i = 0; i < group.length; i++){
      for(let j = i + 1; j < group.length; j++){
        shareMind(group[i], group[j], 0.03 * dt);
        shareMind(group[j], group[i], 0.03 * dt);
      }
    }
  }

  const elders = members
    .filter(m => m.age > 160)
    .sort((a, b) => b.age - a.age)
    .slice(0, 3);

  for(const elder of elders){
    for(const member of members){
      if(member.id === elder.id) continue;
      shareMind(elder, member, 0.012 * dt);
    }
  }

  for(const member of members){
    rememberCamp(camp, 'member', {
      x: member.x,
      y: member.y,
      householdId: member.householdId,
      lineageId: member.lineageId
    }, 0.01 * dt);
  }
}
function inheritPlaceMemory(parent, child, camp=null){
  if(!parent) return;

  child.anchorX = parent.anchorX;
  child.anchorY = parent.anchorY;
  child.anchorAffinity = Math.max(child.anchorAffinity, parent.anchorAffinity * 0.82);

  shareMemorySamples(parent.memories || [], child, 1, 0.22, 3);

  if(camp){
    rememberEpisode(child, 'home', {
      x: camp.x,
      y: camp.y,
      campId: camp.id,
      householdId: child.householdId,
      note: camp.name,
      zone: regionLabelAt(camp.x, camp.y, state.macro)
    }, 0.9);
    addSymbolToken(child, 'hearth', 0.5);
  }else{
    const env = sampleEnv(parent.anchorX, parent.anchorY);
    rememberEpisode(child, 'home', {
      x: parent.anchorX,
      y: parent.anchorY,
      householdId: child.householdId,
      materialId: env.materialId,
      zone: env.zone,
      note: 'inherited place memory'
    }, 0.55);
    rememberEpisode(child, 'safe', {
      x: parent.anchorX,
      y: parent.anchorY,
      materialId: env.materialId,
      zone: env.zone
    }, 0.42);
    addSymbolToken(child, 'safe-return', 0.35);
  }

  if(parent.favoriteMaterialId != null){
    child.favoriteMaterialId = parent.favoriteMaterialId;
    rememberEpisode(child, 'material', { x: child.x, y: child.y, materialId: parent.favoriteMaterialId }, 0.24);
  }

  if(parent.tribeId != null){
    child.mind.semantic.tribeAffinity[parent.tribeId] = 1;
  }
}
function chooseRitualSite(creature, camp){
  if(camp?.ritualMarkers?.length){
    return camp.ritualMarkers
      .slice()
      .sort((a, b) => dist(creature.x, creature.y, a.x, a.y) - dist(creature.x, creature.y, b.x, b.y))[0];
  }

  const sacred = creature.mind.symbolic.sacredSites?.[0];
  if(sacred) return sacred;

  return { x: camp.x, y: camp.y };
}
function setIntent(creature, intent){
  creature.intent = intent.name;
  creature.intentScore = intent.score;
  creature.intentTtl = clamp(intent.ttl ?? INTENT_MIN_TTL, INTENT_MIN_TTL, INTENT_MAX_TTL);
  creature.state = intent.name;
  creature.reason = intent.reason;
  creature.targetX = intent.x;
  creature.targetY = intent.y;
  creature.targetId = intent.id ?? null;
  creature.targetType = intent.targetType ?? null;
  creature.mind.currentIntent = intent.name;
}
function campSymbolValue(camp, key){
  return camp?.symbols?.[key] || 0;
}
function getSemanticZoneSafety(creature, zone, fallback=0.5){
  return creature.mind.semantic.zoneSafety[zone] ?? fallback;
}
function getSemanticMaterialValue(creature, materialId, fallback=0.5){
  return creature.mind.semantic.materialValue[materialId] ?? fallback;
}
function chooseIntent(creature, intents){
  intents.sort((a, b) => b.score - a.score);
  return intents[0];
}
function updateCreatureMemory(creature, dt){
  creature.memories = decayMemories(creature.memories || [], dt);
  decaySymbolBag(creature.mind.symbolic.tokens, dt);
  updateSacredSites(creature, dt);
  updateGoals(creature, dt);

  const camp = getCamp(creature.campId);
  const env = sampleEnv(creature.x, creature.y);

  semanticBlend(
    creature.mind.semantic.zoneSafety,
    env.zone,
    env.safe,
    0.06 * dt
  );

  semanticBlend(
    creature.mind.semantic.materialValue,
    env.materialId,
    env.resource + state.materials[env.materialId].signal * 0.2,
    0.05 * dt
  );

  if(camp){
    creature.mind.semantic.campTrust[camp.id] = clamp(
      (creature.mind.semantic.campTrust[camp.id] || 0.5) + 0.03 * dt,
      0,
      1.5
    );

    rememberEpisode(creature, 'home', {
      x: camp.x,
      y: camp.y,
      campId: camp.id,
      householdId: creature.householdId,
      zone: regionLabelAt(camp.x, camp.y, state.macro),
      note: camp.name
    }, 0.06 * dt);

    addSymbolToken(creature, 'hearth', 0.03 * dt);
    shareMemorySamples(camp.collectiveMemory || [], creature, dt, 0.015, 1);
  }

  if((creature.state === 'rest' || creature.state === 'graze' || creature.state === 'settle') && env.safe > 0.46){
    rememberEpisode(creature, 'safe', {
      x: creature.x,
      y: creature.y,
      materialId: env.materialId,
      zone: env.zone
    }, 0.05 * dt);

    addSymbolToken(creature, 'safe-return', 0.02 * dt);
  }

  if((creature.state === 'forage' || creature.state === 'graze' || creature.state === 'collect') && env.resource > 0.46){
    rememberEpisode(creature, 'resource', {
      x: creature.x,
      y: creature.y,
      materialId: env.materialId,
      zone: env.zone
    }, 0.05 * dt);
  }

  if(env.danger > 0.62){
    rememberEpisode(creature, 'threat', {
      x: creature.x,
      y: creature.y,
      zone: env.zone
    }, 0.03 * dt);

    addSymbolToken(creature, 'wound', 0.015 * dt);
  }

  if(creature.favoriteMaterialId != null){
    creature.mind.semantic.materialValue[creature.favoriteMaterialId] = clamp(
      (creature.mind.semantic.materialValue[creature.favoriteMaterialId] || 0.5) + 0.01 * dt,
      0,
      1.5
    );
  }
  hearSignals(creature, dt);
}
function updateCampMemory(camp, dt){
  camp.collectiveMemory = decayMemories(camp.collectiveMemory || [], dt * 0.7);
}
function evaluateIntentScore(creature, intentType, targetX, targetY){
  const tribe = getTribe(creature.tribeId);
  if(!tribe) return 0.5;

  const env = sampleEnv(targetX, targetY);
  let score = 0.5;

  if(intentType === 'forage'){
    score = env.resource * 0.6 + env.safe * 0.3;
    if(tribe.doctrine.curiosity > 0.6) score *= 1.2;
  }else if(intentType === 'migrate'){
    score = env.safe * 0.5 + tribe.doctrine.migration * 0.4;
  }else if(intentType === 'build'){
    score = env.safe * 0.4 + tribe.doctrine.ritual * 0.35;
  }else if(intentType === 'ritual'){
    score = env.safe * 0.45 + tribe.doctrine.ritual * 0.5;
  }else if(intentType === 'explore'){
    score = tribe.doctrine.curiosity * 0.7;
  }

  return score;
}
function formIntent(creature, intentType, targetX, targetY, ttl=5){
  const score = evaluateIntentScore(creature, intentType, targetX, targetY);
  creature.intent = intentType;
  creature.intentScore = score;
  creature.intentTtl = ttl;
  if(creature.mind) creature.mind.currentIntent = intentType;
}
function decayIntent(creature, dt){
  if(creature.intentTtl > 0){
    creature.intentTtl -= dt;
    if(creature.intentTtl <= 0){
      creature.intent = null;
      creature.intentScore = 0;
      if(creature.mind) creature.mind.currentIntent = null;
    }
  }
}
function shouldFormNewIntent(creature){
  if(creature.intentTtl <= 0) return true;
  if(creature.intentScore < 0.35) return true;
  if(creature.intentTtl < INTENT_MIN_TTL) return true;
  return false;
}
