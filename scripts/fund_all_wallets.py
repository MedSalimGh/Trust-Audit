import json
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
print(f"Connected to Ganache: {w3.is_connected()}")
assert w3.is_connected(), "Ganache is not connected"

target_balance_wei = hex(w3.to_wei(1000, "ether"))

# 1. Fund Ganache default accounts (Accounts #0 to #9)
print("\n--- Funding Ganache Default Accounts ---")
for i, acc in enumerate(w3.eth.accounts):
    w3.provider.make_request("evm_setAccountBalance", [acc, target_balance_wei])
    bal = w3.from_wei(w3.eth.get_balance(acc), "ether")
    print(f"Ganache Account [{i}] {acc} -> {bal} ETH")

# 2. Fund accounts from frontend/src/config/deployments.json if different
custom_addresses = [
    "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a", # admin
    "0x52E0827CEF5deb10612FEB33EC7cF83961126cA5", # operator
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", # oracle
    "0xFc1497C6A61F922d722bEb870BbE0A0237522c5C", # compliance
    "0x807e7EfA4112281D66E8B2A388e0AeB4b9A4ecc9", # riskManager
    "0xE87ea481e15D7984ebD6243167DeC1e7d3368227", # director
    "0xEBDce28124c1Eb2d3524c6772748e9fe82D8aAcB", # auditor
]

print("\n--- Funding Custom Role Addresses ---")
for addr in custom_addresses:
    cs_addr = w3.to_checksum_address(addr)
    w3.provider.make_request("evm_setAccountBalance", [cs_addr, target_balance_wei])
    bal = w3.from_wei(w3.eth.get_balance(cs_addr), "ether")
    print(f"Custom Role Address {cs_addr} -> {bal} ETH")

print("\nAll target wallets successfully funded with 1,000 ETH!")
