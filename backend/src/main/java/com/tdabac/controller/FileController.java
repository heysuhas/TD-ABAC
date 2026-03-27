package com.tdabac.controller;

import com.tdabac.service.BlockchainService;
import com.tdabac.service.EncryptionService;
import com.tdabac.service.IPFSService;
import org.springframework.http.ContentDisposition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.SecretKey;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "${app.cors.allowed-origins}") // Allow Frontend access
public class FileController {

    private static final Logger logger = LoggerFactory.getLogger(FileController.class);

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
            @RequestParam("duration") Long duration, @RequestParam(value = "userAddress", required = false) String userAddress,
            @RequestParam(value = "privateKey", required = false) String privateKey) {
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
            blockchainService.uploadFile(fileHash, duration, userAddress, privateKey);

            // 6. Return response
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("fileHash", fileHash);
            response.put("expiry", new java.util.Date(System.currentTimeMillis() + duration * 1000).toString());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error during file upload", e);
            return ResponseEntity.internalServerError().body("Error: An internal server error occurred");
        }
    }

    @GetMapping("/access/{fileHash}")
    public ResponseEntity<?> accessFile(@PathVariable String fileHash, @RequestParam(value = "userAddress", required = false) String userAddress) {
        // 1. Check Blockchain Time-Lock
        boolean accessAllowed = blockchainService.checkAccess(fileHash, userAddress);

        if (!accessAllowed) {
            return ResponseEntity.status(403).body("Access Denied: Time-Lock Expired on Blockchain");
        }

        try {
            // 2. Retrieve Data (Atomic check-and-get to avoid redundant lookups)
            SecretKey key = keyStore.get(fileHash);
            if (key == null) {
                return ResponseEntity.status(404).body("File Key not found (Server Restarted?)");
            }

            FileMetadata metadata = mockStorage.get(fileHash);
            if (metadata == null) {
                return ResponseEntity.status(404).body("File Content not found (Server Restarted?)");
            }

            // 3. Decrypt
            byte[] decryptedBytes = encryptionService.decrypt(metadata.encryptedContent, key);

            // 4. Return the ACTUAL file
            ContentDisposition contentDisposition = ContentDisposition.attachment()
                    .filename(metadata.originalFilename, StandardCharsets.UTF_8)
                    .build();

            return ResponseEntity.ok()
                    .header("Content-Disposition", contentDisposition.toString())
                    .header("Content-Type", metadata.contentType)
                    .body(decryptedBytes);

        } catch (Exception e) {
            logger.error("Error during file access for hash: {}", fileHash, e);
            return ResponseEntity.internalServerError().body("Error: An internal server error occurred");
        }
    }

    @PostMapping("/files/{fileHash}/view-token")
    public ResponseEntity<?> createViewToken(@PathVariable String fileHash, @RequestParam(value = "userAddress", required = false) String userAddress) {
        boolean accessAllowed = blockchainService.checkAccess(fileHash, userAddress);

        if (!accessAllowed) {
            return ResponseEntity.status(403).body("Access Denied: Time-Lock Expired on Blockchain");
        }

        // Check availability with minimal lookups
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
    public ResponseEntity<?> viewFile(@PathVariable String fileHash, @RequestParam("token") String token, @RequestParam(value = "userAddress", required = false) String userAddress) {
        ViewToken viewToken = viewTokens.get(token);

        if (viewToken == null || viewToken.isExpired()) {
            viewTokens.remove(token);
            return ResponseEntity.status(403).body("View token expired or invalid");
        }

        if (!viewToken.fileHash.equals(fileHash)) {
            return ResponseEntity.status(403).body("View token does not match requested file");
        }

        boolean accessAllowed = blockchainService.checkAccess(fileHash, userAddress);
        if (!accessAllowed) {
            return ResponseEntity.status(403).body("Access Denied: Time-Lock Expired on Blockchain");
        }

        try {
            // Retrieve Data (Atomic check-and-get to avoid redundant lookups)
            SecretKey key = keyStore.get(fileHash);
            if (key == null) {
                return ResponseEntity.status(404).body("File Key not found (Server Restarted?)");
            }

            FileMetadata metadata = mockStorage.get(fileHash);
            if (metadata == null) {
                return ResponseEntity.status(404).body("File Content not found (Server Restarted?)");
            }

            byte[] decryptedBytes = encryptionService.decrypt(metadata.encryptedContent, key);

            viewTokens.remove(token);

            ContentDisposition contentDisposition = ContentDisposition.inline()
                    .filename(metadata.originalFilename, StandardCharsets.UTF_8)
                    .build();

            return ResponseEntity.ok()
                    .header("Content-Disposition", contentDisposition.toString())
                    .header("Content-Type", metadata.contentType)
                    .body(decryptedBytes);

        } catch (Exception e) {
            logger.error("Error during file view for hash: {}", fileHash, e);
            return ResponseEntity.internalServerError().body("Error: An internal server error occurred");
        }
    }

    @PostMapping("/files/{fileHash}/share")
    public ResponseEntity<?> shareFile(@PathVariable String fileHash,
            @RequestParam("ownerAddress") String ownerAddress,
            @RequestParam("shareWithAddress") String shareWithAddress,
            @RequestParam(value = "privateKey", required = false) String privateKey) {
        try {
            blockchainService.shareFile(fileHash, ownerAddress, shareWithAddress, privateKey);
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "File shared successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error sharing file on blockchain for hash: {}", fileHash, e);
            return ResponseEntity.internalServerError().body("Error sharing file");
        }
    }

    @GetMapping("/user/{userAddress}/files")
    public ResponseEntity<?> getUserFiles(@PathVariable String userAddress) {
        try {
            String[] files = blockchainService.getUserFiles(userAddress);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            logger.error("Error fetching user files for address: {}", userAddress, e);
            return ResponseEntity.internalServerError().body("Error fetching user files");
        }
    }

    @GetMapping("/user/{userAddress}/shared-files")
    public ResponseEntity<?> getSharedFiles(@PathVariable String userAddress) {
        try {
            String[] files = blockchainService.getSharedFiles(userAddress);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            logger.error("Error fetching shared files for address: {}", userAddress, e);
            return ResponseEntity.internalServerError().body("Error fetching shared files");
        }
    }

    @GetMapping("/files/{fileHash}/metadata")
    public ResponseEntity<?> getFileMetadata(@PathVariable String fileHash) {
        FileMetadata metadata = mockStorage.get(fileHash);
        if (metadata == null) {
            return ResponseEntity.status(404).body("File not found");
        }
        Map<String, String> response = new HashMap<>();
        response.put("filename", metadata.originalFilename);
        response.put("contentType", metadata.contentType);
        return ResponseEntity.ok(response);
    }
}
