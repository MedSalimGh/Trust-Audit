import { expect } from "chai";
import { ethers } from "hardhat";
import { TrustAuditRegistry, TrustAuditCertificate } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TrustAudit — State Machine & Lifecycle Transitions", function () {
  let registry: TrustAuditRegistry;
  let certificate: TrustAuditCertificate;
  let admin: SignerWithAddress;
  let operator: SignerWithAddress;
  let oracle: SignerWithAddress;
  let compliance: SignerWithAddress;
  let riskManager: SignerWithAddress;
  let director: SignerWithAddress;
  let vault: SignerWithAddress;

  const sampleCaseId = ethers.keccak256(ethers.toUtf8Bytes("CASE-WORKFLOW-001"));
  const sampleSaltedHash = ethers.keccak256(ethers.toUtf8Bytes("SALTED-HASH-001"));
  const sampleExplanationHash = ethers.keccak256(ethers.toUtf8Bytes("EXPLANATION-001"));
  const sampleCommentHash = ethers.keccak256(ethers.toUtf8Bytes("JUSTIFICATION-001"));

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

  it("Should prevent human approval before AI assessment is recorded", async function () {
    const block = await ethers.provider.getBlock("latest");
    const deadline = BigInt(block!.timestamp + 3600);
    await registry.connect(operator).registerCase(sampleCaseId, sampleSaltedHash, 0, deadline);

    await expect(
      registry.connect(compliance).submitApproval(sampleCaseId, 0, sampleCommentHash, false)
    ).to.be.revertedWithCustomError(registry, "InvalidCaseStatus");
  });

  it("Should transition from REGISTERED to PENDING_APPROVAL to APPROVED on Tier 1", async function () {
    const block = await ethers.provider.getBlock("latest");
    const deadline = BigInt(block!.timestamp + 3600);
    await registry.connect(operator).registerCase(sampleCaseId, sampleSaltedHash, 0, deadline);
    await registry.connect(oracle).recordAIAssessment(sampleCaseId, 15, 0, sampleExplanationHash);

    const tx = await registry.connect(compliance).submitApproval(sampleCaseId, 0, sampleCommentHash, false);
    await expect(tx).to.emit(registry, "CaseApproved");

    const c = await registry.getCase(sampleCaseId);
    expect(c.status).to.equal(3); // APPROVED
    expect(c.certificateId).to.equal(1);

    // Verify certificate was minted to vault
    expect(await certificate.ownerOf(1)).to.equal(vault.address);
    expect(await certificate.getCaseByTokenId(1)).to.equal(sampleCaseId);
  });

  it("Should lock terminal states: approved case cannot be rejected", async function () {
    const block = await ethers.provider.getBlock("latest");
    const deadline = BigInt(block!.timestamp + 3600);
    await registry.connect(operator).registerCase(sampleCaseId, sampleSaltedHash, 0, deadline);
    await registry.connect(oracle).recordAIAssessment(sampleCaseId, 15, 0, sampleExplanationHash);
    await registry.connect(compliance).submitApproval(sampleCaseId, 0, sampleCommentHash, false);

    await expect(
      registry.connect(compliance).rejectCase(sampleCaseId, sampleCommentHash)
    ).to.be.revertedWithCustomError(registry, "InvalidCaseStatus");
  });

  it("Should transition to REJECTED and lock terminal state against approval", async function () {
    const block = await ethers.provider.getBlock("latest");
    const deadline = BigInt(block!.timestamp + 3600);
    await registry.connect(operator).registerCase(sampleCaseId, sampleSaltedHash, 0, deadline);
    await registry.connect(oracle).recordAIAssessment(sampleCaseId, 55, 1, sampleExplanationHash);

    await expect(
      registry.connect(compliance).rejectCase(sampleCaseId, sampleCommentHash)
    ).to.emit(registry, "CaseRejected");

    const c = await registry.getCase(sampleCaseId);
    expect(c.status).to.equal(4); // REJECTED

    // Subsequent approval attempt must revert
    await expect(
      registry.connect(compliance).submitApproval(sampleCaseId, 0, sampleCommentHash, false)
    ).to.be.revertedWithCustomError(registry, "InvalidCaseStatus");
  });

  it("Should enforce deadline escalation: cannot escalate before deadline, succeeds after", async function () {
    const block = await ethers.provider.getBlock("latest");
    const deadline = BigInt(block!.timestamp + 100);
    await registry.connect(operator).registerCase(sampleCaseId, sampleSaltedHash, 0, deadline);
    await registry.connect(oracle).recordAIAssessment(sampleCaseId, 55, 1, sampleExplanationHash);

    // Attempt escalation before deadline
    await expect(
      registry.escalateCase(sampleCaseId)
    ).to.be.revertedWithCustomError(registry, "DeadlineNotExceeded");

    // Fast-forward time past deadline
    await ethers.provider.send("evm_increaseTime", [150]);
    await ethers.provider.send("evm_mine", []);

    // Escalation succeeds
    await expect(registry.escalateCase(sampleCaseId)).to.emit(registry, "CaseEscalated");

    const c = await registry.getCase(sampleCaseId);
    expect(c.status).to.equal(5); // ESCALATED
  });
});
