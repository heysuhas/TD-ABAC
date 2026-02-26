package com.tdabac.benchmark;

import com.tdabac.service.EncryptionService;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Random;

public class EncryptionMetricsExporterTest {

    private static final int[] FILE_SIZES_MB = {1, 5, 10};
    private static final int WARMUP_ITERATIONS = 5;
    private static final int MEASUREMENT_ITERATIONS = 20;

    @Test
    public void exportEncryptionMetricsCsv() throws Exception {
        EncryptionService service = new EncryptionService();
        SecretKey key = service.generateKey();

        Path outputDir = Paths.get("benchmark-results");
        Files.createDirectories(outputDir);
        Path outputFile = outputDir.resolve("encryption_metrics.csv");

        StringBuilder csv = new StringBuilder();
        csv.append("run_id,stage,input_size,duration_bucket,latency_ms,gas_used,bytes_sent,bytes_recv\n");

        int runId = 1;
        for (int mb : FILE_SIZES_MB) {
            int bytes = mb * 1024 * 1024;
            byte[] payload = new byte[bytes];
            new Random(42L + mb).nextBytes(payload);

            for (int i = 0; i < WARMUP_ITERATIONS; i++) {
                String encrypted = service.encrypt(payload, key);
                service.decrypt(encrypted, key);
            }

            for (int i = 0; i < MEASUREMENT_ITERATIONS; i++) {
                long startEncrypt = System.nanoTime();
                String encrypted = service.encrypt(payload, key);
                long endEncrypt = System.nanoTime();

                long startDecrypt = System.nanoTime();
                byte[] decrypted = service.decrypt(encrypted, key);
                long endDecrypt = System.nanoTime();

                if (decrypted.length != payload.length) {
                    throw new IllegalStateException("Decryption length mismatch at " + mb + "MB");
                }

                double encryptMs = (endEncrypt - startEncrypt) / 1_000_000.0;
                double decryptMs = (endDecrypt - startDecrypt) / 1_000_000.0;

                csv.append(toRow(runId++, "aes_encrypt", mb + "MB", "NA", encryptMs, 0, bytes, 0));
                csv.append(toRow(runId++, "aes_decrypt", mb + "MB", "NA", decryptMs, 0, bytes, bytes));
            }
        }

        writeCsv(outputFile, csv.toString());
        System.out.println("Wrote encryption metrics: " + outputFile.toAbsolutePath());
    }

    private static String toRow(int runId, String stage, String inputSize, String durationBucket,
                                double latencyMs, int gasUsed, int bytesSent, int bytesRecv) {
        return String.format(Locale.US, "%d,%s,%s,%s,%.6f,%d,%d,%d%n",
                runId, stage, inputSize, durationBucket, latencyMs, gasUsed, bytesSent, bytesRecv);
    }

    private static void writeCsv(Path outputFile, String content) throws IOException {
        Files.writeString(outputFile, content, StandardCharsets.UTF_8);
    }
}
