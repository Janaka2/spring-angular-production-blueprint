package me.janaka.assetcare.application.port;

import java.util.List;
import java.util.UUID;
import me.janaka.assetcare.domain.ServiceRecord;

public interface ServiceRecordRepository {
    ServiceRecord save(ServiceRecord record);
    List<ServiceRecord> findByAsset(UUID assetId);
    boolean existsForAsset(UUID assetId);
}
