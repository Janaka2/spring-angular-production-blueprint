package me.janaka.assetcare.application.port;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import me.janaka.assetcare.domain.MaintenanceItem;

public interface MaintenanceItemRepository {
    MaintenanceItem save(MaintenanceItem item);
    Optional<MaintenanceItem> findById(UUID id);
    List<MaintenanceItem> findByAsset(UUID assetId);
    /** Planned items for the owner's non-archived assets, due on or before the date, oldest first. */
    List<MaintenanceItem> findPlannedDueBy(String owner, LocalDate dueBy, int limit);
}
