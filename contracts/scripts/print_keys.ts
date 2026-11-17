import { ethers } from "ethers";

async function main() {
  const mnemonic = "test test test test test test test test test test test junk";
  const roles = [
    "Admin / Deployer",
    "Operator",
    "AI Oracle (Backend Auto)",
    "Compliance Officer",
    "Risk Manager",
    "Director",
    "Auditor",
    "Institutional Vault (Recipient)",
    "Secondary / Backup Signer",
    "Unauthorized / Attacker (Penetration Test)"
  ];

  console.log("==========================================================");
  console.log("TrustAudit Deterministic Accounts & Private Keys");
  console.log("==========================================================");
  for (let i = 0; i < roles.length; i++) {
    const path = `m/44'/60'/0'/0/${i}`;
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, "", path);
    console.log(`Account ${i} [${roles[i]}]:`);
    console.log(`  Address:     ${wallet.address}`);
    console.log(`  Private Key: ${wallet.privateKey}`);
    console.log("");
  }
}

main().catch(console.error);
