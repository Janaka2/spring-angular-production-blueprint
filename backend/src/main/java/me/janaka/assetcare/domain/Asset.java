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
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * The aggregate root: one physical thing somebody owns or operates.
 * Rules live here; controllers and repositories never change a field directly.
 */
@Entity
@Table(name = "asset")
public class Asset {

    /** Everything a person may set. One record, so the API cannot mass-assign anything else. */
    public record Details(
            String name, @Nullable String description, @Nullable String assetTag, @Nullable String serialNumber,
            @Nullable String manufacturer, @Nullable String model, @Nullable LocalDate purchaseDate,
            @Nullable Money purchasePrice, @Nullable LocalDate warrantyUntil, @Nullable String location,
            @Nullable String notes) {
        public Details {
            if (name == null || name.isBlank()) throw new ValidationException("name is required");
            if (name.length() > 120) throw new ValidationException("name is longer than 120 characters");
            if (purchaseDate != null && warrantyUntil != null && warrantyUntil.isBefore(purchaseDate))
                throw new ValidationException("warrantyUntil must not be before purchaseDate");
        }
    }

    @Id private UUID id;
    @Column(nullable = false, length = 120) private String name;
    @Column(length = 2000) private @Nullable String description;
    @Column(name = "asset_tag", length = 60) private @Nullable String assetTag;
    @Column(name = "serial_number", length = 120) private @Nullable String serialNumber;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "category_id") private Category category;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private AssetStatus status;
    @Column(length = 120) private @Nullable String manufacturer;
    @Column(length = 120) private @Nullable String model;
    @Column(name = "purchase_date") private @Nullable LocalDate purchaseDate;
    @Embedded @AttributeOverrides({
            @AttributeOverride(name = "amount", column = @Column(name = "purchase_price", precision = 14, scale = 2)),
            @AttributeOverride(name = "currency", column = @Column(name = "currency", length = 3))})
    private @Nullable Money purchasePrice;
    @Column(name = "warranty_until") private @Nullable LocalDate warrantyUntil;
    @Column(length = 200) private @Nullable String location;
    @Column(nullable = false, length = 120) private String owner;
    @Column(length = 4000) private @Nullable String notes;
    /** Optimistic lock: a stale browser session cannot silently overwrite another person's change. */
    @Version @Column(nullable = false) private long version;
    @Embedded private AuditColumns audit;
    @Column(name = "archived_at") private @Nullable Instant archivedAt;

    protected Asset() {}

    public static Asset create(Details d, Category category, String owner, Instant now) {
        var a = new Asset();
        a.id = UUID.randomUUID();
        a.status = AssetStatus.ACTIVE;
        a.owner = owner;
        a.category = category;
        a.audit = AuditColumns.created(now, owner);
        a.apply(d);
        return a;
    }

    public void update(Details d, Category category, String by, Instant now) {
        requireEditable();
        this.category = category;
        apply(d);
        audit.touch(now, by);
    }

    public void changeStatus(AssetStatus target, String by, Instant now) {
        if (target == AssetStatus.ARCHIVED) throw new InvalidStateException("use archive() to archive");
        transition(target, by, now);
    }

    /** DELETE in the API. The record and its history stay (ADR-010). */
    public void archive(String by, Instant now) {
        transition(AssetStatus.ARCHIVED, by, now);
        archivedAt = now;
    }

    public void restore(String by, Instant now) {
        transition(AssetStatus.ACTIVE, by, now);
        archivedAt = null;
    }

    private void transition(AssetStatus target, String by, Instant now) {
        if (!status.canTransitionTo(target))
            throw new InvalidStateException("an asset in status " + status + " cannot move to " + target);
        status = target;
        audit.touch(now, by);
    }

    private void requireEditable() {
        if (status == AssetStatus.ARCHIVED) throw new InvalidStateException("an archived asset cannot be edited; restore it first");
    }

    private void apply(Details d) {
        name = d.name(); description = d.description(); assetTag = d.assetTag(); serialNumber = d.serialNumber();
        manufacturer = d.manufacturer(); model = d.model(); purchaseDate = d.purchaseDate();
        purchasePrice = d.purchasePrice(); warrantyUntil = d.warrantyUntil(); location = d.location(); notes = d.notes();
    }

    public boolean isOwnedBy(String subject) { return owner.equals(subject); }
    public boolean isArchived() { return status == AssetStatus.ARCHIVED; }
    public boolean warrantyExpiresWithin(LocalDate today, int days) {
        return warrantyUntil != null && !warrantyUntil.isBefore(today) && !warrantyUntil.isAfter(today.plusDays(days));
    }

    public Details details() {
        return new Details(name, description, assetTag, serialNumber, manufacturer, model, purchaseDate,
                purchasePrice, warrantyUntil, location, notes);
    }

    public UUID id() { return id; }
    public String name() { return name; }
    public Category category() { return category; }
    public AssetStatus status() { return status; }
    public String owner() { return owner; }
    public long version() { return version; }
    public AuditColumns audit() { return audit; }
    public @Nullable Instant archivedAt() { return archivedAt; }
}
