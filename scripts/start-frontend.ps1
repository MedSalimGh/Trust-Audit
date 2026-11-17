# TrustAudit - Start React + Vite DApp Frontend
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location "$RootDir\frontend"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " TrustAudit - Starting React DApp Frontend (Port 5173)    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

npm run dev
