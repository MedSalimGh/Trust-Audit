// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ERC-5192 Minimal Soulbound Tokens Standard
/// @notice Interface for non-transferable audit certificates
interface IERC5192 {
    /// @notice Emitted when the locking status of an NFT is changed to locked.
    /// @param tokenId The identifier of the NFT that is locked.
    event Locked(uint256 tokenId);

    /// @notice Emitted when the locking status of an NFT is changed to unlocked.
    /// @param tokenId The identifier of the NFT that is unlocked.
    event Unlocked(uint256 tokenId);

    /// @notice Returns the locking status of an NFT.
    /// @dev Returns true for all valid audit certificates. Reverts if tokenId does not exist.
    /// @param tokenId The identifier for an NFT.
    /// @return bool The locking status.
    function locked(uint256 tokenId) external view returns (bool);
}
