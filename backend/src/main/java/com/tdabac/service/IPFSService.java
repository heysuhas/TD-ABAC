package com.tdabac.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

@Service
public class IPFSService {

    // Assuming local IPFS node, can be configured via properties
    private final String IPFS_API_URL = "http://127.0.0.1:5001/api/v0/add";
    private final String IPFS_GATEWAY_URL = "http://127.0.0.1:8080/ipfs/";

    private final HttpClient httpClient = HttpClient.newHttpClient();

    // Simplified upload (In real world, use multipart body publisher)
    // For prototype, we might mock this or use a simple hack if no library is
    // allowed.
    // Since implementing full Multipart in Java native HTTP is verbose,
    // we will implement a Mock-ish version checking if we can actually reach IPFS,
    // or just assume it works and return a mock hash if connection fails (for
    // Verified Testing without IPFS node running).

    public String uploadFile(byte[] fileData) throws IOException, InterruptedException {
        // TODO: Implement actual Multipart upload.
        // For now, return a Mock Hash to allow development without running IPFS node.
        // If the user wants real IPFS, we need to add a library like
        // java-ipfs-http-client
        // or write the multipart body builder manually.

        // MOCK HASH for now:
        return "Qm" + System.currentTimeMillis() + "TestHash";
    }

    public byte[] getFile(String cid) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(IPFS_GATEWAY_URL + cid))
                .GET()
                .build();

        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

        if (response.statusCode() == 200) {
            return response.body();
        } else {
            throw new IOException("Failed to fetch from IPFS: " + response.statusCode());
        }
    }
}
