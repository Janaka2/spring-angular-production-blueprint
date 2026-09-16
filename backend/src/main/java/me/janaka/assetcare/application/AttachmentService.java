package me.janaka.assetcare.application;

import java.io.InputStream;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import me.janaka.assetcare.application.port.AttachmentRepository;
import me.janaka.assetcare.application.port.AttachmentStorage;
import me.janaka.assetcare.application.port.CurrentUser;
import me.janaka.assetcare.domain.Attachment;
import me.janaka.assetcare.domain.AuditOperation;
import me.janaka.assetcare.domain.NotFoundException;
import me.janaka.assetcare.domain.ValidationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Files attached to an asset. Bytes go to storage first; the metadata row is written only if that succeeded. */
@Service
@Transactional
public class AttachmentService {

    public static final String ENTITY = "Attachment";

    public record Limits(long maxSizeBytes, Set<String> allowedContentTypes) {}
    public record Download(Attachment attachment, InputStream content) {}

    private final AttachmentRepository attachments;
    private final AttachmentStorage storage;
    private final AssetService assetService;
    private final AuthorizationPolicy authz;
    private final AuditRecorder audit;
    private final Clock clock;
    private final Limits limits;

    public AttachmentService(AttachmentRepository attachments, AttachmentStorage storage, AssetService assetService,
                             AuthorizationPolicy authz, AuditRecorder audit, Clock clock, Limits limits) {
        this.attachments = attachments; this.storage = storage; this.assetService = assetService;
        this.authz = authz; this.audit = audit; this.clock = clock; this.limits = limits;
    }

    public Attachment upload(CurrentUser user, UUID assetId, String fileName, String contentType, long sizeBytes, InputStream content) {
        var asset = assetService.get(user, assetId);
        authz.requireCanWrite(user, asset);
        if (sizeBytes <= 0) throw new ValidationException("file is empty");
        if (sizeBytes > limits.maxSizeBytes()) throw new ValidationException("file is larger than " + limits.maxSizeBytes() + " bytes");
        if (!limits.allowedContentTypes().contains(contentType)) throw new ValidationException("content type " + contentType + " is not allowed");
        var key = "assets/" + assetId + "/" + UUID.randomUUID();
        var sha256 = storage.store(key, content, sizeBytes, contentType);
        var attachment = attachments.save(Attachment.of(asset, fileName, contentType, sizeBytes, key, sha256, user.subject(), Instant.now(clock)));
        audit.record(user, AuditOperation.ATTACH, AssetService.ENTITY, assetId, Map.of("attachment", new AuditRecorder.Change(null, attachment.fileName())));
        return attachment;
    }

    @Transactional(readOnly = true)
    public List<Attachment> list(CurrentUser user, UUID assetId) {
        assetService.get(user, assetId);
        return attachments.findByAsset(assetId);
    }

    @Transactional(readOnly = true)
    public Download open(CurrentUser user, UUID attachmentId) {
        var a = attachments.findById(attachmentId).orElseThrow(() -> new NotFoundException(ENTITY, attachmentId));
        authz.requireCanRead(user, a.asset());
        return new Download(a, storage.open(a.storageKey()));
    }

    public void delete(CurrentUser user, UUID attachmentId) {
        var a = attachments.findById(attachmentId).orElseThrow(() -> new NotFoundException(ENTITY, attachmentId));
        authz.requireCanWrite(user, a.asset());
        attachments.delete(a);
        storage.delete(a.storageKey());
        audit.record(user, AuditOperation.DETACH, AssetService.ENTITY, a.asset().id(), Map.of("attachment", new AuditRecorder.Change(a.fileName(), null)));
    }
}
