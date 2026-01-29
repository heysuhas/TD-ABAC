const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const tdabac = await hre.ethers.deployContract("TDABAC");
    await tdabac.waitForDeployment();
    console.log(`TDABAC deployed to ${tdabac.target}`);

    // Write address to file for backend to read
    fs.writeFileSync("contract-address.txt", tdabac.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
