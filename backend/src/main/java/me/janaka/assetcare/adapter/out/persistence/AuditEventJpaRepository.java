package me.janaka.assetcare.adapter.out.persistence;

import java.util.List;
import java.util.UUID;
import me.janaka.assetcare.application.port.AuditEventRepository;
import me.janaka.assetcare.domain.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

interface AuditEventJpaRepository extends JpaRepository<AuditEvent, UUID>, AuditEventRepository {

    List<AuditEvent> findByEntityTypeAndEntityIdOrderByOccurredAtDesc(String entityType, UUID entityId);

    @Override
    default List<AuditEvent> findByEntity(String entityType, UUID entityId) {
        return findByEntityTypeAndEntityIdOrderByOccurredAtDesc(entityType, entityId);
    }
}
