package me.janaka.assetcare.domain;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/** Something that is due for an asset. Completing a recurring item schedules its successor. */
@Entity
@Table(name = "maintenance_item")
public class MaintenanceItem {

    public record Details(MaintenanceType type, String description, LocalDate dueDate, @Nullable Recurrence recurrence,
                          @Nullable Money cost, @Nullable String serviceProvider, @Nullable String notes) {
        public Details {
            if (description == null || description.isBlank()) throw new ValidationException("description is required");
        }
    }

    /** What the UI shows; derived, so an item cannot be "stale overdue" in the database. */
    public enum Urgency { PLANNED, DUE, OVERDUE, DONE, CANCELLED }

    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "asset_id") private Asset asset;
    @Enumerated(EnumType.STRING) @Column(name = "maintenance_type", nullable = false, length = 20) private MaintenanceType type;
    @Column(nullable = false, length = 500) private String description;
    @Column(name = "due_date", nullable = false) private LocalDate dueDate;
    @Column(length = 20) private @Nullable String recurrence;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private MaintenanceStatus status;
    @Column(name = "completed_date") private @Nullable LocalDate completedDate;
    @Embedded @AttributeOverrides({
            @AttributeOverride(name = "amount", column = @Column(name = "cost", precision = 14, scale = 2)),
            @AttributeOverride(name = "currency", column = @Column(name = "currency", length = 3))})
    private @Nullable Money cost;
    @Column(name = "service_provider", length = 200) private @Nullable String serviceProvider;
    @Column(length = 2000) private @Nullable String notes;
    @Version @Column(nullable = false) private long version;
    @Embedded private AuditColumns audit;

    protected MaintenanceItem() {}

    public static MaintenanceItem plan(Asset asset, Details d, String by, Instant now) {
        if (asset.isArchived()) throw new InvalidStateException("cannot plan maintenance for an archived asset");
        var m = new MaintenanceItem();
        m.id = UUID.randomUUID(); m.asset = asset; m.status = MaintenanceStatus.PLANNED;
        m.audit = AuditColumns.created(now, by);
        m.apply(d);
        return m;
    }

    public void update(Details d, String by, Instant now) {
        if (status != MaintenanceStatus.PLANNED) throw new InvalidStateException("only a planned item can be edited");
        apply(d);
        audit.touch(now, by);
    }

    /** Marks this item done and, when it recurs, returns the next occurrence to be persisted by the caller. */
    public Optional<MaintenanceItem> complete(LocalDate completedOn, String by, Instant now) {
        if (status != MaintenanceStatus.PLANNED) throw new InvalidStateException("item is already " + status);
        status = MaintenanceStatus.DONE;
        completedDate = completedOn;
        audit.touch(now, by);
        var r = Recurrence.orNull(recurrence);
        if (r == null) return Optional.empty();
        var next = plan(asset, new Details(type, description, r.next(dueDate), r, cost, serviceProvider, notes), by, now);
        return Optional.of(next);
    }

    public void cancel(String by, Instant now) {
        if (status != MaintenanceStatus.PLANNED) throw new InvalidStateException("item is already " + status);
        status = MaintenanceStatus.CANCELLED;
        audit.touch(now, by);
    }

    public Urgency urgency(LocalDate today) {
        return switch (status) {
            case DONE -> Urgency.DONE;
            case CANCELLED -> Urgency.CANCELLED;
            case PLANNED -> dueDate.isBefore(today) ? Urgency.OVERDUE
                    : !dueDate.isAfter(today.plusDays(14)) ? Urgency.DUE : Urgency.PLANNED;
        };
    }

    private void apply(Details d) {
        type = d.type(); description = d.description(); dueDate = d.dueDate();
        recurrence = d.recurrence() == null ? null : d.recurrence().period();
        cost = d.cost(); serviceProvider = d.serviceProvider(); notes = d.notes();
    }

    public UUID id() { return id; }
    public Asset asset() { return asset; }
    public MaintenanceType type() { return type; }
    public String description() { return description; }
    public LocalDate dueDate() { return dueDate; }
    public @Nullable Recurrence recurrence() { return Recurrence.orNull(recurrence); }
    public MaintenanceStatus status() { return status; }
    public @Nullable LocalDate completedDate() { return completedDate; }
    public @Nullable Money cost() { return cost; }
    public @Nullable String serviceProvider() { return serviceProvider; }
    public @Nullable String notes() { return notes; }
    public long version() { return version; }
    public AuditColumns audit() { return audit; }
}
