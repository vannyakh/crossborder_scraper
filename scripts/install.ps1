# Crossborder Scraper — Windows self-host one-liner (OpenClaw style)
#
# From repo:
#   .\scripts\install.ps1
#
# Remote one-liner:
#   powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/vannyakh/crossborder_scraper/main/scripts/install.ps1 | iex"
#
# Environment:
#   $env:CROSSBORDER_INSTALL_DIR  — default: $HOME\crossborder-scraper
#   $env:CROSSBORDER_REPO          — git clone URL
#   $env:CROSSBORDER_BRANCH        — default: main
#   $env:CROSSBORDER_START = "1"    — start panel after install
#   $env:CROSSBORDER_SKIP_BROWSER = "1"

$ErrorActionPreference = "Stop"

$InstallDir = if ($env:CROSSBORDER_INSTALL_DIR) { $env:CROSSBORDER_INSTALL_DIR } else { Join-Path $HOME "crossborder-scraper" }
$RepoUrl = if ($env:CROSSBORDER_REPO) { $env:CROSSBORDER_REPO } else { "https://github.com/vannyakh/crossborder_scraper.git" }
$Branch = if ($env:CROSSBORDER_BRANCH) { $env:CROSSBORDER_BRANCH } else { "main" }

function Write-Banner {
    Write-Host ""
    Write-Host "  Crossborder Scraper - self-host install (Windows)"
    Write-Host "  Installs Python deps, panel login, and prints your access URL."
    Write-Host ""
}

function Get-LocalRepoRoot {
    $scriptDir = $PSScriptRoot
    if ($scriptDir -and (Test-Path (Join-Path (Split-Path $scriptDir -Parent) "pyproject.toml"))) {
        return (Resolve-Path (Split-Path $scriptDir -Parent)).Path
    }
    $cwd = Get-Location
    if ((Test-Path (Join-Path $cwd "pyproject.toml")) -and (Test-Path (Join-Path $cwd "scripts\install.ps1"))) {
        return $cwd.Path
    }
    return $null
}

function Ensure-Git {
    if (Get-Command git -ErrorAction SilentlyContinue) { return }
    Write-Host "==> git is required. Install from https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

function Ensure-Uv {
    if (Get-Command uv -ErrorAction SilentlyContinue) { return }
    Write-Host "==> installing uv"
    try {
        irm https://astral.sh/uv/install.ps1 | iex
        $env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
    } catch {
        Write-Host "==> uv install failed; trying pip install uv" -ForegroundColor Yellow
        python -m pip install --upgrade uv
    }
}

function Ensure-Python312 {
    $py = Get-Command python -ErrorAction SilentlyContinue
    if (-not $py) {
        Write-Host "==> Python 3.12+ required. Install from https://www.python.org/downloads/" -ForegroundColor Red
        exit 1
    }
    $ver = & python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
    $parts = $ver -split '\.'
    if ([int]$parts[0] -lt 3 -or ([int]$parts[0] -eq 3 -and [int]$parts[1] -lt 12)) {
        Write-Host "==> Python 3.12+ required (found $ver)" -ForegroundColor Red
        exit 1
    }
}

function Clone-OrUpdate {
    Ensure-Git
    if (Test-Path (Join-Path $InstallDir ".git")) {
        Write-Host "==> updating $InstallDir"
        Push-Location $InstallDir
        git fetch --depth 1 origin $Branch 2>$null
        if ($LASTEXITCODE -ne 0) { git fetch origin }
        git checkout $Branch 2>$null
        git pull --ff-only origin $Branch 2>$null
        Pop-Location
    } else {
        Write-Host "==> cloning into $InstallDir"
        $parent = Split-Path $InstallDir -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        git clone --depth 1 --branch $Branch $RepoUrl $InstallDir
    }
}

function Get-PublicIp {
    try {
        return (Invoke-RestMethod -Uri "https://ifconfig.me/ip" -TimeoutSec 4).Trim()
    } catch {
        return $null
    }
}

function Run-Bootstrap {
    param([string]$Root)
    Set-Location $Root
    $env:PYTHONPATH = Join-Path $Root "src"

    Write-Host "==> sync Python dependencies"
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv sync
    } else {
        python -m pip install -e .
    }

    if ($env:CROSSBORDER_SKIP_BROWSER -ne "1") {
        Write-Host "==> install Playwright Chromium"
        if (Get-Command uv -ErrorAction SilentlyContinue) {
            uv run python -m playwright install chromium
        } else {
            python -m playwright install chromium
        }
    }

    $setupArgs = @("setup", "--server")
    $publicIp = Get-PublicIp
    if ($publicIp) {
        Write-Host "==> detected public IP: $publicIp"
        $setupArgs += @("--external", $publicIp)
    }

    Write-Host "==> panel setup (host, port, credentials)"
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv run crossborder @setupArgs
    } else {
        python main.py @setupArgs
    }
}

function Start-PanelBackground {
    param([string]$Root)
    if ($env:CROSSBORDER_START -ne "1") { return }
    Set-Location $Root
    $log = Join-Path $Root "data\panel.log"
    $dataDir = Split-Path $log -Parent
    if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
    Write-Host "==> starting panel in background (log: $log)"
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        Start-Process -FilePath "uv" -ArgumentList "run", "crossborder", "serve", "--no-reload" -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $log
    } else {
        Start-Process -FilePath "python" -ArgumentList "main.py", "serve", "--no-reload" -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $log
    }
    Write-Host "    Open the Login URL from the card above"
}

function Write-Footer {
    param([string]$Root)
    Write-Host ""
    Write-Host "==> You're set. Common next steps:"
    Write-Host "    cd $Root"
    Write-Host "    crossborder --help"
    Write-Host "    uv run crossborder serve --no-reload"
    Write-Host "    uv run crossborder deploy up         # Docker (requires Docker Desktop)"
    Write-Host ""
}

# --- main ---
Write-Banner
Ensure-Python312

$root = Get-LocalRepoRoot
if ($root) {
    Write-Host "==> using existing repo: $root"
} else {
    Clone-OrUpdate
    $root = $InstallDir
}

Ensure-Uv
Run-Bootstrap -Root $root
Start-PanelBackground -Root $root
Write-Footer -Root $root
