/**
 * Nimble - Pathfinder Tokens: apply token art when a monster is created.
 *
 * Covers actors that Foundry's compendium art mapping never sees: monsters
 * imported from Nimble Nexus (created straight in the world with a placeholder
 * image) and anything dragged in from a Nimble compendium whose best art lives
 * in an optional token module. Art is looked up by monster name in
 * module/art-by-name.json. Each entry lists choices in order of preference and
 * the first choice whose token module is active wins, so art from a module
 * that isn't installed is skipped instead of leaving a broken image.
 */

const MODULE_ID = "nimble-pathfinder-tokens";
const NEXUS_STORAGE = "https://nimble-nexus.fly.storage.tigris.dev";
const PLACEHOLDER = "icons/svg/mystery-man.svg";

let table = null;

/** Lowercase, keep letters and digits only, so "Ul'vek" and "Ulvek" match. */
export function normalizeName(name) {
  return String(name ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
}

function setting(key) {
  try { return game.settings.get(MODULE_ID, key); } catch { return undefined; }
}

function moduleActive(id) {
  return game.modules.get(id)?.active === true;
}

/** First choice whose module is installed and enabled, or null. */
export function pickChoice(entry) {
  for (const choice of entry?.choices ?? []) {
    if (moduleActive(choice.module)) return choice;
  }
  return null;
}

/** Should this actor's current art be replaced? */
export function shouldReplace(data) {
  const img = data.img ?? "";
  const systemId = game.system?.id ?? "nimble";
  const fromNimbleCompendium = String(data._stats?.compendiumSource ?? "").startsWith(`Compendium.${systemId}.`);
  const fromNexus = data.flags?.[systemId]?.importCredit?.source === "nimble-nexus" || img.startsWith(NEXUS_STORAGE);

  if (!img || img === PLACEHOLDER) return true;
  if (img.startsWith("icons/")) return true;
  if (img.startsWith(`systems/${systemId}/`)) return setting("replaceNimbleArt") !== false;
  if (img.startsWith(NEXUS_STORAGE)) return setting("replaceNexusArt") === true;
  // Art set by a token mapping can be upgraded to a better choice, but only on
  // a fresh import from a Nimble compendium, never on a copy of the GM's own actor.
  if (img.startsWith("modules/pf2e-tokens-")) return fromNimbleCompendium;
  return false;
}

/** The actor and prototype token data for a choice. */
export function artUpdate(choice) {
  const scale = Number(choice.scale) || 1;
  return {
    img: choice.actor,
    prototypeToken: {
      randomImg: false,
      texture: { src: choice.token, scaleX: scale, scaleY: scale },
      ring: { enabled: true, subject: { texture: choice.subject, scale } },
    },
  };
}

function onPreCreateActor(actor, data, options, userId) {
  if (!table || userId !== game.user?.id) return;
  if (setting("applyOnCreate") === false) return;
  const entry = table[normalizeName(data.name)];
  if (!entry || !shouldReplace(data)) return;
  const choice = pickChoice(entry);
  if (!choice) return;
  actor.updateSource(artUpdate(choice));
}

/**
 * Apply art to monsters already in the world. Only actors the creation rules
 * would have changed are touched. Run from a macro:
 *   game.modules.get("nimble-pathfinder-tokens").api.applyArtToWorldActors()
 */
async function applyArtToWorldActors({ dryRun = false } = {}) {
  if (!game.user?.isGM) { ui.notifications.warn("Only a GM can apply token art to world actors."); return []; }
  await loadTable();
  const updates = [];
  for (const actor of game.actors) {
    const entry = table?.[normalizeName(actor.name)];
    if (!entry) continue;
    const source = actor.toObject();
    if (!shouldReplace(source)) continue;
    const choice = pickChoice(entry);
    if (!choice || source.img === choice.actor) continue;
    updates.push({ _id: actor.id, ...artUpdate(choice) });
  }
  if (!dryRun && updates.length) await Actor.updateDocuments(updates);
  ui.notifications.info(`${dryRun ? "Would update" : "Updated"} token art on ${updates.length} actor${updates.length === 1 ? "" : "s"}.`);
  return updates;
}

async function loadTable() {
  if (table) return table;
  try {
    const res = await fetch(`modules/${MODULE_ID}/module/art-by-name.json`);
    table = await res.json();
  } catch (err) {
    console.error(`${MODULE_ID} | Could not load art-by-name.json`, err);
    table = {};
  }
  return table;
}

if (typeof Hooks !== "undefined") {
  Hooks.once("init", () => {
    game.settings.register(MODULE_ID, "applyOnCreate", {
      name: "Apply art to new monsters",
      hint: "Give monsters Pathfinder token art when they are created, including Nimble Nexus imports.",
      scope: "world", config: true, type: Boolean, default: true,
    });
    game.settings.register(MODULE_ID, "replaceNimbleArt", {
      name: "Replace Nimble's built-in monster art",
      hint: "When off, monsters keep the art that ships with the Nimble system.",
      scope: "world", config: true, type: Boolean, default: true,
    });
    game.settings.register(MODULE_ID, "replaceNexusArt", {
      name: "Replace art that comes from Nimble Nexus",
      hint: "When off, Nexus monsters that already have their own art keep it.",
      scope: "world", config: true, type: Boolean, default: false,
    });
    game.modules.get(MODULE_ID).api = { applyArtToWorldActors, normalizeName };
    loadTable();
  });
  Hooks.on("preCreateActor", onPreCreateActor);
}

export const __test = { onPreCreateActor, setTable: (t) => { table = t; } };
