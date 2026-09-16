package me.janaka.assetcare.application;

import java.util.List;
import java.util.UUID;
import me.janaka.assetcare.application.port.AuditEventRepository;
import me.janaka.assetcare.application.port.CurrentUser;
import me.janaka.assetcare.domain.AuditEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** History of an asset: readable by whoever may read the asset, which includes auditors. */
@Service
@Transactional(readOnly = true)
public class AuditQueryService {
    private final AuditEventRepository events;
    private final AssetService assetService;

    public AuditQueryService(AuditEventRepository events, AssetService assetService) {
        this.events = events; this.assetService = assetService;
    }

    public List<AuditEvent> historyOfAsset(CurrentUser user, UUID assetId) {
        assetService.get(user, assetId);
        return events.findByEntity(AssetService.ENTITY, assetId);
    }
}
