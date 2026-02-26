#!/usr/bin/env python3
"""Generate a quantified Markdown report from benchmark CSV outputs."""
import csv
import math
import statistics
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENC_FILE = ROOT / "backend" / "benchmark-results" / "encryption_metrics.csv"
CHAIN_FILE = ROOT / "smart-contracts" / "benchmark-results" / "chain_metrics.csv"
OUT_FILE = ROOT / "benchmark_report.md"


def read_csv(path):
    rows = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            row["latency_ms"] = None if row["latency_ms"] in ("", "NA") else float(row["latency_ms"])
            row["gas_used"] = None if row["gas_used"] in ("", "NA") else int(row["gas_used"])
            row["bytes_sent"] = int(row["bytes_sent"])
            row["bytes_recv"] = int(row["bytes_recv"])
            rows.append(row)
    return rows


def mean(values):
    return statistics.mean(values) if values else None


def p95(values):
    if not values:
        return None
    ordered = sorted(values)
    idx = max(0, min(len(ordered) - 1, math.ceil(0.95 * len(ordered)) - 1))
    return ordered[idx]


def linear_slope(xs, ys):
    if len(xs) != len(ys) or len(xs) < 2:
        return None
    x_bar = statistics.mean(xs)
    y_bar = statistics.mean(ys)
    numerator = sum((x - x_bar) * (y - y_bar) for x, y in zip(xs, ys))
    denominator = sum((x - x_bar) ** 2 for x in xs)
    if denominator == 0:
        return 0.0
    return numerator / denominator


def summarize_encryption(rows):
    grouped = defaultdict(list)
    for row in rows:
        grouped[(row["stage"], row["input_size"])].append(row)

    lines = []
    lines.append("## Encryption Metrics (Backend AES)")
    lines.append("| Stage | Size | Avg (ms) | p95 (ms) | Throughput (MB/s) |")
    lines.append("|---|---:|---:|---:|---:|")

    slope_data = defaultdict(dict)
    for (stage, size), samples in sorted(grouped.items()):
        latencies = [s["latency_ms"] for s in samples if s["latency_ms"] is not None]
        avg_ms = mean(latencies)
        p95_ms = p95(latencies)
        mb = float(size.replace("MB", ""))
        throughput = (1000.0 * mb / avg_ms) if avg_ms and avg_ms > 0 else None
        lines.append(f"| {stage} | {size} | {avg_ms:.4f} | {p95_ms:.4f} | {throughput:.2f} |")
        slope_data[stage][mb] = avg_ms

    for stage, size_map in slope_data.items():
        xs = sorted(size_map.keys())
        ys = [size_map[x] for x in xs]
        slope = linear_slope(xs, ys)
        if slope is not None:
            lines.append(f"- **{stage} scaling slope:** {slope:.4f} ms/MB.")

    lines.append("")
    return "\n".join(lines)


def summarize_chain(rows):
    grouped = defaultdict(list)
    for row in rows:
        grouped[(row["stage"], row["duration_bucket"])].append(row)

    lines = []
    lines.append("## Chain Metrics (Hardhat)")
    lines.append("| Stage | Duration (s) | Avg Latency (ms) | p95 Latency (ms) | Avg Gas |")
    lines.append("|---|---:|---:|---:|---:|")

    check_durations = []
    check_latencies = []
    upload_gas = []

    for (stage, duration), samples in sorted(grouped.items(), key=lambda x: (x[0][0], int(x[0][1]))):
        latencies = [s["latency_ms"] for s in samples if s["latency_ms"] is not None]
        gases = [s["gas_used"] for s in samples if s["gas_used"] is not None]
        avg_lat = mean(latencies)
        p95_lat = p95(latencies)
        avg_gas = mean(gases)
        lines.append(
            f"| {stage} | {duration} | "
            f"{'' if avg_lat is None else f'{avg_lat:.4f}'} | "
            f"{'' if p95_lat is None else f'{p95_lat:.4f}'} | "
            f"{'' if avg_gas is None else f'{avg_gas:.2f}'} |"
        )

        if stage == "access_check_view" and avg_lat is not None:
            check_durations.append(int(duration))
            check_latencies.append(avg_lat)
        if stage == "upload_tx" and avg_gas is not None:
            upload_gas.append(avg_gas)

    slope = linear_slope(check_durations, check_latencies)
    if slope is not None:
        lines.append(f"- **access_check_view slope vs duration:** {slope:.10f} ms/s (near zero indicates duration-independent behavior).")

    if upload_gas:
        lines.append(f"- **upload_tx gas range:** {min(upload_gas):.0f} - {max(upload_gas):.0f} gas.")

    lines.append("")
    return "\n".join(lines)


def main():
    missing = [str(path.relative_to(ROOT)) for path in (ENC_FILE, CHAIN_FILE) if not path.exists()]
    if missing:
        raise SystemExit("Missing required benchmark CSV(s): " + ", ".join(missing))

    enc_rows = read_csv(ENC_FILE)
    chain_rows = read_csv(CHAIN_FILE)

    report = [
        "# TD-ABAC Benchmark Report",
        "",
        "This report is generated from benchmark CSV outputs to provide quantified values for paper comparison.",
        "",
        summarize_encryption(enc_rows),
        summarize_chain(chain_rows),
    ]

    OUT_FILE.write_text("\n".join(report), encoding="utf-8")
    print(f"Wrote benchmark report: {OUT_FILE}")


if __name__ == "__main__":
    main()
