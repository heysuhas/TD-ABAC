#!/usr/bin/env python3
"""Generate comparative analysis between TD-ABAC benchmark outputs and baseline systems."""

from __future__ import annotations

import csv
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENC_FILE = ROOT / "backend" / "benchmark-results" / "encryption_metrics.csv"
CHAIN_FILE = ROOT / "smart-contracts" / "benchmark-results" / "chain_metrics.csv"
BASELINE_FILE = ROOT / "scripts" / "baseline_systems.csv"
OUT_MD = ROOT / "comparative_analysis.md"
OUT_CSV = ROOT / "benchmark_comparison.csv"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def mean(values: list[float]) -> float:
    return statistics.mean(values) if values else 0.0


def collect_td_metrics() -> dict[str, float]:
    if not ENC_FILE.exists() or not CHAIN_FILE.exists():
        missing = [str(p.relative_to(ROOT)) for p in (ENC_FILE, CHAIN_FILE) if not p.exists()]
        raise SystemExit("Missing required benchmark CSV(s): " + ", ".join(missing))

    enc_rows = read_csv(ENC_FILE)
    chain_rows = read_csv(CHAIN_FILE)

    aes_1mb_encrypt = [
        float(r["latency_ms"])
        for r in enc_rows
        if r["stage"] == "aes_encrypt" and r["input_size"] == "1MB" and r["latency_ms"] not in ("", "NA")
    ]
    aes_1mb_decrypt = [
        float(r["latency_ms"])
        for r in enc_rows
        if r["stage"] == "aes_decrypt" and r["input_size"] == "1MB" and r["latency_ms"] not in ("", "NA")
    ]

    access_checks = [
        float(r["latency_ms"])
        for r in chain_rows
        if r["stage"] == "access_check_view" and r["latency_ms"] not in ("", "NA")
    ]

    upload_gas = [
        int(r["gas_used"])
        for r in chain_rows
        if r["stage"] == "upload_tx" and r["gas_used"] not in ("", "NA")
    ]

    return {
        "td_aes_encrypt_1mb_ms": mean(aes_1mb_encrypt),
        "td_aes_decrypt_1mb_ms": mean(aes_1mb_decrypt),
        "td_access_check_ms": mean(access_checks),
        "td_upload_gas": mean(upload_gas),
    }


def speedup(baseline: float, ours: float) -> str:
    if baseline <= 0 or ours <= 0:
        return "NA"
    return f"{baseline / ours:.2f}x"


def gas_reduction(baseline: float, ours: float) -> str:
    if baseline <= 0:
        return "NA"
    delta = ((baseline - ours) / baseline) * 100.0
    return f"{delta:.2f}%"


def main() -> None:
    td = collect_td_metrics()
    if not BASELINE_FILE.exists():
        raise SystemExit(f"Missing baseline file: {BASELINE_FILE.relative_to(ROOT)}")

    baselines = read_csv(BASELINE_FILE)

    out_rows: list[dict[str, str]] = []
    for b in baselines:
        row = {
            "system": b["system"],
            "reference": b["reference"],
            "cpabe_encrypt_1mb_ms": b["encrypt_1mb_ms"],
            "cpabe_decrypt_1mb_ms": b["decrypt_1mb_ms"],
            "access_check_ms": b["access_check_ms"],
            "onchain_update_gas": b["onchain_update_gas"],
            "td_encrypt_1mb_ms": f"{td['td_aes_encrypt_1mb_ms']:.6f}",
            "td_decrypt_1mb_ms": f"{td['td_aes_decrypt_1mb_ms']:.6f}",
            "td_access_check_ms": f"{td['td_access_check_ms']:.6f}",
            "td_upload_gas": f"{td['td_upload_gas']:.2f}",
            "encrypt_speedup_vs_td": speedup(float(b["encrypt_1mb_ms"]), td["td_aes_encrypt_1mb_ms"]),
            "decrypt_speedup_vs_td": speedup(float(b["decrypt_1mb_ms"]), td["td_aes_decrypt_1mb_ms"]),
            "access_latency_speedup_vs_td": speedup(float(b["access_check_ms"]), td["td_access_check_ms"]),
            "gas_reduction_vs_td": gas_reduction(float(b["onchain_update_gas"]), td["td_upload_gas"]),
        }
        out_rows.append(row)

    csv_fields = list(out_rows[0].keys())
    with OUT_CSV.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=csv_fields)
        writer.writeheader()
        writer.writerows(out_rows)

    lines = [
        "# Comparative Analysis (TD-ABAC vs Existing Systems)",
        "",
        "This file is auto-generated from measured TD-ABAC benchmark CSV outputs and baseline literature values.",
        "",
        "## TD-ABAC measured metrics",
        "",
        f"- AES encrypt (1MB): **{td['td_aes_encrypt_1mb_ms']:.4f} ms**",
        f"- AES decrypt (1MB): **{td['td_aes_decrypt_1mb_ms']:.4f} ms**",
        f"- Access check latency: **{td['td_access_check_ms']:.4f} ms**",
        f"- Upload transaction gas: **{td['td_upload_gas']:.2f} gas**",
        "",
        "## Baseline comparison table",
        "",
        "| System | Encrypt 1MB (ms) | Decrypt 1MB (ms) | Access Check (ms) | On-chain Update Gas | Encrypt Speedup (Baseline/TD) | Access Speedup (Baseline/TD) | Gas Reduction vs Baseline |",
        "|---|---:|---:|---:|---:|---:|---:|---:|",
    ]

    for row in out_rows:
        lines.append(
            f"| {row['system']} | {row['cpabe_encrypt_1mb_ms']} | {row['cpabe_decrypt_1mb_ms']} | {row['access_check_ms']} | {row['onchain_update_gas']} | {row['encrypt_speedup_vs_td']} | {row['access_latency_speedup_vs_td']} | {row['gas_reduction_vs_td']} |"
        )

    lines.extend([
        "",
        "## Notes",
        "",
        "- Baseline values are stored in `scripts/baseline_systems.csv` and can be edited to match your cited sources.",
        "- Re-run this script after regenerating benchmark CSVs to refresh comparisons.",
        "",
        f"Raw comparison CSV: `{OUT_CSV.relative_to(ROOT)}`",
    ])

    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote comparative markdown: {OUT_MD}")
    print(f"Wrote comparative csv: {OUT_CSV}")


if __name__ == "__main__":
    main()
