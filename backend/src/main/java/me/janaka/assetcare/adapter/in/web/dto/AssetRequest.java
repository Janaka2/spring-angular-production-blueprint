package me.janaka.assetcare.adapter.in.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import me.janaka.assetcare.domain.Asset;
import me.janaka.assetcare.domain.Money;
import org.jspecify.annotations.Nullable;

/** Exactly the fields a client may set. Ownership, status, version and audit columns are never accepted from a client. */
public record AssetRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 2000) @Nullable String description,
        @Size(max = 60) @Nullable String assetTag,
        @Size(max = 120) @Nullable String serialNumber,
        @NotNull UUID categoryId,
        @Size(max = 120) @Nullable String manufacturer,
        @Size(max = 120) @Nullable String model,
        @Nullable LocalDate purchaseDate,
        @DecimalMin("0") @Digits(integer = 12, fraction = 2) @Nullable BigDecimal purchasePrice,
        @Pattern(regexp = "[A-Za-z]{3}") @Nullable String currency,
        @Nullable LocalDate warrantyUntil,
        @Size(max = 200) @Nullable String location,
        @Size(max = 4000) @Nullable String notes) {

    public Asset.Details toDetails() {
        return new Asset.Details(name, blankToNull(description), blankToNull(assetTag), blankToNull(serialNumber),
                blankToNull(manufacturer), blankToNull(model), purchaseDate, Money.orNull(purchasePrice, currency),
                warrantyUntil, blankToNull(location), blankToNull(notes));
    }

    static @Nullable String blankToNull(@Nullable String s) { return s == null || s.isBlank() ? null : s.strip(); }
}
