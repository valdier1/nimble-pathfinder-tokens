# Merge a NIMBLE-REVIEW export into decisions.json and bake it into review_rows.json.
import os as _os
REPO=_os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
DATA=REPO+"/tools/data"
MODULE=REPO+"/nimble-pathfinder-tokens"
import json,sys
REMAP={"banditfiremagetoken2":"banditfiremage","banditfiremage1":"banditfiremage","banditicemagetoken2":"banditicemage","bookmimic1":"bookmimic","bookmimictoken2":"bookmimic","doormimictoken2":"doormimic","doormimic1":"doormimic","dregathathethricechinnedhag1":"dregathathethricechinnedhag","threechinnedhagironrimmedtoken2":"threechinnedhagironrimmed","colossalorcattheruinedgatetoken2":"colossalorcattheruinedgate","colossalorcattheruinedgate1":"colossalorcattheruinedgate"}
D=DATA+'/'
rows=json.load(open(D+'catalog_rows.json')); R=json.load(open(D+'review_rows.json'))
bytok={(r[0],r[2]):i for i,r in enumerate(rows)}
dec=json.load(open(D+'decisions.json')); before=dict(dec['picks']); dec['reviewed']=set(dec['reviewed'])
_t=open(sys.argv[1],encoding='utf-8').read().strip()
if _t.startswith('NIMBLE-REVIEW'): _t=_t[len('NIMBLE-REVIEW'):].strip()
new=json.loads(_t)
for n,(m,ref) in new['picks'].items():
    if m=='custom': ref=REMAP.get(ref,ref)
    dec['picks'][n]=[m,ref]
dec['reviewed']|=set(new['reviewed'])
names={r['n'] for r in R}
unknown=[n for n in list(dec['picks'])+list(dec['reviewed']) if n not in names]
bad=[(n,p) for n,p in dec['picks'].items() if p[0]!='custom' and tuple(p) not in bytok]
assert not unknown and not bad, (unknown,bad)
for r in R:
    p=dec['picks'].get(r['n']); r.pop('cp',None)
    if p and p[0]!='custom': i=bytok[tuple(p)]; r['ch']=[i]+[c for c in r['ch'] if c!=i]
    if p and p[0]=='custom': r['cp']=p[1]
    r['rv']=r['n'] in dec['reviewed']
json.dump(R,open(D+'review_rows.json','w'),separators=(',',':'),ensure_ascii=False)
json.dump({'picks':dec['picks'],'reviewed':sorted(dec['reviewed'])},open(D+'decisions.json','w'),indent=1)
changed={n:p for n,p in dec['picks'].items() if before.get(n)!=p}
print('new or changed picks:',len(changed))
for n,p in changed.items(): print(f'  {n} -> {p[1] if p[0]=="custom" else rows[bytok[tuple(p)]][1]} ({p[0]})')
nr=[r for r in R if r['st']=='r']
print(f"picks total {len(dec['picks'])} | reviewed {len(dec['reviewed'])} of {len(R)} | guesses checked {sum(r['rv'] for r in nr)} of {len(nr)} | non-solo guesses left {sum(1 for r in nr if not r['rv'] and not r['solo'])} | solo guesses left {sum(1 for r in nr if not r['rv'] and r['solo'])}")
