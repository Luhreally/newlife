// Source module: projection, terrain, structures, actors, overlays, and scene rendering.

function renderGenesisVeins(){
  const fade = clamp((0.9 - camera.zoom) * 0.9 + (ERA_INDEX.materials - state.eraIndex) * 0.12, 0.06, 0.46);
  if(fade <= 0.02) return;
  const points = [
    state.macro.fertile,
    state.macro.stable,
    state.macro.volatile,
    { x:(state.macro.corridor.ax + state.macro.corridor.bx) * 0.5, y:(state.macro.corridor.ay + state.macro.corridor.by) * 0.5 }
  ];
  ctx.save();
  ctx.setLineDash([8, 10]);
  ctx.lineWidth = 1.2;
  for(let i = 0; i < points.length; i++){
    const a = worldToScreen(points[i].x, points[i].y);
    const b = worldToScreen(points[(i + 1) % points.length].x, points[(i + 1) % points.length].y);
    ctx.strokeStyle = hsl(state.palette.baseHue + i * 18, 72, 68, fade);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo((a.x + b.x) * 0.5, (a.y + b.y) * 0.5 - 26, b.x, b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}
function renderProtoLife(){
  if(!overlayInputs.proto.checked || state.eraIndex < ERA_INDEX.proto) return;
  for(const cell of state.protoCells){
    const pos = worldToScreen(cell.x, cell.y);
    const size = Math.max(2.4, (5 + cell.maturity * 12) * camera.zoom);
    if(pos.x < -size * 2 || pos.y < -size * 2 || pos.x > canvas.width / dpr + size * 2 || pos.y > canvas.height / dpr + size * 2) continue;
    const mat = state.materials[cell.materialId];
    const pulse = 0.78 + Math.sin(state.time * (1.4 + state.motion.pulseRate) + cell.phase) * 0.22;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(cell.phase * 0.5 + state.time * 0.04);
    ctx.fillStyle = hsl(mat.hue + 12, mat.sat * 0.7, mat.light + 16, cell.spawned ? 0.14 : 0.34);
    ctx.strokeStyle = hsl(mat.hue + 28, mat.sat * 0.85, mat.light + 26, cell.spawned ? 0.18 : 0.52);
    ctx.lineWidth = Math.max(1, camera.zoom * 0.8);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * pulse, size * (0.6 + cell.stability * 0.2), 0, 0, Math.PI * 2);
    ctx.fill();
    if(camera.zoom > 0.7){
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, size * (1.25 + cell.energy / 220), 0, Math.PI * 2);
      ctx.strokeStyle = hsl(mat.hue - 10, mat.sat * 0.6, mat.light + 30, cell.spawned ? 0.08 : 0.18);
      ctx.stroke();
    }
    ctx.restore();
  }
}
function renderNudges(){
  if(!state.nudges.length) return;
  for(const nudge of state.nudges){
    const life = 1 - nudge.age / nudge.ttl;
    if(life <= 0) continue;
    const pos = worldToScreen(nudge.x, nudge.y);
    const radius = nudge.radius * camera.zoom * (1.05 - life * 0.25);
    const hue = nudge.kind === 'bloom' ? state.palette.baseHue + 82 : state.palette.baseHue + 28;
    ctx.strokeStyle = hsl(hue, 82, 72, life * 0.28);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}
function renderTerrainEdits(){
  if(!(state.terrainEdits || []).length) return;
  for(const edit of state.terrainEdits){
    const lift = edit.kind === 'berm' ? 2.4 : edit.kind === 'shrine' ? 3.2 : edit.kind === 'ramp' ? 1.4 : 0.2;
    const pos = worldToScreen(edit.x, edit.y, lift);
    const size = Math.max(4, edit.radius * camera.zoom * 0.62);
    if(pos.x < -size * 3 || pos.y < -size * 3 || pos.x > canvas.width / dpr + size * 3 || pos.y > canvas.height / dpr + size * 3) continue;

    const mat = state.materials[edit.materialId] || state.materials[0];
    const pulse = 0.78 + Math.sin(state.time * 1.1 + edit.phase) * 0.12;
    const alphaMul = clamp(0.16 + edit.strength * 0.7, 0.14, 0.92);

    if(edit.kind === 'pit'){
      ctx.save();
      ctx.translate(pos.x, pos.y + size * 0.08);
      ctx.scale(1, 0.58);
      ctx.fillStyle = hsl(mat.hue - 10, mat.sat * 0.45, Math.max(6, mat.light - 28), 0.34 * alphaMul);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.88, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hsl(mat.hue + 8, mat.sat * 0.55, mat.light + 10, 0.18 * alphaMul);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-size * 0.48, 0);
      ctx.lineTo(size * 0.3, -size * 0.22);
      ctx.moveTo(-size * 0.2, size * 0.16);
      ctx.lineTo(size * 0.5, size * 0.02);
      ctx.stroke();
      ctx.restore();
    }else if(edit.kind === 'road'){
      ctx.save();
      ctx.translate(pos.x, pos.y);
      drawIsoPrismLocal(
        size * 0.8,
        size * 0.36,
        1.3,
        hsl(mat.hue + 12, mat.sat * 0.55, mat.light + 18, 0.9 * alphaMul),
        hsl(mat.hue + 2, mat.sat * 0.4, mat.light - 2, 0.82 * alphaMul),
        hsl(mat.hue - 8, mat.sat * 0.36, mat.light - 8, 0.84 * alphaMul),
        null
      );
      ctx.strokeStyle = hsl(mat.hue + 26, mat.sat * 0.6, mat.light + 28, 0.28 * alphaMul);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-size * 0.34, 0);
      ctx.lineTo(size * 0.34, 0);
      ctx.stroke();
      ctx.restore();
    }else if(edit.kind === 'berm'){
      drawGroundShadow(pos.x, pos.y + size * 0.2, size * 0.9, size * 0.26, 0.08 * alphaMul);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      drawIsoPrismLocal(
        size * 0.9,
        size * 0.34,
        size * 0.34 * pulse,
        hsl(mat.hue + 8, mat.sat * 0.62, mat.light + 14, 0.92 * alphaMul),
        hsl(mat.hue - 2, mat.sat * 0.48, mat.light - 2, 0.88 * alphaMul),
        hsl(mat.hue - 10, mat.sat * 0.42, mat.light - 8, 0.9 * alphaMul),
        null
      );
      ctx.restore();
    }else if(edit.kind === 'ramp'){
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.fillStyle = hsl(mat.hue + 10, mat.sat * 0.55, mat.light + 16, 0.86 * alphaMul);
      ctx.strokeStyle = hsl(mat.hue - 6, mat.sat * 0.42, mat.light - 6, 0.72 * alphaMul);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-size * 0.52, size * 0.24);
      ctx.lineTo(size * 0.56, 0);
      ctx.lineTo(-size * 0.2, -size * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }else if(edit.kind === 'shrine'){
      drawGroundShadow(pos.x, pos.y + size * 0.18, size * 0.72, size * 0.22, 0.09 * alphaMul);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      drawIsoPrismLocal(
        size * 0.54,
        size * 0.28,
        size * 0.36,
        hsl(mat.hue + 18, Math.min(92, mat.sat + 6), mat.light + 22, 0.92 * alphaMul),
        hsl(mat.hue + 6, mat.sat * 0.5, mat.light, 0.86 * alphaMul),
        hsl(mat.hue - 8, mat.sat * 0.4, mat.light - 8, 0.88 * alphaMul),
        null
      );
      ctx.restore();
      drawSigilMark('ancestor', pos.x, pos.y - size * 0.18, Math.max(3, size * 0.2), hsl(mat.hue + 46, 82, 76, 0.5 * alphaMul));
      ctx.strokeStyle = hsl(mat.hue + 58, 84, 78, 0.24 * alphaMul);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - size * 0.1, size * 0.52, 0, Math.PI * 2);
      ctx.stroke();
    }else if(edit.kind === 'stockpile'){
      drawGroundShadow(pos.x, pos.y + size * 0.22, size * 0.86, size * 0.3, 0.1 * alphaMul);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      const lumps = 2 + Math.floor(edit.strength * 3);
      for(let i = 0; i < lumps; i++){
        const offset = (i - (lumps - 1) * 0.5) * size * 0.22;
        const wobble = Math.sin(edit.phase + i * 1.7) * size * 0.04;
        ctx.save();
        ctx.translate(offset, Math.abs(offset) * 0.12 + wobble);
        drawIsoPrismLocal(
          size * (0.24 + i * 0.03),
          size * (0.16 + i * 0.02),
          size * (0.22 + i * 0.06) * pulse,
          hsl(mat.hue + 14, Math.min(92, mat.sat + 8), mat.light + 18, 0.9 * alphaMul),
          hsl(mat.hue + 4, mat.sat * 0.58, mat.light - 2, 0.84 * alphaMul),
          hsl(mat.hue - 6, mat.sat * 0.48, mat.light - 9, 0.86 * alphaMul),
          null
        );
        ctx.restore();
      }
      ctx.restore();
      ctx.strokeStyle = hsl(mat.hue + 24, Math.min(96, mat.sat + 10), mat.light + 24, 0.24 * alphaMul);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - size * 0.1, size * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }else if(edit.kind === 'scar'){
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.strokeStyle = hsl(mat.hue - 18, 26, Math.max(18, mat.light - 24), 0.46 * alphaMul);
      ctx.lineWidth = 1.3;
      for(let i = 0; i < 3; i++){
        const a = -0.6 + i * 0.55;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * size * 0.15, Math.sin(a) * size * 0.15);
        ctx.lineTo(Math.cos(a) * size * 0.72, Math.sin(a) * size * 0.52);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function renderWorldBase(){
  const pad = 420;
  drawIsoTile(
    -pad,
    -pad,
    WORLD_W + pad * 2,
    WORLD_H + pad * 2,
    20,
    hsl(state.palette.baseHue + 8, 20, 11, 1),
    hsl(state.palette.baseHue - 4, 18, 8, 1),
    hsl(state.palette.baseHue - 8, 18, 6, 1)
  );
}

function renderField(){
  const bounds = visibleWorldBounds(2);
  const gx0 = clamp(Math.floor(bounds.minX / CELL_W) - 1, 0, GRID_W - 1);
  const gx1 = clamp(Math.floor(bounds.maxX / CELL_W) + 1, 0, GRID_W - 1);
  const gy0 = clamp(Math.floor(bounds.minY / CELL_H) - 1, 0, GRID_H - 1);
  const gy1 = clamp(Math.floor(bounds.maxY / CELL_H) + 1, 0, GRID_H - 1);

  for(let gy = gy0; gy <= gy1; gy++){
    for(let gx = gx0; gx <= gx1; gx++){
      const idx = gy * GRID_W + gx;
      const x = gx * CELL_W;
      const y = gy * CELL_H;
      const pos = worldToScreen(x, y);
      const w = CELL_W * camera.zoom + 1;
      const h = CELL_H * camera.zoom + 1;
      const fert = state.static.fertility[idx];
      const danger = state.static.danger[idx];
      const cover = state.static.cover[idx];
      const res = state.static.resource[idx];
      const dom = state.materials[state.static.materialA[idx]];
      const hue = overlayInputs.material.checked ? dom.hue : lerp(dom.hue, dom.hue + fert * 42 - danger * 20, 0.45);
      const sat = overlayInputs.material.checked ? dom.sat : dom.sat * 0.55 + fert * 18;
      const light = 10 + res * 16 + cover * 7 - danger * 6 + (overlayInputs.material.checked ? dom.light * 0.12 : 0);
      const height = 4 + (cover * 5 + res * 4 + fert * 2.5 + danger * 2) * 3.2;
      const tile = drawIsoTile(
        x,
        y,
        CELL_W,
        CELL_H,
        height,
        hsl(hue, sat, light + 4, 1),
        hsl(hue - 6, sat * 0.8, light - 9, 1),
        hsl(hue - 10, sat * 0.72, light - 14, 1),
        camera.zoom > 0.92 ? hsl(hue + 6, sat * 0.5, light + 14, 0.06) : null
      );

      if(camera.zoom > 1.02 || (overlayInputs.material.checked && camera.zoom > 0.88)){
        const motifA = dom.motif;
        const top = tile.top;
        const center = {
          x: (top[0].x + top[1].x + top[2].x + top[3].x) * 0.25,
          y: (top[0].y + top[1].y + top[2].y + top[3].y) * 0.25
        };
        ctx.strokeStyle = hsl(dom.hue, dom.sat * 0.8, dom.light + 10, 0.08 + state.static.materialMix[idx] * 0.08);
        ctx.lineWidth = 1;
        if(motifA === 'band' || motifA === 'plate'){
          ctx.beginPath();
          ctx.moveTo((top[0].x + top[3].x) * 0.5, (top[0].y + top[3].y) * 0.5);
          ctx.lineTo((top[1].x + top[2].x) * 0.5, (top[1].y + top[2].y) * 0.5);
          ctx.stroke();
        }else if(motifA === 'dots' || motifA === 'pore' || motifA === 'bead'){
          ctx.beginPath();
          ctx.arc(center.x, center.y, Math.max(1, Math.min(w, h) * 0.08), 0, Math.PI * 2);
          ctx.fillStyle = hsl(dom.hue + 6, dom.sat * 0.8, dom.light + 6, 0.1);
          ctx.fill();
        }else if(motifA === 'mesh' || motifA === 'vein' || motifA === 'threads'){
          ctx.beginPath();
          ctx.moveTo(top[0].x, top[0].y);
          ctx.lineTo(top[2].x, top[2].y);
          ctx.moveTo(top[1].x, top[1].y);
          ctx.lineTo(top[3].x, top[3].y);
          ctx.stroke();
        }
      }
    }
  }
}
function renderRegionalOverlay(){
  if(!overlayInputs.regional.checked && !overlayInputs.culture.checked) return;
  const leaders = state.camps.slice().sort((a,b)=>b.score-a.score).slice(0, 4);
  if(!leaders.length) return;
  const bounds = visibleWorldBounds(2);
  const gx0 = clamp(Math.floor(bounds.minX / CELL_W) - 1, 0, GRID_W - 1);
  const gx1 = clamp(Math.floor(bounds.maxX / CELL_W) + 1, 0, GRID_W - 1);
  const gy0 = clamp(Math.floor(bounds.minY / CELL_H) - 1, 0, GRID_H - 1);
  const gy1 = clamp(Math.floor(bounds.maxY / CELL_H) + 1, 0, GRID_H - 1);
  for(let gy = gy0; gy <= gy1; gy++){
    for(let gx = gx0; gx <= gx1; gx++){
      const x = (gx + 0.5) * CELL_W;
      const y = (gy + 0.5) * CELL_H;
      let best = null, bestScore = -Infinity;
      for(const camp of leaders){
        const score = camp.score - dist(x,y,camp.x,camp.y) * 0.02;
        if(score > bestScore){ bestScore = score; best = camp; }
      }
      if(!best) continue;
      const alphaVal = overlayInputs.culture.checked ? 0.16 : 0.10;
      const top = isoQuadPoints(gx * CELL_W, gy * CELL_H, CELL_W, CELL_H, 0.3);
      pathPolygon(top);
      ctx.fillStyle = hsl(best.culture.colorHue, 70, 58, alphaVal);
      ctx.fill();
    }
  }
}
function renderTrails(){
  if(!overlayInputs.routes.checked) return;
  const bounds = visibleWorldBounds(2);
  const gx0 = clamp(Math.floor(bounds.minX / CELL_W) - 1, 0, GRID_W - 1);
  const gx1 = clamp(Math.floor(bounds.maxX / CELL_W) + 1, 0, GRID_W - 1);
  const gy0 = clamp(Math.floor(bounds.minY / CELL_H) - 1, 0, GRID_H - 1);
  const gy1 = clamp(Math.floor(bounds.maxY / CELL_H) + 1, 0, GRID_H - 1);
  for(let gy = gy0; gy <= gy1; gy++){
    for(let gx = gx0; gx <= gx1; gx++){
      const idx = gy * GRID_W + gx;
      const heat = state.trails[idx];
      if(heat < 0.02) continue;
      const top = isoQuadPoints(gx * CELL_W, gy * CELL_H, CELL_W, CELL_H, 0.6);
      pathPolygon(top);
      ctx.fillStyle = hsl(state.palette.baseHue + 36, 70, 60, clamp(heat * 0.28, 0, 0.24));
      ctx.fill();
    }
  }
}
function renderCampInfluence(){
  if(!overlayInputs.influence.checked) return;
  for(const camp of state.camps){
    const pos = worldToScreen(camp.x, camp.y);
    const rx = camp.homeRadius * 1.18 * camera.zoom * ISO_X_SCALE;
    const ry = camp.homeRadius * 1.18 * camera.zoom * ISO_Y_SCALE;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(rx, ry);
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    grd.addColorStop(0, hsl(camp.culture.colorHue, 72, 56, 0.20));
    grd.addColorStop(1, hsl(camp.culture.colorHue, 72, 56, 0));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
function drawFragmentShape(fragment, sx, sy, scale, fillOverride=null){
  if(fragment.state === 'placed'){
    drawPlacedStructure(fragment, sx, sy, scale);
    return;
  }
  const mat = state.materials[fragment.materialId];
  const size = fragment.size * scale;
  ctx.save();
  ctx.translate(sx, sy);
  if(fragment.kind === 'chunk'){
    const topFill = fillOverride || hsl(mat.hue + 4, Math.min(92, mat.sat + 4), mat.light + fragment.shade + 10, 0.92);
    const eastFill = hsl(mat.hue - 6, mat.sat * 0.84, mat.light + fragment.shade - 8, 0.88);
    const southFill = hsl(mat.hue - 12, mat.sat * 0.76, mat.light + fragment.shade - 14, 0.9);
    drawIsoPrismLocal(size * 0.56, size * 0.36, size * 0.72, topFill, eastFill, southFill, null);
    if(scale > 0.8){
      ctx.strokeStyle = hsl(mat.hue + 14, mat.sat * 0.7, mat.light + 22, 0.46);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-size * 0.22, 0);
      ctx.lineTo(size * 0.12, -size * 0.14);
      ctx.moveTo(-size * 0.05, size * 0.1);
      ctx.lineTo(size * 0.2, size * 0.02);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  ctx.rotate(worldAngleToScreen(fragment.rot || 0));
  ctx.scale(1, 0.82);
  ctx.fillStyle = fillOverride || hsl(mat.hue, mat.sat, mat.light + fragment.shade, fragment.state === 'placed' ? 0.88 : 0.78);
  ctx.strokeStyle = hsl(mat.hue + 8, mat.sat * 0.9, mat.light + 16, 0.85);
  ctx.lineWidth = Math.max(1, scale * 0.8);
  ctx.beginPath();
  const ang = (state.origin.angularity + 1) * 0.5;
  if(mat.structure.includes('shard') || mat.edge === 'jagged' || mat.edge === 'broken'){
    const pts = 4 + Math.floor(ang * 3);
    for(let i = 0; i < pts; i++){
      const a = (i / pts) * Math.PI * 2;
      const r = size * (0.55 + (i % 2 ? 0.45 : 0.15) + Math.sin(i * 1.7 + fragment.id) * 0.08);
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if(i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }else if(mat.structure.includes('fibrous') || mat.motif === 'threads' || mat.motif === 'vein'){
    ctx.moveTo(-size * 0.7, 0);
    ctx.quadraticCurveTo(0, -size * 0.9, size * 0.7, 0);
    ctx.quadraticCurveTo(0, size * 0.9, -size * 0.7, 0);
  }else if(mat.structure.includes('porous') || mat.structure.includes('spongy')){
    ctx.arc(0, 0, size * 0.68, 0, Math.PI * 2);
  }else if(mat.structure.includes('layered') || mat.structure.includes('plated')){
    ctx.rect(-size * 0.75, -size * 0.5, size * 1.5, size);
  }else if(mat.structure.includes('membranous') || mat.edge === 'melted'){
    ctx.ellipse(0, 0, size * 0.86, size * 0.46, 0, 0, Math.PI * 2);
  }else{
    ctx.arc(0, 0, size * 0.58, 0, Math.PI * 2);
  }
  ctx.fill();
  if(scale > 0.6) ctx.stroke();

  if(scale > 0.8){
    ctx.strokeStyle = hsl(mat.hue - 10, mat.sat * 0.7, mat.light + 20, 0.45);
    ctx.lineWidth = 1;
    if(mat.motif === 'band' || mat.motif === 'plate'){
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, 0);
      ctx.lineTo(size * 0.6, 0);
      ctx.stroke();
    }else if(mat.motif === 'dots' || mat.motif === 'pore' || mat.motif === 'bead'){
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }else if(mat.motif === 'mesh'){
      ctx.beginPath();
      ctx.moveTo(-size * 0.45, -size * 0.45);
      ctx.lineTo(size * 0.45, size * 0.45);
      ctx.moveTo(size * 0.45, -size * 0.45);
      ctx.lineTo(-size * 0.45, size * 0.45);
      ctx.stroke();
    }
  }

  if(fragment.state === 'placed' && scale > 0.8){
    if(fragment.kind === 'hearth'){
      ctx.fillStyle = hsl(mat.hue + 18, Math.min(90, mat.sat + 18), mat.light + 20, 0.48);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }else if(fragment.kind === 'store'){
      ctx.strokeStyle = 'rgba(255,245,220,0.48)';
      ctx.beginPath();
      ctx.rect(-size * 0.35, -size * 0.28, size * 0.7, size * 0.56);
      ctx.stroke();
    }else if(fragment.kind === 'watch'){
      ctx.strokeStyle = 'rgba(225,240,255,0.52)';
      ctx.beginPath();
      ctx.moveTo(0, size * 0.44);
      ctx.lineTo(0, -size * 0.44);
      ctx.moveTo(-size * 0.22, -size * 0.12);
      ctx.lineTo(size * 0.22, -size * 0.12);
      ctx.stroke();
    }else if(fragment.kind === 'workshop'){
      ctx.strokeStyle = 'rgba(255,230,180,0.48)';
      ctx.beginPath();
      ctx.moveTo(-size * 0.3, -size * 0.3);
      ctx.lineTo(size * 0.3, size * 0.3);
      ctx.moveTo(size * 0.3, -size * 0.3);
      ctx.lineTo(-size * 0.3, size * 0.3);
      ctx.stroke();
    }
  }
  ctx.restore();
}
function structureBuildProgress(fragment){
  if(fragment.state !== 'placed') return 1;
  const placedAt = fragment.placedAt ?? Math.max(0, state.time - Math.min(6, fragment.age || 0));
  return clamp((state.time - placedAt) / 6, 0.16, 1);
}
function drawPlacedStructure(fragment, sx, sy, scale){
  const mat = state.materials[fragment.materialId];
  const size = fragment.size * scale;
  const progress = structureBuildProgress(fragment);
  const kind = fragment.kind || 'fragment';
  const baseHue = mat.hue;
  const cutaway = structureCutawayState(fragment);
  const alphaMul = cutaway.alpha;
  const topFill = hsl(baseHue, Math.min(90, mat.sat + 10), mat.light + fragment.shade + 10, 0.95 * alphaMul);
  const eastFill = hsl(baseHue - 6, mat.sat * 0.78, mat.light + fragment.shade - 8, 0.92 * alphaMul);
  const southFill = hsl(baseHue - 12, mat.sat * 0.7, mat.light + fragment.shade - 14, 0.94 * alphaMul);
  const stroke = hsl(baseHue + 12, mat.sat * 0.75, mat.light + 20, cutaway.active ? 0.24 : 0.42);

  drawGroundShadow(sx, sy + size * 0.55, size * (0.8 + progress * 0.18), size * 0.34, (0.14 + progress * 0.05) * (cutaway.active ? 0.72 : 1));
  ctx.save();
  ctx.translate(sx, sy - size * 0.08 * progress);

  const foundationW = size * (kind === 'wall' ? 0.82 : 0.62);
  const foundationH = size * (kind === 'wall' ? 0.2 : 0.3);
  drawIsoPrismLocal(
    foundationW,
    foundationH,
    Math.max(2, size * 0.14),
    hsl(baseHue + 3, mat.sat * 0.65, mat.light + 2, 0.95),
    hsl(baseHue - 8, mat.sat * 0.55, mat.light - 10, 0.92),
    hsl(baseHue - 12, mat.sat * 0.5, mat.light - 14, 0.94),
    stroke
  );

  const screenRot = worldAngleToScreen(fragment.rot || 0);
  if(kind === 'wall'){
    ctx.rotate(screenRot);
    drawIsoPrismLocal(
      size * 0.92,
      size * 0.18,
      size * 0.6 * progress,
      topFill,
      eastFill,
      southFill,
      stroke,
      cutaway.active ? { hideEast:true, hideSouth:true } : null
    );
  }else if(kind === 'spike'){
    ctx.rotate(screenRot);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, scale * 0.9);
    for(let i = -1; i <= 1; i++){
      ctx.beginPath();
      ctx.moveTo(i * size * 0.18, -size * 0.02);
      ctx.lineTo(i * size * 0.12, -size * (0.85 * progress));
      ctx.stroke();
    }
  }else if(kind === 'watch'){
    ctx.rotate(screenRot + 0.1);
    drawIsoPrismLocal(
      size * 0.42,
      size * 0.24,
      size * 1.45 * progress,
      topFill,
      eastFill,
      southFill,
      stroke,
      cutaway.active ? { hideEast:true, hideSouth:true } : null
    );
    drawChunkyRoofLocal(
      size * 0.5,
      size * 0.22,
      size * 1.35 * progress,
      size * 0.2,
      hsl(baseHue + 12, 46, 72, 0.92 * alphaMul),
      hsl(baseHue + 2, mat.sat * 0.64, mat.light + 2, 0.88 * alphaMul),
      hsl(baseHue - 4, mat.sat * 0.58, mat.light - 4, 0.88 * alphaMul),
      stroke,
      cutaway.active ? { hideSouth:true } : null
    );
  }else if(kind === 'shelter' || kind === 'store' || kind === 'workshop'){
    ctx.rotate(screenRot);
    const bodyH = size * (kind === 'shelter' ? 0.96 : kind === 'store' ? 0.84 : 0.76) * progress;
    const openOptions = cutaway.active ? { hideEast:true, hideSouth:true } : null;
    drawIsoPrismLocal(size * 0.68, size * 0.28, bodyH, topFill, eastFill, southFill, stroke, openOptions);
    if(cutaway.active){
      drawIsoPrismLocal(
        size * 0.52,
        size * 0.2,
        Math.max(1.2, size * 0.05),
        hsl(baseHue + 30, 28, 28, 0.95),
        hsl(baseHue + 18, 22, 22, 0.85),
        hsl(baseHue + 10, 20, 18, 0.88),
        'rgba(255,245,230,0.12)',
        { hideEast:true, hideSouth:true }
      );
      ctx.strokeStyle = 'rgba(255,240,210,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-size * 0.3, -bodyH * 0.1);
      ctx.lineTo(-size * 0.3, -bodyH * 0.75);
      ctx.moveTo(size * 0.3, -bodyH * 0.1);
      ctx.lineTo(size * 0.3, -bodyH * 0.75);
      ctx.stroke();
    }
    drawChunkyRoofLocal(
      size * (kind === 'store' ? 0.82 : 0.92),
      size * 0.3,
      bodyH,
      size * 0.24,
      hsl(baseHue + 24, Math.min(94, mat.sat + 8), mat.light + 24, cutaway.active ? 0.36 : 0.96),
      hsl(baseHue + 6, mat.sat * 0.72, mat.light + 4, cutaway.active ? 0.26 : 0.92),
      hsl(baseHue - 2, mat.sat * 0.64, mat.light - 1, cutaway.active ? 0.24 : 0.92),
      stroke,
      cutaway.active ? { hideSouth:true, hideEast:true } : null
    );
    if(kind === 'workshop'){
      ctx.strokeStyle = 'rgba(255,232,190,0.55)';
      ctx.beginPath();
      ctx.moveTo(-size * 0.22, -bodyH * 0.58);
      ctx.lineTo(size * 0.22, -bodyH * 0.18);
      ctx.moveTo(size * 0.22, -bodyH * 0.58);
      ctx.lineTo(-size * 0.22, -bodyH * 0.18);
      ctx.stroke();
    }else if(kind === 'store' && cutaway.active){
      ctx.fillStyle = 'rgba(245,220,180,0.35)';
      ctx.fillRect(-size * 0.18, -bodyH * 0.22, size * 0.12, size * 0.12);
      ctx.fillRect(size * 0.02, -bodyH * 0.14, size * 0.14, size * 0.1);
    }else if(kind === 'shelter' && cutaway.active){
      ctx.strokeStyle = 'rgba(255,220,180,0.26)';
      ctx.beginPath();
      ctx.arc(0, -size * 0.1, size * 0.14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }else if(kind === 'hearth'){
    drawIsoPrismLocal(size * 0.5, size * 0.26, size * 0.14, topFill, eastFill, southFill, stroke);
    ctx.fillStyle = hsl(baseHue + 26, Math.min(95, mat.sat + 24), mat.light + 30, 0.55 + progress * 0.2);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.18, size * 0.18, size * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }else if(kind === 'marker'){
    ctx.rotate(screenRot);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1.2, scale);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.02);
    ctx.lineTo(0, -size * (1.05 * progress));
    ctx.stroke();
    drawSigilMark('ancestor', 0, -size * (1.16 * progress), size * 0.14, hsl(baseHue + 32, 78, 78, 0.65));
  }else{
    ctx.rotate(screenRot);
    drawIsoPrismLocal(size * 0.56, size * 0.24, size * 0.46 * progress, topFill, eastFill, southFill, stroke);
  }

  if(progress < 0.98){
    const scaffoldAlpha = 1 - progress;
    ctx.strokeStyle = `rgba(230,220,190,${0.24 + scaffoldAlpha * 0.18})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-size * 0.6, 0);
    ctx.lineTo(-size * 0.6, -size * (0.9 + progress * 0.35));
    ctx.lineTo(size * 0.6, -size * (0.9 + progress * 0.35));
    ctx.lineTo(size * 0.6, 0);
    ctx.moveTo(-size * 0.6, -size * 0.46);
    ctx.lineTo(size * 0.6, -size * 0.46);
    ctx.stroke();
    if(camera.zoom > 1.1){
      ctx.fillStyle = `rgba(255,220,150,${0.16 + scaffoldAlpha * 0.18})`;
      for(let i = 0; i < 3; i++){
        const sparkX = Math.sin(state.time * 4 + fragment.id + i) * size * 0.34;
        const sparkY = -size * (0.3 + i * 0.12 + scaffoldAlpha * 0.2);
        ctx.beginPath();
        ctx.rect(sparkX - 1.5, sparkY - 1.5, 3, 3);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}
function drawDepositEntity(deposit){
  const basePos = worldToScreen(deposit.x, deposit.y);
  const extent = deposit.radius * camera.zoom;
  if(extent < 1.5) return;
  if(basePos.x < -extent * 3 || basePos.y < -extent * 3 || basePos.x > canvas.width / dpr + extent * 3 || basePos.y > canvas.height / dpr + extent * 3) return;

  const mat = state.materials[deposit.materialId];
  const available = depositAvailability(deposit);
  const alphaMul = clamp(0.22 + available * 0.82, 0.18, 1);

  drawGroundShadow(basePos.x, basePos.y + extent * 0.2, extent * 0.92, extent * 0.36, 0.12 * alphaMul);

  if(camera.zoom < 0.56){
    ctx.fillStyle = hsl(mat.hue + 3, mat.sat * 0.72, mat.light + 6, 0.38 * alphaMul);
    ctx.beginPath();
    ctx.ellipse(basePos.x, basePos.y - extent * 0.05, extent * 0.58, extent * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const lumps = deposit.lumps || [];
  const visibleCount = Math.max(1, Math.round(lumps.length * clamp(0.28 + available * 0.84, 0.28, 1)));
  for(let i = 0; i < visibleCount; i++){
    const lump = lumps[i];
    const presence = clamp(available * 1.15 - i * 0.08, 0.15, 1);
    if(presence <= 0.16) continue;
    const pos = worldToScreen(
      deposit.x + lump.ox,
      deposit.y + lump.oy,
      1.2 + lump.z * 0.04 * presence + Math.sin(state.time * 1.1 + deposit.phase + i) * 0.14
    );
    const w = lump.w * camera.zoom * (0.72 + presence * 0.28);
    const h = lump.h * camera.zoom * (0.72 + presence * 0.28);
    const z = lump.z * camera.zoom * (0.54 + presence * 0.42);
    drawGroundShadow(pos.x, pos.y + h * 0.46, w * 0.78, h * 0.22, (0.08 + presence * 0.05) * alphaMul);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    drawIsoPrismLocal(
      w,
      h * 0.72,
      z,
      hsl(mat.hue + 8, Math.min(92, mat.sat + 4), mat.light + 16, 0.96 * alphaMul),
      hsl(mat.hue - 5, mat.sat * 0.82, mat.light - 4, 0.9 * alphaMul),
      hsl(mat.hue - 12, mat.sat * 0.76, mat.light - 12, 0.92 * alphaMul),
      null
    );
    if(camera.zoom > 1){
      ctx.strokeStyle = hsl(mat.hue + 18, mat.sat * 0.7, mat.light + 24, 0.28 * alphaMul);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-w * 0.18, -z * 0.24);
      ctx.lineTo(w * 0.1, -z * 0.36);
      ctx.moveTo(-w * 0.04, -z * 0.06);
      ctx.lineTo(w * 0.22, -z * 0.18);
      ctx.stroke();
    }
    ctx.restore();
  }
}
function drawFragmentEntity(frag){
  const basePos = worldToScreen(frag.x, frag.y);
  const scale = camera.zoom * (frag.state === 'placed' ? 1.2 : 1);
  const size = frag.size * scale;
  if(scale < 0.08) return;
  if(basePos.x < -size * 3 || basePos.y < -size * 3 || basePos.x > canvas.width / dpr + size * 3 || basePos.y > canvas.height / dpr + size * 3) return;

  if(frag.state === 'placed'){
    drawPlacedStructure(frag, worldToScreen(frag.x, frag.y, 1.8).x, worldToScreen(frag.x, frag.y, 1.8).y, scale);
    return;
  }

  const zLift = frag.state === 'stored' ? 0.8 : Math.sin(state.time * 1.7 + frag.id) * 0.08 + 0.3;
  const pos = worldToScreen(frag.x, frag.y, zLift);
  drawGroundShadow(basePos.x, basePos.y + size * 0.4, size * 0.72, size * 0.28, frag.state === 'stored' ? 0.12 : 0.1);
  drawFragmentShape(frag, pos.x, pos.y, scale);
}
function drawCore(coreKey, size, color, outline){
  ctx.fillStyle = color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if(coreKey === 'bulb'){
    ctx.ellipse(0, 0, size * 0.9, size * 0.66, 0, 0, Math.PI * 2);
  }else if(coreKey === 'spindle'){
    ctx.moveTo(-size * 0.95, 0);
    ctx.quadraticCurveTo(0, -size * 0.56, size * 0.95, 0);
    ctx.quadraticCurveTo(0, size * 0.56, -size * 0.95, 0);
  }else if(coreKey === 'slab'){
    ctx.moveTo(-size, -size * 0.45);
    ctx.lineTo(size * 0.92, -size * 0.52);
    ctx.lineTo(size, size * 0.46);
    ctx.lineTo(-size * 0.85, size * 0.58);
    ctx.closePath();
  }else if(coreKey === 'ring'){
    ctx.arc(0,0,size*0.84,0,Math.PI*2);
  }else{
    ctx.moveTo(-size, size * 0.34);
    ctx.lineTo(size, 0);
    ctx.lineTo(-size, -size * 0.34);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  if(coreKey === 'ring'){
    ctx.beginPath();
    ctx.fillStyle = 'rgba(8,12,17,0.85)';
    ctx.arc(0,0,size*0.34,0,Math.PI*2);
    ctx.fill();
  }
}
function drawMoveLimbs(moveKey, size, phase, color, motion={}){
  const stepStrength = motion.step || 0;
  const load = motion.load || 0;
  const gait = phase;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.1, size * 0.12);
  if(moveKey === 'legs' || moveKey === 'pads'){
    const pairs = 2;
    const strideScale = moveKey === 'legs' ? 0.42 : 0.24;
    for(let side = -1; side <= 1; side += 2){
      for(let i = 0; i < pairs; i++){
        const ox = -size * 0.3 + i * size * 0.45;
        const stride = Math.sin(gait + i * 0.9 + (side > 0 ? 0 : Math.PI)) * stepStrength;
        const kneeX = ox + size * 0.12 + stride * size * 0.16;
        const kneeY = side * (size * (0.28 + load * 0.04)) - Math.abs(stride) * size * 0.06;
        const footX = ox + size * 0.32 + stride * size * strideScale;
        const footY = side * (size * 0.7) + Math.max(0, stride) * size * 0.08;
        ctx.beginPath();
        ctx.moveTo(ox, side * size * 0.1);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(footX, footY);
        ctx.stroke();
      }
    }
  }else if(moveKey === 'fins'){
    for(let side = -1; side <= 1; side += 2){
      ctx.beginPath();
      ctx.moveTo(-size * 0.35, 0);
      ctx.quadraticCurveTo(-size * 0.05, side * (size * 0.7 + Math.sin(gait * 1.5) * size * 0.18), size * 0.55, side * size * 0.15);
      ctx.stroke();
    }
  }else if(moveKey === 'tendrils'){
    for(let side = -1; side <= 1; side += 2){
      for(let i = 0; i < 3; i++){
        const ox = -size * 0.4 + i * size * 0.38;
        ctx.beginPath();
        ctx.moveTo(ox, side * size * 0.05);
        ctx.quadraticCurveTo(ox + size * 0.2, side * size * 0.55 + Math.sin(gait * 1.8 + i) * size * 0.2, ox + size * 0.35, side * size * 0.85);
        ctx.stroke();
      }
    }
  }else if(moveKey === 'segmented'){
    for(let i = -2; i <= 2; i++){
      ctx.beginPath();
      ctx.moveTo(i * size * 0.24, 0);
      ctx.lineTo(i * size * 0.24 + Math.sin(gait * 1.8 + i) * size * 0.18, size * 0.78 * (i % 2 ? 1 : -1));
      ctx.stroke();
    }
  }
}
function drawGrasp(graspKey, size, phase, color){
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.12);
  if(graspKey === 'claws' || graspKey === 'prongs'){
    const len = graspKey === 'claws' ? size * 0.65 : size * 0.5;
    for(let side = -1; side <= 1; side += 2){
      ctx.beginPath();
      ctx.moveTo(size * 0.55, side * size * 0.16);
      ctx.lineTo(size * 0.8, side * size * 0.18 + Math.sin(phase + side) * size * 0.08);
      ctx.lineTo(size * 0.9, side * (size * 0.26 + len * 0.26));
      ctx.stroke();
    }
  }else if(graspKey === 'tenders'){
    for(let side = -1; side <= 1; side += 2){
      ctx.beginPath();
      ctx.moveTo(size * 0.46, side * size * 0.12);
      ctx.quadraticCurveTo(size * 0.82, side * size * 0.08 + Math.sin(phase * 1.6) * size * 0.14, size * 1.02, side * size * 0.34);
      ctx.stroke();
    }
  }else if(graspKey === 'scoop'){
    ctx.beginPath();
    ctx.moveTo(size * 0.4, -size * 0.12);
    ctx.quadraticCurveTo(size * 0.9, 0, size * 0.4, size * 0.12);
    ctx.stroke();
  }else if(graspKey === 'jaws'){
    ctx.beginPath();
    ctx.moveTo(size * 0.28, -size * 0.08);
    ctx.lineTo(size * 0.95, -size * 0.28);
    ctx.lineTo(size * 0.75, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.28, size * 0.08);
    ctx.lineTo(size * 0.95, size * 0.28);
    ctx.lineTo(size * 0.75, 0);
    ctx.closePath();
    ctx.fill();
  }
}
function drawUtility(utilityKey, shellKey, size, phase, fill, stroke){
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  if(utilityKey === 'pouch'){
    ctx.beginPath();
    ctx.ellipse(-size * 0.18, size * 0.38, size * 0.32, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }else if(utilityKey === 'shield'){
    ctx.beginPath();
    ctx.moveTo(size * 0.3, -size * 0.4);
    ctx.lineTo(size * 0.88, 0);
    ctx.lineTo(size * 0.3, size * 0.4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }else if(utilityKey === 'spike'){
    for(let i = -1; i <= 1; i++){
      ctx.beginPath();
      ctx.moveTo(-size * 0.1 + i * size * 0.24, -size * 0.55);
      ctx.lineTo(i * size * 0.18, -size * 0.95);
      ctx.lineTo(size * 0.12 + i * size * 0.22, -size * 0.56);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }else if(utilityKey === 'nester'){
    ctx.beginPath();
    ctx.arc(-size * 0.55, 0, size * 0.24 + Math.sin(phase * 1.5) * size * 0.04, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }else if(utilityKey === 'harness'){
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, -size * 0.42);
    ctx.lineTo(size * 0.4, -size * 0.22);
    ctx.lineTo(size * 0.42, size * 0.22);
    ctx.lineTo(-size * 0.5, size * 0.42);
    ctx.stroke();
  }
  if(shellKey === 'plates'){
    for(let i = -1; i <= 1; i += 2){
      ctx.beginPath();
      ctx.moveTo(-size * 0.45, i * size * 0.38);
      ctx.lineTo(0, i * size * 0.56);
      ctx.lineTo(size * 0.45, i * size * 0.38);
      ctx.stroke();
    }
  }else if(shellKey === 'frill'){
    for(let i = 0; i < 5; i++){
      const a = -Math.PI * 0.72 + (i / 4) * Math.PI * 1.44;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.9, Math.sin(a) * size * 0.78);
      ctx.lineTo(Math.cos(a) * size * 1.1, Math.sin(a) * size * 1.0);
      ctx.stroke();
    }
  }else if(shellKey === 'ring'){
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.02, -Math.PI * 0.8, Math.PI * 0.8);
    ctx.stroke();
  }else if(shellKey === 'hood'){
    ctx.beginPath();
    ctx.arc(-size * 0.08, 0, size * 0.96, Math.PI * 0.86, -Math.PI * 0.86, true);
    ctx.stroke();
  }
}
function drawSigilMark(kind, x, y, size, color){
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  if(kind === 'hearth'){
    ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
  }else if(kind === 'ancestor'){
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.85, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.85, 0);
    ctx.closePath();
  }else if(kind === 'safe-return'){
    ctx.moveTo(-size, 0);
    ctx.lineTo(0, -size * 0.8);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size * 0.8);
    ctx.closePath();
  }else if(kind === 'split-path'){
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    ctx.moveTo(0, 0);
    ctx.lineTo(-size * 0.8, size * 0.8);
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.8, size * 0.8);
  }else if(kind === 'rival-fire'){
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.4, -size * 0.2);
    ctx.lineTo(size * 0.2, size);
    ctx.lineTo(-size * 0.4, size * 0.1);
    ctx.closePath();
  }else{
    ctx.moveTo(-size, -size);
    ctx.lineTo(size, size);
    ctx.moveTo(size, -size);
    ctx.lineTo(-size, size);
  }

  kind === 'split-path' ? ctx.stroke() : ctx.stroke();
  ctx.restore();
}
function drawPhenotypeOverlay(lineage, tribe, size, phase){
  const phenotype = lineage.phenotype;
  const glowHue = tribe ? tribe.palette.glowHue : state.palette.baseHue + 45;
  const patternColor = hsl(glowHue + phenotype.echoHue, 76, 74, 0.6);

  ctx.save();

  if(phenotype.pattern === 'bands'){
    for(let i = -1; i <= 1; i++){
      ctx.strokeStyle = patternColor;
      ctx.beginPath();
      ctx.moveTo(-size * 0.65, i * size * 0.22);
      ctx.lineTo(size * 0.65, i * size * 0.22);
      ctx.stroke();
    }
  }else if(phenotype.pattern === 'eyes'){
    ctx.strokeStyle = patternColor;
    ctx.beginPath();
    ctx.ellipse(-size * 0.18, 0, size * 0.16, size * 0.08, 0, 0, Math.PI * 2);
    ctx.ellipse(size * 0.18, 0, size * 0.16, size * 0.08, 0, 0, Math.PI * 2);
    ctx.stroke();
  }else if(phenotype.pattern === 'mesh'){
    ctx.strokeStyle = patternColor;
    ctx.beginPath();
    ctx.moveTo(-size * 0.45, -size * 0.45);
    ctx.lineTo(size * 0.45, size * 0.45);
    ctx.moveTo(size * 0.45, -size * 0.45);
    ctx.lineTo(-size * 0.45, size * 0.45);
    ctx.stroke();
  }else if(phenotype.pattern === 'halo'){
    ctx.strokeStyle = patternColor;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.06, 0, Math.PI * 2);
    ctx.stroke();
  }else if(phenotype.pattern === 'fracture'){
    ctx.strokeStyle = patternColor;
    ctx.beginPath();
    ctx.moveTo(-size * 0.6, -size * 0.2);
    ctx.lineTo(-size * 0.1, 0);
    ctx.lineTo(size * 0.12, -size * 0.3);
    ctx.lineTo(size * 0.6, size * 0.22);
    ctx.stroke();
  }

  if(phenotype.ornament === 'spines'){
    for(let i = -1; i <= 1; i++){
      ctx.beginPath();
      ctx.moveTo(i * size * 0.18, -size * 0.65);
      ctx.lineTo(i * size * 0.2, -size * 1.02);
      ctx.strokeStyle = patternColor;
      ctx.stroke();
    }
  }else if(phenotype.ornament === 'frill'){
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.12, Math.PI * 0.7, Math.PI * 1.3);
    ctx.strokeStyle = patternColor;
    ctx.stroke();
  }else if(phenotype.ornament === 'streamers'){
    for(let i = -1; i <= 1; i++){
      ctx.beginPath();
      ctx.moveTo(-size * 0.55, i * size * 0.1);
      ctx.quadraticCurveTo(-size * 1.02, i * size * 0.3 + Math.sin(phase * 2 + i) * size * 0.2, -size * 1.25, i * size * 0.45);
      ctx.strokeStyle = patternColor;
      ctx.stroke();
    }
  }else if(phenotype.ornament === 'crest'){
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.95);
    ctx.lineTo(size * 0.2, -size * 0.55);
    ctx.lineTo(-size * 0.2, -size * 0.55);
    ctx.closePath();
    ctx.fillStyle = patternColor;
    ctx.fill();
  }else if(phenotype.ornament === 'dust'){
    for(let i = 0; i < 4; i++){
      ctx.beginPath();
      ctx.arc(
        Math.cos(phase + i * 1.4) * size * 1.1,
        Math.sin(phase + i * 1.4) * size * 1.1,
        size * 0.06,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = patternColor;
      ctx.fill();
    }
  }

  drawSigilMark(phenotype.glyph, 0, -size * 1.25, size * 0.18, patternColor);
  ctx.restore();
}
function drawCampLayoutOverlay(camp, sx, sy, radius){
  const tribe = getTribe(camp.tribeId);
  if(!tribe) return;

  const color = hsl(tribe.palette.secondaryHue, 70, 70, 0.24);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  if(tribe.shelterStyle.layout === 'ring'){
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }else if(tribe.shelterStyle.layout === 'fan'){
    for(let i = -2; i <= 2; i++){
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(camp.routeAngle + i * 0.28) * radius * 0.7, Math.sin(camp.routeAngle + i * 0.28) * radius * 0.7);
      ctx.stroke();
    }
  }else if(tribe.shelterStyle.layout === 'spine'){
    ctx.beginPath();
    ctx.moveTo(-radius * 0.6, 0);
    ctx.lineTo(radius * 0.6, 0);
    for(let i = -2; i <= 2; i++){
      ctx.moveTo(i * radius * 0.18, -radius * 0.18);
      ctx.lineTo(i * radius * 0.18, radius * 0.18);
    }
    ctx.stroke();
  }else if(tribe.shelterStyle.layout === 'cluster'){
    for(let i = 0; i < 4; i++){
      const a = (i / 4) * Math.PI * 2 + camp.routeAngle;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * radius * 0.35, Math.sin(a) * radius * 0.35, radius * 0.12, 0, Math.PI * 2);
      ctx.stroke();
    }
  }else if(tribe.shelterStyle.layout === 'ladder'){
    ctx.beginPath();
    ctx.moveTo(-radius * 0.5, -radius * 0.4);
    ctx.lineTo(-radius * 0.5, radius * 0.4);
    ctx.moveTo(radius * 0.5, -radius * 0.4);
    ctx.lineTo(radius * 0.5, radius * 0.4);
    for(let i = -1; i <= 1; i++){
      ctx.moveTo(-radius * 0.5, i * radius * 0.22);
      ctx.lineTo(radius * 0.5, i * radius * 0.22);
    }
    ctx.stroke();
  }

  drawSigilMark(tribe.shelterStyle.icon, 0, -radius * 0.82, radius * 0.12, hsl(tribe.palette.glowHue, 80, 78, 0.48));
  ctx.restore();
}

function drawCreature(cr){
  const lineage = getLineage(cr.lineageId);
  if(!lineage) return;
  const tribe = getTribe(cr.tribeId);

  const basePos = worldToScreen(cr.x, cr.y);
  const growth = cr.age < 120 ? lerp(0.42, 1.0, cr.age / 120) : 1.0;
  const size = cr.stats.radius * growth * camera.zoom;
  if(basePos.x < -size * 2 || basePos.y < -size * 2 || basePos.x > canvas.width / dpr + size * 2 || basePos.y > canvas.height / dpr + size * 2) return;

  const speed = Math.hypot(cr.vx, cr.vy);
  const gait = cr.gaitPhase ?? (state.time * 2 + cr.phase);
  const stepStrength = clamp(cr.stepStrength ?? clamp(speed / Math.max(1, cr.stats.speed), 0, 1.2), 0, 1.4);
  const load = cr.loadVisual || 0;
  const bob = Math.max(0, Math.sin(gait * 1.9)) * (cr.stats.radius * 0.12 + stepStrength * cr.stats.radius * 0.15);
  const bodyZ = bob + stepStrength * cr.stats.radius * 0.12 - load * cr.stats.radius * 0.08 + (cr.state === 'build' ? 0.2 : 0);
  const pos = worldToScreen(cr.x, cr.y, bodyZ);
  if(size < 2){
    drawGroundShadow(basePos.x, basePos.y + size * 0.38, Math.max(1.2, size * 1.1), Math.max(0.8, size * 0.42), 0.16);
    ctx.fillStyle = hsl(state.palette.baseHue + lineage.hueShift, 55, 68, 0.8);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, Math.max(1, size), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const camp = getCamp(cr.campId);
  const hue = mod((camp ? camp.culture.colorHue : state.palette.baseHue) + lineage.hueShift, 360);
  const attackFlash = cr.attackFlash || 0;
  const hitFlash = cr.hitFlash || 0;
  const fill = hsl(hue, 42 + (state.origin.contrast + 1) * 14, 48 + (cr.energy / 100) * 12, 0.94);
  const stroke = hsl(hue + 12, 42, 74, 0.95);
  const limb = hsl(hue - 10, 36, 78, 0.82);
  const screenAngle = worldAngleToScreen(cr.angle);
  const wob = Math.sin(state.time * state.motion.pulseRate + cr.phase) * state.motion.idleSway;
  drawGroundShadow(
    basePos.x,
    basePos.y + size * (0.42 + load * 0.04),
    size * (0.8 + load * 0.16),
    size * (0.26 + stepStrength * 0.06),
    0.17 + hitFlash * 0.08
  );
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(screenAngle + wob * 0.12 + (cr.turnVisual || 0) * 0.08 - hitFlash * 0.16 * Math.sin(state.time * 20 + cr.phase));
  ctx.transform(1, 0, -(cr.turnVisual || 0) * 0.12, 1, 0, 0);
  ctx.translate(attackFlash * size * 0.18, 0);
  ctx.scale(1 + attackFlash * 0.14 + (cr.visualLean || 0) * 0.08, 0.86 - load * 0.08 - attackFlash * 0.06 + hitFlash * 0.08 + stepStrength * 0.04);

  if(cr.age < 120){
     const pulse = 0.5 + 0.5 * Math.sin(state.time * 6);
     ctx.shadowBlur = 8 * camera.zoom;
     ctx.shadowColor = alpha(stroke, 0.3 * pulse);
  }

  if(attackFlash > 0.02 || hitFlash > 0.02){
    ctx.shadowBlur = (attackFlash * 10 + hitFlash * 14) * clamp(camera.zoom, 0.65, 1.6);
    ctx.shadowColor = hitFlash > attackFlash ? `rgba(255,150,130,${0.75 * hitFlash})` : alpha(stroke, Math.min(0.8, 0.35 + attackFlash * 0.5));
  }

  if(cr.state === 'build' && camera.zoom > 1.1){
    ctx.strokeStyle = hsl(hue + 20, 76, 82, 0.4);
    ctx.lineWidth = Math.max(1, size * 0.1);
    ctx.beginPath();
    ctx.arc(size * 0.12, -size * 0.18, size * (0.46 + stepStrength * 0.1), -0.8, 0.35);
    ctx.stroke();
  }

  drawMoveLimbs(lineage.modules.move, size, gait, limb, { step:stepStrength, load });
  drawUtility(lineage.modules.utility, lineage.modules.shell, size, state.time + cr.phase, alpha(fill,0.75), alpha(stroke,0.6));
  drawCore(lineage.modules.core, size, fill, stroke);
  drawGrasp(lineage.modules.grasp, size, state.time + cr.phase, stroke);
  if(tribe && lineage.phenotype){
    drawPhenotypeOverlay(lineage, tribe, size, state.time + cr.phase);
  }

  if(attackFlash > 0.04){
    ctx.strokeStyle = hsl(hue + 22, 82, 78, 0.74 * attackFlash);
    ctx.lineWidth = Math.max(1.2, size * 0.14);
    ctx.beginPath();
    ctx.arc(size * 0.22, 0, size * (0.62 + attackFlash * 0.25), -0.7, 0.7);
    ctx.stroke();
  }
  if(hitFlash > 0.04){
    ctx.strokeStyle = `rgba(255,168,148,${0.62 * hitFlash})`;
    ctx.lineWidth = Math.max(1, size * 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, size * (0.96 + hitFlash * 0.35), 0, Math.PI * 2);
    ctx.stroke();
  }

  if(cr.carriedId){
    const frag = getFragment(cr.carriedId);
    if(frag){
      drawFragmentShape(frag, -size * (0.85 + load * 0.32), size * 0.18, camera.zoom * 0.72, hsl(hue + 24, 30, 66, 0.74));
    }
  }

  if((cr.mind.symbolic.tokens.hearth || 0) > 0.7 || (cr.mind.symbolic.tokens.ancestor || 0) > 0.7){
    drawSigilMark(
      (cr.mind.symbolic.tokens.hearth || 0) > (cr.mind.symbolic.tokens.ancestor || 0) ? 'hearth' : 'ancestor',
      0,
      -size * 1.6,
      size * 0.18,
      hsl(tribe ? tribe.palette.glowHue : hue + 60, 86, 78, 0.6)
    );
  }

  if(ui.selected && ui.selected.type === 'creature' && ui.selected.id === cr.id){
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.18, size * 1.45, size * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if(cr.age > cr.lifespan * 0.82){
    ctx.strokeStyle = 'rgba(255,215,100,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.18, size * 0.78, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if(camera.zoom > 1.3){
    ctx.fillStyle = 'rgba(230,240,255,0.85)';
    ctx.beginPath();
    ctx.arc(size * 0.15, -size * 0.08, Math.max(1.2, size * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if(camera.zoom > 2.2){
    ctx.fillStyle = 'rgba(220,236,248,0.82)';
    ctx.font = '11px Inter, sans-serif';
    const elderTag = cr.age > cr.lifespan * 0.82 ? ' (Elder)' : '';
    ctx.fillText(cr.role + elderTag, pos.x + size * 1.05, pos.y - size * 0.95);
  }
}
function drawRemnantEntity(remnant){
  const basePos = worldToScreen(remnant.x, remnant.y);
  const fade = 1 - remnant.age / remnant.ttl;
  const size = Math.max(2, remnant.size * camera.zoom * (0.95 - (1 - fade) * 0.18));
  if(basePos.x < -size * 2 || basePos.y < -size * 2 || basePos.x > canvas.width / dpr + size * 2 || basePos.y > canvas.height / dpr + size * 2) return;

  const pos = worldToScreen(remnant.x, remnant.y, 0.6 + fade * 0.5);
  drawGroundShadow(basePos.x, basePos.y + size * 0.3, size * 0.88, size * 0.28, 0.12 * fade);

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(worldAngleToScreen(remnant.angle) + (1 - fade) * 0.18);
  ctx.scale(1 + (1 - fade) * 0.35, Math.max(0.22, fade * 0.66));
  ctx.fillStyle = hsl(remnant.hue - 8, 24, 24, 0.38 * fade);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 1.02, size * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = hsl(remnant.hue + 10, 42, 74, 0.18 * fade);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y, size * (1.08 + (1 - fade) * 0.25), size * 0.44, 0, 0, Math.PI * 2);
  ctx.stroke();
}
function shouldRenderFragmentEntity(frag){
  if(frag.state !== 'stored') return true;
  if(ui.selected?.type === 'fragment' && ui.selected.id === frag.id) return true;
  const camp = getCamp(frag.siteId);
  if(!camp) return true;
  if(camera.zoom > 1.65) return true;
  const keep = camera.zoom > 1.12 ? 8 : 4;
  const stride = Math.max(1, Math.ceil((camp.storedCount || 0) / keep));
  return stride <= 1 || frag.id % stride === 0;
}
function renderSceneActors(){
  const entries = [];
  for(const deposit of state.deposits || []){
    if((deposit.quantity || 0) <= 0.08) continue;
    entries.push({ type:'deposit', depth:worldToScreen(deposit.x, deposit.y).y, bias:-2, ref:deposit });
  }
  for(const frag of state.fragments){
    if(frag.state === 'carried' || !shouldRenderFragmentEntity(frag)) continue;
    entries.push({ type:'fragment', depth:worldToScreen(frag.x, frag.y).y, bias:frag.state === 'placed' ? 0 : -1, ref:frag });
  }
  for(const remnant of state.remnants || []){
    entries.push({ type:'remnant', depth:worldToScreen(remnant.x, remnant.y).y, bias:1, ref:remnant });
  }
  for(const cr of state.creatures){
    entries.push({ type:'creature', depth:worldToScreen(cr.x, cr.y).y, bias:2, ref:cr });
  }
  entries.sort((a, b) => a.depth - b.depth || a.bias - b.bias);
  for(const entry of entries){
    if(entry.type === 'deposit') drawDepositEntity(entry.ref);
    else if(entry.type === 'fragment') drawFragmentEntity(entry.ref);
    else if(entry.type === 'remnant') drawRemnantEntity(entry.ref);
    else drawCreature(entry.ref);
  }
}
function renderCombatFx(){
  for(const fx of state.combatFx || []){
    const pos = worldToScreen(fx.x, fx.y);
    const life = 1 - fx.age / fx.ttl;
    const radius = Math.max(4, fx.size * camera.zoom * (7 + (1 - life) * 12));
    if(pos.x < -radius * 2 || pos.y < -radius * 2 || pos.x > canvas.width / dpr + radius * 2 || pos.y > canvas.height / dpr + radius * 2) continue;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(fx.rot + (1 - life) * 0.5);

    if(fx.kind === 'hit'){
      ctx.strokeStyle = hsl(fx.hue + 18, 84, 78, 0.74 * life);
      ctx.lineWidth = 1.4 + life * 1.6;
      for(let i = 0; i < 3; i++){
        const ang = -0.45 + i * 0.45;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * radius * 0.2, Math.sin(ang) * radius * 0.2);
        ctx.lineTo(Math.cos(ang) * radius, Math.sin(ang) * radius);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(255,176,150,${0.42 * life})`;
      ctx.beginPath();
      ctx.arc(0, 0, radius * (0.6 + (1 - life) * 0.25), 0, Math.PI * 2);
      ctx.stroke();
    }else if(fx.kind === 'bond'){
      ctx.strokeStyle = hsl(fx.hue + 45, 90, 80, 0.8 * life);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * (0.4 + (1 - life) * 0.8), 0, Math.PI * 2);
      ctx.stroke();
      drawSigilMark('hearth', 0, 0, radius * 0.4, alpha(ctx.strokeStyle, 0.6));
    }else{
      ctx.strokeStyle = hsl(fx.hue - 8, 66, 72, 0.52 * life);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * (0.65 + (1 - life) * 0.6), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,146,126,${0.76 * life})`;
      for(let i = 0; i < 5; i++){
        const ang = i * (Math.PI * 2 / 5);
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * radius * 0.35, Math.sin(ang) * radius * 0.35);
        ctx.lineTo(Math.cos(ang) * radius * 1.1, Math.sin(ang) * radius * 1.1);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
function renderCampSites(){
  const focusedCampId = focusedCampIdForCutaway();
  for(const camp of state.camps){
    const pos = worldToScreen(camp.x, camp.y);
    if(pos.x < -120 || pos.y < -120 || pos.x > canvas.width / dpr + 120 || pos.y > canvas.height / dpr + 120) continue;
    const r = camp.homeRadius * camera.zoom;
    const lotW = clamp(r * 0.72, 28, 108);
    const lotH = clamp(r * 0.34, 14, 56);
    const lotHeight = clamp(4 + camp.level * 2.5 + camp.placedCount * 0.08, 4, 16);
    const hue = camp.culture.colorHue;
    const campFocused = focusedCampId === camp.id && camera.zoom > 1.3;
    drawGroundShadow(pos.x, pos.y + lotH * 0.8, lotW * 1.1, lotH * 0.85, 0.12);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    drawIsoPrismLocal(
      lotW,
      lotH,
      lotHeight,
      hsl(hue, 42, 30, 0.92),
      hsl(hue - 8, 34, 20, 0.88),
      hsl(hue - 14, 30, 16, 0.9),
      hsl(hue + 14, 50, 68, 0.16)
    );
    const hallW = Math.max(6, lotW * 0.14);
    const hallH = Math.max(4, lotH * 0.14);
    const hallHeight = lotHeight + 8 + camp.level * 2;
    drawIsoPrismLocal(
      hallW,
      hallH,
      hallHeight,
      hsl(hue + 10, 58, 62, campFocused ? 0.26 : 0.95),
      hsl(hue + 2, 46, 42, campFocused ? 0.2 : 0.92),
      hsl(hue - 6, 44, 34, campFocused ? 0.2 : 0.92),
      hsl(hue + 22, 72, 84, campFocused ? 0.14 : 0.28),
      campFocused ? { hideEast:true, hideSouth:true } : null
    );
    drawChunkyRoofLocal(
      hallW * 1.26,
      hallH * 1.2,
      hallHeight,
      7 + camp.level * 1.5,
      hsl(hue + 24, 64, 72, campFocused ? 0.22 : 0.94),
      hsl(hue + 10, 46, 48, campFocused ? 0.16 : 0.88),
      hsl(hue + 2, 42, 40, campFocused ? 0.14 : 0.9),
      hsl(hue + 32, 72, 84, campFocused ? 0.12 : 0.26),
      campFocused ? { hideEast:true, hideSouth:true } : null
    );
    ctx.restore();

    if(camp.activeProject){
      const project = camp.activeProject;
      const pp = worldToScreen(project.x, project.y, project.kind === 'berm' ? 2 : project.kind === 'shrine' ? 3 : 1);
      const progress = clamp(project.progress / Math.max(1, project.target), 0, 1);
      const tint =
        project.kind === 'quarry' ? hsl(hue + 42, 70, 72, 0.8) :
        project.kind === 'road' ? hsl(hue + 18, 64, 76, 0.76) :
        project.kind === 'berm' ? hsl(hue - 8, 50, 70, 0.76) :
        project.kind === 'ramp' ? hsl(hue + 8, 56, 74, 0.74) :
        hsl(hue + 64, 76, 78, 0.82);

      ctx.strokeStyle = tint;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y - lotHeight * 0.4);
      ctx.lineTo(pp.x, pp.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = alpha(tint, 0.18);
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, Math.max(7, camera.zoom * 7), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = alpha(tint, 0.7);
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, Math.max(7, camera.zoom * 7), -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * progress);
      ctx.stroke();

      if(project.kind === 'shrine'){
        drawSigilMark('ancestor', pp.x, pp.y - 1, Math.max(4, camera.zoom * 3.8), alpha(tint, 0.8));
      }else if(project.kind === 'quarry'){
        ctx.strokeStyle = alpha(tint, 0.8);
        ctx.beginPath();
        ctx.moveTo(pp.x - 6, pp.y + 2);
        ctx.lineTo(pp.x, pp.y - 5);
        ctx.lineTo(pp.x + 6, pp.y + 2);
        ctx.stroke();
      }else{
        ctx.fillStyle = alpha(tint, 0.8);
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, Math.max(2, camera.zoom * 1.8), 0, Math.PI * 2);
        ctx.fill();
      }

      if(camera.zoom > 0.72){
        ctx.fillStyle = 'rgba(236,244,252,0.84)';
        ctx.font = `${clamp(10, 10, 11 + camera.zoom)}px Inter, sans-serif`;
        ctx.fillText(`${projectLabel(project.kind)} ${round(progress * 100)}%`, pp.x + 10, pp.y - 10);
      }
    }

    if(camera.zoom > 0.4){
      ctx.strokeStyle = hsl(hue, 60, 60, 0.12);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(
        pos.x,
        pos.y,
        camp.territoryRadius * camera.zoom * ISO_X_SCALE,
        camp.territoryRadius * camera.zoom * ISO_Y_SCALE,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    if(camera.zoom > 0.65){
      ctx.strokeStyle = hsl(hue, 62, 58, 0.16);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, r * 0.8 * ISO_X_SCALE, r * 0.8 * ISO_Y_SCALE, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if(camera.zoom > 1.0 && camp.householdNodes.length){
      for(const house of camp.householdNodes.slice(0, 8)){
        const hp = worldToScreen(house.x, house.y, 2);
        const hutW = 3 + house.count * 0.42 + house.young * 0.18;
        const hutH = Math.max(2, hutW * 0.44);
        const frontness = (house.x + house.y) - (camp.x + camp.y);
        const hutOpen = campFocused && frontness > camp.homeRadius * 0.04;
        drawGroundShadow(hp.x, hp.y + hutH * 1.3, hutW * 1.4, hutH * 0.9, 0.1);
        ctx.save();
        ctx.translate(hp.x, hp.y);
        drawIsoPrismLocal(
          hutW,
          hutH,
          5 + house.count * 0.3,
          hsl(hue + 14, 54, 66, hutOpen ? 0.2 : 0.78),
          hsl(hue + 4, 42, 40, hutOpen ? 0.16 : 0.74),
          hsl(hue - 4, 40, 34, hutOpen ? 0.16 : 0.74),
          null,
          hutOpen ? { hideEast:true, hideSouth:true } : null
        );
        drawChunkyRoofLocal(
          hutW * 1.18,
          hutH * 1.06,
          5 + house.count * 0.3,
          3.8,
          hsl(hue + 26, 68, 74, hutOpen ? 0.2 : 0.88),
          hsl(hue + 12, 44, 44, hutOpen ? 0.14 : 0.8),
          hsl(hue + 2, 38, 36, hutOpen ? 0.14 : 0.82),
          null,
          hutOpen ? { hideEast:true, hideSouth:true } : null
        );
        ctx.restore();
      }
    }
    if(camera.zoom > 1.4 && camp.level > 0){
      const tip = worldToScreen(
        camp.x + Math.cos(camp.routeAngle) * camp.homeRadius * 0.9,
        camp.y + Math.sin(camp.routeAngle) * camp.homeRadius * 0.9,
        2
      );
      ctx.strokeStyle = hsl(camp.culture.colorHue - 12, 54, 72, 0.26);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      }
      if(camera.zoom > 0.9){
        drawCampLayoutOverlay(camp, pos.x, pos.y - lotHeight, Math.max(10, r * 0.38));
      }
      if(camera.zoom > 0.45){
        ctx.fillStyle = 'rgba(235,245,252,0.92)';
        ctx.font = `${clamp(10, 10, 12 + camera.zoom)}px Inter, sans-serif`;
      ctx.fillText(`${camp.name} - ${KIND_NAMES[camp.level]}`, pos.x + lotW * 0.72, pos.y - lotHeight - lotH * 1.2);
    }
  }
}

function renderMigrationFlows(){
  if(!overlayInputs.regional.checked) return;
  const now = state.time;
  for(const flow of state.migrationFlows){
    const age = now - flow.t;
    if(age > 140) continue;
    const a = worldToScreen(flow.x1, flow.y1);
    const b = worldToScreen(flow.x2, flow.y2);
    const alphaFlow = clamp(0.45 - age / 180, 0, 0.45);
    ctx.strokeStyle = hsl(state.palette.baseHue + 45, 82, 72, alphaFlow);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - Math.cos(ang - 0.35) * 10, b.y - Math.sin(ang - 0.35) * 10);
    ctx.lineTo(b.x - Math.cos(ang + 0.35) * 10, b.y - Math.sin(ang + 0.35) * 10);
    ctx.closePath();
    ctx.fillStyle = hsl(state.palette.baseHue + 45, 82, 72, alphaFlow);
    ctx.fill();
  }
}
function renderEvents(){
  if(!overlayInputs.events.checked) return;
  const now = state.time;
  for(const ev of state.events){
    const age = now - ev.time;
    if(age > 90) continue;
    const pos = worldToScreen(ev.x, ev.y);
    const alphaEv = clamp(0.95 - age / 90, 0, 0.95);
    ctx.fillStyle = EVENT_COLORS[ev.type] || `rgba(255,255,255,${alphaEv})`;
    ctx.globalAlpha = alphaEv;
    ctx.beginPath();
    if(ev.type === 'death'){
      ctx.moveTo(pos.x, pos.y - 6);
      ctx.lineTo(pos.x + 6, pos.y + 6);
      ctx.lineTo(pos.x - 6, pos.y + 6);
      ctx.closePath();
    }else if(ev.type === 'migration'){
      ctx.rect(pos.x - 5, pos.y - 5, 10, 10);
    }else if(ev.type === 'era'){
      ctx.moveTo(pos.x, pos.y - 7);
      ctx.lineTo(pos.x + 7, pos.y);
      ctx.lineTo(pos.x, pos.y + 7);
      ctx.lineTo(pos.x - 7, pos.y);
      ctx.closePath();
    }else if(ev.type === 'nudge'){
      ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
    }else{
      ctx.arc(pos.x, pos.y, 5.5, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
function renderSelection(){
  if(!ui.selected) return;
  let obj = null;
  if(ui.selected.type === 'camp') obj = getCamp(ui.selected.id);
  if(ui.selected.type === 'creature') obj = getCreature(ui.selected.id);
  if(ui.selected.type === 'fragment') obj = getFragment(ui.selected.id);
  if(ui.selected.type === 'deposit') obj = getDeposit(ui.selected.id);
  if(!obj) return;
  const x = obj.x ?? obj.anchorX;
  const y = obj.y ?? obj.anchorY;
  const pos = worldToScreen(x, y);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(
    pos.x,
    pos.y,
    ui.selected.type === 'camp'
      ? 18
      : ui.selected.type === 'creature'
        ? Math.max(12, obj.stats.radius * camera.zoom * 1.6)
        : ui.selected.type === 'deposit'
          ? Math.max(12, obj.radius * camera.zoom * 0.9)
          : Math.max(10, obj.size * camera.zoom * 1.5),
    0,
    Math.PI * 2
  );
  ctx.stroke();

  if(ui.selected.type === 'creature'){
    const camp = getCamp(obj.campId);
    if(camp){
      const c = worldToScreen(camp.x, camp.y);
      ctx.strokeStyle = 'rgba(190,225,255,0.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    }
    if(camera.zoom > 3.2){
      renderMicroCallout(obj);
    }
  }
}

function renderRitualMarkers(){
  for(const camp of state.camps){
    if(!camp.ritualMarkers?.length) continue;
    const tribe = getTribe(camp.tribeId);

    for(const marker of camp.ritualMarkers){
      const pos = worldToScreen(marker.x, marker.y);
      if(pos.x < -30 || pos.y < -30 || pos.x > canvas.width / dpr + 30 || pos.y > canvas.height / dpr + 30) continue;

      drawSigilMark(
        marker.token,
        pos.x,
        pos.y,
        Math.max(3, camera.zoom * 3.5),
        hsl(tribe ? tribe.palette.glowHue : state.palette.baseHue + 50, 82, 76, 0.5 + marker.strength * 0.2)
      );
    }
  }
}
function renderMicroCallout(cr){
  const pos = worldToScreen(cr.x, cr.y);
  const cardX = pos.x + 28;
  const cardY = pos.y - 18;
  const w = 200, h = 122;
  ctx.fillStyle = 'rgba(8,12,18,0.82)';
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  roundRect(ctx, cardX, cardY, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(227,238,247,0.95)';
  ctx.font = '12px Inter, sans-serif';
  const elderTag = cr.age > cr.lifespan * 0.82 ? ' [Elder]' : '';
  ctx.fillText(`${lineageLabel(cr)} Â· ${cr.role}${elderTag}`, cardX + 10, cardY + 16);
  ctx.font = '11px Inter, sans-serif';
  ctx.fillStyle = 'rgba(158,178,197,0.9)';
  ctx.fillText(`state: ${cr.state}`, cardX + 10, cardY + 34);
  ctx.fillText(`reason: ${cr.reason}`, cardX + 10, cardY + 50);
  const lin = getLineage(cr.lineageId);
  const moduleText = lin ? moduleName(lin.modules) : 'modules';
  wrapText(moduleText, cardX + 10, cardY + 68, w - 20, 12, 'rgba(210,224,234,0.88)');
  drawMiniBar(cardX + 10, cardY + 88, w - 20, 6, cr.energy / 100, 'rgba(126,210,255,0.9)');
  drawMiniBar(cardX + 10, cardY + 100, w - 20, 6, cr.hp / 100, 'rgba(255,152,138,0.9)');
  drawMiniBar(cardX + 10, cardY + 112, w - 20, 6, clamp(cr.anchorAffinity / 100, 0, 1), 'rgba(158,255,184,0.9)');
}
function drawMiniBar(x,y,w,h,v,color){
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, x, y, w, h, h * 0.5);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w * clamp(v,0,1), h, h * 0.5);
  ctx.fill();
}
function roundRect(ctx,x,y,w,h,r){
  const rr = Math.min(r, w*0.5, h*0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function wrapText(text, x, y, maxWidth, lineHeight, color){
  ctx.fillStyle = color;
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for(const word of words){
    const test = line ? `${line} ${word}` : word;
    if(ctx.measureText(test).width > maxWidth && line){
      ctx.fillText(line, x, yy);
      yy += lineHeight;
      line = word;
    }else{
      line = test;
    }
  }
  if(line) ctx.fillText(line, x, yy);
}
function campStyleDescriptor(camp){
  const mat = state.materials[camp.dominantMaterial];
  const posture = camp.culture.defense > 0.64 ? 'defensive' : camp.culture.migrate > 0.62 ? 'migratory' : camp.domesticity > 0.55 ? 'hearth-bound' : 'opportunistic';
  const fabric = mat.utility === 'adhesive' ? 'laminated' : mat.utility === 'load-bearing' ? 'stacked' : mat.utility === 'flexible' ? 'woven' : mat.utility === 'insulating' ? 'nested' : 'layered';
  const rhythm = state.motion.staccato > 0.35 ? 'staccato' : state.motion.wobble > 0.18 ? 'pulsed' : 'steady';
  return `${posture} ${fabric} ${mat.structure} forms with ${rhythm} routes`;
}
function campTraditions(camp){
  const out = [];
  if(camp.culture.defense > 0.62) out.push('guarded edges');
  if(camp.domesticity > 0.54) out.push('shared hearth stores');
  if(camp.culture.migrate > 0.58) out.push('seasonal splintering');
  if(camp.lineageMix > 2) out.push('mixed lineages');
  if(camp.householdCount > 2) out.push('clustered households');
  if(!out.length) out.push('light nomad memory');
  return out.slice(0, 3);
}
