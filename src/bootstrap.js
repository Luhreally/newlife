const LEGACY_ENTRY = new URL("../one_file_world.html", import.meta.url);
const SCRIPT_MARKER = "(() => {";
const STORAGE_KEY = "newlife.launch-config.v1";

const DEFAULT_CONFIG = {
  device: "laptop",
  performance: "balanced",
  worldScale: "standard",
  chrome: "compact",
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
  const chrome = ["full", "compact", "minimal"].includes(raw.chrome) ? raw.chrome : "compact";
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

function copyLegacyStyles(legacyDoc) {
  for (const styleNode of legacyDoc.head.querySelectorAll("style")) {
    const style = document.createElement("style");
    style.setAttribute("data-legacy-style", "true");
    style.textContent = styleNode.textContent || "";
    document.head.append(style);
  }
}

function injectShellStyles() {
  const style = document.createElement("style");
  style.setAttribute("data-launch-style", "true");
  style.textContent = `
    body[data-launch-device] {
      min-height: 100vh;
      padding: 0;
      background: #06080b;
    }

    body[data-launch-device] #app {
      min-height: 100vh;
    }

    body[data-launch-device="laptop"] #inspector {
      width: 320px;
      max-width: 34vw;
    }

    @media (max-width: 1500px) {
      body[data-launch-device="laptop"] #toolbar {
        gap: 8px;
        padding: 8px 10px;
      }

      body[data-launch-device="laptop"] .group {
        gap: 6px;
        padding: 5px 6px;
      }

      body[data-launch-device="laptop"] button {
        padding: 5px 8px;
        font-size: 12px;
      }

      body[data-launch-device="laptop"] input[type="text"],
      body[data-launch-device="laptop"] input[type="range"] {
        width: 144px;
      }

      body[data-launch-device="laptop"] .checks {
        max-width: 440px;
      }
    }

    body[data-launch-device="mobile"] #toolbar {
      gap: 8px;
      padding: 8px;
      align-items: stretch;
    }

    body[data-launch-device="mobile"] .group {
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
      width: 300px;
      max-width: 31vw;
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
  `;
  document.head.append(style);
}

function createInspectorToggle(config) {
  if (config.chrome !== "minimal") return;
  const button = document.createElement("button");
  button.id = "shellInspectorToggle";
  button.type = "button";
  button.textContent = "Inspector";
  button.addEventListener("click", () => {
    document.body.classList.toggle("shell-inspector-open");
  });
  document.body.append(button);
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

function findLegacyScript(legacyDoc) {
  for (const scriptNode of legacyDoc.querySelectorAll("script")) {
    const source = scriptNode.textContent || "";
    if (source.includes(SCRIPT_MARKER)) {
      return source;
    }
  }
  throw new Error("Legacy inline script was not found.");
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
  createInspectorToggle(config);
  attachTouchBridge(config);

  if (config.startPaused) {
    requestAnimationFrame(() => {
      const pauseBtn = document.getElementById("pauseBtn");
      if (pauseBtn && pauseBtn.textContent.trim() === "Pause") {
        pauseBtn.click();
      }
    });
  }
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
  const legacyScript = patchLegacyScript(findLegacyScript(legacyDoc), runtime);
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
