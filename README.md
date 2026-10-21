# Nimble - Pathfinder Tokens

A simple module that maps the tokens from the [Pathfinder Tokens: Bestiaries](https://www.foundryvtt.store/products/pf2e-tokens-bestiaries) module (commercial) to the Nimble System built-in actors.

In simple words, it allows you to use your monster tokens from Paizo with Nimble.

## What it does

* **Compendium art.** Monsters in Nimble's monster and legendary compendiums show Pathfinder art, using Foundry's compendium art mapping.
* **Art on import.** Monsters created in the world, including Nimble Nexus imports, get art matched by name when they are created.
* **Optional token modules.** Pathfinder Tokens: NPC Core, Monster Core, Monster Core 2 and Draconic Codex add more choices. Each monster lists its art in order of preference and the first one from an installed, enabled module is used.

## Your own art

Put your own monster art in a folder in Foundry's user data, `custom-tokens` by default (the same level as `modules` and `worlds`). Name each file after the monster:

* `Book Mimic-1.png`: portrait (actor image)
* `Book Mimic token-2.png`: token image. If there's no token file, the portrait is used for the token too.
* `Book Mimic subject.png` (optional): a cutout for Foundry's token ring. Without it, the token is used as is and the ring is turned off.

Case, spaces, hyphens, punctuation and numbers at the end (`-1`, `-2`) don't matter, so `Goblin-rat-rider.png` matches "Goblin Ratrider". For a name with a comma, the part before it is enough: `Dregatha, the Thrice-Chinned Hag-1.png` matches "Dregatha, Thrice-Chinned". Your art is used ahead of Pathfinder art, and it also works for Nexus monsters that have no Pathfinder art at all. One level of subfolders is read too. New files are picked up when Foundry reloads, or straight away with `game.modules.get("nimble-pathfinder-tokens").api.reloadCustomArt()`.

## Settings

* **Apply art to new monsters** (on by default)
* **Your art folder** (`custom-tokens` by default; leave empty to turn it off)
* **Use your art first** (on by default)
* **Apply art to monsters placed on scenes** (on by default)
* **Replace Nimble's built-in monster art** (on by default)
* **Replace art that comes from Nimble Nexus** (off by default)

## Scenes and adventures

Monster tokens placed on scenes keep their own copy of an image, so they need their own pass:

* **New scenes**, including scenes from an adventure import, get art on their placed monster tokens as they are created. A token is matched by its actor's name, or by its own name if the actor isn't in the world yet. Only the image and token ring change; position, size and everything else stay as they are. Tokens that already use art you chose are left alone.
* **Scenes already in your world:** run this as a GM macro. Pass `{ dryRun: true }` first to see what would change.

```js
game.modules.get("nimble-pathfinder-tokens").api.applyArtToScenes()
```

## Monsters already in your world

Run this as a GM macro to give existing monsters art. Pass `{ dryRun: true }` to see how many would change first.

```js
game.modules.get("nimble-pathfinder-tokens").api.applyArtToWorldActors()
```

