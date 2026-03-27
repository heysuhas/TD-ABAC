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

    // Mapping from an address to an array of fileHashes that this address owns
    mapping(address => string[]) public userFiles;

    // Mapping from an address to an array of fileHashes shared with this address
    mapping(address => string[]) public sharedFiles;

    // Mapping from fileHash to mapping of address to shared status
    mapping(string => mapping(address => bool)) public fileSharedWith;

    event FileUploaded(string fileHash, address owner, uint256 expiryTimestamp);
    event FileShared(string fileHash, address owner, address sharedWith);
    
    // Upload file metadata with a duration (in seconds)
    function uploadFile(string memory fileHash, uint256 durationInSeconds) public {
        require(!fileRegistry[fileHash].exists, "File already registered");
        
        uint256 expiry = block.timestamp + durationInSeconds;
        
        fileRegistry[fileHash] = FileMetadata({
            owner: msg.sender,
            expiryTimestamp: expiry,
            exists: true
        });
        
        userFiles[msg.sender].push(fileHash);

        emit FileUploaded(fileHash, msg.sender, expiry);
    }
    
    // Share file with another user
    function shareFile(string memory fileHash, address userAddress) public {
        require(fileRegistry[fileHash].exists, "File not found");
        require(fileRegistry[fileHash].owner == msg.sender, "Only owner can share");
        require(!fileSharedWith[fileHash][userAddress], "Already shared with this user");

        fileSharedWith[fileHash][userAddress] = true;
        sharedFiles[userAddress].push(fileHash);

        emit FileShared(fileHash, msg.sender, userAddress);
    }

    // Get all files owned by a user
    function getUserFiles(address userAddress) public view returns (string[] memory) {
        return userFiles[userAddress];
    }

    // Get all files shared with a user
    function getSharedFiles(address userAddress) public view returns (string[] memory) {
        return sharedFiles[userAddress];
    }

    // Check if access is allowed (Passive Revocation)
    // Returns true if current time < expiry
    function checkAccess(string memory fileHash, address userAddress) public view returns (bool) {
        if (!fileRegistry[fileHash].exists) {
            return false;
        }

        if (block.timestamp >= fileRegistry[fileHash].expiryTimestamp) {
            return false;
        }

        // Owner always has access
        if (fileRegistry[fileHash].owner == userAddress) {
            return true;
        }

        // Check if shared with user
        return fileSharedWith[fileHash][userAddress];
    }

    // Helper to get expiry, for frontend display
    function getExpiry(string memory fileHash) public view returns (uint256) {
        require(fileRegistry[fileHash].exists, "File not found");
        return fileRegistry[fileHash].expiryTimestamp;
    }
}
