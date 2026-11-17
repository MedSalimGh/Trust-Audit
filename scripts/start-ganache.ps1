# TrustAudit - Start Local Ganache EVM Node
$Mnemonic = "test test test test test test test test test test test junk"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " TrustAudit - Launching Local Ganache EVM Node            " -ForegroundColor Cyan
Write-Host " Network: Localhost | Chain ID: 1337 | Port: 8545         " -ForegroundColor Cyan
Write-Host " Accounts: Deterministic Standard Test Wallets            " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

npx ganache --chain.chainId 1337 --chain.networkId 1337 --server.port 8545 --wallet.mnemonic "$Mnemonic" --miner.blockTime 1
