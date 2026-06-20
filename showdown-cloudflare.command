#!/bin/bash
# Launch Pokemon Showdown Cloudflare tunnel (macOS) with optimizations

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
    read -p "Press Enter to close."
    exit 1
fi

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ Error: cloudflared is not installed."
    echo "   Install it from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    read -p "Press Enter to close."
    exit 1
fi

# Check system optimizations (macOS specific)
RMEM_MAX=$(sysctl -n kern.ipc.maxsockbuf 2>/dev/null || echo "0")
REQUIRED_RMEM=7340032  # 7168 KiB

if [ "$RMEM_MAX" -lt "$REQUIRED_RMEM" ] && [ "$RMEM_MAX" != "0" ]; then
    echo "⚠️  Warning: Socket buffer size may be suboptimal"
    echo "   macOS manages buffers differently than Linux"
    echo "   If you experience issues, see CLOUDFLARE-TROUBLESHOOTING.md"
    echo ""
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

    # Check if we have tunnel credentials (named tunnel)
    if [ -d "$HOME/.cloudflared" ] && [ -n "$(ls -A $HOME/.cloudflared/*.json 2>/dev/null)" ]; then
        echo "✓ Found tunnel credentials - using named tunnel with config"
        TUNNEL_CMD="cloudflared tunnel --config $CONFIG_FILE run"
    else
        echo "ℹ️  Quick tunnel mode detected (no named tunnel configured)"
        echo "   For full config support, create a named tunnel"
        echo "   See: CLOUDFLARE-TROUBLESHOOTING.md"
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
echo "Tips for troubleshooting connection issues:"
echo "  • Check that Pokemon Showdown is running on port 8000"
echo "  • Monitor for DNS timeout errors"
echo "  • See CLOUDFLARE-TROUBLESHOOTING.md for common issues"
echo ""

cd "${PROJECT_DIR}/pokemon-showdown"
$TUNNEL_CMD

echo ""
echo "=========================================="
echo "Tunnel stopped. Press Enter to close."
echo "=========================================="
read
