@echo off
REM 1-click demo launcher. Copia questo file sul Desktop.
REM Avvia backend demo + ngrok tunnel + stampa URL per amici.

cd /d "%~dp0"
title Evo-Tactics Demo Launcher
echo ====================================================
echo   Evo-Tactics - demo launcher
echo ====================================================
echo.

REM Verifica node
where node >nul 2>&1
if errorlevel 1 (
    echo [errore] node non trovato. Installa Node.js 22+.
    pause
    exit /b 1
)

REM Build play sempre — evita stale asset hash (HTML ref file non esistenti)
echo [setup] build frontend (sincronizza asset hash)...
call npm run play:build
if errorlevel 1 (
    echo [errore] build fallito.
    pause
    exit /b 1
)

echo [avvio] backend + ngrok tunnel...
node scripts/run-demo-tunnel.cjs

echo.
echo [fine] demo terminata.
pause
