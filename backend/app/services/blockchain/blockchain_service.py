import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from web3 import Web3
from eth_account import Account
from app.core.config import settings

logger = logging.getLogger("trustaudit.blockchain")

class BlockchainService:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(settings.GANACHE_RPC_URL))
        self.registry_contract = None
        self.certificate_contract = None
        self.manifest: Dict[str, Any] = {}
        self._load_contracts()

    def is_connected(self) -> bool:
        try:
            return self.w3.is_connected()
        except Exception:
            return False

    def get_chain_id(self) -> int:
        try:
            return self.w3.eth.chain_id
        except Exception:
            return 0

    def _load_contracts(self):
        manifest_path = Path(settings.DEPLOYMENT_MANIFEST_PATH)
        if not manifest_path.exists():
            logger.warning(f"Deployment manifest not found at {manifest_path}. Blockchain reads disabled.")
            return

        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                self.manifest = json.load(f)

            registry_info = self.manifest["contracts"]["TrustAuditRegistry"]
            cert_info = self.manifest["contracts"]["TrustAuditCertificate"]

            self.registry_address = Web3.to_checksum_address(registry_info["address"])
            self.certificate_address = Web3.to_checksum_address(cert_info["address"])

            self.registry_contract = self.w3.eth.contract(
                address=self.registry_address,
                abi=registry_info["abi"]
            )
            self.certificate_contract = self.w3.eth.contract(
                address=self.certificate_address,
                abi=cert_info["abi"]
            )
            logger.info(f"Loaded TrustAuditRegistry at {self.registry_address}")
            logger.info(f"Loaded TrustAuditCertificate at {self.certificate_address}")
        except Exception as e:
            logger.error(f"Error loading contracts from manifest: {e}")

    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        """Reads public on-chain case state."""
        if not self.registry_contract:
            return None
        try:
            case_bytes32 = bytes.fromhex(case_id.replace("0x", ""))
            case_tuple = self.registry_contract.functions.getCase(case_bytes32).call()
            # Struct: caseId, saltedInputHash, explanationHash, aiRiskScore, riskLevel, status, valueTier, createdAt, deadline, operator, certificateId, requiredApprovals, approvalCount, requiresRiskManagerOverlay
            return {
                "case_id": "0x" + case_tuple[0].hex(),
                "salted_input_hash": "0x" + case_tuple[1].hex(),
                "explanation_hash": "0x" + case_tuple[2].hex(),
                "ai_risk_score": case_tuple[3],
                "risk_level": case_tuple[4],
                "status": case_tuple[5],
                "value_tier": case_tuple[6],
                "created_at": case_tuple[7],
                "deadline": case_tuple[8],
                "operator": case_tuple[9],
                "certificate_id": case_tuple[10],
                "required_approvals": case_tuple[11],
                "approval_count": case_tuple[12],
                "requires_risk_manager_overlay": case_tuple[13],
            }
        except Exception as e:
            logger.debug(f"get_case call failed for {case_id}: {e}")
            return None

    def has_role(self, role_name: str, account_address: str) -> bool:
        """Checks if an account holds a specific role in the registry contract."""
        if not self.registry_contract:
            return False
        try:
            account = Web3.to_checksum_address(account_address)
            role_bytes = getattr(self.registry_contract.functions, f"{role_name}()")().call()
            return self.registry_contract.functions.hasRole(role_bytes, account).call()
        except Exception as e:
            logger.debug(f"has_role check failed for {role_name} on {account_address}: {e}")
            return False

    def submit_oracle_assessment(
        self,
        case_id: str,
        risk_score: int,
        risk_level_enum: int,
        explanation_hash: str
    ) -> str:
        """
        Signs and submits AI assessment transaction using the restricted Oracle wallet.
        Only AI_ORACLE_ROLE account can call recordAIAssessment.
        """
        if not self.registry_contract:
            raise RuntimeError("Registry contract not initialized")

        oracle_account = Account.from_key(settings.ORACLE_PRIVATE_KEY)
        oracle_address = Web3.to_checksum_address(oracle_account.address)

        case_bytes32 = bytes.fromhex(case_id.replace("0x", ""))
        expl_bytes32 = bytes.fromhex(explanation_hash.replace("0x", ""))

        nonce = self.w3.eth.get_transaction_count(oracle_address)
        gas_price = self.w3.eth.gas_price

        tx = self.registry_contract.functions.recordAIAssessment(
            case_bytes32,
            int(risk_score),
            int(risk_level_enum),
            expl_bytes32
        ).build_transaction({
            "from": oracle_address,
            "nonce": nonce,
            "gas": 300000,
            "gasPrice": gas_price,
            "chainId": self.get_chain_id(),
        })

        signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=settings.ORACLE_PRIVATE_KEY)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        
        if receipt["status"] != 1:
            raise RuntimeError(f"Oracle assessment transaction failed on-chain: {tx_hash.hex()}")

        logger.info(f"Oracle assessment anchored for case {case_id} in tx: {tx_hash.hex()}")
        return tx_hash.hex()

blockchain_service = BlockchainService()
