import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("==========================================================");
  console.log("TrustAudit — Funding & Granting Roles to Custom User Accounts");
  console.log("==========================================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer / Admin Address:", deployer.address);
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(deployerBalance), "ETH");

  const manifestPath = path.join(__dirname, "..", "deployments", "local-ganache.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Manifest local-ganache.json not found!");
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const registryAddress = manifest.contracts.TrustAuditRegistry.address;
  const certificateAddress = manifest.contracts.TrustAuditCertificate.address;

  console.log("TrustAuditRegistry address:", registryAddress);
  console.log("TrustAuditCertificate address:", certificateAddress);

  const registry = await ethers.getContractAt("TrustAuditRegistry", registryAddress, deployer);
  const certificate = await ethers.getContractAt("TrustAuditCertificate", certificateAddress, deployer);

  // User's custom MetaMask accounts
  const userAccounts = {
    operator: "0x52E0827CEF5deb10612FEB33EC7cF83961126cA5",
    compliance: "0xFc1497C6A61F922d722bEb870BbE0A0237522c5C",
    riskManager: "0x807e7EfA4112281D66E8B2A388e0AeB4b9A4ecc9",
    director: "0xE87ea481e15D7984ebD6243167DeC1e7d3368227",
    admin: "0x7E2D7326A012C5735cb6B1E9f63b851CE82dE94a",
    auditor: "0xEBDce28124c1Eb2d3524c6772748e9fe82D8aAcB",
  };

  // 1. Fund each account with 100 ETH for gas
  console.log("\n[1/3] Transferring 100 ETH to each custom account for gas...");
  for (const [roleName, addr] of Object.entries(userAccounts)) {
    const curBalance = await ethers.provider.getBalance(addr);
    if (curBalance < ethers.parseEther("50")) {
      const fundTx = await deployer.sendTransaction({
        to: addr,
        value: ethers.parseEther("100"),
      });
      await fundTx.wait();
      console.log(`  ✓ Funded ${roleName} (${addr.slice(0, 10)}...) with 100 ETH`);
    } else {
      console.log(`  ✓ Account ${roleName} already has ${ethers.formatEther(curBalance)} ETH`);
    }
  }

  // 2. Grant Smart Contract Roles
  console.log("\n[2/3] Granting on-chain RBAC roles on TrustAuditRegistry...");
  const OPERATOR_ROLE = await registry.OPERATOR_ROLE();
  const COMPLIANCE_ROLE = await registry.COMPLIANCE_ROLE();
  const RISK_MANAGER_ROLE = await registry.RISK_MANAGER_ROLE();
  const DIRECTOR_ROLE = await registry.DIRECTOR_ROLE();
  const AUDITOR_ROLE = await registry.AUDITOR_ROLE();
  const DEFAULT_ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();

  // Operator
  if (!(await registry.hasRole(OPERATOR_ROLE, userAccounts.operator))) {
    await (await registry.grantRole(OPERATOR_ROLE, userAccounts.operator)).wait();
    console.log("  ✓ OPERATOR_ROLE granted to", userAccounts.operator);
  } else {
    console.log("  ✓ OPERATOR_ROLE already held by", userAccounts.operator);
  }

  // Compliance
  if (!(await registry.hasRole(COMPLIANCE_ROLE, userAccounts.compliance))) {
    await (await registry.grantRole(COMPLIANCE_ROLE, userAccounts.compliance)).wait();
    console.log("  ✓ COMPLIANCE_ROLE granted to", userAccounts.compliance);
  } else {
    console.log("  ✓ COMPLIANCE_ROLE already held by", userAccounts.compliance);
  }

  // Risk Manager
  if (!(await registry.hasRole(RISK_MANAGER_ROLE, userAccounts.riskManager))) {
    await (await registry.grantRole(RISK_MANAGER_ROLE, userAccounts.riskManager)).wait();
    console.log("  ✓ RISK_MANAGER_ROLE granted to", userAccounts.riskManager);
  } else {
    console.log("  ✓ RISK_MANAGER_ROLE already held by", userAccounts.riskManager);
  }

  // Director
  if (!(await registry.hasRole(DIRECTOR_ROLE, userAccounts.director))) {
    await (await registry.grantRole(DIRECTOR_ROLE, userAccounts.director)).wait();
    console.log("  ✓ DIRECTOR_ROLE granted to", userAccounts.director);
  } else {
    console.log("  ✓ DIRECTOR_ROLE already held by", userAccounts.director);
  }

  // Auditor
  if (!(await registry.hasRole(AUDITOR_ROLE, userAccounts.auditor))) {
    await (await registry.grantRole(AUDITOR_ROLE, userAccounts.auditor)).wait();
    console.log("  ✓ AUDITOR_ROLE granted to", userAccounts.auditor);
  } else {
    console.log("  ✓ AUDITOR_ROLE already held by", userAccounts.auditor);
  }

  // Admin
  if (!(await registry.hasRole(DEFAULT_ADMIN_ROLE, userAccounts.admin))) {
    await (await registry.grantRole(DEFAULT_ADMIN_ROLE, userAccounts.admin)).wait();
    console.log("  ✓ DEFAULT_ADMIN_ROLE granted to", userAccounts.admin);
  } else {
    console.log("  ✓ DEFAULT_ADMIN_ROLE already held by", userAccounts.admin);
  }

  // Also grant admin on Certificate contract
  if (!(await certificate.hasRole(DEFAULT_ADMIN_ROLE, userAccounts.admin))) {
    await (await certificate.grantRole(DEFAULT_ADMIN_ROLE, userAccounts.admin)).wait();
    console.log("  ✓ DEFAULT_ADMIN_ROLE on Certificate granted to", userAccounts.admin);
  }

  // 3. Update manifest files
  console.log("\n[3/3] Updating manifest files across contracts, backend, and frontend...");
  manifest.roles.operator = userAccounts.operator;
  manifest.roles.compliance = userAccounts.compliance;
  manifest.roles.riskManager = userAccounts.riskManager;
  manifest.roles.director = userAccounts.director;
  manifest.roles.admin = userAccounts.admin;
  manifest.roles.auditor = userAccounts.auditor;

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const backendDest = path.join(__dirname, "..", "..", "backend", "app", "config", "local-ganache.json");
  const frontendDest = path.join(__dirname, "..", "..", "frontend", "src", "config", "deployments.json");

  if (fs.existsSync(path.dirname(backendDest))) {
    fs.writeFileSync(backendDest, JSON.stringify(manifest, null, 2));
    console.log("  ✓ Backend manifest updated:", backendDest);
  }
  if (fs.existsSync(path.dirname(frontendDest))) {
    fs.writeFileSync(frontendDest, JSON.stringify(manifest, null, 2));
    console.log("  ✓ Frontend manifest updated:", frontendDest);
  }

  console.log("\n==========================================================");
  console.log("SUCCESS! All 6 custom MetaMask accounts are funded & primed!");
  console.log("==========================================================");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
