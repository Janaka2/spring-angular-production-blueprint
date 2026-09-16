package me.janaka.assetcare.application;

import me.janaka.assetcare.application.port.CurrentUser;
import me.janaka.assetcare.domain.Asset;
import me.janaka.assetcare.domain.ForbiddenException;
import me.janaka.assetcare.domain.NotFoundException;
import org.springframework.stereotype.Component;

/**
 * The one place that decides who may see or change an asset. Rules:
 * USER: own assets, read and write. AUDITOR: read everything, write nothing. ADMIN: everything.
 * What a caller may not see is a 404 (no information leak); what they may see but not change is a 403.
 */
@Component
public class AuthorizationPolicy {

    public void requireCanRead(CurrentUser user, Asset asset) {
        if (!canRead(user, asset)) throw new NotFoundException("Asset", asset.id());
    }

    public void requireCanWrite(CurrentUser user, Asset asset) {
        requireCanRead(user, asset);
        if (user.isAuditor() && !user.isAdmin()) throw new ForbiddenException("auditors cannot modify business data");
        if (!user.isAdmin() && !asset.isOwnedBy(user.subject())) throw new ForbiddenException("not the owner of this asset");
    }

    public void requireAdmin(CurrentUser user) {
        if (!user.isAdmin()) throw new ForbiddenException("administrator role required");
    }

    public void requireCanCreate(CurrentUser user) {
        if (user.isAuditor() && !user.isAdmin()) throw new ForbiddenException("auditors cannot create business data");
    }

    public boolean canRead(CurrentUser user, Asset asset) {
        return user.isAdmin() || user.isAuditor() || asset.isOwnedBy(user.subject());
    }

    /** Whether list queries must be restricted to the caller's own assets. */
    public boolean seesOnlyOwn(CurrentUser user) { return !user.isAdmin() && !user.isAuditor(); }
}
