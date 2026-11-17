import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const provider = ethers.provider;
  const network = await provider.getNetwork();

  const manifestPath = path.join(__dirname, "..", "deployments", "local-ganache.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const registryAddress = manifest.contracts.TrustAuditRegistry.address;
  const registry = await ethers.getContractAt("TrustAuditRegistry", registryAddress);

  console.log("=========================================================================================");
  console.log(` Ganache EVM State (RPC: http://127.0.0.1:8545 | Chain ID: ${network.chainId})`);
  console.log(` Registry Contract: ${registryAddress}`);
  console.log("=========================================================================================");

  const accounts = [
    { label: "Operator", addr: manifest.roles.operator, role: await registry.OPERATOR_ROLE() },
    { label: "Compliance", addr: manifest.roles.compliance, role: await registry.COMPLIANCE_ROLE() },
    { label: "Risk Manager", addr: manifest.roles.riskManager, role: await registry.RISK_MANAGER_ROLE() },
    { label: "Director", addr: manifest.roles.director, role: await registry.DIRECTOR_ROLE() },
    { label: "Admin", addr: manifest.roles.admin, role: await registry.DEFAULT_ADMIN_ROLE() },
    { label: "Auditor", addr: manifest.roles.auditor, role: await registry.AUDITOR_ROLE() },
  ];

  for (const acc of accounts) {
    const bal = await provider.getBalance(acc.addr);
    const hasRole = await registry.hasRole(acc.role, acc.addr);
    const roleStatus = hasRole ? "ACTIVE ✓" : "REVOKED ✗";
    console.log(
      ` [${acc.label.padEnd(12)}] ${acc.addr} | Balance: ${ethers.formatEther(bal).padStart(6)} ETH | Role: ${roleStatus}`
    );
  }
  console.log("=========================================================================================");
}

main().catch(console.error);
