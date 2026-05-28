@echo off
REM Template parametrico: branch nuovo + test run + commit + push + draft PR
REM Estratto dai 4 _*.cmd ad-hoc PR #2393/#2394 (2026-05-26 Fase-1 Spore recon, cancellati post-merge).
REM Vedi README.md sezione "Pattern coperto" per dettagli.
REM
REM Uso (dopo edit dei placeholder %BRANCH%, %COMMIT_TITLE%, etc.):
REM   tools\scripts\git-pr-workflow\branch-and-pr.cmd
REM
REM Pre-flight Eduardo:
REM - npm install / prisma generate gia' eseguiti
REM - main aggiornato (git pull origin main da clean state)
REM - gh CLI auth attiva (MasterDD-L34D)

setlocal enabledelayedexpansion
cd /d C:\dev\Game

REM UTF-8 console (anti-mojibake nei test output e commit body)
chcp 65001 >nul 2>&1

REM === Parametri da editare ===
set "BRANCH=chore/example-topic-2026-05-29"
set "COMMIT_TYPE=chore"
set "COMMIT_SCOPE=example"
set "COMMIT_SUBJECT=esempio commit multiline"
set "TEST_TARGETS=tests/api/example.test.js"
set "PR_TITLE=chore(example): esempio commit multiline"
set "PR_BODY_FILE=docs/research/2026-05-29-example.md"
set "OUTPUT_TMP=%TEMP%\branch-and-pr-output.txt"

echo === Step 1: rimuovo lock stantio se presente ===
if exist .git\index.lock (
    del /f .git\index.lock
    echo lock removed
) else (
    echo no lock present
)

echo.
echo === Step 2: checkout main + pull + creazione branch ===
git checkout main
if not %errorlevel%==0 goto :err
git pull origin main
if not %errorlevel%==0 goto :err
git checkout -b %BRANCH%
if not %errorlevel%==0 goto :err

echo.
echo === Step 3: run test mirati (cattura output) ===
echo === RUN node --test %TEST_TARGETS% === > "%OUTPUT_TMP%"
echo Timestamp: %DATE% %TIME% >> "%OUTPUT_TMP%"
echo. >> "%OUTPUT_TMP%"
node --test %TEST_TARGETS% >> "%OUTPUT_TMP%" 2>&1
set "TEST_EXIT=%errorlevel%"
echo. >> "%OUTPUT_TMP%"
echo === EXIT CODE: %TEST_EXIT% === >> "%OUTPUT_TMP%"

if not %TEST_EXIT%==0 (
    echo TEST FAIL exit %TEST_EXIT% -- vedi %OUTPUT_TMP%
    type "%OUTPUT_TMP%" | findstr /R /C:"^# fail" /C:"failures" /C:"^not ok"
    echo Continua a committare comunque [Y]/N?
    set /p CONFIRM=
    if /i not "!CONFIRM!"=="Y" goto :err
) else (
    echo Test PASS
)

echo.
echo === Step 4: stage file specifici ===
REM IMPORTANTE: mai git add -A. Lista esplicita.
REM git add path/to/file1 path/to/file2 ...
echo (skipping git add -- edit lo script con i file specifici prima di runnare)
echo.

REM === Step 5: commit Conventional Commits multi-line ===
REM Pattern: titolo + body line 1 + body line 2 + ref
REM Usa piu' -m per linee distinte (newline-aware)
REM
REM git commit ^
REM   -m "%COMMIT_TYPE%(%COMMIT_SCOPE%): %COMMIT_SUBJECT%" ^
REM   -m "" ^
REM   -m "Body line 1: cosa cambia, perche', evidenza empirica." ^
REM   -m "" ^
REM   -m "Body line 2: cross-link a research / ADR / PR precedenti." ^
REM   -m "" ^
REM   -m "Coding-Agent: claude-opus-4.7" ^
REM   -m "Trace-Id: <generate-uuidv7>"
REM
REM Trailer ADR-0011: Coding-Agent + Trace-Id (NON Co-Authored-By, FORBIDDEN).

echo (skipping commit -- edit lo script con il messaggio reale)
echo.

echo === Step 6: push branch (con -u prima volta) ===
REM git push -u origin %BRANCH%
echo (skipping push -- de-comment quando pronto)
echo.

echo === Step 7: gh pr create draft ===
REM gh pr create --draft --title "%PR_TITLE%" --body-file %PR_BODY_FILE%
echo (skipping PR create -- de-comment quando pronto)
echo.

echo ============================================================
echo Template dry-run completato. Edit i placeholder e de-commenta i passi.
echo ============================================================
pause
exit /b 0

:err
echo.
echo ERROR step fallito (exit code %errorlevel%) -- fermo.
echo Risolvi manualmente e ri-esegui da dove serve.
pause
exit /b 1
