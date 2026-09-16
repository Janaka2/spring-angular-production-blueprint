package me.janaka.assetcare.application.port;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import me.janaka.assetcare.domain.Attachment;

public interface AttachmentRepository {
    Attachment save(Attachment attachment);
    Optional<Attachment> findById(UUID id);
    List<Attachment> findByAsset(UUID assetId);
    void delete(Attachment attachment);
}
