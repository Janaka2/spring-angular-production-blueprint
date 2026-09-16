package me.janaka.assetcare.domain;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/** What was done to an asset, when, by whom, for how much. Immutable once written: history is not edited. */
@Entity
@Table(name = "service_record")
public class ServiceRecord {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "asset_id") private Asset asset;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "maintenance_item_id") private @Nullable MaintenanceItem maintenanceItem;
    @Column(name = "performed_on", nullable = false) private LocalDate performedOn;
    @Column(name = "performed_by", length = 200) private @Nullable String performedBy;
    @Column(nullable = false, length = 500) private String summary;
    @Embedded @AttributeOverrides({
            @AttributeOverride(name = "amount", column = @Column(name = "cost", precision = 14, scale = 2)),
            @AttributeOverride(name = "currency", column = @Column(name = "currency", length = 3))})
    private @Nullable Money cost;
    @Column(length = 2000) private @Nullable String notes;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "created_by", nullable = false, updatable = false, length = 120) private String createdBy;

    protected ServiceRecord() {}

    public static ServiceRecord record(Asset asset, @Nullable MaintenanceItem item, LocalDate performedOn,
                                       @Nullable String performedBy, String summary, @Nullable Money cost,
                                       @Nullable String notes, String by, Instant now) {
        if (summary == null || summary.isBlank()) throw new ValidationException("summary is required");
        if (performedOn.isAfter(LocalDate.ofInstant(now, java.time.ZoneOffset.UTC).plusDays(1)))
            throw new ValidationException("performedOn cannot be in the future");
        var r = new ServiceRecord();
        r.id = UUID.randomUUID(); r.asset = asset; r.maintenanceItem = item; r.performedOn = performedOn;
        r.performedBy = performedBy; r.summary = summary; r.cost = cost; r.notes = notes;
        r.createdAt = now; r.createdBy = by;
        return r;
    }

    public UUID id() { return id; }
    public Asset asset() { return asset; }
    public @Nullable MaintenanceItem maintenanceItem() { return maintenanceItem; }
    public LocalDate performedOn() { return performedOn; }
    public @Nullable String performedBy() { return performedBy; }
    public String summary() { return summary; }
    public @Nullable Money cost() { return cost; }
    public @Nullable String notes() { return notes; }
    public Instant createdAt() { return createdAt; }
    public String createdBy() { return createdBy; }
}
