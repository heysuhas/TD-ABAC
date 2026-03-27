# Top User Stories for TD-ABAC Vault Project

Based on the architecture and implementation of the **Time-Decaying Attribute-Based Access Control (TD-ABAC)** system we built, here is a chronological list of the most critical user stories, ordered from the foundation of the project up to advanced features:

## Phase 1: Authentication & Client Foundation
1. **As a user**, I want to securely log in using Supabase (email/password or OAuth) so that my identity is universally verified.
   - *Backend Architecture Impact:* The frontend independently handles OAuth and derives a deterministic Web3 Wallet (`ethers.Wallet`) from the user's logged-in email, bridging Web2 Auth to Web3 identity seamlessly without requiring the user to install MetaMask.

## Phase 2: Secure Storage & Encryption Setup
2. **As a user**, I want to upload a sensitive file to the platform and have it automatically encrypted before it ever hits permanent storage.
   - *Backend Architecture Impact:* The Spring Boot backend uses `EncryptionService.java` to dynamically generate a unique AES-256 Secret Key per file, encrypting the byte stream in memory.
3. **As the system**, I need to store the encrypted file contents reliably on a decentralized or mocked IPFS node to ensure high availability and censorship resistance.
   - *Backend Architecture Impact:* The `IPFSService.java` takes the encrypted byte payload and yields a robust IPFS CID (`fileHash`), while [FileController.java](file:///c:/Users/heysu/Desktop/minor_project/backend/src/main/java/com/tdabac/controller/FileController.java) manages temporary keystore mappings for recent files.

## Phase 3: Core Time-Decaying Blockchain Logic (The "TD" in TD-ABAC)
4. **As a user**, I want to specify an exact "duration" (e.g., 2 hours, 5 days) for how long my file will survive, after which access is permanently revoked.
   - *Backend Architecture Impact:* The Spring Boot [BlockchainService.java](file:///c:/Users/heysu/Desktop/minor_project/backend/src/main/java/com/tdabac/service/BlockchainService.java) dynamically executes the Hardhat Node ([interact.js](file:///c:/Users/heysu/Desktop/minor_project/smart-contracts/scripts/interact.js)) to record the `fileHash`, `ownerAddress`, and calculate the precise `expiryTimestamp` securely on the Ethereum JSON-RPC local network ([TDABAC.sol](file:///c:/Users/heysu/Desktop/minor_project/smart-contracts/contracts/TDABAC.sol)).
5. **As a user**, I want to be able to decrypt and download my uploaded file from the blockchain within its active duration window.
   - *Backend Architecture Impact:* The Spring Boot `GET /api/access/{fileHash}` endpoint first checks `tdabac.checkAccess()` on the [BlockchainService](file:///c:/Users/heysu/Desktop/minor_project/backend/src/main/java/com/tdabac/service/BlockchainService.java#13-153). If verified, it pulls the payload from `IPFSService`, decrypts it using the cached unique key via `EncryptionService`, and returns the raw file.

## Phase 4: Granular Collaboration & Event Notifications
6. **As a user**, I want to securely share a specific file with a collaborator's email address and assign an independent self-destruct timer for their access.
   - *Backend Architecture Impact:* The frontend deterministically maps the recipient's email to a Web3 Wallet Address. [BlockchainService](file:///c:/Users/heysu/Desktop/minor_project/backend/src/main/java/com/tdabac/service/BlockchainService.java#13-153) registers this targeted permission mapping in the `TDABAC` smart contract using the `shareExpiry` state. 
7. **As a collaborator**, I want to receive an email notification indicating that a Secure Vault file has been shared with me, including a direct link to the payload.
   - *Backend Architecture Impact:* Successful blockchain transactions trigger the [EmailService.java](file:///c:/Users/heysu/Desktop/minor_project/backend/src/main/java/com/tdabac/service/EmailService.java) utilizing `JavaMailSender` over SMTP (e.g., Gmail) to dispatch a formal invitation containing the file hash and access instructions.

## Phase 5: Auditability & Extensibility
8. **As an auditor or system admin**, I want to be able to see immutable on-chain logs of exactly when a file was uploaded or shared, and to whom.
   - *Backend Architecture Impact:* The [TDABAC.sol](file:///c:/Users/heysu/Desktop/minor_project/smart-contracts/contracts/TDABAC.sol) emits `FileUploaded` and `FileShared` Solidity Events natively stored in the block metadata, making passive surveillance or compliance checks frictionless.
9. **As a developer**, I want to benchmark the cryptographic and IPFS upload delays so that I can prove the viability of this prototype to reviewers. 
   - *Backend Architecture Impact:* The Java backend and Python (`analyze_benchmarks.py`) integration tests track end-to-end execution latency for upload, encryption, and contract deployment metrics.
