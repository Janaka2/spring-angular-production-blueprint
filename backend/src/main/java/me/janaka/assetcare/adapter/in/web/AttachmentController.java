package me.janaka.assetcare.adapter.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import me.janaka.assetcare.adapter.in.web.dto.AttachmentResponse;
import me.janaka.assetcare.application.AttachmentService;
import me.janaka.assetcare.application.port.CurrentUser;
import me.janaka.assetcare.domain.ValidationException;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Attachments", description = "Documents and photos of an asset; bytes live in object storage")
public class AttachmentController {

    private final AttachmentService attachments;
    private final CurrentUser user;

    public AttachmentController(AttachmentService attachments, CurrentUser user) { this.attachments = attachments; this.user = user; }

    @GetMapping("/assets/{assetId}/attachments")
    @Operation(summary = "Attachments of an asset")
    public List<AttachmentResponse> list(@PathVariable UUID assetId) {
        return attachments.list(user, assetId).stream().map(AttachmentResponse::from).toList();
    }

    @PostMapping(value = "/assets/{assetId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Upload an attachment", description = "multipart/form-data with a 'file' part. Content types and size are restricted.")
    public AttachmentResponse upload(@PathVariable UUID assetId, @RequestPart("file") MultipartFile file) throws IOException {
        var name = file.getOriginalFilename();
        if (name == null || name.isBlank()) throw new ValidationException("file name is required");
        var contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
        try (var in = file.getInputStream()) {
            return AttachmentResponse.from(attachments.upload(user, assetId, name, contentType, file.getSize(), in));
        }
    }

    @GetMapping("/attachments/{id}/content")
    @Operation(summary = "Download an attachment", description = "Always served as a download, never rendered inline.")
    public ResponseEntity<InputStreamResource> download(@PathVariable UUID id) {
        var d = attachments.open(user, id);
        var a = d.attachment();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(a.contentType()))
                .contentLength(a.sizeBytes())
                .header("Content-Disposition", ContentDisposition.attachment().filename(a.fileName()).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(new InputStreamResource(d.content()));
    }

    @DeleteMapping("/attachments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete an attachment")
    public void delete(@PathVariable UUID id) { attachments.delete(user, id); }
}
