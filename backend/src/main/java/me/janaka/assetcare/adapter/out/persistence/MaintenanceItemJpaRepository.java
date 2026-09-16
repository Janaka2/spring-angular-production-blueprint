package me.janaka.assetcare.adapter.out.persistence;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import me.janaka.assetcare.application.port.MaintenanceItemRepository;
import me.janaka.assetcare.domain.MaintenanceItem;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface MaintenanceItemJpaRepository extends JpaRepository<MaintenanceItem, UUID>, MaintenanceItemRepository {

    @Override
    @Query("select m from MaintenanceItem m where m.asset.id = :assetId order by m.dueDate, m.audit.createdAt")
    List<MaintenanceItem> findByAsset(UUID assetId);

    @Query("""
            select m from MaintenanceItem m join m.asset a
            where a.owner = :owner and a.status <> me.janaka.assetcare.domain.AssetStatus.ARCHIVED
              and m.status = me.janaka.assetcare.domain.MaintenanceStatus.PLANNED and m.dueDate <= :dueBy
            order by m.dueDate""")
    List<MaintenanceItem> findPlannedDueBy(String owner, LocalDate dueBy, Limit limit);

    @Override
    default List<MaintenanceItem> findPlannedDueBy(String owner, LocalDate dueBy, int limit) {
        return findPlannedDueBy(owner, dueBy, Limit.of(limit));
    }
}
