# Nimble - Pathfinder Tokens

A simple module that maps the tokens from the [Pathfinder Tokens: Bestiaries](https://www.foundryvtt.store/products/pf2e-tokens-bestiaries) module (commercial) to the Nimble System built-in actors.

In simple words, it allows you to use your monster tokens from Paizo with Nimble.

## What it does

* **Compendium art.** Monsters in Nimble's monster and legendary compendiums show Pathfinder art, using Foundry's compendium art mapping.
* **Art on import.** Monsters created in the world, including Nimble Nexus imports, get art matched by name when they are created.
* **Optional token modules.** Pathfinder Tokens: NPC Core, Monster Core, Monster Core 2 and Draconic Codex add more choices. Each monster lists its art in order of preference and the first one from an installed, enabled module is used.

## Settings

* **Apply art to new monsters** (on by default)
* **Replace Nimble's built-in monster art** (on by default)
* **Replace art that comes from Nimble Nexus** (off by default)

## Monsters already in your world

Run this as a GM macro to give existing monsters art. Pass `{ dryRun: true }` to see how many would change first.

```js
game.modules.get("nimble-pathfinder-tokens").api.applyArtToWorldActors()
```

