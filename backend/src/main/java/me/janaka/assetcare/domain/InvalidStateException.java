package me.janaka.assetcare.domain;

/** The operation is not allowed in the aggregate's current state: 409. */
public class InvalidStateException extends DomainException {
    public InvalidStateException(String message) { super("invalid-state", message); }
}
