# Build tools

Everything needed to keep the art mapping up to date. The module itself is in
`nimble-pathfinder-tokens/`; this folder is how it gets built.

## Data (`data/`)

| File | What it is |
| --- | --- |
| `combined.json` | Every monster stat block in the Nimble GMG 3.0 and Monsters & More v0.1 drafts, with whether Nimble has the actor |
| `packs.json` | Monsters in Nimble's `nimble-monsters` and `nimble-legendary-monsters` compendiums, with their IDs |
| `catalog_rows.json` | Every token image in the five Pathfinder token modules: module, creature name, token, portrait and ring-subject paths, scale |
| `picks.txt` | The first-pass art choices, in order of preference (`Label@Module`) |
| `review_rows.json` | The review page's data: each monster's choices, with review decisions applied |
| `decisions.json` | Your review decisions so far: art you swapped and monsters you marked as reviewed |
| `reviews/` | Each "Copy my choices" export, as pasted |

## Workflow

1. **Review.** Build the review page and open it in a browser:
   `python tools/review/build_review.py "C:/Users/you/Downloads/tokens"`
2. **Record decisions.** Click "Copy my choices", save the text to a file, then:
   `python tools/build/merge_review.py tools/data/reviews/review_4.json`
3. **Add your art** (if any new): put images in the tokens folder's `custom-tokens/`, then
   `python tools/build/bundle_art.py "C:/Users/you/Downloads/tokens/custom-tokens"`
   This converts them to WebP in `nimble-pathfinder-tokens/art/` and updates `module/custom-art.json`.
4. **Build the module data:** `python tools/build/build_module.py tools/data/decisions.json`
   Writes `module/art-by-name.json` and `module/map-bestiaries.json`.
5. **Test:** `tools/tests/run.sh` (needs Node.js).
6. **Install:** copy the `nimble-pathfinder-tokens` folder into Foundry's `Data/modules`.

`resolve.py` turns `picks.txt` into the starting choices; it's only needed if the first-pass picks change.
Python scripts need Pillow for `bundle_art.py` (`pip install pillow`); the rest use only the standard library.
