package me.janaka.assetcare.adapter.in.web.dto;

import java.time.Instant;
import java.util.UUID;
import me.janaka.assetcare.domain.Attachment;

public record AttachmentResponse(UUID id, UUID assetId, String fileName, String contentType, long sizeBytes,
                                 String sha256, String uploadedBy, Instant uploadedAt) {
    public static AttachmentResponse from(Attachment a) {
        return new AttachmentResponse(a.id(), a.asset().id(), a.fileName(), a.contentType(), a.sizeBytes(), a.sha256(),
                a.uploadedBy(), a.uploadedAt());
    }
}
