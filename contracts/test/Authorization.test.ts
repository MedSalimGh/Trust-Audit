import { expect } from "chai";
import { ethers } from "hardhat";
import { TrustAuditRegistry, TrustAuditCertificate } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TrustAudit — Authorization & Role-Based Access Control", function () {
  let registry: TrustAuditRegistry;
  let certificate: TrustAuditCertificate;
  let admin: SignerWithAddress;
  let operator: SignerWithAddress;
  let oracle: SignerWithAddress;
  let compliance: SignerWithAddress;
  let riskManager: SignerWithAddress;
  let director: SignerWithAddress;
  let auditor: SignerWithAddress;
  let unauthorized: SignerWithAddress;
  let vault: SignerWithAddress;

  const sampleCaseId = ethers.keccak256(ethers.toUtf8Bytes("CASE-AUTH-001"));
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
      auditor,
      unauthorized,
      vault,
    ] = await ethers.getSigners();

    // Deploy Registry
    const RegistryFactory = await ethers.getContractFactory("TrustAuditRegistry");
    registry = await RegistryFactory.deploy(admin.address, vault.address);
    await registry.waitForDeployment();

    // Deploy Certificate
    const CertFactory = await ethers.getContractFactory("TrustAuditCertificate");
    certificate = await CertFactory.deploy(admin.address, "https://api.trustaudit.bank/metadata/");
    await certificate.waitForDeployment();

    // Link Certificate to Registry
    await registry.connect(admin).setCertificateContract(await certificate.getAddress());
    await certificate.connect(admin).grantRole(await certificate.MINTER_ROLE(), await registry.getAddress());

    // Grant roles in Registry
    await registry.connect(admin).grantRole(await registry.OPERATOR_ROLE(), operator.address);
    await registry.connect(admin).grantRole(await registry.AI_ORACLE_ROLE(), oracle.address);
    await registry.connect(admin).grantRole(await registry.COMPLIANCE_ROLE(), compliance.address);
    await registry.connect(admin).grantRole(await registry.RISK_MANAGER_ROLE(), riskManager.address);
    await registry.connect(admin).grantRole(await registry.DIRECTOR_ROLE(), director.address);
    await registry.connect(admin).grantRole(await registry.AUDITOR_ROLE(), auditor.address);
  });

  it("Should allow OPERATOR_ROLE to register a case", async function () {
    const block = await ethers.provider.getBlock("latest");
    const deadline = BigInt(block!.timestamp + 3600);

    await expect(
      registry.connect(operator).registerCase(sampleCaseId, sampleSaltedHash, 0, deadline)
    ).to.emit(registry, "CaseRegistered");

    const c = await registry.getCase(sampleCaseId);
    expect(c.operator).to.equal(operator.address);
    expect(c.status).to.equal(1); // REGISTERED
  });

  it("Should revert if an unauthorized account attempts to register a case", async function () {
    const block = await ethers.provider.getBlock("latest");
    const deadline = BigInt(block!.timestamp + 3600);

    await expect(
      registry.connect(unauthorized).registerCase(sampleCaseId, sampleSaltedHash, 0, deadline)
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
  });

  it("Should allow only AI_ORACLE_ROLE to record AI assessment", async function () {
    const block = await ethers.provider.getBlock("latest");
    const deadline = BigInt(block!.timestamp + 3600);
    await registry.connect(operator).registerCase(sampleCaseId, sampleSaltedHash, 0, deadline);

    // Unauthorized attempt
    await expect(
      registry.connect(compliance).recordAIAssessment(sampleCaseId, 45, 1, sampleExplanationHash)
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");

    // Authorized attempt
    await expect(
      registry.connect(oracle).recordAIAssessment(sampleCaseId, 45, 1, sampleExplanationHash)
    ).to.emit(registry, "AIAssessmentRecorded");

    const c = await registry.getCase(sampleCaseId);
    expect(c.status).to.equal(2); // PENDING_APPROVAL
    expect(c.aiRiskScore).to.equal(45);
  });

  it("Should strictly enforce separation of duties: Operator cannot approve own case", async function () {
    const block = await ethers.provider.getBlock("latest");
    const deadline = BigInt(block!.timestamp + 3600);
    await registry.connect(operator).registerCase(sampleCaseId, sampleSaltedHash, 0, deadline);
    await registry.connect(oracle).recordAIAssessment(sampleCaseId, 25, 0, sampleExplanationHash);

    // Even if operator also acquired COMPLIANCE_ROLE
    await registry.connect(admin).grantRole(await registry.COMPLIANCE_ROLE(), operator.address);

    await expect(
      registry.connect(operator).submitApproval(sampleCaseId, 0, sampleCommentHash, false)
    ).to.be.revertedWithCustomError(registry, "OperatorCannotApprove");
  });

  it("Should prevent Auditor from approving or rejecting cases (Read-only role)", async function () {
    const block = await ethers.provider.getBlock("latest");
    const deadline = BigInt(block!.timestamp + 3600);
    await registry.connect(operator).registerCase(sampleCaseId, sampleSaltedHash, 0, deadline);
    await registry.connect(oracle).recordAIAssessment(sampleCaseId, 25, 0, sampleExplanationHash);

    await expect(
      registry.connect(auditor).submitApproval(sampleCaseId, 0, sampleCommentHash, false)
    ).to.be.revertedWithCustomError(registry, "UnauthorizedRoleClaim");

    await expect(
      registry.connect(auditor).rejectCase(sampleCaseId, sampleCommentHash)
    ).to.be.revertedWithCustomError(registry, "UnauthorizedRoleClaim");
  });

  it("Should reject direct minting calls to TrustAuditCertificate from non-Registry accounts", async function () {
    await expect(
      certificate.connect(unauthorized).mintCertificate(vault.address, sampleCaseId)
    ).to.be.revertedWithCustomError(certificate, "AccessControlUnauthorizedAccount");
  });
});
