#!/bin/bash
# System Optimization Script for Cloudflare Tunnel
# This script applies system-level optimizations to improve tunnel performance

echo "=========================================="
echo "  Cloudflare Tunnel System Optimizer"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  This script requires root privileges to modify system settings."
    echo "    Please run with sudo:"
    echo "    sudo $0"
    echo ""
    echo "📝 What this script does:"
    echo "   • Increases UDP buffer sizes (fixes 'receive buffer size' warnings)"
    echo "   • Configures ping_group_range (fixes ICMP proxy warnings)"
    echo "   • Makes changes persistent across reboots"
    exit 1
fi

echo "🔧 Applying system optimizations..."
echo ""

# 1. Increase UDP receive buffer size
# Cloudflared wants 7168 KiB (7340032 bytes)
# We'll set it to 8 MiB to have some headroom
echo "1️⃣  Increasing UDP receive buffer size..."
sysctl -w net.core.rmem_max=8388608
sysctl -w net.core.rmem_default=2097152
echo "   ✓ Set net.core.rmem_max = 8 MiB (was ~208 KiB)"
echo "   ✓ Set net.core.rmem_default = 2 MiB"
echo ""

# 2. Increase UDP send buffer size (for good measure)
echo "2️⃣  Increasing UDP send buffer size..."
sysctl -w net.core.wmem_max=8388608
sysctl -w net.core.wmem_default=2097152
echo "   ✓ Set net.core.wmem_max = 8 MiB"
echo "   ✓ Set net.core.wmem_default = 2 MiB"
echo ""

# 3. Fix ping_group_range for ICMP proxy
echo "3️⃣  Configuring ping_group_range..."
# Allow all groups to use ICMP
sysctl -w net.ipv4.ping_group_range="0 2147483647"
echo "   ✓ Set net.ipv4.ping_group_range = 0 2147483647"
echo ""

# 4. Make changes persistent
echo "4️⃣  Making changes persistent across reboots..."
SYSCTL_CONF="/etc/sysctl.d/99-cloudflared.conf"

cat > "$SYSCTL_CONF" <<EOF
# Cloudflare Tunnel Optimizations
# Created by optimize-system-for-cloudflare.sh

# UDP buffer sizes - required for optimal QUIC performance
net.core.rmem_max = 8388608
net.core.rmem_default = 2097152
net.core.wmem_max = 8388608
net.core.wmem_default = 2097152

# ICMP configuration - allows cloudflared to use ICMP proxy
net.ipv4.ping_group_range = 0 2147483647
EOF

echo "   ✓ Created $SYSCTL_CONF"
echo ""

# 5. Verify changes
echo "5️⃣  Verifying changes..."
echo "   Current UDP receive buffer max: $(cat /proc/sys/net/core/rmem_max) bytes ($(numfmt --to=iec $(cat /proc/sys/net/core/rmem_max)))"
echo "   Current ping_group_range: $(cat /proc/sys/net/ipv4/ping_group_range)"
echo ""

echo "=========================================="
echo "  ✅ System optimization complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Restart your Cloudflare tunnel"
echo "  2. The warnings about buffer sizes should be gone"
echo "  3. ICMP proxy warnings should also be resolved"
echo ""
echo "To verify, run: cloudflared tunnel --config cloudflared-config.yml run"
echo ""
