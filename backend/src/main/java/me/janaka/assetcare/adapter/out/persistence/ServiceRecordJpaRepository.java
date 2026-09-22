package me.janaka.assetcare.adapter.out.persistence;

import java.util.List;
import java.util.UUID;
import me.janaka.assetcare.application.port.ServiceRecordRepository;
import me.janaka.assetcare.domain.ServiceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface ServiceRecordJpaRepository extends JpaRepository<ServiceRecord, UUID>, ServiceRecordRepository {

    @Override
    // the linked item is fetched: responses are mapped after the transaction ends (open-in-view is off)
    @Query("select r from ServiceRecord r left join fetch r.maintenanceItem where r.asset.id = :assetId order by r.performedOn desc, r.createdAt desc")
    List<ServiceRecord> findByAsset(UUID assetId);

    @Override
    @Query("select count(r) > 0 from ServiceRecord r where r.asset.id = :assetId")
    boolean existsForAsset(UUID assetId);
}
