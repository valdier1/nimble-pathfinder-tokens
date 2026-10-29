import os as _os
REPO=_os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
DATA=REPO+"/tools/data"
MODULE=REPO+"/nimble-pathfinder-tokens"
import json,re,collections,sys
ROOT=MODULE
rows=json.load(open(DATA+'/catalog_rows.json'))
R=json.load(open(DATA+'/review_rows.json'))
packs=json.load(open(DATA+'/packs.json'))
overrides=json.load(open(sys.argv[1]))['picks'] if len(sys.argv)>1 else {}   # name -> [module, tokenRel] or ['custom', key]
mapfile=f'{ROOT}/module/map-bestiaries.json'
existing=json.load(open(mapfile))
import os
CUSTOM=json.load(open(f'{ROOT}/module/custom-art.json')) if os.path.exists(f'{ROOT}/module/custom-art.json') else {}
def lead(label):
    i=label.find(','); k=norm(label[:i]) if i>=0 else None
    return k if k and len(k)>=4 else None
def find_custom(name):
    k=norm(name)
    if k in CUSTOM: return k
    o=k[:-1] if k.endswith('s') else k+'s'
    if len(k)>=4 and o in CUSTOM: return o
    l=lead(name) or (k if len(k)>=4 else None)
    if not l: return None
    if l in CUSTOM: return l
    hits=[kk for kk,g in CUSTOM.items() if lead(g['label'])==l]
    return hits[0] if len(hits)==1 else None
def custom_static(key, name):
    g=CUSTOM.get(key)
    if not g: return None
    f=CUSTOM.get(find_custom(name)) if find_custom(name)!=key else None
    actor=g.get('actor') or (f or {}).get('actor'); token=g.get('token') or (f or {}).get('token') or actor
    subject=g.get('subject') or (f or {}).get('subject')
    ring={"enabled":True,"subject":{"texture":subject,"scale":1}} if subject else {"enabled":False}
    return {"actor":actor or token,"token":{"randomImg":False,"texture":{"src":token,"scaleX":1,"scaleY":1},"ring":ring}}
core=existing['nimble.nimble-monsters']
norm=lambda s:re.sub(r'[^a-z0-9]','',s.lower())
MODID=lambda m:'pf2e-tokens-'+m
def full(m,rel): return f'modules/{MODID(m)}/{rel}' if rel else None
def choice(i,scale=None):
    r=rows[i]; return dict(module=MODID(r[0]),label=r[1],actor=full(r[0],r[3]),token=full(r[0],r[2]),subject=full(r[0],r[4]),scale=scale if scale is not None else r[6])
bytok={(r[0],r[2]):i for i,r in enumerate(rows)}
idmap={('core',r['name']):r['id'] for r in packs['monsters']}|{('legendary',r['name']):r['id'] for r in packs['legendaryMonsters']}
namefor={norm(r['name']):r['name'] for p in packs.values() for r in p}
table={}; static={'core':{},'legendary':{}}; stats=collections.Counter()
for r in R:
    ch=list(r['ch'])
    own=None
    if r['n'] in overrides:
        m,rel=overrides[r['n']]
        if m=='custom': own=dict(module='custom',key=rel); stats['custom']+=1
        else: i=bytok[(m,rel)]; ch=[i]+[c for c in ch if c!=i]; stats['overridden']+=1
    if r['st']=='mapped' and r['n'] not in overrides:
        # keep the existing compendium entry exactly as it is
        aid=idmap[('core',r['n'])] if ('core',r['n']) in idmap else None
        e=core[aid]; m=e['actor'].split('/')[1].replace('pf2e-tokens-','')
        table[norm(r['n'])]=dict(name=r['n'],choices=[dict(module=MODID(m),label=rows[ch[0]][1],actor=e['actor'],token=e['token']['texture']['src'],subject=e['token']['ring']['subject']['texture'],scale=e['token']['texture']['scaleX'])])
        stats['kept']+=1; continue
    table[norm(r['n'])]=dict(name=r['n'],choices=([own] if own else [])+[choice(i) for i in ch]); stats['table']+=1
    if r['pk']:
        nimble=namefor[norm(r['n'])] if norm(r['n']) in namefor else None
        aid=idmap.get((r['pk'],nimble))
        ckey=(own or {}).get('key') or find_custom(r['n'])
        cs=custom_static(ckey, r['n']) if ckey else None
        if aid and cs:
            static[r['pk']][aid]=cs; stats['static_custom_'+r['pk']]+=1; continue
        b=next((i for i in ch if rows[i][0]=='bestiaries'),None)
        if aid and b is not None:
            c=choice(b)
            static[r['pk']][aid]={"actor":c['actor'],"token":{"randomImg":False,"texture":{"src":c['token'],"scaleX":c['scale'],"scaleY":c['scale']},"ring":{"enabled":True,"subject":{"texture":c['subject'],"scale":c['scale']}}}}
            stats['static_'+r['pk']]+=1
        elif aid: stats['static_skipped_no_bestiaries']+=1
core.update(static['core'])
existing['nimble.nimble-monsters']=core
existing['nimble.nimble-legendary-monsters']=static['legendary']
json.dump(existing,open(mapfile,'w'),indent=2)
json.dump(dict(sorted(table.items())),open(f'{ROOT}/module/art-by-name.json','w'),indent=1,ensure_ascii=False)
print(dict(stats),'| table names',len(table),'| core entries',len(core),'| legendary entries',len(static['legendary']))
