# Evo-Tactics ngrok official ZIP installer.
# Bug Microsoft Store ngrok: "panic: disabled updater should never run" (ngrok issue #505).
# Fix: download official ZIP da ngrok.com, extract in repo-local .tools/ngrok/.

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "    Evo-Tactics - Install ngrok Official (fix MS Store bug)" -ForegroundColor Cyan
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""

# Detect repo root (script runs from <repo>/scripts)
$RepoRoot = (Resolve-Path "$PSScriptRoot\..").Path
$ToolsDir = Join-Path $RepoRoot ".tools"
$NgrokDir = Join-Path $ToolsDir "ngrok"
$NgrokExe = Join-Path $NgrokDir "ngrok.exe"

Write-Host "  Repo root:   $RepoRoot"
Write-Host "  Target dir:  $NgrokDir"
Write-Host ""

# Check if already installed
if (Test-Path $NgrokExe) {
    Write-Host "  [OK]   ngrok.exe gia presente in $NgrokExe" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Skip download. Per re-install: cancella $NgrokDir + re-run." -ForegroundColor Yellow
    Write-Host ""
    & $NgrokExe version
    Write-Host ""
    Write-Host "  Setup completato." -ForegroundColor Green
    exit 0
}

# Create dirs
if (-not (Test-Path $ToolsDir)) {
    New-Item -ItemType Directory -Path $ToolsDir | Out-Null
}
if (-not (Test-Path $NgrokDir)) {
    New-Item -ItemType Directory -Path $NgrokDir | Out-Null
}

# Detect architecture
$arch = if ([Environment]::Is64BitOperatingSystem) { "amd64" } else { "386" }
$zipUrl = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-$arch.zip"
$zipPath = Join-Path $env:TEMP "ngrok-official.zip"

Write-Host "  [setup] Download ngrok official $arch..." -ForegroundColor Cyan
Write-Host "          $zipUrl"

try {
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "  [OK]   Download completato ($((Get-Item $zipPath).Length / 1MB | ForEach-Object { '{0:N1} MB' -f $_ }))" -ForegroundColor Green
} catch {
    Write-Host "  [X] Download fallito: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  [setup] Extract a $NgrokDir..." -ForegroundColor Cyan

try {
    Expand-Archive -Path $zipPath -DestinationPath $NgrokDir -Force
    Remove-Item $zipPath -Force
    Write-Host "  [OK]   Extract completato" -ForegroundColor Green
} catch {
    Write-Host "  [X] Extract fallito: $_" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $NgrokExe)) {
    Write-Host "  [X] ngrok.exe non trovato post-extract a $NgrokExe" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  [verify] ngrok version..." -ForegroundColor Cyan
& $NgrokExe version
Write-Host ""

Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "                    SETUP COMPLETATO" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ngrok.exe official installato in $NgrokExe" -ForegroundColor White
Write-Host ""
Write-Host "  Demo launcher cerchera questo path PRIMA di Microsoft Store ngrok." -ForegroundColor White
Write-Host ""
Write-Host "  Prossimo step:" -ForegroundColor White
Write-Host "        Doppio clic 'Evo-Tactics-Setup-Ngrok-Auth' (paste token)" -ForegroundColor White
Write-Host "        Doppio clic 'Evo-Tactics-Demo' (avvia tunnel)" -ForegroundColor White
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""
