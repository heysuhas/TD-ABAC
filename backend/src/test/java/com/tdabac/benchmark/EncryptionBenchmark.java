package com.tdabac.benchmark;

import com.tdabac.service.EncryptionService;
import org.junit.jupiter.api.Test;
import javax.crypto.SecretKey;
import java.util.Arrays;
import java.util.Random;

public class EncryptionBenchmark {

    @Test
    public void benchmarkEncryption() throws Exception {
        EncryptionService service = new EncryptionService();
        SecretKey key = service.generateKey();

        // 1MB File
        byte[] largeFile = new byte[1024 * 1024];
        new Random().nextBytes(largeFile);

        int warmupIterations = 10;
        int measurementIterations = 50;
        long[] encryptTimesNs = new long[measurementIterations];
        long[] decryptTimesNs = new long[measurementIterations];

        for (int i = 0; i < warmupIterations; i++) {
            String encrypted = service.encrypt(largeFile, key);
            service.decrypt(encrypted, key);
        }

        for (int i = 0; i < measurementIterations; i++) {
            long start = System.nanoTime();
            String encrypted = service.encrypt(largeFile, key);
            long encryptEnd = System.nanoTime();
            byte[] decrypted = service.decrypt(encrypted, key);
            long decryptEnd = System.nanoTime();

            if (decrypted.length != largeFile.length) {
                throw new IllegalStateException("Decryption length mismatch");
            }

            encryptTimesNs[i] = encryptEnd - start;
            decryptTimesNs[i] = decryptEnd - encryptEnd;
        }

        Arrays.sort(encryptTimesNs);
        Arrays.sort(decryptTimesNs);

        double encryptMedianMs = encryptTimesNs[measurementIterations / 2] / 1_000_000.0;
        double decryptMedianMs = decryptTimesNs[measurementIterations / 2] / 1_000_000.0;
        double encryptAvgMs = Arrays.stream(encryptTimesNs).average().orElse(0) / 1_000_000.0;
        double decryptAvgMs = Arrays.stream(decryptTimesNs).average().orElse(0) / 1_000_000.0;

        System.out.println("AES-256 Encryption (1MB) median: " + encryptMedianMs + " ms");
        System.out.println("AES-256 Encryption (1MB) average: " + encryptAvgMs + " ms");
        System.out.println("AES-256 Decryption (1MB) median: " + decryptMedianMs + " ms");
        System.out.println("AES-256 Decryption (1MB) average: " + decryptAvgMs + " ms");
    }
}
