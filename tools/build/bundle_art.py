# Convert the GM's art into the module: art/<monster-key>[-token|-subject].webp + module/custom-art.json
import os as _os
REPO=_os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
DATA=REPO+"/tools/data"
MODULE=REPO+"/nimble-pathfinder-tokens"
import os,re,json,unicodedata,sys
from PIL import Image
import sys as _sys
SRC=_sys.argv[1] if len(_sys.argv)>1 else REPO+'/../custom-tokens'
MOD=MODULE
OUT=f'{MOD}/art'
norm=lambda s:re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',s.lower()))
def parse(f):
    base=re.sub(r'\.[^.]+$','',f).strip(); base=re.sub(r'[\s_-]*(\(\d+\)|\d+)$','',base)
    m=re.match(r'^(.*?)[\s_-]+(token|subject)$',base,re.I)
    return re.sub(r'\s+',' ',re.sub(r'[-_]+',' ',m.group(1) if m else base)).strip(),(m.group(2).lower() if m else 'actor')
os.makedirs(OUT,exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT,f))
groups={}; before=after=0
for f in sorted(os.listdir(SRC)):
    if not re.search(r'\.(webp|png|jpe?g|avif|gif)$',f,re.I): continue
    label,role=parse(f); k=norm(label)
    if not k: continue
    name=k+('' if role=='actor' else '-'+role)+'.webp'
    im=Image.open(os.path.join(SRC,f)); has_alpha=im.mode in ('RGBA','LA') or 'transparency' in im.info
    im=im.convert('RGBA' if has_alpha else 'RGB')
    im.save(os.path.join(OUT,name),'WEBP',quality=88,method=6)
    before+=os.path.getsize(os.path.join(SRC,f)); after+=os.path.getsize(os.path.join(OUT,name))
    g=groups.setdefault(k,{'label':label}); g[role]=f'modules/nimble-pathfinder-tokens/art/{name}'
json.dump(dict(sorted(groups.items())),open(f'{MOD}/module/custom-art.json','w'),indent=1,ensure_ascii=False)
print(f'{len(groups)} monsters, {sum(len(g)-1 for g in groups.values())} images: {before/1e6:.1f} MB as PNG -> {after/1e6:.1f} MB as WebP')
for k,g in groups.items(): print(f"  {k:<30} {'portrait' if 'actor' in g else '        '} {'token' if 'token' in g else '     '} {'subject' if 'subject' in g else ''}")
