function emptyStocks(){
  return { food:0, shelter:0, defense:0, ritual:0, trade:0 };
}

function emptyHouseholdRecord(id){
  return {
    id,
    members: 1,
    young: 0,
    stocks: emptyStocks(),
    targets: emptyStocks(),
    surplus: emptyStocks(),
    deficit: emptyStocks(),
    balance: 0
  };
}

function materialNeedProfile(materialId){
  const mat = state.materials[materialId];
  return {
    food: clamp(mat.stats.energy * 1.2 + mat.stats.insulation * 0.1, 0, 2),
    shelter: clamp(mat.stats.load * 0.7 + mat.stats.stick * 0.5 + mat.stats.insulation * 0.4 + mat.stats.durability * 0.3, 0, 2.5),
    defense: clamp(mat.stats.sharp * 0.8 + mat.stats.durability * 0.4 + mat.stats.load * 0.2, 0, 2.5),
    ritual: clamp(mat.signal * 0.8 + mat.stats.energy * 0.2 + mat.stats.sharp * 0.1, 0, 2),
    trade: clamp(mat.signal * 0.5 + mat.stats.flex * 0.2 + mat.stats.load * 0.2 + mat.stats.energy * 0.2, 0, 2)
  };
}

function ensureCampLexicon(camp){
  if(!camp.lexicon) camp.lexicon = {};
  const tribe = getTribe(camp.tribeId);
  const bank = tribe?.symbolSet?.length ? tribe.symbolSet : SYMBOL_TOKENS;

  for(const meaning of SIGNAL_MEANINGS){
    if(!camp.lexicon[meaning]){
      camp.lexicon[meaning] = pick(state.rng, bank);
    }
  }
}

function campSignalToken(camp, meaning){
  ensureCampLexicon(camp);
  return camp.lexicon[meaning] || meaning;
}

function emitSignal(x, y, campId, tribeId, meaning, strength=0.35, ttl=SIGNAL_TTL){
  const camp = campId != null ? getCamp(campId) : null;
  const tribe = tribeId != null ? getTribe(tribeId) : null;

  const token = camp
    ? campSignalToken(camp, meaning)
    : (tribe?.symbolSet?.length ? pick(state.rng, tribe.symbolSet) : meaning);

  if(camp){
    camp.signalUse[meaning] = (camp.signalUse[meaning] || 0) + strength;
  }

  state.activeSignals.push({
    x, y,
    campId,
    tribeId,
    meaning,
    token,
    strength,
    ttl,
    age: 0,
    radius: SIGNAL_RADIUS
  });

  if(state.activeSignals.length > 120) state.activeSignals.shift();
}

function updateActiveSignals(dt){
  if(!state.activeSignals?.length) return;
  for(const signal of state.activeSignals){
    signal.age += dt;
    signal.strength *= Math.exp(-dt * 0.05);
  }
  state.activeSignals = state.activeSignals.filter(s => s.age < s.ttl && s.strength > 0.05);
}

function hearSignals(creature, dt){
  if(!state.activeSignals?.length) return;

  for(const signal of state.activeSignals){
    if(dist(creature.x, creature.y, signal.x, signal.y) > signal.radius) continue;

    const campTrust = signal.campId != null
      ? (creature.mind.semantic.campTrust[signal.campId] || 0.5)
      : 0.45;

    const tribeAffinity = signal.tribeId != null
      ? (creature.mind.semantic.tribeAffinity[signal.tribeId] || 0.5)
      : 0.45;

    const trust = clamp((campTrust + tribeAffinity) * 0.5, 0.05, 1.2);

    creature.mind.symbolic.mythsHeard[signal.token] = clamp(
      (creature.mind.symbolic.mythsHeard[signal.token] || 0) + 0.02 * dt * trust,
      0,
      1.5
    );

    if(signal.meaning === 'danger' || signal.meaning === 'raid'){
      rememberEpisode(creature, 'threat', {
        x: signal.x,
        y: signal.y,
        campId: signal.campId,
        note: signal.token
      }, 0.03 * dt * trust);
      addSymbolToken(creature, 'rival-fire', 0.01 * dt * trust);
    }else if(signal.meaning === 'food' || signal.meaning === 'trade'){
      rememberEpisode(creature, 'resource', {
        x: signal.x,
        y: signal.y,
        campId: signal.campId,
        note: signal.token
      }, 0.025 * dt * trust);
    }else if(signal.meaning === 'home' || signal.meaning === 'ritual'){
      rememberEpisode(creature, 'home', {
        x: signal.x,
        y: signal.y,
        campId: signal.campId,
        note: signal.token
      }, 0.02 * dt * trust);
      addSymbolToken(creature, 'safe-return', 0.008 * dt * trust);
    }

    if(signal.campId != null){
      creature.mind.semantic.campTrust[signal.campId] = clamp(
        (creature.mind.semantic.campTrust[signal.campId] || 0.5) + 0.004 * dt * trust,
        0,
        1.5
      );
    }
  }
}

function maybeBroadcastCreatureSignal(cr, dt){
  if(state.eraIndex < ERA_INDEX.exchange) return;
  if(state.time - (cr.lastSignalTime || 0) < 2.2) return;

  let meaning = null;
  if(cr.state === 'flee' || cr.state === 'fight') meaning = 'danger';
  else if(cr.state === 'forage' || cr.state === 'graze') meaning = 'food';
  else if(cr.state === 'return' || cr.state === 'rest' || cr.state === 'settle') meaning = 'home';
  else if(cr.state === 'ritual') meaning = 'ritual';
  else if(cr.state === 'build' || cr.state === 'collect') meaning = 'trade';

  if(!meaning) return;

  cr.lastSignalTime = state.time;
  emitSignal(cr.x, cr.y, cr.campId, cr.tribeId, meaning, 0.22);
}

function chooseHouseholdRepresentative(camp, householdId){
  return getCampMembers(camp.id).find(m => m.householdId === householdId) || null;
}

function buildHouseholdEconomy(camp){
  const households = new Map();

  for(const node of camp.householdNodes || []){
    const rec = emptyHouseholdRecord(node.id);
    rec.members = node.count;
    rec.young = node.young;
    households.set(node.id, rec);
  }

  const fallbackId = camp.householdNodes[0]?.id || `camp:${camp.id}:core`;
  if(!households.size){
    households.set(fallbackId, emptyHouseholdRecord(fallbackId));
  }

  for(const frag of getCampFragments(camp.id)){
    if(!frag.ownerHouseholdId) frag.ownerHouseholdId = fallbackId;
    if(!households.has(frag.ownerHouseholdId)){
      households.set(frag.ownerHouseholdId, emptyHouseholdRecord(frag.ownerHouseholdId));
    }

    const house = households.get(frag.ownerHouseholdId);
    const prof = materialNeedProfile(frag.materialId);
    house.stocks.food += prof.food;
    house.stocks.shelter += prof.shelter;
    house.stocks.defense += prof.defense;
    house.stocks.ritual += prof.ritual;
    house.stocks.trade += prof.trade;
  }

  for(const house of households.values()){
    house.targets = {
      food: HOUSEHOLD_TARGETS.food + house.members * 0.8 + house.young * 1.2,
      shelter: HOUSEHOLD_TARGETS.shelter + house.members * 0.6,
      defense: HOUSEHOLD_TARGETS.defense + house.members * 0.35,
      ritual: HOUSEHOLD_TARGETS.ritual + house.young * 0.15,
      trade: HOUSEHOLD_TARGETS.trade + house.members * 0.25
    };

    house.balance = 0;
    for(const key of Object.keys(house.targets)){
      house.deficit[key] = Math.max(0, house.targets[key] - house.stocks[key]);
      house.surplus[key] = Math.max(0, house.stocks[key] - house.targets[key] * 0.9);
      house.balance += house.stocks[key] - house.targets[key];
    }
  }

  camp.households = [...households.values()];
}

function getRelationState(camp, other){
  if(!camp.diplomacy) camp.diplomacy = { relations:{} };
  if(!camp.diplomacy.relations[other.id]){
    camp.diplomacy.relations[other.id] = {
      trust: 0.4,
      tension: 0,
      trade: 0,
      raids: 0,
      allied: false,
      war: false,
      lastTrade: 0,
      lastRaid: -999
    };
  }
  return camp.diplomacy.relations[other.id];
}

function campResourceVector(camp){
  const out = emptyStocks();
  for(const frag of getCampStoredFragments(camp.id)){
    const prof = materialNeedProfile(frag.materialId);
    out.food += prof.food;
    out.shelter += prof.shelter;
    out.defense += prof.defense;
    out.ritual += prof.ritual;
    out.trade += prof.trade;
  }
  return out;
}

function attemptCampExchange(camp, dt){
  if(state.eraIndex < ERA_INDEX.exchange) return;
  if(state.time - (camp.exchange?.lastTransfer || 0) < CAMP_TRANSFER_COOLDOWN) return;
  if(!camp.households?.length || camp.households.length < 2) return;

  let best = null;
  let bestScore = 0;

  for(const donor of camp.households){
    for(const receiver of camp.households){
      if(donor.id === receiver.id) continue;

      for(const key of Object.keys(HOUSEHOLD_TARGETS)){
        const score = donor.surplus[key] * receiver.deficit[key];
        if(score > bestScore){
          bestScore = score;
          best = { donor, receiver, key };
        }
      }
    }
  }

  if(!best || bestScore < 1.1) return;

  const frag = getCampStoredFragments(camp.id)
    .filter(f => (f.ownerHouseholdId || camp.households[0]?.id) === best.donor.id)
    .sort((a, b) => materialNeedProfile(b.materialId)[best.key] - materialNeedProfile(a.materialId)[best.key])[0];

  if(!frag) return;

  frag.ownerHouseholdId = best.receiver.id;

  const receiverNode = camp.householdNodes.find(n => n.id === best.receiver.id);
  if(receiverNode){
    frag.x = lerp(frag.x, receiverNode.x, 0.45);
    frag.y = lerp(frag.y, receiverNode.y, 0.45);
  }

  camp.exchange.totalVolume += materialNeedProfile(frag.materialId)[best.key];
  camp.exchange.lastTransfer = state.time;

  emitSignal(camp.x, camp.y, camp.id, camp.tribeId, 'trade', 0.35);
  recordEvent('trade', `${camp.name} exchanged ${best.key} between households`, camp.x, camp.y, camp.id);

  const a = chooseHouseholdRepresentative(camp, best.donor.id);
  const b = chooseHouseholdRepresentative(camp, best.receiver.id);
  if(a && b){
    shareMind(a, b, 0.1);
    shareMind(b, a, 0.1);
  }
}

function attemptIntercampTrade(camp, dt){
  if(state.eraIndex < ERA_INDEX.exchange) return;
  if(state.time - (camp.exchange?.lastExternalTrade || 0) < INTERCAMP_TRADE_COOLDOWN) return;
  if(camp.storedCount < 2) return;

  const own = campResourceVector(camp);
  const nearby = nearbyFromBuckets(state.spatial?.camps, camp.x, camp.y, INTERCAMP_TRADE_RADIUS)
    .filter(other => other.id !== camp.id && !other.abandoned);

  let best = null;
  let bestScore = 0;

  for(const other of nearby){
    const rel = getRelationState(camp, other);
    if(rel.war) continue;
    if(rel.trust < -0.2) continue;

    const theirs = campResourceVector(other);
    const d = dist(camp.x, camp.y, other.x, other.y);

    for(const key of Object.keys(HOUSEHOLD_TARGETS)){
      const score =
        Math.max(0, own[key] - theirs[key]) *
        Math.max(0, other.resourcePressure < 0 ? 1.2 : 0.8) *
        (1 + rel.trust) *
        (1 - d / INTERCAMP_TRADE_RADIUS);

      if(score > bestScore){
        bestScore = score;
        best = { other, key, rel };
      }
    }
  }

  if(!best || bestScore < 1.4) return;

  const frag = getCampStoredFragments(camp.id)
    .sort((a, b) => materialNeedProfile(b.materialId)[best.key] - materialNeedProfile(a.materialId)[best.key])[0];

  if(!frag) return;

  frag.siteId = best.other.id;
  frag.ownerHouseholdId = best.other.householdNodes[0]?.id || null;
  frag.x = best.other.x + randRange(state.rng, -18, 18);
  frag.y = best.other.y + randRange(state.rng, -18, 18);

  camp.exchange.totalVolume += materialNeedProfile(frag.materialId)[best.key];
  camp.exchange.lastExternalTrade = state.time;
  camp.exchange.neighborVolume[best.other.id] = (camp.exchange.neighborVolume[best.other.id] || 0) + 1;

  const relA = getRelationState(camp, best.other);
  const relB = getRelationState(best.other, camp);
  relA.trade += 1;
  relB.trade += 1;
  relA.lastTrade = state.time;
  relB.lastTrade = state.time;
  relA.trust = clamp(relA.trust + 0.08, -2, 3);
  relB.trust = clamp(relB.trust + 0.08, -2, 3);
  relA.tension = clamp(relA.tension - 0.04, 0, 5);
  relB.tension = clamp(relB.tension - 0.04, 0, 5);

  emitSignal(camp.x, camp.y, camp.id, camp.tribeId, 'trade', 0.55);
  emitSignal(best.other.x, best.other.y, best.other.id, best.other.tribeId, 'trade', 0.55);

  recordEvent('trade', `${camp.name} sent a caravan to ${best.other.name}`, best.other.x, best.other.y, best.other.id);
}

function updateCampLexiconDrift(camp, dt){
  if(state.eraIndex < ERA_INDEX.symbols) return;
  ensureCampLexicon(camp);

  const nearby = nearbyFromBuckets(state.spatial?.camps, camp.x, camp.y, INTERCAMP_TRADE_RADIUS)
    .filter(other => other.id !== camp.id && !other.abandoned);

  for(const other of nearby){
    ensureCampLexicon(other);
    const rel = getRelationState(camp, other);

    if((rel.allied || rel.trade > 2) && state.rng() < 0.008 * dt){
      camp.lexicon.trade = other.lexicon.trade;
    }
    if((rel.allied || rel.trade > 3) && state.rng() < 0.004 * dt){
      camp.lexicon.home = other.lexicon.home;
    }
    if(rel.tension > 1.2 && state.rng() < 0.004 * dt){
      const bank = getTribe(camp.tribeId)?.symbolSet || SYMBOL_TOKENS;
      camp.lexicon.raid = pick(state.rng, bank);
      camp.lexicon.danger = pick(state.rng, bank);
    }
  }
}

function attemptRaid(camp, other, rel, dt){
  if(state.eraIndex < ERA_INDEX.wars) return;
  if(rel.allied) return;
  if(state.time - camp.war.lastRaid < RAID_COOLDOWN) return;
  if(rel.tension < 1.4) return;
  if(camp.population < 4 || other.storedCount < 1) return;

  const attacker = camp.culture.aggression + Math.max(0, -camp.resourcePressure) * 0.08 + (camp.symbols['rival-fire'] || 0) * 0.2;
  const defender = other.culture.defense + other.population * 0.02 + other.placedCount * 0.02;
  const chanceScore = clamp(0.015 * dt * (attacker - defender + 0.8), 0, 0.18);

  if(state.rng() > chanceScore) return;

  const stash = getCampStoredFragments(other.id);
  const frag = stash[Math.floor(state.rng() * stash.length)];

  camp.war.lastRaid = state.time;
  camp.war.victories++;
  other.war.losses++;

  rel.raids += 1;
  rel.tension = clamp(rel.tension + 0.45, 0, 5);
  rel.trust = clamp(rel.trust - 0.45, -2, 3);
  rel.war = rel.tension > 1.5;

  const back = getRelationState(other, camp);
  back.raids += 1;
  back.tension = clamp(back.tension + 0.7, 0, 5);
  back.trust = clamp(back.trust - 0.6, -2, 3);
  back.war = back.tension > 1.5;

  if(frag){
    frag.siteId = camp.id;
    frag.ownerHouseholdId = camp.householdNodes[0]?.id || null;
    frag.x = camp.x + randRange(state.rng, -16, 16);
    frag.y = camp.y + randRange(state.rng, -16, 16);
  }

  if(other.ritualMarkers?.length && state.rng() < 0.4){
    other.ritualMarkers.pop();
  }

  state.recentRaids.push({ t:state.time, a:camp.id, b:other.id });
  if(state.recentRaids.length > 40) state.recentRaids.shift();

  emitSignal(other.x, other.y, other.id, other.tribeId, 'raid', 0.7);
  emitSignal(other.x, other.y, other.id, other.tribeId, 'danger', 0.6);

  recordEvent('raid', `${camp.name} raided ${other.name}`, other.x, other.y, other.id);
}

function updateCampFrontiers(camp, dt){
  if(state.eraIndex < ERA_INDEX.frontiers) return;

  const nearby = nearbyFromBuckets(state.spatial?.camps, camp.x, camp.y, RAID_RADIUS)
    .filter(other => other.id !== camp.id && !other.abandoned);

  for(const other of nearby){
    const rel = getRelationState(camp, other);
    const d = dist(camp.x, camp.y, other.x, other.y);
    const overlap = clamp(
      (camp.territoryRadius + other.territoryRadius - d) / Math.max(80, camp.territoryRadius + other.territoryRadius),
      0,
      1
    );

    rel.tension = clamp(
      rel.tension + dt * (
        overlap * 0.04 +
        Math.max(0, -camp.resourcePressure) * 0.003 +
        Math.max(0, -other.resourcePressure) * 0.003 -
        rel.trade * 0.0006
      ),
      0,
      5
    );

    rel.trust = clamp(
      rel.trust + dt * (
        (rel.trade > 0 ? 0.01 : 0) -
        overlap * 0.004 -
        rel.raids * 0.002 +
        (camp.tribeId === other.tribeId ? 0.004 : 0)
      ),
      -2,
      3
    );

    rel.trade *= Math.exp(-dt * RELATION_DECAY);
    rel.allied = rel.trust > 1.3 && rel.trade > 3 && rel.tension < 0.5;
    rel.war = rel.tension > 1.6 && rel.raids > 0;

    if(rel.allied){
      const back = getRelationState(other, camp);
      back.allied = true;
      camp.symbols['safe-return'] = clamp((camp.symbols['safe-return'] || 0) + 0.002 * dt, 0, 2);
    }

    attemptRaid(camp, other, rel, dt);
  }
}

function recentRaidCount(windowSecs=180){
  return state.recentRaids.filter(r => state.time - r.t < windowSecs).length;
}

function progressionMetrics(){
  const camps = state.camps.filter(c => !c.abandoned);

  let exchangeCamps = 0;
  let symbolicCamps = 0;
  let frontierPairs = 0;
  let warPairs = 0;
  let alliances = 0;
  let domesticity = 0;

  for(const camp of camps){
    domesticity += camp.domesticity || 0;
    if((camp.exchange?.totalVolume || 0) > 6) exchangeCamps++;
    if((camp.ritualMarkers?.length || 0) >= 2 || (camp.symbols?.hearth || 0) > 0.9) symbolicCamps++;

    if(camp.diplomacy?.relations){
      for(const rel of Object.values(camp.diplomacy.relations)){
        if(rel.tension > 0.8) frontierPairs++;
        if(rel.war) warPairs++;
        if(rel.allied) alliances++;
      }
    }
  }

  return {
    camps: camps.length,
    settlements: camps.filter(c => c.level >= 2).length,
    exchangeCamps,
    symbolicCamps,
    frontierPairs: frontierPairs * 0.5,
    warPairs: warPairs * 0.5,
    alliances: alliances * 0.5,
    avgDomesticity: camps.length ? domesticity / camps.length : 0,
    recentRaids: recentRaidCount()
  };
}

function deriveCreatureStats(lineage){
  const c = CORE_TYPES[lineage.modules.core];
  const m = MOVE_TYPES[lineage.modules.move];
  const g = GRASP_TYPES[lineage.modules.grasp];
  const u = UTILITY_TYPES[lineage.modules.utility];
  const s = SHELL_TYPES[lineage.modules.shell];
  const scale = lineage.scale;
  const stats = {
    radius: 8 * c.size * scale,
    speed: 40 * c.speed * m.speed * s.speed * (0.88 + (1 - (state.origin.density + 1) * 0.25)),
    turn: 2.2 * m.turn / (0.8 + state.motion.turnLag * 1.3),
    carry: 14 * c.carry * u.carry * scale,
    defense: 0.7 * c.defense * u.defense * s.defense,
    attack: 0.72 * g.attack * u.attack * (1 + (state.origin.angularity + 1) * 0.2),
    build: 0.72 * g.build * u.build * (1 + (state.origin.adhesion + 1) * 0.15),
    grasp: 0.85 * g.grasp * u.carry,
    stability: c.stability * s.stability,
    rest: c.rest * u.rest * s.rest
  };
  let role = 'forager';
  const carrierScore = stats.carry * 0.6 + stats.stability * 0.3;
  const guardScore = stats.attack * 0.6 + stats.defense * 0.4;
  const builderScore = stats.build * 0.65 + stats.carry * 0.18 + stats.rest * 0.12;
  const scoutScore = (stats.speed / 40) * 0.68 + stats.turn * 0.22;
  if(carrierScore > guardScore && carrierScore > builderScore && carrierScore > scoutScore) role = 'carrier';
  else if(guardScore > builderScore && guardScore > scoutScore) role = 'guard';
  else if(builderScore > scoutScore) role = 'builder';
  else if(scoutScore > 1.8) role = 'scout';
  lineage.role = role;
  return stats;
}

function findPromisingSites(count){
  const points = [];
  for(let gy = 4; gy < GRID_H - 4; gy += 2){
    for(let gx = 4; gx < GRID_W - 4; gx += 2){
      const idx = gy * GRID_W + gx;
      const score =
        state.static.safe[idx] * 0.5 +
        state.static.resource[idx] * 0.28 +
        state.static.passability[idx] * 0.14 +
        state.static.cover[idx] * 0.08 +
        state.static.stability[idx] * 0.1 -
        state.static.danger[idx] * 0.18;
      points.push({ x:(gx + 0.5) * CELL_W, y:(gy + 0.5) * CELL_H, score });
    }
  }
  const buckets = new Map();
  for(const point of points){
    const zone = regionLabelAt(point.x, point.y, state.macro);
    if(!buckets.has(zone)) buckets.set(zone, []);
    buckets.get(zone).push({ ...point, zone });
  }

  for(const bucket of buckets.values()){
    bucket.sort((a, b) => b.score - a.score);
  }

  const out = [];
  const regionOrder = ['fertile cradle','stable hollow','defensive corridor','volatile surge','harsh reach'];

  for(const zone of regionOrder){
    const bucket = buckets.get(zone) || [];
    for(const p of bucket){
      if(out.every(q => dist(p.x,p.y,q.x,q.y) > 320)){
        out.push(p);
        break;
      }
    }
    if(out.length >= count) break;
  }

  const remaining = points
    .map(point => ({ ...point, zone: regionLabelAt(point.x, point.y, state.macro) }))
    .sort((a, b) => b.score - a.score);

  for(const p of remaining){
    if(out.length >= count) break;
    if(out.every(q => dist(p.x,p.y,q.x,q.y) > 320)) out.push(p);
  }
  return out;
}
function generateDepositPattern(seed, radius, richness){
  const rng = mulberry32(seed);
  const lumps = [];
  const count = randInt(rng, 4, 7);
  for(let i = 0; i < count; i++){
    const ang = randRange(rng, -Math.PI, Math.PI);
    const rad = randRange(rng, 0, radius * 0.45);
    lumps.push({
      ox: Math.cos(ang) * rad,
      oy: Math.sin(ang) * rad * 0.8,
      w: randRange(rng, 8, 16) * (0.85 + richness * 0.28),
      h: randRange(rng, 5, 10) * (0.8 + richness * 0.22),
      z: randRange(rng, 7, 15) * (0.8 + richness * 0.32)
    });
  }
  lumps.sort((a, b) => a.oy - b.oy);
  return lumps;
}
function makeDeposit(x, y, materialId, extra={}){
  const mat = state.materials[materialId];
  const richness = clamp(extra.richness ?? (0.42 + mat.stats.load * 0.28 + mat.stats.energy * 0.14), 0.18, 1.35);
  const capacity = Math.max(4, Math.round(extra.capacity ?? (6 + richness * 10 + mat.stats.load * 3 + mat.stats.mass * 2)));
  const radius = extra.radius ?? clamp(20 + richness * 16 + mat.stats.load * 12, 18, 42);
  return {
    id: state.nextIds.deposit++,
    x,
    y,
    materialId,
    quantity: clamp(extra.quantity ?? capacity * randRange(state.rng, 0.58, 1), 1, capacity),
    capacity,
    richness,
    radius,
    regen: extra.regen ?? (DEPOSIT_REGEN * (0.82 + richness * 0.5 + mat.stats.energy * 0.3)),
    zone: extra.zone || regionLabelAt(x, y, state.macro),
    cooldown: extra.cooldown || 0,
    phase: extra.phase ?? randRange(state.rng, 0, Math.PI * 2),
    lumps: extra.lumps || generateDepositPattern(hashString(`${state.seedStr}:${x.toFixed(1)}:${y.toFixed(1)}:${materialId}`), radius, richness)
  };
}
function generateDeposits(count=DEPOSIT_COUNT){
  const candidates = [];
  const buckets = new Map();
  const regionOrder = ['fertile cradle','stable hollow','defensive corridor','volatile surge','harsh reach'];

  const addCandidate = (candidate) => {
    if(!buckets.has(candidate.zone)) buckets.set(candidate.zone, []);
    buckets.get(candidate.zone).push(candidate);
    candidates.push(candidate);
  };

  for(const site of state.pendingSites || []){
    const env = sampleBaseEnv(site.x, site.y);
    addCandidate({
      x: clamp(site.x + randRange(state.rng, -70, 70), 32, WORLD_W - 32),
      y: clamp(site.y + randRange(state.rng, -70, 70), 32, WORLD_H - 32),
      materialId: env.materialMix > 0.5 ? env.materialId2 : env.materialId,
      richness: clamp(env.resource * 0.9 + env.safe * 0.12, 0.28, 1.28),
      capacity: 8 + env.resource * 10 + env.cover * 2,
      radius: 22 + env.resource * 18,
      score: env.resource * 1.2 + env.safe * 0.12 - env.danger * 0.08,
      zone: env.zone,
      strategic: true
    });
  }

  for(let gy = 2; gy < GRID_H - 2; gy++){
    for(let gx = 2; gx < GRID_W - 2; gx++){
      const idx = gy * GRID_W + gx;
      const resource = state.static.resource[idx];
      if(resource < 0.22) continue;
      const materialA = state.static.materialA[idx];
      const materialB = state.static.materialB[idx];
      const mix = state.static.materialMix[idx];
      const matA = state.materials[materialA];
      const matB = state.materials[materialB];
      const materialId = mix > 0.52 && (matB.stats.load + matB.stats.energy + matB.stats.stick) > (matA.stats.load + matA.stats.energy + matA.stats.stick)
        ? materialB
        : materialA;
      const mat = state.materials[materialId];
      const x = (gx + 0.5) * CELL_W;
      const y = (gy + 0.5) * CELL_H;
      const zone = regionLabelAt(x, y, state.macro);
      addCandidate({
        x,
        y,
        materialId,
        richness: clamp(resource * 0.78 + mix * 0.14 + mat.stats.load * 0.18 + mat.stats.energy * 0.1, 0.22, 1.28),
        capacity: 5 + resource * 12 + mat.stats.load * 4 + mat.stats.energy * 2,
        radius: 18 + resource * 20 + mat.stats.load * 9,
        score:
          resource * 0.9 +
          state.static.cover[idx] * 0.16 +
          state.static.safe[idx] * 0.12 +
          mat.stats.load * 0.1 +
          mat.stats.energy * 0.08 -
          state.static.danger[idx] * 0.14,
        zone,
        strategic: false
      });
    }
  }

  for(const bucket of buckets.values()){
    bucket.sort((a, b) => b.score - a.score);
  }

  const out = [];
  const minSpacing = 150;
  const maybePush = (candidate) => {
    if(out.length >= count) return false;
    if(out.every(existing => dist(existing.x, existing.y, candidate.x, candidate.y) > minSpacing)){
      out.push(makeDeposit(candidate.x, candidate.y, candidate.materialId, candidate));
      return true;
    }
    return false;
  };

  for(const zone of regionOrder){
    const bucket = buckets.get(zone) || [];
    let placed = 0;
    for(const candidate of bucket){
      if(maybePush(candidate)) placed++;
      if(placed >= 10 || out.length >= count) break;
    }
  }

  const remaining = candidates.slice().sort((a, b) => (b.strategic - a.strategic) || (b.score - a.score));
  for(const candidate of remaining){
    if(out.length >= count) break;
    maybePush(candidate);
  }

  return out;
}
function campColor(camp){
  const mat = state.materials[camp.dominantMaterial ?? 0];
  return hsl(mat.hue, mat.sat, mat.light + 4, 0.95);
}
function makeCamp(x, y, founderLineageId=null, proto=false){
  const env = sampleEnv(x,y);
  const founderLineage = founderLineageId != null ? getLineage(founderLineageId) : null;
  const tribeId = founderLineage?.tribeId ?? chooseTribeForSpawn(env.materialId, env.zone);
  const tribe = getTribe(tribeId);

  const camp = {
    id: state.nextIds.camp++,
    name: `${nameFromSyllables(mulberry32(hashString(state.seedStr + x + ':' + y)))} ${env.zone.split(' ')[0]}`,
    x, y,
    age: 0,
    founderLineageId,
    foundingEra: state.eraIndex,
    tribeId,
    members: [],
    population: 0,
    level: proto ? 0 : 1,
    score: 0,
    dominantMaterial: env.materialId,
    routeAngle: randRange(mulberry32(hashString(String(x+y))), 0, Math.PI * 2),
    routeSpread: 0.5 + state.motion.routeBias * 0.5,
    homeRadius: proto ? 56 : 74,
    storeCounts: new Array(state.materials.length).fill(0),
    storedCount: 0,
    placedCount: 0,
    householdCount: proto ? 0 : 1,
    offspringCount: 0,
    roleDiversity: 0,
    lineageMix: 0,
    domesticity: 0,
    pathDensity: 0,
    territoryRadius: proto ? 88 : 120,
    rivalCampId: null,
    householdNodes: [],
    households: [],
    collectiveMemory: [],
    lexicon: {},
    signalUse: {},
    ritualMarkers: [],
    symbols: {
      hearth: proto ? 0.18 : 0.45,
      ancestor: proto ? 0.08 : 0.22,
      'safe-return': 0.12
    },
    myths: tribe ? tribe.myths.slice(0, 2) : [],
    society: { cohesion:0.4, tradition:0.15, expansion:0.2, memoryLoad:0 },
    exchange: { totalVolume:0, neighborVolume:{}, lastTransfer:0, lastExternalTrade:0 },
    diplomacy: { relations:{} },
    war: { lastRaid:-999, victories:0, losses:0 },
    localDanger: env.danger,
    localResource: env.resource,
    localSafe: env.safe,
    depositAccess: 0,
    activeProject: null,
    projectCooldown: 0,
    terrainSignature: { road:0, berm:0, shrine:0, stockpile:0, pit:0, scar:0, ramp:0 },
    lastUpwelling: 0,
    lastBreakthrough: 0,
    lastRitualBoom: 0,
    lastSchism: 0,
    culture: {
      prefMaterials: new Array(state.materials.length).fill(0),
      defense: clamp(env.danger * 0.8 + 0.2, 0, 1),
      build: clamp(env.safe * 0.5 + env.resource * 0.4 + 0.1, 0, 1),
      migrate: clamp(env.volatility * 0.7 + (0.4 - env.resource) * 0.5 + 0.2, 0, 1),
      aggression: clamp(env.danger * 0.55 + state.materials[env.materialId].stats.sharp * 0.35, 0, 1),
      colorHue: tribe ? tribe.palette.primaryHue : state.materials[env.materialId].hue
    },
    resourcePressure: 0,
    decline: 0,
    abandoned: false,
    history: [],
    lastLevelChange: 0,
    lastBuild: 0,
    lastCultureShift: 0,
    lastSplit: 0
  };

  camp.culture.prefMaterials[env.materialId] = 1;
  return camp;
}
function makeCreature(x, y, lineageId, campId=null){
  const lineage = getLineage(lineageId);
  const tribe = lineage ? getTribe(lineage.tribeId) : null;
  const stats = deriveCreatureStats(lineage);

  return {
    id: state.nextIds.creature++,
    x, y,
    vx: 0, vy: 0,
    angle: randRange(state.rng, -Math.PI, Math.PI),
    phase: randRange(state.rng, 0, Math.PI * 2),
    lineageId,
    tribeId: lineage?.tribeId ?? 0,
    campId,
    targetX: x,
    targetY: y,
    targetId: null,
    targetType: null,
    state: 'wander',
    reason: campId ? 'circling home range' : 'testing the frontier',
    energy: randRange(state.rng, 50, 95),
    hp: 100,
    age: randRange(state.rng, 0, 180),
    lifespan: randRange(state.rng, 650, 1020),
    reproCooldown: randRange(state.rng, 18, 80),
    thinkTimer: randRange(state.rng, 0, 0.5),
    carriedId: null,
    carriedOffset: 0,
    anchorX: x,
    anchorY: y,
    anchorAffinity: campId ? 30 : randRange(state.rng, 0, 16),
    homeDrift: 0,
    foundingDrive: 0,
    memory: randRange(state.rng, 0.7, 1.25) * (tribe ? lerp(0.9, 1.25, tribe.doctrine.memory) : 1),
    favoriteMaterialId: null,
    parentId: null,
    householdId: null,
    birthTime: state.time,
    stats,
    role: lineage.role || 'forager',
    power: 0,
    alive: true,
    hitFlash: 0,
    attackFlash: 0,
    lastSignalTime: 0,
    campBirthId: campId,
    memories: [],
    intent: null,
    intentScore: 0,
    intentTtl: 0,
    mind: {
      episodic: [],
      semantic: {
        zoneSafety: {},
        materialValue: {},
        campTrust: {},
        tribeAffinity: {}
      },
      social: {
        kinIds: {},
        allies: {},
        rivals: {}
      },
      symbolic: {
        tokens: {},
        sacredSites: [],
        tabooMaterials: tribe ? { [tribe.tabooMaterialId]: 1 } : {},
        mythsHeard: tribe ? Object.fromEntries((tribe.myths || []).map(m => [m, 0.5])) : {}
      },
      goals: [],
      currentIntent: null
    }
  };
}
function makeFragment(x, y, materialId, extra={}){
  const mat = state.materials[materialId];
  const size = randRange(state.rng, 5, 12) * (0.7 + mat.stats.load * 0.5 + mat.stats.flex * 0.15);
  return {
    id: state.nextIds.fragment++,
    x, y,
    vx: 0, vy: 0,
    materialId,
    size,
    weight: clamp(size * 0.25 + mat.stats.mass * 8, 2, 18),
    usefulness: clamp(mat.stats.sharp * 0.25 + mat.stats.load * 0.25 + mat.stats.stick * 0.2 + mat.stats.flex * 0.15 + mat.stats.energy * 0.15, 0.08, 1),
    energyValue: mat.stats.energy,
    state: 'loose',
    holderId: null,
    siteId: null,
    ownerHouseholdId: null,
    placedAt: null,
    kind: 'fragment',
    rot: randRange(state.rng, -Math.PI, Math.PI),
    age: 0,
    decay: randRange(state.rng, 320, 920),
    shade: randRange(state.rng, -8, 8),
    ...extra
  };
}
function depositAvailability(deposit){
  return clamp((deposit?.quantity || 0) / Math.max(1, deposit?.capacity || 1), 0, 1.25);
}
function depositYieldSpec(deposit){
  const mat = state.materials[deposit.materialId];
  const richness = deposit.richness || 0.4;
  const blockBias = 0.82 + richness * 0.24 + mat.stats.load * 0.22;
  const size = clamp(randRange(state.rng, 6, 10) * blockBias, 5, 14);
  return {
    size,
    weight: clamp(size * 0.24 + mat.stats.mass * 6.8 + richness * 2.2, 2, 18),
    usefulness: clamp(
      mat.stats.sharp * 0.22 +
      mat.stats.load * 0.32 +
      mat.stats.stick * 0.2 +
      mat.stats.flex * 0.1 +
      mat.stats.energy * 0.1 +
      richness * 0.16,
      0.08,
      1
    ),
    energyValue: clamp(mat.stats.energy * (0.8 + richness * 0.24), 0, 1.2)
  };
}
function createChunkFromDeposit(deposit, extra={}, harvest=true){
  if(!deposit) return null;
  if(harvest && deposit.quantity < 0.95) return null;
  const spec = depositYieldSpec(deposit);
  if(harvest){
    deposit.quantity = Math.max(0, deposit.quantity - 1);
    deposit.cooldown = 0.9;
  }
  return makeFragment(extra.x ?? deposit.x, extra.y ?? deposit.y, deposit.materialId, {
    kind: 'chunk',
    size: spec.size,
    weight: spec.weight,
    usefulness: spec.usefulness,
    energyValue: spec.energyValue,
    sourceDepositId: deposit.id,
    sourceZone: deposit.zone,
    decay: randRange(state.rng, 520, 1280),
    shade: randRange(state.rng, -4, 10),
    ...extra
  });
}
function extractChunkFromDeposit(deposit, worker){
  if(!deposit || !worker) return null;
  const spec = depositYieldSpec(deposit);
  if(spec.weight > worker.stats.carry * 1.35) return null;
  return createChunkFromDeposit(deposit, {
    x: deposit.x,
    y: deposit.y,
    state: 'carried',
    holderId: worker.id
  }, true);
}
function assignCreatureToCamp(creature, camp){
  creature.campId = camp.id;
  creature.anchorX = camp.x;
  creature.anchorY = camp.y;
  creature.anchorAffinity = Math.max(creature.anchorAffinity, 40);
  creature.foundingDrive = 0;
  assignCreatureToHousehold(creature, camp);

  if(camp.dominantMaterial != null && creature.favoriteMaterialId == null){
    creature.favoriteMaterialId = camp.dominantMaterial;
  }

  rememberCreature(creature, 'home', {
    x: camp.x,
    y: camp.y,
    campId: camp.id,
    householdId: creature.householdId,
    zone: regionLabelAt(camp.x, camp.y, state.macro),
    note: camp.name
  }, 0.45);

  shareMemorySamples(camp.collectiveMemory || [], creature, 1, 0.18, 2);

  rememberCamp(camp, 'member', {
    x: creature.x,
    y: creature.y,
    householdId: creature.householdId,
    lineageId: creature.lineageId
  }, 0.22);
}
function primeNomadFoundingFronts(){
  const uncamped = state.creatures.filter(cr => cr.alive && !cr.campId);
  const groups = new Map();

  for(const cr of uncamped){
    const key = cr.householdId || `solo:${cr.id}`;
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(cr);
  }

  for(const group of groups.values()){
    if(group.length < 2) continue;

    const cx = group.reduce((sum, cr) => sum + cr.x, 0) / group.length;
    const cy = group.reduce((sum, cr) => sum + cr.y, 0) / group.length;
    const site = pickCampExpansionSite(cx, cy, 'found');
    const spreadRelief = Math.max(0, site.zoneBias || 0);
    if(site.score < 0.12 - spreadRelief * 0.06 || site.spacing > 0.88 + spreadRelief * 0.08) continue;

    for(const cr of group){
      cr.anchorX = site.x + randRange(state.rng, -18, 18);
      cr.anchorY = site.y + randRange(state.rng, -18, 18);
      cr.anchorAffinity = Math.max(cr.anchorAffinity, 78);
      cr.foundingDrive = Math.max(cr.foundingDrive || 0, 2.8);
      cr.state = 'settle';
      cr.targetX = cr.anchorX;
      cr.targetY = cr.anchorY;
      cr.reason = 'testing a local hearth';
      rememberCreature(cr, 'home', {
        x: cr.anchorX,
        y: cr.anchorY,
        note: 'proto cohort hearth',
        zone: site.env.zone
      }, 0.72);
    }
  }
}
function updateFoundingDrive(cr, env, dt){
  if(state.eraIndex < ERA_INDEX.place || cr.campId || !cr.alive){
    cr.foundingDrive = Math.max(0, (cr.foundingDrive || 0) - dt * 0.8);
    return;
  }

  const baseEnv = sampleBaseEnv(cr.anchorX, cr.anchorY);
  const nearAnchor = dist(cr.x, cr.y, cr.anchorX, cr.anchorY) < 58;
  const nearbyNomads = getNearbyNomads(cr.anchorX, cr.anchorY, 150).filter(other => other.id !== cr.id).length;
  const hearthBias = cr.mind.symbolic.tokens.hearth || 0;
  const returnBias = cr.mind.symbolic.tokens['safe-return'] || 0;
  const support =
    baseEnv.safe * 0.56 +
    baseEnv.resource * 0.46 -
    baseEnv.danger * 0.34 +
    Math.min(0.24, nearbyNomads * 0.05) +
    Math.min(0.20, hearthBias * 0.16 + returnBias * 0.14) +
    (cr.carriedId ? 0.16 : 0);

  if(nearAnchor && support > 0.42){
    cr.foundingDrive = clamp((cr.foundingDrive || 0) + dt * (0.28 + support + cr.anchorAffinity * 0.012), 0, 8);
  }else{
    cr.foundingDrive = Math.max(0, (cr.foundingDrive || 0) - dt * (nearAnchor ? 0.22 : 0.5));
  }
}
function spawnCombatFx(kind, x, y, hue, size=1){
  if(!state) return;
  state.combatFx.push({
    kind,
    x, y,
    hue,
    size,
    rot: randRange(state.rng, -Math.PI, Math.PI),
    age: 0,
    ttl: kind === 'death' ? 1.1 : kind === 'bond' ? 0.72 : 0.35
  });
  if(state.combatFx.length > MAX_COMBAT_FX) state.combatFx.shift();
}
function spawnDeathRemnant(cr){
  if(!state) return;
  const lineage = getLineage(cr.lineageId);
  const camp = getCamp(cr.campId);
  const hue = mod((camp ? camp.culture.colorHue : state.palette.baseHue) + (lineage?.hueShift || 0), 360);
  state.remnants.push({
    x: cr.x,
    y: cr.y,
    vx: cr.vx * 0.16,
    vy: cr.vy * 0.16,
    angle: cr.angle,
    phase: cr.phase,
    hue,
    size: cr.stats.radius,
    age: 0,
    ttl: randRange(state.rng, 8, 13)
  });
  if(state.remnants.length > MAX_REMNANTS) state.remnants.shift();
}
function updateTransientFx(dt){
  state.combatFx = (state.combatFx || []).filter(fx => {
    fx.age += dt;
    return fx.age < fx.ttl;
  });

  state.remnants = (state.remnants || []).filter(remnant => {
    remnant.age += dt;
    remnant.x = clamp(remnant.x + remnant.vx * dt, 8, WORLD_W - 8);
    remnant.y = clamp(remnant.y + remnant.vy * dt, 8, WORLD_H - 8);
    remnant.vx *= Math.exp(-dt * 2.6);
    remnant.vy *= Math.exp(-dt * 2.6);
    return remnant.age < remnant.ttl;
  });
}
