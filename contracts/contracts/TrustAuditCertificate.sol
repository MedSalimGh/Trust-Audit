// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IERC5192.sol";

/// @title TrustAuditCertificate — Non-Transferable Soulbound Audit Certificate
/// @notice Implements ERC-721 and ERC-5192 for compliance attestations
contract TrustAuditCertificate is ERC721, AccessControl, IERC5192 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId;
    string private _baseTokenURI;

    mapping(bytes32 => uint256) private _caseTokens;
    mapping(uint256 => bytes32) private _tokenCases;
    mapping(uint256 => uint256) private _tokenTimestamps;

    error ErrSoulboundTokenNonTransferable();
    error ErrOnlyMinterCanMint();
    error ErrTokenDoesNotExist();
    error ErrCaseAlreadyCertified();

    event AuditCertificateMinted(
        bytes32 indexed caseId,
        uint256 indexed tokenId,
        address indexed recipient
    );

    constructor(
        address admin,
        string memory baseURI_
    ) ERC721("TrustAudit Certificate", "TACERT") {
        require(admin != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _baseTokenURI = baseURI_;
        _nextTokenId = 1;
    }

    /// @notice Mints a non-transferable certificate for an approved case
    /// @dev Only the TrustAuditRegistry contract can call this function
    /// @param recipient Institutional audit/compliance vault address
    /// @param caseId Unique identifier of the approved audit case
    /// @return tokenId The identifier of the newly minted certificate
    function mintCertificate(
        address recipient,
        bytes32 caseId
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        if (_caseTokens[caseId] != 0) {
            revert ErrCaseAlreadyCertified();
        }
        require(recipient != address(0), "Invalid recipient");

        uint256 tokenId = _nextTokenId++;
        _safeMint(recipient, tokenId);

        _caseTokens[caseId] = tokenId;
        _tokenCases[tokenId] = caseId;
        _tokenTimestamps[tokenId] = block.timestamp;

        emit Locked(tokenId);
        emit AuditCertificateMinted(caseId, tokenId, recipient);

        return tokenId;
    }

    /// @notice Returns the locking status of a certificate (ERC-5192)
    /// @param tokenId The identifier of the certificate
    /// @return bool True for all minted certificates
    function locked(uint256 tokenId) external view override returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    /// @notice Retrieves the case ID referenced by a certificate
    function getCaseByTokenId(uint256 tokenId) external view returns (bytes32) {
        _requireOwned(tokenId);
        return _tokenCases[tokenId];
    }

    /// @notice Retrieves the certificate token ID associated with a case
    function getTokenIdByCase(bytes32 caseId) external view returns (uint256) {
        return _caseTokens[caseId];
    }

    /// @notice Retrieves the block timestamp when the certificate was issued
    function getMintTimestamp(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return _tokenTimestamps[tokenId];
    }

    /// @dev Hook enforcing non-transferability (ERC-5192 soulbound property)
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert ErrSoulboundTokenNonTransferable();
        }
        return super._update(to, tokenId, auth);
    }

    /// @dev Explicitly revert on approval attempts
    function approve(address, uint256) public virtual override {
        revert ErrSoulboundTokenNonTransferable();
    }

    /// @dev Explicitly revert on operator delegation attempts
    function setApprovalForAll(address, bool) public virtual override {
        revert ErrSoulboundTokenNonTransferable();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, AccessControl) returns (bool) {
        return interfaceId == type(IERC5192).interfaceId || super.supportsInterface(interfaceId);
    }

    function setBaseURI(string memory baseURI_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = baseURI_;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
}
