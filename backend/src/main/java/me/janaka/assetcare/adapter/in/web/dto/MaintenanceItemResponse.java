package me.janaka.assetcare.adapter.in.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import me.janaka.assetcare.domain.MaintenanceItem;
import me.janaka.assetcare.domain.MaintenanceStatus;
import me.janaka.assetcare.domain.MaintenanceType;
import org.jspecify.annotations.Nullable;

public record MaintenanceItemResponse(
        UUID id, UUID assetId, String assetName, MaintenanceType type, String description, LocalDate dueDate,
        @Nullable String recurrence, MaintenanceStatus status, MaintenanceItem.Urgency urgency,
        @Nullable LocalDate completedDate, @Nullable BigDecimal cost, @Nullable String currency,
        @Nullable String serviceProvider, @Nullable String notes, long version) {

    public static MaintenanceItemResponse from(MaintenanceItem m, LocalDate today) {
        return new MaintenanceItemResponse(m.id(), m.asset().id(), m.asset().name(), m.type(), m.description(), m.dueDate(),
                m.recurrence() == null ? null : m.recurrence().period(), m.status(), m.urgency(today), m.completedDate(),
                m.cost() == null ? null : m.cost().amount(), m.cost() == null ? null : m.cost().currency(),
                m.serviceProvider(), m.notes(), m.version());
    }
}
