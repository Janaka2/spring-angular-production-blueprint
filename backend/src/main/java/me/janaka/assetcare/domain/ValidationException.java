package me.janaka.assetcare.domain;

/** A business rule about the values themselves (not their shape) was broken: 400. */
public class ValidationException extends DomainException {
    public ValidationException(String message) { super("validation", message); }
}
