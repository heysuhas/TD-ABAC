package com.tdabac.service;

import org.junit.jupiter.api.Test;
import javax.crypto.SecretKey;
import static org.junit.jupiter.api.Assertions.*;

public class EncryptionServiceTest {

    private final EncryptionService encryptionService = new EncryptionService();

    @Test
    public void testGenerateKey() throws Exception {
        SecretKey key = encryptionService.generateKey();
        assertNotNull(key);
        assertEquals("AES", key.getAlgorithm());
        // 256 bits = 32 bytes
        assertEquals(32, key.getEncoded().length);
    }

    @Test
    public void testKeySerializationDeserialization() throws Exception {
        SecretKey originalKey = encryptionService.generateKey();

        String keyStr = encryptionService.keyToString(originalKey);
        assertNotNull(keyStr);
        assertFalse(keyStr.isEmpty());

        SecretKey deserializedKey = encryptionService.stringToKey(keyStr);
        assertNotNull(deserializedKey);
        assertEquals("AES", deserializedKey.getAlgorithm());
        assertArrayEquals(originalKey.getEncoded(), deserializedKey.getEncoded());
    }

    @Test
    public void testEncryptDecrypt() throws Exception {
        SecretKey key = encryptionService.generateKey();
        byte[] originalData = "Hello, TD-ABAC!".getBytes();

        String encryptedData = encryptionService.encrypt(originalData, key);
        assertNotNull(encryptedData);
        assertNotEquals("Hello, TD-ABAC!", encryptedData);

        byte[] decryptedData = encryptionService.decrypt(encryptedData, key);
        assertArrayEquals(originalData, decryptedData);
    }

    @Test
    public void testEncryptDecryptLargeData() throws Exception {
        SecretKey key = encryptionService.generateKey();
        byte[] originalData = new byte[1024 * 1024]; // 1MB
        new java.util.Random().nextBytes(originalData);

        String encryptedData = encryptionService.encrypt(originalData, key);
        byte[] decryptedData = encryptionService.decrypt(encryptedData, key);

        assertArrayEquals(originalData, decryptedData);
    }
}
