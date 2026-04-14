// Source module: forecast controls, inspector, picking, animation loop, and input binding.

function clearForecast(){
  ui.forecast = null;
  if(state) state.forecast = null;
  syncForecastControls();
  markUiDirty('world');
}

function syncForecastControls(){
  if(!commitForecastBtn) return;
  const horizon = ui.forecast?.seconds || 60;
  commitForecastBtn.textContent = `Fast-Forward +${horizon}s`;
}

function summarizeWorldForForecast(){
  if(!state) return null;

  const liveCamps = state.camps.filter(c => !c.abandoned);
  const settlements = liveCamps.filter(c => c.level >= 2);

  const avgDomesticity = liveCamps.length
    ? liveCamps.reduce((s, c) => s + (c.domesticity || 0), 0) / liveCamps.length
    : 0;

  const avgPressure = liveCamps.length
    ? liveCamps.reduce((s, c) => s + (c.resourcePressure || 0), 0) / liveCamps.length
    : 0;

  const avgSafe = liveCamps.length
    ? liveCamps.reduce((s, c) => s + (c.localSafe || 0), 0) / liveCamps.length
    : 0;

  const avgDanger = liveCamps.length
    ? liveCamps.reduce((s, c) => s + (c.localDanger || 0), 0) / liveCamps.length
    : 0;

  const avgMemory = state.creatures.length
    ? state.creatures.reduce((s, c) => s + (c.memory || 0), 0) / state.creatures.length
    : 0;

  const tribeSpread = new Set(state.creatures.map(c => c.tribeId)).size;

  return {
    time: state.time,
    creatures: state.creatures.length,
    camps: liveCamps.length,
    settlements: settlements.length,
    proto: state.protoCells.length,
    avgDomesticity,
    avgPressure,
    avgSafe,
    avgDanger,
    avgMemory,
    tribeSpread
  };
}

function forecastRollout(base, seconds, rng){
  const s = JSON.parse(JSON.stringify(base));
  const steps = Math.max(1, Math.ceil(seconds / FORECAST_STEP));

  for(let i = 0; i < steps; i++){
    const safetyPush = s.avgSafe - s.avgDanger * 0.6;
    const campBirthP = clamp(
      0.02 +
      s.proto * 0.002 +
      safetyPush * 0.05 +
      s.avgMemory * 0.02 -
      Math.max(0, s.camps - 8) * 0.01,
      0,
      0.40
    );

    const settlementRiseP = clamp(
      0.015 +
      s.camps * 0.016 +
      s.avgDomesticity * 0.12 +
      Math.max(0, s.avgPressure) * 0.01,
      0,
      0.45
    );

    const collapseP = clamp(
      0.01 +
      Math.max(0, -s.avgPressure) * 0.015 +
      s.avgDanger * 0.04,
      0,
      0.30
    );

    if(rng() < campBirthP) s.camps += 1;
    if(s.camps > 0 && rng() < settlementRiseP) s.settlements += 1;
    if(s.camps > 0 && rng() < collapseP) s.camps = Math.max(0, s.camps - 1);
    if(s.settlements > s.camps) s.settlements = s.camps;

    s.creatures = Math.max(0, Math.round(
      s.creatures +
      (s.proto * 0.08) +
      (s.camps * 0.45) +
      (s.settlements * 0.70) -
      (s.avgDanger * 0.9) -
      Math.max(0, -s.avgPressure) * 0.5 +
      randRange(rng, -2, 3)
    ));

    s.proto = Math.max(0, Math.round(
      s.proto +
      (s.avgSafe * 0.6) -
      (s.avgDanger * 0.4) +
      randRange(rng, -1, 2)
    ));

    s.avgDomesticity = clamp(s.avgDomesticity + randRange(rng, -0.03, 0.04) + s.settlements * 0.003, 0, 1.3);
    s.avgPressure = clamp(s.avgPressure + randRange(rng, -0.7, 0.7), -12, 12);
    s.avgSafe = clamp(s.avgSafe + randRange(rng, -0.03, 0.03), 0, 1);
    s.avgDanger = clamp(s.avgDanger + randRange(rng, -0.03, 0.03), 0, 1);
  }

  return s;
}

function medianOf(values){
  const arr = values.slice().sort((a, b) => a - b);
  if(!arr.length) return 0;
  return arr[Math.floor(arr.length * 0.5)];
}

function runForecast(seconds, samples=FORECAST_SAMPLES){
  if(!state || ui.replay) return null;

  const horizon = Math.max(1, Math.floor(seconds));
  const base = summarizeWorldForForecast();
  if(!base) return null;

  const runs = [];
  for(let i = 0; i < samples; i++){
    const rng = mulberry32(state.seedInt + i * 9973 + Math.floor(state.time * 100));
    runs.push(forecastRollout(base, horizon, rng));
  }

  const result = {
    seconds: horizon,
    samples,
    creatures: medianOf(runs.map(r => r.creatures)),
    camps: medianOf(runs.map(r => r.camps)),
    settlements: medianOf(runs.map(r => r.settlements)),
    proto: medianOf(runs.map(r => r.proto)),
    expectedNewCamps: Math.max(0, medianOf(runs.map(r => r.camps)) - base.camps),
    expectedSettlementGain: Math.max(0, medianOf(runs.map(r => r.settlements)) - base.settlements)
  };

  ui.forecast = result;
  state.forecast = result;

  recordEvent(
    'nudge',
    `estimate +${horizon}s -> ${result.camps} camps / ${result.settlements} settlements likely`,
    camera.x,
    camera.y,
    null
  );

  syncForecastControls();
  refreshInspector(true);
  return result;
}

function fastForwardExact(seconds){
  if(!state) return;
  const horizon = Math.max(1, Math.floor(seconds));
  const steps = Math.max(1, Math.ceil(horizon / FIXED_STEP));

  for(let i = 0; i < steps; i++){
    updateWorld(FIXED_STEP);
  }
}

function commitForecast(seconds){
  if(!state) return;

  if(ui.replay) exitReplay();

  const horizon = Math.max(1, Math.floor(seconds || ui.forecast?.seconds || 60));
  if(!ui.forecast || ui.forecast.seconds !== horizon){
    runForecast(horizon);
  }

  clearForecast();
  fastForwardExact(horizon);
  refreshInspector(true);
}

function renderHud(){
  hudWorld.textContent = `${state.worldName} Â· ${state.seedStr}`;
  const sel = ui.selected ? `${ui.selected.type} selected` : 'nothing selected';
  const forecastText = ui.forecast
    ? ` Â· estimate +${ui.forecast.seconds}s: ${ui.forecast.camps} camps / ${ui.forecast.settlements} settlements`
    : '';
  hudView.textContent = `${getZoomMode()} Â· ${state.creatures.length} creatures Â· ${state.camps.length} sites Â· ${(state.deposits || []).length} seams Â· ${state.fragments.length} blocks Â· ${sel}${forecastText}`;
}
const legacyRenderHud = renderHud;
renderHud = function(){
  const worldText = `${state.worldName} · ${state.seedStr}`;
  const sel = ui.selected ? `${ui.selected.type} selected` : 'nothing selected';
  const forecastText = ui.forecast
    ? ` · estimate +${ui.forecast.seconds}s: ${ui.forecast.camps} camps / ${ui.forecast.settlements} settlements`
    : '';
  const viewText = `${getZoomMode()} · ${state.creatures.length} creatures · ${state.camps.length} sites · ${(state.deposits || []).length} seams · ${state.fragments.length} blocks · ${sel}${forecastText}`;
  if(!ui.dirty.hud && worldText === ui.hudCache.world && viewText === ui.hudCache.view) return;
  legacyRenderHud();
  ui.hudCache.world = worldText;
  ui.hudCache.view = viewText;
  ui.dirty.hud = false;
};

renderHud = function(){
  const worldText = `${state.worldName} - ${state.seedStr}`;
  const sel = ui.selected ? `${ui.selected.type} selected` : 'nothing selected';
  const forecastText = ui.forecast
    ? ` - estimate +${ui.forecast.seconds}s: ${ui.forecast.camps} camps / ${ui.forecast.settlements} settlements`
    : '';
  const viewText = `${getZoomMode()} - ${state.creatures.length} creatures - ${state.camps.length} sites - ${(state.deposits || []).length} seams - ${state.fragments.length} blocks - ${sel}${forecastText}`;
  if(!ui.dirty.hud && worldText === ui.hudCache.world && viewText === ui.hudCache.view) return;
  setNodeText(hudWorld, worldText);
  setNodeText(hudView, viewText);
  ui.hudCache.world = worldText;
  ui.hudCache.view = viewText;
  ui.dirty.hud = false;
};

function render(){
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  ctx.fillStyle = state.palette.background;
  ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  renderWorldBase();
  renderField();
  renderTerrainEdits();
  renderGenesisVeins();
  renderRegionalOverlay();
  renderNudges();
  renderProtoLife();
  renderTrails();
  renderCampInfluence();
  renderCampSites();
  renderSceneActors();
  renderRitualMarkers();
  renderCombatFx();
  renderMigrationFlows();
  renderEvents();
  renderSelection();
  renderHud();
}

function refreshInspector(force=false){
  const now = performance.now();
  if(!force && now - ui.lastInspector < 120) return;
  ui.lastInspector = now;
  const originList = describeOrigin(state.origin).map(t => `<span class="pill">${t}</span>`).join('');
  const materialsHtml = state.materials.slice(0, 8).map(m => `<span class="pill"><span class="legendSwatch" style="background:${hsl(m.hue,m.sat,m.light)}"></span>${m.name}</span>`).join('');
  const householdTotal = state.camps.reduce((sum, camp) => sum + (camp.householdCount || 0), 0);
  const activeProto = state.protoCells.filter(cell => cell.energy > 20).length;
  const looseBlocks = state.indexes?.fragmentCounts?.loose ?? state.fragments.filter(frag => frag.state === 'loose').length;
  const activeProjects = state.camps.filter(camp => camp.activeProject).length;
  const campSpread = Object.entries(countActiveCampsByZone())
    .filter(([, count]) => count > 0)
    .map(([zone, count]) => `${zone.split(' ')[0]} ${count}`)
    .join(' Â· ') || 'none yet';
  const eraPills = ERA_STAGES.map((era, index) => `<span class="pill" style="opacity:${index <= state.eraIndex ? 1 : 0.45}">${index === state.eraIndex ? 'now ' : index < state.eraIndex ? 'done ' : ''}${era.name}</span>`).join('');
  worldPanel.innerHTML = `
    <div class="seedTitle">${state.worldName}</div>
    <div class="tiny muted mono">${state.seedStr}</div>
    <div class="row" style="margin-top:10px">
      <div><strong>${state.creatures.length}</strong><div class="tiny muted">creatures</div></div>
      <div><strong>${state.camps.length}</strong><div class="tiny muted">sites</div></div>
      <div><strong>${activeProto}</strong><div class="tiny muted">proto clusters</div></div>
      <div><strong>${householdTotal}</strong><div class="tiny muted">households</div></div>
    </div>
    <h3 style="margin-top:12px">World arc</h3>
    <div>${eraPills}</div>
    <div class="kv" style="margin-top:10px">
      <div class="k">current era</div><div>${currentEra().name}</div>
      <div class="k">era logic</div><div>${currentEra().summary}</div>
      <div class="k">motion signature</div><div>${state.motion.staccato > 0.35 ? 'staccato' : state.motion.wobble > 0.2 ? 'elastic glide' : state.motion.drag > 2.4 ? 'heavy delayed' : 'smooth drift'}</div>
      <div class="k">dominant corridor</div><div>${regionLabelAt(state.macro.corridor.ax, state.macro.corridor.ay, state.macro)}</div>
      <div class="k">camp spread</div><div>${campSpread}</div>
      <div class="k">resource seams</div><div>${(state.deposits || []).length} seam clusters Â· ${looseBlocks} loose blocks</div>
      <div class="k">active projects</div><div>${activeProjects} shaped zones Â· ${(state.terrainEdits || []).length} terrain edits</div>
      <div class="k">active zoom</div><div>${getZoomMode()}</div>
      <div class="k">world time</div><div>${fmtSecs(state.time)}</div>
    </div>
    <h3 style="margin-top:12px">World laws</h3>
    <div class="kv">
      <div class="k">embodiment pressure</div><div>${round(state.laws.embodimentPressure,2)}</div>
      <div class="k">organization bias</div><div>${round(state.laws.organizationBias,2)}</div>
      <div class="k">complexity bias</div><div>${round(state.laws.complexityBias,2)}</div>
      <div class="k">memory bias</div><div>${round(state.laws.memoryBias,2)}</div>
      <div class="k">signaling bias</div><div>${round(state.laws.signalingBias,2)}</div>
      <div class="k">emergence threshold</div><div>${round(state.laws.emergenceThreshold,2)}</div>
    </div>
    <h3 style="margin-top:12px">Origin biases</h3>
    <div>${originList}</div>
    <h3 style="margin-top:12px">Material families</h3>
    <div>${materialsHtml}</div>
    <div class="hint" style="margin-top:8px">Palette, motion, proto-life behavior, creature bodies, and settlement spacing all descend from the same seed. Bloom and shelter pulses are bounded nudges centered on the selected object or current camera focus.</div>
    ${ui.forecast ? `
      <h3 style="margin-top:12px">Estimate</h3>
      <div class="kv">
        <div class="k">horizon</div><div>+${ui.forecast.seconds}s</div>
        <div class="k">likely camps</div><div>${ui.forecast.camps}</div>
        <div class="k">likely settlements</div><div>${ui.forecast.settlements}</div>
        <div class="k">likely creatures</div><div>${ui.forecast.creatures}</div>
        <div class="k">new camps</div><div>${ui.forecast.expectedNewCamps}</div>
        <div class="k">settlement gain</div><div>${ui.forecast.expectedSettlementGain}</div>
      </div>
    ` : ''}
  `;

  if(!ui.selected){
    selectionPanel.innerHTML = `
      <h3>Selection</h3>
      <div class="hint">Click a creature, camp, block, or deposit. Zoom deeper to reveal settlement, household, creature, and micro explanation layers.</div>
      <div style="margin-top:10px" class="kv">
        <div class="k">cosmic zoom</div><div>origin tensions, era arc, and large regional structure</div>
        <div class="k">regional zoom</div><div>resource corridors, proto-life niches, migration fronts</div>
        <div class="k">settlement zoom</div><div>structures, stores, households, routes, defended edges, worked seams</div>
        <div class="k">creature zoom</div><div>body modules, carried objects, preferences, current goals</div>
        <div class="k">micro zoom</div><div>module stack, energy, memory, and behavior reason</div>
      </div>
    `;
  }else if(ui.selected.type === 'creature'){
    const cr = getCreature(ui.selected.id);
    if(cr){
      const lin = getLineage(cr.lineageId);
      const camp = getCamp(cr.campId);
      const frag = cr.carriedId ? getFragment(cr.carriedId) : null;
      const env = sampleEnv(cr.x, cr.y);
      const preferred = cr.favoriteMaterialId != null ? state.materials[cr.favoriteMaterialId] : null;
      selectionPanel.innerHTML = `
        <h3>Creature</h3>
        <div class="row"><div><strong>${lin?.name || 'lineage'}</strong> <span class="pill">${cr.role}${cr.age > cr.lifespan * 0.82 ? ' Elder' : ''}</span></div><div class="tiny muted">${camp ? camp.name : 'nomad'}</div></div>
        <div class="kv" style="margin-top:8px">
          <div class="k">state</div><div>${cr.state}</div>
          <div class="k">reason</div><div>${cr.reason}</div>
          <div class="k">energy</div><div>${round(cr.energy)} ${bar(cr.energy / 100)}</div>
          <div class="k">health</div><div>${round(cr.hp)} ${bar(cr.hp / 100)}</div>
          <div class="k">memory pull</div><div>${round(cr.memory,2)} ${bar(cr.memory / 1.4)}</div>
          <div class="k">anchor / home pull</div><div>${round(cr.anchorAffinity)} ${bar(cr.anchorAffinity / 100)}</div>
          <div class="k">preferred material</div><div>${preferred ? preferred.name : 'still forming'}</div>
          <div class="k">carried</div><div>${frag ? state.materials[frag.materialId].name : 'nothing'}</div>
          <div class="k">body modules</div><div>${lin ? moduleName(lin.modules) : ''}</div>
          <div class="k">memory traces</div><div>${(cr.memories || []).slice(0,3).map(memory => memory.type).join(', ') || 'still forming'}</div>
          <div class="k">local zone</div><div>${env.zone}</div>
          <div class="k">camp membership</div><div>${camp ? `${camp.name} - ${KIND_NAMES[camp.level]}` : 'none'}</div>
        </div>
        <div class="microDiagram">
          <div class="microCell"><div class="tiny muted">core</div><strong>${lin?.modules.core}</strong></div>
          <div class="microCell"><div class="tiny muted">move</div><strong>${lin?.modules.move}</strong></div>
          <div class="microCell"><div class="tiny muted">grasp</div><strong>${lin?.modules.grasp}</strong></div>
          <div class="microCell"><div class="tiny muted">utility</div><strong>${lin?.modules.utility}</strong></div>
          <div class="microCell"><div class="tiny muted">shell</div><strong>${lin?.modules.shell}</strong></div>
        </div>
      `;
    }
  }else if(ui.selected.type === 'camp'){
    const camp = getCamp(ui.selected.id);
    if(camp){
      const topMaterials = camp.storeCounts.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v).slice(0,3).filter(x=>x.v>0);
      selectionPanel.innerHTML = `
        <h3>Camp / Settlement</h3>
        <div class="row"><div><strong>${camp.name}</strong> <span class="pill">${KIND_NAMES[camp.level]}</span></div><div class="tiny muted">${camp.population} members</div></div>
        <div class="kv" style="margin-top:8px">
          <div class="k">dominant material</div><div>${state.materials[camp.dominantMaterial].name}</div>
          <div class="k">score</div><div>${round(camp.score)}</div>
          <div class="k">stores</div><div>${camp.storedCount} stored - ${camp.placedCount} placed</div>
          <div class="k">households</div><div>${camp.householdCount} with ${camp.offspringCount} young</div>
          <div class="k">lineage mix</div><div>${camp.lineageMix} lineages - ${round(camp.roleDiversity * 100)}% role spread</div>
          <div class="k">pressure</div><div>${round(camp.resourcePressure,1)}</div>
          <div class="k">extractable seams</div><div>${round(camp.depositAccess || 0,2)} ${bar(clamp((camp.depositAccess || 0) / 1.2, 0, 1))}</div>
          <div class="k">active project</div><div>${camp.activeProject ? `${projectLabel(camp.activeProject.kind)} ${round(clamp(camp.activeProject.progress / Math.max(1, camp.activeProject.target), 0, 1) * 100)}%` : 'none right now'}</div>
          <div class="k">shaped ground</div><div>${round(camp.terrainSignature?.road || 0,1)} road Â· ${round(camp.terrainSignature?.stockpile || 0,1)} stockpile Â· ${round(camp.terrainSignature?.shrine || 0,1)} shrine</div>
          <div class="k">territory</div><div>${round(camp.territoryRadius)} radius - ${camp.rivalCampId ? `rival ${getCamp(camp.rivalCampId)?.name || camp.rivalCampId}` : 'no fixed rival yet'}</div>
          <div class="k">local zone</div><div>${regionLabelAt(camp.x, camp.y, state.macro)}</div>
          <div class="k">settlement style</div><div>${campStyleDescriptor(camp)}</div>
          <div class="k">domesticity</div><div>${round(camp.domesticity,2)} ${bar(camp.domesticity)}</div>
          <div class="k">defense tendency</div><div>${round(camp.culture.defense,2)} ${bar(camp.culture.defense)}</div>
          <div class="k">build tendency</div><div>${round(camp.culture.build,2)} ${bar(camp.culture.build)}</div>
          <div class="k">migration tendency</div><div>${round(camp.culture.migrate,2)} ${bar(camp.culture.migrate)}</div>
        </div>
        <h3 style="margin-top:12px">Local preferences</h3>
        <div>${topMaterials.map(m=>`<span class="pill"><span class="legendSwatch" style="background:${hsl(state.materials[m.i].hue,state.materials[m.i].sat,state.materials[m.i].light)}"></span>${state.materials[m.i].name}</span>`).join('') || '<span class="hint">no stores yet</span>'}</div>
        <h3 style="margin-top:12px">Traditions</h3>
        <div>${campTraditions(camp).map(item => `<span class="pill">${item}</span>`).join('')}</div>
        <h3 style="margin-top:12px">Collective memory</h3>
        <div>${(camp.collectiveMemory || []).slice(0,3).map(memory => `<span class="pill">${memory.type}</span>`).join('') || '<span class="hint">memory is still shallow</span>'}</div>
        <div class="hint" style="margin-top:8px">Proto-culture here is imitation plus pressure: household clustering, object preference, defensive style, route habit, and migration tendency.</div>
      `;
    }
  }else if(ui.selected.type === 'fragment'){
    const frag = getFragment(ui.selected.id);
    if(frag){
      const mat = state.materials[frag.materialId];
      selectionPanel.innerHTML = `
        <h3>${frag.kind === 'chunk' ? 'Resource Block' : 'Fragment'}</h3>
        <div><strong>${mat.name}</strong> <span class="pill">${frag.kind}</span></div>
        <div class="kv" style="margin-top:8px">
          <div class="k">structure tendency</div><div>${mat.structure}</div>
          <div class="k">physical tendency</div><div>${mat.physical}</div>
          <div class="k">visual tendency</div><div>${mat.visual}</div>
          <div class="k">utility tendency</div><div>${mat.utility}</div>
          <div class="k">weight</div><div>${round(frag.weight,1)}</div>
          <div class="k">usefulness</div><div>${round(frag.usefulness,2)} ${bar(frag.usefulness)}</div>
          <div class="k">state</div><div>${frag.state}${frag.siteId ? ` - site ${getCamp(frag.siteId)?.name || frag.siteId}` : ''}</div>
          <div class="k">world consequence</div><div>${mat.utility} matter nudges anatomy, storage, and architecture in the same direction</div>
        </div>
      `;
    }
  }else if(ui.selected.type === 'deposit'){
    const deposit = getDeposit(ui.selected.id);
    if(deposit){
      const mat = state.materials[deposit.materialId];
      selectionPanel.innerHTML = `
        <h3>Deposit Seam</h3>
        <div><strong>${mat.name}</strong> <span class="pill">${deposit.zone}</span></div>
        <div class="kv" style="margin-top:8px">
          <div class="k">remaining mass</div><div>${round(deposit.quantity,1)} / ${round(deposit.capacity,1)} ${bar(clamp(depositAvailability(deposit), 0, 1))}</div>
          <div class="k">richness</div><div>${round(deposit.richness,2)} ${bar(clamp(deposit.richness / 1.2, 0, 1))}</div>
          <div class="k">regen</div><div>${round(deposit.regen,3)} units/s</div>
          <div class="k">radius</div><div>${round(deposit.radius)}</div>
          <div class="k">structure tendency</div><div>${mat.structure}</div>
          <div class="k">utility tendency</div><div>${mat.utility}</div>
          <div class="k">world consequence</div><div>creatures can work this seam into carried blocks, store them, and turn them into alien settlement pieces</div>
        </div>
      `;
    }
  }

  const historyItems = state.events.slice().reverse().slice(0, 12).map(ev => {
    const zone = regionLabelAt(ev.x, ev.y, state.macro);
    return `<div class="event"><div>${ev.text}</div><div class="t">${fmtSecs(ev.time)} - ${zone}</div></div>`;
  }).join('');
  historyPanel.innerHTML = `
    <h3>Recent history</h3>
    <div class="hint">Historical arc: ${ERA_STAGES.slice(0, state.eraIndex + 1).map(era => era.name).join(' -> ')}</div>
    <div class="historyList" style="margin-top:8px">${historyItems || '<div class="hint">History is still gathering.</div>'}</div>
  `;
}

const legacyRefreshInspector = refreshInspector;
refreshInspector = function(force=false){
  const now = performance.now();
  if(!force){
    if(!ui.dirty.inspector) return;
    if(now - ui.lastInspector < 120) return;
  }
  legacyRefreshInspector(true);
  ui.dirty.world = false;
  ui.dirty.selection = false;
  ui.dirty.history = false;
  ui.dirty.inspector = false;
};

function sanitizeUiText(text){
  return String(text)
    .replace(/\s*(?:Â·|·|ТЗ|З)\s*/g, ' - ')
    .replace(/\s+-\s+-\s+/g, ' - ');
}

const throttledRefreshInspector = refreshInspector;
refreshInspector = function(force=false){
  throttledRefreshInspector(force);
  if(worldPanel){
    const next = sanitizeUiText(worldPanel.innerHTML);
    if(worldPanel.innerHTML !== next) worldPanel.innerHTML = next;
  }
  if(selectionPanel){
    const next = sanitizeUiText(selectionPanel.innerHTML);
    if(selectionPanel.innerHTML !== next) selectionPanel.innerHTML = next;
  }
  if(historyPanel){
    const next = sanitizeUiText(historyPanel.innerHTML);
    if(historyPanel.innerHTML !== next) historyPanel.innerHTML = next;
  }
};

function pickEntity(wx, wy){
  let best = null, bestDist = Infinity;
  for(const cr of state.creatures){
    const d = dist(wx, wy, cr.x, cr.y);
    if(d < bestDist && d < Math.max(20 / camera.zoom, cr.stats.radius + 10)){
      best = { type:'creature', id:cr.id };
      bestDist = d;
    }
  }
  for(const camp of state.camps){
    const d = dist(wx, wy, camp.x, camp.y);
    if(d < bestDist && d < Math.max(28 / camera.zoom, camp.homeRadius * 0.4)){
      best = { type:'camp', id:camp.id };
      bestDist = d;
    }
  }
  for(const deposit of state.deposits || []){
    const d = dist(wx, wy, deposit.x, deposit.y);
    if(d < bestDist && d < Math.max(18 / camera.zoom, deposit.radius * 0.7)){
      best = { type:'deposit', id:deposit.id };
      bestDist = d;
    }
  }
  for(const frag of state.fragments){
    const d = dist(wx, wy, frag.x, frag.y);
    if(d < bestDist && d < Math.max(12 / camera.zoom, frag.size + 4)){
      best = { type:'fragment', id:frag.id };
      bestDist = d;
    }
  }
  return best;
}

function animate(ts){
  const dtReal = Math.min(0.05, (ts - lastFrame) / 1000);
  lastFrame = ts;
  camera.zoom = lerp(camera.zoom, camera.targetZoom, 0.18);

  if(!ui.paused && !ui.replay){
    const speedMul = ui.speeds[ui.speedIndex] * SIM_BASE * (ui.turbo ? 10 : 1);
    accumulator += dtReal * speedMul;

    const maxSubsteps = ui.turbo ? MAX_SUBSTEPS_TURBO : MAX_SUBSTEPS_NORMAL;
    let steps = 0;

    while(accumulator >= FIXED_STEP && steps < maxSubsteps){
      updateWorld(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps++;
    }

    if(steps === maxSubsteps){
      accumulator = 0;
    }
  }

  render();
  refreshInspector();
  requestAnimationFrame(animate);
}

function bindUI(){
  newSeedBtn.addEventListener('click', () => {
    const seed = seedInput.value.trim() || randomSeed();
    seedInput.value = seed;
    newWorld(seed);
  });
  pauseBtn.addEventListener('click', () => {
    ui.paused = !ui.paused;
    pauseBtn.textContent = ui.paused ? 'Play' : 'Pause';
  });
  if(slowerBtn){
    slowerBtn.addEventListener('click', () => {
      ui.speedIndex = Math.max(0, ui.speedIndex - 1);
      updateSpeedLabel();
    });
  }

  if(fasterBtn){
    fasterBtn.addEventListener('click', () => {
      ui.speedIndex = Math.min(ui.speeds.length - 1, ui.speedIndex + 1);
      updateSpeedLabel();
    });
  }

  if(speedBtn){
    speedBtn.addEventListener('click', () => {
      ui.speedIndex = (ui.speedIndex + 1) % ui.speeds.length;
      updateSpeedLabel();
    });
  }

  if(turboBtn){
    turboBtn.addEventListener('click', () => {
      ui.turbo = !ui.turbo;
      updateSpeedLabel();
    });
  }

  if(forecast60Btn){
    forecast60Btn.addEventListener('click', () => {
      runForecast(60);
    });
  }

  if(forecast180Btn){
    forecast180Btn.addEventListener('click', () => {
      runForecast(180);
    });
  }

  if(commitForecastBtn){
    commitForecastBtn.addEventListener('click', () => {
      commitForecast(ui.forecast?.seconds || 60);
    });
  }

  zoomInBtn.addEventListener('click', () => camera.targetZoom = clamp(camera.targetZoom * 1.22, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM));
  bloomBtn.addEventListener('click', () => applyNudge('bloom'));
  shelterBtn.addEventListener('click', () => applyNudge('shelter'));
  zoomOutBtn.addEventListener('click', () => camera.targetZoom = clamp(camera.targetZoom / 1.22, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM));
  fitBtn.addEventListener('click', () => {
    focusCameraOnWorld();
  });
  saveBtn.addEventListener('click', saveWorldToFile);
  loadBtn.addEventListener('click', () => loadInput.click());
  loadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    const pausedBeforeLoad = ui.replay ? ui.pauseBeforeReplay : ui.paused;
    loadWorld(data, false);
    ui.replay = false;
    ui.liveBackup = null;
    ui.pauseBeforeReplay = false;
    ui.paused = pausedBeforeLoad;
    pauseBtn.textContent = ui.paused ? 'Play' : 'Pause';
    timeline.max = String(state.snapshots.length);
    timeline.value = String(state.snapshots.length);
    timelineLabel.textContent = 'live';
    loadInput.value = '';
  });
  timeline.addEventListener('input', () => {
    const v = Number(timeline.value);
    if(v >= state.snapshots.length) exitReplay();
    else enterReplay(v);
  });

  canvas.addEventListener('mousedown', (e) => {
    camera.dragging = true;
    canvas.classList.add('dragging');
    camera.dragStartX = e.clientX;
    camera.dragStartY = e.clientY;
    camera.dragWorldX = camera.x;
    camera.dragWorldY = camera.y;
    camera.moved = false;
  });
  window.addEventListener('mousemove', (e) => {
    if(!camera.dragging) return;
    const px = e.clientX - camera.dragStartX;
    const py = e.clientY - camera.dragStartY;
    const delta = screenDeltaToWorld(px, py, camera.zoom);
    camera.x = clamp(camera.dragWorldX - delta.x, 0, WORLD_W);
    camera.y = clamp(camera.dragWorldY - delta.y, 0, WORLD_H);
    if(Math.hypot(px, py) > 3) camera.moved = true;
  });
  window.addEventListener('mouseup', (e) => {
    if(!camera.dragging) return;
    canvas.classList.remove('dragging');
    camera.dragging = false;
    if(!camera.moved){
      const rect = canvas.getBoundingClientRect();
      const wx = screenToWorld((e.clientX - rect.left), (e.clientY - rect.top)).x;
      const wy = screenToWorld((e.clientX - rect.left), (e.clientY - rect.top)).y;
      setSelectedEntity(pickEntity(wx, wy));
      refreshInspector(true);
    }
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const before = screenToWorld(mx, my);
    const scale = e.deltaY < 0 ? 1.14 : 0.88;
    const nextZoom = clamp(camera.targetZoom * scale, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
    const after = screenToWorldAt(mx, my, nextZoom);
    camera.targetZoom = nextZoom;
    camera.x += before.x - after.x;
    camera.y += before.y - after.y;
  }, { passive:false });

  window.addEventListener('resize', setCanvasSize);
}
function randomSeed(){
  const rng = mulberry32((Date.now() ^ (performance.now()*1000)) >>> 0);
  const left = ['woven','knife','plate','ember','quiet','frayed','lattice','bone','ashen','pulsed','soft','dense','hollow','rift'];
  const right = ['reach','hollow','route','cradle','fold','trace','march','stronghold','basin','crawl','memory','nest','edge'];
  return `${pick(rng,left)}-${pick(rng,right)}-${randInt(rng,1000,9999)}`;
}

bindUI();
setCanvasSize();
newWorld(seedInput.value.trim() || randomSeed());
requestAnimationFrame(animate);
