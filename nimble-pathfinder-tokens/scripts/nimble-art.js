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
 *       Goblin Ratrider token.png    token image
 *       Goblin Ratrider subject.png  optional token-ring cutout
 *     Case, spaces, hyphens, punctuation and trailing copy numbers ("-1",
 *     "-2") are ignored, and a name before a comma ("Dregatha, ...") also matches.
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
  return String(setting("customFolder") ?? "").trim().replace(/^\/+|\/+$/g, "");
}

/**
 * Work out which monster and which role an image file is for.
 * "Book Mimic-1.png" -> Book Mimic, portrait; "book mimic token-2.png" -> Book Mimic, token.
 * Trailing copy numbers ("-1", " 2", "(3)") are ignored, and "token" or "subject"
 * at the end of the name marks the role.
 */
export function parseArtFile(file) {
  let base = String(file).replace(/\.[^.]+$/, "").trim();
  base = base.replace(/[\s_-]*(\(\d+\)|\d+)$/, "");
  const m = base.match(/^(.*?)[\s_-]+(token|subject)$/i);
  const label = (m ? m[1] : base).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return { label, role: m ? m[2].toLowerCase() : "actor" };
}

/** The proper name before a comma ("Dregatha" in "Dregatha, Thrice-Chinned"), if it's distinctive. */
function leadName(label) {
  const i = String(label).indexOf(",");
  if (i < 0) return null;
  const k = normalizeName(label.slice(0, i));
  return k.length >= 4 ? k : null;
}

/** Group image paths into { key -> {label, actor, token, subject} } by monster name. */
export function groupCustomFiles(paths) {
  const groups = new Map();
  for (const path of paths) {
    const file = decodeURIComponent(String(path).split("/").pop());
    if (!IMAGE.test(file)) continue;
    const { label, role } = parseArtFile(file);
    const key = normalizeName(label);
    if (!key) continue;
    const group = groups.get(key) ?? { label };
    group[role] = path;
    groups.set(key, group);
  }
  return groups;
}

/** Your art for a monster name: exact name first, then the proper name before a comma. */
export function findCustomKey(name, groups = custom) {
  const key = normalizeName(name);
  if (groups.has(key)) return key;
  // Singular and plural match each other ("Cerebral Hulk" art for "Cerebral Hulks").
  const other = key.endsWith("s") ? key.slice(0, -1) : `${key}s`;
  if (key.length >= 4 && groups.has(other)) return other;
  const lead = leadName(name) ?? (key.length >= 4 ? key : null);
  if (!lead) return null;
  if (groups.has(lead)) return lead;
  const hits = [...groups.entries()].filter(([, g]) => leadName(g.label) === lead).map(([k]) => k);
  return hits.length === 1 ? hits[0] : null;
}

/**
 * A choice built from one of the GM's own images. When the chosen art has only a
 * token or only a portrait, the missing half is filled from the art that matches
 * the monster's name (fillKey), so a token and portrait with different file names
 * still pair up.
 */
function customChoice(key, fillKey = null) {
  const g = custom.get(key);
  if (!g) return null;
  const f = fillKey && fillKey !== key ? custom.get(fillKey) : null;
  const actor = g.actor ?? f?.actor ?? null;
  const token = g.token ?? f?.token ?? actor;
  return { module: "custom", label: g.label, actor: actor ?? token, token, subject: g.subject ?? f?.subject ?? null, scale: 1 };
}

/**
 * Best available art for a monster name, or null. Order: your art picked for this
 * monster on the review page, then your art matched by name, then Pathfinder art
 * from the first token module that's installed.
 */
export function pickChoice(entry, name) {
  const choices = entry?.choices ?? [];
  for (const choice of choices) {
    if (choice.module !== "custom") continue;
    const own = customChoice(choice.key, findCustomKey(name));
    if (own) return own;
  }
  if (setting("preferCustom") !== false) {
    const key = findCustomKey(name);
    const own = key && customChoice(key);
    if (own) return own;
  }
  for (const choice of choices) {
    if (choice.module !== "custom" && moduleActive(choice.module)) return choice;
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
  if (img.startsWith(`modules/${MODULE_ID}/art/`)) return false; // already art bundled with this module
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

/**
 * Art for a token placed on a scene, or null to leave it alone.
 * The monster is identified by its actor's name when the actor is in the world,
 * otherwise by the token's own name. Size, position, disposition and anything
 * else on the token are kept; only its image and ring are changed.
 */
export function tokenArtUpdate(token, actorName = null) {
  const img = token.texture?.src ?? "";
  for (const name of [actorName, token.name]) {
    if (!name) continue;
    const choice = choose({ name, img, _stats: token._stats });
    if (!choice) continue;
    if (img === choice.token) return null;
    const scale = Number(choice.scale) || 1;
    return {
      texture: { src: choice.token, scaleX: scale, scaleY: scale },
      ring: choice.subject ? { enabled: true, subject: { texture: choice.subject, scale } } : { enabled: false },
    };
  }
  return null;
}

function tokenUpdates(tokens) {
  const updates = [];
  for (const token of tokens ?? []) {
    const actorName = token.actorId ? game.actors?.get(token.actorId)?.name ?? null : null;
    const u = tokenArtUpdate(token, actorName);
    if (u) updates.push({ _id: token._id, ...u });
  }
  return updates;
}

/** Scenes created in the world, including from an adventure import, get art on their placed monsters. */
function onPreCreateScene(scene, data, options, userId) {
  if (userId !== game.user?.id) return;
  if (setting("applyOnCreate") === false || setting("applyToScenes") === false) return;
  const tokens = data.tokens ?? [];
  const byId = new Map(tokenUpdates(tokens).map((u) => [u._id, u]));
  if (!byId.size) return;
  const merge = foundry.utils.mergeObject;
  const next = tokens.map((t) => {
    const u = byId.get(t._id);
    if (!u) return t;
    const { _id, ...change } = u;
    return merge(foundry.utils.deepClone(t), change, { inplace: false });
  });
  scene.updateSource({ tokens: next });
}

/**
 * Apply art to monster tokens already placed on scenes in the world. Run from a macro:
 *   game.modules.get("nimble-pathfinder-tokens").api.applyArtToScenes()
 * Pass { dryRun: true } to only count what would change.
 */
async function applyArtToScenes({ dryRun = false } = {}) {
  if (!game.user?.isGM) { ui.notifications.warn("Only a GM can apply token art to scenes."); return []; }
  await loadTable();
  await loadCustomArt();
  const report = [];
  let total = 0;
  for (const scene of game.scenes) {
    const updates = tokenUpdates(scene.tokens.map((t) => t.toObject()));
    if (!updates.length) continue;
    total += updates.length;
    report.push({ scene: scene.name, tokens: updates.length });
    if (!dryRun) await scene.updateEmbeddedDocuments("Token", updates);
  }
  ui.notifications.info(`${dryRun ? "Would update" : "Updated"} ${total} token${total === 1 ? "" : "s"} on ${report.length} scene${report.length === 1 ? "" : "s"}.`);
  console.table(report);
  return report;
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

/**
 * Load your art: the images bundled in this module's art folder (listed in
 * module/custom-art.json), plus anything in the optional extra folder setting.
 * Extra-folder files win when both have art for the same monster.
 */
async function loadCustomArt() {
  const merged = new Map();
  try {
    const res = await fetch(`modules/${MODULE_ID}/module/custom-art.json`);
    if (res.ok) for (const [key, g] of Object.entries(await res.json())) merged.set(key, g);
  } catch (err) {
    console.warn(`${MODULE_ID} | Could not load bundled art list`, err);
  }
  const folder = customFolder();
  if (folder && game.user?.isGM) {
    const FP = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    const source = setting("customSource") || "data";
    const files = [];
    const queue = [[folder, 0]];
    while (queue.length) {
      const [dir, depth] = queue.shift();
      let result;
      try { result = await FP.browse(source, dir); }
      catch (err) {
        if (depth === 0) console.info(`${MODULE_ID} | No extra art folder at "${dir}" (${source}).`);
        continue;
      }
      files.push(...(result.files ?? []));
      if (depth < 1) for (const sub of result.dirs ?? []) queue.push([sub, depth + 1]);
    }
    for (const [key, g] of groupCustomFiles(files)) merged.set(key, { ...(merged.get(key) ?? {}), ...g });
  }
  custom = merged;
  if (custom.size) console.info(`${MODULE_ID} | Your art is available for ${custom.size} monster${custom.size === 1 ? "" : "s"}.`);
  return custom;
}

if (typeof Hooks !== "undefined") {
  Hooks.once("init", () => {
    game.settings.register(MODULE_ID, "applyOnCreate", {
      name: "Apply art to new monsters",
      hint: "Give monsters token art when they are created, including Nimble Nexus imports.",
      scope: "world", config: true, type: Boolean, default: true,
    });
    game.settings.register(MODULE_ID, "applyToScenes", {
      name: "Apply art to monsters placed on scenes",
      hint: "When a scene is created, such as from an adventure import, give its placed monster tokens the same art.",
      scope: "world", config: true, type: Boolean, default: true,
    });
    game.settings.register(MODULE_ID, "customFolder", {
      name: "Extra art folder (optional)",
      hint: "Your art already ships inside this module. To try new art without rebuilding the module, name a folder in Foundry's user data here (files named after each monster, e.g. Goblin Ratrider.png and Goblin Ratrider token.png). Leave empty if you don't need it.",
      scope: "world", config: true, type: String, default: "",
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
    game.modules.get(MODULE_ID).api = { applyArtToWorldActors, applyArtToScenes, reloadCustomArt: loadCustomArt, normalizeName };
    loadTable();
  });
  // Browsing files needs a logged-in user, so wait for ready.
  Hooks.once("ready", () => { loadCustomArt(); });
  Hooks.on("preCreateActor", onPreCreateActor);
  Hooks.on("preCreateScene", onPreCreateScene);
}

export const __test = {
  onPreCreateActor,
  onPreCreateScene,
  applyArtToScenes,
  setTable: (t) => { table = t; },
  setCustom: (paths) => { custom = groupCustomFiles(paths); },
  setCustomGroups: (obj) => { custom = new Map(Object.entries(obj)); },
  loadCustomArt,
};
