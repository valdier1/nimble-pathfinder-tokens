# Nimble - Pathfinder Tokens

A simple module that maps the tokens from the [Pathfinder Tokens: Bestiaries](https://www.foundryvtt.store/products/pf2e-tokens-bestiaries) module (commercial) to the Nimble System built-in actors.

In simple words, it allows you to use your monster tokens from Paizo with Nimble.

## What it does

* **Compendium art.** Monsters in Nimble's monster and legendary compendiums show Pathfinder art, using Foundry's compendium art mapping.
* **Art on import.** Monsters created in the world, including Nimble Nexus imports, get art matched by name when they are created.
* **Optional token modules.** Pathfinder Tokens: NPC Core, Monster Core, Monster Core 2 and Draconic Codex add more choices. Each monster lists its art in order of preference and the first one from an installed, enabled module is used.

## Your own art

Put your own monster art in a folder in Foundry's user data, `custom-tokens` by default (the same level as `modules` and `worlds`). Name each file after the monster:

* `Goblin Ratrider.png`: portrait (actor image)
* `Goblin Ratrider-token.png`: token image. If there's no token file, the portrait is used for the token too.
* `Goblin Ratrider-subject.png` (optional): a cutout for Foundry's token ring. Without it, the token is used as is and the ring is turned off.

Case, spaces, hyphens and punctuation don't matter, so `Goblin-rat-rider.png` matches "Goblin Ratrider". Your art is used ahead of Pathfinder art, and it also works for Nexus monsters that have no Pathfinder art at all. One level of subfolders is read too. New files are picked up when Foundry reloads, or straight away with `game.modules.get("nimble-pathfinder-tokens").api.reloadCustomArt()`.

## Settings

* **Apply art to new monsters** (on by default)
* **Your art folder** (`custom-tokens` by default; leave empty to turn it off)
* **Use your art first** (on by default)
* **Replace Nimble's built-in monster art** (on by default)
* **Replace art that comes from Nimble Nexus** (off by default)

## Monsters already in your world

Run this as a GM macro to give existing monsters art. Pass `{ dryRun: true }` to see how many would change first.

```js
game.modules.get("nimble-pathfinder-tokens").api.applyArtToWorldActors()
```

