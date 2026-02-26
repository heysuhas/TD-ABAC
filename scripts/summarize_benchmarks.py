#!/usr/bin/env python3
import csv
import statistics
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUTS = [
    ROOT / "backend" / "benchmark-results" / "encryption_metrics.csv",
    ROOT / "smart-contracts" / "benchmark-results" / "chain_metrics.csv",
]


def as_float(value):
    if value in ("", "NA", None):
        return None
    return float(value)


def as_int(value):
    if value in ("", "NA", None):
        return None
    return int(value)


def summarize(path):
    rows = []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["latency_ms"] = as_float(row.get("latency_ms"))
            row["gas_used"] = as_int(row.get("gas_used"))
            row["bytes_sent"] = as_int(row.get("bytes_sent")) or 0
            row["bytes_recv"] = as_int(row.get("bytes_recv")) or 0
            rows.append(row)

    grouped = defaultdict(list)
    for r in rows:
        grouped[(r["stage"], r["input_size"], r["duration_bucket"])].append(r)

    print(f"\n# Summary for {path.relative_to(ROOT)}")
    print("stage,input_size,duration_bucket,runs,latency_avg_ms,latency_p95_ms,gas_avg,total_bytes_sent,total_bytes_recv")

    for key in sorted(grouped.keys()):
        samples = grouped[key]
        latencies = [s["latency_ms"] for s in samples if s["latency_ms"] is not None]
        gas_values = [s["gas_used"] for s in samples if s["gas_used"] is not None]

        latency_avg = statistics.mean(latencies) if latencies else None
        latency_p95 = None
        if latencies:
            ordered = sorted(latencies)
            idx = max(0, min(len(ordered) - 1, round(0.95 * (len(ordered) - 1))))
            latency_p95 = ordered[idx]

        gas_avg = statistics.mean(gas_values) if gas_values else None
        total_bytes_sent = sum(s["bytes_sent"] for s in samples)
        total_bytes_recv = sum(s["bytes_recv"] for s in samples)

        print(
            f"{key[0]},{key[1]},{key[2]},{len(samples)},"
            f"{'' if latency_avg is None else round(latency_avg, 6)},"
            f"{'' if latency_p95 is None else round(latency_p95, 6)},"
            f"{'' if gas_avg is None else round(gas_avg, 2)},"
            f"{total_bytes_sent},{total_bytes_recv}"
        )


def main():
    found = False
    for path in INPUTS:
        if path.exists():
            found = True
            summarize(path)
        else:
            print(f"Missing input CSV: {path.relative_to(ROOT)}")

    if not found:
        raise SystemExit("No benchmark CSV files found. Run benchmark generators first.")


if __name__ == "__main__":
    main()
