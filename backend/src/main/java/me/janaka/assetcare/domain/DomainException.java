package me.janaka.assetcare.domain;

/** Base class for rule violations. {@code code} is stable and becomes the Problem Details {@code type} suffix. */
public abstract class DomainException extends RuntimeException {
    private final String code;

    protected DomainException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() { return code; }
}
