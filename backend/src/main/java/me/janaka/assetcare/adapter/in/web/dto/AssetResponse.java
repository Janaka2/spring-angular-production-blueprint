package me.janaka.assetcare.adapter.in.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import me.janaka.assetcare.domain.Asset;
import me.janaka.assetcare.domain.AssetStatus;
import org.jspecify.annotations.Nullable;

public record AssetResponse(
        UUID id, String name, @Nullable String description, @Nullable String assetTag, @Nullable String serialNumber,
        CategoryResponse category, AssetStatus status, @Nullable String manufacturer, @Nullable String model,
        @Nullable LocalDate purchaseDate, @Nullable BigDecimal purchasePrice, @Nullable String currency,
        @Nullable LocalDate warrantyUntil, @Nullable String location, String owner, @Nullable String notes,
        long version, Instant createdAt, String createdBy, Instant updatedAt, String updatedBy, @Nullable Instant archivedAt) {

    public static AssetResponse from(Asset a) {
        var d = a.details();
        return new AssetResponse(a.id(), d.name(), d.description(), d.assetTag(), d.serialNumber(),
                CategoryResponse.from(a.category()), a.status(), d.manufacturer(), d.model(), d.purchaseDate(),
                d.purchasePrice() == null ? null : d.purchasePrice().amount(),
                d.purchasePrice() == null ? null : d.purchasePrice().currency(),
                d.warrantyUntil(), d.location(), a.owner(), d.notes(), a.version(),
                a.audit().createdAt(), a.audit().createdBy(), a.audit().updatedAt(), a.audit().updatedBy(), a.archivedAt());
    }

    public String etag() { return "\"" + version + "\""; }
}
