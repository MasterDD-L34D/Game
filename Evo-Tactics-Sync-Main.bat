@echo off
REM Evo-Tactics Sync main + npm install esegui prima rubric session se nuove PR mergiate.
REM Doppio clic desktop shortcut git pull origin main + npm install se package.json drift.
REM Hotfix 2026-04-29: worktree-aware. Detect main worktree path se main checked out altrove.
REM ASCII-only per cmd parser compat.

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

echo   [setup] git fetch origin main...
git fetch origin main >nul 2>&1
if errorlevel 1 (
    echo   [X] git fetch fallito. Verifica connessione internet + remote origin.
    pause
    exit /b 1
)

REM Detect se main e' checked out in altro worktree (Node helper, no shell escape issues)
set "MAIN_WT="
for /f "usebackq delims=" %%P in (`node scripts\find-main-worktree.cjs 2^>nul`) do set "MAIN_WT=%%P"

REM Detect current branch
for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD') do set "CURRENT_BRANCH=%%B"

if defined MAIN_WT (
    if /i not "%MAIN_WT%"=="%cd%" (
        echo   [!]  Main checked out in worktree separato:
        echo        %MAIN_WT%
        echo.
        echo   [setup] Pull main da quel worktree...
        pushd "%MAIN_WT%"
        git pull --ff-only origin main 2>&1
        if errorlevel 1 (
            echo   [!]  Pull diverged o conflict. Fallback: fetch ref only.
            git fetch origin main:main 2>&1
        )
        popd
        echo   [OK]  Main worktree synced.
        goto :checkdeps
    )
)

if /i "%CURRENT_BRANCH%"=="main" (
    git pull --ff-only origin main 2>&1
    if errorlevel 1 (
        echo   [!]  Pull main fallito. Working tree dirty? Stash o commit prima.
        pause
        exit /b 1
    )
    echo   [OK]  Main aggiornato.
) else (
    echo   [!]  Branch corrente: %CURRENT_BRANCH% (non main)
    echo        Update local main ref via fetch (NO checkout)...
    git fetch origin main:main 2>&1
    if errorlevel 1 (
        echo   [!]  Local main divergente. Fetch only senza ref update.
        git fetch origin main 2>&1
    )
    echo   [OK]  origin/main fetched.
    echo.
    echo   NOTA: per usare apps/play da main, switch a main worktree
    echo         o checkout main qui (richiede working tree pulito^).
)

:checkdeps
REM Determine target worktree per package.json check
set "TARGET_DIR=%cd%"
if defined MAIN_WT (
    if /i not "%MAIN_WT%"=="%cd%" set "TARGET_DIR=%MAIN_WT%"
)

REM Compare package.json hash post-pull (in target dir)
echo.
echo   [setup] Verifica package.json drift in %TARGET_DIR%...
pushd "%TARGET_DIR%"
for /f "delims=" %%H in ('certutil -hashfile package.json SHA1 ^| find /v ":" ^| find /v "CertUtil"') do set "POST_PKG_HASH=%%H"

REM Check se node_modules esiste
if not exist node_modules (
    echo   [!]   node_modules mancante. Run npm install...
    call npm install
    if errorlevel 1 (
        echo   [X] npm install fallito.
        popd
        pause
        exit /b 1
    )
    echo   [OK]  dependencies installate.
) else (
    echo   [OK]  node_modules presente. Skip npm install salvo drift critico.
)
popd

echo.
echo   ===========================================================
echo   HEAD corrente origin/main:
git log origin/main --oneline -3
echo   ===========================================================
echo.
echo   PRONTO per rubric session.
echo.
echo   Prossimo step:
echo         Doppio clic icona desktop "Evo-Tactics-Demo"
echo         per avviare backend + ngrok tunnel + auto-open browser.
echo.
if defined MAIN_WT (
    echo   NOTA worktree: Demo launcher esegue da:
    echo         %MAIN_WT%
    echo.
)
echo   ===========================================================
echo.
pause
endlocal
