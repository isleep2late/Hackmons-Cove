<div align="center">

![Mewtwo](https://i.ibb.co/qfKMGc9/Mewtwo-Gen1-NN.png)

# **PURE HACKMONS: NO NERFS**

![Eternamax](https://i.ibb.co/GfpjyjLP/Emax-Gen8-NN.png)

*Where every Pokémon reaches their peak potential*

[![Pokemon Showdown](https://img.shields.io/badge/Pokemon-Showdown-orange)](https://pokemonshowdown.com/)
[![OG PH Format](https://img.shields.io/badge/Format-Pure%20Hackmons-red)](https://www.smogon.com/dex/ss/formats/pure-hackmons/)

</div>

---

## 📖 Table of Contents

- [Introduction](#introduction)
- [Core Principles](#core-principles)
- [Repository Structure](#repository-structure)
- [Installation & Setup](#installation--setup)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
  - [Detailed Setup](#detailed-setup)
  - [Keeping Up with Upstream Showdown](#keeping-up-with-upstream-showdown)
  - [Making Your Server Public with Cloudflare](#making-your-server-public-with-cloudflare)
- [Format Details](#format-details)
  - [Pokémon Restorations](#pokémon-restorations)
  - [Move Restorations](#move-restorations)
  - [Ability Restorations](#ability-restorations)
  - [Item Restorations](#item-restorations)
  - [Status Condition Changes](#status-condition-changes)
  - [Mechanics Restorations](#mechanics-restorations)
  - [Format Rules](#format-rules)
- [Contributors](#contributors)
- [Forking & Maintaining Your Own Copy](#forking--maintaining-your-own-copy)
- [Additional Information](#additional-information)

---

## 🌟 Introduction

Close your eyes. Imagine a Pokémon format where the sky was limitless, where you could use all the broken mechanics across every generation of Pokémon games. Imagine a format where Mewtwo's Special Defense was 154, where Zacian-Crowned had an Attack of 170, and where moves like Surf have 95 Base Power, while Thunder has 120 Base Power. 

Now open your eyes. **Welcome to Pokémon Pure Hackmons: No Nerfs**, the format where every move is legal, every ability is legal, and every Pokémon across all generations can be played at their peak.

---

## ⚡ Core Principles

- **Every Pokémon gets access to every move, ability, and hold item from every generation**
- **All stats, moves, and abilities function at their peak from their strongest generation**
- **Signature restrictions are removed** (Dark Void, Permanent Megas, etc.)
- **All battle mechanics coexist** (Mega-evolutions/Primal, Z-moves, Dynamax/Gigantamax*, Terastallize, and permanent forms of Pokémon such as Ultra-Necrozma, Eternamax, etc.)
- **Classic broken mechanics return** (Toxic/Leech Seed exploit, Paraconfusion buff, Permafreeze, etc.)
- **Support for Singles, Doubles, and Triples**

> *Note: Dynamax/Gigantamax and Terastallization coexist in Gen 9 PHNN, but each Pokémon may only do one of them per battle (they are mutually exclusive). The choice is made through the Tera type: leave a Pokémon's Tera type **unset** to have it **Dynamax**, or assign it **any** Tera type (including Stellar or its own primary type) to **Terastallize** instead. **Terapagos**, which has a natural Stellar Tera type, therefore Terastallizes and cannot Dynamax. Mega-Evolving / Ultra-Necrozma'ing still takes priority and will NOT allow an additional Terastallize or Dynamax afterwards.

---

## 📂 Repository Structure

```
PureHackmonsNoNerfs/
├── pokemon-showdown/              # Full upstream Pokémon Showdown server (subtree)
│   ├── config/
│   │   └── formats.ts             # Custom PHNN format definitions (our override)
│   ├── data/
│   │   └── mods/
│   │       └── phnn/              # The Pure Hackmons No Nerfs mod
│   │           ├── abilities.ts
│   │           ├── conditions.ts
│   │           ├── formats-data.ts
│   │           ├── items.ts
│   │           ├── moves.ts
│   │           ├── pokedex.ts
│   │           ├── scripts.ts
│   │           └── typechart.ts
│   ├── server/
│   ├── sim/
│   └── ...                        # All other upstream showdown files
├── pokemon-showdown-client/       # The Pokémon Showdown web client (now part of this repo)
├── showdown-cloudflare.*          # Start Cloudflare tunnel (.sh / .bat / .command)
├── type_node_pokemon-showdown.*   # Start the showdown server (.sh / .bat / .command)
└── README.md
```

This repo bundles the Pokémon Showdown **server** and **web client** into a single project so everything needed for Pure Hackmons No Nerfs lives in one place:

| Directory | Upstream Source | Role |
|---|---|---|
| `pokemon-showdown/` | [smogon/pokemon-showdown](https://github.com/smogon/pokemon-showdown) | The game server. Our PHNN mod (`data/mods/phnn/`) and custom `config/formats.ts` are applied on top. |
| `pokemon-showdown-client/` | [smogon/pokemon-showdown-client](https://github.com/smogon/pokemon-showdown-client) | The official Showdown web client, now included directly in this repo (as a regular folder, not a submodule) for PHNN-specific client/UI work. |

Both live as regular folders in this repository. If you fork or clone this repo, see [**MAINTENANCE.md**](MAINTENANCE.md) for how to pull upstream updates.

> **The leftovers-again AI bot has been removed** from this repo — the server now runs a different, improved bot. Leftovers-again may return later as its **own separate repository**. If you still want the old bot code in the meantime, contact **isleep2late** (see [Contributors](#contributors) or the [Discord](https://discord.gg/mTwgNNtE6a)).

---

## 🚀 Installation & Setup

### Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v22.0.0 or higher — **required**, the server will not start on older versions)
- [Git](https://git-scm.com/)
- A text editor (VS Code, Sublime Text, etc.)

### Quick Start

```bash
# 1. Clone this repository
git clone https://github.com/isleep2late/PureHackmonsNoNerfs.git
cd PureHackmonsNoNerfs

# 2. Install Pokémon Showdown dependencies
cd pokemon-showdown
npm install

# 3. Start the server
node pokemon-showdown start

# 4. Open http://localhost:8000 in your browser and play!
```

That's it! The PHNN mod and custom formats are already in place. Select **[Gen 9] Pure Hackmons No Nerfs** (or any other Hackmons/Wondrous Hackmons format) from the format picker and start battling.

---

### Detailed Setup

#### Step 1: Clone the Repository

```bash
git clone https://github.com/isleep2late/PureHackmonsNoNerfs.git
cd PureHackmonsNoNerfs
```

#### Step 2: Install Pokémon Showdown Dependencies

```bash
cd pokemon-showdown
npm install
```

This installs all the Node.js packages that Showdown needs to run.

#### Step 3: Start the Server

From the `pokemon-showdown/` directory:

```bash
node pokemon-showdown start
```

Your local server should now be running at `http://localhost:8000`.

#### Step 4: Connect and Play

1. Open your web browser and go to `http://localhost:8000`
2. Click on **"Choose a format"**
3. Look under the **"Hackmons Formats"** section
4. Select **[Gen 9] Pure Hackmons No Nerfs** (or any other available PHNN format)
5. Build a team or import one, and start battling!

> **Tip:** In Pure Hackmons No Nerfs, every Pokémon can have 252 EVs in every stat, any move, and any ability. Go wild!

---

### Leftovers-Again Bot (Removed)

The **leftovers-again** AI bot that used to ship with this repo has been **removed** — the server now runs a different, improved bot setup. Leftovers-again may come back later as its **own separate repository**. If you still want the old bot code in the meantime, reach out to **isleep2late** via the [Discord](https://discord.gg/mTwgNNtE6a) (or see [Contributors](#contributors)).

---

### Keeping Up with Upstream Showdown

Since the `pokemon-showdown/` directory is managed as a git subtree, you can pull the latest changes from the official Pokémon Showdown repository at any time:

```bash
git subtree pull --prefix=pokemon-showdown https://github.com/smogon/pokemon-showdown.git master --squash
```

This will merge upstream changes into your local `pokemon-showdown/` directory while preserving your custom files:
- `pokemon-showdown/config/formats.ts` (PHNN format definitions)
- `pokemon-showdown/data/mods/phnn/` (the PHNN mod itself)

If upstream changes touch the same files as your customizations, you'll get a merge conflict which you can resolve manually (your customizations should take priority).

After pulling upstream updates, remember to rebuild:

```bash
cd pokemon-showdown
npm install  # in case dependencies changed
```

---

### Making Your Server Public with Cloudflare

Want to play with friends? Make your local server accessible over the internet using Cloudflare Tunnels!

#### Quick Tunnel (Easiest - No Account Needed)

For quick testing, you can skip account setup and just run:

```bash
cloudflared tunnel --url http://localhost:8000
```

This gives you a temporary `*.trycloudflare.com` URL. Share it with friends to play together. The URL changes every time you restart the tunnel.

#### Full Tunnel Setup (Persistent URL)

##### Step 1: Install Cloudflared

**Windows:**
1. Download cloudflared from the [Cloudflare releases page](https://github.com/cloudflare/cloudflared/releases)
2. Extract the downloaded file
3. Move `cloudflared.exe` to a folder in your PATH (e.g., `C:\Windows\System32`)

**macOS:**
```bash
brew install cloudflared
```

**Linux:**
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

##### Step 2: Create a Cloudflare Account & Authenticate

1. Go to [cloudflare.com](https://www.cloudflare.com/) and sign up for a free account
2. Run `cloudflared tunnel login` - this opens a browser window to authenticate

##### Step 3: Create and Configure a Tunnel

```bash
# Create the tunnel (note the tunnel ID it gives you)
cloudflared tunnel create pokemon-showdown

# Route DNS to your tunnel
cloudflared tunnel route dns pokemon-showdown your-domain.com
```

Create a config file at `~/.cloudflared/config.yml`:

```yaml
tunnel: YOUR-TUNNEL-ID
credentials-file: /path/to/.cloudflared/YOUR-TUNNEL-ID.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:8000
  - service: http_status:404
```

##### Step 4: Start the Tunnel

```bash
cloudflared tunnel run pokemon-showdown
```

Your Pokémon Showdown server is now publicly accessible!

##### Step 5: Configure Pokemon Showdown for Cloudflare Tunnel

**IMPORTANT:** To make Pokemon Showdown work properly with Cloudflare Tunnel, you need to configure it to trust the proxy.

1. Copy `pokemon-showdown/config/config-example.js` to `pokemon-showdown/config/config.js` if you haven't already
2. The `config-example.js` has been updated to include the necessary proxy configuration by default:

```javascript
exports.proxyip = ['127.0.0.1', '::1'];
```

This setting tells Pokemon Showdown to trust requests from localhost (where Cloudflare Tunnel runs) and read the real client IP from the `X-Forwarded-For` header. **Without this setting, you may experience 404 errors and connection issues.**

**Note:** This change has been made to the default config-example.js for the convenience of users running behind Cloudflare Tunnel or other reverse proxies. If you're running the server directly without a proxy, you can set this back to `false` for slightly better security.

#### Keeping the Tunnel Running

**On Windows (using NSSM):**
```bash
nssm install CloudflaredTunnel "C:\path\to\cloudflared.exe" tunnel run pokemon-showdown
nssm start CloudflaredTunnel
```

**On Linux/macOS:**
Use systemd or create a startup script to run cloudflared on boot.

#### Convenience Scripts (All Platforms)

This repo includes ready-to-use launcher scripts for all three major operating systems:

| Purpose | Linux (.sh) | Windows (.bat) | macOS (.command) |
|---|---|---|---|
| Start the Showdown server | `type_node_pokemon-showdown.sh` | `type_node_pokemon-showdown.bat` | `type_node_pokemon-showdown.command` |
| Start Cloudflare tunnel | `showdown-cloudflare.sh` | `showdown-cloudflare.bat` | `showdown-cloudflare.command` |

##### Setup by OS

**Linux:**
```bash
# Make scripts executable (one-time)
chmod +x *.sh

# Double-click or run from terminal
./type_node_pokemon-showdown.sh
```
You can also create desktop shortcuts (`.desktop` files) that point to these scripts for one-click launching.

**Windows:**
Simply double-click any `.bat` file to run it. You can also create desktop shortcuts:
1. Right-click the `.bat` file → **Send to** → **Desktop (create shortcut)**
2. Optionally rename the shortcut and change its icon

**macOS:**
```bash
# Make scripts executable (one-time)
chmod +x *.command
```
Double-click any `.command` file to open it in Terminal. macOS may ask you to allow it the first time — go to **System Settings → Privacy & Security** and click **Open Anyway**.

---

## 📋 Format Details

### Pokémon Restorations

#### Base Stat Restorations

**Gen 1 Special Stat Split Fixes**

The Gen 1 Special stat was split into Special Attack and Special Defense in Gen 2. This mod restores the original Gen 1 Special stat, giving many Pokémon significant buffs:

<details>
<summary><b>Click to view all Gen 1 restorations (95 Pokémon affected)</b></summary>

- **Abra**: SpDef 55 → 105 (+50)
- **Alakazam**: SpDef 85 → 135 (+50)
- **Articuno**: SpDef 85 → 125 (+40)
- **Bellsprout**: SpDef 35 → 70 (+35)
- **Chansey**: SpAtk 35 → 105 (+70)
- **Cloyster**: SpDef 45 → 85 (+40)
- **Dewgong**: SpAtk 70 → 95 (+25)
- **Diglett**: SpAtk 35 → 45 (+10)
- **Drowzee**: SpAtk 43 → 90 (+47)
- **Dugtrio**: SpAtk 50 → 70 (+20)
- **Eevee**: SpAtk 45 → 65 (+20)
- **Exeggcute**: SpDef 45 → 60 (+15)
- **Exeggutor**: SpDef 65 → 125 (+60)
- **Flareon**: SpAtk 95 → 110 (+15)
- **Gastly**: SpDef 35 → 100 (+65)
- **Gengar**: SpDef 75 → 130 (+55)
- **Gloom**: SpDef 75 → 85 (+10)
- **Golbat**: SpAtk 65 → 75 (+10)
- **Goldeen**: SpAtk 35 → 50 (+15)
- **Gyarados**: SpAtk 60 → 100 (+40)
- **Haunter**: SpDef 55 → 115 (+60)
- **Horsea**: SpDef 25 → 70 (+45)
- **Hypno**: SpAtk 73 → 115 (+42)
- **Jolteon**: SpDef 95 → 110 (+15)
- **Kabutops**: SpAtk 65 → 70 (+5)
- **Kadabra**: SpDef 70 → 120 (+50)
- **Kangaskhan**: SpAtk 40 → 80 (+40)
- **Koffing**: SpDef 45 → 60 (+15)
- **Lapras**: SpAtk 85 → 95 (+10)
- **Magikarp**: SpAtk 15 → 20 (+5)
- **Magnemite**: SpDef 55 → 95 (+40)
- **Magneton**: SpDef 70 → 120 (+50)
- **Mewtwo**: SpDef 90 → 154 (+64) ⚡
- **Moltres**: SpDef 85 → 125 (+40)
- **Ninetales**: SpAtk 81 → 100 (+19)
- **Oddish**: SpDef 65 → 75 (+10)
- **Omanyte**: SpDef 55 → 90 (+35)
- **Omastar**: SpDef 70 → 115 (+45)
- **Paras**: SpAtk 45 → 55 (+10)
- **Parasect**: SpAtk 60 → 80 (+20)
- **Pikachu**: SpDef 40 → 50 (+10)
- **Raichu**: SpDef 80 → 90 (+10)
- **Sandshrew**: SpAtk 20 → 30 (+10)
- **Sandslash**: SpAtk 45 → 55 (+10)
- **Seadra**: SpDef 45 → 95 (+50)
- **Seaking**: SpAtk 65 → 80 (+15)
- **Seel**: SpAtk 45 → 70 (+25)
- **Shellder**: SpDef 25 → 45 (+20)
- **Starmie**: SpDef 85 → 100 (+15)
- **Staryu**: SpDef 55 → 70 (+15)
- **Tangela**: SpDef 40 → 100 (+60)
- **Tauros**: SpAtk 40 → 70 (+30)
- **Tentacool**: SpDef 50 → 100 (+50)
- **Tentacruel**: SpDef 80 → 120 (+40)
- **Vaporeon**: SpDef 95 → 110 (+15)
- **Venomoth**: SpDef 75 → 90 (+15)
- **Victreebel**: SpDef 60 → 100 (+40)
- **Vileplume**: SpDef 90 → 100 (+10)
- **Vulpix**: SpAtk 50 → 65 (+15)
- **Weepinbell**: SpDef 45 → 85 (+40)
- **Weezing**: SpDef 70 → 85 (+15)
- **Zapdos**: SpDef 90 → 125 (+35)
- **Zubat**: SpAtk 30 → 40 (+10)

</details>

**Later Generation Base Stat Nerfs Reversed**

- **Aegislash (Blade)**: Attack 140 → 150, Special Attack 140 → 150
- **Aegislash (Shield)**: Defense 140 → 150, Special Defense 140 → 150
- **Zacian (Hero)**: Atk 120 → 130
- **Zacian (Crowned)**: Atk 150 → 170 ⚔️
- **Zamazenta (Hero)**: Atk 120 → 130
- **Zamazenta (Crowned)**: Atk 120 → 130, Def & SpDef 140 → 145

**Treasures of Ruin (Pre-Nerf Stats)**
- **Chien-Pao**: 130 Atk
- **Wo-Chien**: 90 Atk, 100 SpAtk
- **Chi-Yu**: 145 SpAtk
- **Ting-Lu**: 165 HP, 130 Def, 55 SpAtk

**Additional Stat Buffs**
- **Cresselia**: Def 110 → 120, SpDef 120 → 130

#### Return of Unavailable Pokémon

- **PokéStar Studio Pokémon** (All 600 BST / Gen 5): Black Belt, Black Door, Brycen-Man, F-00, Humanoid, Majin, MT, MT2, Monica, Monster, Transport, UFO, UFO 2, White Door
- **Eternatus-Eternamax** (Gen 8) 🌟
- **MissingNo.** (Gen 1 Glitch Pokémon): Available with its original **Normal/Bird** typing
  - **Important**: You **cannot** Terastallize into Bird type (Bird type only exists on MissingNo.)

**Legends Z-A Stats to account for Huge Power / Pure Power**
- **Meditite**: 56 Atk
- **Medicham**: 84 Atk
- **Mega Medicham**: 140 Atk
- **Mega Mawile**: 147 Atk
- **Cherrim Sunshine**: 90 Atk and 117 SpDef

**Legends Z-A DLC Mega Evolutions**

All 19 new Mega Evolutions from the Legends Z-A DLC are now available:
- **Mega Raichu-X** (Electric/Fighting, BST 585): Lightning Rod ability
- **Mega Raichu-Y** (Electric/Psychic, BST 585): Surge Surfer ability
- **Mega Chimecho** (Psychic/Steel, BST 555): Filter ability
- **Mega Absol-Z** (Dark/Ghost, BST 565): Shadow Tag ability (alternative to standard Mega Absol)
- **Mega Staraptor** (Fighting/Flying, BST 585): No Guard ability
- **Mega Garchomp-Z** (Dragon, BST 700): Sheer Force ability, Speed 151 (alternative to standard Mega Garchomp)
- **Mega Lucario-Z** (Fighting/Steel, BST 625): Adaptability ability, Speed 151 (enhanced version of Mega Lucario)
- **Mega Heatran** (Fire/Steel, BST 700): Already available
- **Mega Darkrai** (Dark, BST 700): Already available
- **Mega Golurk** (Ground/Ghost, BST 583): Iron Fist ability
- **Mega Meowstic** (Psychic, BST 566): Technician ability
- **Mega Crabominable** (Fighting/Ice, BST 578): Iron Fist ability
- **Mega Golisopod** (Bug/Steel, BST 630): Filter ability
- **Mega Magearna** (Steel/Fairy, BST 700): Soul-Heart ability
- **Mega Zeraora** (Electric, BST 700): Already available
- **Mega Scovillain** (Grass/Fire, BST 586): Chlorophyll ability
- **Mega Baxcalibur** (Dragon/Ice, BST 700): Thermal Exchange ability
- **Mega Tatsugiri** (Dragon/Water, BST 575): Storm Drain ability
- **Mega Glimmora** (Rock/Poison, BST 625): Toxic Debris ability

> Mega-Zygarde (from Legends Z-A) as well as all additional Z-A Megas are now available on Showdown.

---

### Move Restorations

#### Power Changes

- **Surf/Thunderbolt/Flamethrower/Ice Beam/Muddy Water**: 90 → 95 BP
- **Psychic**: 90 BP
- **Blizzard/Hydro Pump/Thunder/Fire Blast/Hurricane**: 110 → 120 BP
- **Draco Meteor/Leaf Storm/Overheat**: 130 → 140 BP
- **Sky Attack/Solar Beam**: → 200 BP
- **Magma Storm**: → 120 BP
- **Glacial Lance**: 120 → 130 BP
- **Dig/Heat Wave/Meteor Mash**: → 100 BP
- **Aura Sphere/Dragon Pulse**: → 90 BP
- **Sucker Punch/Wicked Blow**: → 80 BP
- **Mega Drain**: → 75 BP
- **Grassy Glide**: → 70 BP
- **Tackle/Feint**: → 50 BP
- **Absorb**: → 40 BP
- **Self-Destruct/Explosion**: Cause opposing defenses to be halved
- **Hidden Power**: Back to variable BP based on IVs (30-70)

**Pokémon Champions BP buffs (ported in)**

<details>
<summary><b>View all Champions-derived BP buffs</b></summary>

- **Anchor Shot**: 80 → 90 BP
- **Apple Acid**: 80 → 90 BP
- **Beak Blast**: 100 → 120 BP
- **Bone Rush**: 25 → 30 BP (per hit)
- **Dragon Hammer**: 90 → 100 BP
- **Fire Lash**: 80 → 90 BP
- **First Impression**: 90 → 100 BP (turn-1 selection rules unchanged)
- **Gear Grind**: 50 → 60 BP (per hit)
- **Grav Apple**: 80 → 90 BP
- **Hyper Drill**: 100 → 120 BP
- **Infernal Parade**: 60 → 65 BP
- **Mountain Gale**: 100 → 120 BP
- **Night Daze**: 85 → 90 BP
- **Psyshield Bash**: 70 → 90 BP
- **Revelation Dance**: 90 → 100 BP
- **Snipe Shot**: 80 → 85 BP
- **Spirit Shackle**: 80 → 90 BP
- **Triple Dive**: 30 → 35 BP (per hit)
- **Trop Kick**: 70 → 85 BP

</details>

#### Accuracy Buffs

**Traditional Accuracy Nerfs Reversed**
- **Hypnosis**: 60 → 70%
- **Dark Void**: 50 → 80%
- **Swagger**: 85 → 90%
- **Will-O-Wisp**: 85 → 100% (Only Z-A accuracy buff we are implementing based on community feedback)
- **Thunder Wave**: 90 → 100%
- **Bide**: Never misses
- **Memento**: Never misses
- **Nightmare**: Never misses

> *Note: Legends Z-A introduced 100% accuracy for many moves in its real-time combat system. However, these accuracy buffs have been intentionally **excluded** from this mod (except for Will-O-Wisp) to maintain competitive balance. Thunder, Blizzard, Hurricane, Focus Blast, and other moves retain their standard accuracies.*

**Pokémon Champions accuracy buffs (ported in)**
- **Crabhammer**: 90 → 95%
- **Gear Grind**: 85 → 90%
- **Syrup Bomb**: 85 → 90%

#### PP Restorations

<details>
<summary><b>Click to view all PP restorations</b></summary>

**40 PP**
- Acid Armor (20 → 40)
- Covet (25 → 40)
- Growth (20 → 40)

**30 PP**
- Barrier (20 → 30)
- Extrasensory (20 → 30)
- Swords Dance (20 → 30)
- Tailwind (15 → 30)

**25 PP**
- Jump Kick (10 → 25)
- Submission (20 → 25)

**20 PP**
- Recover (10 → 20)
- Hi Jump Kick (10 → 20)
- Petal Dance (10 → 20)
- Thrash (10 → 20)
- Air Slash (15 → 20)
- Minimize (10 → 20)
- Sacred Sword (15 → 20)

**15 PP**
- Future Sight (10 → 15)
- Outrage (10 → 15)
- Synchronoise (10 → 15)
- Barb Barrage (10 → 15)
- Bitter Malice (10 → 15)
- Triple Arrows (10 → 15)

**10 PP**
- Lunar Blessing (5 → 10)
- Milk Drink (5 → 10)
- Rest (5 → 10)
- Roost (5 → 10)
- Shore Up (5 → 10)
- Slack Off (5 → 10)
- Soft-Boiled (5 → 10)

</details>

#### Secondary Effect Changes (Gen 1 Mechanics)

<details>
<summary><b>View all secondary effect changes</b></summary>

- **Psychic**: 33.2% chance to lower Special Attack AND Special Defense (was 10% SpDef only)
- **Blizzard**: 30% chance to freeze (was 10%)
- **Fire Blast**: 30% chance to burn (was 10%)
- **Sludge**: 40% chance to poison (was 30%)
- **Acid**: 33.2% chance to lower Defense (was 10%)
- **Aurora Beam**: 33.2% chance to lower Attack (was 10%)
- **Bubble**: 33.2% chance to lower Speed (was 10%)
- **Bubble Beam**: 33.2% chance to lower Speed (was 10%)
- **Constrict**: 33.2% chance to lower Speed (was 10%)
- **Razor Wind**: Increased crit ratio

</details>

#### Special Mechanics & Effects

<details>
<summary><b>View all move mechanic changes</b></summary>

- **King's Shield**: → -2 Atk if attacker makes contact
- **Leech Seed + Toxic**: Synergy from RBY returns (stacking damage!)
- **Amnesia**: Raises user's Special Defense AND Special Attack by two stages
- **Seismic Toss/Night Shade/Super Fang/SonicBoom/Counter/Bide**: Hits Ghost/Normal/Psychic types
- **Bind/Wrap/Clamp/Fire Spin**: Lasting 2-5 turns, dealing regular 15 BP damage, target unable to attack/switch (Gen 1)
- **Swift/Bide**: Hits during invulnerable Dig/Fly
- **Defog**: Can lower Evasion of target behind a substitute
- **Psywave**: Deals damage between 100-150% of level (80% accuracy) (Gen 1)
- **Spore**: Remove immunity from Grass, Overcoat, and Safety Goggles
- **Double-Edge**: Recoil ¼ damage instead of ⅓
- **Fire Fang**: Hits through Wonder Guard
- **Hyper Beam**: No recharge turn if target is KO'd
- **Substitute**: Blocks Curse; Giga Drain/Mega Drain/Absorb/Dream Eater misses
- **Sheer Cold**: Ice-types are no longer immune
- **Toxic Thread** *(Pokémon Champions port)*: Now lowers target's Speed by 2 stages instead of 1
- **Crush Claw / Dragon Claw / Metal Claw / Shadow Claw / Dire Claw** *(Pokémon Champions port)*: Gain the `slicing` flag, making them benefit from the Sharpness ability (Dire Claw retains its 50% status chance)

</details>

#### Targeting Changes (Doubles/Triples)

- **Surf**: Hits all adjacent opponents (not teammate)

#### Priority Changes

- **Roar/Whirlwind**: -6 → -1
- **Follow Me**: +2 → +3
- **Rage Powder**: +2 → +3

#### Removed Moves Returned

Aromatherapy, Autotomize, Crafty Shield, Dragon Hammer, Dual Chop, Flower Shield, Grudge, Hail, Laser Focus, Leaf Tornado, Magic Coat, Mind Reader, Nature Power, Power-Up Punch, Psycho Shift, Revenge, Skull Bash, Submission, Venom Drench, Vital Throw, **Return**, **Frustration**, **Pursuit**, and many more!

#### Z-Moves Restored

All signature Z-moves are back:
- Pulverizing Pancake (Snorlax)
- Catastropika (Pikachu)
- 10,000,000 Volt Thunderbolt (Pikachu)
- Stoked Sparksurfer (Raichu-Alola)
- Extreme Evoboost (Eevee)
- Soul-Stealing 7-Star Strike (Marshadow)
- Menacing Moonraze Maelstrom (Lunala)
- Light That Burns the Sky (Necrozma)
- Oceanic Operetta (Primarina)
- Guardian of Alola (Tapu)
- Genesis Supernova (Mew)
- Sinister Arrow Raid (Decidueye)
- Malicious Moonsault (Incineroar)
- Clangorous Soulblaze (Kommo-o)
- Let's Snuggle Forever (Mimikyu)
- Splintered Stormshards (Lycanroc)
- And all standard Z-moves!

#### Let's Go Exclusive Moves

**Partner Pikachu Moves:**
- Zippy Zap (80 BP, 10 PP)
- Splishy Splash
- Floaty Fall
- Pika Papow

**Partner Eevee Moves:**
- Bouncy Bubble (90 BP)
- Buzzy Buzz (90 BP)
- Sizzly Slide (90 BP)
- Glitzy Glow (90 BP)
- Baddy Bad (90 BP)
- Sappy Seed (100 BP, 100% acc)
- Freezy Frost (100 BP, 100% acc)
- Sparkly Swirl (120 BP, 100% acc)
- Veevee Volley

#### Legends: Arceus Exclusive Moves

- **Ceaseless Edge/Stone Axe**: High crit ratio and damages target with Splinters 2-4 turns
- **Lunar Blessing**: Increases evasion
- **Victory Dance**: No changes

#### Legends Z-A

- **Nihil Light**: 200 BP, 100% accuracy, ignores stat/sp def boosts AND hits fairies/ignores dragon immunity (Credit to Icy for figuring out a fix for this, as it currently doesn't work as intended in the original source code.)

#### G-Max Moves (Gen 8)

All G-Max moves are available. Every Gigantamax-capable Pokémon can use its G-Max move via Dynamax, and the three Galar-starter signature G-Max moves are additionally enhanced with their correct stats:

- **G-Max Drum Solo** (Rillaboom): 160 BP, 5 PP, ignores abilities
- **G-Max Fireball** (Cinderace): 160 BP, 5 PP, ignores abilities
- **G-Max Hydrosnipe** (Inteleon): 160 BP, 5 PP, ignores abilities

These three signature Gigantamax moves deal proper damage and ignore defensive abilities like Solid Rock, Filter, and Multiscale.

**Special Mechanics:**
- These moves break through Protect, Detect, King's Shield, Spiky Shield, Baneful Bunker, and Obstruct, dealing **25% damage** through the protection
- **Max Guard** fully blocks these moves (and Z-moves) with 0% damage
- Max Guard is now usable as a regular move (5 PP, doesn't require Dynamax)

#### Move Restrictions Removed

- **All signature moves**: Remove species locks - any Pokémon can learn any move (EXPERIMENTAL)
- Specific examples: **Dark Void**, **Hyperspace Fury**, **Aura Wheel** (Default Electric)

---

### Ability Restorations

#### Generation 9 Restorations

- **Hadron Engine/Orichalcum Pulse/Quark Drive/Protosynthesis**: Immune to Neutralizing Gas (pre-update)

#### Generation 8→9 Ability Nerfs Reversed

- **Battle Bond (Greninja)**: Restore original mechanics where Greninja transforms into Ash-Greninja permanently after KOing an opponent
- **Dauntless Shield/Intrepid Sword**: Activate on every switch-in, not just once per battle
- **Protean/Libero**: Remove once-per-switch limit - restore unlimited type changing
- **Transistor (Regieleki)**: 1.3x boost → 1.5x boost

#### Generation 7→8 Ability Nerfs Reversed

- **Disguise (Mimikyu)**: Remove HP damage - restore true immunity to first hit
- **Moody**: Restore original mechanics where it raises one random stat by 2 stages and lowers another by 1 stage each turn, including evasion and accuracy

#### Generation 6→7 Ability Nerfs Reversed

- **Aerilate/Pixilate/Refrigerate**: Restore original 1.3x damage multiplier (was reduced to 1.2x in Gen 7)
- **Gale Wings (Talonflame)**: Remove HP requirement - restore unlimited priority to Flying moves
- **Parental Bond (Kangaskhan)**: 25% second hit → 50% second hit. Z-moves and Max/G-Max moves also hit twice (second hit deals 50% damage and rolls its secondary effect again).
- **Prankster**: Remove Dark-type immunity - restore full effectiveness vs all types

#### Generation 5→6 Ability Nerfs Reversed

- **Weather Abilities**: Restore permanent weather (remove turn limits) for Drizzle, Drought, Sand Stream, Snow Warning

#### Generation 3→4 Ability Nerfs Reversed

All contact abilities and Shed Skin had their activation rates reduced from 33% in Gen 3 to 30% in Gen 4+. This mod restores the original 33% activation rate:

- **Cute Charm**: 30% → 33% chance to infatuate on contact
- **Effect Spore**: 30% → 33% chance to inflict status (sleep/paralysis/poison) on contact
- **Flame Body**: 30% → 33% chance to burn on contact
- **Poison Point**: 30% → 33% chance to poison on contact
- **Static**: 30% → 33% chance to paralyze on contact
- **Shed Skin**: 30% → 33% chance to cure status per turn

#### Earlier Generation Ability Nerfs Reversed

- **Magic Guard**: Restore original mechanics where it grants immunity to being fully paralyzed and prevents poisoning from Toxic Spikes
- **Arena Trap**: Restore original mechanics where it affects Ghost-types
- **Shadow Tag**: Restore original mechanics where it affects Ghost-types and other Shadow Tags

#### Ability Restrictions Removed

- Remove species locks - specific to Mimikyu (Disguise works on any Pokémon)
- Specific exceptions: Multitype/RKS
- Arceus/Castform + Protean/Libero works as intended

---

### Item Restorations

#### Classic Items Return

1. **Berserk Gene** 🧬
   - Effect: Immediately raises Attack by 2 stages and inflicts confusion on switch-in
   - Consumable item that activates upon entering battle
   - Associated with Mewtwo lore from Cerulean Cave experiments
   - Originally from Generation 2

2. **Pink Bow/Polkadot Bow**
   - Effect: Boosts Normal-type moves by 10%
   - Item redundancy relevant if Item Clause is ever enforced

3. **Soul Dew**
   - Boosts Latios/Latias's SpAtk and SpDef by 50% (Pre-Gen 7 mechanics)

4. **Additional Items**
   - Z-Crystals
   - Mega Stones
   - Red/Blue Orb

---

### Status Condition Changes

#### Burn
- Deals **1/8 max HP** per turn as residual damage
- *Note: This may differ from current generation mechanics depending on when you are reading this*

#### Paralysis
- Reduces Speed by **75%** (to 25% of original)
- **25% chance** to be fully paralyzed each turn (unless you have Magic Guard)
- Electric-types are **no longer immune** to paralysis

#### Confusion
- **50% self-hit rate** (increased from 33%)
- Self-damage uses 40 BP typeless attack

#### Freeze (Permafreeze)
- Frozen Pokémon **stay frozen indefinitely** until thawed by an external mechanic
- **No random thaw chance** - must be thawed by:
  - Being hit by a Fire-type move
  - Using a move with the "defrost" flag (Flame Wheel, Sacred Fire, Scald, etc.)
  - Abilities that cure status (Natural Cure on switch, etc.)
  - Items that cure status (Lum Berry, etc.)
- This restores the brutal Gen 1-style freeze mechanic! ❄️

#### Weather Duration
- Weather set by abilities (Drizzle, Drought, Sand Stream, Snow Warning) is **permanent**
- Weather set by moves still has standard duration

---

### Mechanics Restorations

#### Critical Hit Formula

Restore speed-based critical hits (high-speed = more crits)

#### Type Chart Changes

Gen 9 type chart except:
- **Psychic is immune to Ghost** (Gen 1)
- **Steel resists Ghost/Dark** (Gen 2)
- **Bug and Poison are weak to each other** (Gen 1)

#### Terrain Buffs

- **Electric Terrain**: Boosts Electric-type moves by 50% (was 30%)
- **Grassy Terrain**: Boosts Grass-type moves by 50% (was 30%)
- **Psychic Terrain**: Boosts Psychic-type moves by 50% (was 30%)

#### Let's Go Pikachu/Eevee Mega Evolution *(In Progress - Not Yet Implemented)*

In Let's Go Pikachu and Eevee, Mega Evolution doesn't require holding a Mega Stone. The following Pokémon would be able to Mega Evolve without needing to hold a stone:

- **Aerodactyl** → Mega Aerodactyl
- **Beedrill** → Mega Beedrill
- **Blastoise** → Mega Blastoise
- **Gyarados** → Mega Gyarados
- **Kangaskhan** → Mega Kangaskhan
- **Pidgeot** → Mega Pidgeot
- **Pinsir** → Mega Pinsir
- **Slowbro** → Mega Slowbro
- **Venusaur** → Mega Venusaur
- **Charizard** → Mega Charizard X or Y (player can choose)
- **Mewtwo** → Mega Mewtwo X or Y (player can choose)

This would allow these Pokémon to hold any item while still being able to Mega Evolve, similar to how Rayquaza can Mega Evolve without a stone.

> **Note**: This feature is planned but not currently implemented in the mod.

---

### Format Rules

#### EV/Level Rules

- **EV Limit Removed**: All Pokémon can have 252 EVs in every stat (1512 total EVs)
- **Level Cap**: Maximum level 100
- **IV Rules**: Standard competitive IV rules apply

#### Battle Format

- **Team Size**: Standard 6v6 format
- **Item Clause**: No restrictions on item usage
- **Species Clause**: No restrictions (can use multiple of same Pokémon)
- **Sleep Clause**: Removed
- **Endless Battle Clause**: Standard rules apply
- **Stat Overflow**: Removed (More on this in Additional Information)

---

## 🎯 Summary

Pure Hackmons No Nerfs creates the ultimate Pokémon experience, restoring broken mechanics from previous generations and allowing unlimited fun:

✅ **Pokémon Base Stats** are restored to their most powerful  
✅ **Moves** are restored to their highest power/accuracy/effect  
✅ **Ability nerfs** are removed  
✅ **Classic items** like GSC's Berserk Gene return  
✅ **Every battle mechanic** from Gens 1-9 all come together  
✅ **Powerful permanent forms** like E-max, Megas, etc. come back  
✅ **Permafreeze** restores the terrifying Gen 1 freeze mechanic

This format not only brings forth an interesting metagame but also attempts to capture some of the most powerful things in Pokémon history. Moving forward, one could consider expanding on the phrase "no nerfs" to apply to other formats as well, including:
- **"OU No Nerfs"** where Machamp can learn Fissure with No Guard
- **"Glitched No Nerfs"** where Diamond & Pearl Pokémon have access to every move in the game
- **"LC No Nerfs"** where baby Pokémon like Abra and Gastly reign supreme!

---

## 👥 Contributors

**Main Contributors:**
- **isleep2late** - Creator & Lead Developer
- **electra** - Contributor
- **Enigmatist** - Contributor  
- **Alex BB** - Contributor

## [**Join our Discord**](https://discord.gg/mTwgNNtE6a)

**Special Thanks:**
- Pure Hackmons community for additional feedback
- Pokémon Showdown for making this possible (via Custom Format/Local Open-Source modification)

---

## 📚 Additional Information

### Important Notes

This document is subject to constant updates/changes, especially as new games/generations come out. Anything marked with "**" is up for debate/discussion as it may not necessarily be a buff and/or can be removed/revised based on community input/feedback. Additionally, anything labeled "EXPERIMENTAL" is not necessarily 'canon' in the game but would be fun to implement or is currently implemented in the code.

### Future Possibilities

**EXPERIMENTAL**: Shadow Lugia/Shadow moves, "busted" moves from Pokémon Masters (Feel Our Feelings!, Lunar Moongeist Beam, Dawn Lunar Eclipse Moongeist Beam, etc.) might be fun ideas; however, they may be impractical and are also NOT implemented in Pokémon Showdown yet. Additionally, there is a Save Editing-related Pure Hackmons mechanic in Gen 1 that is NOT implemented on Showdown where a Pokemon's sprite and typing can be modified (see https://www.smogon.com/forums/threads/old-gen-hackmons-megathread.3649618/post-10398287 as well as https://projectpokemon.org/home/forums/topic/67301-i-think-i-ran-into-new-color-palettes-shiny-sprites-in-pokemon-yellow-using-save-editing/ ... this is all possible using Pikasav which can be found here: https://projectpokemon.org/home/files/file/1598-pikasav/). While this would be really cool and would apply to all Gen 1 Pokemon, it is currently impossible to code and would not be feasible on Showdown, but could be a good theoretical framework for the future).

### Final Comments About Design Philosophy (and the decision to remove Stat Overflow Glitch)

The decision to remove Stat Overflow was not an easy one, but is something worth bringing up. The reason behind banning this particular mechanic is two-fold, and will serve as the basis for future decisions:

1) Balance: PHNN by virtue of what it is, is by definition not a very balanced format. That said, there are only a handful of things that make it so, and Emax's overflow glitch is one of them. We must therefore distinguish PHNN on several levels:

- "Theorymon" No Nerfs: This could be anything from allowing Shadow Moves to straight up removing "Cleric" Clause (this is a thing in RBY where Pokemon can enter battle pre-statused for Spore immunity). These are things that, on paper, can conceivably exist, but in practicality, would be very difficult, almost impossible to implement, both from a programming aspect with respect to Showdown as well as from a logistical standpoint..

- "Tournament-Ready" No Nerfs: This is the direction I think this should go, because a format is ultimately as popular as its playerbase, and players aren't going to exist if they don't enjoy the format they are interacting with.

- "Casual" No Nerfs: This is a third level people don't really talk about, but is basically the reason I have leftovers-again implemented on my server. This is where you play Battle Tower in a console game and you just face NPC's and have fun at your own personal level. You probably play Double-Iron Bash more often than you play Sunsteel Strike here (or Astral Barrage > Moongeist Beam) because you're more interested in hitting hard rather than metagaming Wonder Guard.

At the Tournament-Ready level, we ought to respect balance. But does that really go against the spirit of the format? Ultimately, I would argue no, and the reason is because of what I like to refer to as the "No Nerfs Paradox" which states: 'When something becomes abusable, it acts like a nerf to everything else.'
We can reasonably remove or change things around the way we want because, ultimately, one could argue that removing Stat Overflow removes the "nerf" on all Huge Power / Pure Power pokemon. With that said, there is the second reason which we've touched on already...

2) Community Feedback / Interest: PHNN is largely community-driven, and if a group of people collectively want something that is in the best interest of the community, it would make sense to simply go with the flow.

As an example, this is also the reason why, at this moment, we are allowing Will-O-Wisp to stay at 100% accuracy. It is a feature in Legends Z-A that most if not all moves are 100% accurate. The argument against allowing all ZA moves to be 100% accurate is that it is for a completely non-turn based system.

So why Will-O-Wisp, and why now? We actually put this to a vote, and while we will continue to vote on things in our Discord, the idea was that there's a 100% accurate status move for paralysis, sleep, and poison, so why isn't there one for burn?

It might be inconsistent or arbitrary for us to only serve Will-O-Wisp, but ultimately this was interesting enough of an idea for the community that we're trying it out. It's the same notion for Overflow. We put Emax to a vote, and most everyone unanimously wanted Overflow banned but it was OK to keep Emax, even though Dynamaxed Pokemon is not something that is easy to implement in Gen 9.

The three Galar starter G-Max moves (Drum Solo, Fireball, and Hydrosnipe) have been implemented with 160 BP and ability-ignoring properties. All other G-Max moves are also available through standard Gigantamax during Dynamax.

Another comment about design philosophy: We are not against the idea of implementing Glitches. There are several Glitchmons such as MissingNo. or glitch moves or items that we could definitely consider. Stat Overflow is an unintended glitch that was never meant to happen, but glitches are fair game, though they are still relegated to Theorymon-level PHNN due to practicality.

---

## 🔧 Forking & Maintaining Your Own Copy

If you fork this repo, the **server** and **client** are both bundled in directly (no submodules). To keep your fork up to date and understand how everything fits together, **please read [`MAINTENANCE.md`](MAINTENANCE.md)**. It covers:

- How the bundled upstream code is tracked
- Exact commands to pull the latest updates from upstream Pokémon Showdown
- How to set up the required git remote after a fresh clone (it doesn't travel with the repo)
- How to resolve merge conflicts when upstream Showdown changes touch our customizations
- Troubleshooting common issues

**After cloning/forking, set up the upstream remote for the server:**

```bash
git remote add upstream-showdown https://github.com/smogon/pokemon-showdown.git
```

---

## 🐛 Issues & Feedback

Found a bug or have a suggestion? Please open an issue on this repository!

## 📄 License

This project is a modification for Pokémon Showdown and follows the same license. Pokémon and all related properties are © Nintendo/Creatures Inc./GAME FREAK inc.

---

<div align="center">

**Enjoy the chaos! 🔥**

*"Gotta break 'em all!"*

</div>
