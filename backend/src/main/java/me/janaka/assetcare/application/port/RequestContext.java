package me.janaka.assetcare.application.port;

import org.jspecify.annotations.Nullable;

/** Correlation identifiers of the current request, for audit events. Both may be absent outside a web request. */
public interface RequestContext {
    @Nullable String requestId();
    @Nullable String traceId();
}
