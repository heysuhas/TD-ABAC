package com.tdabac.benchmark;

import com.tdabac.service.BlockchainService;
import org.junit.jupiter.api.Test;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;

public class BlockchainServiceBenchmark {
    @Test
    public void benchmarkLoadAddress() throws Exception {
        File dir = new File("../smart-contracts");
        dir.mkdirs();
        File file = new File("../smart-contracts/contract-address.txt");
        if (!file.exists()) {
            Files.writeString(file.toPath(), "0x1234567890abcdef");
        }

        BlockchainService service = new BlockchainService();
        java.lang.reflect.Method loadAddressMethod = BlockchainService.class.getDeclaredMethod("loadAddress");
        loadAddressMethod.setAccessible(true);

        // Warmup
        for (int i = 0; i < 1000; i++) {
            loadAddressMethod.invoke(service);
        }

        // Measure
        long start = System.nanoTime();
        int iterations = 10000;
        for (int i = 0; i < iterations; i++) {
            loadAddressMethod.invoke(service);
        }
        long end = System.nanoTime();

        System.out.println("--- BENCHMARK RESULTS ---");
        System.out.println("Total time for " + iterations + " iterations: " + (end - start) / 1000000.0 + " ms");
        System.out.println("Average time per iteration: " + (end - start) / (double) iterations + " ns");
        System.out.println("-------------------------");
    }
}
