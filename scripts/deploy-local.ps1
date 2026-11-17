# TrustAudit - Deploy Contracts to Local Ganache & Sync Manifests
param(
    [string]$Network = "ganache"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " TrustAudit - Local Contract Deployment & Manifest Sync   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Compile contracts
Write-Host "`n[1/3] Compiling Solidity smart contracts with Hardhat..." -ForegroundColor Yellow
Set-Location "$RootDir\contracts"
npx hardhat compile

# 2. Deploy contracts and configure roles
Write-Host "`n[2/3] Deploying TrustAuditRegistry & TrustAuditCertificate to $Network..." -ForegroundColor Yellow
npx hardhat run scripts/deploy.ts --network $Network

# 3. Synchronize manifest files
Write-Host "`n[3/3] Synchronizing deployment manifest to backend and frontend..." -ForegroundColor Yellow
$ManifestSource = "$RootDir\contracts\deployments\local-ganache.json"
$BackendDest = "$RootDir\backend\app\config\local-ganache.json"
$FrontendDest = "$RootDir\frontend\src\config\deployments.json"

if (Test-Path $ManifestSource) {
    Copy-Item $ManifestSource -Destination $BackendDest -Force
    Copy-Item $ManifestSource -Destination $FrontendDest -Force
    Write-Host " Manifest copied to backend and frontend!" -ForegroundColor Green
} else {
    Write-Warning "Manifest file not found at $ManifestSource"
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " Deployment Complete! Local contracts are primed.         " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Set-Location $RootDir
