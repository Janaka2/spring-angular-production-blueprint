package me.janaka.assetcare.adapter.in.web.dto;

import jakarta.validation.constraints.NotNull;
import me.janaka.assetcare.domain.AssetStatus;

public record StatusChangeRequest(@NotNull AssetStatus status) {}
