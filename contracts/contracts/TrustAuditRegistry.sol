// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./TrustAuditCertificate.sol";

/// @title TrustAuditRegistry — Decentralized Governance & Execution Gate for Banking Audits
/// @notice Manages case lifecycles, role-based authorization, multi-signature quorums, and audit events.
contract TrustAuditRegistry is AccessControl, ReentrancyGuard, Pausable {
    // ------------------------------------------------------------------------
    // Roles Definition
    // ------------------------------------------------------------------------
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant AI_ORACLE_ROLE = keccak256("AI_ORACLE_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");
    bytes32 public constant DIRECTOR_ROLE = keccak256("DIRECTOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // ------------------------------------------------------------------------
    // Types & Enums
    // ------------------------------------------------------------------------
    enum CaseStatus {
        NONE,               // 0: Uninitialized
        REGISTERED,         // 1: Case registered by Operator, awaiting AI assessment
        PENDING_APPROVAL,   // 2: AI assessment recorded, awaiting human signatures
        APPROVED,           // 3: Quorum satisfied, certified and cleared for execution
        REJECTED,           // 4: Formally rejected by authorized reviewer
        ESCALATED           // 5: Exceeded deadline without final resolution
    }

    enum RiskLevel {
        LOW,                // 0: Risk score 0–29
        MEDIUM,             // 1: Risk score 30–69
        HIGH                // 2: Risk score 70–100 (triggers Risk Manager review overlay)
    }

    enum ApprovalRole {
        COMPLIANCE,         // 0: Compliance Officer
        RISK_MANAGER,       // 1: Risk Manager
        DIRECTOR            // 2: Executive Director
    }

    enum ValueTier {
        TIER_1_BELOW_5K,    // 0: < 5,000 DT (1 signature: Compliance)
        TIER_2_5K_TO_50K,   // 1: 5,000–50,000 DT (1 signature: Compliance)
        TIER_3_ABOVE_50K    // 2: > 50,000 DT (3 signatures: Compliance + Risk + Director)
    }

    struct ApprovalRecord {
        address approver;
        ApprovalRole role;
        bytes32 commentHash;
        bool isOverride;
        uint64 timestamp;
    }

    struct AuditCase {
        bytes32 caseId;
        bytes32 saltedInputHash;
        bytes32 explanationHash;
        uint8 aiRiskScore;
        RiskLevel riskLevel;
        CaseStatus status;
        ValueTier valueTier;
        uint64 createdAt;
        uint64 deadline;
        address operator;
        uint256 certificateId;
        uint8 requiredApprovals;
        uint8 approvalCount;
        bool requiresRiskManagerOverlay;
    }

    // ------------------------------------------------------------------------
    // State Storage
    // ------------------------------------------------------------------------
    mapping(bytes32 => AuditCase) private _cases;
    mapping(bytes32 => ApprovalRecord[]) private _caseApprovals;
    mapping(bytes32 => mapping(address => bool)) private _hasApproved;
    mapping(bytes32 => mapping(ApprovalRole => bool)) private _hasRoleApproved;

    address public certificateContract;
    address public institutionalVault;

    // ------------------------------------------------------------------------
    // Custom Errors
    // ------------------------------------------------------------------------
    error CaseAlreadyExists(bytes32 caseId);
    error CaseDoesNotExist(bytes32 caseId);
    error InvalidCaseStatus(bytes32 caseId, CaseStatus current, CaseStatus expected);
    error InvalidHash();
    error InvalidDeadline();
    error ScoreOutOfBounds(uint8 score);
    error OperatorCannotApprove();
    error AlreadyApproved(bytes32 caseId, address approver);
    error RoleAlreadySubmitted(bytes32 caseId, ApprovalRole role);
    error EmptyJustification();
    error DeadlineExpired(bytes32 caseId, uint64 deadline, uint256 currentTimestamp);
    error DeadlineNotExceeded(bytes32 caseId, uint64 deadline, uint256 currentTimestamp);
    error UnauthorizedRoleClaim(ApprovalRole role, address caller);
    error RoleNotPermittedForTier(ApprovalRole role, ValueTier tier);
    error ZeroAddress();

    // ------------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------------
    event CaseRegistered(
        bytes32 indexed caseId,
        address indexed operator,
        bytes32 saltedInputHash,
        ValueTier valueTier,
        uint64 deadline
    );

    event AIAssessmentRecorded(
        bytes32 indexed caseId,
        uint8 riskScore,
        RiskLevel riskLevel,
        bytes32 explanationHash
    );

    event ApprovalSubmitted(
        bytes32 indexed caseId,
        address indexed approver,
        ApprovalRole role,
        bytes32 commentHash,
        bool isOverride
    );

    event CaseRejected(
        bytes32 indexed caseId,
        address indexed rejector,
        bytes32 commentHash
    );

    event CaseApproved(
        bytes32 indexed caseId,
        uint256 certificateId
    );

    event CaseEscalated(
        bytes32 indexed caseId,
        uint64 timestamp
    );

    event CertificateContractUpdated(address indexed newAddress);
    event InstitutionalVaultUpdated(address indexed newVault);

    // ------------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------------
    constructor(
        address admin,
        address vault
    ) {
        if (admin == address(0) || vault == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        institutionalVault = vault;
    }

    // ------------------------------------------------------------------------
    // Administrative Configuration
    // ------------------------------------------------------------------------
    function setCertificateContract(address certAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (certAddress == address(0)) revert ZeroAddress();
        certificateContract = certAddress;
        emit CertificateContractUpdated(certAddress);
    }

    function setInstitutionalVault(address newVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newVault == address(0)) revert ZeroAddress();
        institutionalVault = newVault;
        emit InstitutionalVaultUpdated(newVault);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ------------------------------------------------------------------------
    // Lifecycle Functions
    // ------------------------------------------------------------------------

    /// @notice Registers a new transaction case with a salted commitment
    /// @param caseId Unique identifier of the case
    /// @param saltedInputHash SHA-256 commitment of canonical JSON and secret salt
    /// @param tier Value tier deriving base quorum requirements
    /// @param deadline Unix timestamp after which case may be escalated
    function registerCase(
        bytes32 caseId,
        bytes32 saltedInputHash,
        ValueTier tier,
        uint64 deadline
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        if (_cases[caseId].status != CaseStatus.NONE) {
            revert CaseAlreadyExists(caseId);
        }
        if (saltedInputHash == bytes32(0)) {
            revert InvalidHash();
        }
        if (deadline <= block.timestamp) {
            revert InvalidDeadline();
        }

        uint8 requiredSignatures;
        if (tier == ValueTier.TIER_3_ABOVE_50K) {
            requiredSignatures = 3;
        } else {
            requiredSignatures = 1;
        }

        _cases[caseId] = AuditCase({
            caseId: caseId,
            saltedInputHash: saltedInputHash,
            explanationHash: bytes32(0),
            aiRiskScore: 0,
            riskLevel: RiskLevel.LOW,
            status: CaseStatus.REGISTERED,
            valueTier: tier,
            createdAt: uint64(block.timestamp),
            deadline: deadline,
            operator: msg.sender,
            certificateId: 0,
            requiredApprovals: requiredSignatures,
            approvalCount: 0,
            requiresRiskManagerOverlay: false
        });

        emit CaseRegistered(caseId, msg.sender, saltedInputHash, tier, deadline);
    }

    /// @notice Records consultative AI risk assessment and anchors explanation hash
    /// @param caseId Identifier of the registered case
    /// @param riskScore Calibrated score between 0 and 100
    /// @param riskLevel Categorical classification (LOW, MEDIUM, HIGH)
    /// @param explanationHash SHA-256 commitment of the top SHAP features
    function recordAIAssessment(
        bytes32 caseId,
        uint8 riskScore,
        RiskLevel riskLevel,
        bytes32 explanationHash
    ) external onlyRole(AI_ORACLE_ROLE) whenNotPaused {
        AuditCase storage c = _cases[caseId];
        if (c.status != CaseStatus.REGISTERED) {
            revert InvalidCaseStatus(caseId, c.status, CaseStatus.REGISTERED);
        }
        if (riskScore > 100) {
            revert ScoreOutOfBounds(riskScore);
        }
        if (explanationHash == bytes32(0)) {
            revert InvalidHash();
        }

        c.aiRiskScore = riskScore;
        c.riskLevel = riskLevel;
        c.explanationHash = explanationHash;
        c.status = CaseStatus.PENDING_APPROVAL;

        // Apply EU AI Act High-Risk Human-in-the-Loop Overlay:
        // If AI flags HIGH risk, mandate Risk Manager review regardless of tier
        if (riskLevel == RiskLevel.HIGH) {
            c.requiresRiskManagerOverlay = true;
            if (c.valueTier != ValueTier.TIER_3_ABOVE_50K) {
                // Elevate Tier 1 / Tier 2 quorum from 1 (Compliance) to 2 (Compliance + Risk Manager)
                c.requiredApprovals = 2;
            }
        }

        emit AIAssessmentRecorded(caseId, riskScore, riskLevel, explanationHash);
    }

    /// @notice Submits an authorized human approval
    /// @param caseId Identifier of the pending case
    /// @param role Role asserted by the caller
    /// @param commentHash SHA-256 hash of written justification text
    /// @param isOverride True if the human decision contradicts the AI recommendation
    function submitApproval(
        bytes32 caseId,
        ApprovalRole role,
        bytes32 commentHash,
        bool isOverride
    ) external nonReentrant whenNotPaused {
        AuditCase storage c = _cases[caseId];
        if (c.status != CaseStatus.PENDING_APPROVAL) {
            revert InvalidCaseStatus(caseId, c.status, CaseStatus.PENDING_APPROVAL);
        }
        if (block.timestamp > c.deadline) {
            revert DeadlineExpired(caseId, c.deadline, block.timestamp);
        }
        if (msg.sender == c.operator) {
            revert OperatorCannotApprove();
        }
        if (_hasApproved[caseId][msg.sender]) {
            revert AlreadyApproved(caseId, msg.sender);
        }
        if (_hasRoleApproved[caseId][role]) {
            revert RoleAlreadySubmitted(caseId, role);
        }
        if (commentHash == bytes32(0)) {
            revert EmptyJustification();
        }

        // Verify that caller holds the asserted role
        _verifyCallerRole(role);

        // Verify that this role is permissible under the case's tier & risk overlay
        _verifyRolePermissible(c, role);

        // Record approval
        _hasApproved[caseId][msg.sender] = true;
        _hasRoleApproved[caseId][role] = true;
        c.approvalCount++;

        _caseApprovals[caseId].push(ApprovalRecord({
            approver: msg.sender,
            role: role,
            commentHash: commentHash,
            isOverride: isOverride,
            timestamp: uint64(block.timestamp)
        }));

        emit ApprovalSubmitted(caseId, msg.sender, role, commentHash, isOverride);

        // Check if full quorum is satisfied
        if (c.approvalCount >= c.requiredApprovals) {
            // Validate specific mandatory roles
            if (c.requiresRiskManagerOverlay) {
                if (!_hasRoleApproved[caseId][ApprovalRole.RISK_MANAGER]) {
                    // Quorum count might be reached but Risk Manager has not signed yet
                    return;
                }
            }
            if (c.valueTier == ValueTier.TIER_3_ABOVE_50K) {
                if (
                    !_hasRoleApproved[caseId][ApprovalRole.COMPLIANCE] ||
                    !_hasRoleApproved[caseId][ApprovalRole.RISK_MANAGER] ||
                    !_hasRoleApproved[caseId][ApprovalRole.DIRECTOR]
                ) {
                    return;
                }
            }

            // Case is fully approved
            c.status = CaseStatus.APPROVED;

            // Mint Soulbound Audit Certificate if configured
            uint256 certId = 0;
            if (certificateContract != address(0)) {
                certId = TrustAuditCertificate(certificateContract).mintCertificate(
                    institutionalVault,
                    caseId
                );
                c.certificateId = certId;
            }

            emit CaseApproved(caseId, certId);
        }
    }

    /// @notice Formally rejects a case with written justification
    /// @param caseId Identifier of the pending case
    /// @param commentHash SHA-256 hash of written rejection grounds
    function rejectCase(
        bytes32 caseId,
        bytes32 commentHash
    ) external nonReentrant whenNotPaused {
        AuditCase storage c = _cases[caseId];
        if (c.status != CaseStatus.PENDING_APPROVAL) {
            revert InvalidCaseStatus(caseId, c.status, CaseStatus.PENDING_APPROVAL);
        }
        if (block.timestamp > c.deadline) {
            revert DeadlineExpired(caseId, c.deadline, block.timestamp);
        }
        if (commentHash == bytes32(0)) {
            revert EmptyJustification();
        }

        // Caller must be an authorized reviewer
        bool isAuthorized = hasRole(COMPLIANCE_ROLE, msg.sender) ||
            hasRole(RISK_MANAGER_ROLE, msg.sender) ||
            hasRole(DIRECTOR_ROLE, msg.sender);
        if (!isAuthorized) {
            revert UnauthorizedRoleClaim(ApprovalRole.COMPLIANCE, msg.sender);
        }

        c.status = CaseStatus.REJECTED;
        emit CaseRejected(caseId, msg.sender, commentHash);
    }

    /// @notice Escalates an unresolved case after deadline expiration
    /// @dev Permissionless: anyone, a keeper, or an automated backend cron can trigger escalation
    /// @param caseId Identifier of the pending case
    function escalateCase(bytes32 caseId) external whenNotPaused {
        AuditCase storage c = _cases[caseId];
        if (c.status != CaseStatus.PENDING_APPROVAL) {
            revert InvalidCaseStatus(caseId, c.status, CaseStatus.PENDING_APPROVAL);
        }
        if (block.timestamp <= c.deadline) {
            revert DeadlineNotExceeded(caseId, c.deadline, block.timestamp);
        }

        c.status = CaseStatus.ESCALATED;
        emit CaseEscalated(caseId, uint64(block.timestamp));
    }

    // ------------------------------------------------------------------------
    // Read & Verification Views
    // ------------------------------------------------------------------------

    /// @notice Retrieves public on-chain record of an audit case
    function getCase(bytes32 caseId) external view returns (AuditCase memory) {
        if (_cases[caseId].status == CaseStatus.NONE) {
            revert CaseDoesNotExist(caseId);
        }
        return _cases[caseId];
    }

    /// @notice Retrieves approval records for a case
    function getApprovals(bytes32 caseId) external view returns (ApprovalRecord[] memory) {
        return _caseApprovals[caseId];
    }

    /// @notice Checks if an address has already voted on a case
    function hasApproved(bytes32 caseId, address account) external view returns (bool) {
        return _hasApproved[caseId][account];
    }

    /// @notice Checks if a specific role has already been submitted for a case
    function hasRoleApproved(bytes32 caseId, ApprovalRole role) external view returns (bool) {
        return _hasRoleApproved[caseId][role];
    }

    /// @notice Independent verification view comparing calculated commitment with on-chain record
    /// @param caseId Identifier of the case
    /// @param calculatedHash Recomputed SHA-256 commitment from off-chain canonical data + salt
    /// @return isValid True if mathematical integrity holds; false if data has been modified
    function verifyIntegrity(
        bytes32 caseId,
        bytes32 calculatedHash
    ) external view returns (bool isValid) {
        AuditCase storage c = _cases[caseId];
        if (c.status == CaseStatus.NONE) {
            return false;
        }
        return (c.saltedInputHash == calculatedHash);
    }

    // ------------------------------------------------------------------------
    // Internal Helper Functions
    // ------------------------------------------------------------------------
    function _verifyCallerRole(ApprovalRole role) internal view {
        if (role == ApprovalRole.COMPLIANCE) {
            if (!hasRole(COMPLIANCE_ROLE, msg.sender)) {
                revert UnauthorizedRoleClaim(role, msg.sender);
            }
        } else if (role == ApprovalRole.RISK_MANAGER) {
            if (!hasRole(RISK_MANAGER_ROLE, msg.sender)) {
                revert UnauthorizedRoleClaim(role, msg.sender);
            }
        } else if (role == ApprovalRole.DIRECTOR) {
            if (!hasRole(DIRECTOR_ROLE, msg.sender)) {
                revert UnauthorizedRoleClaim(role, msg.sender);
            }
        }
    }

    function _verifyRolePermissible(AuditCase storage c, ApprovalRole role) internal view {
        if (c.valueTier == ValueTier.TIER_3_ABOVE_50K) {
            // Tier 3 accepts COMPLIANCE, RISK_MANAGER, DIRECTOR
            return;
        }

        if (c.requiresRiskManagerOverlay) {
            // Elevated risk accepts COMPLIANCE and RISK_MANAGER
            if (role != ApprovalRole.COMPLIANCE && role != ApprovalRole.RISK_MANAGER) {
                revert RoleNotPermittedForTier(role, c.valueTier);
            }
        } else {
            // Standard Tier 1 and Tier 2 accept only COMPLIANCE
            if (role != ApprovalRole.COMPLIANCE) {
                revert RoleNotPermittedForTier(role, c.valueTier);
            }
        }
    }
}
