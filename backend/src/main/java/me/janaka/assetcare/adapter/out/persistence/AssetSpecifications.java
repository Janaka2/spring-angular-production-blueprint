package me.janaka.assetcare.adapter.out.persistence;

import java.util.ArrayList;
import java.util.Locale;
import me.janaka.assetcare.application.query.AssetQuery;
import me.janaka.assetcare.domain.Asset;
import me.janaka.assetcare.domain.AssetStatus;
import org.springframework.data.jpa.domain.Specification;

/** Translates an AssetQuery into JPA criteria. lower(col) LIKE keeps the search portable across PostgreSQL and Oracle. */
final class AssetSpecifications {

    private AssetSpecifications() {}

    static Specification<Asset> from(AssetQuery q) {
        return (root, cq, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            if (q.owner() != null) predicates.add(cb.equal(root.get("owner"), q.owner()));
            if (q.status() != null) predicates.add(cb.equal(root.get("status"), q.status()));
            else if (!q.includeArchived()) predicates.add(cb.notEqual(root.get("status"), AssetStatus.ARCHIVED));
            if (q.categoryId() != null) predicates.add(cb.equal(root.get("category").get("id"), q.categoryId()));
            if (q.search() != null && !q.search().isBlank()) {
                var pattern = "%" + q.search().strip().toLowerCase(Locale.ROOT).replace("%", "\\%").replace("_", "\\_") + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("assetTag")), pattern),
                        cb.like(cb.lower(root.get("serialNumber")), pattern),
                        cb.like(cb.lower(root.get("manufacturer")), pattern),
                        cb.like(cb.lower(root.get("model")), pattern)));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
}
