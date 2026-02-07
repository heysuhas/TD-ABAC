

### **Project Title**

**"Gas-Efficient Time-Decaying Attribute-Based Access Control (TD-ABAC) for EHR using Hybrid Blockchain"**

---

### **1. The Core Concept (The "Elevator Pitch")**

We are developing a **"Self-Destructing" Digital Vault** for Electronic Health Records (EHR).
Currently, patients hesitate to share digital medical records because they lose control over them once sent. Our system allows a patient to share a sensitive file (like an X-ray) with a doctor for a **strict, limited time** (e.g., 24 hours). Once the time expires, the access permission "dies" automatically on the blockchain, ensuring the doctor can no longer open the file, without the patient needing to do anything.

---

### **2. Problem Statement (The "Research Gap")**

We analyzed the base paper: *“Flexible and Fine-Grained Access Control for EHR”* (Chen et al., IEEE IoT Journal, March 2024). While it proposes a secure system, we identified two critical limitations that make it impractical for real-world use:

1. 
**Active Revocation Costs:** The base paper relies on "Key Updates" to revoke access. This means the server must actively re-calculate keys and re-encrypt data to stop a doctor from seeing a file, which is computationally expensive and costs Gas.


2. 
**Slow Performance:** The base paper uses **CP-ABE** (Attribute-Based Encryption) directly on-chain. Their own results (Fig. 6) show encryption takes ~40ms due to heavy mathematical operations, which is too slow for large medical files.


3. 
**Linear Scalability Issues:** Their time-based access uses "Hash Chains" (Fig. 7), where the computational cost increases linearly as the duration gets longer.



---

### **3. Our Proposed Solution & Novelty**

We propose a **Hybrid Architecture** that moves heavy computation off-chain while keeping trust on-chain. Our specific novelty is **"Passive Revocation via Time-Locks."**

| Feature | Base Paper (IEEE 2024) | **Our Proposed System (Novelty)** |
| --- | --- | --- |
| **Revocation Strategy** | **Active:** Requires "Key Updates" and re-encryption transactions. | **Passive:** Uses Smart Contract **Time-Locks**. Access expires automatically based on block timestamp. |
| **Revocation Cost** | **High:** Requires Gas fees to update keys. | **Zero:** No transaction needed to revoke; the rule simply expires. |
| **Encryption Method** | **CP-ABE:** Heavy math, slow (~40ms overhead). | **AES-256 (Hybrid):** Industry standard, extremely fast (<1ms overhead). |
| **Time Complexity** | **Linear ():** Cost grows with time duration (Fig. 7). | **Constant ():** Checking `Time < Expiry` takes the same effort for 1 hour or 10 years. |

---

### **4. System Architecture**

Our system uses a **4-Tier Hybrid Stack**:

1. **Presentation Layer (Client):** A React/Angular dashboard where patients upload files and set timers (e.g., "Allow Dr. Bob for 48 hours").
2. **Application Layer (Off-Chain Middleware):** Built with **Java Spring Boot**. This acts as the "Engine." It handles **AES-256 Encryption** (replacing the base paper's CP-ABE) and holds decryption keys in temporary memory only during valid access windows.
3. **Blockchain Layer (On-Chain Logic):** A **Solidity Smart Contract** that acts as the "Judge." It stores the **Access Registry** and executes the **Time-Lock Logic** (`if block.timestamp > expiry then DENY`).
4. **Storage Layer (Data):** **IPFS** (InterPlanetary File System) stores the *Encrypted* file blobs.

---

### **5. The Workflow (How it works)**

1. **Upload:**
* Patient uploads a PDF.
* **Spring Boot** generates a random key, encrypts the file (AES), and uploads the encrypted blob to **IPFS**.
* The backend records the `FileHash` and `ExpiryTimestamp` on the **Smart Contract**.


2. **Access:**
* Doctor requests the file.
* **Spring Boot** queries the **Smart Contract**.
* **Contract Logic:** Checks the Blockchain Timestamp.
* **If Valid:** Contract returns `TRUE`. Backend releases the key.
* **If Expired:** Contract returns `FALSE`. Backend denies the request. The file remains locked forever.





---

### **6. Evaluation Plan (How we prove it works)**

We will implement the system and generate the following metrics to directly compare with the base paper's graphs:

* **Metric 1: Encryption Speed (vs. Fig 6 in Base Paper):** We will prove our AES Hybrid approach is **faster** than their CP-ABE approach (~40ms vs <5ms).
* **Metric 2: Scalability (vs. Fig 7 in Base Paper):** We will prove our "Time-Lock" cost is **Constant (Flat Line)**, whereas their "Hash Chain" cost grows linearly.
* **Metric 3: Gas Cost of Revocation:** We will show that revoking a user in our system costs **0 Gas**, compared to the significant Gas cost required for their "Key Update" transactions.

---

### **7. Practical Use Case (The "Why")**

**The "Second Opinion" Scenario:** A patient needs to share MRI scans with a specialist in another city for a quick consultation. They do not want the specialist to keep the data forever. Our system allows them to share the link with a **"48-hour self-destruct"** timer, ensuring data privacy and reducing the need for redundant, expensive medical tests.

---

### **8. Security/Privacy Properties**

* **Time-Limited Access Enforcement:** Access is restricted by on-chain time-locks; once expired, the backend denies key release.
* **Confidentiality-in-Transit/At-Rest:** Files are stored encrypted (AES-256) and only decrypted in memory when access is valid.
* **Client-Side Capture Limitation (Important):** No browser-based viewer can fully prevent screen capture, downloads, or out-of-band recording once a user can view content. Mitigations include **per-session watermarking**, **short-lived view tokens**, **audit logging**, and optional **DRM-like browser controls** (where supported), but absolute prevention is not possible.
