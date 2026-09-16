package me.janaka.assetcare.domain;

import java.util.UUID;

/** The thing does not exist, or the caller may not know that it exists: both are a 404. */
public class NotFoundException extends DomainException {
    public NotFoundException(String entity, UUID id) {
        super("not-found", entity + " " + id + " was not found");
    }
}
