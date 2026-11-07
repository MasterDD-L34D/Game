@echo off
REM Evo-Tactics 1-click demo launcher.
REM Doppio clic (o tramite shortcut Desktop) = go.
REM Hotfix 2026-04-29: worktree-aware. Detect main worktree path se main checked out altrove.

setlocal
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title Evo-Tactics Demo Launcher

REM Node presence (fail fast prima di lanciare Node)
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo   [X] node non trovato. Installa Node.js 18+ da https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Detect se main e' checked out in altro worktree (Node helper, no shell escape issues)
set "MAIN_WT="
for /f "usebackq delims=" %%P in (`node scripts\find-main-worktree.cjs 2^>nul`) do set "MAIN_WT=%%P"

REM Detect current branch
for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "CURRENT_BRANCH=%%B"

REM Switch a main worktree se diverso da current
if defined MAIN_WT (
    if /i not "%MAIN_WT%"=="%cd%" (
        echo   [!]  Demo runs from main worktree: %MAIN_WT%
        cd /d "%MAIN_WT%"
    )
)

REM Build frontend (sincronizza asset hash: evita .html ref file non esistenti)
echo.
echo   [setup] build frontend in corso (path: %cd%^)...
call npm run play:build >nul 2>&1
if errorlevel 1 (
    echo.
    echo   [X] build fallito. Ri-lancia con output completo:
    echo       npm run play:build
    echo.
    pause
    exit /b 1
)
echo   [OK]   frontend buildato

REM Delega tutto (preflight + backend + ngrok + banner + auto-open) al Node launcher
node scripts/run-demo-tunnel.cjs

echo.
echo   [fine] demo terminata.
pause
endlocal
