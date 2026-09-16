package me.janaka.assetcare.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.jspecify.annotations.Nullable;

/**
 * A business audit record: who did what to which entity, which fields changed, under which request and trace.
 * Written in the same transaction as the change. Append-only; there is no update method on purpose.
 */
@Entity
@Table(name = "audit_event")
public class AuditEvent {
    @Id private UUID id;
    @Column(name = "occurred_at", nullable = false) private Instant occurredAt;
    @Column(nullable = false, length = 120) private String actor;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private AuditOperation operation;
    @Column(name = "entity_type", nullable = false, length = 40) private String entityType;
    @Column(name = "entity_id", nullable = false) private UUID entityId;
    /** JSON object {@code {"field": {"from": …, "to": …}}}; stored as jsonb on PostgreSQL. */
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "changed_fields") private @Nullable String changedFields;
    @Column(name = "request_id", length = 64) private @Nullable String requestId;
    @Column(name = "trace_id", length = 32) private @Nullable String traceId;

    protected AuditEvent() {}

    public static AuditEvent of(Instant now, String actor, AuditOperation op, String entityType, UUID entityId,
                                @Nullable String changedFieldsJson, @Nullable String requestId, @Nullable String traceId) {
        var e = new AuditEvent();
        e.id = UUID.randomUUID(); e.occurredAt = now; e.actor = actor; e.operation = op; e.entityType = entityType;
        e.entityId = entityId; e.changedFields = changedFieldsJson; e.requestId = requestId; e.traceId = traceId;
        return e;
    }

    public UUID id() { return id; }
    public Instant occurredAt() { return occurredAt; }
    public String actor() { return actor; }
    public AuditOperation operation() { return operation; }
    public String entityType() { return entityType; }
    public UUID entityId() { return entityId; }
    public @Nullable String changedFields() { return changedFields; }
    public @Nullable String requestId() { return requestId; }
    public @Nullable String traceId() { return traceId; }
}
