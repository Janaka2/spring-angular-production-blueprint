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

/** Something that is due for an asset. Completing a recurring item schedules its successor. */
public class MaintenanceItem {

    public record Details(MaintenanceType type, String description, LocalDate dueDate, @Nullable Recurrence recurrence,
                          @Nullable Money cost, @Nullable String serviceProvider, @Nullable String notes) { /* … */ }

    /** What the UI shows; derived, so an item cannot be "stale overdue" in the database. */
    public enum Urgency { PLANNED, DUE, OVERDUE, DONE, CANCELLED }

    /** Refused for an archived asset. */
    public static MaintenanceItem plan(Asset asset, Details d, String by, Instant now) { /* … */ }

    /** Only a planned item can be edited. */
    public void update(Details d, String by, Instant now) { /* … */ }

    /** Marks this item done and, when it recurs, returns the next occurrence to be persisted by the caller. */
    public Optional<MaintenanceItem> complete(LocalDate completedOn, String by, Instant now) { /* … */ }

    public void cancel(String by, Instant now) { /* … */ }

    public Urgency urgency(LocalDate today) { /* … */ }

    // accessors omitted
}
