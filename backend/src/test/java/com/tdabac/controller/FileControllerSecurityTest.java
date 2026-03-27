package com.tdabac.controller;

import com.tdabac.service.BlockchainService;
import com.tdabac.service.EncryptionService;
import com.tdabac.service.IPFSService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class FileControllerSecurityTest {

    private FileController fileController;
    private EncryptionService encryptionService;
    private IPFSService ipfsService;
    private BlockchainService blockchainService;

    @BeforeEach
    void setUp() {
        encryptionService = mock(EncryptionService.class);
        ipfsService = mock(IPFSService.class);
        blockchainService = mock(BlockchainService.class);
        fileController = new FileController(encryptionService, ipfsService, blockchainService);
    }

    @Test
    void testAccessFileWithMaliciousFilename() throws Exception {
        String fileHash = "testHash";
        String maliciousFilename = "test\"; filename=\"malicious.txt";
        byte[] content = "test content".getBytes();
        String encryptedContent = "encryptedContent";

        // Setup mock storage and key store using reflection
        Map<String, Object> mockStorage = (Map<String, Object>) ReflectionTestUtils.getField(fileController, "mockStorage");
        Map<String, Object> keyStore = (Map<String, Object>) ReflectionTestUtils.getField(fileController, "keyStore");

        // Use reflection to create FileMetadata as it is private
        Class<?> metadataClass = Class.forName("com.tdabac.controller.FileController$FileMetadata");
        Object metadata = metadataClass.getDeclaredConstructor(String.class, String.class, String.class)
                .newInstance(encryptedContent, maliciousFilename, "text/plain");

        mockStorage.put(fileHash, metadata);
        keyStore.put(fileHash, new SecretKeySpec(new byte[16], "AES"));

        when(blockchainService.checkAccess(anyString(), any())).thenReturn(true);
        when(encryptionService.decrypt(anyString(), any())).thenReturn(content);

        ResponseEntity<?> response = fileController.accessFile(fileHash, "0x00");

        String contentDisposition = response.getHeaders().getFirst("Content-Disposition");
        System.out.println("Content-Disposition: " + contentDisposition);

        // After fix, this should be properly escaped or encoded.
        // If it's just concatenated, it would look like: attachment; filename="test"; filename="malicious.txt"
        // Which could be used for header injection.
        assertFalse(contentDisposition.contains("\"; filename=\"malicious.txt"), "Header should be sanitized");
    }

    @Test
    void testViewFileWithMaliciousFilename() throws Exception {
        String fileHash = "testHash";
        String maliciousFilename = "test.txt\r\nInjected-Header: value";
        byte[] content = "test content".getBytes();
        String encryptedContent = "encryptedContent";

        // Setup mock storage and key store using reflection
        Map<String, Object> mockStorage = (Map<String, Object>) ReflectionTestUtils.getField(fileController, "mockStorage");
        Map<String, Object> keyStore = (Map<String, Object>) ReflectionTestUtils.getField(fileController, "keyStore");
        Map<String, Object> viewTokens = (Map<String, Object>) ReflectionTestUtils.getField(fileController, "viewTokens");

        // Use reflection to create FileMetadata
        Class<?> metadataClass = Class.forName("com.tdabac.controller.FileController$FileMetadata");
        Object metadata = metadataClass.getDeclaredConstructor(String.class, String.class, String.class)
                .newInstance(encryptedContent, maliciousFilename, "text/plain");

        mockStorage.put(fileHash, metadata);
        keyStore.put(fileHash, new SecretKeySpec(new byte[16], "AES"));

        String token = UUID.randomUUID().toString();
        Class<?> viewTokenClass = Class.forName("com.tdabac.controller.FileController$ViewToken");
        Object viewToken = viewTokenClass.getDeclaredConstructor(String.class, long.class)
                .newInstance(fileHash, System.currentTimeMillis() + 60000);
        viewTokens.put(token, viewToken);

        when(blockchainService.checkAccess(anyString(), any())).thenReturn(true);
        when(encryptionService.decrypt(anyString(), any())).thenReturn(content);

        ResponseEntity<?> response = fileController.viewFile(fileHash, token, "0x00");

        String contentDisposition = response.getHeaders().getFirst("Content-Disposition");
        System.out.println("Content-Disposition: " + contentDisposition);

        assertFalse(contentDisposition.contains("\r\n"), "Header should not contain CRLF");
    }
}
