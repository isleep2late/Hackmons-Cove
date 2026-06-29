#!/usr/bin/env bash
# ============================================================================
#  PURE HACKMONS / Pokémon Showdown — ONE-CLICK SELF-HOST  (macOS)
#
#  Double-click this file in Finder. It opens Terminal and, start to finish:
#    1. Downloads a private copy of Node.js if needed (no admin).
#    2. Builds the game server and the web client.
#    3. Points the client at THIS Mac (connects to your own server).
#    4. Downloads cloudflared and opens a FREE public https URL (trycloudflare).
#    5. Prints the URL. Share it. Keep the window open to stay live.
#
#  Press Ctrl+C to stop everything. Safe to re-run anytime.
#  First time: if macOS blocks it, right-click → Open, or run:
#       chmod +x Setup_Server_macOS.command
#  Optional knobs (env vars):  PHNN_GAME_PORT (8000)  PHNN_CLIENT_PORT (8080)
# ============================================================================
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$HERE" || exit 1

GAME_PORT="${PHNN_GAME_PORT:-8000}"
FRONT_PORT="${PHNN_CLIENT_PORT:-8080}"
NODE_VERSION="v20.18.1"
TOOLS="$HERE/.tools"
NODE_DIR="$TOOLS/node"
LOG_DIR="$HERE/.selfhost-logs"
mkdir -p "$TOOLS" "$LOG_DIR"

c_cyan(){ printf '\033[1;36m%s\033[0m\n' "$*"; }
c_yellow(){ printf '\033[1;33m%s\033[0m\n' "$*"; }
c_red(){ printf '\033[1;31m%s\033[0m\n' "$*"; }
die(){ c_red "ERROR: $*"; echo; read -r -p "Press Enter to close this window." _; exit 1; }

dl(){
  if command -v curl >/dev/null 2>&1; then curl -fL --retry 3 "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then wget -q "$1" -O "$2"
  else die "Need 'curl' or 'wget' installed to download Node/cloudflared."; fi
}

OS="$(uname -s 2>/dev/null || echo unknown)"
ARCH="$(uname -m 2>/dev/null || echo x86_64)"
case "$OS" in
  Darwin) NODE_OS="darwin"; NODE_EXT="tar.gz"; CF_OS="darwin";;
  Linux)  NODE_OS="linux";  NODE_EXT="tar.xz"; CF_OS="linux";;
  *) die "Unsupported OS '$OS'. On Windows use Setup_Server_Windows.bat instead.";;
esac
case "$ARCH" in
  x86_64|amd64) NODE_ARCH="x64"; CF_ARCH="amd64";;
  arm64|aarch64) NODE_ARCH="arm64"; CF_ARCH="arm64";;
  *) NODE_ARCH="x64"; CF_ARCH="amd64";;
esac

clear 2>/dev/null || true
c_cyan "=============================================================="
c_cyan "   Pure Hackmons — One-Click Self-Host  ($NODE_OS/$NODE_ARCH)"
c_cyan "=============================================================="
echo

have_node(){ command -v node >/dev/null 2>&1 && [ "$(node -p 'parseInt(process.versions.node,10)' 2>/dev/null || echo 0)" -ge 16 ]; }
[ -x "$NODE_DIR/bin/node" ] && export PATH="$NODE_DIR/bin:$PATH"
if ! have_node; then
  c_cyan "[0/4] Installing a private copy of Node.js $NODE_VERSION (no admin needed)…"
  PKG="node-${NODE_VERSION}-${NODE_OS}-${NODE_ARCH}"
  rm -rf "$NODE_DIR"; mkdir -p "$NODE_DIR"
  dl "https://nodejs.org/dist/${NODE_VERSION}/${PKG}.${NODE_EXT}" "$TOOLS/node.pkg" || die "Could not download Node.js."
  tar -xf "$TOOLS/node.pkg" -C "$NODE_DIR" --strip-components=1 || die "Could not unpack Node.js."
  rm -f "$TOOLS/node.pkg"
  export PATH="$NODE_DIR/bin:$PATH"
fi
have_node || die "Node.js is still unavailable."
c_cyan "      Node $(node -v)  |  npm $(npm -v)"
echo

if [ ! -f pokemon-showdown/config/config.js ]; then
  cp pokemon-showdown/config/config-example.js pokemon-showdown/config/config.js 2>/dev/null \
    && c_yellow "      created pokemon-showdown/config/config.js from the example"
fi

c_cyan "[1/4] Building the game server (npm install + node build)… this can take a few minutes"
( cd pokemon-showdown && npm install --no-audit --no-fund && node build ) || die "Game-server build failed (see output above)."
echo

c_cyan "[2/4] Building the web client (npm install + build)…"
( cd pokemon-showdown-client && npm install --no-audit --no-fund && node build full ) || die "Client build failed (see output above)."
echo

c_cyan "[3/4] Pointing the client at this machine (origin-relative connect)…"
CFG="pokemon-showdown-client/config/config.js"
[ -f "$CFG" ] || cp pokemon-showdown-client/config/config-example.js "$CFG" 2>/dev/null || true
cat > "$TOOLS/client-override.js" <<'JS'
/*** PHNN one-click self-host override (auto-added) ***/
(function () {
	try {
		if (typeof window === 'undefined' || !window.location) return;
		if (typeof Config === 'undefined') return;
		var loc = window.location;
		var isHttps = loc.protocol === 'https:';
		var port = loc.port ? Number(loc.port) : (isHttps ? 443 : 80);
		var hostport = loc.host;
		Config.routes = Config.routes || {};
		Config.routes.root = hostport;
		Config.routes.client = hostport;
		Config.routes.replays = hostport;
		Config.routes.users = hostport + '/users';
		if (!Config.routes.resourceServer) Config.routes.resourceServer = 'play.pokemonshowdown.com';
		if (!Config.routes.dex) Config.routes.dex = 'dex.pokemonshowdown.com';
		if (!Config.routes.teams) Config.routes.teams = 'teams.pokemonshowdown.com';
		Config.defaultserver = {
			id: 'phnn', host: loc.hostname, port: port, httpport: port,
			altport: port, https: isHttps, registered: false,
		};
		Config.server = Config.defaultserver;
	} catch (e) {}
})();
/*** End PHNN one-click self-host override ***/
JS
cat > "$TOOLS/merge-config.js" <<'JS'
const fs = require('fs');
const [cfg, ovr] = process.argv.slice(2);
let s = fs.readFileSync(cfg, 'utf8');
const i = s.indexOf('/*** PHNN one-click self-host override');
if (i >= 0) s = s.slice(0, i).replace(/\s+$/, '') + '\n';
s += '\n' + fs.readFileSync(ovr, 'utf8');
fs.writeFileSync(cfg, s);
JS
node "$TOOLS/merge-config.js" "$CFG" "$TOOLS/client-override.js" || die "Could not write client config."
echo "      done"
echo

CF="$TOOLS/cloudflared"
if [ ! -x "$CF" ]; then
  c_cyan "[4/4] Downloading cloudflared (free public-tunnel tool)…"
  if [ "$CF_OS" = "darwin" ]; then
    dl "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-${CF_ARCH}.tgz" "$TOOLS/cf.tgz" || die "cloudflared download failed."
    tar -xf "$TOOLS/cf.tgz" -C "$TOOLS" && rm -f "$TOOLS/cf.tgz"
  else
    dl "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}" "$CF" || die "cloudflared download failed."
  fi
  chmod +x "$CF" 2>/dev/null || true
fi

stop_port(){ local pids; pids="$(lsof -ti tcp:"$1" 2>/dev/null || true)"; [ -n "$pids" ] && kill $pids 2>/dev/null || true; }
stop_port "$GAME_PORT"; stop_port "$FRONT_PORT"; sleep 1

c_cyan "      starting game server on :$GAME_PORT and web server on :$FRONT_PORT…"
( cd pokemon-showdown && node pokemon-showdown start "$GAME_PORT" ) > "$LOG_DIR/game.log" 2>&1 &
GAME_PID=$!
PHNN_CLIENT_PORT="$FRONT_PORT" PHNN_GAME_PORT="$GAME_PORT" PHNN_GAME_HOST="localhost" \
  node pokemon-showdown-client/deploy/phnn-client-server.js > "$LOG_DIR/front.log" 2>&1 &
FRONT_PID=$!

cleanup(){ echo; c_yellow "Shutting down server + tunnel…"; kill "${TUNNEL_PID:-0}" "$FRONT_PID" "$GAME_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

for _ in $(seq 1 40); do curl -s "http://localhost:$FRONT_PORT" >/dev/null 2>&1 && break; sleep 1; done

c_cyan "      opening Cloudflare tunnel…"
"$CF" tunnel --url "http://localhost:$FRONT_PORT" > "$LOG_DIR/tunnel.log" 2>&1 &
TUNNEL_PID=$!

URL=""
for _ in $(seq 1 40); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_DIR/tunnel.log" 2>/dev/null | head -1)"
  [ -n "$URL" ] && break; sleep 1
done

echo
if [ -n "$URL" ]; then
  c_cyan "=============================================================="
  c_cyan "   YOUR SERVER IS LIVE"
  c_cyan "   Public (share this):  $URL"
  c_cyan "   On this computer:     http://localhost:$FRONT_PORT"
  c_cyan "=============================================================="
  echo "   • Anyone can open the https link above and play."
  echo "   • This is a temporary URL; a new one is created each run."
  echo "   • Logs: $LOG_DIR"
  echo "   • Keep this window OPEN. Press Ctrl+C to stop the server."
else
  c_yellow "The server is up at http://localhost:$FRONT_PORT but no tunnel URL appeared yet."
  c_yellow "Check $LOG_DIR/tunnel.log — your network may block Cloudflare. Local play still works."
fi
echo
wait "$TUNNEL_PID"
