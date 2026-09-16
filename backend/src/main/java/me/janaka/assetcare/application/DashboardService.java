package me.janaka.assetcare.application;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import me.janaka.assetcare.application.port.AssetRepository;
import me.janaka.assetcare.application.port.CurrentUser;
import me.janaka.assetcare.application.port.MaintenanceItemRepository;
import me.janaka.assetcare.application.query.AssetQuery;
import me.janaka.assetcare.domain.Asset;
import me.janaka.assetcare.domain.MaintenanceItem;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The numbers on the first screen: how many assets, what is due, what warranty ends soon. */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    public record Summary(long assets, List<MaintenanceItem> dueSoon, List<Asset> warrantyEndingSoon, LocalDate today) {}

    private final AssetRepository assets;
    private final MaintenanceItemRepository items;
    private final AuthorizationPolicy authz;
    private final Clock clock;

    public DashboardService(AssetRepository assets, MaintenanceItemRepository items, AuthorizationPolicy authz, Clock clock) {
        this.assets = assets; this.items = items; this.authz = authz; this.clock = clock;
    }

    public Summary summary(CurrentUser user) {
        var today = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
        @Nullable String owner = authz.seesOnlyOwn(user) ? user.subject() : null;
        var page = assets.search(new AssetQuery(owner, null, null, null, false, 0, 100, AssetQuery.Sort.DEFAULT));
        var warranty = page.items().stream().filter(a -> a.warrantyExpiresWithin(today, 60)).limit(10).toList();
        var due = owner == null ? List.<MaintenanceItem>of() : items.findPlannedDueBy(owner, today.plusDays(30), 10);
        return new Summary(page.totalItems(), due, warranty, today);
    }
}
