package me.janaka.assetcare.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.time.Instant;

/** Who created and last changed a row, and when. Set by the application layer, never by the client. */
@Embeddable
public class AuditColumns {
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "created_by", nullable = false, updatable = false, length = 120) private String createdBy;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "updated_by", nullable = false, length = 120) private String updatedBy;

    protected AuditColumns() {}

    public static AuditColumns created(Instant now, String by) {
        var a = new AuditColumns();
        a.createdAt = now; a.createdBy = by; a.updatedAt = now; a.updatedBy = by;
        return a;
    }

    public void touch(Instant now, String by) { updatedAt = now; updatedBy = by; }

    public Instant createdAt() { return createdAt; }
    public String createdBy() { return createdBy; }
    public Instant updatedAt() { return updatedAt; }
    public String updatedBy() { return updatedBy; }
}
