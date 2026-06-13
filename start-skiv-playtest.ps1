# =============================================================================
# Skiv Playtest Launcher — PowerShell version (modern, ANSI colors)
#
# Run: right-click → "Run with PowerShell"
# Or:  pwsh -ExecutionPolicy Bypass -File start-skiv-playtest.ps1
#
# Equivalent funzionale a start-skiv-playtest.cmd ma con:
# - Output colorato + emoji
# - Health probe backend prima di proseguire
# - Auto-skip backfill se già eseguito recentemente (<1h)
# =============================================================================

$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'Skiv Playtest Launcher'
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

function Write-Step($num, $total, $msg) {
    Write-Host "`n[$num/$total] " -ForegroundColor Cyan -NoNewline
    Write-Host $msg -ForegroundColor White
}

function Write-Ok($msg) { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "  ✗ $msg" -ForegroundColor Red }

Clear-Host
Write-Host @"

╔════════════════════════════════════════════╗
║       SKIV PLAYTEST LAUNCHER               ║
║       Evo-Tactics · Skiv-as-Monitor        ║
╚════════════════════════════════════════════╝

"@ -ForegroundColor Yellow

# Step 1 — preflight
Write-Step 1 5 'Preflight checks (node, npm, python, gh)...'
$missing = @()
foreach ($cmd in @('node', 'npm', 'python', 'gh')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        $missing += $cmd
    }
}
if ($missing.Count -gt 0) {
    Write-Err "Missing in PATH: $($missing -join ', ')"
    Write-Host "Install: Node 22+, Python 3.10+, gh CLI (cli.github.com)" -ForegroundColor Red
    Read-Host 'Press ENTER to exit'
    exit 1
}

try {
    $ghToken = (gh auth token 2>$null).Trim()
    if (-not $ghToken) { throw 'empty' }
} catch {
    Write-Err 'gh CLI not authenticated. Run: gh auth login'
    Read-Host 'Press ENTER to exit'
    exit 1
}
Write-Ok 'Node, npm, python, gh CLI ok'

# Step 2 — backfill (skip if state.json updated <1h ago)
Write-Step 2 5 'Backfill Skiv state from GitHub events...'
$statePath = Join-Path $repoRoot 'data/derived/skiv_monitor/state.json'
$skipBackfill = $false
if (Test-Path $statePath) {
    $lastWrite = (Get-Item $statePath).LastWriteTime
    if ((Get-Date) - $lastWrite -lt [TimeSpan]::FromHours(1)) {
        Write-Ok "State fresh ($($lastWrite.ToString('HH:mm:ss'))) — skip backfill"
        $skipBackfill = $true
    }
}
if (-not $skipBackfill) {
    $env:GITHUB_TOKEN = $ghToken
    $env:PYTHONIOENCODING = 'utf-8'
    & python tools/py/skiv_backfill.py --max-pages 25 --reset-state --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Ok 'Skiv state refreshed (4000+ events replayed)'
    } else {
        Write-Warn 'Backfill failed — continuing with stale state'
    }
}

# Step 3 — start backend in new window
Write-Step 3 5 'Starting backend on :3334 (new window)...'
$backendArgs = "/k cd /d `"$repoRoot`" && npm run start:api"
Start-Process -FilePath cmd.exe -ArgumentList $backendArgs -WindowStyle Normal
Write-Ok 'Backend window opened — wait for boot...'

# Health probe
$booted = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3334/api/skiv/status' -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $booted = $true; break }
    } catch {
        Write-Host '.' -NoNewline -ForegroundColor DarkGray
    }
}
Write-Host ''
if ($booted) {
    Write-Ok 'Backend healthy (api/skiv/status 200)'
} else {
    Write-Warn 'Backend not responding after 20s — check window manually'
}

# Step 4 — start frontend in new window
Write-Step 4 5 'Starting frontend Vite on :5180 (new window)...'
$frontArgs = "/k cd /d `"$repoRoot`" && npm run dev --workspace apps/play"
Start-Process -FilePath cmd.exe -ArgumentList $frontArgs -WindowStyle Normal
Write-Ok 'Frontend window opened'
Start-Sleep -Seconds 5

# Step 5 — LAN IP + open browser
Write-Step 5 5 'LAN IP for phone clients:'
$ips = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.PrefixOrigin -eq 'Dhcp' -or ($_.IPAddress -match '^192\.168\.|^10\.|^172\.')
} | Select-Object -ExpandProperty IPAddress)
foreach ($ip in $ips) {
    Write-Host "  Phone URL: http://${ip}:5180/lobby.html" -ForegroundColor Magenta
}
Write-Host "  Local URL: http://localhost:5180" -ForegroundColor Magenta

# Open browser
Start-Process 'http://localhost:5180'

Write-Host @"

╔════════════════════════════════════════════╗
║   SKIV LIVE — pronto per playtest          ║
╚════════════════════════════════════════════╝

TEST CHECKLIST:
  1. Click bottone 🦎 Skiv in header
  2. Sprite SVG/PNG 5 fasi visibili
  3. Status chip 'Lv 4 · Predatore Maturo'
  4. Phase progression bar 5-cell
  5. Bond hearts (vega ♥♥♥ rhodo ♥♥)
  6. Feed eventi recenti scroll
  7. Riduci finestra 400px → CSS responsive ok

Per fermare: chiudi finestre 'Skiv Backend' + 'Skiv Frontend'.
Per re-eseguire: doppio-click su questo file (.ps1).

🦎 Sabbia segue.

"@ -ForegroundColor Yellow

Read-Host 'Press ENTER to close launcher (servers continue)'
