package me.janaka.assetcare.application;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import me.janaka.assetcare.application.port.AssetRepository;
import me.janaka.assetcare.application.port.CategoryRepository;
import me.janaka.assetcare.application.port.CurrentUser;
import me.janaka.assetcare.application.port.IdempotencyRepository;
import me.janaka.assetcare.application.port.ServiceRecordRepository;
import me.janaka.assetcare.application.query.AssetQuery;
import me.janaka.assetcare.application.query.PageResult;
import me.janaka.assetcare.domain.Asset;
import me.janaka.assetcare.domain.AssetStatus;
import me.janaka.assetcare.domain.AuditOperation;
import me.janaka.assetcare.domain.Category;
import me.janaka.assetcare.domain.InvalidStateException;
import me.janaka.assetcare.domain.NotFoundException;
import me.janaka.assetcare.domain.ValidationException;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Use cases for the Asset aggregate. Every write is one transaction that also writes its audit event. */
@Service
@Transactional
public class AssetService {

    public static final String ENTITY = "Asset";

    private final AssetRepository assets;
    private final CategoryRepository categories;
    private final ServiceRecordRepository serviceRecords;
    private final IdempotencyRepository idempotency;
    private final AuthorizationPolicy authz;
    private final AuditRecorder audit;
    private final Clock clock;

    public AssetService(AssetRepository assets, CategoryRepository categories, ServiceRecordRepository serviceRecords,
                        IdempotencyRepository idempotency, AuthorizationPolicy authz, AuditRecorder audit, Clock clock) {
        this.assets = assets; this.categories = categories; this.serviceRecords = serviceRecords;
        this.idempotency = idempotency; this.authz = authz; this.audit = audit; this.clock = clock;
    }

    /**
     * Creates an asset. With an Idempotency-Key, a retried identical request returns the asset created the first time;
     * the same key with a different body is a conflict, because silently returning a different asset would hide a bug.
     */
    public Asset create(CurrentUser user, Asset.Details details, UUID categoryId, @Nullable String idempotencyKey, String requestHash) {
        authz.requireCanCreate(user);
        if (idempotencyKey != null) {
            var previous = idempotency.find(user.subject(), idempotencyKey);
            if (previous.isPresent()) {
                if (!previous.get().requestHash().equals(requestHash))
                    throw new InvalidStateException("Idempotency-Key was already used with a different request body");
                return assets.findById(previous.get().entityId()).orElseThrow(() -> new NotFoundException(ENTITY, previous.get().entityId()));
            }
        }
        var asset = assets.save(Asset.create(details, activeCategory(categoryId), user.subject(), Instant.now(clock)));
        if (idempotencyKey != null)
            idempotency.save(new IdempotencyRepository.Entry(user.subject(), idempotencyKey, requestHash, asset.id(), Instant.now(clock)));
        audit.record(user, AuditOperation.CREATE, ENTITY, asset.id(), AuditRecorder.diff(emptyDetails(), details));
        return asset;
    }

    @Transactional(readOnly = true)
    public Asset get(CurrentUser user, UUID id) {
        var asset = assets.findById(id).orElseThrow(() -> new NotFoundException(ENTITY, id));
        authz.requireCanRead(user, asset);
        return asset;
    }

    @Transactional(readOnly = true)
    public PageResult<Asset> search(CurrentUser user, AssetQuery query) {
        return assets.search(authz.seesOnlyOwn(user) ? query.withOwner(user.subject()) : query);
    }

    /** Updates the editable details. {@code expectedVersion} comes from If-Match; a mismatch is a 409 before any write. */
    public Asset update(CurrentUser user, UUID id, long expectedVersion, Asset.Details details, UUID categoryId) {
        var asset = get(user, id);
        authz.requireCanWrite(user, asset);
        requireVersion(asset, expectedVersion);
        var before = asset.details();
        asset.update(details, activeCategory(categoryId), user.subject(), Instant.now(clock));
        audit.record(user, AuditOperation.UPDATE, ENTITY, id, AuditRecorder.diff(before, details));
        return assets.save(asset);
    }

    public Asset changeStatus(CurrentUser user, UUID id, long expectedVersion, AssetStatus target) {
        var asset = get(user, id);
        authz.requireCanWrite(user, asset);
        requireVersion(asset, expectedVersion);
        var from = asset.status();
        asset.changeStatus(target, user.subject(), Instant.now(clock));
        audit.record(user, AuditOperation.STATUS_CHANGE, ENTITY, id, Map.of("status", new AuditRecorder.Change(from, target)));
        return assets.save(asset);
    }

    /** DELETE in the API: archive. The record and its history remain (ADR-010). */
    public void archive(CurrentUser user, UUID id) {
        var asset = get(user, id);
        authz.requireCanWrite(user, asset);
        if (asset.isArchived()) return;                       // idempotent: deleting twice is not an error
        var from = asset.status();
        asset.archive(user.subject(), Instant.now(clock));
        audit.record(user, AuditOperation.ARCHIVE, ENTITY, id, Map.of("status", new AuditRecorder.Change(from, AssetStatus.ARCHIVED)));
        assets.save(asset);
    }

    public Asset restore(CurrentUser user, UUID id) {
        authz.requireAdmin(user);
        var asset = assets.findById(id).orElseThrow(() -> new NotFoundException(ENTITY, id));
        asset.restore(user.subject(), Instant.now(clock));
        audit.record(user, AuditOperation.RESTORE, ENTITY, id, Map.of("status", new AuditRecorder.Change(AssetStatus.ARCHIVED, AssetStatus.ACTIVE)));
        return assets.save(asset);
    }

    /** Physical delete: admin only, archived only, and only when no service history references the asset. */
    public void hardDelete(CurrentUser user, UUID id) {
        authz.requireAdmin(user);
        var asset = assets.findById(id).orElseThrow(() -> new NotFoundException(ENTITY, id));
        if (!asset.isArchived()) throw new InvalidStateException("only an archived asset can be deleted permanently");
        if (serviceRecords.existsForAsset(id)) throw new InvalidStateException("an asset with service history cannot be deleted permanently");
        audit.record(user, AuditOperation.DELETE, ENTITY, id, Map.of("name", new AuditRecorder.Change(asset.name(), null)));
        assets.delete(asset);
    }

    private Category activeCategory(UUID categoryId) {
        var c = categories.findById(categoryId).orElseThrow(() -> new ValidationException("unknown category " + categoryId));
        if (!c.active()) throw new ValidationException("category " + c.code() + " is inactive");
        return c;
    }

    private static void requireVersion(Asset asset, long expectedVersion) {
        if (asset.version() != expectedVersion)
            throw new StaleVersionException(asset.version(), expectedVersion, asset.audit().updatedBy(), asset.audit().updatedAt());
    }

    private static Asset.Details emptyDetails() {
        return new Asset.Details("(new)", null, null, null, null, null, null, null, null, null, null);
    }
}
