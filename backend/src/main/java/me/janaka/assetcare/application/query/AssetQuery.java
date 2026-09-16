package me.janaka.assetcare.application.query;

import java.util.UUID;
import me.janaka.assetcare.domain.AssetStatus;
import me.janaka.assetcare.domain.ValidationException;
import org.jspecify.annotations.Nullable;

/** What a list request may ask for. Owner is set by the use case from the caller, never from the request. */
public record AssetQuery(
        @Nullable String owner,            // null = every owner (admin, auditor)
        @Nullable String search,           // matches name, asset tag, serial number, manufacturer, model
        @Nullable AssetStatus status,
        @Nullable UUID categoryId,
        boolean includeArchived,
        int page,
        int size,
        Sort sort) {

    public enum SortField { NAME, UPDATED_AT, PURCHASE_DATE, WARRANTY_UNTIL }
    public record Sort(SortField field, boolean descending) {
        public static final Sort DEFAULT = new Sort(SortField.UPDATED_AT, true);
    }

    public AssetQuery {
        if (page < 0) throw new ValidationException("page must be >= 0");
        if (size < 1) throw new ValidationException("size must be >= 1");
    }

    public AssetQuery withOwner(@Nullable String owner) {
        return new AssetQuery(owner, search, status, categoryId, includeArchived, page, size, sort);
    }
}
