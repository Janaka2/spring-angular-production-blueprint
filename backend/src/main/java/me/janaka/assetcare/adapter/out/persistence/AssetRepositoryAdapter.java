package me.janaka.assetcare.adapter.out.persistence;

import java.util.Optional;
import java.util.UUID;
import me.janaka.assetcare.application.port.AssetRepository;
import me.janaka.assetcare.application.query.AssetQuery;
import me.janaka.assetcare.application.query.PageResult;
import me.janaka.assetcare.domain.Asset;
import me.janaka.assetcare.domain.AssetStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

@Repository
class AssetRepositoryAdapter implements AssetRepository {

    private final AssetJpaRepository jpa;

    AssetRepositoryAdapter(AssetJpaRepository jpa) { this.jpa = jpa; }

    @Override public Asset save(Asset asset) { return jpa.save(asset); }
    @Override public Optional<Asset> findById(UUID id) { return jpa.findById(id); }
    @Override public long countByOwnerAndNotArchived(String owner) { return jpa.countByOwnerAndStatusNot(owner, AssetStatus.ARCHIVED); }
    @Override public void delete(Asset asset) { jpa.delete(asset); }

    @Override
    public PageResult<Asset> search(AssetQuery query) {
        var property = switch (query.sort().field()) {
            case NAME -> "name";
            case UPDATED_AT -> "audit.updatedAt";
            case PURCHASE_DATE -> "purchaseDate";
            case WARRANTY_UNTIL -> "warrantyUntil";
        };
        var sort = Sort.by(query.sort().descending() ? Sort.Direction.DESC : Sort.Direction.ASC, property).and(Sort.by("id"));
        var page = jpa.findAll(AssetSpecifications.from(query), PageRequest.of(query.page(), query.size(), sort));
        return new PageResult<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements());
    }
}
