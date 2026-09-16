package me.janaka.assetcare.application;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import me.janaka.assetcare.application.port.CurrentUser;
import me.janaka.assetcare.application.port.MaintenanceItemRepository;
import me.janaka.assetcare.application.port.ServiceRecordRepository;
import me.janaka.assetcare.domain.AuditOperation;
import me.janaka.assetcare.domain.MaintenanceItem;
import me.janaka.assetcare.domain.Money;
import me.janaka.assetcare.domain.NotFoundException;
import me.janaka.assetcare.domain.ServiceRecord;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Maintenance items and the service records that complete them. */
@Service
@Transactional
public class MaintenanceService {

    public static final String ENTITY = "MaintenanceItem";

    private final MaintenanceItemRepository items;
    private final ServiceRecordRepository records;
    private final AssetService assetService;
    private final AuthorizationPolicy authz;
    private final AuditRecorder audit;
    private final Clock clock;

    public MaintenanceService(MaintenanceItemRepository items, ServiceRecordRepository records, AssetService assetService,
                              AuthorizationPolicy authz, AuditRecorder audit, Clock clock) {
        this.items = items; this.records = records; this.assetService = assetService;
        this.authz = authz; this.audit = audit; this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<MaintenanceItem> listForAsset(CurrentUser user, UUID assetId) {
        assetService.get(user, assetId);                       // 404 if the caller may not see the asset
        return items.findByAsset(assetId);
    }

    public MaintenanceItem plan(CurrentUser user, UUID assetId, MaintenanceItem.Details details) {
        var asset = assetService.get(user, assetId);
        authz.requireCanWrite(user, asset);
        var item = items.save(MaintenanceItem.plan(asset, details, user.subject(), Instant.now(clock)));
        audit.record(user, AuditOperation.CREATE, ENTITY, item.id(), Map.of("description", new AuditRecorder.Change(null, details.description())));
        return item;
    }

    public MaintenanceItem update(CurrentUser user, UUID itemId, MaintenanceItem.Details details) {
        var item = writable(user, itemId);
        item.update(details, user.subject(), Instant.now(clock));
        audit.record(user, AuditOperation.UPDATE, ENTITY, itemId, Map.of("dueDate", new AuditRecorder.Change(null, details.dueDate())));
        return items.save(item);
    }

    /** Completes the item with a service record; a recurring item's successor is planned in the same transaction. */
    public ServiceRecord complete(CurrentUser user, UUID itemId, LocalDate performedOn, @Nullable String performedBy,
                                  String summary, @Nullable Money cost, @Nullable String notes) {
        var item = writable(user, itemId);
        var now = Instant.now(clock);
        item.complete(performedOn, user.subject(), now).ifPresent(items::save);
        items.save(item);
        var record = records.save(ServiceRecord.record(item.asset(), item, performedOn, performedBy, summary, cost, notes, user.subject(), now));
        audit.record(user, AuditOperation.UPDATE, ENTITY, itemId, Map.of("status", new AuditRecorder.Change("PLANNED", "DONE")));
        audit.record(user, AuditOperation.CREATE, "ServiceRecord", record.id(), Map.of("summary", new AuditRecorder.Change(null, summary)));
        return record;
    }

    public void cancel(CurrentUser user, UUID itemId) {
        var item = writable(user, itemId);
        item.cancel(user.subject(), Instant.now(clock));
        items.save(item);
        audit.record(user, AuditOperation.UPDATE, ENTITY, itemId, Map.of("status", new AuditRecorder.Change("PLANNED", "CANCELLED")));
    }

    @Transactional(readOnly = true)
    public List<ServiceRecord> history(CurrentUser user, UUID assetId) {
        assetService.get(user, assetId);
        return records.findByAsset(assetId);
    }

    /** A service record that is not tied to a planned item (an unplanned repair). */
    public ServiceRecord recordService(CurrentUser user, UUID assetId, LocalDate performedOn, @Nullable String performedBy,
                                       String summary, @Nullable Money cost, @Nullable String notes) {
        var asset = assetService.get(user, assetId);
        authz.requireCanWrite(user, asset);
        var record = records.save(ServiceRecord.record(asset, null, performedOn, performedBy, summary, cost, notes, user.subject(), Instant.now(clock)));
        audit.record(user, AuditOperation.CREATE, "ServiceRecord", record.id(), Map.of("summary", new AuditRecorder.Change(null, summary)));
        return record;
    }

    private MaintenanceItem writable(CurrentUser user, UUID itemId) {
        var item = items.findById(itemId).orElseThrow(() -> new NotFoundException(ENTITY, itemId));
        authz.requireCanRead(user, item.asset());
        authz.requireCanWrite(user, item.asset());
        return item;
    }
}
