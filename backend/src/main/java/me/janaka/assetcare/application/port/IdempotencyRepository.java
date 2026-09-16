package me.janaka.assetcare.application.port;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Remembers which entity a (owner, Idempotency-Key) pair produced, so a retried POST returns the same result. */
public interface IdempotencyRepository {
    record Entry(String owner, String key, String requestHash, UUID entityId, Instant createdAt) {}
    Optional<Entry> find(String owner, String key);
    void save(Entry entry);
}
