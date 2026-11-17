# TrustAudit - Start FastAPI Orchestration Service
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location "$RootDir\backend"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " TrustAudit - Starting FastAPI Backend Service (Port 8000) " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
