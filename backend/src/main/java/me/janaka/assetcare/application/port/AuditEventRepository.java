package me.janaka.assetcare.application.port;

import java.util.List;
import java.util.UUID;
import me.janaka.assetcare.domain.AuditEvent;

public interface AuditEventRepository {
    AuditEvent save(AuditEvent event);
    List<AuditEvent> findByEntity(String entityType, UUID entityId);
}
