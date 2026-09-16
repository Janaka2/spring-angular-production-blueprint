package me.janaka.assetcare.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Metadata of a stored file. The bytes live in object storage under {@code storageKey} (ADR-007). */
@Entity
@Table(name = "attachment")
public class Attachment {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "asset_id") private Asset asset;
    @Column(name = "file_name", nullable = false, length = 255) private String fileName;
    @Column(name = "content_type", nullable = false, length = 100) private String contentType;
    @Column(name = "size_bytes", nullable = false) private long sizeBytes;
    @Column(name = "storage_key", nullable = false, unique = true, length = 300) private String storageKey;
    @Column(nullable = false, length = 64) private String sha256;
    @Column(name = "uploaded_by", nullable = false, length = 120) private String uploadedBy;
    @Column(name = "uploaded_at", nullable = false) private Instant uploadedAt;

    protected Attachment() {}

    public static Attachment of(Asset asset, String fileName, String contentType, long sizeBytes, String storageKey,
                                String sha256, String by, Instant now) {
        var a = new Attachment();
        a.id = UUID.randomUUID(); a.asset = asset; a.fileName = sanitise(fileName); a.contentType = contentType;
        a.sizeBytes = sizeBytes; a.storageKey = storageKey; a.sha256 = sha256; a.uploadedBy = by; a.uploadedAt = now;
        return a;
    }

    /** Keep the name for display, strip anything that could be a path or a control character. */
    static String sanitise(String fileName) {
        var base = fileName.replace('\\', '/');
        base = base.substring(base.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "").strip();
        if (base.isEmpty() || base.equals(".") || base.equals("..")) throw new ValidationException("invalid file name");
        return base.length() > 255 ? base.substring(0, 255) : base;
    }

    public UUID id() { return id; }
    public Asset asset() { return asset; }
    public String fileName() { return fileName; }
    public String contentType() { return contentType; }
    public long sizeBytes() { return sizeBytes; }
    public String storageKey() { return storageKey; }
    public String sha256() { return sha256; }
    public String uploadedBy() { return uploadedBy; }
    public Instant uploadedAt() { return uploadedAt; }
}
