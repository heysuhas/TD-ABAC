package com.tdabac.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.crypto.AEADBadTagException;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class EncryptionServiceTest {

    private EncryptionService encryptionService;

    @BeforeEach
    void setUp() {
        encryptionService = new EncryptionService();
    }

    @Test
    void testGenerateKey() throws Exception {
        SecretKey secretKey = encryptionService.generateKey();
        assertNotNull(secretKey, "Generated key should not be null");
        assertEquals("AES", secretKey.getAlgorithm(), "Algorithm should be AES");
        assertEquals(32, secretKey.getEncoded().length, "Key length should be 32 bytes (256 bits)");
    }

    @Test
    void testEncryptDecryptSuccess() throws Exception {
        SecretKey secretKey = encryptionService.generateKey();
        String plaintext = "Hello, World! This is a test.";
        byte[] plaintextBytes = plaintext.getBytes(StandardCharsets.UTF_8);

        String encrypted = encryptionService.encrypt(plaintextBytes, secretKey);
        assertNotNull(encrypted, "Encrypted string should not be null");
        assertNotEquals(plaintext, encrypted, "Encrypted string should not match plaintext");

        byte[] decryptedBytes = encryptionService.decrypt(encrypted, secretKey);
        String decrypted = new String(decryptedBytes, StandardCharsets.UTF_8);

        assertEquals(plaintext, decrypted, "Decrypted text should match original plaintext");
    }

    @Test
    void testEncryptDecryptWithWrongKey() throws Exception {
        SecretKey correctKey = encryptionService.generateKey();
        SecretKey wrongKey = encryptionService.generateKey();

        String plaintext = "Sensitive Information";
        byte[] plaintextBytes = plaintext.getBytes(StandardCharsets.UTF_8);

        String encrypted = encryptionService.encrypt(plaintextBytes, correctKey);

        Exception exception = assertThrows(Exception.class, () -> {
            encryptionService.decrypt(encrypted, wrongKey);
        });

        // It could throw AEADBadTagException or something similar due to GCM MAC check failure
        assertNotNull(exception);
    }

    @Test
    void testDecryptWithCorruptedData() throws Exception {
        SecretKey secretKey = encryptionService.generateKey();
        String plaintext = "Important Data";
        byte[] plaintextBytes = plaintext.getBytes(StandardCharsets.UTF_8);

        String encrypted = encryptionService.encrypt(plaintextBytes, secretKey);

        // Corrupt the data by changing some characters in the base64 string
        // Base64 encoding uses padding, we can just replace a character
        char[] encryptedChars = encrypted.toCharArray();
        int indexToCorrupt = encryptedChars.length / 2;
        // Flip the character
        encryptedChars[indexToCorrupt] = encryptedChars[indexToCorrupt] == 'A' ? 'B' : 'A';
        String corruptedEncrypted = new String(encryptedChars);

        Exception exception = assertThrows(Exception.class, () -> {
            encryptionService.decrypt(corruptedEncrypted, secretKey);
        });

        assertNotNull(exception);
    }

    @Test
    void testKeyToStringAndStringToKey() throws Exception {
        SecretKey originalKey = encryptionService.generateKey();

        String keyString = encryptionService.keyToString(originalKey);
        assertNotNull(keyString);
        assertFalse(keyString.isEmpty());

        SecretKey recoveredKey = encryptionService.stringToKey(keyString);
        assertNotNull(recoveredKey);

        assertArrayEquals(originalKey.getEncoded(), recoveredKey.getEncoded(), "Recovered key should match original key");
        assertEquals(originalKey.getAlgorithm(), recoveredKey.getAlgorithm(), "Recovered key algorithm should match");
    }

    @Test
    void testEncryptProducesDifferentOutputsForSameInput() throws Exception {
        SecretKey secretKey = encryptionService.generateKey();
        byte[] data = "Repeated Data".getBytes(StandardCharsets.UTF_8);

        String firstEncryption = encryptionService.encrypt(data, secretKey);
        String secondEncryption = encryptionService.encrypt(data, secretKey);

        assertNotEquals(firstEncryption, secondEncryption, "Multiple encryptions of same data should yield different ciphertexts due to random IV");
    }
}
