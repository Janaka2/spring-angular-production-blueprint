package me.janaka.assetcare.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

interface IdempotencyJpaRepository extends JpaRepository<IdempotencyKeyEntity, IdempotencyKeyEntity.Key> {}
