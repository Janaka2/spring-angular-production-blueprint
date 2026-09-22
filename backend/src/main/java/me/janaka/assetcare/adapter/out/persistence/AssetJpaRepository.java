package me.janaka.assetcare.adapter.out.persistence;

import java.util.Optional;
import java.util.UUID;
import me.janaka.assetcare.domain.Asset;
import me.janaka.assetcare.domain.AssetStatus;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

// category is fetched with the asset: responses are mapped after the transaction ends (open-in-view is off)
interface AssetJpaRepository extends JpaRepository<Asset, UUID>, JpaSpecificationExecutor<Asset> {
    long countByOwnerAndStatusNot(String owner, AssetStatus status);

    @Override
    @EntityGraph(attributePaths = "category")
    Optional<Asset> findById(UUID id);

    @Override
    @EntityGraph(attributePaths = "category")
    Page<Asset> findAll(@Nullable Specification<Asset> spec, Pageable pageable);
}
