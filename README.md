<div align="center">

![Mewtwo](https://i.ibb.co/qfKMGc9/Mewtwo-Gen1-NN.png)

# **PURE HACKMONS: NO NERFS**

![Eternamax](https://i.ibb.co/GfpjyjLP/Emax-Gen8-NN.png)

*Where every Pokémon reaches their peak potential*

[![Pokemon Showdown](https://img.shields.io/badge/Pokemon-Showdown-orange)](https://pokemonshowdown.com/)
[![OG PH Format](https://img.shields.io/badge/Format-Pure%20Hackmons-red)](https://www.smogon.com/dex/ss/formats/pure-hackmons/)

</div>

---

## About

Pure Hackmons: No Nerfs is a Pokémon battling format and server where every move, ability, and Pokémon across all generations is legal and restored to its peak. Many later-generation stat and move nerfs are reversed, the Gen 1 Special split is undone, and a wide range of formats is supported, including Pure Hackmons, Balanced Hackmons, Wondrous Hackmons, NatDex, Champions, and No Nerfs variants across every generation, with full teambuilder support.

This repository bundles the Pokémon Showdown server and web client together with the Pure Hackmons No Nerfs modifications.

---

## Repository Structure

| Directory | Description |
|---|---|
| `pokemon-showdown/` | The game server. Upstream Pokémon Showdown with the Pure Hackmons No Nerfs mod in `data/mods/phnn/` and custom formats in `config/formats.ts`. |
| `pokemon-showdown-client/` | The web client. The upstream Pokémon Showdown client, included directly in this repository. |
| `showdex/` | A vendored copy of the Showdex damage calculator with Pure Hackmons No Nerfs customizations. |

The server and client are both included as regular folders rather than submodules. The `pokemon-showdown/` directory is tracked as a git subtree of upstream Pokémon Showdown, with the custom files (`config/formats.ts` and `data/mods/phnn/`) layered on top.

---

## Contributors

**Main Contributors:**
- **isleep2late** - Community Indentured Servant
- **ifwih** - Coleader and Developer
- **electra** - Lead Developer of Wondrous Hackmons, Co-Creator of Pure Hackmons No Nerfs
- **Enigmatist** - Co-Creator of No Nerfs Generation, #1 Ranked Hackmons Player
- **Alex BB** - Contributor

**External recognition of those who made this possible:**
- **Zarel** - Showdown Owner and Developer, along with staff: https://pokemonshowdown.com/credits
- **Doshidak** - Showdex Developer: https://github.com/doshidak/showdex
- **rby2k20** - Gen 1/2 Doubles implementation: https://github.com/rby2k20/pokemon-showdown
- **MathyFurret** - Rotations implementation: https://github.com/smogon/pokemon-showdown-client/pull/1944 and https://github.com/smogon/pokemon-showdown/pull/8677

**Special Thanks:**
- **Siphonaptera** for leading the [Gen 8] Unified project
- **psim tseng** for artistic contribution and leadership
- **PenUltimate Tast** for Hackmons.com database management as site admin
- **Wyrd & Viola Lunala** for promoting the server and leadership
- **ProKameron** for contributing to the bot and leadership
- **aidan amoongus** for Room Intros and leadership
- The Pure Hackmons community for additional feedback

[Join our Discord](https://discord.gg/hackmons)

---

## License

This project is a modification of Pokémon Showdown and Showdex and is licensed under AGPL-3.0. Pokémon and all related properties are (c) The Pokemon Company / Nintendo / Creatures Inc. / GAME FREAK inc.
