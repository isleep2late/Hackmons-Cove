@echo off
setlocal enabledelayedexpansion
REM Launch Pokemon Showdown server terminal (Windows)

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

REM Check Node.js version (v22+ required)
for /f "tokens=1 delims=v." %%v in ('node -v 2^>nul') do set "NODE_MAJOR=%%v"
if not defined NODE_MAJOR (
    echo Error: Node.js is not installed.
    echo Install Node.js v22 or later from https://nodejs.org/
    pause
    exit /b 1
)
REM node -v outputs "v22.x.x", extract major version number
for /f "tokens=1,2 delims=v." %%a in ('node -v') do set "NODE_MAJOR=%%b"
if !NODE_MAJOR! LSS 22 (
    echo Error: Node.js v22 or later is required. You have:
    node -v
    echo.
    echo Download the latest version from https://nodejs.org/
    pause
    exit /b 1
)

echo ==========================================
echo Starting Pokemon Showdown server...
echo ==========================================
echo.

cd /d "!PROJECT_DIR!\pokemon-showdown"
node pokemon-showdown start

echo.
echo ==========================================
echo Server stopped. Press any key to close.
echo ==========================================
pause
