package me.janaka.assetcare.adapter.in.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import me.janaka.assetcare.adapter.in.web.dto.CategoryRequest;
import me.janaka.assetcare.adapter.in.web.dto.CategoryResponse;
import me.janaka.assetcare.application.CategoryService;
import me.janaka.assetcare.application.port.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/categories")
@Tag(name = "Categories", description = "Reference data; admins manage it")
public class CategoryController {

    private final CategoryService categories;
    private final CurrentUser user;

    public CategoryController(CategoryService categories, CurrentUser user) { this.categories = categories; this.user = user; }

    @GetMapping
    @Operation(summary = "All categories, in display order")
    public List<CategoryResponse> list() { return categories.list().stream().map(CategoryResponse::from).toList(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a category (ADMIN)")
    public CategoryResponse create(@Valid @RequestBody CategoryRequest r) {
        return CategoryResponse.from(categories.create(user, r.code(), r.name().strip(), r.description(), r.sortOrder()));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Rename, reorder or deactivate a category (ADMIN)")
    public CategoryResponse update(@PathVariable UUID id, @Valid @RequestBody CategoryRequest r) {
        return CategoryResponse.from(categories.update(user, id, r.name().strip(), r.description(), r.sortOrder(), r.active()));
    }
}
