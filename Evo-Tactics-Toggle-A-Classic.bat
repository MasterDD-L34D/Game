@echo off
REM Evo-Tactics rubric session — toggle MODALITÀ A (grid square classic).
REM Doppio clic desktop shortcut → set ui_config.json all bg3lite_*: false.
REM Path A: master-dd rubric session 4 amici tester DIVERSI (ADR-2026-04-28-bg3-lite-plus §9).

setlocal
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title Evo-Tactics Rubric Toggle A (Classic)

set "CONFIG_FILE=apps\play\public\data\ui_config.json"

if not exist "%CONFIG_FILE%" (
    echo.
    echo   [X] %CONFIG_FILE% non trovato.
    echo       Verifica HEAD branch main >= 9ba3a265 (post Spike POC PR #2003).
    echo.
    pause
    exit /b 1
)

REM Write modalità A — grid square classic (tutti toggle false).
> "%CONFIG_FILE%" (
    echo {
    echo   "bg3lite_hide_grid": false,
    echo   "bg3lite_smooth_movement": false,
    echo   "bg3lite_range_circle": false,
    echo   "bg3lite_aoe_shape": false
    echo }
)

echo.
echo   ===========================================================
echo                MODALITA' A — GRID SQUARE CLASSIC
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
echo   1. Di' agli amici tester di fare HARD-RELOAD del browser:
echo         Windows/Linux: Ctrl + Shift + R
echo         Mac:           Cmd + Shift + R
echo.
echo   2. Amici giocano encounter "tutorial_01" ~5 min in modalita' A.
echo.
echo   3. Annota score 4 criteri (1-5 scale) per ognuno tester:
echo         - Movement smoothness
echo         - Range readability
echo         - Combat feel "2024 RPG"
echo         - Echolocation Skiv lore-faithful
echo.
echo   4. Quando finito modalita' A, doppio clic icona desktop:
echo         "Evo-Tactics-Toggle-B-BG3lite"
echo      per passare a modalita' B (BG3-lite Tier 1).
echo.
echo   ===========================================================
echo.
pause
endlocal
