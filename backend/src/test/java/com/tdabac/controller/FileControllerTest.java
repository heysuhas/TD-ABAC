package com.tdabac.controller;

import com.tdabac.service.BlockchainService;
import com.tdabac.service.EncryptionService;
import com.tdabac.service.IPFSService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Constructor;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ExtendWith(MockitoExtension.class)
public class FileControllerTest {

    @Mock
    private EncryptionService encryptionService;

    @Mock
    private IPFSService ipfsService;

    @Mock
    private BlockchainService blockchainService;

    @InjectMocks
    private FileController fileController;

    private Map<String, Object> viewTokens;

    @BeforeEach
    @SuppressWarnings("unchecked")
    public void setup() {
        viewTokens = new ConcurrentHashMap<>();
        ReflectionTestUtils.setField(fileController, "viewTokens", viewTokens);
    }

    private Object createViewToken(String fileHash, long expiresAt) throws Exception {
        Class<?> viewTokenClass = Class.forName("com.tdabac.controller.FileController$ViewToken");
        Constructor<?> constructor = viewTokenClass.getDeclaredConstructor(String.class, long.class);
        constructor.setAccessible(true);
        return constructor.newInstance(fileHash, expiresAt);
    }

    @Test
    public void testViewFile_ExpiredToken() throws Exception {
        // Arrange
        String token = "expired-token";
        String fileHash = "some-file-hash";
        long expiresAt = System.currentTimeMillis() - 10000; // 10 seconds ago

        Object expiredViewToken = createViewToken(fileHash, expiresAt);
        viewTokens.put(token, expiredViewToken);

        // Act
        ResponseEntity<?> response = fileController.viewFile(fileHash, token);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("View token expired or invalid", response.getBody());
        assertFalse(viewTokens.containsKey(token));
    }

    @Test
    public void testViewFile_InvalidToken() {
        // Arrange
        String token = "invalid-token";
        String fileHash = "some-file-hash";

        // Act
        ResponseEntity<?> response = fileController.viewFile(fileHash, token);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("View token expired or invalid", response.getBody());
    }

    @Test
    public void testViewFile_TokenDoesNotMatchFile() throws Exception {
        // Arrange
        String token = "valid-token-wrong-file";
        String tokenFileHash = "token-file-hash";
        String requestFileHash = "request-file-hash";
        long expiresAt = System.currentTimeMillis() + 10000; // valid for 10 seconds

        Object viewToken = createViewToken(tokenFileHash, expiresAt);
        viewTokens.put(token, viewToken);

        // Act
        ResponseEntity<?> response = fileController.viewFile(requestFileHash, token);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("View token does not match requested file", response.getBody());
        assertTrue(viewTokens.containsKey(token));
    }
}
