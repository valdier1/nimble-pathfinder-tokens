import fs from 'fs';
const settings={applyOnCreate:true,applyToScenes:true,replaceNimbleArt:true,replaceNexusArt:false,customFolder:'custom-tokens',preferCustom:true};
const actors=new Map([['a1',{name:'Owlbear'}],['a2',{name:'Bandit'}]]);
const deepClone=o=>JSON.parse(JSON.stringify(o));
const mergeObject=(a,b)=>{const out=deepClone(a);const m=(t,s)=>{for(const k in s){if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k])&&t[k]&&typeof t[k]==='object')m(t[k],s[k]);else t[k]=s[k];}};m(out,b);return out;};
globalThis.foundry={utils:{mergeObject,deepClone}};
globalThis.game={user:{id:'gm',isGM:true},system:{id:'nimble'},modules:{get:()=>({active:true})},settings:{get:(m,k)=>settings[k]},actors:{get:id=>actors.get(id)}};
const mod=await import('./.nimble-art.mjs');
mod.__test.setTable(JSON.parse(fs.readFileSync('module/art-by-name.json','utf8')));
mod.__test.setCustom(['custom-tokens/Goblin-rat-rider.png','custom-tokens/Goblin-rat-rider-token.png']);
let pass=0,fail=0; const check=(l,ok,info='')=>{ok?pass++:fail++;console.log(ok?'PASS':'FAIL',l,info);};
const tokens=[
 {_id:'t1',name:'Owlbear',actorId:'a1',x:100,y:200,width:2,height:2,disposition:-1,texture:{src:'icons/svg/mystery-man.svg',scaleX:1,scaleY:1}},
 {_id:'t2',name:'Bandit Lookout',actorId:'a2',x:5,y:5,texture:{src:'systems/nimble/assets/monsterImages/Bandit.webp'}},
 {_id:'t3',name:'Goblin Ratrider',actorId:null,texture:{src:'icons/svg/mystery-man.svg'}},
 {_id:'t4',name:'Owlbear',actorId:'a1',texture:{src:'worlds/my-adventure/art/owlbear-special.webp'}},
 {_id:'t5',name:'Captain Vex',actorId:null,texture:{src:'icons/svg/mystery-man.svg'}},
];
let src=null; const scene={updateSource:u=>src=u};
mod.__test.onPreCreateScene(scene,{name:'Ruined Gate',tokens},{},'gm');
const by=Object.fromEntries((src?.tokens??[]).map(t=>[t._id,t]));
check('actor-named token gets art, keeps position/size', by.t1.texture.src.endsWith('owlbear.webp') && by.t1.x===100 && by.t1.width===2 && by.t1.disposition===-1 && by.t1.ring.enabled, by.t1.texture.src);
check('renamed token uses its actor name', by.t2.texture.src.includes('npc-core') && by.t2.name==='Bandit Lookout', by.t2.texture.src);
check('token without actor matched by own name, your art', by.t3.texture.src==='custom-tokens/Goblin-rat-rider-token.png' && by.t3.ring.enabled===false, by.t3.texture.src);
check('token with your adventure art kept', by.t4.texture.src==='worlds/my-adventure/art/owlbear-special.webp');
check('unknown NPC untouched', by.t5.texture.src==='icons/svg/mystery-man.svg');
src=null; mod.__test.onPreCreateScene(scene,{tokens:[]},{},'gm'); check('empty scene untouched', src===null);
src=null; mod.__test.onPreCreateScene(scene,{tokens},{},'player'); check('other user ignored', src===null);
settings.applyToScenes=false; src=null; mod.__test.onPreCreateScene(scene,{tokens},{},'gm'); check('setting off', src===null); settings.applyToScenes=true;
// macro over world scenes
const updatesSeen=[]; const mkTok=t=>({toObject:()=>deepClone(t)});
globalThis.ui={notifications:{info:m=>console.log('   notify:',m),warn:m=>console.log('   warn:',m)}};
const worldScenes=[{name:'Ruined Gate',tokens:tokens.map(mkTok),updateEmbeddedDocuments:async(t,u)=>updatesSeen.push(...u)},{name:'Empty',tokens:[],updateEmbeddedDocuments:async()=>{}}];
game.scenes=worldScenes; console.table=()=>{};
// loadTable/loadCustomArt inside the macro: table already set; stub FilePicker for custom
globalThis.FilePicker={browse:async()=>({files:['custom-tokens/Goblin-rat-rider.png','custom-tokens/Goblin-rat-rider-token.png'],dirs:[]})};
const dry=await mod.__test.applyArtToScenes({dryRun:true}); check('dry run reports 3 tokens, changes nothing', dry[0]?.tokens===3 && updatesSeen.length===0);
await mod.__test.applyArtToScenes(); check('macro updates 3 tokens', updatesSeen.length===3 && updatesSeen.every(u=>u._id&&u.texture.src));
await mod.__test.applyArtToScenes(); 
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
