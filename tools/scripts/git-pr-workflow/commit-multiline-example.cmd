@echo off
REM Esempio: commit Conventional Commits multi-line con piu' -m
REM Pattern preservato da _run-fase1-recon-01.cmd (2026-05-26, post-merge cleanup).
REM
REM Sezioni del messaggio:
REM   1. Titolo (subject)        <= 72 char preferred (Game convention)
REM   2. (vuoto)
REM   3. Body riga 1             cosa cambia + perche' + evidenza
REM   4. (vuoto)
REM   5. Body riga 2             cross-link a research/ADR/PR
REM   6. (vuoto)
REM   7. Trailer Coding-Agent    ADR-0011 (NON Co-Authored-By)
REM   8. Trailer Trace-Id        UUIDv7 per-commit
REM
REM Stage prima i file con `git add <file1> <file2>` espliciti (no -A).

setlocal
cd /d C:\dev\Game

git commit ^
  -m "feat(spore-fase1): RECON-01 E2E baseline (19 test mapped + verified)" ^
  -m "" ^
  -m "Plan RECON-01 step 1-6 mapped to existing tests: 9 mutationsRoutes + 10 mpTracker. Step 7 frontend visual deferred RECON-01.1 manual smoke gating (NOT blocker)." ^
  -m "" ^
  -m "Empirical run captured in baseline.md section 3. Test runner = node:test standard (G4 resolved: NO tdd-guard tool needed)." ^
  -m "" ^
  -m "Ref: docs/superpowers/plans/2026-05-26-fase1-spore-moderate-reconciliation-plan.md" ^
  -m "Closes: RECON-01 (Wave-1 BLOCKER cleared per Wave-2 kickoff)" ^
  -m "" ^
  -m "Coding-Agent: claude-opus-4.7" ^
  -m "Trace-Id: 0193e7f0-1234-7abc-9def-012345678901"

if not %errorlevel%==0 (
    echo Commit fallito -- husky pre-commit hook probabilmente ha blocked.
    echo Risolvi e ri-esegui.
    exit /b 1
)

echo Commit OK. Verifica con: git log -1 --format=full
exit /b 0
