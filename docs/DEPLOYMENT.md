# TrustAudit — Deployment & Local Operations Guide

## 1. Local Environment Prerequisites

- **Node.js**: v20.x or v22.x LTS (`v22.6.0` verified)
- **npm**: 10.x+
- **Python**: 3.11 or 3.12 (`3.12.0` verified)
- **Ganache CLI**: v7.9.2+ installed globally or via npm
- **MetaMask**: Chrome / Brave browser extension

---

## 2. Deterministic Ganache Wallet Allocation

For local demonstration and testing, Ganache should be launched with a fixed mnemonic or deterministic accounts.

| Account Index | Designated Role | Sample Address (Default Ganache Mnemonic) | Role Identifier in Contract |
| :---: | :--- | :--- | :--- |
| **#0** | **System Admin / Deployer** | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `DEFAULT_ADMIN_ROLE` |
| **#1** | **Operator (Agent Saisie)** | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `OPERATOR_ROLE` |
| **#2** | **AI Oracle Service** | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | `AI_ORACLE_ROLE` |
| **#3** | **Compliance Officer** | `0x976EA74026E726554dB657fA54763abd0C3a0aa9` | `COMPLIANCE_ROLE` |
| **#4** | **Risk Manager** | `0x14dC79964da2C08b23698B3D3cc7Ca32193d9955` | `RISK_MANAGER_ROLE` |
| **#5** | **Director** | `0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f` | `DIRECTOR_ROLE` |
| **#6** | **External Auditor** | `0xa0Ee7A142d267C1f36714E4a8F75612F20a79720` | `AUDITOR_ROLE` (Read-only) |

> [!CAUTION]
> Never use Ganache development private keys or mnemonics on public testnets or mainnets.

---

## 3. Step-by-Step Deployment Instructions

### Step 1: Start Ganache EVM Node
Run the Ganache CLI on port 8545 with Chain ID 1337:
```powershell
ganache --port 8545 --chainId 1337 --networkId 1337 --wallet.deterministic
```

### Step 2: Deploy Contracts & Configure Roles
In the `contracts/` directory:
```powershell
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network ganache
npx hardhat run scripts/configureRoles.ts --network ganache
```
This script exports the deployment manifest (contract addresses and ABIs) to:
- `backend/app/core/contracts/deployments.json`
- `frontend/src/config/contracts.json`

### Step 3: Initialize Python Backend & Event Indexer
In the `backend/` directory:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Step 4: Launch Frontend DApp
In the `frontend/` directory:
```powershell
cd frontend
npm install
npm run dev
```
Access the application at `http://localhost:5173`.

---

## 4. Automation Scripts (`scripts/`)

- `scripts/start-ganache.ps1`: Starts Ganache node with standard demonstration mnemonic.
- `scripts/deploy-local.ps1`: Compiles contracts, runs Hardhat deployment, and copies ABIs.
- `scripts/start-dev.ps1`: Launches backend API, event worker, and Vite dev server simultaneously.
- `scripts/reset-demo.ps1`: Flushes Ganache state, resets database, redeploys contracts, and seeds demo cases.

---

## 5. Static Analysis & Security Auditing

Before presenting or testing:
```powershell
# Run Slither static analyzer
slither contracts/contracts/TrustAuditRegistry.sol --solc-remaps @openzeppelin=node_modules/@openzeppelin

# Run Hardhat test suite
cd contracts
npx hardhat test
```
