const hre = require("hardhat");

async function main() {
    // Read inputs from Environment Variables to avoid Hardhat CLI parsing issues (HH305, HH308)
    const command = process.env.CMD;
    const fileHash = process.env.FILE_HASH;
    const duration = process.env.DURATION ? parseInt(process.env.DURATION) : 0;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    // Validate inputs
    if (!command || !fileHash || !contractAddress) {
        console.error("ERROR: Missing required environment variables: CMD, FILE_HASH, CONTRACT_ADDRESS");
        process.exit(1);
    }

    // Ideally, we load the deployed address from a file or env.
    // For prototype, we will deploy a NEW contract for Every Request? NO, that's persistent.
    // We need the address.
    // Solution: We'll assume the contract is deployed at a fixed address on localhost if we use `npx hardhat node`.
    // OR: We deploy once and save the address to `contract-address.txt`.

    // For simplicity NOW: Use the `getContractAt` with the address found above.
    // const contractAddress = args[3]; // Removed duplicate

    console.log("DEBUG: Command:", command);
    console.log("DEBUG: Hash:", fileHash);
    console.log("DEBUG: Duration:", duration);
    console.log("DEBUG: Contract:", contractAddress);

    const tdabac = await hre.ethers.getContractAt("TDABAC", contractAddress);

    const syncToWallClockTime = async () => {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const latestBlock = await hre.ethers.provider.getBlock("latest");
        const nextTimestamp = Math.max(nowInSeconds, Number(latestBlock.timestamp) + 1);

        await hre.network.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
        await hre.network.provider.send("evm_mine");
    };

    if (command === "upload") {
        const tx = await tdabac.uploadFile(fileHash, duration);
        await tx.wait();
        console.log("UPLOAD_SUCCESS");
    } else if (command === "check") {
        // On a local Hardhat node, block.timestamp only moves when a block is mined.
        // Aligning to wall-clock time ensures time-lock checks actually expire.
        await syncToWallClockTime();

        const allowed = await tdabac.checkAccess(fileHash);
        if (allowed) {
            console.log("ACCESS_GRANTED");
        } else {
            console.log("ACCESS_DENIED");
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
