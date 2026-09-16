package me.janaka.assetcare.domain;

/** Lifecycle of an asset. Transitions are enforced by {@link Asset}; ARCHIVED is the "deleted" state (ADR-010). */
public enum AssetStatus {
    ACTIVE, IN_REPAIR, RETIRED, ARCHIVED;

    boolean canTransitionTo(AssetStatus target) {
        return switch (this) {
            case ACTIVE    -> target == IN_REPAIR || target == RETIRED || target == ARCHIVED;
            case IN_REPAIR -> target == ACTIVE || target == RETIRED;
            case RETIRED   -> target == ARCHIVED;
            case ARCHIVED  -> target == ACTIVE;   // restore, admin only (checked in the application layer)
        };
    }
}
