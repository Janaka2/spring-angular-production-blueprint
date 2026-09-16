package me.janaka.assetcare.adapter.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;
import me.janaka.assetcare.application.port.IdempotencyRepository;

/** Row of idempotency_key. Purely an adapter concern, so it is not a domain class. */
@Entity
@Table(name = "idempotency_key")
class IdempotencyKeyEntity {

    @Embeddable
    record Key(@Column(name = "owner", length = 120) String owner, @Column(name = "key", length = 64) String key) implements Serializable {}

    @EmbeddedId private Key id;
    @Column(name = "request_hash", nullable = false, length = 64) private String requestHash;
    @Column(name = "entity_id", nullable = false) private UUID entityId;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected IdempotencyKeyEntity() {}

    IdempotencyKeyEntity(IdempotencyRepository.Entry e) {
        this.id = new Key(e.owner(), e.key()); this.requestHash = e.requestHash(); this.entityId = e.entityId(); this.createdAt = e.createdAt();
    }

    IdempotencyRepository.Entry toEntry() { return new IdempotencyRepository.Entry(id.owner(), id.key(), requestHash, entityId, createdAt); }
}
