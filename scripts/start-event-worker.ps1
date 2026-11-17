# TrustAudit - Start Blockchain Event Indexer & Auto-Execution Worker
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location "$RootDir\backend"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " TrustAudit - Starting EVM Event Indexer Worker            " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

python -m app.workers.event_worker
