package me.janaka.assetcare.adapter.out.persistence;

import java.util.Optional;
import me.janaka.assetcare.application.port.IdempotencyRepository;
import org.springframework.stereotype.Repository;

@Repository
class IdempotencyRepositoryAdapter implements IdempotencyRepository {
    private final IdempotencyJpaRepository jpa;

    IdempotencyRepositoryAdapter(IdempotencyJpaRepository jpa) { this.jpa = jpa; }

    @Override public Optional<Entry> find(String owner, String key) {
        return jpa.findById(new IdempotencyKeyEntity.Key(owner, key)).map(IdempotencyKeyEntity::toEntry);
    }

    @Override public void save(Entry entry) { jpa.save(new IdempotencyKeyEntity(entry)); }
}
