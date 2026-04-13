const LEGACY_ENTRY = "./one_file_world.html";
const SCRIPT_MARKER = "(() => {";

const bootShell = document.getElementById("bootShell");
const bootMessage = document.getElementById("bootMessage");

function setBootError(message) {
  if (bootShell) {
    bootShell.classList.add("bootError");
  }
  if (bootMessage) {
    bootMessage.innerHTML = message;
  }
}

function copyLegacyStyles(legacyDoc) {
  for (const styleNode of legacyDoc.head.querySelectorAll("style")) {
    const style = document.createElement("style");
    style.setAttribute("data-legacy-style", "true");
    style.textContent = styleNode.textContent || "";
    document.head.append(style);
  }
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

function mountLegacyBody(legacyDoc) {
  const app = legacyDoc.body.querySelector("#app");
  if (!app) {
    throw new Error("Legacy app root #app was not found.");
  }

  document.body.innerHTML = "";
  document.body.append(document.importNode(app, true));
}

function runLegacyScript(source) {
  const script = document.createElement("script");
  script.textContent = source;
  document.body.append(script);
}

async function bootLegacyWorld() {
  const response = await fetch(LEGACY_ENTRY, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${LEGACY_ENTRY}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const legacyDoc = new DOMParser().parseFromString(html, "text/html");
  const legacyTitle = legacyDoc.querySelector("title")?.textContent?.trim();
  const legacyScript = findLegacyScript(legacyDoc);

  if (legacyTitle) {
    document.title = legacyTitle;
  }

  copyLegacyStyles(legacyDoc);
  mountLegacyBody(legacyDoc);
  runLegacyScript(legacyScript);
}

bootLegacyWorld().catch((error) => {
  console.error(error);
  setBootError(
    [
      "The new entrypoint failed to load the legacy game.",
      "This bridge is only here to test the split safely.",
      `<code>${error.message}</code>`,
    ].join("<br>")
  );
});
