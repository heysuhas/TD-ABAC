const hre = require("hardhat");

async function main() {
    // Read inputs from Environment Variables to avoid Hardhat CLI parsing issues (HH305, HH308)
    const command = process.env.CMD;
    const fileHash = process.env.FILE_HASH || "";
    const duration = process.env.DURATION ? parseInt(process.env.DURATION) : 0;
    const userAddressStr = process.env.USER_ADDRESS;
    const shareWithAddressStr = process.env.SHARE_WITH_ADDRESS;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    // Validate inputs
    if (!command || !contractAddress) {
        console.error("ERROR: Missing required environment variables: CMD, CONTRACT_ADDRESS");
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

    // Use the provided private key to sign transactions, avoiding the insecure impersonateAccount
    let signer = (await hre.ethers.getSigners())[0]; // default to first account
    const privateKeyStr = process.env.PRIVATE_KEY;

    if (privateKeyStr && command !== "check" && command !== "getUserFiles" && command !== "getSharedFiles") {
        // Create a wallet instance from the private key and connect it to the provider
        signer = new hre.ethers.Wallet(privateKeyStr, hre.ethers.provider);

        // Ensure the wallet has ETH to pay for gas (since we are on localhost)
        const signers = await hre.ethers.getSigners();
        await signers[0].sendTransaction({
            to: signer.address,
            value: hre.ethers.parseEther("1.0")
        });
    } else if (userAddressStr && command !== "check" && command !== "getUserFiles" && command !== "getSharedFiles") {
         // Fallback if no private key is provided but user address is (shouldn't happen with updated frontend)
         console.warn("WARNING: Performing state-changing operation without private key. Relying on default signer which may fail access control checks.");
    }

    // Connect contract instance to the signer
    const tdabacConnected = tdabac.connect(signer);

    if (command === "upload") {
        const tx = await tdabacConnected.uploadFile(fileHash, duration);
        await tx.wait();
        console.log("UPLOAD_SUCCESS");
    } else if (command === "share") {
        if (!shareWithAddressStr) {
            console.error("ERROR: Missing SHARE_WITH_ADDRESS for share command");
            process.exit(1);
        }
        const tx = await tdabacConnected.shareFile(fileHash, shareWithAddressStr);
        await tx.wait();
        console.log("SHARE_SUCCESS");
    } else if (command === "check") {
        // On a local Hardhat node, block.timestamp only moves when a block is mined.
        // Aligning to wall-clock time ensures time-lock checks actually expire.
        await syncToWallClockTime();

        // Check access for the specific user
        const addressToCheck = userAddressStr || signer.address;
        const allowed = await tdabac.checkAccess(fileHash, addressToCheck);
        if (allowed) {
            console.log("ACCESS_GRANTED");
        } else {
            console.log("ACCESS_DENIED");
        }
    } else if (command === "getUserFiles") {
        const addressToCheck = userAddressStr || signer.address;
        const files = await tdabac.getUserFiles(addressToCheck);
        console.log(`ARRAY_RESULT:[${files.join(",")}]`);
    } else if (command === "getSharedFiles") {
        const addressToCheck = userAddressStr || signer.address;
        const files = await tdabac.getSharedFiles(addressToCheck);
        console.log(`ARRAY_RESULT:[${files.join(",")}]`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
