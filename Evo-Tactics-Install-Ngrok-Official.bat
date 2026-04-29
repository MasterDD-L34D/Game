@echo off
REM Evo-Tactics installer ngrok official ZIP fix Microsoft Store bug.
REM Doppio clic UNA volta. Download ngrok da ngrok.com extract in .tools/ngrok/.

setlocal
title Evo-Tactics Install ngrok Official

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-ngrok-official.ps1"

if errorlevel 1 (
    echo.
    echo   [X] Install ngrok official fallito.
    echo.
    pause
    exit /b 1
)

echo.
pause
endlocal
