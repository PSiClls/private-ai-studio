<#
.SYNOPSIS
    Private AI Studio - Setup Script
.DESCRIPTION
    Checks dependencies, sets up Python venv, installs Node packages,
    initializes database, pulls recommended Ollama model.
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host @"

╔══════════════════════════════════════════╗
║        Private AI Studio Setup           ║
║     Local-first, private AI workspace    ║
╚══════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# ─── Dependency Checks ───────────────────────────────────────────

Write-Host "[1/7] Checking dependencies..." -ForegroundColor Yellow

# Check Python
$pythonOk = $false
try {
    $pyVersion = & python --version 2>&1
    if ($pyVersion -match "Python (\d+)\.(\d+)") {
        $major = [int]$Matches[1]
        $minor = [int]$Matches[2]
        if ($major -gt 3 -or ($major -eq 3 -and $minor -ge 11)) {
            Write-Host "  ✓ Python $major.$minor+ detected" -ForegroundColor Green
            $pythonOk = $true
        } else {
            Write-Host "  ✗ Python $major.$minor detected, need 3.11+" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "  ✗ Python not found. Install Python 3.11+ from https://python.org" -ForegroundColor Red
}

# Check Node.js
$nodeOk = $false
try {
    $nodeVer = & node --version 2>&1
    if ($nodeVer -match "v(\d+)") {
        $major = [int]$Matches[1]
        if ($major -ge 18) {
            Write-Host "  ✓ Node.js $major.x detected" -ForegroundColor Green
            $nodeOk = $true
        } else {
            Write-Host "  ✗ Node.js $major.x detected, need 18+" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "  ✗ Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
}

if (-not $pythonOk -or -not $nodeOk) {
    Write-Host "`nMissing required dependencies. Please install them and re-run." -ForegroundColor Red
    exit 1
}

# ─── Ollama Check ─────────────────────────────────────────────────

Write-Host "`n[2/7] Checking Ollama..." -ForegroundColor Yellow
$ollamaRunning = $false
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($resp) {
        Write-Host "  ✓ Ollama is running" -ForegroundColor Green
        $ollamaRunning = $true
    }
} catch {
    Write-Host "  ⚠ Ollama is not running" -ForegroundColor Yellow
}

if (-not $ollamaRunning) {
    try {
        $ollamaPath = Get-Command ollama -ErrorAction SilentlyContinue
        if ($ollamaPath) {
            Write-Host "  ✓ Ollama installed, starting it..." -ForegroundColor Green
            Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
            Start-Sleep 2
        } else {
            Write-Host "  ⚠ Ollama not installed." -ForegroundColor Yellow
            $installOllama = Read-Host "  Would you like to install Ollama? (y/n, default: y)"
            if ($installOllama -ne "n") {
                Write-Host "  Downloading Ollama installer..."
                $installer = "$env:TEMP\ollama_setup.exe"
                Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $installer
                Write-Host "  Running installer (follow the prompts)..."
                Start-Process $installer -Wait
                Write-Host "  ✓ Ollama installed. Please launch it manually and re-run setup." -ForegroundColor Green
            } else {
                Write-Host "  Skipping Ollama install. You'll need it for chat features." -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "  Ollama not found. Download from https://ollama.com" -ForegroundColor Yellow
    }
}

# ─── Python Virtual Environment ──────────────────────────────────

Write-Host "`n[3/7] Setting up Python virtual environment..." -ForegroundColor Yellow
Push-Location backend
if (-not (Test-Path -LiteralPath "venv")) {
    & python -m venv venv
    Write-Host "  ✓ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "  ✓ Virtual environment exists" -ForegroundColor Green
}

# ─── Install Python Dependencies ─────────────────────────────────

Write-Host "`n[4/7] Installing Python dependencies..." -ForegroundColor Yellow
$pip = if ($IsWindows -or $env:OS) { ".\venv\Scripts\pip.exe" } else { "venv/bin/pip" }
& $pip install -r requirements.txt 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Python dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ✗ Failed to install Python dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# ─── Install Frontend Dependencies ───────────────────────────────

Write-Host "`n[5/7] Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location frontend
& npm install 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ✗ Failed to install frontend dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# ─── Initialize Database ─────────────────────────────────────────

Write-Host "`n[6/7] Initializing database..." -ForegroundColor Yellow
Push-Location backend
$python = if ($IsWindows -or $env:OS) { ".\venv\Scripts\python.exe" } else { "venv/bin/python" }
& $python -c "from app.database import init_db; import asyncio; asyncio.run(init_db()); print('  ✓ Database initialized')" 2>&1 | Out-Null
Pop-Location

# ─── Pull Recommended Ollama Model ───────────────────────────────

Write-Host "`n[7/7] Pulling recommended model (phi3:mini)..." -ForegroundColor Yellow
try {
    $ollamaProcess = Start-Process ollama -ArgumentList "pull phi3:mini" -NoNewWindow -Wait -PassThru
    Write-Host "  ✓ phi3:mini pulled successfully" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Could not pull phi3:mini. Run 'ollama pull phi3:mini' manually later." -ForegroundColor Yellow
}

# ─── Done ─────────────────────────────────────────────────────────

Write-Host @"

╔══════════════════════════════════════════╗
║           Setup Complete!                ║
╚══════════════════════════════════════════╝

"@ -ForegroundColor Green

Write-Host "To launch Private AI Studio:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Terminal 1 (Backend):" -ForegroundColor White
Write-Host "    cd backend" -ForegroundColor Gray
Write-Host "    .\venv\Scripts\python.exe run.py" -ForegroundColor Gray
Write-Host "    → API running at http://127.0.0.1:8000" -ForegroundColor Green
Write-Host ""
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor White
Write-Host "    cd frontend" -ForegroundColor Gray
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host "    → App running at http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "  Make sure Ollama is running (http://localhost:11434)" -ForegroundColor Yellow
Write-Host "  All data stays local in ~/.private-ai-studio/" -ForegroundColor Cyan
Write-Host ""
