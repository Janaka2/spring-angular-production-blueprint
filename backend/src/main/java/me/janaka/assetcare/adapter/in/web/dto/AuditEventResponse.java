package me.janaka.assetcare.adapter.in.web.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;
import java.time.Instant;
import java.util.UUID;
import me.janaka.assetcare.domain.AuditEvent;
import me.janaka.assetcare.domain.AuditOperation;
import org.jspecify.annotations.Nullable;

public record AuditEventResponse(UUID id, Instant occurredAt, String actor, AuditOperation operation, String entityType,
                                 UUID entityId, @JsonRawValue @Nullable String changedFields,
                                 @Nullable String requestId, @Nullable String traceId) {
    public static AuditEventResponse from(AuditEvent e) {
        return new AuditEventResponse(e.id(), e.occurredAt(), e.actor(), e.operation(), e.entityType(), e.entityId(),
                e.changedFields(), e.requestId(), e.traceId());
    }
}
