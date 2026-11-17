import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const signers = await ethers.getSigners();
  const [deployer] = signers;

  const manifestPath = path.join(__dirname, "..", "deployments", "local-ganache.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Deployment manifest not found at ${manifestPath}. Run deploy.ts first.`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const registryAddress = manifest.contracts.TrustAuditRegistry.address;
  console.log("Configuring roles on TrustAuditRegistry at:", registryAddress);

  const registry = await ethers.getContractAt("TrustAuditRegistry", registryAddress);

  // Map deterministic accounts if available (Ganache provides at least 10 accounts)
  const operator = signers[1] || deployer;
  const oracle = signers[2] || deployer;
  const compliance = signers[3] || deployer;
  const riskManager = signers[4] || deployer;
  const director = signers[5] || deployer;
  const auditor = signers[6] || deployer;

  console.log("\nAssigned Role Addresses:");
  console.log("  Operator:     ", operator.address);
  console.log("  AI Oracle:    ", oracle.address);
  console.log("  Compliance:   ", compliance.address);
  console.log("  Risk Manager: ", riskManager.address);
  console.log("  Director:     ", director.address);
  console.log("  Auditor:      ", auditor.address);

  // Roles hashes
  const OPERATOR_ROLE = await registry.OPERATOR_ROLE();
  const AI_ORACLE_ROLE = await registry.AI_ORACLE_ROLE();
  const COMPLIANCE_ROLE = await registry.COMPLIANCE_ROLE();
  const RISK_MANAGER_ROLE = await registry.RISK_MANAGER_ROLE();
  const DIRECTOR_ROLE = await registry.DIRECTOR_ROLE();
  const AUDITOR_ROLE = await registry.AUDITOR_ROLE();

  console.log("\nGranting roles...");
  await (await registry.grantRole(OPERATOR_ROLE, operator.address)).wait();
  await (await registry.grantRole(AI_ORACLE_ROLE, oracle.address)).wait();
  await (await registry.grantRole(COMPLIANCE_ROLE, compliance.address)).wait();
  await (await registry.grantRole(RISK_MANAGER_ROLE, riskManager.address)).wait();
  await (await registry.grantRole(DIRECTOR_ROLE, director.address)).wait();
  await (await registry.grantRole(AUDITOR_ROLE, auditor.address)).wait();

  // Update manifest with configured role addresses
  manifest.roles = {
    admin: deployer.address,
    operator: operator.address,
    oracle: oracle.address,
    compliance: compliance.address,
    riskManager: riskManager.address,
    director: director.address,
    auditor: auditor.address,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("Roles successfully configured and updated in manifest!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
