@echo off
REM Evo-Tactics — Sync main + npm install (esegui prima rubric session se nuove PR mergiate).
REM Doppio clic desktop shortcut → git pull origin main + npm install (se package.json drift).

setlocal
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title Evo-Tactics Sync Main

echo.
echo   ===========================================================
echo                  EVO-TACTICS SYNC MAIN BRANCH
echo   ===========================================================
echo.

REM Verifica git presence
where git >nul 2>&1
if errorlevel 1 (
    echo   [X] git non trovato. Installa Git per Windows da https://git-scm.com
    echo.
    pause
    exit /b 1
)

REM Save package.json hash pre-pull per detect dep drift
for /f "delims=" %%H in ('certutil -hashfile package.json SHA1 ^| find /v ":" ^| find /v "CertUtil"') do set "PRE_PKG_HASH=%%H"

echo   [setup] git fetch + pull origin main...
git fetch origin main >nul 2>&1
if errorlevel 1 (
    echo   [X] git fetch fallito. Verifica connessione internet + remote origin.
    pause
    exit /b 1
)

REM Detect current branch
for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD') do set "CURRENT_BRANCH=%%B"

if /i "%CURRENT_BRANCH%"=="main" (
    git pull origin main 2>&1
) else (
    echo   [!] Branch corrente: %CURRENT_BRANCH% ^(non main^)
    echo       Switch a main + pull...
    git checkout main 2>&1
    if errorlevel 1 (
        echo   [X] git checkout main fallito. Working tree dirty? Stash o commit prima.
        pause
        exit /b 1
    )
    git pull origin main 2>&1
)

echo.
echo   [OK]   main aggiornato.

REM Compare package.json hash post-pull
for /f "delims=" %%H in ('certutil -hashfile package.json SHA1 ^| find /v ":" ^| find /v "CertUtil"') do set "POST_PKG_HASH=%%H"

if not "%PRE_PKG_HASH%"=="%POST_PKG_HASH%" (
    echo.
    echo   [!]   package.json modificato. Run npm install...
    call npm install
    if errorlevel 1 (
        echo   [X] npm install fallito.
        pause
        exit /b 1
    )
    echo   [OK]  dependencies aggiornate.
) else (
    echo   [OK]  package.json invariato. Skip npm install.
)

echo.
echo   ===========================================================
echo   HEAD corrente:
git log --oneline -3
echo   ===========================================================
echo.
echo   PRONTO per rubric session.
echo.
echo   Prossimo step:
echo         Doppio clic icona desktop "Evo-Tactics-Demo"
echo         per avviare backend + ngrok tunnel + auto-open browser.
echo.
echo   ===========================================================
echo.
pause
endlocal
