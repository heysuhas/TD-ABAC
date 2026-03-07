package com.tdabac.controller;

import com.tdabac.service.BlockchainService;
import com.tdabac.service.EncryptionService;
import com.tdabac.service.IPFSService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

class FileControllerTest {

    private FileController fileController;
    private EncryptionService encryptionService;
    private IPFSService ipfsService;
    private BlockchainService blockchainService;

    @BeforeEach
    void setUp() {
        encryptionService = Mockito.mock(EncryptionService.class);
        ipfsService = Mockito.mock(IPFSService.class);
        blockchainService = Mockito.mock(BlockchainService.class);
        fileController = new FileController(encryptionService, ipfsService, blockchainService);
    }

    @Test
    void uploadFile_ThrowsException_ReturnsInternalServerError() throws Exception {
        // Arrange
        MultipartFile mockFile = new MockMultipartFile("file", "test.txt", "text/plain", "content".getBytes());
        Long duration = 3600L;
        String errorMessage = "Simulated encryption error";

        when(encryptionService.generateKey()).thenThrow(new RuntimeException(errorMessage));

        // Act
        ResponseEntity<?> response = fileController.uploadFile(mockFile, duration);

        // Assert
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Error: " + errorMessage));
    }
}
