# 2026-04-29 Evo-Tactics — install desktop shortcuts (Windows).
# Crea 4 .lnk sul Desktop del current user puntando ai .bat repo root.
#
# Pattern: idempotente (rewrite shortcut se gia' esiste, ok).
# Cross-PC: lancia da qualsiasi PC con repo clonato. Adatta path automaticamente.
#
# UX rationale: master-dd "io non voglio usare il terminal" 2026-04-29.
# Workflow rubric session full via desktop click — zero terminal commands.

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path "$PSScriptRoot\..").Path
$Desktop = [Environment]::GetFolderPath('Desktop')
$WshShell = New-Object -ComObject WScript.Shell

Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "       Evo-Tactics - Install Desktop Shortcuts (Rubric)" -ForegroundColor Cyan
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Repo root:   $RepoRoot"
Write-Host "  Desktop:     $Desktop"
Write-Host ""

$Shortcuts = @(
  @{
    Name        = 'Evo-Tactics-Install-Ngrok-Official'
    Target      = 'Evo-Tactics-Install-Ngrok-Official.bat'
    Description = 'Install ngrok official ZIP da ngrok.com (fix bug Microsoft Store ngrok issue 505 panic disabled updater). Esegui PRIMA di Setup-Ngrok-Auth.'
    IconHint    = 'shell32.dll, 271'
  },
  @{
    Name        = 'Evo-Tactics-Setup-Ngrok-Auth'
    Target      = 'Evo-Tactics-Setup-Ngrok-Auth.bat'
    Description = 'Setup 1-volta ngrok authtoken. Necessario per Demo launcher (tunnel pubblico). Salta se gia configurato.'
    IconHint    = 'shell32.dll, 23'
  },
  @{
    Name        = 'Evo-Tactics-Demo'
    Target      = 'Evo-Tactics-Demo.bat'
    Description = '1-click launcher: pre-flight + backend + ngrok tunnel pubblico + auto-open browser. Master-dd start qui.'
    IconHint    = 'shell32.dll, 137'
  },
  @{
    Name        = 'Evo-Tactics-Sync-Main'
    Target      = 'Evo-Tactics-Sync-Main.bat'
    Description = 'Pre-rubric: git pull origin main + npm install se package.json drift. Esegui prima del Demo launcher.'
    IconHint    = 'shell32.dll, 238'
  },
  @{
    Name        = 'Evo-Tactics-Toggle-A-Classic'
    Target      = 'Evo-Tactics-Toggle-A-Classic.bat'
    Description = 'Rubric session - Modalita A grid square classic (tutti bg3lite_* false). Amici hard-reload Ctrl+Shift+R post toggle.'
    IconHint    = 'shell32.dll, 277'
  },
  @{
    Name        = 'Evo-Tactics-Toggle-B-BG3lite'
    Target      = 'Evo-Tactics-Toggle-B-BG3lite.bat'
    Description = 'Rubric session - Modalita B BG3-lite Tier 1 (tutti bg3lite_* true). Amici hard-reload Ctrl+Shift+R post toggle.'
    IconHint    = 'shell32.dll, 277'
  }
)

foreach ($s in $Shortcuts) {
  $TargetPath = Join-Path $RepoRoot $s.Target

  if (-not (Test-Path $TargetPath)) {
    Write-Host "  [SKIP] $($s.Name): target $($s.Target) non trovato in repo." -ForegroundColor Yellow
    continue
  }

  $LinkPath = Join-Path $Desktop "$($s.Name).lnk"
  $Shortcut = $WshShell.CreateShortcut($LinkPath)
  $Shortcut.TargetPath = $TargetPath
  $Shortcut.WorkingDirectory = $RepoRoot
  $Shortcut.Description = $s.Description
  $Shortcut.IconLocation = $s.IconHint
  $Shortcut.Save()

  Write-Host "  [OK]   $($s.Name).lnk  ->  $($s.Target)" -ForegroundColor Green
}

Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "  Workflow rubric session (full desktop click, zero terminal):" -ForegroundColor Cyan
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Doppio clic 'Evo-Tactics-Sync-Main'" -ForegroundColor White
Write-Host "       -> git pull origin main + npm install se drift"
Write-Host ""
Write-Host "  2. Doppio clic 'Evo-Tactics-Demo'" -ForegroundColor White
Write-Host "       -> backend + ngrok tunnel + auto-open browser"
Write-Host "       -> URL pubblico mostrato in banner, copia + condividi amici"
Write-Host ""
Write-Host "  3. Doppio clic 'Evo-Tactics-Toggle-A-Classic'" -ForegroundColor White
Write-Host "       -> Modalita A baseline rubric (grid square)"
Write-Host "       -> Amici hard-reload Ctrl+Shift+R + score 4 criteri"
Write-Host ""
Write-Host "  4. Doppio clic 'Evo-Tactics-Toggle-B-BG3lite'" -ForegroundColor White
Write-Host "       -> Modalita B confronto (BG3-lite Tier 1)"
Write-Host "       -> Amici hard-reload Ctrl+Shift+R + score 4 criteri"
Write-Host ""
Write-Host "  5. Aggregate scores in docs\playtest\2026-04-29-bg3-lite-spike-rubric.md" -ForegroundColor White
Write-Host "       -> Threshold pass: media B >= 3.5 + zero score 1"
Write-Host ""
Write-Host "  6. Per fermare backend + ngrok: chiudi finestra nera launcher" -ForegroundColor White
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "  Setup completato. Chiudi questa finestra quando vuoi." -ForegroundColor Green
Write-Host ""
