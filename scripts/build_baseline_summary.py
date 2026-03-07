#!/usr/bin/env python3
"""Build baseline_systems.csv from raw baseline run measurements.

Input CSV schema (required):
system,reference,stage,input_size,latency_ms,gas_used

Expected stages for comparison:
- encrypt
- decrypt
- access_check
- onchain_update

Expected input_size for encryption/decryption rows used by this script:
- 1MB
"""

from __future__ import annotations

import csv
import statistics
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "scripts" / "baseline_runs.csv"
DEFAULT_OUTPUT = ROOT / "scripts" / "baseline_systems.csv"


def as_float(value: str) -> float | None:
    if value in ("", "NA", None):
        return None
    return float(value)


def as_int(value: str) -> int | None:
    if value in ("", "NA", None):
        return None
    return int(float(value))


def mean(values: list[float | int]) -> float | None:
    return statistics.mean(values) if values else None


def main() -> None:
    input_path = DEFAULT_INPUT
    output_path = DEFAULT_OUTPUT

    if not input_path.exists():
        raise SystemExit(
            f"Missing input: {input_path.relative_to(ROOT)}. "
            "Create it from your CP-ABE / baseline benchmark runs first."
        )

    rows: list[dict[str, str]] = []
    with input_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        required = {"system", "reference", "stage", "input_size", "latency_ms", "gas_used"}
        missing = required.difference(reader.fieldnames or [])
        if missing:
            raise SystemExit(f"Input CSV missing required column(s): {', '.join(sorted(missing))}")
        for row in reader:
            rows.append(row)

    grouped: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[(row["system"], row["reference"])].append(row)

    out_rows: list[dict[str, str]] = []
    for (system, reference), samples in sorted(grouped.items()):
        encrypt_1mb = [
            as_float(r["latency_ms"])
            for r in samples
            if r["stage"] == "encrypt" and r["input_size"] == "1MB" and as_float(r["latency_ms"]) is not None
        ]
        decrypt_1mb = [
            as_float(r["latency_ms"])
            for r in samples
            if r["stage"] == "decrypt" and r["input_size"] == "1MB" and as_float(r["latency_ms"]) is not None
        ]
        access_check = [
            as_float(r["latency_ms"])
            for r in samples
            if r["stage"] == "access_check" and as_float(r["latency_ms"]) is not None
        ]
        onchain_update_gas = [
            as_int(r["gas_used"])
            for r in samples
            if r["stage"] == "onchain_update" and as_int(r["gas_used"]) is not None
        ]

        if not encrypt_1mb or not decrypt_1mb or not access_check:
            raise SystemExit(
                f"System '{system}' is missing one or more required stages/metrics "
                "(encrypt 1MB, decrypt 1MB, access_check latency)."
            )

        gas_value = mean([g for g in onchain_update_gas if g is not None])
        out_rows.append(
            {
                "system": system,
                "reference": reference,
                "encrypt_1mb_ms": f"{mean([v for v in encrypt_1mb if v is not None]):.6f}",
                "decrypt_1mb_ms": f"{mean([v for v in decrypt_1mb if v is not None]):.6f}",
                "access_check_ms": f"{mean([v for v in access_check if v is not None]):.6f}",
                "onchain_update_gas": "0" if gas_value is None else str(int(round(gas_value))),
            }
        )

    with output_path.open("w", newline="", encoding="utf-8") as handle:
        fields = ["system", "reference", "encrypt_1mb_ms", "decrypt_1mb_ms", "access_check_ms", "onchain_update_gas"]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(out_rows)

    print(f"Wrote baseline summary: {output_path}")
    print(f"Systems summarized: {len(out_rows)}")


if __name__ == "__main__":
    main()
