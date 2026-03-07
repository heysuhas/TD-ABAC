package com.tdabac.service;

import org.springframework.stereotype.Service;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.ClientTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.Bool;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthCall;
import org.web3j.protocol.core.methods.response.EthSendTransaction;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.math.BigInteger;
import java.io.File;

@Service
public class BlockchainService {

    private Web3j web3j;

    public BlockchainService() {
        this.web3j = Web3j.build(new HttpService("http://localhost:8545"));
    }

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

    public void uploadFile(String fileHash, long duration) throws Exception {
        loadAddress();

        String account = web3j.ethAccounts().send().getAccounts().get(0);
        TransactionManager tm = new ClientTransactionManager(web3j, account);

        Function function = new Function(
                "uploadFile",
                Arrays.asList(new Utf8String(fileHash), new Uint256(BigInteger.valueOf(duration))),
                Collections.emptyList());

        String encodedFunction = FunctionEncoder.encode(function);

        EthSendTransaction response = tm.sendTransaction(
                org.web3j.tx.gas.DefaultGasProvider.GAS_PRICE,
                org.web3j.tx.gas.DefaultGasProvider.GAS_LIMIT,
                contractAddress,
                encodedFunction,
                BigInteger.ZERO);

        if (response.hasError()) {
            throw new RuntimeException("Error uploading file to blockchain: " + response.getError().getMessage());
        }

        // Wait for the transaction to be mined (simple poll for prototype)
        String txHash = response.getTransactionHash();
        for (int i = 0; i < 10; i++) {
            var receipt = web3j.ethGetTransactionReceipt(txHash).send();
            if (receipt.getTransactionReceipt().isPresent()) {
                break;
            }
            Thread.sleep(100);
        }

        System.out.println("UPLOAD_SUCCESS: " + fileHash);
    }

    public boolean checkAccess(String fileHash) {
        try {
            loadAddress();

            // On a local Hardhat node, block.timestamp only moves when a block is mined.
            // But we can't easily sync wall clock from here without specific EVM calls.
            // We assume it's moving or we just read state.

            Function function = new Function(
                    "checkAccess",
                    Collections.singletonList(new Utf8String(fileHash)),
                    Collections.singletonList(new TypeReference<Bool>() {}));

            String encodedFunction = FunctionEncoder.encode(function);

            String account = web3j.ethAccounts().send().getAccounts().get(0);

            org.web3j.protocol.core.methods.request.Transaction transaction = Transaction.createEthCallTransaction(
                    account, contractAddress, encodedFunction);

            EthCall response = web3j.ethCall(transaction, org.web3j.protocol.core.DefaultBlockParameterName.LATEST).send();

            if (response.hasError()) {
                System.err.println("Error calling checkAccess: " + response.getError().getMessage());
                return false;
            }

            List<Type> results = FunctionReturnDecoder.decode(response.getValue(), function.getOutputParameters());
            if (results.isEmpty()) {
                return false;
            }

            boolean allowed = (Boolean) results.get(0).getValue();
            if (allowed) {
                System.out.println("ACCESS_GRANTED");
            } else {
                System.out.println("ACCESS_DENIED");
            }
            return allowed;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private void loadAddress() throws Exception {
        // Always reload to support redeployments without restarting backend
        File file = new File(WORKING_DIR + "/contract-address.txt");
        if (file.exists()) {
            contractAddress = java.nio.file.Files.readString(file.toPath()).trim();
            System.out.println("Loaded Contract Address: " + contractAddress);
        } else {
            throw new RuntimeException("Contract Address not found. Please run deploy.js first!");
        }
    }

}
