package me.janaka.assetcare.application.query;

import java.util.List;
import java.util.function.Function;

public record PageResult<T>(List<T> items, int page, int size, long totalItems) {
    public int totalPages() { return size == 0 ? 0 : (int) Math.ceil((double) totalItems / size); }
    public <R> PageResult<R> map(Function<T, R> f) { return new PageResult<>(items.stream().map(f).toList(), page, size, totalItems); }
}
