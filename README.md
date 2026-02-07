# Gas-Efficient Time-Decaying Attribute-Based Access Control (TD-ABAC) for EHR

## 1. Core Concept
A "Self-Destructing" Digital Vault for Electronic Health Records.
- **Problem:** Patients lose control of data once shared. Base paper solutions are slow (CP-ABE) and expensive (Active Revocation).
- **Solution:** Hybrid architecture. Off-chain AES encryption (fast) + On-chain Time-Locks (trust).
- **Key Novelty:** **Passive Revocation**. Access rights expire automatically based on block timestamp. No gas cost to revoke.

## 2. Technology Stack
- **Frontend:** React + Tailwind CSS (Vite)
- **Backend:** Java Spring Boot
- **Blockchain:** Solidity + Hardhat
- **Storage:** IPFS
- **Middleware:** Web3j (Java <-> Ethereum)

## 3. Architecture Overview
1.  **Client:** Uploads file & duration.
2.  **Backend:**
    - Generates AES Key.
    - Encrypts File.
    - Uploads Encrypted Blob to IPFS.
    - Calls Smart Contract `uploadFile(fileHash, duration)`.
3.  **Smart Contract:** Stores metadata & expiry timestamp.
4.  **Access:**
    - Backend checks `checkAccess(fileHash)`.
    - If `true`, Backend decrypts and serves file.
    - If `false`, Access Denied.

## 4. Evaluation Metrics
We must verify:
1.  **Encryption Speed:** AES < 5ms (vs 40ms).
2.  **Scalability:** Constant time O(1) for any duration (vs Linear).
3.  **Revocation Cost:** 0 Gas (vs Active Tx).

## 4.1 Research Novelty (What is new)
Focus on what is *technically new* versus the base paper and why it matters:
1. **Passive revocation via on-chain time-locks:** Access expiration is enforced by a smart contract time check; no re-encryption, no key updates, and no revocation gas costs.
2. **Hybrid cryptographic architecture:** Heavy cryptography is off-chain (AES-256), while policy enforcement is on-chain, keeping trust without sacrificing throughput.
3. **Constant-time access checks:** Access checks are O(1) (single timestamp comparison), unlike hash-chain approaches with linear cost growth.
4. **Operational simplicity:** No attribute re-issuance or mass ciphertext updates; keys are released only within valid windows.
5. **Threat-model clarity:** Explicitly acknowledges client-side capture limits and lists mitigations (watermarks, short-lived tokens, audit logs) instead of claiming absolute prevention.

## 5. Current Status
- [x] Project Request Analysis
- [x] Implementation Plan Created
- [x] Project Structure Setup
- [x] Smart Contract Implementation (Testing Verified)
- [x] Backend Implementation (Services Connected)
- [x] Frontend Implementation

## 6. How It Works (Architecture & Data Flow)

This project uses a **Hybrid Architecture** to combine the speed of off-chain storage with the security of on-chain access control.

### Step 1: Upload (Frontend -> Backend -> Blockchain)
1.  **User** selects a file (e.g., `report.pdf`) and sets a timer (e.g., "10 minutes") in the React Frontend.
2.  **Frontend** sends the file to the **Spring Boot Backend**.
3.  **Backend** generates a random **AES-256 Key** and encrypts the file.
    *   *Note:* The original file is never stored unencrypted.
4.  **Backend** uploads the *Encrypted Data* to IPFS (Simulated) and stores the *Key* temporarily in memory.
5.  **Backend** calls the **Smart Contract** (`TDABAC.sol`) to register the file:
    *   Mapping: `FileHash -> {Owner, ExpiryTimestamp}`.
    *   The `ExpiryTimestamp` is calculated as `block.timestamp + duration`.

### Step 2: Access (Frontend -> Backend -> Smart Contract -> Decrypt)
1.  **User** requests access using the File Hash.
2.  **Backend** asks the **Smart Contract**: "Is the current block time < ExpiryTimestamp?"
3.  **Smart Contract** returns `true` or `false`.
    *   *Crucial:* This check is **O(1)** (Constant Time) and costs **0 Gas** (View Function).
4.  **If Allowed:**
    *   Backend retrieves the Encrypted File and the Key.
    *   Backend **Decrypts** the file in memory.
    *   Backend sends the **Original File** back to the Frontend for download.
5.  **If Denied (Expired):**
    *   Backend rejects the request.
    *   The file remains encrypted and logically "destroyed" because the permission is gone forever.

---

## 7. Novelty & Key Innovations

This project improves upon traditional **Attribute-Based Encryption (CP-ABE)** schemes in three key ways:

1.  **Passive Revocation (Zero Gas Cost):**
    *   *Traditional:* Revoking access requires a "Key Update" transaction, costing gas for every user.
    *   *Ours:* Access expires automatically via `block.timestamp`. Revocation is free and passive.

2.  **Encryption Speed (AES-256 vs CP-ABE):**
    *   *Traditional:* CP-ABE involves complex mathematical pairings, taking **200ms - 3s** for 1MB.
    *   *Ours:* AES-256 GCM is hardware-optimized, taking **~22ms** for 1MB (verified benchmark).

3.  **Scalability (Constant Time Access):**
    *   Smart Contract access checks are independent of the number of users or attributes. Checking access takes the same amount of computation/time regardless of system load (O(1)).

---

## 8. How to Run

### Prerequisites
-   Node.js & npm
-   Java 17+ & Maven
-   MetaMask (Optional, for browser interaction, though we use Hardhat local node)

### Step 0: Clone the Repository
```bash
git clone https://github.com/heysuhas/TD-ABAC.git
cd TD-ABAC
```

### Step 1: Start Blockchain Node
```bash
cd smart-contracts
npm install
npx hardhat node
```
*Keep this terminal running.*

### Step 2: Deploy Contract
Open a new terminal:
```bash
cd smart-contracts
# (Dependencies already installed in Step 1)
npx hardhat run scripts/deploy.js --network localhost
```
> **Note:** This generates a `contract-address.txt` file. This file tells the backend where the contract lives. **Do not push this file to GitHub**, as every deployment generates a new address.

### Step 3: Start Backend
Open a new terminal:
```bash
cd backend
mvn clean install
mvn spring-boot:run
```
*Wait for "Started Application" log.*

### Step 4: Start Frontend
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Access the UI at `http://localhost:5173`.*

## 7. Verification & Benchmarks
### Encryption Speed (Target: <5ms for small chunks; 1MB is hardware-dependent)
Run the Java Benchmark:
```bash
cd backend
mvn test -Dtest=EncryptionBenchmark
```
Notes:
* The benchmark includes warmup iterations and reports median/average for both encryption and decryption.
* Report CPU model, JVM version, and OS for reproducibility.
* Use the median value for paper plots and the average for sanity checks.

### Scalability (Target: Constant Time)
Run the Smart Contract Test:
```bash
cd smart-contracts
npx hardhat test
```

### Revocation Cost (Target: 0 Gas)
- Passive revocation means NO transaction is needed to revoke access.
- Cost = **0 Gas**. (Compared to Base Paper's key update transaction).


### How's it ABAC?
In traditional ABAC, policies check static attributes like 'Role'. In our Time-Decaying ABAC, we focus on Dynamic Environment Attributes.

We defined a policy where the Environment Attribute (Current Blockchain Timestamp) must satisfy a condition against the Resource Attribute (Expiry Timestamp).

Unlike RBAC where a 'Doctor' has access forever until manually removed, our TD-ABAC model automatically revokes permissions when the Time Attribute changes. This is a specific, optimized subset of ABAC focused on temporal constraints


### How's the TD-ABAC different from CP-ABE?

CP-ABE (Ciphertext-Policy Attribute-Based Encryption) is a cryptographic scheme where the **ciphertext** is encrypted with an access policy based on attributes, and the **user's private key** is associated with a set of attributes. For a user to decrypt the ciphertext, their attributes must satisfy the policy embedded in the ciphertext.

Here's how our TD-ABAC differs from CP-ABE:

1. **Attribute Types:**
   - **CP-ABE:** Focuses on **Static Attributes** like 'Role', 'Department', 'Nationality'. These attributes are typically assigned to users and remain constant over time.
   - **TD-ABAC:** Focuses on **Dynamic Environment Attributes**, specifically **Time**. The key attribute is the blockchain timestamp, which changes with every block.

2. **Policy Enforcement:**
   - **CP-ABE:** The policy is embedded in the **ciphertext** itself. Decryption is a cryptographic operation that succeeds only if the user's attributes satisfy the policy.
   - **TD-ABAC:** The policy is enforced by a **Smart Contract** on the blockchain. The contract checks the current time against the expiry time and returns a boolean value indicating whether access is allowed.

3. **Revocation Mechanism:**
   - **CP-ABE:** Revocation is complex and expensive. It typically requires **re-encrypting** all ciphertexts that match the revoked attribute or using advanced techniques like **key updates** or **proxy re-encryption**, which involve additional cryptographic operations and gas costs.
   - **TD-ABAC:** Revocation is **passive** and **automatic**. When the expiry time is reached, the smart contract automatically denies access. No re-encryption or key updates are needed, resulting in zero gas cost for revocation.

4. **Performance:**
   - **CP-ABE:** Encryption and decryption operations involve complex mathematical operations (e.g., bilinear pairings), which can be computationally expensive, especially for large files or complex policies.
   - **TD-ABAC:** Encryption is done using **AES-256**, which is very fast. Decryption is also fast as it only involves decrypting the ciphertext with the AES key. The only on-chain operation is a simple **view function call** to check the time, which is extremely efficient.

5. **Scalability:**
   - **CP-ABE:** Performance can degrade as the number of attributes or the complexity of the policies increases.
   - **TD-ABAC:** The smart contract access check is **O(1)** (constant time), meaning it takes the same amount of time regardless of the number of files or users. This makes it highly scalable.

In summary, while both CP-ABE and TD-ABAC are attribute-based access control schemes, TD-ABAC is a specialized, optimized version that focuses on **temporal attributes** and uses a **blockchain-based policy enforcement mechanism** to achieve efficient, automatic, and zero-cost revocation.


### How's the access check done in O(1)?
**Math:** Your Smart Contract performs exactly one primitive comparison:
`Is Current_Time < Expiry_Time?`

**Result:** This is just one CPU instruction. Whether you have 1 user or 1 billion users, checking this one specific condition takes the exact same constant amount of time. This is O(1).
