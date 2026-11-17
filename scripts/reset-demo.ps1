# TrustAudit - Reset Local Database to Pristine Demo State
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location "$RootDir\backend"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " TrustAudit - Resetting Local Database & Seeding Cases     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

python -m app.scripts.seed_demo_data

Write-Host "`nDatabase reset complete! 3 demo scenarios loaded." -ForegroundColor Green
Set-Location $RootDir
