@echo off
setlocal enabledelayedexpansion
title Pure Hackmons - One-Click Self-Host (Windows)
cd /d "%~dp0"

if not defined PHNN_GAME_PORT set "PHNN_GAME_PORT=8000"
if not defined PHNN_CLIENT_PORT set "PHNN_CLIENT_PORT=8080"
set "GAME_PORT=%PHNN_GAME_PORT%"
set "FRONT_PORT=%PHNN_CLIENT_PORT%"
set "NODE_VERSION=v22.12.0"
set "TOOLS=%~dp0.tools"
set "LOGDIR=%~dp0.selfhost-logs"
set "NODEDIR=%TOOLS%\node"
if not exist "%TOOLS%" mkdir "%TOOLS%"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"

echo ==============================================================
echo    Pure Hackmons - One-Click Self-Host (Windows)
echo ==============================================================
echo.

if exist "%NODEDIR%\node.exe" set "PATH=%NODEDIR%;%PATH%"
set "NODEMAJOR=0"
for /f "delims=" %%v in ('node -p "parseInt(process.versions.node,10)" 2^>nul') do set "NODEMAJOR=%%v"
if !NODEMAJOR! LSS 16 (
  echo [0/4] Downloading a private copy of Node.js %NODE_VERSION% ^(no admin needed^)...
  powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'https://nodejs.org/dist/%NODE_VERSION%/node-%NODE_VERSION%-win-x64.zip' -OutFile '%TOOLS%\node.zip' } catch { exit 1 }"
  if errorlevel 1 goto :fail_node
  powershell -NoProfile -Command "Expand-Archive -Force -Path '%TOOLS%\node.zip' -DestinationPath '%TOOLS%'"
  if errorlevel 1 goto :fail_node
  if exist "%NODEDIR%" rmdir /s /q "%NODEDIR%"
  move "%TOOLS%\node-%NODE_VERSION%-win-x64" "%NODEDIR%" >nul
  del "%TOOLS%\node.zip" >nul 2>nul
  set "PATH=%NODEDIR%;%PATH%"
)
node -v >nul 2>nul || goto :fail_node
for /f "delims=" %%v in ('node -v') do echo       Node %%v
echo.

if not exist "pokemon-showdown\config\config.js" copy "pokemon-showdown\config\config-example.js" "pokemon-showdown\config\config.js" >nul 2>nul

echo [1/4] Building the game server ^(npm install + node build^)... this can take a few minutes
pushd pokemon-showdown
call npm install --no-audit --no-fund || (popd & goto :fail_build)
call node build || (popd & goto :fail_build)
popd
echo.

echo       linking the client data cache to the PHNN server ^(prevents an upstream re-clone^)...
if not exist "%~dp0pokemon-showdown-client\caches" mkdir "%~dp0pokemon-showdown-client\caches"
set "PS_CACHE=%~dp0pokemon-showdown-client\caches\pokemon-showdown"
if exist "%PS_CACHE%\data\mods\phnn" goto :cache_ready
if exist "%PS_CACHE%" powershell -NoProfile -Command "Remove-Item -LiteralPath '%PS_CACHE%' -Recurse -Force -ErrorAction SilentlyContinue"
if exist "%PS_CACHE%" rmdir /s /q "%PS_CACHE%" >nul 2>nul
mklink /J "%PS_CACHE%" "%~dp0pokemon-showdown" >nul 2>nul
if errorlevel 1 (
  echo       junction unavailable - copying server data instead ^(one-time, slower^)...
  xcopy /e /i /q /y "%~dp0pokemon-showdown\dist" "%PS_CACHE%\dist" >nul
  xcopy /e /i /q /y "%~dp0pokemon-showdown\data" "%PS_CACHE%\data" >nul
)
:cache_ready
echo.

if not exist "%~dp0pokemon-showdown-client\config" mkdir "%~dp0pokemon-showdown-client\config"
if not exist "%~dp0pokemon-showdown-client\config\routes.json" powershell -NoProfile -Command "[IO.File]::WriteAllText('%~dp0pokemon-showdown-client\config\routes.json',[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('eyAicm9vdCI6ICJwb2tlbW9uc2hvd2Rvd24uY29tIiwgImNsaWVudCI6ICJsb2NhbGhvc3QiLCAicmVzb3VyY2VTZXJ2ZXIiOiAicGxheS5wb2tlbW9uc2hvd2Rvd24uY29tIiwgImRleCI6ICJkZXgucG9rZW1vbnNob3dkb3duLmNvbSIsICJyZXBsYXlzIjogImxvY2FsaG9zdCIsICJ1c2VycyI6ICJwb2tlbW9uc2hvd2Rvd24uY29tL3VzZXJzIiwgInRlYW1zIjogInRlYW1zLnBva2Vtb25zaG93ZG93bi5jb20iIH0=')))"
echo.

echo [2/4] Building the web client ^(npm install + build^)...
pushd pokemon-showdown-client
call npm install --no-audit --no-fund || (popd & goto :fail_build)
call node build full || (popd & goto :fail_build)
popd
echo.

echo [3/4] Pointing the client at this machine...
set "CFG=pokemon-showdown-client\config\config.js"
if not exist "%CFG%" copy "pokemon-showdown-client\config\config-example.js" "%CFG%" >nul 2>nul
powershell -NoProfile -Command "[IO.File]::WriteAllText('%TOOLS%\client-override.js',[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('LyoqKiBQSE5OIG9uZS1jbGljayBzZWxmLWhvc3Qgb3ZlcnJpZGUgKGF1dG8tYWRkZWQpICoqKi8KKGZ1bmN0aW9uICgpIHsKCXRyeSB7CgkJaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnIHx8ICF3aW5kb3cubG9jYXRpb24pIHJldHVybjsKCQlpZiAodHlwZW9mIENvbmZpZyA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybjsKCQl2YXIgbG9jID0gd2luZG93LmxvY2F0aW9uOwoJCXZhciBpc0h0dHBzID0gbG9jLnByb3RvY29sID09PSAnaHR0cHM6JzsKCQl2YXIgcG9ydCA9IGxvYy5wb3J0ID8gTnVtYmVyKGxvYy5wb3J0KSA6IChpc0h0dHBzID8gNDQzIDogODApOwoJCXZhciBob3N0cG9ydCA9IGxvYy5ob3N0OwoJCUNvbmZpZy50ZXN0Y2xpZW50ID0gdHJ1ZTsKCQlDb25maWcucm91dGVzID0gQ29uZmlnLnJvdXRlcyB8fCB7fTsKCQlDb25maWcucm91dGVzLnJvb3QgPSBob3N0cG9ydDsKCQlDb25maWcucm91dGVzLmNsaWVudCA9IGhvc3Rwb3J0OwoJCUNvbmZpZy5yb3V0ZXMucmVwbGF5cyA9IGhvc3Rwb3J0OwoJCUNvbmZpZy5yb3V0ZXMudXNlcnMgPSBob3N0cG9ydCArICcvdXNlcnMnOwoJCWlmICghQ29uZmlnLnJvdXRlcy5yZXNvdXJjZVNlcnZlcikgQ29uZmlnLnJvdXRlcy5yZXNvdXJjZVNlcnZlciA9ICdwbGF5LnBva2Vtb25zaG93ZG93bi5jb20nOwoJCWlmICghQ29uZmlnLnJvdXRlcy5kZXgpIENvbmZpZy5yb3V0ZXMuZGV4ID0gJ2RleC5wb2tlbW9uc2hvd2Rvd24uY29tJzsKCQlpZiAoIUNvbmZpZy5yb3V0ZXMudGVhbXMpIENvbmZpZy5yb3V0ZXMudGVhbXMgPSAndGVhbXMucG9rZW1vbnNob3dkb3duLmNvbSc7CgkJQ29uZmlnLmRlZmF1bHRzZXJ2ZXIgPSB7CgkJCWlkOiAncGhubicsIGhvc3Q6IGxvYy5ob3N0bmFtZSwgcG9ydDogcG9ydCwgaHR0cHBvcnQ6IHBvcnQsCgkJCWFsdHBvcnQ6IHBvcnQsIGh0dHBzOiBpc0h0dHBzLCByZWdpc3RlcmVkOiBmYWxzZSwKCQl9OwoJCUNvbmZpZy5zZXJ2ZXIgPSBDb25maWcuZGVmYXVsdHNlcnZlcjsKCX0gY2F0Y2ggKGUpIHt9Cn0pKCk7Ci8qKiogRW5kIFBITk4gb25lLWNsaWNrIHNlbGYtaG9zdCBvdmVycmlkZSAqKiovCg==')))"
powershell -NoProfile -Command "[IO.File]::WriteAllText('%TOOLS%\merge-config.js',[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('Y29uc3QgZnMgPSByZXF1aXJlKCdmcycpOwpjb25zdCBbY2ZnLCBvdnJdID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpOwpsZXQgcyA9IGZzLnJlYWRGaWxlU3luYyhjZmcsICd1dGY4Jyk7CmNvbnN0IGkgPSBzLmluZGV4T2YoJy8qKiogUEhOTiBvbmUtY2xpY2sgc2VsZi1ob3N0IG92ZXJyaWRlJyk7CmlmIChpID49IDApIHMgPSBzLnNsaWNlKDAsIGkpLnJlcGxhY2UoL1xzKyQvLCAnJykgKyAnXG4nOwpzICs9ICdcbicgKyBmcy5yZWFkRmlsZVN5bmMob3ZyLCAndXRmOCcpOwpmcy53cml0ZUZpbGVTeW5jKGNmZywgcyk7Cg==')))"
call node "%TOOLS%\merge-config.js" "%CFG%" "%TOOLS%\client-override.js" || goto :fail_build
echo       done
echo.

set "CF=%TOOLS%\cloudflared.exe"
if not exist "%CF%" (
  echo [4/4] Downloading cloudflared ^(free public-tunnel tool^)...
  powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%CF%' } catch { exit 1 }"
  if errorlevel 1 goto :fail_cf
)

echo       starting game server on :%GAME_PORT% and web server on :%FRONT_PORT% ...
start "PHNN Game Server" /min /d "%~dp0pokemon-showdown" cmd /c "node pokemon-showdown start %GAME_PORT% 1> ""%LOGDIR%\game.log"" 2>&1"
set "PHNN_GAME_HOST=localhost"
start "PHNN Web Server" /min /d "%~dp0" cmd /c "node pokemon-showdown-client\deploy\phnn-client-server.js 1> ""%LOGDIR%\front.log"" 2>&1"

echo       waiting for the web server ...
powershell -NoProfile -Command "for($i=0;$i -lt 40;$i++){ try{ Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:%FRONT_PORT%' -TimeoutSec 2 | Out-Null; break }catch{ Start-Sleep 1 } }"

echo       opening Cloudflare tunnel ...
start "PHNN Tunnel" /min /d "%~dp0" cmd /c """%CF%"" tunnel --url http://localhost:%FRONT_PORT% 1> ""%LOGDIR%\tunnel.log"" 2>&1"

set "URL="
for /f "usebackq tokens=*" %%u in (`powershell -NoProfile -Command "$u=$null; for($i=0;$i -lt 40 -and -not $u;$i++){ if(Test-Path '%LOGDIR%\tunnel.log'){ $m=Select-String -Path '%LOGDIR%\tunnel.log' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue; if($m){ $u=$m.Matches[0].Value } }; if(-not $u){ Start-Sleep 1 } }; Write-Output $u"`) do set "URL=%%u"

echo.
if defined URL (
  echo ==============================================================
  echo    YOUR SERVER IS LIVE
  echo    Public ^(share this^):  !URL!
  echo    On this computer:     http://localhost:%FRONT_PORT%
  echo ==============================================================
  echo    - Anyone can open the https link above and play.
  echo    - This is a temporary URL; a new one is created each run.
  echo    - Logs: %LOGDIR%
  echo    - Closing this window stops the server.
  start "" "!URL!"
) else (
  echo The server is up at http://localhost:%FRONT_PORT% but no tunnel URL appeared.
  echo Check "%LOGDIR%\tunnel.log" - your network may block Cloudflare. Local play still works.
)
echo.
echo Press any key to STOP the server and tunnel...
pause >nul
taskkill /f /t /fi "WINDOWTITLE eq PHNN Game Server*" >nul 2>nul
taskkill /f /t /fi "WINDOWTITLE eq PHNN Web Server*" >nul 2>nul
taskkill /f /t /fi "WINDOWTITLE eq PHNN Tunnel*" >nul 2>nul
taskkill /f /im cloudflared.exe >nul 2>nul
goto :eof

:fail_node
echo.
echo ERROR: Could not install Node.js. Check your internet connection and try again.
pause
goto :eof
:fail_build
echo.
echo ERROR: A build step failed. Scroll up to see the error.
pause
goto :eof
:fail_cf
echo.
echo ERROR: Could not download cloudflared. Check your internet connection.
pause
goto :eof
