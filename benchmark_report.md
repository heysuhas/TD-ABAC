# TD-ABAC Benchmark Report

This report is generated from benchmark CSV outputs to provide quantified values for paper comparison.

## Encryption Metrics (Backend AES)
| Stage | Size | Avg (ms) | p95 (ms) | Throughput (MB/s) |
|---|---:|---:|---:|---:|
| aes_decrypt | 10MB | 217.3527 | 241.6556 | 46.01 |
| aes_decrypt | 1MB | 21.7291 | 23.4439 | 46.02 |
| aes_decrypt | 5MB | 112.0210 | 134.2816 | 44.63 |
| aes_encrypt | 10MB | 216.7240 | 238.5819 | 46.14 |
| aes_encrypt | 1MB | 21.9390 | 23.9576 | 45.58 |
| aes_encrypt | 5MB | 110.3837 | 128.0745 | 45.30 |
- **aes_decrypt scaling slope:** 21.7085 ms/MB.
- **aes_encrypt scaling slope:** 21.6274 ms/MB.

## Chain Metrics (Hardhat)
| Stage | Duration (s) | Avg Latency (ms) | p95 Latency (ms) | Avg Gas |
|---|---:|---:|---:|---:|
| access_check_view | 60 | 0.9453 | 1.0850 | 28190.00 |
| access_check_view | 300 | 0.6197 | 0.7060 | 28202.00 |
| access_check_view | 3600 | 0.5934 | 0.8690 | 28214.00 |
| access_check_view | 86400 | 0.6096 | 0.8185 | 28226.00 |
| access_check_view | 31536000 | 0.6618 | 0.9049 | 28411.50 |
| upload_tx | 60 |  |  | 93719.00 |
| upload_tx | 300 |  |  | 93743.00 |
| upload_tx | 3600 |  |  | 93755.00 |
| upload_tx | 86400 |  |  | 93779.00 |
| upload_tx | 31536000 |  |  | 94142.00 |
- **access_check_view slope vs duration:** -0.0000000010 ms/s (near zero indicates duration-independent behavior).
- **upload_tx gas range:** 93719 - 94142 gas.
