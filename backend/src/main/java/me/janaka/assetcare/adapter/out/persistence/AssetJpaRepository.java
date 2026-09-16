package me.janaka.assetcare.adapter.out.persistence;

import java.util.UUID;
import me.janaka.assetcare.domain.Asset;
import me.janaka.assetcare.domain.AssetStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

interface AssetJpaRepository extends JpaRepository<Asset, UUID>, JpaSpecificationExecutor<Asset> {
    long countByOwnerAndStatusNot(String owner, AssetStatus status);
}
