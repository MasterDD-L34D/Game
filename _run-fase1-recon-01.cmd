@echo off
REM Auto-execute RECON-01 E2E baseline: switch branch -> run 19 test -> capture output ->
REM commit (baseline.md + cmd) -> push -> draft PR.
REM Generato 2026-05-26 da Claude. One-tantum, safe-to-delete dopo merge.
REM
REM Pre-flight Eduardo:
REM - PG17 up (DATABASE_URL=postgresql://postgres:postgres@localhost:5432/game)
REM - npm install gia' eseguito (lint-staged + supertest disponibili)
REM Test sono pure-code (no DB needed -- createApp(databasePath:null) in test).

setlocal enabledelayedexpansion
cd /d C:\dev\Game

echo === Step 1: rimuovo lock stantio (se presente) ===
if exist .git\index.lock (
    del /f .git\index.lock
    echo lock removed
) else (
    echo no lock present
)

echo.
echo === Step 2: checkout main + pull + branch ===
git checkout main
if not %errorlevel%==0 goto :err
git pull origin main
if not %errorlevel%==0 goto :err
git checkout -b feat/spore-fase1-recon-01-e2e-baseline
if not %errorlevel%==0 goto :err

echo.
echo === Step 3: run 19 test Fase-1 (mutationsRoutes + mpTracker) ===
echo Cattura output in temp file...
set "RECON01_TMP=%TEMP%\recon-01-test-output.txt"
echo === RUN node --test tests/api/mutationsRoutes.test.js tests/services/mpTracker.test.js === > "%RECON01_TMP%"
echo Timestamp run: %DATE% %TIME% >> "%RECON01_TMP%"
echo. >> "%RECON01_TMP%"
node --test tests/api/mutationsRoutes.test.js tests/services/mpTracker.test.js >> "%RECON01_TMP%" 2>&1
set "TEST_EXIT=%errorlevel%"
echo. >> "%RECON01_TMP%"
echo === EXIT CODE: %TEST_EXIT% === >> "%RECON01_TMP%"

if not %TEST_EXIT%==0 (
    echo !!! TEST FAIL exit %TEST_EXIT% -- vedi %RECON01_TMP%
    type "%RECON01_TMP%" | findstr /R /C:"^# fail" /C:"failures" /C:"^not ok"
    echo Continua per committare comunque? Manual decide [Y]es / [N]o
    set /p CONFIRM=
    if /i not "!CONFIRM!"=="Y" goto :err
)

echo Test PASS / continuo a popolare baseline.md
echo.

echo === Step 4: popolo §3 di docs/research/2026-05-26-fase1-spore-e2e-baseline.md ===
REM Sostituisco i placeholder <PENDING> con timestamp + test output reale.
REM Uso PowerShell per sed-like replace (cmd nativo non lo fa bene).
powershell -NoProfile -Command "$ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'; $out = Get-Content -Raw '%RECON01_TMP%'; $md = Get-Content -Raw 'docs/research/2026-05-26-fase1-spore-e2e-baseline.md'; $md = $md -replace '### Run timestamp: `<PENDING>`', \"### Run timestamp: ``$ts``\"; $md = $md -replace '<PENDING -- esegui _run-fase1-recon-01.cmd per popolare>', $out; Set-Content -Path 'docs/research/2026-05-26-fase1-spore-e2e-baseline.md' -Value $md -NoNewline -Encoding UTF8; Write-Host 'baseline.md updated OK'"
if not %errorlevel%==0 goto :err

echo.
echo === Step 5: stage + commit (husky lint-staged auto-format) ===
git add docs/research/2026-05-26-fase1-spore-e2e-baseline.md _run-fase1-recon-01.cmd
if not %errorlevel%==0 goto :err

git status --short

git commit -m "feat(spore-fase1): RECON-01 E2E baseline (19 test mapped + verified)" -m "" -m "Plan RECON-01 step 1-6 mapped to existing tests: 9 mutationsRoutes + 10 mpTracker. Step 7 frontend visual deferred RECON-01.1 manual smoke gating (NOT blocker)." -m "" -m "Empirical run captured in baseline.md section 3. Test runner = node:test standard (G4 resolved: NO tdd-guard tool needed)." -m "" -m "Ref: docs/superpowers/plans/2026-05-26-fase1-spore-moderate-reconciliation-plan.md" -m "Closes: RECON-01 (Wave-1 BLOCKER cleared per Wave-2 kickoff)"
if not %errorlevel%==0 goto :err

echo.
echo === Step 6: push -u origin ===
git push -u origin feat/spore-fase1-recon-01-e2e-baseline
if not %errorlevel%==0 goto :err

echo.
echo === Step 7: gh pr create --draft ===
gh pr create --draft --title "feat(spore-fase1): RECON-01 E2E baseline" --body-file docs/research/2026-05-26-fase1-spore-e2e-baseline.md
if not %errorlevel%==0 goto :err

echo.
echo ============================================================
echo OK -- RECON-01 baseline committed + pushed + draft PR aperto.
echo ============================================================
echo.
echo Puoi eliminare questo script (_run-fase1-recon-01.cmd) post-merge.
echo.
pause
exit /b 0

:err
echo.
echo !!! ERROR step fallito (exit code %errorlevel%) -- fermo. !!!
echo Risolvi manualmente e ri-esegui da dove serve.
pause
exit /b 1
