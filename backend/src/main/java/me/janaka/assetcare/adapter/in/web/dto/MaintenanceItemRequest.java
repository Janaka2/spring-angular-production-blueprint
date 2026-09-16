package me.janaka.assetcare.adapter.in.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import me.janaka.assetcare.domain.MaintenanceItem;
import me.janaka.assetcare.domain.MaintenanceType;
import me.janaka.assetcare.domain.Money;
import me.janaka.assetcare.domain.Recurrence;
import org.jspecify.annotations.Nullable;

public record MaintenanceItemRequest(
        @NotNull MaintenanceType type,
        @NotBlank @Size(max = 500) String description,
        @NotNull LocalDate dueDate,
        @Size(max = 20) @Nullable String recurrence,
        @DecimalMin("0") @Digits(integer = 12, fraction = 2) @Nullable BigDecimal cost,
        @Pattern(regexp = "[A-Za-z]{3}") @Nullable String currency,
        @Size(max = 200) @Nullable String serviceProvider,
        @Size(max = 2000) @Nullable String notes) {

    public MaintenanceItem.Details toDetails() {
        return new MaintenanceItem.Details(type, description.strip(), dueDate, Recurrence.orNull(recurrence),
                Money.orNull(cost, currency), AssetRequest.blankToNull(serviceProvider), AssetRequest.blankToNull(notes));
    }
}
