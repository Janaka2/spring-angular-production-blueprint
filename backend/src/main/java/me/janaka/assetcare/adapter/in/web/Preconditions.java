package me.janaka.assetcare.adapter.in.web;

import me.janaka.assetcare.domain.ValidationException;
import org.jspecify.annotations.Nullable;

/** ETag / If-Match: the version travels as a quoted string, as HTTP requires. */
final class Preconditions {
    private Preconditions() {}

    static String etag(long version) { return "\"" + version + "\""; }

    /** If-Match is required on updates so a client cannot forget the concurrency check by accident. */
    static long requiredVersion(@Nullable String ifMatch) {
        if (ifMatch == null || ifMatch.isBlank()) throw new PreconditionRequiredException();
        var v = ifMatch.strip();
        if (v.startsWith("W/")) v = v.substring(2);
        v = v.replace("\"", "");
        try { return Long.parseLong(v); } catch (NumberFormatException e) { throw new ValidationException("If-Match must be the ETag of the record"); }
    }

    static final class PreconditionRequiredException extends RuntimeException {
        PreconditionRequiredException() { super("If-Match header with the record's ETag is required for updates"); }
    }
}
