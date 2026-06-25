<div align="center">

![Mewtwo](https://i.ibb.co/qfKMGc9/Mewtwo-Gen1-NN.png)

# **PURE HACKMONS: NO NERFS**

![Eternamax](https://i.ibb.co/GfpjyjLP/Emax-Gen8-NN.png)

*Where every Pokémon reaches their peak potential*

[![Pokemon Showdown](https://img.shields.io/badge/Pokemon-Showdown-orange)](https://pokemonshowdown.com/)
[![OG PH Format](https://img.shields.io/badge/Format-Pure%20Hackmons-red)](https://www.smogon.com/dex/ss/formats/pure-hackmons/)

</div>

---

## Table of Contents

- [Introduction](#introduction)
- [Repository Structure](#repository-structure)
- [Installation](#installation)
  - [Prerequisites](#prerequisits)
  - [Option A — Local](#option-a--local)
  - [Option B — Cloudflare](#option-b--cloudflare)
  - [Option C — Domain](#option-c--domain)
  - [Keeping Up with Upstream Showdown]
  - [Summary: files you need to edit]
- [Contributors](#contributors)
- [Additional Information](#additional-information)

---

## Introduction

Close your eyes. Imagine a Pokémon format where the sky was limitless, where you could use all the broken mechanics across every generation of Pokémon games. Imagine a format where Mewtwo's Special Defense was 154, where Zacian-Crowned had an Attack of 170, and where moves like Surf have 95 Base Power, while Thunder has 120 Base Power. 

Now open your eyes. **Welcome to Pokémon Pure Hackmons: No Nerfs**, the format where every move is legal, every ability is legal, and every Pokémon across all generations can be played at their peak.

---

## Repository Structure

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

## Installation

### Prerequisites

- [Node.js **v22**](https://nodejs.org/) — **required**. Node 18 will not build the client. Install via [nvm](https://github.com/nvm-sh/nvm) or the official installer.
- [Git](https://git-scm.com/)
- A text editor (VS Code, Notepad++, etc.)

> **Why v22?** The client build tools use ES module syntax (`.mjs`) that older Node versions reject. The game server itself also benefits from v22's performance improvements.

---

### Option A — Play Locally (5 minutes, just for you)

This is the fastest way to get PHNN running. No domain, no tunnel needed — everything stays on your machine.

```bash
# 1. Download the source
git clone https://github.com/isleep2late/PureHackmonsNoNerfs.git
cd PureHackmonsNoNerfs

# 2. Install game-server dependencies
cd pokemon-showdown
npm install

# 3. Start the server
node pokemon-showdown start
```

Open **http://localhost:8000** in your browser. That's it! The PHNN formats are already in the format picker.

> **Tip:** In Pure Hackmons No Nerfs, every Pokémon can have 252 EVs in every stat, any move, and any ability.

---

### Option B — Share With Friends via Cloudflare (15 minutes, no domain required)

Cloudflare Tunnels expose your local server to the internet for free. You get a temporary URL like `random-words.trycloudflare.com` that anyone can connect to. The URL changes every restart; use Option C below for a permanent address.

#### Step 1 — Install cloudflared

**Windows:** Download [cloudflared.exe](https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe), place it somewhere (e.g. `C:\cloudflared\`), and add that folder to your PATH.

**macOS:**
```bash
brew install cloudflared
```

**Linux:**
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

#### Step 2 — Start the game server, then open a tunnel

In one terminal:
```bash
cd PureHackmonsNoNerfs/pokemon-showdown
node pokemon-showdown start
```

In a second terminal:
```bash
cloudflared tunnel --url http://localhost:8000
```

Cloudflare prints a URL like `https://shy-field-abc123.trycloudflare.com`. Share that with friends — they open it in their browser and connect straight to your server.

---

### Option C — Self-host Permanently with Your Own Domain

This is the full production setup: a custom domain, a stable URL, and the PHNN-branded web client (with accurate No Nerfs teambuilder stats, custom avatars, and Showdex integration). This is what powers **play.hackmons.com**.

The server stack has two pieces:
| Piece | What it does | Port |
|---|---|---|
| **Game server** (`pokemon-showdown/`) | Runs the battles, sim, ladder | `8000` |
| **Client front server** (`pokemon-showdown-client/deploy/phnn-client-server.js`) | Serves the web UI + proxies login to Smogon | `8099` |

The Cloudflare tunnel routes traffic so that WebSocket battle connections go to the game server and everything else (the page, assets, login) goes to the client front server.

---

#### Step 1 — Clone and install game server dependencies

```bash
git clone https://github.com/isleep2late/PureHackmonsNoNerfs.git
cd PureHackmonsNoNerfs/pokemon-showdown
npm install
```

---

#### Step 2 — Configure the game server

Copy the example config and open it in a text editor:
```bash
cp pokemon-showdown/config/config-example.js pokemon-showdown/config/config.js
```

The defaults are fine. The only line you may want to change is `exports.serverid` — this is the internal name your server advertises itself as. You can leave it blank or set it to something like `my-phnn-server`.

The `proxyip` setting is already configured to trust Cloudflare Tunnel:
```js
exports.proxyip = ['127.0.0.1', '::1'];
```
Leave this as-is. Without it, all players would show the same IP.

---

#### Step 3 — Configure the web client

The client config lives in `pokemon-showdown-client/config/` (this folder is git-ignored, so it won't be in the repo — create it fresh with your own domain).

**Create `pokemon-showdown-client/config/routes.json`** — replace `yourdomain.com` with your actual domain:
```json
{
    "root": "pokemonshowdown.com",
    "client": "yourdomain.com",
    "resourceServer": "play.pokemonshowdown.com",
    "dex": "dex.pokemonshowdown.com",
    "replays": "replay.pokemonshowdown.com",
    "users": "pokemonshowdown.com/users",
    "teams": "teams.pokemonshowdown.com"
}
```

**Create `pokemon-showdown-client/config/config.js`** — replace `yourdomain.com` in two places:
```js
Config.defaultserver = {
    id: 'your-server-id',
    host: 'yourdomain.com',
    port: 443,
    httpport: 8000,
    altport: 80,
    registered: false
};
```

> **What these do:** `routes.json` tells the build system what domain will serve the client. `config.js` tells the browser where to open a battle connection. Both need your domain so the client connects to your server instead of the official one.

---

#### Step 4 — Build the web client

The build requires **Node v22**. If your system Node is older, use [nvm](https://github.com/nvm-sh/nvm):
```bash
nvm install 22 && nvm use 22
```

Then build (run this from the repo root, or `cd pokemon-showdown-client` first):
```bash
cd pokemon-showdown-client
node build full
```

`full` regenerates the data tables (including No Nerfs teambuilder stats). After that, `node build` (without `full`) is faster for code-only changes.

> **How long?** About 60–90 seconds on a modern machine for a full build.

---

#### Step 5 — Start both servers

**Terminal 1 — game server:**
```bash
cd pokemon-showdown
node pokemon-showdown start
```

**Terminal 2 — client front server:**
```bash
cd pokemon-showdown-client
node deploy/phnn-client-server.js
```

The front server listens on port `8099` by default. You can override the port:
```bash
PHNN_CLIENT_PORT=8099 node deploy/phnn-client-server.js
```

---

#### Step 6 — Set up Cloudflare Tunnel with your domain

##### 6a. Install and authenticate cloudflared
```bash
# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# macOS
brew install cloudflared
```

```bash
cloudflared tunnel login
```
This opens a browser window — log in and select the domain you want to use.

##### 6b. Create a named tunnel
```bash
cloudflared tunnel create phnn-server
```
Note the tunnel ID printed (a UUID like `abc123-...`). You'll need it in the next step.

##### 6c. Route your domain's DNS to the tunnel
```bash
cloudflared tunnel route dns phnn-server yourdomain.com
```

##### 6d. Create the tunnel config

Create `~/.cloudflared/config.yml` — replace `YOUR-TUNNEL-ID`, `yourdomain.com`, and the credentials path:
```yaml
tunnel: YOUR-TUNNEL-ID
credentials-file: /home/YOUR-USERNAME/.cloudflared/YOUR-TUNNEL-ID.json

ingress:
  - hostname: yourdomain.com
    path: ^/(showdown|crossdomain)
    service: http://localhost:8000
  - hostname: yourdomain.com
    service: http://localhost:8099
  - service: http_status:404
```

> **The two-route split is important:** paths matching `/showdown` or `/crossdomain` (the WebSocket and SockJS endpoints) go to the game server on `8000`. Everything else — the page, assets, login — goes to the client front server on `8099`.

##### 6e. Start the tunnel
```bash
cloudflared tunnel run phnn-server
```

Your server is now live at `https://yourdomain.com`. Verify:
- Opening `https://yourdomain.com` shows the PHNN client (not a redirect to `psim.us`)
- `https://yourdomain.com/action.php?act=upkeep` returns Smogon JSON (login proxy working)

##### Keep the tunnel running on boot (Linux systemd)
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

#### Step 7 — Keep the servers running on boot (Linux systemd)

Create `/etc/systemd/system/phnn-game.service`:
```ini
[Unit]
Description=PHNN Game Server
After=network.target

[Service]
User=YOUR-USERNAME
WorkingDirectory=/path/to/PureHackmonsNoNerfs/pokemon-showdown
ExecStart=/usr/bin/node pokemon-showdown start
Restart=always

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/phnn-client.service`:
```ini
[Unit]
Description=PHNN Client Front Server
After=network.target

[Service]
User=YOUR-USERNAME
WorkingDirectory=/path/to/PureHackmonsNoNerfs/pokemon-showdown-client
ExecStart=/usr/bin/node deploy/phnn-client-server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Then enable both:
```bash
sudo systemctl daemon-reload
sudo systemctl enable phnn-game phnn-client
sudo systemctl start phnn-game phnn-client
```

---

### Summary: files you need to edit with your own domain

| File | What to change |
|---|---|
| `pokemon-showdown-client/config/routes.json` | `"client": "yourdomain.com"` |
| `pokemon-showdown-client/config/config.js` | `host: 'yourdomain.com'` and `id: 'your-server-id'` |
| `~/.cloudflared/config.yml` | `tunnel: YOUR-TUNNEL-ID`, `hostname: yourdomain.com`, credentials path |

Everything else — the PHNN mod, the formats, the client code — works out of the box.


## 👥 Contributors

**Main Contributors:**
- **isleep2late** - Community Indentured Servant
- **ifwih** - Coleader and Developer
- **electra** - Lead Developer of Wondrous Hackmons, Co-Creator of Pure Hackmons No Nerfs
- **Enigmatist** - Co-Creator of No Nerfs Generation, #1 Ranked Hackmons Player 
- **Alex BB** - Contributor

**External recognition of those who made this possible**
- **Zarel** - Showdown Owner and Developer along with staff: https://pokemonshowdown.com/credits
- **Doshidak** - Showdex Developer: https://github.com/doshidak/showdex
- **rby2k20** - Gen 1/2 Doubles implementation: https://github.com/rby2k20/pokemon-showdown
- **MathyFurret** - Rotations implementation: https://github.com/smogon/pokemon-showdown-client/pull/1944 https://github.com/smogon/pokemon-showdown/pull/8677

## [**Join our Discord**](https://discord.gg/mTwgNNtE6a)

**Special Thanks:**
- **Siphonaptera** for leading the [Gen 8] Unified project
- **psim tseng** for artistic contribution and leadership
- **PenUltimate Tast** for Hackmons.com database management as site admin
- **Wyrd & Viola Lunala** for promoting the server and leadership
- **ProKameron** for contributing to the bot and leadership
- **aidan amoongus** for Room Intros and leadership
- Pure Hackmons community for additional feedback

---

## 📚 Additional Information

### Important Notes

This document is subject to constant updates/changes, especially as new games/generations come out. 

---

### 🔧 Forking & Maintaining Your Own Copy

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

### Keeping Up with Upstream Showdown

The `pokemon-showdown/` directory is a git subtree. Pull the latest upstream Showdown changes with:

```bash
git subtree pull --prefix=pokemon-showdown https://github.com/smogon/pokemon-showdown.git master --squash
```

Our custom files (`config/formats.ts` and `data/mods/phnn/`) are protected and won't be overwritten unless there's a direct conflict. If there is one, always keep our version. After pulling, run `cd pokemon-showdown && npm install` in case dependencies changed.

> **⚠️ Never copy `formats.ts` alone to production.** The Custom Disguises feature spans `formats.ts` + `data/mods/gen1doubles/` + `data/mods/gen2doubles/` + `data/rulesets.ts` + `sim/battle.ts` + the client files. Always deploy via `git pull`. See [`MAINTENANCE.md`](MAINTENANCE.md) for the full runbook.


*Please note that upstream updates may or may not break your server. For best practice, I suggest you pull from this repo directly as we constantly maintain it.*

---

### 🐛 Issues & Feedback

Found a bug or have a suggestion? Please open an issue on this repository or send a message to #bug-reports at https://discord.gg/mTwgNNtE6a

### 📄 License

This project is a modification of Pokémon Showdown and Showdex. Therefore, this project is licensed under AGPL-3.0. Pokémon and all related properties are © Nintendo/Creatures Inc./GAME FREAK inc.

---

<div align="center">

**Enjoy the chaos! 🔥**

*"Gotta break 'em all!"*

</div>
