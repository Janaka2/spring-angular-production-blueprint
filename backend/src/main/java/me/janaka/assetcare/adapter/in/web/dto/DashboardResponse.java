package me.janaka.assetcare.adapter.in.web.dto;

import java.time.LocalDate;
import java.util.List;
import me.janaka.assetcare.application.DashboardService;

public record DashboardResponse(long assets, List<MaintenanceItemResponse> dueSoon, List<AssetResponse> warrantyEndingSoon, LocalDate today) {
    public static DashboardResponse from(DashboardService.Summary s) {
        return new DashboardResponse(s.assets(),
                s.dueSoon().stream().map(m -> MaintenanceItemResponse.from(m, s.today())).toList(),
                s.warrantyEndingSoon().stream().map(AssetResponse::from).toList(), s.today());
    }
}
