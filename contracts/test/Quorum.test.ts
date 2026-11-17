import { expect } from "chai";
import { ethers } from "hardhat";
import { TrustAuditRegistry, TrustAuditCertificate } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TrustAudit — Quorum Policies & Multi-Signature Enforcement", function () {
  let registry: TrustAuditRegistry;
  let certificate: TrustAuditCertificate;
  let admin: SignerWithAddress;
  let operator: SignerWithAddress;
  let oracle: SignerWithAddress;
  let compliance: SignerWithAddress;
  let riskManager: SignerWithAddress;
  let director: SignerWithAddress;
  let vault: SignerWithAddress;

  const sampleCommentHash1 = ethers.keccak256(ethers.toUtf8Bytes("JUSTIFICATION-COMPLIANCE"));
  const sampleCommentHash2 = ethers.keccak256(ethers.toUtf8Bytes("JUSTIFICATION-RISK"));
  const sampleCommentHash3 = ethers.keccak256(ethers.toUtf8Bytes("JUSTIFICATION-DIRECTOR"));

  beforeEach(async function () {
    [
      admin,
      operator,
      oracle,
      compliance,
      riskManager,
      director,
      vault,
    ] = await ethers.getSigners();

    const RegistryFactory = await ethers.getContractFactory("TrustAuditRegistry");
    registry = await RegistryFactory.deploy(admin.address, vault.address);
    await registry.waitForDeployment();

    const CertFactory = await ethers.getContractFactory("TrustAuditCertificate");
    certificate = await CertFactory.deploy(admin.address, "https://api.trustaudit.bank/metadata/");
    await certificate.waitForDeployment();

    await registry.connect(admin).setCertificateContract(await certificate.getAddress());
    await certificate.connect(admin).grantRole(await certificate.MINTER_ROLE(), await registry.getAddress());

    await registry.connect(admin).grantRole(await registry.OPERATOR_ROLE(), operator.address);
    await registry.connect(admin).grantRole(await registry.AI_ORACLE_ROLE(), oracle.address);
    await registry.connect(admin).grantRole(await registry.COMPLIANCE_ROLE(), compliance.address);
    await registry.connect(admin).grantRole(await registry.RISK_MANAGER_ROLE(), riskManager.address);
    await registry.connect(admin).grantRole(await registry.DIRECTOR_ROLE(), director.address);
  });

  it("Should prevent double-voting by the same wallet address", async function () {
    const caseId = ethers.keccak256(ethers.toUtf8Bytes("CASE-DOUBLE-VOTE"));
    const saltedHash = ethers.keccak256(ethers.toUtf8Bytes("SALTED-HASH"));
    const block = await ethers.provider.getBlock("latest");
    const deadline = BigInt(block!.timestamp + 3600);

    // Register Tier 3 (requires 3 approvals)
    await registry.connect(operator).registerCase(caseId, saltedHash, 2, deadline);
    await registry.connect(oracle).recordAIAssessment(caseId, 25, 0, saltedHash);

    // Compliance signs
    await registry.connect(compliance).submitApproval(caseId, 0, sampleCommentHash1, false);

    // Compliance tries to sign again
    await expect(
      registry.connect(compliance).submitApproval(caseId, 0, sampleCommentHash1, false)
    ).to.be.revertedWithCustomError(registry, "AlreadyApproved");
  });

  it("Should require 3 approvals for Tier 3 (> 50,000 DT): Compliance + Risk Manager + Director", async function () {
    const caseId = ethers.keccak256(ethers.toUtf8Bytes("CASE-TIER3-60000DT"));
    const saltedHash = ethers.keccak256(ethers.toUtf8Bytes("SALTED-HASH-TIER3"));
    const block = await ethers.provider.getBlock("latest");
    const deadline = BigInt(block!.timestamp + 3600);

    // Register Tier 3
    await registry.connect(operator).registerCase(caseId, saltedHash, 2, deadline);
    await registry.connect(oracle).recordAIAssessment(caseId, 87, 2, saltedHash); // HIGH risk

    let c = await registry.getCase(caseId);
    expect(c.requiredApprovals).to.equal(3);
    expect(c.status).to.equal(2); // PENDING_APPROVAL

    // 1st approval: Compliance
    await registry.connect(compliance).submitApproval(caseId, 0, sampleCommentHash1, false);
    c = await registry.getCase(caseId);
    expect(c.approvalCount).to.equal(1);
    expect(c.status).to.equal(2); // Still PENDING_APPROVAL

    // 2nd approval: Risk Manager
    await registry.connect(riskManager).submitApproval(caseId, 1, sampleCommentHash2, false);
    c = await registry.getCase(caseId);
    expect(c.approvalCount).to.equal(2);
    expect(c.status).to.equal(2); // Still PENDING_APPROVAL

    // 3rd approval: Director -> completes quorum!
    await expect(
      registry.connect(director).submitApproval(caseId, 2, sampleCommentHash3, false)
    ).to.emit(registry, "CaseApproved");

    c = await registry.getCase(caseId);
    expect(c.approvalCount).to.equal(3);
    expect(c.status).to.equal(3); // APPROVED!
    expect(c.certificateId).to.equal(1);
  });

  it("Should elevate Tier 1 (< 5,000 DT) quorum from 1 to 2 when AI assigns HIGH risk overlay", async function () {
    const caseId = ethers.keccak256(ethers.toUtf8Bytes("CASE-TIER1-HIGH-RISK"));
    const saltedHash = ethers.keccak256(ethers.toUtf8Bytes("SALTED-HASH-TIER1"));
    const block = await ethers.provider.getBlock("latest");
    const deadline = BigInt(block!.timestamp + 3600);

    // Register Tier 1
    await registry.connect(operator).registerCase(caseId, saltedHash, 0, deadline);

    // AI Oracle records HIGH risk (score 85, RiskLevel.HIGH = 2)
    await registry.connect(oracle).recordAIAssessment(caseId, 85, 2, saltedHash);

    let c = await registry.getCase(caseId);
    expect(c.requiredApprovals).to.equal(2); // Elevated due to HIGH risk overlay!
    expect(c.requiresRiskManagerOverlay).to.be.true;

    // Compliance signs
    await registry.connect(compliance).submitApproval(caseId, 0, sampleCommentHash1, false);
    c = await registry.getCase(caseId);
    expect(c.approvalCount).to.equal(1);
    expect(c.status).to.equal(2); // Still PENDING_APPROVAL

    // Risk Manager signs -> fulfills overlay and completes quorum!
    await expect(
      registry.connect(riskManager).submitApproval(caseId, 1, sampleCommentHash2, false)
    ).to.emit(registry, "CaseApproved");

    c = await registry.getCase(caseId);
    expect(c.status).to.equal(3); // APPROVED!
  });
});
