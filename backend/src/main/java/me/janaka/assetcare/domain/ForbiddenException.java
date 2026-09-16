package me.janaka.assetcare.domain;

/** The caller is known and may see the thing, but may not do this to it: 403. */
public class ForbiddenException extends DomainException {
    public ForbiddenException(String message) { super("forbidden", message); }
}
