// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TDABAC {
    struct FileMetadata {
        address owner;
        uint256 expiryTimestamp;
        bool exists;
    }

    // Mapping from fileHash (IPFS CID) to Metadata
    mapping(string => FileMetadata) public fileRegistry;

    event FileUploaded(string fileHash, address owner, uint256 expiryTimestamp);
    
    // Upload file metadata with a duration (in seconds)
    function uploadFile(string memory fileHash, uint256 durationInSeconds) public {
        require(!fileRegistry[fileHash].exists, "File already registered");
        
        uint256 expiry = block.timestamp + durationInSeconds;
        
        fileRegistry[fileHash] = FileMetadata({
            owner: msg.sender,
            expiryTimestamp: expiry,
            exists: true
        });
        
        emit FileUploaded(fileHash, msg.sender, expiry);
    }
    
    // Check if access is allowed (Passive Revocation)
    // Returns true if current time < expiry
    function checkAccess(string memory fileHash) public view returns (bool) {
        if (!fileRegistry[fileHash].exists) {
            return false;
        }
        return block.timestamp < fileRegistry[fileHash].expiryTimestamp;
    }

    // Helper to get expiry, for frontend display
    function getExpiry(string memory fileHash) public view returns (uint256) {
        require(fileRegistry[fileHash].exists, "File not found");
        return fileRegistry[fileHash].expiryTimestamp;
    }
}
