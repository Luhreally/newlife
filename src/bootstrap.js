const LEGACY_ENTRY = new URL("../one_file_world.html", import.meta.url);
const SCRIPT_MARKER = "(() => {";
const STORAGE_KEY = "newlife.launch-config.v2";

const DEFAULT_CONFIG = {
  device: "laptop",
  performance: "balanced",
  worldScale: "standard",
  chrome: "full",
  seed: "woven-ember-4701",
  startPaused: false,
};

const bootShell = document.getElementById("bootShell");
const bootMessage = document.getElementById("bootMessage");
const launchForm = document.getElementById("launchForm");
const restoreDefaultsBtn = document.getElementById("restoreDefaultsBtn");

function setBootStatus(message, isError = false) {
  if (!bootShell || !bootMessage) return;
  bootShell.classList.toggle("bootError", isError);
  bootMessage.innerHTML = message;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundEven(value) {
  const rounded = Math.max(8, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded + 1;
}

function applyFormConfig(config) {
  if (!launchForm) return;
  const seed = launchForm.querySelector('input[name="seed"]');
  const startPaused = launchForm.querySelector('input[name="startPaused"]');
  const device = launchForm.querySelector(`input[name="device"][value="${config.device}"]`);
  const performance = launchForm.querySelector('select[name="performance"]');
  const worldScale = launchForm.querySelector('select[name="worldScale"]');
  const chrome = launchForm.querySelector('select[name="chrome"]');

  if (seed) seed.value = config.seed;
  if (startPaused) startPaused.checked = !!config.startPaused;
  if (device) device.checked = true;
  if (performance) performance.value = config.performance;
  if (worldScale) worldScale.value = config.worldScale;
  if (chrome) chrome.value = config.chrome;
}

function readFormConfig() {
  const formData = new FormData(launchForm);
  return normalizeConfig({
    device: formData.get("device"),
    performance: formData.get("performance"),
    worldScale: formData.get("worldScale"),
    chrome: formData.get("chrome"),
    seed: formData.get("seed"),
    startPaused: formData.get("startPaused") === "on",
  });
}

function normalizeConfig(raw = {}) {
  const device = raw.device === "mobile" ? "mobile" : "laptop";
  const performance = ["rich", "balanced", "saver"].includes(raw.performance) ? raw.performance : "balanced";
  const worldScale = raw.worldScale === "compact" ? "compact" : "standard";
  const defaultChrome = device === "mobile" ? "compact" : "full";
  const chrome = ["full", "compact", "minimal"].includes(raw.chrome) ? raw.chrome : defaultChrome;
  const seed = typeof raw.seed === "string" && raw.seed.trim() ? raw.seed.trim() : DEFAULT_CONFIG.seed;
  const startPaused = !!raw.startPaused;
  return { device, performance, worldScale, chrome, seed, startPaused };
}

function loadSavedConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_CONFIG;
    return normalizeConfig(JSON.parse(saved));
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage failures; they are non-fatal for launch.
  }
}

function queryConfig() {
  const params = new URLSearchParams(window.location.search);
  if (!params.size) return null;
  return normalizeConfig({
    device: params.get("device"),
    performance: params.get("performance"),
    worldScale: params.get("world"),
    chrome: params.get("chrome"),
    seed: params.get("seed"),
    startPaused: params.get("paused") === "1",
  });
}

function shouldAutoLaunch() {
  const params = new URLSearchParams(window.location.search);
  return params.get("autostart") === "1";
}

function deriveRuntimeConfig(config) {
  const base = config.device === "mobile"
    ? {
        WORLD_W: 1600,
        WORLD_H: 1040,
        GRID_W: 80,
        GRID_H: 52,
        MAX_CREATURES: 72,
        INITIAL_CREATURES: 48,
        MAX_FRAGMENTS: 90,
        INITIAL_FRAGMENTS: 24,
        MAX_LOOSE_FRAGMENTS: 18,
        DEPOSIT_COUNT: 40,
        MAX_SUBSTEPS_NORMAL: 10,
        MAX_SUBSTEPS_TURBO: 96,
        MAX_PROTO_CELLS: 36,
        MATERIAL_SEED_COUNT: 28,
        CREATURE_EMERGENCE_TARGET: 48,
        MAX_REMNANTS: 72,
        MAX_COMBAT_FX: 96,
        MAX_TERRAIN_EDITS: 160,
        FORECAST_SAMPLES: 24,
        maxDpr: 1.45,
      }
    : {
        WORLD_W: 1920,
        WORLD_H: 1280,
        GRID_W: 96,
        GRID_H: 64,
        MAX_CREATURES: 104,
        INITIAL_CREATURES: 72,
        MAX_FRAGMENTS: 144,
        INITIAL_FRAGMENTS: 40,
        MAX_LOOSE_FRAGMENTS: 36,
        DEPOSIT_COUNT: 54,
        MAX_SUBSTEPS_NORMAL: 16,
        MAX_SUBSTEPS_TURBO: 220,
        MAX_PROTO_CELLS: 48,
        MATERIAL_SEED_COUNT: 36,
        CREATURE_EMERGENCE_TARGET: 72,
        MAX_REMNANTS: 120,
        MAX_COMBAT_FX: 160,
        MAX_TERRAIN_EDITS: 240,
        FORECAST_SAMPLES: 48,
        maxDpr: 2,
      };

  const performanceTuning = {
    rich: { countFactor: 1, dprFactor: 1, substepFactor: 1, fxFactor: 1, depositFactor: 1, protoFactor: 1, seedFactor: 1 },
    balanced: { countFactor: 0.88, dprFactor: 0.9, substepFactor: 0.82, fxFactor: 0.82, depositFactor: 0.9, protoFactor: 0.88, seedFactor: 0.88 },
    saver: { countFactor: 0.72, dprFactor: 0.74, substepFactor: 0.64, fxFactor: 0.62, depositFactor: 0.72, protoFactor: 0.74, seedFactor: 0.72 },
  }[config.performance];

  const scaleFactor = config.worldScale === "compact" ? 0.84 : 1;
  const entityScale = scaleFactor * performanceTuning.countFactor;

  const runtime = {
    WORLD_W: Math.round(base.WORLD_W * scaleFactor),
    WORLD_H: Math.round(base.WORLD_H * scaleFactor),
    GRID_W: roundEven(base.GRID_W * scaleFactor),
    GRID_H: roundEven(base.GRID_H * scaleFactor),
    MAX_CREATURES: Math.max(28, Math.round(base.MAX_CREATURES * entityScale)),
    INITIAL_CREATURES: Math.max(20, Math.round(base.INITIAL_CREATURES * entityScale)),
    MAX_FRAGMENTS: Math.max(44, Math.round(base.MAX_FRAGMENTS * entityScale)),
    INITIAL_FRAGMENTS: Math.max(12, Math.round(base.INITIAL_FRAGMENTS * entityScale)),
    MAX_LOOSE_FRAGMENTS: Math.max(8, Math.round(base.MAX_LOOSE_FRAGMENTS * entityScale)),
    DEPOSIT_COUNT: Math.max(18, Math.round(base.DEPOSIT_COUNT * scaleFactor * performanceTuning.depositFactor)),
    MAX_SUBSTEPS_NORMAL: Math.max(6, Math.round(base.MAX_SUBSTEPS_NORMAL * performanceTuning.substepFactor)),
    MAX_SUBSTEPS_TURBO: Math.max(48, Math.round(base.MAX_SUBSTEPS_TURBO * performanceTuning.substepFactor)),
    MAX_PROTO_CELLS: Math.max(18, Math.round(base.MAX_PROTO_CELLS * scaleFactor * performanceTuning.protoFactor)),
    MATERIAL_SEED_COUNT: Math.max(14, Math.round(base.MATERIAL_SEED_COUNT * scaleFactor * performanceTuning.seedFactor)),
    CREATURE_EMERGENCE_TARGET: Math.max(28, Math.round(base.CREATURE_EMERGENCE_TARGET * entityScale)),
    MAX_REMNANTS: Math.max(40, Math.round(base.MAX_REMNANTS * performanceTuning.fxFactor)),
    MAX_COMBAT_FX: Math.max(56, Math.round(base.MAX_COMBAT_FX * performanceTuning.fxFactor)),
    MAX_TERRAIN_EDITS: Math.max(80, Math.round(base.MAX_TERRAIN_EDITS * scaleFactor * performanceTuning.fxFactor)),
    FORECAST_SAMPLES: Math.max(12, Math.round(base.FORECAST_SAMPLES * performanceTuning.fxFactor)),
    maxDpr: Number(clamp(base.maxDpr * performanceTuning.dprFactor, 1.1, 2).toFixed(2)),
  };

  runtime.INITIAL_CREATURES = Math.min(runtime.INITIAL_CREATURES, runtime.MAX_CREATURES);
  runtime.INITIAL_FRAGMENTS = Math.min(runtime.INITIAL_FRAGMENTS, runtime.MAX_FRAGMENTS);
  runtime.label = `${config.device} / ${config.performance} / ${config.worldScale} / ${config.chrome}`;
  return runtime;
}

function replaceConst(source, name, value) {
  const pattern = new RegExp(`const ${name} = [^;]+;`);
  const replacement = `const ${name} = ${value};`;
  if (!pattern.test(source)) {
    throw new Error(`Could not find constant ${name} in legacy script.`);
  }
  return source.replace(pattern, replacement);
}

function patchLegacyScript(source, runtime) {
  const names = [
    "WORLD_W",
    "WORLD_H",
    "GRID_W",
    "GRID_H",
    "MAX_CREATURES",
    "INITIAL_CREATURES",
    "MAX_FRAGMENTS",
    "INITIAL_FRAGMENTS",
    "MAX_LOOSE_FRAGMENTS",
    "DEPOSIT_COUNT",
    "MAX_SUBSTEPS_NORMAL",
    "MAX_SUBSTEPS_TURBO",
    "MAX_PROTO_CELLS",
    "MATERIAL_SEED_COUNT",
    "CREATURE_EMERGENCE_TARGET",
    "MAX_REMNANTS",
    "MAX_COMBAT_FX",
    "MAX_TERRAIN_EDITS",
    "FORECAST_SAMPLES",
  ];

  let patched = source;
  for (const name of names) {
    patched = replaceConst(patched, name, runtime[name]);
  }

  const dprExpr = "Math.max(1, Math.min(window.__NEWLIFE_BOOT_RUNTIME__.maxDpr, window.devicePixelRatio || 1))";
  patched = patched.replace(
    /let dpr = Math\.max\(1, Math\.min\(2, window\.devicePixelRatio \|\| 1\)\);/,
    `let dpr = ${dprExpr};`
  );
  patched = patched.replace(
    /dpr = Math\.max\(1, Math\.min\(2, window\.devicePixelRatio \|\| 1\)\);/,
    `dpr = ${dprExpr};`
  );

  return patched;
}

function resolveLegacyAssetUrl(path) {
  return new URL(path, LEGACY_ENTRY).toString();
}

function copyLegacyStyles(legacyDoc) {
  for (const node of legacyDoc.head.querySelectorAll('style, link[rel="stylesheet"]')) {
    if (node.tagName === "STYLE") {
      const style = document.createElement("style");
      style.setAttribute("data-legacy-style", "true");
      style.textContent = node.textContent || "";
      document.head.append(style);
      continue;
    }

    const href = node.getAttribute("href");
    if (!href) continue;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = resolveLegacyAssetUrl(href);
    if (node.media) link.media = node.media;
    link.setAttribute("data-legacy-style", "true");
    document.head.append(link);
  }
}

function injectShellStyles() {
  const style = document.createElement("style");
  style.setAttribute("data-launch-style", "true");
  style.textContent = `
    body[data-launch-device] {
      min-height: 100vh;
      min-height: 100dvh;
      padding: 0;
      background: #06080b;
    }

    body[data-launch-device] #app {
      min-height: 100vh;
      min-height: 100dvh;
    }

    body[data-launch-device="laptop"] #inspector {
      width: 368px;
      min-width: 332px;
      max-width: 38vw;
    }

    body[data-launch-device="laptop"] #toolbar .group[data-shell-group="overlays"] {
      min-width: 0;
      flex: 1 1 420px;
      overflow-x: auto;
      scrollbar-width: thin;
    }

    body[data-launch-device="laptop"] #toolbar .checks {
      flex-wrap: nowrap;
      max-width: none;
      white-space: nowrap;
    }

    body[data-launch-device] #toolbar {
      position: sticky;
      top: 0;
      z-index: 30;
    }

    body[data-launch-device] #toolbar .group[data-shell-group="sim"] {
      display: none;
    }

    body[data-launch-device] #toolbar .group[data-shell-group="seed"] {
      flex: 1 1 300px;
      min-width: 220px;
    }

    body[data-launch-device] #toolbar .group[data-shell-group="timeline"] {
      flex: 1 1 260px;
    }

    body[data-launch-device] #toolbar .group[data-shell-group="overlays"] {
      flex: 2 1 420px;
    }

    body[data-launch-device] #toolbar .shellToolbarFold {
      display: contents;
    }

    @media (max-width: 1280px) {
      body[data-launch-device="laptop"] #toolbar {
        gap: 10px;
        padding: 9px 10px;
      }

      body[data-launch-device="laptop"] .group {
        gap: 7px;
        padding: 6px 7px;
      }

      body[data-launch-device="laptop"] button {
        padding: 6px 9px;
        font-size: 12px;
      }

      body[data-launch-device="laptop"] input[type="text"],
      body[data-launch-device="laptop"] input[type="range"] {
        width: 156px;
      }

      body[data-launch-device="laptop"] .checks {
        max-width: 520px;
      }
    }

    body[data-launch-device="mobile"] #toolbar {
      gap: 8px;
      padding: 8px;
      align-items: stretch;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }

    body[data-launch-device="mobile"] #main {
      flex-direction: column;
    }

    body[data-launch-device="mobile"] #inspector {
      width: 100%;
      max-width: none;
      border-left: none;
      border-top: 1px solid rgba(255,255,255,0.07);
    }

    body[data-launch-device="mobile"] #toolbar .group {
      gap: 6px;
      padding: 6px;
      flex-wrap: wrap;
    }

    body[data-launch-device="mobile"] button {
      padding: 8px 10px;
      font-size: 12px;
    }

    body[data-launch-device="mobile"] input[type="text"],
    body[data-launch-device="mobile"] input[type="range"] {
      width: 100%;
      min-width: 0;
    }

    body[data-launch-device="mobile"] .checks {
      max-width: none;
      width: 100%;
    }

    body[data-launch-device="mobile"] #toolbar .group[data-shell-group="timeline"] {
      display: none;
    }

    body[data-launch-device="mobile"] #toolbar .group[data-shell-group="overlays"] {
      display: none;
    }

    body[data-launch-device="mobile"] #toolbar .group[data-shell-group="pulse"] {
      display: none;
    }

    body[data-launch-device="mobile"] #toolbar .group[data-shell-group="save"] {
      display: none;
    }

    body[data-launch-device="mobile"] #overlayHud {
      left: 8px;
      right: 8px;
      top: 8px;
    }

    body[data-launch-device="mobile"] .hudCard {
      min-width: 0;
      max-width: none;
    }

    body[data-launch-device="mobile"] #footerHint {
      display: none;
    }

    body[data-launch-chrome="compact"] #inspector {
      width: 340px;
      max-width: 34vw;
    }

    body[data-launch-device="mobile"][data-launch-chrome="compact"] #inspector {
      width: 100%;
      max-width: none;
      height: 34vh;
    }

    body[data-launch-chrome="minimal"] #inspector {
      display: none;
    }

    body.shell-inspector-open[data-launch-chrome="minimal"] #inspector {
      display: flex;
      position: fixed;
      right: 12px;
      bottom: 12px;
      z-index: 45;
      width: min(420px, calc(100vw - 24px));
      max-width: none;
      max-height: min(68vh, 640px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 0 22px 48px rgba(0, 0, 0, 0.42);
    }

    body.shell-inspector-open[data-launch-device="mobile"][data-launch-chrome="minimal"] #inspector {
      left: 10px;
      right: 10px;
      width: auto;
      height: min(62vh, 72dvh);
    }

    #shellQuickDock {
      position: fixed;
      left: 50%;
      bottom: 14px;
      z-index: 55;
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: linear-gradient(180deg, rgba(14, 19, 26, 0.96), rgba(9, 13, 18, 0.96));
      box-shadow: 0 20px 44px rgba(0, 0, 0, 0.38);
      backdrop-filter: blur(14px);
    }

    #shellQuickDock .shellDockGroup {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    #shellQuickDock button {
      border-radius: 12px;
      min-height: 40px;
      min-width: 40px;
      padding: 8px 12px;
      white-space: nowrap;
    }

    #shellQuickDock .shellPrimary {
      min-width: 88px;
    }

    #shellQuickDock .shellSpeedReadout {
      min-width: 64px;
      text-align: center;
      font-weight: 600;
    }

    #shellQuickDock .shellTurboActive {
      border-color: rgba(138, 217, 255, 0.34);
      background: linear-gradient(180deg, rgba(82, 148, 188, 0.34), rgba(39, 71, 108, 0.24));
    }

    body[data-launch-device="mobile"] #shellQuickDock {
      left: 10px;
      right: 10px;
      bottom: calc(10px + env(safe-area-inset-bottom, 0px));
      transform: none;
      width: auto;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      gap: 6px;
      padding: 8px;
    }

    body[data-launch-device="mobile"] #shellQuickDock .shellDockGroup {
      width: 100%;
      min-width: 0;
      justify-content: flex-start;
    }

    body[data-launch-device="mobile"] #shellQuickDock button {
      min-height: 42px;
      min-width: 0;
      padding: 8px 10px;
      font-size: 12px;
      flex: 1 1 auto;
    }

    body[data-launch-device="mobile"] #shellQuickDock .shellPrimary {
      flex: 1.25 1 auto;
    }

    #shellMorePanel {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 68px;
      z-index: 54;
      display: none;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(14, 19, 26, 0.98), rgba(9, 13, 18, 0.98));
      box-shadow: 0 18px 42px rgba(0, 0, 0, 0.42);
      padding: 10px;
      max-height: min(56vh, 560px);
      overflow: auto;
    }

    body[data-launch-device="mobile"] #shellMorePanel {
      left: 10px;
      right: 10px;
      bottom: calc(112px + env(safe-area-inset-bottom, 0px));
      max-height: min(62dvh, 520px);
      padding: 10px;
    }

    body.shell-more-open #shellMorePanel {
      display: block;
    }

    #shellMorePanel .group {
      width: 100%;
      margin-top: 8px;
    }

    #shellMorePanel .group:first-child {
      margin-top: 0;
    }

    #shellMorePanel .shellForecastGroup {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    #shellMorePanel .shellForecastTitle {
      width: 100%;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #8ea2b7;
    }

    #shellMorePanel .shellForecastGroup button {
      flex: 1 1 180px;
      min-width: 0;
    }

    body[data-launch-device="mobile"] #main {
      padding-bottom: calc(126px + env(safe-area-inset-bottom, 0px));
    }

    body[data-launch-device="mobile"] #shellMorePanel .shellForecastGroup button {
      flex-basis: 100%;
    }

    body[data-launch-device="mobile"] #shellMorePanel .group[data-shell-group="timeline"] label {
      width: 100%;
    }

    body[data-launch-device="mobile"] #shellMorePanel .group[data-shell-group="overlays"] {
      max-height: min(28dvh, 240px);
      overflow: auto;
      align-content: flex-start;
    }

    #shellInspectorToggle {
      position: fixed;
      right: 14px;
      bottom: 14px;
      z-index: 50;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: linear-gradient(180deg, rgba(13, 21, 28, 0.95), rgba(8, 13, 18, 0.95));
      color: #d9e7f2;
      padding: 10px 14px;
      box-shadow: 0 18px 36px rgba(0, 0, 0, 0.36);
      display: none;
    }

    body[data-launch-chrome="minimal"] #shellInspectorToggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    body[data-launch-device="mobile"][data-launch-chrome="minimal"] #shellInspectorToggle {
      bottom: calc(112px + env(safe-area-inset-bottom, 0px));
    }

    body.shell-more-open[data-launch-chrome="minimal"] #shellInspectorToggle {
      opacity: 0;
      pointer-events: none;
    }

    body[data-launch-device="mobile"][data-launch-chrome="full"] #inspector {
      width: 100%;
      max-width: none;
      height: clamp(240px, 38dvh, 420px);
    }

    body[data-launch-device="mobile"][data-launch-chrome="compact"] #inspector {
      height: clamp(208px, 32dvh, 340px);
    }

    body.shell-inspector-open[data-launch-device="mobile"][data-launch-chrome="minimal"] #inspector {
      bottom: calc(74px + env(safe-area-inset-bottom, 0px));
    }
  `;
  document.head.append(style);
}

function createInspectorToggle(config) {
  if (config.chrome !== "minimal") return;
  const button = document.createElement("button");
  button.id = "shellInspectorToggle";
  button.type = "button";
  button.textContent = "Inspector";
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", () => {
    document.body.classList.remove("shell-more-open");
    document.body.classList.toggle("shell-inspector-open");
    button.setAttribute("aria-expanded", document.body.classList.contains("shell-inspector-open") ? "true" : "false");
  });
  document.body.append(button);
}

function labelToolbarGroups() {
  const toolbar = document.getElementById("toolbar");
  if (!toolbar || toolbar.dataset.shellLabeled === "1") return;
  const labels = ["seed", "sim", "pulse", "save", "timeline", "overlays"];
  const groups = Array.from(toolbar.querySelectorAll(":scope > .group"));
  groups.forEach((group, index) => {
    if (labels[index]) {
      group.dataset.shellGroup = labels[index];
    }
  });
  toolbar.dataset.shellLabeled = "1";
}

const SHELL_GROUP_ORDER = ["seed", "sim", "pulse", "save", "timeline", "overlays"];
const SHELL_MORE_GROUPS = ["pulse", "save", "timeline", "overlays"];
const LAPTOP_OVERLAY_FOLD_WIDTH = 1660;
const LAPTOP_SECONDARY_FOLD_WIDTH = 1380;
const LAPTOP_TIMELINE_FOLD_WIDTH = 1200;

function resolveShellGroupLayout(config) {
  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  const panelGroups = new Set();

  if (config.device === "mobile") {
    for (const key of SHELL_MORE_GROUPS) {
      panelGroups.add(key);
    }
    return { panelGroups };
  }

  if (config.chrome === "minimal") {
    panelGroups.add("pulse");
    panelGroups.add("save");
    panelGroups.add("overlays");
    if (width < LAPTOP_OVERLAY_FOLD_WIDTH) {
      panelGroups.add("timeline");
    }
    return { panelGroups };
  }

  if (width < LAPTOP_OVERLAY_FOLD_WIDTH) {
    panelGroups.add("overlays");
  }

  if (width < LAPTOP_SECONDARY_FOLD_WIDTH) {
    panelGroups.add("pulse");
    panelGroups.add("save");
  }

  if (width < LAPTOP_TIMELINE_FOLD_WIDTH) {
    panelGroups.add("timeline");
  }

  return { panelGroups };
}

function ensureMorePanel() {
  let panel = document.getElementById("shellMorePanel");
  if (panel) return panel;
  panel = document.createElement("div");
  panel.id = "shellMorePanel";
  panel.setAttribute("aria-label", "More controls");
  document.body.append(panel);
  return panel;
}

function ensureShellForecastGroup(panel) {
  let group = panel.querySelector(".shellForecastGroup");
  if (group) return group;

  group = document.createElement("div");
  group.className = "group shellForecastGroup";
  group.innerHTML = `
    <div class="shellForecastTitle">Forecast</div>
    <button type="button" data-shell-forecast="estimate60">Estimate +60s</button>
    <button type="button" data-shell-forecast="estimate180">Estimate +180s</button>
    <button type="button" data-shell-forecast="commit">Fast-Forward +60s</button>
  `;

  group.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-shell-forecast]");
    if (!button) return;
    const action = button.dataset.shellForecast;
    if (action === "estimate60") {
      clickLegacyControl("forecast60Btn");
      return;
    }
    if (action === "estimate180") {
      clickLegacyControl("forecast180Btn");
      return;
    }
    if (action === "commit") {
      clickLegacyControl("commitForecastBtn");
    }
  });

  panel.prepend(group);
  return group;
}

function mountToolbarIntoMorePanel(config) {
  const toolbar = document.getElementById("toolbar");
  if (!toolbar) return;

  labelToolbarGroups();

  const panel = ensureMorePanel();
  ensureShellForecastGroup(panel);
  const allGroups = new Map();

  for (const group of document.querySelectorAll('#toolbar .group[data-shell-group], #shellMorePanel .group[data-shell-group]')) {
    allGroups.set(group.dataset.shellGroup, group);
  }

  const { panelGroups } = resolveShellGroupLayout(config);

  for (const key of SHELL_GROUP_ORDER) {
    const group = allGroups.get(key);
    if (!group) continue;
    if (panelGroups.has(key)) {
      panel.append(group);
    } else {
      toolbar.append(group);
    }
  }

  const hasMore = panel.childElementCount > 0;
  panel.hidden = !hasMore;
  panel.dataset.hasContent = hasMore ? "1" : "0";
  if (!hasMore) {
    document.body.classList.remove("shell-more-open");
  }
  document.body.classList.toggle("shell-more-available", hasMore);
  syncQuickDock();
}

function clickLegacyControl(id) {
  const target = document.getElementById(id);
  if (target) target.click();
}

function createQuickDock(config) {
  const existing = document.getElementById("shellQuickDock");
  if (existing) existing.remove();
  const isMobile = config.device === "mobile";

  const dock = document.createElement("div");
  dock.id = "shellQuickDock";

  const transport = document.createElement("div");
  transport.className = "shellDockGroup";
  transport.innerHTML = `
    <button type="button" data-action="slower" aria-label="Slower">${isMobile ? "-" : "Slower"}</button>
    <button type="button" class="shellPrimary" data-action="pause" aria-label="Play or pause">Play</button>
    <button type="button" class="shellSpeedReadout" data-action="speed" aria-label="Cycle speed">1x</button>
    <button type="button" data-action="faster" aria-label="Faster">${isMobile ? "+" : "Faster"}</button>
    <button type="button" data-action="turbo" aria-label="Toggle turbo">Turbo</button>
  `;

  const view = document.createElement("div");
  view.className = "shellDockGroup";
  const moreButton = `<button type="button" data-action="more" aria-label="More controls">More</button>`;
  view.innerHTML = `
    <button type="button" data-action="zoomOut" aria-label="Zoom out">${isMobile ? "-" : "Zoom -"}</button>
    <button type="button" data-action="fit" aria-label="Fit camera">Fit</button>
    <button type="button" data-action="zoomIn" aria-label="Zoom in">${isMobile ? "+" : "Zoom +"}</button>
    ${moreButton}
  `;

  dock.append(transport, view);
  document.body.append(dock);

  const actionMap = {
    slower: "slowerBtn",
    pause: "pauseBtn",
    speed: "speedBtn",
    faster: "fasterBtn",
    turbo: "turboBtn",
    zoomOut: "zoomOutBtn",
    fit: "fitBtn",
    zoomIn: "zoomInBtn",
  };

  dock.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "more") {
      if (config.chrome === "minimal") {
        document.body.classList.remove("shell-inspector-open");
      }
      document.body.classList.toggle("shell-more-open");
      return;
    }
    const legacyId = actionMap[action];
    if (legacyId) clickLegacyControl(legacyId);
  });
}

function syncQuickDock() {
  const dock = document.getElementById("shellQuickDock");
  if (!dock) return;
  const pauseBtn = document.getElementById("pauseBtn");
  const speedBtn = document.getElementById("speedBtn");
  const turboBtn = document.getElementById("turboBtn");
  const forecast60Btn = document.getElementById("forecast60Btn");
  const forecast180Btn = document.getElementById("forecast180Btn");
  const commitForecastBtn = document.getElementById("commitForecastBtn");
  const panel = document.getElementById("shellMorePanel");
  const hasMore = !!panel && panel.childElementCount > 0;
  const morePanelOpen = document.body.classList.contains("shell-more-open");

  const pauseDisplay = dock.querySelector('button[data-action="pause"]');
  const speedDisplay = dock.querySelector('button[data-action="speed"]');
  const turboDisplay = dock.querySelector('button[data-action="turbo"]');
  const moreDisplay = dock.querySelector('button[data-action="more"]');
  const forecastGroup = panel?.querySelector(".shellForecastGroup");

  if (pauseBtn && pauseDisplay) {
    pauseDisplay.textContent = pauseBtn.textContent.trim();
  }
  if (speedBtn && speedDisplay) {
    speedDisplay.textContent = speedBtn.textContent.trim();
  }
  if (turboBtn && turboDisplay) {
    turboDisplay.textContent = turboBtn.textContent.trim() === "Turbo Off" ? "Turbo" : turboBtn.textContent.trim();
    turboDisplay.classList.toggle("shellTurboActive", turboBtn.textContent.includes("On"));
  }
  if (moreDisplay) {
    moreDisplay.hidden = !hasMore;
    moreDisplay.setAttribute("aria-expanded", hasMore && morePanelOpen ? "true" : "false");
    if (hasMore) {
      moreDisplay.textContent = morePanelOpen ? "Close" : "More";
    }
  }
  if (!hasMore && morePanelOpen) {
    document.body.classList.remove("shell-more-open");
  }

  const inspectorToggle = document.getElementById("shellInspectorToggle");
  if (inspectorToggle) {
    inspectorToggle.setAttribute("aria-expanded", document.body.classList.contains("shell-inspector-open") ? "true" : "false");
  }

  if (forecastGroup) {
    const estimate60Display = forecastGroup.querySelector('button[data-shell-forecast="estimate60"]');
    const estimate180Display = forecastGroup.querySelector('button[data-shell-forecast="estimate180"]');
    const commitDisplay = forecastGroup.querySelector('button[data-shell-forecast="commit"]');
    const forecastVisible = !!(forecast60Btn && forecast180Btn && commitForecastBtn);

    forecastGroup.hidden = !forecastVisible;
    if (estimate60Display && forecast60Btn) {
      estimate60Display.textContent = forecast60Btn.textContent.trim();
    }
    if (estimate180Display && forecast180Btn) {
      estimate180Display.textContent = forecast180Btn.textContent.trim();
    }
    if (commitDisplay && commitForecastBtn) {
      commitDisplay.textContent = commitForecastBtn.textContent.trim();
    }
  }
}

function bindShellDocumentEvents(config) {
  if (document.body.dataset.shellEventsBound === "1") return;
  document.body.dataset.shellEventsBound = "1";

  let resizeFrame = 0;
  let syncingLayoutResize = false;
  window.addEventListener("resize", () => {
    if (syncingLayoutResize) {
      syncingLayoutResize = false;
      return;
    }
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      mountToolbarIntoMorePanel(config);
      syncingLayoutResize = true;
      window.dispatchEvent(new Event("resize"));
    });
  });

  document.addEventListener("pointerdown", (event) => {
    if (!document.body.classList.contains("shell-more-open")) return;
    const panel = document.getElementById("shellMorePanel");
    const dock = document.getElementById("shellQuickDock");
    if (!panel || panel.contains(event.target) || dock?.contains(event.target)) return;
    document.body.classList.remove("shell-more-open");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.body.classList.remove("shell-more-open");
      if (config.chrome === "minimal") {
        document.body.classList.remove("shell-inspector-open");
      }
    }
  });
}

function makeMouseLikeEvent(type, point) {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    button: 0,
    buttons: type === "mouseup" ? 0 : 1,
  });
}

function makeWheelLikeEvent(point, deltaY) {
  return new WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    deltaX: 0,
    deltaY,
  });
}

function pinchSnapshot(pointerMap) {
  const points = Array.from(pointerMap.values());
  if (points.length < 2) return null;
  const [a, b] = points;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return {
    distance: Math.hypot(dx, dy),
    center: { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 },
  };
}

function attachTouchBridge(config) {
  const canvas = document.getElementById("worldCanvas");
  if (!canvas || canvas.dataset.touchBridgeReady === "1") return;

  const needsTouchBridge = config.device === "mobile" || window.matchMedia?.("(pointer: coarse)").matches;
  if (!needsTouchBridge) return;

  canvas.dataset.touchBridgeReady = "1";
  canvas.style.touchAction = "none";

  const bridge = {
    activePointerId: null,
    pointers: new Map(),
    pinch: null,
  };

  function pointerPoint(event) {
    return { x: event.clientX, y: event.clientY };
  }

  function endActiveDrag(point) {
    if (bridge.activePointerId == null) return;
    window.dispatchEvent(makeMouseLikeEvent("mouseup", point));
    bridge.activePointerId = null;
  }

  if (window.PointerEvent) {
    canvas.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      event.preventDefault();

      const point = pointerPoint(event);
      bridge.pointers.set(event.pointerId, point);

      if (bridge.pointers.size === 1) {
        bridge.activePointerId = event.pointerId;
        canvas.dispatchEvent(makeMouseLikeEvent("mousedown", point));
        return;
      }

      if (bridge.pointers.size === 2) {
        endActiveDrag(point);
        bridge.pinch = pinchSnapshot(bridge.pointers);
      }
    }, { passive: false });

    window.addEventListener("pointermove", (event) => {
      if (event.pointerType === "mouse" || !bridge.pointers.has(event.pointerId)) return;
      event.preventDefault();

      const point = pointerPoint(event);
      bridge.pointers.set(event.pointerId, point);

      if (bridge.pointers.size === 1 && bridge.activePointerId === event.pointerId) {
        window.dispatchEvent(makeMouseLikeEvent("mousemove", point));
        return;
      }

      if (bridge.pointers.size >= 2) {
        const nextPinch = pinchSnapshot(bridge.pointers);
        if (bridge.pinch && nextPinch) {
          const deltaDistance = nextPinch.distance - bridge.pinch.distance;
          if (Math.abs(deltaDistance) > 2) {
            const deltaY = clamp(-deltaDistance * 2.2, -140, 140);
            canvas.dispatchEvent(makeWheelLikeEvent(nextPinch.center, deltaY));
          }
        }
        bridge.pinch = nextPinch;
      }
    }, { passive: false });

    function finishPointer(event) {
      if (event.pointerType === "mouse" || !bridge.pointers.has(event.pointerId)) return;
      event.preventDefault();

      const point = pointerPoint(event);
      const wasSingleDrag = bridge.activePointerId === event.pointerId && bridge.pointers.size === 1;

      bridge.pointers.delete(event.pointerId);

      if (wasSingleDrag) {
        endActiveDrag(point);
      }

      if (bridge.pointers.size < 2) {
        bridge.pinch = null;
      }
    }

    window.addEventListener("pointerup", finishPointer, { passive: false });
    window.addEventListener("pointercancel", finishPointer, { passive: false });
    return;
  }

  let activeTouchId = null;
  let pinch = null;

  function touchPoint(touch) {
    return { x: touch.clientX, y: touch.clientY };
  }

  canvas.addEventListener("touchstart", (event) => {
    event.preventDefault();

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      activeTouchId = touch.identifier;
      canvas.dispatchEvent(makeMouseLikeEvent("mousedown", touchPoint(touch)));
      return;
    }

    if (event.touches.length >= 2) {
      const touch = Array.from(event.changedTouches)[0] || event.touches[0];
      if (activeTouchId != null && touch) {
        window.dispatchEvent(makeMouseLikeEvent("mouseup", touchPoint(touch)));
      }
      activeTouchId = null;
      const map = new Map(Array.from(event.touches).slice(0, 2).map((touchItem) => [touchItem.identifier, touchPoint(touchItem)]));
      pinch = pinchSnapshot(map);
    }
  }, { passive: false });

  canvas.addEventListener("touchmove", (event) => {
    event.preventDefault();

    if (event.touches.length === 1 && activeTouchId != null) {
      const touch = Array.from(event.touches).find((item) => item.identifier === activeTouchId) || event.touches[0];
      window.dispatchEvent(makeMouseLikeEvent("mousemove", touchPoint(touch)));
      return;
    }

    if (event.touches.length >= 2) {
      const map = new Map(Array.from(event.touches).slice(0, 2).map((touchItem) => [touchItem.identifier, touchPoint(touchItem)]));
      const nextPinch = pinchSnapshot(map);
      if (pinch && nextPinch) {
        const deltaDistance = nextPinch.distance - pinch.distance;
        if (Math.abs(deltaDistance) > 2) {
          const deltaY = clamp(-deltaDistance * 2.2, -140, 140);
          canvas.dispatchEvent(makeWheelLikeEvent(nextPinch.center, deltaY));
        }
      }
      pinch = nextPinch;
    }
  }, { passive: false });

  function finishTouch(event) {
    event.preventDefault();

    if (activeTouchId != null) {
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === activeTouchId) || event.changedTouches[0];
      if (touch) {
        window.dispatchEvent(makeMouseLikeEvent("mouseup", touchPoint(touch)));
      }
    }

    activeTouchId = null;
    if (event.touches.length < 2) {
      pinch = null;
    }
  }

  canvas.addEventListener("touchend", finishTouch, { passive: false });
  canvas.addEventListener("touchcancel", finishTouch, { passive: false });
}

async function loadLegacyScript(legacyDoc) {
  for (const scriptNode of legacyDoc.querySelectorAll("script")) {
    const source = scriptNode.textContent || "";
    if (source.includes(SCRIPT_MARKER)) {
      return source;
    }

    const src = scriptNode.getAttribute("src");
    if (!src) continue;

    const response = await fetch(resolveLegacyAssetUrl(src), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load legacy script ${src}: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  }
  throw new Error("Legacy script source was not found.");
}

function prepareLegacyDocument(legacyDoc, config) {
  const app = legacyDoc.body.querySelector("#app");
  if (!app) {
    throw new Error("Legacy app root #app was not found.");
  }

  const seedInput = app.querySelector("#seedInput");
  if (seedInput) {
    seedInput.setAttribute("value", config.seed);
    seedInput.value = config.seed;
  }

  return app;
}

function mountLegacyBody(appNode) {
  document.body.innerHTML = "";
  document.body.append(document.importNode(appNode, true));
}

function runLegacyScript(source, runtime) {
  window.__NEWLIFE_BOOT_RUNTIME__ = runtime;
  const script = document.createElement("script");
  script.textContent = source;
  document.body.append(script);
}

function applyPostBootControls(config) {
  document.body.dataset.launchDevice = config.device;
  document.body.dataset.launchChrome = config.chrome;
  injectShellStyles();
  mountToolbarIntoMorePanel(config);
  createQuickDock(config);
  createInspectorToggle(config);
  attachTouchBridge(config);
  bindShellDocumentEvents(config);
  syncQuickDock();

  if (window.__NEWLIFE_SHELL_SYNC__) {
    clearInterval(window.__NEWLIFE_SHELL_SYNC__);
  }
  window.__NEWLIFE_SHELL_SYNC__ = window.setInterval(syncQuickDock, 250);

  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
    requestAnimationFrame(() => {
      const fitBtn = document.getElementById("fitBtn");
      if (fitBtn) fitBtn.click();

      if (!config.startPaused) return;
      const pauseBtn = document.getElementById("pauseBtn");
      if (pauseBtn && pauseBtn.textContent.trim() === "Pause") {
        pauseBtn.click();
      }
    });
  });
}

async function bootLegacyWorld(config) {
  const runtime = deriveRuntimeConfig(config);
  setBootStatus(`Booting ${runtime.label}...`);

  const response = await fetch(LEGACY_ENTRY, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${LEGACY_ENTRY}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const legacyDoc = new DOMParser().parseFromString(html, "text/html");
  const legacyTitle = legacyDoc.querySelector("title")?.textContent?.trim();
  const legacyScript = patchLegacyScript(await loadLegacyScript(legacyDoc), runtime);
  const app = prepareLegacyDocument(legacyDoc, config);

  if (legacyTitle) {
    document.title = legacyTitle;
  }

  copyLegacyStyles(legacyDoc);
  mountLegacyBody(app);
  runLegacyScript(legacyScript, runtime);
  applyPostBootControls(config);
}

async function launchWithConfig(config) {
  saveConfig(config);
  setBootStatus("Preparing world shell...");
  if (launchForm) {
    const submitButton = launchForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
  }

  try {
    await bootLegacyWorld(config);
  } catch (error) {
    console.error(error);
    if (launchForm) {
      const submitButton = launchForm.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = false;
    }
    setBootStatus(
      [
        "The launcher failed to boot the legacy game.",
        `<code>${error.message}</code>`,
      ].join("<br>"),
      true
    );
  }
}

function bindLauncher() {
  const initial = shouldAutoLaunch() ? (queryConfig() || loadSavedConfig()) : loadSavedConfig();
  applyFormConfig(initial);

  if (restoreDefaultsBtn) {
    restoreDefaultsBtn.addEventListener("click", () => {
      applyFormConfig(DEFAULT_CONFIG);
      setBootStatus("Defaults restored. Launch when ready.");
    });
  }

  if (launchForm) {
    launchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const config = readFormConfig();
      launchWithConfig(config);
    });
  }

  if (shouldAutoLaunch()) {
    launchWithConfig(initial);
  }
}

bindLauncher();
