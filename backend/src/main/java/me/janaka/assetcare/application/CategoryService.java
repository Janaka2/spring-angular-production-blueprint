package me.janaka.assetcare.application;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import me.janaka.assetcare.application.port.CategoryRepository;
import me.janaka.assetcare.application.port.CurrentUser;
import me.janaka.assetcare.domain.Category;
import me.janaka.assetcare.domain.InvalidStateException;
import me.janaka.assetcare.domain.NotFoundException;
import org.jspecify.annotations.Nullable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reference data. Read by everyone on every screen, so the list is cached; any admin change evicts it. */
@Service
@Transactional
public class CategoryService {

    public static final String CACHE = "categories";

    private final CategoryRepository categories;
    private final AuthorizationPolicy authz;
    private final Clock clock;

    public CategoryService(CategoryRepository categories, AuthorizationPolicy authz, Clock clock) {
        this.categories = categories; this.authz = authz; this.clock = clock;
    }

    @Transactional(readOnly = true)
    @Cacheable(CACHE)
    public List<Category> list() { return categories.findAllOrdered(); }

    @CacheEvict(value = CACHE, allEntries = true)
    public Category create(CurrentUser user, String code, String name, @Nullable String description, int sortOrder) {
        authz.requireAdmin(user);
        categories.findByCode(code).ifPresent(c -> { throw new InvalidStateException("category code " + code + " already exists"); });
        return categories.save(Category.create(code, name, description, sortOrder, Instant.now(clock)));
    }

    @CacheEvict(value = CACHE, allEntries = true)
    public Category update(CurrentUser user, UUID id, String name, @Nullable String description, int sortOrder, boolean active) {
        authz.requireAdmin(user);
        var c = categories.findById(id).orElseThrow(() -> new NotFoundException("Category", id));
        if (!active && categories.isReferencedByAssets(id) && c.active()) {
            // deactivating is allowed: existing assets keep the category, new ones cannot pick it
        }
        c.rename(name, description, sortOrder, active, Instant.now(clock));
        return categories.save(c);
    }
}
