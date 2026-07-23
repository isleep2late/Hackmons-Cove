<div align="center">

![Mewtwo](https://i.ibb.co/qfKMGc9/Mewtwo-Gen1-NN.png)

# **HACKMONS COVE**

![Eternamax](https://i.ibb.co/GfpjyjLP/Emax-Gen8-NN.png)

*Where every Pokémon reaches their peak potential*

[![Pokemon Showdown](https://img.shields.io/badge/Pokemon-Showdown-orange)](https://pokemonshowdown.com/)
[![OG PH Format](https://img.shields.io/badge/Format-Pure%20Hackmons-red)](https://www.smogon.com/dex/ss/formats/pure-hackmons/)

</div>

---

## About

Hackmons Cove is the official repository of the Hackmons Cove Showdown server, housing a modded version of Smogon's Pokemon Showdown, Client, and Calculator with Showdex support all bundled together. Our server officially hosts all standardized Pure Hackmons and Balanced Hackmons formats developed by the Smogon community. We also host Pure Hackmons: No Nerfs.

Pure Hackmons: No Nerfs is a Pokémon battling format where every move, ability, and Pokémon across all generations is legal and restored to its peak. Many later-generation stat and move nerfs are reversed, the Gen 1 Special split is undone, and abilities like Gale Wings and Prankster revert to their original power (Gen 6) while Soul Dew boosts the Latios and Latias species' Special Attack and Special Defense by 50%.

Hackmons Cove is also proud to be the only known community that officially supports SpaceWorld '97, a real Pokemon pseudo-generation based on a beta version of Gold/Silver from 1997. Hackmons Cove boasts a true-to-the-game set of mechanics for this generation that no other Showdown server supports as of July 2026. We hope that other communities who want their own implementation of SpaceWorld studies our repository. You are of course welcome to use our open sourced code under the AGPL-3.0 license.

Additionally, a wide range of formats are supported, including Custom Game, Custom Disguises, Gen 1 Disguises, Gen 2 Statuses, Gen 3 BH AAA (Balanced Hackmons Almost Any Ability), Gen 4 Rage, Gen 6 No Limit, and Gen 8 255 (SwSh, BDSP, and Unified). Our client also supports the innovative "Infinite Mode" where you can send out more Pokemon to battle after you have lost, additional generational drop-down menus per format, and a custom rules text box when challenging other players so you can customize the rules to what you want!

If you enjoy our work, please consider supporting our community by [joining our Discord server](https://discord.gg/hackmons) or signing up for free to be a member [on our website.](https://hackmons.com)

*Hackmons Cove, Hackmons Haven, and Hackmons Hub are NOT affiliated with Smogon. Our community resides in hackmons.com, purehackmons.com, balancedhackmons.com, and [our subreddit r/purehackmons.](https://reddit.com/r/purehackmons)*

---

## Repository Structure

| Directory | Description |
|---|---|
| `pokemon-showdown/` | The game server. Upstream Pokémon Showdown with the Pure Hackmons No Nerfs mod in `data/mods/phnn/` and custom formats in `config/formats.ts`. |
| `pokemon-showdown-client/` | The web client. The upstream Pokémon Showdown client, included directly in this repository. |
| `pokemon-showdown-client/damage-calc/` | A modified copy of the Smogon damage calculator with Pure Hackmons No Nerfs and SpaceWorld customizations. |
| `pokemon-showdown-client/showdex/` | A vendored copy of the Showdex damage calculator with Pure Hackmons No Nerfs customizations. Its build outputs are generated per machine and are not tracked. |

The server and client are both included as regular folders rather than submodules. The `pokemon-showdown/` directory is tracked as a git subtree of upstream Pokémon Showdown, with the custom files (`config/formats.ts` and `data/mods/phnn/`) layered on top.

---

## Contributors

**Main Contributors:**
- **isleep2late** - Community Indentured Servant
- **ifwih** - Coleader and Developer
- **Sonja_Krystal** - Implemented SpaceWorld'97 and created the Shadow Mewtwo/Mega X & Arceus front battle sprites!

**External recognition of those who made this possible:**
- **Zarel** - Showdown Owner and Developer, along with staff: https://pokemonshowdown.com/credits
- **Doshidak** - Showdex Developer: https://github.com/doshidak/showdex
- **rby2k20** - Gen 1/2 Doubles implementation and the Spaceworld '97 mod that our SpaceWorld mechanics build on: https://github.com/rby2k20/pokemon-showdown
- **MathyFurret** - Rotations implementation: https://github.com/smogon/pokemon-showdown-client/pull/1944 and https://github.com/smogon/pokemon-showdown/pull/8677
- **ShadowGate31** - Creation of Shadow Lugia sprites for fangames: https://www.deviantart.com/shadowgate31/art/Shadow-Lugia-sprites-for-fangames-410361664
- **Othienka** - Creation of Armored Mewtwo sprites for fangames: https://www.deviantart.com/othienka/art/Armored-Mewtwo-Battle-Sprite-and-Back-Sprite-v2-460897939 & https://www.deviantart.com/othienka/art/Armored-Mewtwo-V3-594576816

**Special Thanks:**
- **Siphonaptera** for leading the [Gen 8] Unified project
- **psim tseng** for artistic contribution and leadership
- **Penultimate Toast** for Hackmons.com database management as site admin
- **Wyrd & Viola Lunala** for promoting the server and leadership (And Wyrd for making the SHADOW type badge)
- **ProKameron** for contributing to the bot and leadership
- **aidan amoongus** for Room Intros and leadership
- **Enigmatist** for early contributions to the project
- The Pure Hackmons community for additional feedback

[Join our Discord](https://discord.gg/hackmons)

---

## License

This project is a modification of Pokémon Showdown and Showdex and is licensed under AGPL-3.0. Pokémon and all related properties are (c) The Pokemon Company / Nintendo / Creatures Inc. / GAME FREAK inc.
