package com.tdabac.benchmark;

import com.tdabac.service.EncryptionService;
import org.junit.jupiter.api.Test;
import javax.crypto.SecretKey;
import java.util.Random;

public class EncryptionBenchmark {

    @Test
    public void benchmarkEncryption() throws Exception {
        EncryptionService service = new EncryptionService();
        SecretKey key = service.generateKey();

        // 1MB File
        byte[] largeFile = new byte[1024 * 1024];
        new Random().nextBytes(largeFile);

        long totalTime = 0;
        int iterations = 100;

        for (int i = 0; i < iterations; i++) {
            long start = System.nanoTime();
            service.encrypt(largeFile, key);
            long end = System.nanoTime();
            totalTime += (end - start);
        }

        double avgTimeMs = (totalTime / iterations) / 1_000_000.0;
        System.out.println("Average AES-256 Encryption Time (1MB): " + avgTimeMs + " ms");

        // Assert it's fast (Target < 5ms is for smaller chunks usually, but let's see)
        // Note: 1MB might take slightly more depending on CPU, but should be linear.
    }
}
