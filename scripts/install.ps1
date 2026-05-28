# Cross-Border — Windows self-host one-liner
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
#   $env:CROSSBORDER_PORT = "8787"  — panel port (default 8787, not 8000)
#   $env:CROSSBORDER_START = "1"    — start panel after install (default: 1)
#   $env:CROSSBORDER_START = "0"    — skip auto-start
#   $env:CROSSBORDER_SKIP_BROWSER = "1"

$ErrorActionPreference = "Stop"

if (-not $env:CROSSBORDER_START) { $env:CROSSBORDER_START = "1" }
$PanelPort = if ($env:CROSSBORDER_PORT) { $env:CROSSBORDER_PORT } else { "8787" }

$InstallDir = if ($env:CROSSBORDER_INSTALL_DIR) { $env:CROSSBORDER_INSTALL_DIR } else { Join-Path $HOME "crossborder-scraper" }
$RepoUrl = if ($env:CROSSBORDER_REPO) { $env:CROSSBORDER_REPO } else { "https://github.com/vannyakh/crossborder_scraper.git" }
$Branch = if ($env:CROSSBORDER_BRANCH) { $env:CROSSBORDER_BRANCH } else { "main" }

function Write-Banner {
    Write-Host ""
    Write-Host "  Cross-Border - self-host install (Windows)"
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
        if ($LASTEXITCODE -ne 0) { git fetch origin $Branch }
        git checkout $Branch 2>$null
        if (-not $?) { git checkout -B $Branch "origin/$Branch" }
        git merge --ff-only "origin/$Branch" 2>$null
        if ($LASTEXITCODE -ne 0) {
            if ($env:CROSSBORDER_KEEP_LOCAL -eq "1") {
                Write-Host "==> could not fast-forward; unset CROSSBORDER_KEEP_LOCAL to reset" -ForegroundColor Red
                Pop-Location
                exit 1
            }
            Write-Host "==> resetting to origin/$Branch (discards local commits)"
            git reset --hard "origin/$Branch"
        }
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

function Get-CrossborderExe {
    param([string]$Root)
    return Join-Path $Root ".venv\Scripts\crossborder.exe"
}

function Install-GlobalCli {
    param([string]$Root)
    $binDir = Join-Path $env:USERPROFILE ".local\bin"
    $configDir = Join-Path $env:USERPROFILE ".crossborder"
    if (-not (Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir -Force | Out-Null }
    if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Path $configDir -Force | Out-Null }
    Set-Content -Path (Join-Path $configDir "install.env") -Value "CROSSBORDER_HOME=$Root" -Encoding UTF8

    $cmdPath = Join-Path $binDir "crossborder.cmd"
    @"
@echo off
setlocal
if exist "%USERPROFILE%\.crossborder\install.env" for /f "usebackq tokens=1,* delims==" %%a in ("%USERPROFILE%\.crossborder\install.env") do set %%a
if not defined CROSSBORDER_HOME set CROSSBORDER_HOME=$Root
cd /d "%CROSSBORDER_HOME%" || exit /b 1
set PYTHONPATH=%CROSSBORDER_HOME%\src
"%CROSSBORDER_HOME%\.venv\Scripts\crossborder.exe" %*
"@ | Set-Content -Path $cmdPath -Encoding ASCII

    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$binDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$binDir;$userPath", "User")
    }
    [Environment]::SetEnvironmentVariable("CROSSBORDER_HOME", $Root, "User")
    $env:Path = "$binDir;$env:Path"
    $env:CROSSBORDER_HOME = $Root
    Write-Host "==> global CLI: crossborder  (in $binDir)"
}

function Run-Bootstrap {
    param([string]$Root)
    Set-Location $Root
    $env:PYTHONPATH = Join-Path $Root "src"
    $cli = Get-CrossborderExe -Root $Root

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

    $setupArgs = @("install", "--port", $PanelPort, "--external", "auto")
    if (-not (Test-Path $cli)) {
        $setupArgs = @("setup", "--server", "--port", $PanelPort, "--external", "auto")
    }
    $publicIp = Get-PublicIp
    if ($publicIp) {
        Write-Host "==> detected public IP: $publicIp"
    }

    Write-Host "==> panel setup (host, port $PanelPort, credentials)"
    if (Test-Path $cli) {
        & $cli @setupArgs
    } elseif (Get-Command uv -ErrorAction SilentlyContinue) {
        uv run crossborder @setupArgs
    } else {
        python main.py @setupArgs
    }
}

function Get-EnvPanelPort {
    param([string]$Root)
    $envFile = Join-Path $Root ".env"
    if (Test-Path $envFile) {
        $line = Get-Content $envFile | Where-Object { $_ -match '^PANEL_PORT=' } | Select-Object -Last 1
        if ($line) { return ($line -replace '^PANEL_PORT=', '').Trim().Trim('"') }
    }
    return $PanelPort
}

function Start-PanelBackground {
    param([string]$Root)
    if ($env:CROSSBORDER_START -ne "1") { return }
    Set-Location $Root
    $log = Join-Path $Root "data\panel.log"
    $dataDir = Split-Path $log -Parent
    if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
    $port = Get-EnvPanelPort -Root $Root
    Write-Host "==> starting panel on port $port (log: $log)"
    $cli = Get-CrossborderExe -Root $Root
    if (Test-Path $cli) {
        Start-Process -FilePath $cli -ArgumentList "serve", "--no-reload" -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $log
    } elseif (Get-Command uv -ErrorAction SilentlyContinue) {
        Start-Process -FilePath "uv" -ArgumentList "run", "crossborder", "serve", "--no-reload" -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $log
    } else {
        Start-Process -FilePath "python" -ArgumentList "main.py", "serve", "--no-reload" -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $log
    }
    Start-Sleep -Seconds 3
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/health" -UseBasicParsing -TimeoutSec 5
        if ($r.StatusCode -eq 200) {
            Write-Host "==> panel is up — open: http://127.0.0.1:$port/ui/login"
        }
    } catch {
        Write-Host "==> panel not responding yet — check $log"
        Write-Host "    Start manually: cd $Root; uv run crossborder serve --no-reload"
    }
}

function Get-EnvVal {
    param([string]$Key, [string]$EnvFile)
    if (-not (Test-Path $EnvFile)) { return "" }
    $line = Get-Content $EnvFile | Where-Object { $_ -match "^${Key}=" } | Select-Object -Last 1
    if (-not $line) { return "" }
    return ($line -replace "^${Key}=", "").Trim().Trim('"')
}

function Write-InstallComplete {
    param([string]$Root)
    $envFile = Join-Path $Root ".env"
    $port = Get-EnvPanelPort -Root $Root
    $user = Get-EnvVal -Key "PANEL_USERNAME" -EnvFile $envFile
    $pass = Get-EnvVal -Key "PANEL_PASSWORD" -EnvFile $envFile
    $ext = Get-EnvVal -Key "PANEL_EXTERNAL_HOST" -EnvFile $envFile
    if (-not $ext) { $ext = Get-PublicIp }
    $login = "http://127.0.0.1:$port/ui/login"
    Write-Host ""
    Write-Host "================================================================"
    Write-Host "  INSTALL COMPLETE — panel ready"
    Write-Host "================================================================"
    Write-Host ""
    if ($env:CROSSBORDER_START -eq "1") {
        Write-Host "  Panel:  running in background (port $port)"
        Write-Host "  Logs:   $(Join-Path $Root 'data\panel.log')"
    }
    Write-Host ""
    Write-Host "  Login URL:"
    Write-Host "    $login"
    if ($ext) { Write-Host "    http://${ext}:$port/ui/login  (public)" }
    Write-Host ""
    if ($user -and $pass) {
        Write-Host "  Username:  $user"
        Write-Host "  Password:  $pass"
    }
    Write-Host ""
    Write-Host "  CLI (any terminal):  crossborder --help"
    Write-Host "  Install dir:         $Root"
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
Install-GlobalCli -Root $root
Start-PanelBackground -Root $root
Write-InstallComplete -Root $root
