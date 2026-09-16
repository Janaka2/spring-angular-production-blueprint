package me.janaka.assetcare.infrastructure.web;

import me.janaka.assetcare.application.port.RequestContext;
import org.jspecify.annotations.Nullable;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

/** Correlation ids for audit events, read from the MDC that RequestIdFilter and the tracer populate. */
@Component
public class MdcRequestContext implements RequestContext {
    @Override public @Nullable String requestId() { return MDC.get(RequestIdFilter.MDC_KEY); }
    @Override public @Nullable String traceId() { return MDC.get("traceId"); }
}
