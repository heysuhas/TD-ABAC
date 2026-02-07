package com.tdabac.controller;

import com.tdabac.service.BlockchainService;
import com.tdabac.service.EncryptionService;
import com.tdabac.service.IPFSService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.SecretKey;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Allow Frontend access
public class FileController {

    private final EncryptionService encryptionService;
    private final IPFSService ipfsService;
    private final BlockchainService blockchainService;

    // In-memory key store (For prototype ONLY). Real Production uses Key Management
    // Service (AWS KMS etc).
    // Keys are mapped by FileHash.
    private final java.util.Map<String, javax.crypto.SecretKey> keyStore = new java.util.concurrent.ConcurrentHashMap<>();

    // In-memory Mock Storage for Prototype (Stores encrypted data + metadata)
    private final java.util.Map<String, FileMetadata> mockStorage = new java.util.concurrent.ConcurrentHashMap<>();
    private static final long VIEW_TOKEN_TTL_MS = 60_000;
    private final java.util.Map<String, ViewToken> viewTokens = new java.util.concurrent.ConcurrentHashMap<>();

    private static class FileMetadata {
        final String encryptedContent; // Base64 String
        final String originalFilename;
        final String contentType;

        FileMetadata(String encryptedContent, String originalFilename, String contentType) {
            this.encryptedContent = encryptedContent;
            this.originalFilename = originalFilename;
            this.contentType = contentType;
        }
    }

    private static class ViewToken {
        final String fileHash;
        final long expiresAt;

        ViewToken(String fileHash, long expiresAt) {
            this.fileHash = fileHash;
            this.expiresAt = expiresAt;
        }

        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }

    public FileController(EncryptionService encryptionService, IPFSService ipfsService,
            BlockchainService blockchainService) {
        this.encryptionService = encryptionService;
        this.ipfsService = ipfsService;
        this.blockchainService = blockchainService;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file,
            @RequestParam("duration") Long duration) {
        try {
            // 1. Generate Key
            javax.crypto.SecretKey key = encryptionService.generateKey();

            // 2. Encrypt Data
            String encryptedContent = encryptionService.encrypt(file.getBytes(), key);

            // 3. Upload to IPFS (Mock) & Store in Memory
            String fileHash = ipfsService.uploadFile(encryptedContent.getBytes());

            mockStorage.put(fileHash,
                    new FileMetadata(encryptedContent, file.getOriginalFilename(), file.getContentType()));

            // 4. Store Key temporarily (Valid window)
            keyStore.put(fileHash, key);

            // 5. Register on Blockchain
            blockchainService.uploadFile(fileHash, duration);

            // 6. Return response
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("fileHash", fileHash);
            response.put("expiry", new java.util.Date(System.currentTimeMillis() + duration * 1000).toString());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/access/{fileHash}")
    public ResponseEntity<?> accessFile(@PathVariable String fileHash) {
        // 1. Check Blockchain Time-Lock
        boolean accessAllowed = blockchainService.checkAccess(fileHash);

        if (!accessAllowed) {
            return ResponseEntity.status(403).body("Access Denied: Time-Lock Expired on Blockchain");
        }

        try {
            if (!keyStore.containsKey(fileHash)) {
                return ResponseEntity.status(404).body("File Key not found (Server Restarted?)");
            }

            if (!mockStorage.containsKey(fileHash)) {
                return ResponseEntity.status(404).body("File Content not found (Server Restarted?)");
            }

            // 2. Retrieve Data
            FileMetadata metadata = mockStorage.get(fileHash);
            SecretKey key = keyStore.get(fileHash);

            // 3. Decrypt
            byte[] decryptedBytes = encryptionService.decrypt(metadata.encryptedContent, key);

            // 4. Return the ACTUAL file
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=\"" + metadata.originalFilename + "\"")
                    .header("Content-Type", metadata.contentType)
                    .body(decryptedBytes);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/files/{fileHash}/view-token")
    public ResponseEntity<?> createViewToken(@PathVariable String fileHash) {
        boolean accessAllowed = blockchainService.checkAccess(fileHash);

        if (!accessAllowed) {
            return ResponseEntity.status(403).body("Access Denied: Time-Lock Expired on Blockchain");
        }

        if (!keyStore.containsKey(fileHash)) {
            return ResponseEntity.status(404).body("File Key not found (Server Restarted?)");
        }

        if (!mockStorage.containsKey(fileHash)) {
            return ResponseEntity.status(404).body("File Content not found (Server Restarted?)");
        }

        String token = UUID.randomUUID().toString();
        long expiresAt = System.currentTimeMillis() + VIEW_TOKEN_TTL_MS;
        viewTokens.put(token, new ViewToken(fileHash, expiresAt));

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("expiresAt", new Date(expiresAt).toString());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/files/{fileHash}/view")
    public ResponseEntity<?> viewFile(@PathVariable String fileHash, @RequestParam("token") String token) {
        ViewToken viewToken = viewTokens.get(token);

        if (viewToken == null || viewToken.isExpired()) {
            viewTokens.remove(token);
            return ResponseEntity.status(403).body("View token expired or invalid");
        }

        if (!viewToken.fileHash.equals(fileHash)) {
            return ResponseEntity.status(403).body("View token does not match requested file");
        }

        boolean accessAllowed = blockchainService.checkAccess(fileHash);
        if (!accessAllowed) {
            return ResponseEntity.status(403).body("Access Denied: Time-Lock Expired on Blockchain");
        }

        try {
            if (!keyStore.containsKey(fileHash)) {
                return ResponseEntity.status(404).body("File Key not found (Server Restarted?)");
            }

            if (!mockStorage.containsKey(fileHash)) {
                return ResponseEntity.status(404).body("File Content not found (Server Restarted?)");
            }

            FileMetadata metadata = mockStorage.get(fileHash);
            SecretKey key = keyStore.get(fileHash);
            byte[] decryptedBytes = encryptionService.decrypt(metadata.encryptedContent, key);

            viewTokens.remove(token);

            return ResponseEntity.ok()
                    .header("Content-Disposition", "inline; filename=\"" + metadata.originalFilename + "\"")
                    .header("Content-Type", metadata.contentType)
                    .body(decryptedBytes);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
}
