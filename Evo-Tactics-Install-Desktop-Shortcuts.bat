@echo off
REM Evo-Tactics installer 1-click 5 desktop shortcuts ASCII-only.
REM Run UNA volta per setup (o re-run per refresh post repo move).
REM Crea: Evo-Tactics-Demo, Evo-Tactics-Sync-Main, Evo-Tactics-Toggle-A-Classic, Evo-Tactics-Toggle-B-BG3lite.

setlocal
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title Evo-Tactics Install Desktop Shortcuts

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-desktop-shortcuts.ps1"

if errorlevel 1 (
    echo.
    echo   [X] Install fallito. Verifica PowerShell installato + Execution Policy.
    echo.
    pause
    exit /b 1
)

endlocal
