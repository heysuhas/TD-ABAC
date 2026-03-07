# Comparative Analysis (TD-ABAC vs Existing Systems)

This file is auto-generated from measured TD-ABAC benchmark CSV outputs and baseline literature values.

## TD-ABAC measured metrics

- AES encrypt (1MB): **21.9390 ms**
- AES decrypt (1MB): **21.7291 ms**
- Access check latency: **0.6860 ms**
- Upload transaction gas: **93827.60 gas**

## Baseline comparison table

| System | Encrypt 1MB (ms) | Decrypt 1MB (ms) | Access Check (ms) | On-chain Update Gas | Encrypt Speedup (Baseline/TD) | Access Speedup (Baseline/TD) | Gas Reduction vs Baseline |
|---|---:|---:|---:|---:|---:|---:|---:|
| CP-ABE (literature range midpoint) | 1600 | 1700 | 15 | 210000 | 72.93x | 21.87x | 55.32% |
| A2BE-TimeLock (representative) | 480 | 530 | 6 | 145000 | 21.88x | 8.75x | 35.29% |
| RBAC + centralized DB ACL (representative) | 90 | 95 | 3.5 | 0 | 4.10x | 5.10x | NA |

## Notes

- Baseline values are stored in `scripts/baseline_systems.csv` and can be edited to match your cited sources.
- Re-run this script after regenerating benchmark CSVs to refresh comparisons.

Raw comparison CSV: `benchmark_comparison.csv`
