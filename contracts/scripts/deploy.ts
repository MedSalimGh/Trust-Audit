import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("--------------------------------------------------");
  console.log("TrustAudit Smart Contract Deployment");
  console.log("Deployer address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  const network = await ethers.provider.getNetwork();
  console.log("Target Network:", network.name, "(Chain ID:", network.chainId.toString(), ")");

  // Vault address for institutional compliance certificates
  const vaultAddress = deployer.address;

  // 1. Deploy TrustAuditCertificate
  console.log("\n[1/3] Deploying TrustAuditCertificate (Soulbound Token)...");
  const CertFactory = await ethers.getContractFactory("TrustAuditCertificate");
  const certificate = await CertFactory.deploy(deployer.address, "https://api.trustaudit.bank/metadata/");
  await certificate.waitForDeployment();
  const certAddress = await certificate.getAddress();
  console.log("TrustAuditCertificate deployed to:", certAddress);

  // 2. Deploy TrustAuditRegistry
  console.log("\n[2/3] Deploying TrustAuditRegistry...");
  const RegistryFactory = await ethers.getContractFactory("TrustAuditRegistry");
  const registry = await RegistryFactory.deploy(deployer.address, vaultAddress);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("TrustAuditRegistry deployed to:", registryAddress);

  // 3. Link Contracts: configure Certificate in Registry & grant MINTER_ROLE to Registry
  console.log("\n[3/3] Linking contracts & granting MINTER_ROLE...");
  const linkTx = await registry.setCertificateContract(certAddress);
  await linkTx.wait();

  const minterRole = await certificate.MINTER_ROLE();
  const grantMinterTx = await certificate.grantRole(minterRole, registryAddress);
  await grantMinterTx.wait();
  console.log("MINTER_ROLE granted to Registry successfully.");

  // Configure Roles for testing/demo signers
  const signers = await ethers.getSigners();
  const operator = signers[1] || deployer;
  const oracle = signers[2] || deployer;
  const compliance = signers[3] || deployer;
  const riskManager = signers[4] || deployer;
  const director = signers[5] || deployer;
  const auditor = signers[6] || deployer;

  console.log("\n[4/4] Configuring Initial System Roles...");
  const OPERATOR_ROLE = await registry.OPERATOR_ROLE();
  const AI_ORACLE_ROLE = await registry.AI_ORACLE_ROLE();
  const COMPLIANCE_ROLE = await registry.COMPLIANCE_ROLE();
  const RISK_MANAGER_ROLE = await registry.RISK_MANAGER_ROLE();
  const DIRECTOR_ROLE = await registry.DIRECTOR_ROLE();
  const AUDITOR_ROLE = await registry.AUDITOR_ROLE();

  await (await registry.grantRole(OPERATOR_ROLE, operator.address)).wait();
  await (await registry.grantRole(AI_ORACLE_ROLE, oracle.address)).wait();
  await (await registry.grantRole(COMPLIANCE_ROLE, compliance.address)).wait();
  await (await registry.grantRole(RISK_MANAGER_ROLE, riskManager.address)).wait();
  await (await registry.grantRole(DIRECTOR_ROLE, director.address)).wait();
  await (await registry.grantRole(AUDITOR_ROLE, auditor.address)).wait();

  // Also grant roles to user's custom MetaMask demo addresses
  const customRoleGrants = [
    { role: OPERATOR_ROLE, addr: "0x52E0827CEF5deb10612FEB33EC7cF83961126cA5" },
    { role: COMPLIANCE_ROLE, addr: "0xFc1497C6A61F922d722bEb870BbE0A0237522c5C" },
    { role: RISK_MANAGER_ROLE, addr: "0x807e7EfA4112281D66E8B2A388e0AeB4b9A4ecc9" },
    { role: DIRECTOR_ROLE, addr: "0xE87ea481e15D7984ebD6243167DeC1e7d3368227" },
    { role: AUDITOR_ROLE, addr: "0xEBDce28124c1Eb2d3524c6772748e9fe82D8aAcB" },
    { role: await registry.DEFAULT_ADMIN_ROLE(), addr: "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a" },
    { role: OPERATOR_ROLE, addr: "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a" },
    { role: COMPLIANCE_ROLE, addr: "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a" },
    { role: RISK_MANAGER_ROLE, addr: "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a" },
    { role: DIRECTOR_ROLE, addr: "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a" },
    { role: AUDITOR_ROLE, addr: "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a" },
  ];

  for (const g of customRoleGrants) {
    if (!(await registry.hasRole(g.role, g.addr))) {
      await (await registry.grantRole(g.role, g.addr)).wait();
    }
  }
  console.log("Roles successfully granted to designated demonstration addresses and custom MetaMask accounts.");

  // Save deployment artifact manifest
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const manifest = {
    network: network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    contracts: {
      TrustAuditRegistry: {
        address: registryAddress,
        abi: JSON.parse(fs.readFileSync(path.join(__dirname, "..", "artifacts", "contracts", "TrustAuditRegistry.sol", "TrustAuditRegistry.json"), "utf8")).abi,
      },
      TrustAuditCertificate: {
        address: certAddress,
        abi: JSON.parse(fs.readFileSync(path.join(__dirname, "..", "artifacts", "contracts", "TrustAuditCertificate.sol", "TrustAuditCertificate.json"), "utf8")).abi,
      },
    },
    institutionalVault: vaultAddress,
    roles: {
      admin: deployer.address,
      operator: operator.address,
      oracle: oracle.address,
      compliance: compliance.address,
      riskManager: riskManager.address,
      director: director.address,
      auditor: auditor.address,
    },
  };

  const manifestPath = path.join(deploymentsDir, "local-ganache.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("\nDeployment manifest exported to:", manifestPath);
  console.log("--------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
