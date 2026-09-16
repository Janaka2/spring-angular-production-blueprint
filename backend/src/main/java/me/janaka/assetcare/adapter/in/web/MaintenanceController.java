package me.janaka.assetcare.adapter.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import me.janaka.assetcare.adapter.in.web.dto.MaintenanceItemRequest;
import me.janaka.assetcare.adapter.in.web.dto.MaintenanceItemResponse;
import me.janaka.assetcare.adapter.in.web.dto.ServiceRecordRequest;
import me.janaka.assetcare.adapter.in.web.dto.ServiceRecordResponse;
import me.janaka.assetcare.application.MaintenanceService;
import me.janaka.assetcare.application.port.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Maintenance", description = "What is due, and what was done")
public class MaintenanceController {

    private final MaintenanceService maintenance;
    private final CurrentUser user;
    private final Clock clock;

    public MaintenanceController(MaintenanceService maintenance, CurrentUser user, Clock clock) {
        this.maintenance = maintenance; this.user = user; this.clock = clock;
    }

    @GetMapping("/assets/{assetId}/maintenance")
    @Operation(summary = "Maintenance items of an asset")
    public List<MaintenanceItemResponse> list(@PathVariable UUID assetId) {
        var today = today();
        return maintenance.listForAsset(user, assetId).stream().map(m -> MaintenanceItemResponse.from(m, today)).toList();
    }

    @PostMapping("/assets/{assetId}/maintenance")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Plan a maintenance item")
    public MaintenanceItemResponse plan(@PathVariable UUID assetId, @Valid @RequestBody MaintenanceItemRequest request) {
        return MaintenanceItemResponse.from(maintenance.plan(user, assetId, request.toDetails()), today());
    }

    @PutMapping("/maintenance/{itemId}")
    @Operation(summary = "Edit a planned item")
    public MaintenanceItemResponse update(@PathVariable UUID itemId, @Valid @RequestBody MaintenanceItemRequest request) {
        return MaintenanceItemResponse.from(maintenance.update(user, itemId, request.toDetails()), today());
    }

    @PostMapping("/maintenance/{itemId}/complete")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Complete an item with a service record", description = "A recurring item schedules its next occurrence.")
    public ServiceRecordResponse complete(@PathVariable UUID itemId, @Valid @RequestBody ServiceRecordRequest request) {
        return ServiceRecordResponse.from(maintenance.complete(user, itemId, request.performedOn(), request.performedBy(),
                request.summary().strip(), request.money(), request.notes()));
    }

    @DeleteMapping("/maintenance/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Cancel a planned item")
    public void cancel(@PathVariable UUID itemId) { maintenance.cancel(user, itemId); }

    @GetMapping("/assets/{assetId}/service-records")
    @Operation(summary = "Service history of an asset, newest first")
    public List<ServiceRecordResponse> history(@PathVariable UUID assetId) {
        return maintenance.history(user, assetId).stream().map(ServiceRecordResponse::from).toList();
    }

    @PostMapping("/assets/{assetId}/service-records")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Record an unplanned repair or service")
    public ServiceRecordResponse record(@PathVariable UUID assetId, @Valid @RequestBody ServiceRecordRequest request) {
        return ServiceRecordResponse.from(maintenance.recordService(user, assetId, request.performedOn(), request.performedBy(),
                request.summary().strip(), request.money(), request.notes()));
    }

    private LocalDate today() { return LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC); }
}
