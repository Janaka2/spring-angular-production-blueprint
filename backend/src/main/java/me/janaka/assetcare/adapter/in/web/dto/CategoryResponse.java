package me.janaka.assetcare.adapter.in.web.dto;

import java.util.UUID;
import me.janaka.assetcare.domain.Category;
import org.jspecify.annotations.Nullable;

public record CategoryResponse(UUID id, String code, String name, @Nullable String description, boolean active, int sortOrder) {
    public static CategoryResponse from(Category c) {
        return new CategoryResponse(c.id(), c.code(), c.name(), c.description(), c.active(), c.sortOrder());
    }
}
