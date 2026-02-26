# Base Paper vs TD-ABAC: Relevance to Benchmarking and Defensible Evaluation

## 1) What from `base.pdf` is directly relevant to our evaluation

The pasted sections/images are **highly relevant** and define exactly what we should compare:

1. **Communication-cost model (Table IV)**
   - The base paper reports symbolic communication overhead between actor pairs (e.g., CA↔SHI, SHI↔Blockchain, User↔DB).
   - This means our evaluation should include a **message-size accounting layer** in addition to runtime/gas.

2. **Computation-efficiency methodology**
   - Base paper reports **average time over 20 experiments**.
   - They explicitly set **hash-chain length to 1000** for storage-stage experiments.
   - They explicitly say AES/RSA are not the investigation focus in that work.

3. **Stage-wise timing (Fig. 6)**
   - Bars include setup, key generation/encapsulation, CP-ABE enc/dec, token generation/segmentation.
   - So our comparison should be **pipeline-stage aligned**, not only “one benchmark number”.

4. **Scaling behavior (Fig. 7 / hash-chain length)**
   - The base curve increases roughly linearly with chain length.
   - Our TD-ABAC claim (O(1) timestamp check) should be defended by plotting against the same x-axis concept (policy duration / chain surrogate).

5. **Token segmentation vs traditional token generation (Fig. 8)**
   - Their comparison includes token-related subprotocol cost.
   - We should acknowledge where our system has **no direct analog** and provide a fair mapping (e.g., access-check + key release path).

## 2) How this maps to our current implementation

Our implementation currently exposes measurable components that align with several base-paper dimensions:

- **On-chain access decision** is `checkAccess(fileHash)` with a constant-time timestamp comparison.
- **On-chain registration** is `uploadFile(fileHash, duration)` and provides an upload transaction gas anchor.
- **Crypto path** is backend AES-GCM encryption/decryption of file bytes.
- **Prototype architecture** is backend-mediated decrypt-and-serve when smart-contract check passes.

## 3) Defensible evaluation plan (to defend/compare against base metrics)

Use a **three-layer evaluation** so reviewers can see apples-to-apples, mapped, and TD-ABAC-specific results.

### Layer A — Strictly reproduce base-paper-style methodology

A1. **Averages over 20 runs** for every reported stage.
- Match the paper’s averaging protocol for comparability.

A2. **Hash-length-like scaling sweep up to 1000 points**.
- Even though we do not use hash chains, run an equivalent sweep over policy durations / synthetic workload index (100..1000) and record access-check latency/gas estimate.
- Expected TD-ABAC curve: near-flat.

A3. **Stage-wise timing chart**.
- Build a stage chart in the same spirit as Fig. 6, but for our pipeline:
  - Upload registration tx (on-chain write)
  - Access check call (view)
  - AES encrypt
  - AES decrypt
  - Optional key-management step (if any)

### Layer B — Mapped comparison (base stages ↔ TD-ABAC stages)

Create a mapping table in the paper/report:

- Base `cpabeEnc` ↔ TD-ABAC `AES encrypt`
- Base `cpabeDec` ↔ TD-ABAC `AES decrypt`
- Base `TokenGen/TokenSeg` ↔ TD-ABAC `access-check + key release decision`
- Base hash-chain growth ↔ TD-ABAC constant-time timestamp predicate

Then compare:
- latency (avg, median, p95),
- growth trend (slope),
- and gas where applicable.

### Layer C — Communication-cost accounting (Table-IV style)

For each interaction in TD-ABAC, record bytes transmitted:

- Client ↔ Backend: file upload payload + metadata
- Backend ↔ IPFS: encrypted blob + CID
- Backend ↔ Blockchain: tx calldata for upload; RPC payload for check
- Backend ↔ Client (download): plaintext/encrypted response path

Report two forms:
1. **Symbolic formulas** (Table-IV style), and
2. **Instantiated numbers** for representative file sizes (e.g., 1MB/5MB/10MB).

This directly answers the communication-cost angle that was missing in the previous draft.

## 4) Concrete KPI set to include in final benchmark section

1. Upload tx gas (`uploadFile`) and USD-equivalent under fixed gas price.
2. Revocation gas cost (TD-ABAC passive revoke = 0 tx gas).
3. Access-check RPC latency and optional `eth_estimateGas` for execution profile.
4. AES encrypt/decrypt latency (avg/median/p95 over 20 runs).
5. End-to-end granted latency (request → chain check → decrypt → response).
6. End-to-end denied latency (request → chain check → deny).
7. Communication bytes per interaction and total bytes per complete workflow.
8. Scaling slope:
   - base-like curve slope (linear expected in hash-chain system),
   - TD-ABAC slope (near zero expected for check predicate).

## 5) Guardrails for a fair defense of base-paper metrics

- **Do not claim direct superiority** for stages that are not semantically equivalent without explicit mapping notes.
- **Normalize environment disclosures**: CPU, RAM, JVM/Node versions, chain config, block interval, run count.
- **Use same statistic family** where possible (paper uses average over 20 runs), while additionally adding median/p95 for robustness.
- **Separate cryptographic speedup from architectural shift**:
  - part of gains come from replacing CP-ABE-heavy path with AES + on-chain predicate,
  - so claim “different design tradeoff” rather than only “faster algorithm.”

## 6) Practical next step for this repo

Implement a small benchmark harness that outputs CSV with columns:
`run_id, stage, input_size, duration_bucket, latency_ms, gas_used, bytes_sent, bytes_recv`.

From that CSV, generate:
- Fig-A: stage-wise bar chart (base-style),
- Fig-B: scaling curve to 1000 points,
- Fig-C: communication-cost table (symbolic + instantiated),
- Fig-D: E2E latency distribution.

This will let us defend our claims against the base paper using both methodological alignment and architecture-aware fairness.
