package me.janaka.assetcare.adapter.in.web.dto;

import java.util.List;
import me.janaka.assetcare.application.query.PageResult;

public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {
    public static <T> PageResponse<T> from(PageResult<T> p) {
        return new PageResponse<>(p.items(), p.page(), p.size(), p.totalItems(), p.totalPages());
    }
}
