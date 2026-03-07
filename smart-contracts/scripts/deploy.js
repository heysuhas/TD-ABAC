const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const TDABAC = await hre.ethers.getContractFactory("TDABAC");
  const tdabac = await TDABAC.deploy();
  await tdabac.waitForDeployment();
  const address = await tdabac.getAddress();
  console.log("TDABAC deployed to:", address);
  fs.writeFileSync("contract-address.txt", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
