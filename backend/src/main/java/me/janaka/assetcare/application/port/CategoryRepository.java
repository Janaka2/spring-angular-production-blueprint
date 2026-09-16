package me.janaka.assetcare.application.port;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import me.janaka.assetcare.domain.Category;

public interface CategoryRepository {
    Category save(Category category);
    Optional<Category> findById(UUID id);
    Optional<Category> findByCode(String code);
    List<Category> findAllOrdered();
    boolean isReferencedByAssets(UUID categoryId);
}
