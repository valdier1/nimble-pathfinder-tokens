/**
 * Nimble - Pathfinder Tokens: apply token art when a monster is created.
 *
 * Covers actors that Foundry's compendium art mapping never sees: monsters
 * imported from Nimble Nexus (created straight in the world with a placeholder
 * image) and anything dragged in from a Nimble compendium whose best art lives
 * in an optional token module.
 *
 * Art comes from two places, in this order:
 *  1. The GM's own art folder (setting "customFolder", "custom-tokens" by
 *     default, in Foundry's user data). Files are matched to monsters by name:
 *       Goblin Ratrider.png          portrait (actor image)
 *       Goblin Ratrider-token.png    token image
 *       Goblin Ratrider-subject.png  optional token-ring cutout
 *     Case, spaces, hyphens and punctuation are ignored when matching.
 *  2. module/art-by-name.json. Each monster lists choices in order of
 *     preference; the first whose token module is active wins, so art from a
 *     module that isn't installed is skipped instead of leaving a broken image.
 *     A choice can also point at a file in the GM's art folder.
 */

const MODULE_ID = "nimble-pathfinder-tokens";
const NEXUS_STORAGE = "https://nimble-nexus.fly.storage.tigris.dev";
const PLACEHOLDER = "icons/svg/mystery-man.svg";
const IMAGE = /\.(webp|png|jpe?g|avif|gif)$/i;

let table = null;
let custom = new Map();

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

function customFolder() {
  return String(setting("customFolder") ?? "custom-tokens").trim().replace(/^\/+|\/+$/g, "");
}

/** Group image paths into { key -> {label, actor, token, subject} } by monster name. */
export function groupCustomFiles(paths) {
  const groups = new Map();
  for (const path of paths) {
    const file = decodeURIComponent(String(path).split("/").pop());
    if (!IMAGE.test(file)) continue;
    const base = file.replace(/\.[^.]+$/, "");
    const m = base.match(/^(.*?)[-_ ]+(token|subject)$/i);
    const label = (m ? m[1] : base).replace(/[-_]+/g, " ").trim();
    const role = m ? m[2].toLowerCase() : "actor";
    const key = normalizeName(label);
    if (!key) continue;
    const group = groups.get(key) ?? { label };
    group[role] = path;
    groups.set(key, group);
  }
  return groups;
}

/** A choice built from one of the GM's own images. */
function customChoice(key) {
  const g = custom.get(key);
  if (!g) return null;
  const token = g.token ?? g.actor;
  return { module: "custom", label: g.label, actor: g.actor ?? token, token, subject: g.subject ?? null, scale: 1 };
}

/** Best available art for a monster name, or null. */
export function pickChoice(entry, name) {
  if (setting("preferCustom") !== false) {
    const own = customChoice(normalizeName(name));
    if (own) return own;
  }
  for (const choice of entry?.choices ?? []) {
    if (choice.module === "custom") {
      const own = customChoice(choice.key);
      if (own) return own;
    } else if (moduleActive(choice.module)) {
      return choice;
    }
  }
  return null;
}

/** Should this actor's current art be replaced? */
export function shouldReplace(data, { own = false } = {}) {
  const img = data.img ?? "";
  const systemId = game.system?.id ?? "nimble";
  const fromNimbleCompendium = String(data._stats?.compendiumSource ?? "").startsWith(`Compendium.${systemId}.`);
  const folder = customFolder();

  if (!img || img === PLACEHOLDER) return true;
  if (folder && img.startsWith(`${folder}/`)) return false; // already the GM's own art
  if (img.startsWith("icons/")) return true;
  if (img.startsWith(`systems/${systemId}/`)) return setting("replaceNimbleArt") !== false;
  // The GM's own art for a monster always beats art that came from Nexus.
  if (img.startsWith(NEXUS_STORAGE)) return own || setting("replaceNexusArt") === true;
  // Art set by a token mapping can be upgraded to a better choice, but only on
  // a fresh import from a Nimble compendium, never on a copy of the GM's own actor.
  if (img.startsWith("modules/pf2e-tokens-")) return fromNimbleCompendium || own;
  return false;
}

/** The actor and prototype token data for a choice. */
export function artUpdate(choice) {
  const scale = Number(choice.scale) || 1;
  const ring = choice.subject
    ? { enabled: true, subject: { texture: choice.subject, scale } }
    : { enabled: false };
  return {
    img: choice.actor,
    prototypeToken: {
      randomImg: false,
      texture: { src: choice.token, scaleX: scale, scaleY: scale },
      ring,
    },
  };
}

function choose(data) {
  const entry = table?.[normalizeName(data.name)];
  const choice = pickChoice(entry, data.name);
  if (!choice || !shouldReplace(data, { own: choice.module === "custom" })) return null;
  return choice;
}

function onPreCreateActor(actor, data, options, userId) {
  if (userId !== game.user?.id) return;
  if (setting("applyOnCreate") === false) return;
  const choice = choose(data);
  if (choice) actor.updateSource(artUpdate(choice));
}

/**
 * Apply art to monsters already in the world. Only actors the creation rules
 * would have changed are touched. Run from a macro:
 *   game.modules.get("nimble-pathfinder-tokens").api.applyArtToWorldActors()
 */
async function applyArtToWorldActors({ dryRun = false } = {}) {
  if (!game.user?.isGM) { ui.notifications.warn("Only a GM can apply token art to world actors."); return []; }
  await loadTable();
  await loadCustomArt();
  const updates = [];
  for (const actor of game.actors) {
    const source = actor.toObject();
    const choice = choose(source);
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

/** List the GM's art folder (and one level of subfolders). */
async function loadCustomArt() {
  const folder = customFolder();
  custom = new Map();
  if (!folder) return custom;
  const FP = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
  const source = setting("customSource") || "data";
  const files = [];
  const queue = [[folder, 0]];
  while (queue.length) {
    const [dir, depth] = queue.shift();
    let result;
    try { result = await FP.browse(source, dir); }
    catch (err) {
      if (depth === 0 && game.user?.isGM) console.info(`${MODULE_ID} | No custom art folder at "${dir}" (${source}).`);
      continue;
    }
    files.push(...(result.files ?? []));
    if (depth < 1) for (const sub of result.dirs ?? []) queue.push([sub, depth + 1]);
  }
  custom = groupCustomFiles(files);
  if (custom.size) console.info(`${MODULE_ID} | Loaded custom art for ${custom.size} monster${custom.size === 1 ? "" : "s"}.`);
  return custom;
}

if (typeof Hooks !== "undefined") {
  Hooks.once("init", () => {
    game.settings.register(MODULE_ID, "applyOnCreate", {
      name: "Apply art to new monsters",
      hint: "Give monsters token art when they are created, including Nimble Nexus imports.",
      scope: "world", config: true, type: Boolean, default: true,
    });
    game.settings.register(MODULE_ID, "customFolder", {
      name: "Your art folder",
      hint: "Folder in Foundry's user data with your own monster art, named after each monster (Goblin Ratrider.png, Goblin Ratrider-token.png). Leave empty to turn this off.",
      scope: "world", config: true, type: String, default: "custom-tokens",
      onChange: () => loadCustomArt(),
    });
    game.settings.register(MODULE_ID, "preferCustom", {
      name: "Use your art first",
      hint: "When a file in your art folder matches a monster's name, use it ahead of Pathfinder art.",
      scope: "world", config: true, type: Boolean, default: true,
    });
    game.settings.register(MODULE_ID, "replaceNimbleArt", {
      name: "Replace Nimble's built-in monster art",
      hint: "When off, monsters keep the art that ships with the Nimble system.",
      scope: "world", config: true, type: Boolean, default: true,
    });
    game.settings.register(MODULE_ID, "replaceNexusArt", {
      name: "Replace art that comes from Nimble Nexus",
      hint: "When off, Nexus monsters that already have their own art keep it. Your own art always replaces it.",
      scope: "world", config: true, type: Boolean, default: false,
    });
    game.modules.get(MODULE_ID).api = { applyArtToWorldActors, reloadCustomArt: loadCustomArt, normalizeName };
    loadTable();
  });
  // Browsing files needs a logged-in user, so wait for ready.
  Hooks.once("ready", () => { loadCustomArt(); });
  Hooks.on("preCreateActor", onPreCreateActor);
}

export const __test = {
  onPreCreateActor,
  setTable: (t) => { table = t; },
  setCustom: (paths) => { custom = groupCustomFiles(paths); },
};
