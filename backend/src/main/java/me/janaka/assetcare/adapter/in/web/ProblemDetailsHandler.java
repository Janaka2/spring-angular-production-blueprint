package me.janaka.assetcare.adapter.in.web;

import jakarta.validation.ConstraintViolationException;
import java.net.URI;
import java.util.List;
import java.util.Map;
import me.janaka.assetcare.application.StaleVersionException;
import me.janaka.assetcare.domain.DomainException;
import me.janaka.assetcare.domain.ForbiddenException;
import me.janaka.assetcare.domain.InvalidStateException;
import me.janaka.assetcare.domain.NotFoundException;
import me.janaka.assetcare.domain.ValidationException;
import me.janaka.assetcare.infrastructure.web.RequestIdFilter;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Every error leaves the API as RFC 9457 Problem Details with a stable {@code type}, the request id, and no stack trace.
 * Domain exceptions map by their code; framework exceptions map explicitly; everything else is a 500 with just an id.
 */
@RestControllerAdvice
public class ProblemDetailsHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ProblemDetailsHandler.class);
    static final String TYPE_BASE = "https://assetcare.janaka.me/problems/";

    @ExceptionHandler(DomainException.class)
    ProblemDetail domain(DomainException e) {
        var status = switch (e) {
            case NotFoundException n -> HttpStatus.NOT_FOUND;
            case ForbiddenException f -> HttpStatus.FORBIDDEN;
            case InvalidStateException i -> HttpStatus.CONFLICT;
            case ValidationException v -> HttpStatus.BAD_REQUEST;
            case StaleVersionException s -> HttpStatus.CONFLICT;
            default -> HttpStatus.BAD_REQUEST;
        };
        var pd = problem(status, e.code(), e.getMessage());
        if (e instanceof StaleVersionException s) {
            pd.setTitle("The record was changed by someone else");
            pd.setProperty("currentVersion", s.currentVersion());
            pd.setProperty("expectedVersion", s.expectedVersion());
            pd.setProperty("changedBy", s.changedBy());
            pd.setProperty("changedAt", s.changedAt());
        }
        return pd;
    }

    /** Hibernate's own optimistic-lock failure: two writes raced past the application-level version check. */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    ProblemDetail optimisticLock(OptimisticLockingFailureException e) {
        return problem(HttpStatus.CONFLICT, "stale-version", "the record was changed concurrently; reload and apply your change again");
    }

    /** A unique constraint rejected the write, e.g. an asset tag the owner already uses (uq_asset_owner_tag). */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail integrity(DataIntegrityViolationException e) {
        var cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("uq_asset_owner_tag")) {
            var pd = problem(HttpStatus.CONFLICT, "duplicate", "you already have an asset with this asset tag");
            pd.setProperty("errors", List.of(Map.of("field", "assetTag", "message", "already used by another of your assets")));
            return pd;
        }
        log.atWarn().addKeyValue("event", "INTEGRITY_VIOLATION").setCause(e).log("write rejected by a database constraint");
        return problem(HttpStatus.CONFLICT, "duplicate", "the change conflicts with an existing record");
    }

    @ExceptionHandler(Preconditions.PreconditionRequiredException.class)
    ProblemDetail preconditionRequired(Preconditions.PreconditionRequiredException e) {
        return problem(HttpStatus.PRECONDITION_REQUIRED, "precondition-required", e.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail accessDenied(AccessDeniedException e) {
        return problem(HttpStatus.FORBIDDEN, "forbidden", "you are not allowed to do this");
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ProblemDetail constraint(ConstraintViolationException e) {
        var pd = problem(HttpStatus.BAD_REQUEST, "validation", "request is not valid");
        pd.setProperty("errors", e.getConstraintViolations().stream()
                .map(v -> Map.of("field", v.getPropertyPath().toString(), "message", v.getMessage())).toList());
        return pd;
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail unexpected(Exception e) {
        var pd = problem(HttpStatus.INTERNAL_SERVER_ERROR, "internal", "an unexpected error occurred; quote the requestId when reporting it");
        log.atError().addKeyValue("event", "UNEXPECTED_ERROR").setCause(e).log("unhandled exception");
        return pd;
    }

    @Override
    protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpHeaders headers,
                                                                            HttpStatusCode status, WebRequest request) {
        var pd = problem(HttpStatus.BAD_REQUEST, "validation", "request body is not valid");
        List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> Map.of("field", fe.getField(), "message", message(fe))).toList();
        pd.setProperty("errors", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(pd);
    }

    // the base class already maps this exception, so a separate @ExceptionHandler would be ambiguous
    @Override
    protected @Nullable ResponseEntity<Object> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException ex, HttpHeaders headers,
                                                                                    HttpStatusCode status, WebRequest request) {
        var pd = problem(HttpStatus.PAYLOAD_TOO_LARGE, "payload-too-large", "the upload exceeds the size limit");
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(pd);
    }

    @Override
    protected @Nullable ResponseEntity<Object> createResponseEntity(@Nullable Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest request) {
        if (body instanceof ProblemDetail pd) decorate(pd, "http-" + statusCode.value());
        return super.createResponseEntity(body, headers, statusCode, request);
    }

    private static ProblemDetail problem(HttpStatus status, String code, String detail) {
        var pd = ProblemDetail.forStatusAndDetail(status, detail);
        decorate(pd, code);
        return pd;
    }

    private static void decorate(ProblemDetail pd, String code) {
        pd.setType(URI.create(TYPE_BASE + code));
        var requestId = MDC.get(RequestIdFilter.MDC_KEY);
        if (requestId != null) pd.setProperty("requestId", requestId);
        var traceId = MDC.get("traceId");
        if (traceId != null) pd.setProperty("traceId", traceId);
    }

    private static String message(FieldError fe) {
        var m = fe.getDefaultMessage();
        return m == null ? "invalid" : m;
    }
}
