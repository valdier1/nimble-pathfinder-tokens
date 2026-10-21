# Version 1.1 aka Nexus ready
* Verified for Foundry v14.
* Monsters imported from Nimble Nexus get token art as they are created, matched by monster name.
* Legendary monsters are now mapped, plus the Nimble monsters that had no art yet.
* Optional art from Pathfinder Tokens: NPC Core, Monster Core, Monster Core 2 and Draconic Codex. If one of those modules isn't installed, its art is skipped and the next choice is used.
* Fixed the Gnoll using zombie art.
* Custom art ships inside the module for Goblin Ratrider, Dregatha, Bandit Ice Mage, Bandit Fire Mage, Book Mimic, Door Mimic, Living Glacier, Psionic Despot and Cerebral Hulks. It is used ahead of Pathfinder art, including for Nexus monsters with no Pathfinder art. An optional extra folder setting lets you try new art before it's built in.
* New settings: turn creation art on or off, keep Nimble's built-in art, keep art that comes from Nexus.
* Monster tokens placed on scenes get art too, including scenes from an adventure import. A second macro updates scenes already in the world: `game.modules.get("nimble-pathfinder-tokens").api.applyArtToScenes()`
* Macro to apply art to monsters already in the world: `game.modules.get("nimble-pathfinder-tokens").api.applyArtToWorldActors()`

# Version 1.0 aka GMG monster ready
* Most monster have now art, except those that should have if from another Paizo token module, like cultist, druids, etc..

# Version 0.9 aka Here we go
* Initial testing release, forcing release build (II)
