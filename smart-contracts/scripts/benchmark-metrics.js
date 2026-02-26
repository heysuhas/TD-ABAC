const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const MEASUREMENT_ITERATIONS = 20;
const DURATIONS = [60, 300, 3600, 86400, 31536000];

function toCalldataBytes(contractInterface, fn, args) {
  const calldata = contractInterface.encodeFunctionData(fn, args);
  return (calldata.length - 2) / 2;
}

function line(row) {
  return `${row.run_id},${row.stage},${row.input_size},${row.duration_bucket},${row.latency_ms},${row.gas_used},${row.bytes_sent},${row.bytes_recv}`;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const TDABAC = await ethers.getContractFactory("TDABAC");
  const tdabac = await TDABAC.deploy();
  await tdabac.waitForDeployment();

  const csvRows = ["run_id,stage,input_size,duration_bucket,latency_ms,gas_used,bytes_sent,bytes_recv"];
  let runId = 1;

  for (const duration of DURATIONS) {
    for (let i = 0; i < MEASUREMENT_ITERATIONS; i++) {
      const fileHash = `QmBench-${duration}-${i}-${Date.now()}`;

      const uploadTx = await tdabac.uploadFile(fileHash, duration);
      const uploadReceipt = await uploadTx.wait();

      const uploadCalldataBytes = toCalldataBytes(tdabac.interface, "uploadFile", [fileHash, duration]);
      csvRows.push(line({
        run_id: runId++,
        stage: "upload_tx",
        input_size: "metadata",
        duration_bucket: duration,
        latency_ms: "NA",
        gas_used: uploadReceipt.gasUsed.toString(),
        bytes_sent: uploadCalldataBytes,
        bytes_recv: 0,
      }));

      const estimate = await tdabac.checkAccess.estimateGas(fileHash);
      const checkCalldataBytes = toCalldataBytes(tdabac.interface, "checkAccess", [fileHash]);

      const start = process.hrtime.bigint();
      const granted = await tdabac.checkAccess.staticCall(fileHash);
      const end = process.hrtime.bigint();
      const latencyMs = Number(end - start) / 1_000_000;

      if (!granted) {
        throw new Error("Expected access to be granted during benchmark window.");
      }

      csvRows.push(line({
        run_id: runId++,
        stage: "access_check_view",
        input_size: "metadata",
        duration_bucket: duration,
        latency_ms: latencyMs.toFixed(6),
        gas_used: estimate.toString(),
        bytes_sent: checkCalldataBytes,
        bytes_recv: 32,
      }));
    }
  }

  const outputDir = path.join(__dirname, "..", "benchmark-results");
  fs.mkdirSync(outputDir, { recursive: true });
  const outFile = path.join(outputDir, "chain_metrics.csv");
  fs.writeFileSync(outFile, `${csvRows.join("\n")}\n`, "utf8");

  console.log(`Benchmark complete. Contract: ${await tdabac.getAddress()}`);
  console.log(`Wrote chain metrics CSV: ${outFile}`);
  console.log(`Total rows (excluding header): ${csvRows.length - 1}`);
  console.log(`Benchmark signer: ${deployer.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
