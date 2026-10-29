import os as _os
REPO=_os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
DATA=REPO+"/tools/data"
MODULE=REPO+"/nimble-pathfinder-tokens"
import json,re,collections
rows=json.load(open(DATA+'/catalog_rows.json'))
MOD={'B':'bestiaries','M':'monster-core','M2':'monster-core-2','D':'draconic-codex','N':'npc-core'}
idx={}
for i,r in enumerate(rows):
    if r[8] and r[9] and r[10]: idx.setdefault((r[1].strip().lower(),r[0]),i)
picks={};bad=[]
for line in open(DATA+'/picks.txt'):
    if not line.strip() or line.startswith('#'): continue
    n,s,ch=line.rstrip('\n').split('|')
    out=[]
    for c in ch.split(';'):
        lab,m=c.rsplit('@',1); k=(lab.strip().lower(),MOD[m])
        if k in idx: out.append(idx[k])
        else: bad.append((n,c))
    picks[n]=dict(status=s,choices=out)
print('picks',len(picks),'unresolved',len(bad)); [print('  ',b) for b in bad]
d=json.load(open(DATA+'/combined.json'))
need={o['name'] for o in d if o['kind']!='hazard' and o['status']!='Mapped'}
print('needed but missing:',sorted(need-set(picks))); print('extra:',sorted(set(picks)-need))
json.dump(picks,open(DATA+'/picks.json','w'))
c=collections.Counter(p['status'] for p in picks.values()); print(c)
print('chains with no Bestiaries option:',[n for n,p in picks.items() if not any(rows[i][0]=='bestiaries' for i in p['choices'])][:80])
