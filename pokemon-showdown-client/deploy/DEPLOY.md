# PHNN custom client — deployment runbook

Self-hosting the Pokémon Showdown client at **play.hackmons.com** so we control
avatars, the teambuilder (No Nerfs stats), auto-join, etc. — while keeping
Smogon accounts (no password management on our side).

Status: built + validated locally (staging). The only un-done step is the
go-live tunnel rewire (needs Cloudflare access). Nothing below has touched the
live play.hackmons.com routing yet.

## What's already done in this repo

- Client builds on **Node v22** (`~/.nvm/versions/node/v22.22.2/bin`; system node is v18, too old).
- `caches/pokemon-showdown` is a symlink → `../../pokemon-showdown` (our server, with the `phnn` mod). `build-tools/build-indexes` skips the upstream re-clone when it exists.
- No Nerfs teambuilder stats: `build-indexes` emits `BattleTeambuilderTable['gen9phnn']`; the old-client teambuilder + search map the NN format → `Dex.mod('gen9phnn')`. Verified: Mewtwo Sp.Def shows **154**.
- `config/routes.json`: `client = play.hackmons.com`, `resourceServer = play.pokemonshowdown.com` (sprites/audio/fx load free from Smogon; code/data/config load from us).
- `config/config.js`: `Config.defaultserver` → the hackmons server (`id: play-hackmons-com`, host `play.hackmons.com`, port 443, httpport 8000).
- `deploy/phnn-client-server.js`: front server — serves the built old client at `/` (caches/index-old.html) and reverse-proxies `/action.php` (+ `/~~*/action.php`) to Smogon's login server. This is the piece that makes self-hosted login work (Smogon's `crossdomain.php` only serves `*.psim.us`, and `action.php` has no CORS).

## Build

```bash
cd pokemon-showdown-client
export PATH=~/.nvm/versions/node/v22.22.2/bin:$PATH
./build full      # regenerates data tables (gen9phnn). Use ./build for code-only changes.
```

Rebuild the server first if the `phnn` mod changed: `cd ../pokemon-showdown && npm run build`.

## Config files (NOT in git — recreate these)

`config/` is gitignored (so nothing environment-specific or sensitive gets pushed),
so a fresh checkout has no `config/`. These two files are required for the build;
neither contains secrets. Create them before building:

`config/routes.json`:
```json
{
    "root": "pokemonshowdown.com",
    "client": "play.hackmons.com",
    "resourceServer": "play.pokemonshowdown.com",
    "dex": "dex.pokemonshowdown.com",
    "replays": "replay.pokemonshowdown.com",
    "users": "pokemonshowdown.com/users",
    "teams": "teams.pokemonshowdown.com"
}
```

`config/config.js` — copy `config/config-example.js` (the build creates it on first
run) and set only `Config.defaultserver`:
```js
Config.defaultserver = {
	id: 'play-hackmons-com',
	host: 'play.hackmons.com',
	port: 443,
	httpport: 8000,
	altport: 80,
	registered: false
};
```
(The build injects `Config.routes` from `routes.json` into `config.js` automatically.)

## Run the front server

```bash
export PATH=~/.nvm/versions/node/v22.22.2/bin:$PATH
PHNN_CLIENT_PORT=8100 node deploy/phnn-client-server.js
```
Serves the client + login proxy on :8100. (Put it behind a process manager / systemd for production.)

## Go-live: Cloudflare tunnel rewire (NOT yet done)

Today: `play.hackmons.com` → tunnel → `localhost:8000` (PS server), and the PS
server's root page redirects the browser to `play-hackmons-com.psim.us`
(Smogon's client). To serve our own client instead, route by path so the game
socket still hits the PS server while everything else hits our front server.

The live tunnel ingress lives in `~/.cloudflared/config.yml` (and the running
service uses `/etc/cloudflared/config.yml`). Add path-based rules for
play.hackmons.com **above** the catch-all:

```yaml
ingress:
  # ... existing studycalculator.com rules ...
  - hostname: play.hackmons.com
    path: ^/(showdown|crossdomain)   # game websocket / sockjs stays on the PS server
    service: http://localhost:8000
  - hostname: play.hackmons.com
    service: http://localhost:8100   # our client front server (static + action.php proxy)
  - service: http_status:404
```

Then restart cloudflared. Verify:
- `https://play.hackmons.com/` serves OUR client (not the psim.us redirect).
- `https://play.hackmons.com/showdown/info` still returns `{"websocket":true,...}`.
- `https://play.hackmons.com/action.php?act=upkeep` returns the Smogon JSON.

### Staging on a subdomain first (recommended before go-live)

To validate the full https flow (including login) without touching
play.hackmons.com: temporarily set `routes.json` `client` to a staging
subdomain (e.g. `beta.hackmons.com`), rebuild, add a DNS record + the same
tunnel rules for that subdomain → :8100, and test there. Revert `routes.json`
to `play.hackmons.com` for production.

## Login behaviour

First login on play.hackmons.com asks for PS username+password (the proxy can't
read the user's play.pokemonshowdown.com session cookie). Smogon still validates;
we store nothing. The session then persists in play.hackmons.com localStorage.

## Known follow-ups

- gen3/gen7 NN formats not yet wired (only `gen9phnn`). Extend the build-indexes
  loop with `['gen3phnn','gen3phnn'],['gen7phnn','gen7phnn']` and drop the
  `gen === 9` guard in the client hooks.
- Custom avatars: FIXED — `resolveAvatar()` now serves from `//<routes.client>/avatars/`
  (no token, no third-party host); the front server maps `/avatars/` to
  `pokemon-showdown/config/avatars/`. NOTE: the old GitHub token is still in git
  history (commit `e11f62c`) on the public repo — REVOKE it on GitHub regardless.
- A few static images referenced directly by index-old.html (logo, favicon) will
  404 unless copied to play.hackmons.com; cosmetic.
```
