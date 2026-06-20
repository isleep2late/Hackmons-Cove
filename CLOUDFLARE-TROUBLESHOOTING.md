# Cloudflare Tunnel Troubleshooting Guide

This guide helps diagnose and fix common Cloudflare tunnel connectivity issues for Pokemon Showdown.

## Quick Fix Checklist

Before diving into detailed troubleshooting:

1. **Run system optimizations** (one-time setup):
   ```bash
   sudo ./optimize-system-for-cloudflare.sh
   ```

2. **Verify Pokemon Showdown is running**:
   ```bash
   curl http://localhost:8000
   ```

3. **Check DNS resolution**:
   ```bash
   nslookup region1.v2.argotunnel.com
   ```

4. **Restart the tunnel**:
   ```bash
   ./showdown-cloudflare.sh
   ```

---

## Common Errors and Solutions

### 1. UDP Buffer Size Warning

**Error Message:**
```
failed to sufficiently increase receive buffer size
(was: 208 kiB, wanted: 7168 kiB, got: 416 kiB)
```

**What it means:**
The system's UDP receive buffer is too small for optimal QUIC performance. This can cause packet drops and connection instability.

**Solution:**
Run the optimization script:
```bash
sudo ./optimize-system-for-cloudflare.sh
```

**Manual fix:**
```bash
# Temporary (until reboot)
sudo sysctl -w net.core.rmem_max=8388608
sudo sysctl -w net.core.rmem_default=2097152

# Permanent
echo "net.core.rmem_max = 8388608" | sudo tee -a /etc/sysctl.conf
echo "net.core.rmem_default = 2097152" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Verify fix:**
```bash
cat /proc/sys/net/core/rmem_max  # Should show 8388608 or higher
```

---

### 2. ICMP Proxy Warnings

**Error Message:**
```
WRN The user running cloudflared process has a GID (group ID)
that is not within ping_group_range
```

**What it means:**
The user's group ID isn't allowed to use ICMP (ping). This disables the ICMP proxy feature but doesn't affect tunnel functionality.

**Solution:**
Run the optimization script (it fixes this too):
```bash
sudo ./optimize-system-for-cloudflare.sh
```

**Manual fix:**
```bash
# Allow all groups to use ICMP
sudo sysctl -w net.ipv4.ping_group_range="0 2147483647"

# Make permanent
echo "net.ipv4.ping_group_range = 0 2147483647" | sudo tee -a /etc/sysctl.conf
```

---

### 3. Stream Canceled Errors

**Error Message:**
```
ERR error="stream 25 canceled by remote with error code 0"
ERR Request failed error="stream 25 canceled by remote with error code 0"
connIndex=2 dest=https://play.hackmons.com/showdown/360/ctdfrjq1/eventsource
```

**What it means:**
Long-lived connections (EventSource, WebSocket, XHR streaming) are being canceled. This usually happens when:
- The client disconnects before the request completes
- Network timeout occurs
- The local Pokemon Showdown server isn't responding

**Common causes:**

1. **Pokemon Showdown not running:**
   ```bash
   # Check if server is running
   curl -I http://localhost:8000

   # If not running, start it
   cd pokemon-showdown
   node pokemon-showdown start
   ```

2. **Network/firewall blocking connections:**
   - Check firewall rules: `sudo iptables -L`
   - Verify no proxy interfering with connections

3. **Client-side disconnections:**
   - These are often normal - clients disconnect when they navigate away
   - Only worry if they're happening constantly for all connections

**Solution:**
The new `cloudflared-config.yml` includes optimizations for long-lived connections:
- `tcpKeepAlive: 30s` - keeps connections alive
- `keepAliveTimeout: 90s` - extended timeout
- `proxyConnectionTimeout: 90s` - allows time for streaming responses

If using a **named tunnel** (recommended), ensure you're using the config:
```bash
cloudflared tunnel --config cloudflared-config.yml run
```

---

### 4. DNS Timeout Errors

**Error Message:**
```
ERR Failed to refresh DNS local resolver
error="lookup region1.v2.argotunnel.com: i/o timeout"
```

**What it means:**
Cloudflared cannot resolve Cloudflare edge network addresses. This indicates network connectivity or DNS issues.

**Solutions:**

1. **Test DNS resolution:**
   ```bash
   # Test with your system DNS
   nslookup region1.v2.argotunnel.com

   # Test with Google DNS
   nslookup region1.v2.argotunnel.com 8.8.8.8

   # Test with Cloudflare DNS
   nslookup region1.v2.argotunnel.com 1.1.1.1
   ```

2. **If resolution fails, switch DNS servers:**
   ```bash
   # Edit resolv.conf (temporary until reboot)
   sudo nano /etc/resolv.conf

   # Add these lines at the top:
   nameserver 1.1.1.1
   nameserver 8.8.8.8
   ```

3. **Check network connectivity:**
   ```bash
   # Ping Cloudflare
   ping 1.1.1.1

   # Test HTTPS connectivity
   curl -I https://www.cloudflare.com
   ```

4. **Firewall/proxy issues:**
   - Ensure UDP port 7844 is not blocked (QUIC protocol)
   - Check if corporate firewall/proxy is interfering
   - Try disabling VPN if active

5. **Force TCP protocol if QUIC is blocked:**
   Edit `cloudflared-config.yml` and change:
   ```yaml
   protocol: quic
   ```
   to:
   ```yaml
   protocol: http2
   ```

---

### 5. Connection Registration Failures

**Error Message:**
```
ERR failed to register connection
```

**Solutions:**

1. **Check tunnel credentials:**
   ```bash
   ls -la ~/.cloudflared/
   # Should contain *.json credential files
   ```

2. **Verify tunnel status on Cloudflare dashboard:**
   - Go to Cloudflare Zero Trust dashboard
   - Check tunnel status
   - Ensure tunnel isn't deleted or expired

3. **Recreate tunnel if needed:**
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create showdown-tunnel
   cloudflared tunnel route dns showdown-tunnel play.hackmons.com
   ```

---

## Performance Monitoring

### Check Tunnel Metrics

Cloudflared exposes metrics at `http://localhost:20242/metrics`:

```bash
curl http://localhost:20242/metrics | grep cloudflared
```

Key metrics to monitor:
- `cloudflared_tunnel_total_requests` - total requests handled
- `cloudflared_tunnel_request_errors` - request errors
- `cloudflared_tunnel_ha_connections` - number of active edge connections

### Monitor Connection Quality

```bash
# Check current buffer usage
cat /proc/sys/net/core/rmem_max

# Monitor network stats
netstat -s | grep -i udp

# Check for packet drops
cat /proc/net/snmp | grep Udp
```

---

## Upgrading to Named Tunnel (Recommended)

Quick tunnels are convenient but lack full configuration support. For production use:

1. **Create a named tunnel:**
   ```bash
   # Login to Cloudflare
   cloudflared tunnel login

   # Create tunnel
   cloudflared tunnel create pokemon-showdown

   # Configure DNS
   cloudflared tunnel route dns pokemon-showdown play.hackmons.com
   ```

2. **Update config file:**
   Add at the top of `cloudflared-config.yml`:
   ```yaml
   tunnel: <TUNNEL-ID>
   credentials-file: /home/YOUR_USER/.cloudflared/<TUNNEL-ID>.json
   ```

3. **Run with config:**
   ```bash
   cloudflared tunnel --config cloudflared-config.yml run
   ```

---

## Getting More Help

### Enable Debug Logging

Edit `cloudflared-config.yml`:
```yaml
loglevel: debug
```

Restart tunnel and check logs for detailed information.

### Check Cloudflared Version

```bash
cloudflared version
```

Update if needed:
```bash
# Ubuntu/Debian
sudo cloudflared update

# Or download latest from:
# https://github.com/cloudflare/cloudflared/releases
```

### Useful Commands

```bash
# Test local server
curl -v http://localhost:8000

# Test tunnel endpoint
curl -v https://play.hackmons.com

# Check tunnel info
cloudflared tunnel info <TUNNEL-NAME>

# List all tunnels
cloudflared tunnel list
```

---

## Advanced Debugging

### Capture Network Traffic

```bash
# Install tcpdump
sudo apt-get install tcpdump

# Capture UDP traffic (QUIC)
sudo tcpdump -i any -n udp port 7844 -w cloudflared-quic.pcap

# Capture HTTP traffic
sudo tcpdump -i any -n tcp port 8000 -w local-http.pcap
```

### Check System Resources

```bash
# Check memory usage
free -h

# Check CPU usage
top -b -n 1 | head -20

# Check open file descriptors
lsof | grep cloudflared | wc -l
ulimit -n  # Should be high, e.g., 65536
```

---

## Prevention Tips

1. **Always run system optimizations** after OS updates
2. **Monitor tunnel health** with metrics endpoint
3. **Keep cloudflared updated** to latest version
4. **Use named tunnels** for production deployments
5. **Set up monitoring alerts** for DNS timeouts
6. **Document your tunnel configuration** for easy recovery

---

## Summary

Most connection issues are caused by:
1. ❌ UDP buffer sizes too small → Run `optimize-system-for-cloudflare.sh`
2. ❌ DNS resolution failures → Switch DNS servers to 1.1.1.1 or 8.8.8.8
3. ❌ Pokemon Showdown not running → Start the server first
4. ❌ Using quick tunnel without optimization → Upgrade to named tunnel

**First-time setup:**
```bash
# 1. Optimize system
sudo ./optimize-system-for-cloudflare.sh

# 2. Start Pokemon Showdown
cd pokemon-showdown && node pokemon-showdown start

# 3. Start tunnel
./showdown-cloudflare.sh
```

That should resolve most issues!
