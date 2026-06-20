#!/bin/bash
# Launch Pokemon Showdown Cloudflare tunnel with optimizations

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  Starting Cloudflare Tunnel"
echo "  play.hackmons.com → localhost:8000"
echo "=========================================="
echo ""

# Load environment variables from .env file
if [ -f "$SCRIPT_DIR/leftovers-again/.env" ]; then
    set -a
    source "$SCRIPT_DIR/leftovers-again/.env"
    set +a
else
    echo "❌ Error: leftovers-again/.env not found."
    echo "   Copy leftovers-again/.env.example to leftovers-again/.env and fill in your values."
    exit 1
fi

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ Error: cloudflared is not installed."
    echo "   Install it from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    exit 1
fi

# Check system optimizations
RMEM_MAX=$(cat /proc/sys/net/core/rmem_max 2>/dev/null || echo "0")
REQUIRED_RMEM=7340032  # 7168 KiB

if [ "$RMEM_MAX" -lt "$REQUIRED_RMEM" ]; then
    echo "⚠️  Warning: UDP receive buffer size is too small"
    echo "   Current: $(numfmt --to=iec $RMEM_MAX) | Required: $(numfmt --to=iec $REQUIRED_RMEM)"
    echo ""
    echo "   This can cause performance issues and connection drops."
    echo "   Run this command to fix (requires sudo):"
    echo ""
    echo "   sudo $SCRIPT_DIR/optimize-system-for-cloudflare.sh"
    echo ""
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Configuration file path
CONFIG_FILE="$SCRIPT_DIR/cloudflared-config.yml"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "⚠️  Warning: cloudflared-config.yml not found"
    echo "   Using default quick tunnel mode (not recommended for production)"
    echo ""
    TUNNEL_CMD="cloudflared tunnel --url http://localhost:8000"
else
    echo "✓ Using configuration file: cloudflared-config.yml"
    echo "  - Optimized timeouts for long-lived connections"
    echo "  - QUIC protocol for better performance"
    echo "  - Enhanced retry logic"
    echo ""

    # Note: Quick tunnels don't support custom config files directly
    # We need to use a named tunnel for full config support
    # For now, we'll use the config file but still use quick tunnel mode
    # The user will need to create a named tunnel for full config usage

    # Check if we have tunnel credentials (named tunnel)
    if [ -d "$HOME/.cloudflared" ] && [ -n "$(ls -A $HOME/.cloudflared/*.json 2>/dev/null)" ]; then
        echo "✓ Found tunnel credentials - using named tunnel with config"
        TUNNEL_CMD="cloudflared tunnel --config $CONFIG_FILE run"
    else
        echo "ℹ️  Quick tunnel mode detected (no named tunnel configured)"
        echo "   For full config support, create a named tunnel:"
        echo "   https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/"
        echo ""
        # Use environment variables to apply some optimizations to quick tunnel
        export TUNNEL_TRANSPORT_PROTOCOL=quic
        export TUNNEL_LOGLEVEL=info
        TUNNEL_CMD="cloudflared tunnel --url http://localhost:8000"
    fi
fi

# Check if Pokemon Showdown is running
if ! curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo "⚠️  Warning: No server detected at http://localhost:8000"
    echo "   Make sure Pokemon Showdown is running before starting the tunnel."
    echo ""
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🚀 Launching Cloudflare Tunnel..."
echo ""

# Launch in gnome-terminal
gnome-terminal --tab --working-directory="$SCRIPT_DIR" \
--title="Cloudflare Tunnel - play.hackmons.com" -- bash -c "
echo '🌐 Cloudflare Tunnel Starting...'
echo ''
echo 'Tips for troubleshooting connection issues:'
echo '  • Check that Pokemon Showdown is running on port 8000'
echo '  • Monitor for DNS timeout errors'
echo '  • Watch for stream cancellation errors on long-lived connections'
echo '  • If errors persist, check the troubleshooting guide in CLOUDFLARE-TROUBLESHOOTING.md'
echo ''
$TUNNEL_CMD
echo ''
echo '❌ Tunnel stopped'
exec bash
"

echo "✓ Tunnel launched in new terminal tab"
echo ""
