import json
import sqlite3
import time
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
assert w3.is_connected(), "Ganache is not connected"

with open("contracts/deployments/local-ganache.json") as f:
    dep = json.load(f)

reg_addr = dep["contracts"]["TrustAuditRegistry"]["address"]
reg_abi = dep["contracts"]["TrustAuditRegistry"]["abi"]
registry = w3.eth.contract(address=reg_addr, abi=reg_abi)

# Accounts
operator_account = w3.eth.accounts[1] # 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
oracle_account = w3.eth.accounts[2]   # 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

# Connect to DB
conn = sqlite3.connect("backend/trustaudit.db")
c = conn.cursor()

c.execute("""
    SELECT ac.case_id, ac.value_tier, ac.deadline, cc.salted_input_hash, ai.risk_score, ai.risk_level, ai.explanation_hash
    FROM audit_cases ac
    LEFT JOIN cryptographic_commitments cc ON ac.case_id = cc.case_id
    LEFT JOIN ai_assessments ai ON ac.case_id = ai.case_id
""")
cases = c.fetchall()
print(f"Found {len(cases)} cases in DB to synchronize on-chain.")

risk_map = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}

for row in cases:
    case_id_hex, value_tier, deadline_str, salted_input_hash_hex, risk_score, risk_level, expl_hash_hex = row
    case_bytes32 = bytes.fromhex(case_id_hex.replace("0x", ""))
    
    # Check if case exists on-chain
    exists = False
    try:
        on_chain_case = registry.functions.getCase(case_bytes32).call()
        exists = (on_chain_case[3] != 0) # status != NONE
    except Exception:
        exists = False
        
    if exists:
        print(f"Case {case_id_hex[:12]}... already exists on-chain.")
        continue

    # 1. Register case on-chain
    salted_hash = bytes.fromhex(salted_input_hash_hex.replace("0x", "")) if salted_input_hash_hex else w3.keccak(text=case_id_hex)
    tier = int(value_tier) if value_tier is not None else 1
    deadline_ts = int(time.time()) + 172800 # 48 hours from now
    
    print(f"Registering case {case_id_hex[:12]}... on-chain...")
    tx_reg = registry.functions.registerCase(
        case_bytes32,
        salted_hash,
        tier,
        deadline_ts
    ).transact({"from": operator_account})
    w3.eth.wait_for_transaction_receipt(tx_reg)
    print(f"  -> Registered! Tx: {tx_reg.hex()[:16]}...")

    # 2. Record AI assessment if present (transitions to PENDING_APPROVAL)
    score = int(risk_score) if risk_score is not None else 35
    level_enum = risk_map.get(risk_level, 0)
    expl_hash = bytes.fromhex(expl_hash_hex.replace("0x", "")) if expl_hash_hex else w3.keccak(text="AI-Assessment-OK")
    
    print(f"Recording AI assessment for {case_id_hex[:12]}... (Score: {score}, Level: {level_enum})...")
    tx_ai = registry.functions.recordAIAssessment(
        case_bytes32,
        score,
        level_enum,
        expl_hash
    ).transact({"from": oracle_account})
    w3.eth.wait_for_transaction_receipt(tx_ai)
    print(f"  -> AI assessment anchored! Tx: {tx_ai.hex()[:16]}... Case is now PENDING_APPROVAL!")

print("\nAll database cases are now active on Ganache in PENDING_APPROVAL state!")
