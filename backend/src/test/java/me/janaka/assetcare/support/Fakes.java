package me.janaka.assetcare.support;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import me.janaka.assetcare.application.port.AssetRepository;
import me.janaka.assetcare.application.port.AuditEventRepository;
import me.janaka.assetcare.application.port.CategoryRepository;
import me.janaka.assetcare.application.port.CurrentUser;
import me.janaka.assetcare.application.port.IdempotencyRepository;
import me.janaka.assetcare.application.port.MaintenanceItemRepository;
import me.janaka.assetcare.application.port.RequestContext;
import me.janaka.assetcare.application.port.ServiceRecordRepository;
import me.janaka.assetcare.application.query.AssetQuery;
import me.janaka.assetcare.application.query.PageResult;
import me.janaka.assetcare.domain.Asset;
import me.janaka.assetcare.domain.AssetStatus;
import me.janaka.assetcare.domain.AuditEvent;
import me.janaka.assetcare.domain.Category;
import me.janaka.assetcare.domain.MaintenanceItem;
import me.janaka.assetcare.domain.MaintenanceStatus;
import me.janaka.assetcare.domain.ServiceRecord;
import org.jspecify.annotations.Nullable;

/** In-memory ports for use-case tests. No Spring, no database: the rules are tested, not the plumbing. */
public final class Fakes {
    private Fakes() {}

    public static final Instant NOW = Instant.parse("2026-09-16T10:00:00Z");
    public static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    public record User(String subject, String displayName, Set<Role> roles) implements CurrentUser {}
    public static final User ALICE = new User("sub-alice", "alice", Set.of(CurrentUser.Role.USER));
    public static final User BOB = new User("sub-bob", "bob", Set.of(CurrentUser.Role.USER));
    public static final User ADMIN = new User("sub-admin", "admin", Set.of(CurrentUser.Role.USER, CurrentUser.Role.ADMIN));
    public static final User AUDREY = new User("sub-audrey", "audrey", Set.of(CurrentUser.Role.AUDITOR));

    public static final RequestContext REQUEST = new RequestContext() {
        @Override public String requestId() { return "req-1"; }
        @Override public String traceId() { return "trace-1"; }
    };

    public static final class Assets implements AssetRepository {
        public final Map<UUID, Asset> rows = new HashMap<>();
        @Override public Asset save(Asset a) { rows.put(a.id(), a); return a; }
        @Override public Optional<Asset> findById(UUID id) { return Optional.ofNullable(rows.get(id)); }
        @Override public long countByOwnerAndNotArchived(String owner) {
            return rows.values().stream().filter(a -> a.owner().equals(owner) && !a.isArchived()).count();
        }
        @Override public void delete(Asset a) { rows.remove(a.id()); }
        @Override public PageResult<Asset> search(AssetQuery q) {
            var all = rows.values().stream()
                    .filter(a -> q.owner() == null || a.owner().equals(q.owner()))
                    .filter(a -> q.status() != null ? a.status() == q.status() : q.includeArchived() || !a.isArchived())
                    .filter(a -> q.search() == null || a.name().toLowerCase().contains(q.search().toLowerCase()))
                    .sorted(Comparator.comparing(Asset::name)).toList();
            var from = Math.min(q.page() * q.size(), all.size());
            return new PageResult<>(all.subList(from, Math.min(from + q.size(), all.size())), q.page(), q.size(), all.size());
        }
    }

    public static final class Categories implements CategoryRepository {
        public final Map<UUID, Category> rows = new HashMap<>();
        public Category add(String code) { var c = Category.create(code, code, null, 10, NOW); rows.put(c.id(), c); return c; }
        @Override public Category save(Category c) { rows.put(c.id(), c); return c; }
        @Override public Optional<Category> findById(UUID id) { return Optional.ofNullable(rows.get(id)); }
        @Override public Optional<Category> findByCode(String code) { return rows.values().stream().filter(c -> c.code().equals(code)).findFirst(); }
        @Override public List<Category> findAllOrdered() { return new ArrayList<>(rows.values()); }
        @Override public boolean isReferencedByAssets(UUID id) { return false; }
    }

    public static final class Items implements MaintenanceItemRepository {
        public final Map<UUID, MaintenanceItem> rows = new HashMap<>();
        @Override public MaintenanceItem save(MaintenanceItem m) { rows.put(m.id(), m); return m; }
        @Override public Optional<MaintenanceItem> findById(UUID id) { return Optional.ofNullable(rows.get(id)); }
        @Override public List<MaintenanceItem> findByAsset(UUID assetId) { return rows.values().stream().filter(m -> m.asset().id().equals(assetId)).toList(); }
        @Override public List<MaintenanceItem> findPlannedDueBy(String owner, LocalDate dueBy, int limit) {
            return rows.values().stream().filter(m -> m.asset().owner().equals(owner) && m.status() == MaintenanceStatus.PLANNED
                    && !m.dueDate().isAfter(dueBy)).limit(limit).toList();
        }
    }

    public static final class Records implements ServiceRecordRepository {
        public final List<ServiceRecord> rows = new ArrayList<>();
        @Override public ServiceRecord save(ServiceRecord r) { rows.add(r); return r; }
        @Override public List<ServiceRecord> findByAsset(UUID assetId) { return rows.stream().filter(r -> r.asset().id().equals(assetId)).toList(); }
        @Override public boolean existsForAsset(UUID assetId) { return rows.stream().anyMatch(r -> r.asset().id().equals(assetId)); }
    }

    public static final class Audit implements AuditEventRepository {
        public final List<AuditEvent> rows = new ArrayList<>();
        @Override public AuditEvent save(AuditEvent e) { rows.add(e); return e; }
        @Override public List<AuditEvent> findByEntity(String type, UUID id) {
            return rows.stream().filter(e -> e.entityType().equals(type) && e.entityId().equals(id)).toList();
        }
    }

    public static final class Idempotency implements IdempotencyRepository {
        public final Map<String, Entry> rows = new HashMap<>();
        @Override public Optional<Entry> find(String owner, String key) { return Optional.ofNullable(rows.get(owner + "/" + key)); }
        @Override public void save(Entry e) { rows.put(e.owner() + "/" + e.key(), e); }
    }

    public static Asset.Details details(String name) {
        return new Asset.Details(name, null, null, null, null, null, null, null, null, null, null);
    }

    public static @Nullable AssetStatus none() { return null; }
}
