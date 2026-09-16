package me.janaka.assetcare.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

public record CategoryRequest(
        @NotBlank @Pattern(regexp = "[A-Z][A-Z0-9_]{1,39}") String code,
        @NotBlank @Size(max = 80) String name,
        @Size(max = 500) @Nullable String description,
        int sortOrder,
        boolean active) {}
