@echo off
setlocal enabledelayedexpansion
REM Launch Pokemon Showdown Cloudflare tunnel (Windows) with optimizations

echo ==========================================
echo   Starting Cloudflare Tunnel
echo   play.hackmons.com -^> localhost:8000
echo ==========================================
echo.

REM Determine project directory (use .env if available, otherwise use script location)
set "PROJECT_DIR=%~dp0"
REM Remove trailing backslash
if "!PROJECT_DIR:~-1!"=="\" set "PROJECT_DIR=!PROJECT_DIR:~0,-1!"

if exist "%~dp0leftovers-again\.env" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0leftovers-again\.env") do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" if not "%%a"=="" set "%%a=%%b"
    )
)

REM Check if cloudflared is installed
where cloudflared >nul 2>nul
if errorlevel 1 (
    echo Error: cloudflared is not installed.
    echo Install it from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
    pause
    exit /b 1
)

REM Check if config file exists
set "CONFIG_FILE=%~dp0cloudflared-config.yml"
if exist "!CONFIG_FILE!" (
    echo Using configuration file: cloudflared-config.yml
    echo   - Optimized timeouts for long-lived connections
    echo   - QUIC protocol for better performance
    echo   - Enhanced retry logic
    echo.

    REM Check for tunnel credentials
    if exist "%USERPROFILE%\.cloudflared\*.json" (
        echo Found tunnel credentials - using named tunnel with config
        set "TUNNEL_CMD=cloudflared tunnel --config !CONFIG_FILE! run"
    ) else (
        echo Quick tunnel mode detected (no named tunnel configured)
        echo For full config support, create a named tunnel
        echo See: CLOUDFLARE-TROUBLESHOOTING.md
        echo.
        set "TUNNEL_CMD=cloudflared tunnel --url http://localhost:8000"
    )
) else (
    echo Warning: cloudflared-config.yml not found
    echo Using default quick tunnel mode (not recommended for production)
    echo.
    set "TUNNEL_CMD=cloudflared tunnel --url http://localhost:8000"
)

REM Check if Pokemon Showdown is running
curl -s -o nul -w "%%{http_code}" http://localhost:8000 | findstr /r "^[23][0-9][0-9]$" >nul
if errorlevel 1 (
    echo Warning: No server detected at http://localhost:8000
    echo Make sure Pokemon Showdown is running before starting the tunnel.
    echo.
    echo IMPORTANT: You MUST start the server first before the tunnel!
    echo   Run type_node_pokemon-showdown.bat in a separate window first.
    echo.
    set /p "confirm=Continue anyway? (y/N): "
    if /i not "!confirm!"=="y" exit /b 1
)

echo.
echo Starting tunnel...
echo.
echo Tips for troubleshooting:
echo   - Check that Pokemon Showdown is running on port 8000
echo   - See CLOUDFLARE-TROUBLESHOOTING.md for common issues
echo   - Share the tunnel URL (shown below) with friends to battle!
echo.

cd /d "!PROJECT_DIR!\pokemon-showdown"
!TUNNEL_CMD!

echo.
echo ==========================================
echo Tunnel stopped. Press any key to close.
echo ==========================================
pause
