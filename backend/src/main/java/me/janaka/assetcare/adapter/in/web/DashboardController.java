package me.janaka.assetcare.adapter.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import me.janaka.assetcare.adapter.in.web.dto.DashboardResponse;
import me.janaka.assetcare.adapter.in.web.dto.MeResponse;
import me.janaka.assetcare.application.DashboardService;
import me.janaka.assetcare.application.port.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Dashboard")
public class DashboardController {

    private final DashboardService dashboard;
    private final CurrentUser user;

    public DashboardController(DashboardService dashboard, CurrentUser user) { this.dashboard = dashboard; this.user = user; }

    @GetMapping("/dashboard")
    @Operation(summary = "Counts, what is due within 30 days, warranties ending within 60 days")
    public DashboardResponse summary() { return DashboardResponse.from(dashboard.summary(user)); }

    @GetMapping("/me")
    @Operation(summary = "The caller as the API sees them: subject, name and roles from the token")
    public MeResponse me() { return MeResponse.from(user); }
}
