import deployments from './deployments.json';

export const CHAIN_ID = deployments.chainId || 1337;
export const CHAIN_ID_HEX = `0x${CHAIN_ID.toString(16)}`;

export const REGISTRY_ADDRESS = deployments.contracts.TrustAuditRegistry.address;
export const REGISTRY_ABI = deployments.contracts.TrustAuditRegistry.abi;

export const CERTIFICATE_ADDRESS = deployments.contracts.TrustAuditCertificate.address;
export const CERTIFICATE_ABI = deployments.contracts.TrustAuditCertificate.abi;

export const DEMO_ROLES: Record<string, string> = {
  // Primary User MetaMask Wallets
  admin: "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a",
  operator: "0x52E0827CEF5deb10612FEB33EC7cF83961126cA5",
  oracle: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  compliance: "0xFc1497C6A61F922d722bEb870BbE0A0237522c5C",
  riskManager: "0x807e7EfA4112281D66E8B2A388e0AeB4b9A4ecc9",
  director: "0xE87ea481e15D7984ebD6243167DeC1e7d3368227",
  auditor: "0xEBDce28124c1Eb2d3524c6772748e9fe82D8aAcB",

  // Ganache Default Wallets (fallback)
  admin_ganache: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  operator_ganache: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  compliance_ganache: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  riskManager_ganache: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  director_ganache: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  auditor_ganache: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
};

export const KNOWN_ROLE_MAP: Record<string, string> = {
  // User primary wallets
  "0x7e2d7326a012c5735cb6b1e9f63b851ce82de94a": "ADMIN",
  "0x52e0827cef5deb10612feb33ec7cf83961126ca5": "OPERATOR",
  "0xfc1497c6a61f922d722beb870bbe0a0237522c5c": "COMPLIANCE",
  "0x807e7efa4112281d66e8b2a388e0aeb4b9a4ecc9": "RISK_MANAGER",
  "0xe87ea481e15d7984ebd6243167dec1e7d3368227": "DIRECTOR",
  "0xebdce28124c1eb2d3524c6772748e9fe82d8aacb": "AUDITOR",

  // Ganache test wallets
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266": "ADMIN",
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8": "OPERATOR",
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc": "ORACLE",
  "0x90f79bf6eb2c4f870365e785982e1f101e93b906": "COMPLIANCE",
  "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65": "RISK_MANAGER",
  "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc": "DIRECTOR",
  "0x976ea74026e726554db657fa54763abd0c3a0aa9": "AUDITOR",
};
