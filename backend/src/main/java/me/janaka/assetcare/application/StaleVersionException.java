package me.janaka.assetcare.application;

import java.time.Instant;
import me.janaka.assetcare.domain.DomainException;

/** The caller's If-Match does not match: someone else changed the record since it was read. 409 with who and when. */
public class StaleVersionException extends DomainException {
    private final long currentVersion;
    private final long expectedVersion;
    private final String changedBy;
    private final Instant changedAt;

    public StaleVersionException(long currentVersion, long expectedVersion, String changedBy, Instant changedAt) {
        super("stale-version", "the record was changed by someone else (version " + currentVersion
                + ", you had " + expectedVersion + "); reload and apply your change again");
        this.currentVersion = currentVersion; this.expectedVersion = expectedVersion;
        this.changedBy = changedBy; this.changedAt = changedAt;
    }

    public long currentVersion() { return currentVersion; }
    public long expectedVersion() { return expectedVersion; }
    public String changedBy() { return changedBy; }
    public Instant changedAt() { return changedAt; }
}
