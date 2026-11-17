import { expect } from "chai";
import { ethers } from "hardhat";
import { TrustAuditCertificate } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TrustAudit — TrustAuditCertificate & Soulbound Behavior (ERC-5192)", function () {
  let certificate: TrustAuditCertificate;
  let admin: SignerWithAddress;
  let minter: SignerWithAddress;
  let recipient: SignerWithAddress;
  let transferee: SignerWithAddress;

  const sampleCaseId = ethers.keccak256(ethers.toUtf8Bytes("CASE-CERT-001"));

  beforeEach(async function () {
    [admin, minter, recipient, transferee] = await ethers.getSigners();

    const CertFactory = await ethers.getContractFactory("TrustAuditCertificate");
    certificate = await CertFactory.deploy(admin.address, "https://api.trustaudit.bank/metadata/");
    await certificate.waitForDeployment();

    // Grant MINTER_ROLE to minter
    await certificate.connect(admin).grantRole(await certificate.MINTER_ROLE(), minter.address);
  });

  it("Should mint certificate to recipient and mark it permanently locked (ERC-5192)", async function () {
    const tx = await certificate.connect(minter).mintCertificate(recipient.address, sampleCaseId);
    await expect(tx).to.emit(certificate, "AuditCertificateMinted").withArgs(sampleCaseId, 1, recipient.address);
    await expect(tx).to.emit(certificate, "Locked").withArgs(1);

    expect(await certificate.ownerOf(1)).to.equal(recipient.address);
    expect(await certificate.locked(1)).to.be.true;
    expect(await certificate.getCaseByTokenId(1)).to.equal(sampleCaseId);
    expect(await certificate.getTokenIdByCase(sampleCaseId)).to.equal(1);
  });

  it("Should prevent duplicate minting for the same caseId", async function () {
    await certificate.connect(minter).mintCertificate(recipient.address, sampleCaseId);

    await expect(
      certificate.connect(minter).mintCertificate(recipient.address, sampleCaseId)
    ).to.be.revertedWithCustomError(certificate, "ErrCaseAlreadyCertified");
  });

  it("Should revert on any transfer attempt (Soulbound inalienability)", async function () {
    await certificate.connect(minter).mintCertificate(recipient.address, sampleCaseId);

    // Attempt transferFrom
    await expect(
      certificate.connect(recipient).transferFrom(recipient.address, transferee.address, 1)
    ).to.be.revertedWithCustomError(certificate, "ErrSoulboundTokenNonTransferable");

    // Attempt safeTransferFrom
    await expect(
      certificate.connect(recipient)["safeTransferFrom(address,address,uint256)"](recipient.address, transferee.address, 1)
    ).to.be.revertedWithCustomError(certificate, "ErrSoulboundTokenNonTransferable");
  });

  it("Should revert on any approval or delegation attempt", async function () {
    await certificate.connect(minter).mintCertificate(recipient.address, sampleCaseId);

    await expect(
      certificate.connect(recipient).approve(transferee.address, 1)
    ).to.be.revertedWithCustomError(certificate, "ErrSoulboundTokenNonTransferable");

    await expect(
      certificate.connect(recipient).setApprovalForAll(transferee.address, true)
    ).to.be.revertedWithCustomError(certificate, "ErrSoulboundTokenNonTransferable");
  });

  it("Should support ERC-5192 and ERC-721 interfaces", async function () {
    // ERC-5192 interfaceId = 0xb45a3c0e
    const ERC5192_ID = "0xb45a3c0e";
    expect(await certificate.supportsInterface(ERC5192_ID)).to.be.true;

    // ERC-721 interfaceId = 0x80ac58cd
    const ERC721_ID = "0x80ac58cd";
    expect(await certificate.supportsInterface(ERC721_ID)).to.be.true;
  });
});
