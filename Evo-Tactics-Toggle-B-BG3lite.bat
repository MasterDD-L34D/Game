@echo off
REM Evo-Tactics rubric session toggle MODALITA B BG3-lite Tier 1.
REM Doppio clic desktop shortcut set ui_config.json all bg3lite true.
REM Path A: master-dd rubric session 4 amici tester DIVERSI ADR-2026-04-28.
REM ASCII-only per cmd parser compat.

setlocal
cd /d "%~dp0"
title Evo-Tactics Rubric Toggle B BG3-lite Tier 1

REM Detect main worktree Node helper no shell escape
set "MAIN_WT="
for /f "usebackq delims=" %%P in (`node scripts\find-main-worktree.cjs 2^>nul`) do set "MAIN_WT=%%P"

if defined MAIN_WT (
    if /i not "%MAIN_WT%"=="%cd%" (
        echo   [!]  Toggle config in main worktree: %MAIN_WT%
        cd /d "%MAIN_WT%"
    )
)

set "CONFIG_FILE=apps\play\public\data\ui_config.json"

if not exist "%CONFIG_FILE%" (
    echo.
    echo   [X] %CONFIG_FILE% non trovato.
    echo       Verifica HEAD branch main post Spike POC PR 2003.
    echo.
    pause
    exit /b 1
)

REM Write modalita B BG3-lite Tier 1 tutti toggle true
> "%CONFIG_FILE%" (
    echo {
    echo   "bg3lite_hide_grid": true,
    echo   "bg3lite_smooth_movement": true,
    echo   "bg3lite_range_circle": true,
    echo   "bg3lite_aoe_shape": true
    echo }
)

echo.
echo   ===========================================================
echo              MODALITA B BG3-LITE TIER 1 ATTIVA
echo   ===========================================================
echo.
echo   Config aggiornata: %CONFIG_FILE%
echo.
echo   STATE:
type "%CONFIG_FILE%"
echo.
echo   ===========================================================
echo   PROSSIMO STEP rubric session:
echo   ===========================================================
echo.
echo   1. Di agli amici tester di fare HARD-RELOAD del browser
echo         Windows/Linux Ctrl + Shift + R
echo         Mac           Cmd + Shift + R
echo.
echo   2. Amici giocano STESSO encounter tutorial_01 circa 5 min in modalita B.
echo.
echo   3. Annota score 4 criteri 1-5 scale per ognuno tester:
echo         - Movement smoothness
echo         - Range readability
echo         - Combat feel 2024 RPG
echo         - Echolocation Skiv lore-faithful
echo.
echo   4. Aggregate scores in
echo         docs\playtest\2026-04-29-bg3-lite-spike-rubric.md
echo.
echo   THRESHOLD PASS verdict GO Sprint G.2b 10-12g:
echo         - Media modalita B  maggiore o uguale 3.5 / 5
echo         - Zero score 1 in modalita B
echo         - Zero criterio rigetto unanime
echo.
echo   ===========================================================
echo.
pause
endlocal
