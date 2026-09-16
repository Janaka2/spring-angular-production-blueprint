package me.janaka.assetcare.application.port;

import java.util.Optional;
import java.util.UUID;
import me.janaka.assetcare.application.query.AssetQuery;
import me.janaka.assetcare.application.query.PageResult;
import me.janaka.assetcare.domain.Asset;

public interface AssetRepository {
    Asset save(Asset asset);
    Optional<Asset> findById(UUID id);
    PageResult<Asset> search(AssetQuery query);
    long countByOwnerAndNotArchived(String owner);
    void delete(Asset asset);
}
