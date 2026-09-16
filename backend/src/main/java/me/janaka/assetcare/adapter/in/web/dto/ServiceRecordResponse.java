package me.janaka.assetcare.adapter.in.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import me.janaka.assetcare.domain.ServiceRecord;
import org.jspecify.annotations.Nullable;

public record ServiceRecordResponse(
        UUID id, UUID assetId, @Nullable UUID maintenanceItemId, LocalDate performedOn, @Nullable String performedBy,
        String summary, @Nullable BigDecimal cost, @Nullable String currency, @Nullable String notes,
        Instant createdAt, String createdBy) {

    public static ServiceRecordResponse from(ServiceRecord r) {
        return new ServiceRecordResponse(r.id(), r.asset().id(), r.maintenanceItem() == null ? null : r.maintenanceItem().id(),
                r.performedOn(), r.performedBy(), r.summary(), r.cost() == null ? null : r.cost().amount(),
                r.cost() == null ? null : r.cost().currency(), r.notes(), r.createdAt(), r.createdBy());
    }
}
