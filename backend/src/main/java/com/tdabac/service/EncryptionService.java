package com.tdabac.service;

import org.springframework.stereotype.Service;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class EncryptionService {
    private static final String ALGO = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128; // Must be one of {128, 120, 112, 104, 96}
    private static final int IV_LENGTH_BYTE = 12;
    private static final int AES_KEY_BIT = 256;

    public SecretKey generateKey() throws Exception {
        KeyGenerator keyGen = KeyGenerator.getInstance("AES");
        keyGen.init(AES_KEY_BIT);
        return keyGen.generateKey();
    }

    public String encrypt(byte[] fileData, SecretKey secretKey) throws Exception {
        byte[] iv = new byte[IV_LENGTH_BYTE];
        new SecureRandom().nextBytes(iv);

        Cipher cipher = Cipher.getInstance(ALGO);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH_BIT, iv));

        byte[] cipherText = cipher.doFinal(fileData);

        // Prepend IV to ciphertext
        ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + cipherText.length);
        byteBuffer.put(iv);
        byteBuffer.put(cipherText);

        return Base64.getEncoder().encodeToString(byteBuffer.array());
    }

    public byte[] decrypt(String encryptedContent, SecretKey secretKey) throws Exception {
        byte[] decode = Base64.getDecoder().decode(encryptedContent);

        ByteBuffer byteBuffer = ByteBuffer.wrap(decode);

        byte[] iv = new byte[IV_LENGTH_BYTE];
        byteBuffer.get(iv);

        byte[] cipherText = new byte[byteBuffer.remaining()];
        byteBuffer.get(cipherText);

        Cipher cipher = Cipher.getInstance(ALGO);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH_BIT, iv));

        return cipher.doFinal(cipherText);
    }

    // Helper to convert Key to String for storage if needed (though we said keys
    // are ephemeral)
    // For the purpose of the prototype, we assume we might return the key to the
    // user or store strictly in memory.
    public String keyToString(SecretKey secretKey) {
        return Base64.getEncoder().encodeToString(secretKey.getEncoded());
    }

    public SecretKey stringToKey(String keyStr) {
        byte[] decoded = Base64.getDecoder().decode(keyStr);
        return new SecretKeySpec(decoded, 0, decoded.length, "AES");
    }
}
