package me.janaka.assetcare.adapter.out.persistence;

import java.util.List;
import java.util.UUID;
import me.janaka.assetcare.application.port.AttachmentRepository;
import me.janaka.assetcare.domain.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface AttachmentJpaRepository extends JpaRepository<Attachment, UUID>, AttachmentRepository {

    @Override
    @Query("select a from Attachment a where a.asset.id = :assetId order by a.uploadedAt desc")
    List<Attachment> findByAsset(UUID assetId);
}
