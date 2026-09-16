package me.janaka.assetcare.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/** Reference data managed by admins. Code is the stable key; name is what people see. */
@Entity
@Table(name = "category")
public class Category {
    @Id private UUID id;
    @Column(nullable = false, unique = true, length = 40) private String code;
    @Column(nullable = false, length = 80) private String name;
    @Column(length = 500) private @Nullable String description;
    @Column(nullable = false) private boolean active = true;
    @Column(name = "sort_order", nullable = false) private int sortOrder = 100;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected Category() {}

    public static Category create(String code, String name, @Nullable String description, int sortOrder, Instant now) {
        if (!code.matches("[A-Z][A-Z0-9_]{1,39}")) throw new ValidationException("category code must be UPPER_SNAKE, 2 to 40 characters");
        var c = new Category();
        c.id = UUID.randomUUID(); c.code = code; c.name = name; c.description = description;
        c.sortOrder = sortOrder; c.createdAt = now; c.updatedAt = now;
        return c;
    }

    public void rename(String name, @Nullable String description, int sortOrder, boolean active, Instant now) {
        this.name = name; this.description = description; this.sortOrder = sortOrder; this.active = active; this.updatedAt = now;
    }

    public UUID id() { return id; }
    public String code() { return code; }
    public String name() { return name; }
    public @Nullable String description() { return description; }
    public boolean active() { return active; }
    public int sortOrder() { return sortOrder; }
    public Instant createdAt() { return createdAt; }
    public Instant updatedAt() { return updatedAt; }
}
