import fs from 'fs';
const active = new Set(['nimble-pathfinder-tokens','pf2e-tokens-bestiaries','pf2e-tokens-npc-core','pf2e-tokens-monster-core','pf2e-tokens-monster-core-2']);
const settings = {applyOnCreate:true, replaceNimbleArt:true, replaceNexusArt:false, customFolder:'custom-tokens', preferCustom:true};
globalThis.game = { user:{id:'gm', isGM:true}, system:{id:'nimble'},
  modules:{ get:(id)=>({active:active.has(id)}) }, settings:{ get:(m,k)=>settings[k] } };
const mod = await import('./.nimble-art.mjs');
const table = JSON.parse(fs.readFileSync('module/art-by-name.json','utf8'));
mod.__test.setTable(table);
mod.__test.setCustom(['custom-tokens/Goblin-rat-rider.png','custom-tokens/Goblin-rat-rider-token.png','custom-tokens/Da%20Big%20Snake.webp','custom-tokens/notes.txt']);
let pass=0, fail=0;
function run(label, data, expect, userId='gm'){
  let applied=null; const actor={ updateSource:(u)=>{ applied=u; } };
  mod.__test.onPreCreateActor(actor, data, {}, userId);
  const src = applied?.prototypeToken.texture.src ?? '';
  const got = !applied ? 'unchanged' : src.startsWith('custom-tokens/') ? 'custom:'+src.split('/').pop()+(applied.prototypeToken.ring.enabled?':ring':':noring') : src.split('/').slice(1,2)[0]+':'+src.split('/').pop();
  const ok = expect instanceof RegExp ? expect.test(got) : got===expect;
  ok?pass++:fail++; console.log(ok?'PASS':'FAIL', label, '->', got);
}
const nexus = (name, img='icons/svg/mystery-man.svg') => ({name, img, flags:{nimble:{importCredit:{source:'nimble-nexus',creator:{username:'x',displayName:'x'}}}}});
run('Nexus import, known name', nexus('Owlbear'), 'pf2e-tokens-bestiaries:owlbear.webp');
run('Nexus import, unknown name, no custom art', nexus('Some Other Beast'), 'unchanged');
run('Nexus monster with your own art (not in any book)', nexus('"Da Big Snake"'), 'custom:Da%20Big%20Snake.webp:noring');
run('Your art wins by name, token file used, no ring', {name:'Goblin Ratrider', img:'systems/nimble/assets/monsterImages/Goblin.webp', _stats:{compendiumSource:'Compendium.nimble.nimble-monsters.Actor.q'}}, 'custom:Goblin-rat-rider-token.png:noring');
run('Your art beats Nexus art', nexus('Goblin Ratrider','https://nimble-nexus.fly.storage.tigris.dev/a/400.png'), 'custom:Goblin-rat-rider-token.png:noring');
run('Actor already using your art is left alone', {name:'Goblin Ratrider', img:'custom-tokens/Goblin-rat-rider.png'}, 'unchanged');
run('Krogg uses your review pick', nexus('Krogg, Goblin King'), /npc-core:big-boss-goblin/);
run('Nexus import without credit flag', {name:'Gelatinous Cube', img:'icons/svg/mystery-man.svg'}, 'unchanged');  // not in either book list -> no entry
run('Nexus import, odd punctuation', nexus("ul'vek, psionic despot"), /veiled-master/);
run('Nexus monster that has its own art', nexus('Owlbear','https://nimble-nexus.fly.storage.tigris.dev/x/400.png'), 'unchanged');
run('Compendium Bandit, NPC Core on', {name:'Bandit', img:'systems/nimble/assets/monsterImages/Bandit.webp', _stats:{compendiumSource:'Compendium.nimble.nimble-monsters.Actor.abc'}}, 'pf2e-tokens-npc-core:bandit.webp');
run('Compendium Thorn upgraded from Bestiaries art', {name:'Thorn Quickblade', img:'modules/pf2e-tokens-bestiaries/portraits/humanoid/elf-rogue.webp', _stats:{compendiumSource:'Compendium.nimble.nimble-legendary-monsters.Actor.x'}}, /npc-core:peerless-duelist/);
run('Copy of a world actor with chosen art', {name:'Owlbear', img:'modules/pf2e-tokens-bestiaries/portraits/x/custom.webp'}, 'unchanged');
run('Another user creating', nexus('Owlbear'), 'unchanged', 'player');
active.delete('pf2e-tokens-npc-core');
run('Compendium Bandit, NPC Core missing', {name:'Bandit', img:'systems/nimble/assets/monsterImages/Bandit.webp', _stats:{compendiumSource:'Compendium.nimble.nimble-monsters.Actor.abc'}}, 'unchanged');
run('Thorn falls back to Bestiaries', nexus('Thorn Quickblade'), /bestiaries:drow-rogue/);
active.delete('pf2e-tokens-monster-core');
run('Krogg falls back past NPC Core and Monster Core', nexus('Krogg, Goblin King'), /bestiaries:bugbear-thug/);
settings.preferCustom=false;
run('Your art off: Ratrider uses Pathfinder art', nexus('Goblin Ratrider'), /bestiaries:rat-giant/);
settings.replaceNimbleArt=false;
run('Nimble art kept when setting is off', {name:'Wolf', img:'systems/nimble/assets/monsterImages/Wolf.webp'}, 'unchanged');
settings.applyOnCreate=false;
run('Disabled entirely', nexus('Owlbear'), 'unchanged');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
