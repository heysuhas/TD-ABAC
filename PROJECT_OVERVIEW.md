# TD-ABAC Project Overview

## 1) Architecture

TD-ABAC uses a **hybrid 4-layer architecture** to keep cryptography fast and access control verifiable.

### A. Client / Presentation Layer
- React frontend (`frontend/`) for:
  - Uploading EHR files
  - Setting access duration
  - Requesting file access by hash

### B. Application / Middleware Layer
- Spring Boot backend (`backend/`) for:
  - AES-256-GCM key generation + encryption/decryption
  - IPFS upload/download orchestration
  - Smart-contract interaction and access decision gating

### C. Blockchain / Policy Layer
- Solidity smart contract (`smart-contracts/contracts/TDABAC.sol`) for:
  - File metadata registry (`fileHash -> owner, expiryTimestamp`)
  - On-chain time-based access predicate (`block.timestamp < expiryTimestamp`)

### D. Storage Layer
- IPFS for encrypted blob storage (CID/hash based).
- Only encrypted data is stored; plaintext is decrypted in backend memory during valid access windows.

---

## 2) Framework / Tools & Technologies

### Frontend
- React
- Vite
- CSS (project styles in `App.css`, `index.css`)

### Backend
- Java 17+
- Spring Boot
- Maven
- Java Cryptography Extension (AES/GCM)

### Blockchain
- Solidity (0.8.24)
- Hardhat
- Ethers.js (inside Hardhat scripts/tests)

### Storage & Integration
- IPFS (service abstraction in backend)
- Hardhat scripts used by backend for prototype chain interaction

### Benchmarking / Evaluation Utilities
- JUnit benchmark exporters in backend
- Hardhat chain benchmark script
- Python CSV summarization and report scripts

---

## 3) End-to-End Flow Diagram

```mermaid
flowchart LR
    U[User / Doctor / Patient] --> F[Frontend: React]
    F -->|Upload File + Duration| B[Backend: Spring Boot]
    B -->|AES-256 Encrypt| E[Encrypted Blob]
    E -->|Store| I[(IPFS)]
    B -->|uploadFile(fileHash, duration)| C[Smart Contract: TDABAC]
    C -->|Store owner + expiryTimestamp| R[(On-chain Registry)]

    U -->|Request access by fileHash| F
    F -->|Access Request| B
    B -->|checkAccess(fileHash)| C
    C -->|true/false| B

    B -->|if true: fetch encrypted blob| I
    B -->|AES-256 Decrypt in memory| P[Plaintext]
    B -->|return file| F
    F --> U

    C -. passive revocation .-> X[After expiry: access denied automatically]
```

---

## 4) Flow (Step-by-Step)

### Upload Path
1. User selects file + expiry duration in frontend.
2. Backend generates AES key and encrypts file.
3. Backend stores encrypted payload in IPFS and gets hash/CID.
4. Backend calls contract `uploadFile(fileHash, duration)`.
5. Contract stores owner and computed expiry timestamp.

### Access Path
1. User requests access using file hash.
2. Backend calls contract `checkAccess(fileHash)`.
3. If allowed, backend fetches encrypted file from IPFS and decrypts in memory.
4. Backend returns plaintext file to frontend.
5. If expired, backend denies request (passive revocation).

---

## 5) Key Design Characteristics
- **Passive revocation**: no explicit revoke transaction required.
- **Constant-time policy check**: one timestamp comparison on-chain.
- **Hybrid trust/performance split**: heavy crypto off-chain, policy truth on-chain.
- **Encrypted-at-rest**: IPFS stores ciphertext, not plaintext.
