/*
 * EXCERPT from AssetCare, (c) 2026 Janaka Premathilaka. All rights reserved.
 * Shown for viewing only. Not licensed for copying, modification or reuse; see LICENSE.
 * This file is part of a private codebase and is not a complete or buildable source.
 * Source: https://github.com/Janaka2/spring-angular-production-blueprint
 *
 * SIGNATURES ONLY: method bodies, persistence mappings, private helpers and accessors are
 * in the private source.
 */

package me.janaka.assetcare.domain;

/**
 * The aggregate root: one physical thing somebody owns or operates.
 * Rules live here; controllers and repositories never change a field directly.
 */
public class Asset {

    /** Everything a person may set. One record, so the API cannot mass-assign anything else. Validated on construction. */
    public record Details(
            String name, @Nullable String description, @Nullable String assetTag, @Nullable String serialNumber,
            @Nullable String manufacturer, @Nullable String model, @Nullable LocalDate purchaseDate,
            @Nullable Money purchasePrice, @Nullable LocalDate warrantyUntil, @Nullable String location,
            @Nullable String notes) { /* … */ }

    /** Optimistic lock: a stale browser session cannot silently overwrite another person's change. */
    private long version;

    public static Asset create(Details d, Category category, String owner, Instant now) { /* … */ }

    /** Refused for an archived asset; restore it first. */
    public void update(Details d, Category category, String by, Instant now) { /* … */ }

    /** Moves along the allowed status transitions only. */
    public void changeStatus(AssetStatus target, String by, Instant now) { /* … */ }

    /** DELETE in the API. The record and its history stay (ADR-010). */
    public void archive(String by, Instant now) { /* … */ }

    public void restore(String by, Instant now) { /* … */ }

    public boolean isOwnedBy(String subject) { /* … */ }
    public boolean isArchived() { /* … */ }
    public boolean warrantyExpiresWithin(LocalDate today, int days) { /* … */ }
    public Details details() { /* … */ }

    // accessors omitted
}
