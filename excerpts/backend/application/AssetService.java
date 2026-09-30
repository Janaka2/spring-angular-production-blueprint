/*
 * EXCERPT from AssetCare, (c) 2026 Janaka Premathilaka. All rights reserved.
 * Shown for viewing only. Not licensed for copying, modification or reuse; see LICENSE.
 * This file is part of a private codebase and is not a complete or buildable source.
 * Source: https://github.com/Janaka2/spring-angular-production-blueprint
 *
 * SIGNATURES ONLY: method bodies, persistence mappings, private helpers and accessors are
 * in the private source.
 */

package me.janaka.assetcare.application;

/** Use cases for the Asset aggregate. Every write is one transaction that also writes its audit event. */
@Service
@Transactional
public class AssetService {

    public AssetService(AssetRepository assets, CategoryRepository categories, ServiceRecordRepository serviceRecords,
                        IdempotencyRepository idempotency, AuthorizationPolicy authz, AuditRecorder audit, Clock clock) { /* … */ }

    /**
     * Creates an asset. With an Idempotency-Key, a retried identical request returns the asset created the first time;
     * the same key with a different body is a conflict, because silently returning a different asset would hide a bug.
     */
    public Asset create(CurrentUser user, Asset.Details details, UUID categoryId, @Nullable String idempotencyKey, String requestHash) { /* … */ }

    @Transactional(readOnly = true)
    public Asset get(CurrentUser user, UUID id) { /* … */ }

    /** A user sees their own assets; admins and auditors see all. */
    @Transactional(readOnly = true)
    public PageResult<Asset> search(CurrentUser user, AssetQuery query) { /* … */ }

    /** Updates the editable details. {@code expectedVersion} comes from If-Match; a mismatch is a 409 before any write. */
    public Asset update(CurrentUser user, UUID id, long expectedVersion, Asset.Details details, UUID categoryId) { /* … */ }

    public Asset changeStatus(CurrentUser user, UUID id, long expectedVersion, AssetStatus target) { /* … */ }

    /** DELETE in the API: archive. The record and its history remain (ADR-010). Idempotent: deleting twice is not an error. */
    public void archive(CurrentUser user, UUID id) { /* … */ }

    /** Admin only. */
    public Asset restore(CurrentUser user, UUID id) { /* … */ }

    /** Physical delete: admin only, archived only, and only when no service history references the asset. */
    public void hardDelete(CurrentUser user, UUID id) { /* … */ }
}
