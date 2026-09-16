package me.janaka.assetcare.adapter.out.persistence;

import java.util.List;
import java.util.UUID;
import me.janaka.assetcare.application.port.CategoryRepository;
import me.janaka.assetcare.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Spring Data implements the port directly: derived and declared queries, no adapter class needed. */
interface CategoryJpaRepository extends JpaRepository<Category, UUID>, CategoryRepository {

    @Override
    @Query("select c from Category c order by c.sortOrder, c.name")
    List<Category> findAllOrdered();

    @Override
    @Query("select count(a) > 0 from Asset a where a.category.id = :categoryId")
    boolean isReferencedByAssets(UUID categoryId);
}
