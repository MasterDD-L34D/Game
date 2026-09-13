@echo off
REM Evo-Tactics ngrok authtoken 1-time setup.
REM Doppio clic UNA volta per setup ngrok account auth.
REM ASCII-only per cmd parser compat (no UTF-8 special chars).

setlocal
title Evo-Tactics Setup ngrok auth

echo.
echo   ===========================================================
echo                EVO-TACTICS SETUP NGROK AUTHTOKEN
echo   ===========================================================
echo.
echo   Setup 1-volta. Necessario per Demo launcher.
echo.
echo   STEP 1: Account ngrok gratis 4 connessioni
echo           https://ngrok.com/signup
echo           Salta se gia hai account.
echo.
echo   STEP 2: Copy authtoken
echo           https://dashboard.ngrok.com/get-started/your-authtoken
echo.
echo   ===========================================================
echo.

REM Verifica ngrok presence
where ngrok >nul 2>&1
if errorlevel 1 (
    echo   [X] ngrok non trovato. Install:
    echo       https://ngrok.com/download Windows ZIP extract in PATH
    echo       OR Microsoft Store "ngrok"
    echo.
    pause
    exit /b 1
)

echo   STEP 3: Paste token qui sotto, premi INVIO
echo.
set /p NGROK_TOKEN=Token ngrok:

if "%NGROK_TOKEN%"=="" (
    echo.
    echo   [X] Token vuoto. Riprova.
    pause
    exit /b 1
)

echo.
echo   [setup] ngrok config add-authtoken...
ngrok config add-authtoken %NGROK_TOKEN%
if errorlevel 1 (
    echo.
    echo   [X] Setup fallito. Verifica token corretto + connessione internet.
    pause
    exit /b 1
)

echo.
echo   ===========================================================
echo                         SETUP COMPLETATO
echo   ===========================================================
echo.
echo   Authtoken salvato in ngrok config.
echo.
echo   Prossimo step:
echo         Doppio clic icona desktop "Evo-Tactics-Demo"
echo         per avviare backend + ngrok tunnel pubblico.
echo.
echo   ===========================================================
echo.
pause
endlocal
