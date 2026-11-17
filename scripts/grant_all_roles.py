import json
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
assert w3.is_connected(), "Ganache is not connected"

with open("contracts/deployments/local-ganache.json") as f:
    dep = json.load(f)

reg_addr = dep["contracts"]["TrustAuditRegistry"]["address"]
reg_abi = dep["contracts"]["TrustAuditRegistry"]["abi"]
registry = w3.eth.contract(address=reg_addr, abi=reg_abi)

admin_account = w3.eth.accounts[0] # 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
print(f"Using Admin account: {admin_account} (Balance: {w3.from_wei(w3.eth.get_balance(admin_account), 'ether')} ETH)")

roles = {
    "ADMIN": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "OPERATOR": registry.functions.OPERATOR_ROLE().call(),
    "AI_ORACLE": registry.functions.AI_ORACLE_ROLE().call(),
    "COMPLIANCE": registry.functions.COMPLIANCE_ROLE().call(),
    "RISK_MANAGER": registry.functions.RISK_MANAGER_ROLE().call(),
    "DIRECTOR": registry.functions.DIRECTOR_ROLE().call(),
    "AUDITOR": registry.functions.AUDITOR_ROLE().call(),
}

grants = [
    # Custom addresses from MetaMask
    ("OPERATOR", "0x52E0827CEF5deb10612FEB33EC7cF83961126cA5"),
    ("COMPLIANCE", "0xFc1497C6A61F922d722bEb870BbE0A0237522c5C"),
    ("RISK_MANAGER", "0x807e7EfA4112281D66E8B2A388e0AeB4b9A4ecc9"),
    ("DIRECTOR", "0xE87ea481e15D7984ebD6243167DeC1e7d3368227"),
    ("AUDITOR", "0xEBDce28124c1Eb2d3524c6772748e9fe82D8aAcB"),
    ("ADMIN", "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a"),
    # Also give admin account all roles for ease of testing
    ("OPERATOR", "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a"),
    ("COMPLIANCE", "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a"),
    ("RISK_MANAGER", "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a"),
    ("DIRECTOR", "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a"),
    ("AUDITOR", "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a"),
    # Ganache default addresses
    ("OPERATOR", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"),
    ("AI_ORACLE", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"),
    ("COMPLIANCE", "0x90F79bf6EB2c4f870365E785982E1f101E93b906"),
    ("RISK_MANAGER", "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"),
    ("DIRECTOR", "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"),
    ("AUDITOR", "0x976EA74026E726554dB657fA54763abd0C3a0aa9"),
]

for role_name, raw_addr in grants:
    cs_addr = w3.to_checksum_address(raw_addr)
    role_hash = roles[role_name]
    has = registry.functions.hasRole(role_hash, cs_addr).call()
    if not has:
        print(f"Granting {role_name} to {cs_addr}...")
        tx_hash = registry.functions.grantRole(role_hash, cs_addr).transact({"from": admin_account})
        w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"  -> Granted! (Tx: {tx_hash.hex()})")
    else:
        print(f"Already has {role_name}: {cs_addr}")

print("\n--- Final Role Verification ---")
for role_name, raw_addr in grants:
    cs_addr = w3.to_checksum_address(raw_addr)
    role_hash = roles[role_name]
    assert registry.functions.hasRole(role_hash, cs_addr).call(), f"Failed to verify {role_name} for {cs_addr}"
    print(f"Verified: {cs_addr} has {role_name}")
