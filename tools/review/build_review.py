"""Build review.html, the page for picking art for each monster.

Usage:  python tools/review/build_review.py "C:/Users/you/Downloads/tokens"

The tokens folder holds copies of the Pathfinder token modules (pf2e-tokens-*)
and your own art in custom-tokens/. review.html is written there, because it
shows the images straight from those folders.
"""
import json, os, re, sys, unicodedata
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
tokens_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Downloads/tokens")
tpl = open(os.path.join(HERE, "review_template.html"), encoding="utf-8").read()
rows = json.load(open(os.path.join(DATA, "review_rows.json"), encoding="utf-8"))
cat = json.load(open(os.path.join(DATA, "catalog_rows.json"), encoding="utf-8"))
norm = lambda s: re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", s.lower()))
def parse(f):
    base = re.sub(r"\.[^.]+$", "", f).strip(); base = re.sub(r"[\s_-]*(\(\d+\)|\d+)$", "", base)
    m = re.match(r"^(.*?)[\s_-]+(token|subject)$", base, re.I)
    return re.sub(r"\s+", " ", re.sub(r"[-_]+", " ", m.group(1) if m else base)).strip(), (m.group(2).lower() if m else "actor")
groups = {}
art_dir = os.path.join(tokens_dir, "custom-tokens")
for f in sorted(os.listdir(art_dir)) if os.path.isdir(art_dir) else []:
    if not re.search(r"\.(webp|png|jpe?g|avif|gif)$", f, re.I): continue
    label, role = parse(f); k = norm(label)
    if k: groups.setdefault(k, {"key": k, "label": label})[role] = f
html = (tpl.replace("__ROWS__", json.dumps(rows, separators=(",", ":"), ensure_ascii=False))
           .replace("__CAT__", json.dumps(cat, separators=(",", ":"), ensure_ascii=False))
           .replace("__CUSTOM__", json.dumps(list(groups.values()), ensure_ascii=False)))
out = os.path.join(tokens_dir, "review.html")
open(out, "w", encoding="utf-8").write(html)
print(f"Wrote {out}: {len(rows)} monsters, {sum(r.get('rv', False) for r in rows)} reviewed, {len(groups)} pieces of your art")
