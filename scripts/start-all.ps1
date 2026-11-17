# TrustAudit - Master Process Orchestrator
# Launches Ganache, Backend API, Frontend DApp, and Event Indexer

$RootDir = Split-Path -Parent $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " TrustAudit - Launching Complete Platform Multi-Process   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check & Start Ganache EVM
$GanacheActive = Get-NetTCPConnection -LocalPort 8545 -ErrorAction SilentlyContinue
if (-not $GanacheActive) {
    Write-Host "[1/4] Launching Ganache EVM (Port 8545)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootDir'; & .\scripts\start-ganache.ps1"
    Start-Sleep -Seconds 3
} else {
    Write-Host "[1/4] Ganache EVM is already running on port 8545." -ForegroundColor Green
}

# 2. Deploy Contracts & Configure Roles
Write-Host "[2/4] Verifying Smart Contracts on Ganache..." -ForegroundColor Yellow
Set-Location "$RootDir\contracts"
npx hardhat compile
npx hardhat run scripts/deploy.ts --network ganache
Set-Location $RootDir

# Synchronize manifest files
$ManifestSource = "$RootDir\contracts\deployments\local-ganache.json"
$BackendDest = "$RootDir\backend\app\config\local-ganache.json"
$FrontendDest = "$RootDir\frontend\src\config\deployments.json"
if (Test-Path $ManifestSource) {
    Copy-Item $ManifestSource -Destination $BackendDest -Force
    Copy-Item $ManifestSource -Destination $FrontendDest -Force
    Write-Host " Manifest files synced to backend and frontend." -ForegroundColor Green
}

# 3. Start Backend & Event Worker
Write-Host "[3/4] Launching FastAPI Backend (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootDir\backend'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "[3b/4] Launching Blockchain Event Indexer..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootDir\backend'; python -m app.workers.event_worker"

# 4. Start Frontend DApp
Write-Host "[4/4] Launching React + Vite DApp (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootDir\frontend'; npm run dev"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " All TrustAudit components have been launched!             " -ForegroundColor Green
Write-Host " Frontend: http://localhost:5173                          " -ForegroundColor Green
Write-Host " Backend API Docs: http://localhost:8000/docs             " -ForegroundColor Green
Write-Host " Ganache EVM: http://127.0.0.1:8545                       " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
