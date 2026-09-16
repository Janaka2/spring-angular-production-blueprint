package me.janaka.assetcare.application.port;

import java.io.InputStream;

/** Where attachment bytes live. Filesystem locally, S3-compatible (MinIO, OCI Object Storage) elsewhere (ADR-007). */
public interface AttachmentStorage {
    /** Stores the bytes and returns the SHA-256 hex digest computed while streaming. */
    String store(String key, InputStream content, long sizeBytes, String contentType);
    InputStream open(String key);
    void delete(String key);
}
