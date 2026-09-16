package me.janaka.assetcare.adapter.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import me.janaka.assetcare.adapter.in.web.dto.AssetRequest;
import me.janaka.assetcare.adapter.in.web.dto.AssetResponse;
import me.janaka.assetcare.adapter.in.web.dto.AuditEventResponse;
import me.janaka.assetcare.adapter.in.web.dto.PageResponse;
import me.janaka.assetcare.adapter.in.web.dto.StatusChangeRequest;
import me.janaka.assetcare.application.AssetService;
import me.janaka.assetcare.application.AuditQueryService;
import me.janaka.assetcare.application.port.CurrentUser;
import me.janaka.assetcare.application.query.AssetQuery;
import me.janaka.assetcare.configuration.AssetCareProperties;
import me.janaka.assetcare.domain.AssetStatus;
import me.janaka.assetcare.domain.ValidationException;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/v1/assets")
@Tag(name = "Assets", description = "The things you own or operate")
public class AssetController {

    private final AssetService assets;
    private final AuditQueryService auditQuery;
    private final CurrentUser user;
    private final int maxPageSize;

    public AssetController(AssetService assets, AuditQueryService auditQuery, CurrentUser user, AssetCareProperties props) {
        this.assets = assets; this.auditQuery = auditQuery; this.user = user; this.maxPageSize = props.api().maxPageSize();
    }

    @PostMapping
    @Operation(summary = "Create an asset",
            description = "Send an Idempotency-Key header to make retries safe: the same key with the same body returns the asset created the first time.")
    public ResponseEntity<AssetResponse> create(@Valid @RequestBody AssetRequest request,
                                                @RequestHeader(value = "Idempotency-Key", required = false) @Nullable String idempotencyKey) {
        if (idempotencyKey != null && !idempotencyKey.matches("[A-Za-z0-9._-]{8,64}"))
            throw new ValidationException("Idempotency-Key must be 8 to 64 characters of letters, digits, dot, underscore or hyphen");
        var asset = assets.create(user, request.toDetails(), request.categoryId(), idempotencyKey, sha256(request.toString()));
        var body = AssetResponse.from(asset);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(asset.id()).toUri();
        return ResponseEntity.created(location).eTag(body.etag()).body(body);
    }

    @GetMapping
    @Operation(summary = "List and search assets", description = "Paginated. Users see their own assets; admins and auditors see all.")
    public PageResponse<AssetResponse> list(
            @Parameter(description = "matches name, asset tag, serial number, manufacturer, model") @RequestParam(required = false) @Nullable String search,
            @RequestParam(required = false) @Nullable AssetStatus status,
            @RequestParam(required = false) @Nullable UUID categoryId,
            @RequestParam(defaultValue = "false") boolean includeArchived,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "field,direction: name|updatedAt|purchaseDate|warrantyUntil , asc|desc") @RequestParam(defaultValue = "updatedAt,desc") String sort) {
        var query = new AssetQuery(null, search, status, categoryId, includeArchived, page, Math.min(size, maxPageSize), parseSort(sort));
        return PageResponse.from(assets.search(user, query).map(AssetResponse::from));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one asset", description = "The ETag is the record version; send it back as If-Match on updates.")
    public ResponseEntity<AssetResponse> get(@PathVariable UUID id) {
        var body = AssetResponse.from(assets.get(user, id));
        return ResponseEntity.ok().eTag(body.etag()).body(body);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an asset", description = "Requires If-Match. A stale version returns 409 with who changed the record and when.")
    public ResponseEntity<AssetResponse> update(@PathVariable UUID id,
                                                @RequestHeader(value = "If-Match", required = false) @Nullable String ifMatch,
                                                @Valid @RequestBody AssetRequest request) {
        var body = AssetResponse.from(assets.update(user, id, Preconditions.requiredVersion(ifMatch), request.toDetails(), request.categoryId()));
        return ResponseEntity.ok().eTag(body.etag()).body(body);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Change lifecycle status", description = "ACTIVE, IN_REPAIR or RETIRED. Archiving is DELETE; restoring is POST /restore.")
    public ResponseEntity<AssetResponse> changeStatus(@PathVariable UUID id,
                                                      @RequestHeader(value = "If-Match", required = false) @Nullable String ifMatch,
                                                      @Valid @RequestBody StatusChangeRequest request) {
        var body = AssetResponse.from(assets.changeStatus(user, id, Preconditions.requiredVersion(ifMatch), request.status()));
        return ResponseEntity.ok().eTag(body.etag()).body(body);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Archive an asset", description = "The record and its history are kept; the asset leaves the default list. Idempotent.")
    public void archive(@PathVariable UUID id) { assets.archive(user, id); }

    @PostMapping("/{id}/restore")
    @Operation(summary = "Restore an archived asset (ADMIN)")
    public ResponseEntity<AssetResponse> restore(@PathVariable UUID id) {
        var body = AssetResponse.from(assets.restore(user, id));
        return ResponseEntity.ok().eTag(body.etag()).body(body);
    }

    @DeleteMapping("/{id}/permanent")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete permanently (ADMIN)", description = "Only an archived asset with no service history. Audited.")
    public void hardDelete(@PathVariable UUID id) { assets.hardDelete(user, id); }

    @GetMapping("/{id}/history")
    @Operation(summary = "Audit history of an asset", description = "Who changed what and when, newest first. Readable by auditors.")
    public java.util.List<AuditEventResponse> history(@PathVariable UUID id) {
        return auditQuery.historyOfAsset(user, id).stream().map(AuditEventResponse::from).toList();
    }

    static AssetQuery.Sort parseSort(String sort) {
        var parts = sort.split(",");
        var field = switch (parts[0].strip()) {
            case "name" -> AssetQuery.SortField.NAME;
            case "updatedAt" -> AssetQuery.SortField.UPDATED_AT;
            case "purchaseDate" -> AssetQuery.SortField.PURCHASE_DATE;
            case "warrantyUntil" -> AssetQuery.SortField.WARRANTY_UNTIL;
            default -> throw new ValidationException("unknown sort field " + parts[0]);
        };
        var desc = parts.length < 2 || !parts[1].strip().equalsIgnoreCase("asc");
        return new AssetQuery.Sort(field, desc);
    }

    static String sha256(String s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
