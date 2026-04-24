@echo off
REM Evo-Tactics 1-click demo launcher.
REM Doppio clic (o tramite shortcut Desktop) = go.

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

REM Build frontend (sincronizza asset hash: evita .html ref file non esistenti)
echo.
echo   [setup] build frontend in corso...
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
