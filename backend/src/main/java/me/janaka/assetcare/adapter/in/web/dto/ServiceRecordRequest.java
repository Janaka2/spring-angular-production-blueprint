package me.janaka.assetcare.adapter.in.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import me.janaka.assetcare.domain.Money;
import org.jspecify.annotations.Nullable;

/** Used both to complete a planned item and to record an unplanned repair. */
public record ServiceRecordRequest(
        @NotNull LocalDate performedOn,
        @Size(max = 200) @Nullable String performedBy,
        @NotBlank @Size(max = 500) String summary,
        @DecimalMin("0") @Digits(integer = 12, fraction = 2) @Nullable BigDecimal cost,
        @Pattern(regexp = "[A-Za-z]{3}") @Nullable String currency,
        @Size(max = 2000) @Nullable String notes) {

    public @Nullable Money money() { return Money.orNull(cost, currency); }
}
