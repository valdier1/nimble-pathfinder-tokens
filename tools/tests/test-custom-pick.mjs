const settings={applyOnCreate:true,replaceNimbleArt:true,replaceNexusArt:false,customFolder:'custom-tokens',preferCustom:true};
globalThis.game={user:{id:'gm'},system:{id:'nimble'},modules:{get:()=>({active:true})},settings:{get:(m,k)=>settings[k]}};
const mod=await import('./.nimble-art.mjs');
mod.__test.setCustom(['custom-tokens/Goblin-rat-rider.png','custom-tokens/Goblin-rat-rider-token.png','custom-tokens/Goblin-rat-rider-subject.png']);
mod.__test.setTable({vermisskittersnack:{name:'Vermis & Skittersnack',choices:[{module:'custom',key:'goblinratrider'},{module:'pf2e-tokens-bestiaries',actor:'a',token:'modules/pf2e-tokens-bestiaries/t.webp',subject:'s',scale:1}]}});
let u=null; mod.__test.onPreCreateActor({updateSource:x=>u=x},{name:'Vermis & Skittersnack',img:'icons/svg/mystery-man.svg'},{},'gm');
console.log(u.img, u.prototypeToken.texture.src, JSON.stringify(u.prototypeToken.ring));
const ok=u.prototypeToken.texture.src==='custom-tokens/Goblin-rat-rider-token.png'&&u.prototypeToken.ring.enabled&&u.img==='custom-tokens/Goblin-rat-rider.png';
console.log(ok?'PASS custom pick for a differently named monster, ring on when a subject file exists':'FAIL'); process.exit(ok?0:1);
