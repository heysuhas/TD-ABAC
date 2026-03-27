package com.tdabac.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.concurrent.TimeUnit;
import java.io.File;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class BlockchainService {

    private static final Logger logger = LoggerFactory.getLogger(BlockchainService.class);

    // Config: Smart Contracts directory relative to Backend
    // Assuming we run backend from 'backend/' folder.
    private static final String WORKING_DIR = "../smart-contracts";

    // We need to store/know the address. For prototype, we'll try to find it or
    // expect it in a specific file.
    // Or we just hardcode the latest deployed address if "localhost" network is
    // persistent (using 'npx hardhat node').
    // Since we don't know the exact address here without reading 'deployment.json'
    // or output,
    // we will implement a helper to read the latest address from a file if we
    // update deploy.js to write it.
    // FOR NOW, we will use a PLACEHOLDER and ask the frontend/user to update it, OR
    // we update deploy.js.
    // Let's UPDATE deploy.js to write the address to 'address.txt'!
    private String contractAddress = ""; // loaded dynamically
    private long lastModifiedTime = 0; // cache invalidation timestamp

    public void uploadFile(String fileHash, long duration) throws Exception {
        loadAddress();
        runHardhatScript("upload", fileHash, String.valueOf(duration));
    }

    public boolean checkAccess(String fileHash) {
        try {
            loadAddress();
            String output = runHardhatScript("check", fileHash, "0");
            return output.contains("ACCESS_GRANTED");
        } catch (Exception e) {
            logger.error("Error checking access on blockchain for hash: {}", fileHash, e);
            return false;
        }
    }

    private void loadAddress() throws Exception {
        // Reload to support redeployments without restarting backend, but only if modified
        File file = new File(WORKING_DIR + "/contract-address.txt");
        if (file.exists()) {
            long currentModifiedTime = file.lastModified();
            if (currentModifiedTime > lastModifiedTime || contractAddress.isEmpty()) {
                contractAddress = java.nio.file.Files.readString(file.toPath()).trim();
                lastModifiedTime = currentModifiedTime;
                System.out.println("Loaded Contract Address: " + contractAddress);
            }
        } else {
            throw new RuntimeException("Contract Address not found. Please run deploy.js first!");
        }
    }

    private String runHardhatScript(String command, String hash, String duration) throws Exception {
        logger.info("Executing Hardhat Command: {} for {}", command, hash);

        // Use Environment Variables to pass data to the script
        // This avoids Hardhat CLI argument parsing issues entirely.
        ProcessBuilder builder = new ProcessBuilder(
                "cmd.exe", "/c", "npx hardhat run scripts/interact.js --network localhost");
        builder.directory(new File(WORKING_DIR));

        java.util.Map<String, String> env = builder.environment();
        env.put("CMD", command);
        env.put("FILE_HASH", hash);
        env.put("DURATION", duration);
        env.put("CONTRACT_ADDRESS", contractAddress);

        Process process = builder.start();

        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        BufferedReader errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream()));

        StringBuilder output = new StringBuilder();
        String line;

        // Read Stdout
        while ((line = reader.readLine()) != null) {
            output.append(line).append("\n");
            logger.info("[Hardhat Output]: {}", line);
        }

        // Read Stderr
        while ((line = errorReader.readLine()) != null) {
            logger.error("[Hardhat Error]: {}", line);
        }

        // Increased timeout to 60 seconds to account for slow startup
        boolean finished = process.waitFor(60, TimeUnit.SECONDS);
        if (!finished) {
            process.destroy();
            throw new RuntimeException("Hardhat process timed out after 60 seconds");
        }

        return output.toString();
    }
}
