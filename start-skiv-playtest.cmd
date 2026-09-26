@echo off
REM ============================================================================
REM Skiv Playtest Launcher — Windows one-click setup
REM
REM Cosa fa:
REM   1. Backfill state Skiv da GitHub repo events (refresh)
REM   2. Start backend Game :3334 (separate window)
REM   3. Start frontend Vite :5180 (separate window)
REM   4. Mostra LAN IP per phone clients
REM   5. Apre browser su http://localhost:5180
REM
REM Requisiti:
REM   - Node 22.x + npm 11+ installati (PATH)
REM   - Python 3.10+ installato (PATH)
REM   - gh CLI installato + autenticato (`gh auth login`)
REM   - Dependencies installate (`npm ci` + `pip install -r tools/py/requirements.txt`)
REM
REM Usage: double-click start-skiv-playtest.cmd
REM ============================================================================

setlocal enabledelayedexpansion
title Skiv Playtest Launcher
color 0E

echo.
echo ============================================
echo   SKIV PLAYTEST LAUNCHER
echo   Evo-Tactics 2026
echo ============================================
echo.

REM Step 0 — preflight checks
echo [1/5] Preflight checks...
where node >nul 2>&1 || (echo ERROR: node not in PATH. Install Node 22+. & pause & exit /b 1)
where npm >nul 2>&1 || (echo ERROR: npm not in PATH. & pause & exit /b 1)
where python >nul 2>&1 || (echo ERROR: python not in PATH. Install Python 3.10+. & pause & exit /b 1)
where gh >nul 2>&1 || (echo ERROR: gh CLI not in PATH. Install from cli.github.com & pause & exit /b 1)

REM Get gh token (validates auth login).
for /f "delims=" %%i in ('gh auth token 2^>nul') do set GH_TOKEN=%%i
if "!GH_TOKEN!"=="" (
  echo ERROR: gh not authenticated. Run: gh auth login
  pause
  exit /b 1
)
echo   ✓ Node, npm, python, gh CLI ok

REM Step 1 — backfill Skiv state
echo.
echo [2/5] Backfill Skiv state from repo events...
set GITHUB_TOKEN=!GH_TOKEN!
set PYTHONIOENCODING=utf-8
python tools\py\skiv_backfill.py --max-pages 25 --reset-state --quiet
if errorlevel 1 (
  echo WARN: backfill failed but continuing. Check tools\py\skiv_backfill.py manually.
) else (
  echo   ✓ Skiv state refreshed
)

REM Step 2 — start backend in new window
echo.
echo [3/5] Starting backend on :3334...
start "Skiv Backend :3334" cmd /k "cd /d %~dp0 && npm run start:api"
echo   ✓ Backend window opened (give it ~10s to boot)

REM Step 3 — wait for backend health
timeout /t 8 /nobreak >nul

REM Step 4 — start frontend in new window
echo.
echo [4/5] Starting frontend Vite on :5180...
start "Skiv Frontend :5180" cmd /k "cd /d %~dp0 && npm run dev --workspace apps/play"
echo   ✓ Frontend window opened

REM Wait for Vite ready
timeout /t 5 /nobreak >nul

REM Step 5 — show LAN IP + open browser
echo.
echo [5/5] LAN IP for phone clients:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4.*\."') do (
  set IP=%%a
  set IP=!IP: =!
  echo   Phone URL: http://!IP!:5180/lobby.html
)
echo.
echo Local URL: http://localhost:5180
echo.

REM Open browser local
start "" "http://localhost:5180"

echo ============================================
echo   SKIV LIVE — pronti per playtest
echo ============================================
echo.
echo TEST CHECKLIST:
echo   1. Click bottone 🦎 Skiv in header
echo   2. Verifica sprite + lifecycle bar 5 fasi
echo   3. Verifica status chip 'Lv 4 · Predatore Maturo'
echo   4. Verifica bond hearts (vega ♥♥♥ rhodo ♥♥)
echo   5. Verifica feed eventi recenti
echo   6. Riduci finestra a 400px (mobile responsive)
echo.
echo Per fermare: chiudi le finestre 'Skiv Backend' e 'Skiv Frontend'.
echo Per re-eseguire: doppio-click su questo file.
echo.
echo Sabbia segue.
echo.
pause
endlocal
