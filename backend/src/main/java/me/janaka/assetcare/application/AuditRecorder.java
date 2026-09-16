package me.janaka.assetcare.application;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import me.janaka.assetcare.application.port.AuditEventRepository;
import me.janaka.assetcare.application.port.CurrentUser;
import me.janaka.assetcare.application.port.RequestContext;
import me.janaka.assetcare.domain.Asset;
import me.janaka.assetcare.domain.AuditEvent;
import me.janaka.assetcare.domain.AuditOperation;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Component;

/** Writes business audit events. Called inside the use case's transaction so the event and the change commit together. */
@Component
public class AuditRecorder {

    private final AuditEventRepository events;
    private final RequestContext request;
    private final Clock clock;

    public AuditRecorder(AuditEventRepository events, RequestContext request, Clock clock) {
        this.events = events; this.request = request; this.clock = clock;
    }

    public void record(CurrentUser actor, AuditOperation op, String entityType, UUID entityId, @Nullable Map<String, Change> changes) {
        events.save(AuditEvent.of(Instant.now(clock), actor.subject(), op, entityType, entityId,
                changes == null || changes.isEmpty() ? null : toJson(changes), request.requestId(), request.traceId()));
    }

    public record Change(@Nullable Object from, @Nullable Object to) {}

    /** Field-by-field diff of the editable details, so history answers "what exactly changed". */
    public static Map<String, Change> diff(Asset.Details before, Asset.Details after) {
        var m = new LinkedHashMap<String, Change>();
        put(m, "name", before.name(), after.name());
        put(m, "description", before.description(), after.description());
        put(m, "assetTag", before.assetTag(), after.assetTag());
        put(m, "serialNumber", before.serialNumber(), after.serialNumber());
        put(m, "manufacturer", before.manufacturer(), after.manufacturer());
        put(m, "model", before.model(), after.model());
        put(m, "purchaseDate", before.purchaseDate(), after.purchaseDate());
        put(m, "purchasePrice", before.purchasePrice(), after.purchasePrice());
        put(m, "warrantyUntil", before.warrantyUntil(), after.warrantyUntil());
        put(m, "location", before.location(), after.location());
        put(m, "notes", before.notes(), after.notes());
        return m;
    }

    private static void put(Map<String, Change> m, String field, @Nullable Object from, @Nullable Object to) {
        if (!Objects.equals(from, to)) m.put(field, new Change(from, to));
    }

    /** Minimal JSON writer: values are rendered as strings, which is what the history view shows. No library in the application layer. */
    static String toJson(Map<String, Change> changes) {
        var sb = new StringBuilder("{");
        var first = true;
        for (var e : changes.entrySet()) {
            if (!first) sb.append(',');
            first = false;
            sb.append(quote(e.getKey())).append(":{\"from\":").append(value(e.getValue().from()))
              .append(",\"to\":").append(value(e.getValue().to())).append('}');
        }
        return sb.append('}').toString();
    }

    private static String value(@Nullable Object v) { return v == null ? "null" : quote(String.valueOf(v)); }

    private static String quote(String s) {
        var sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> { if (c < 0x20) sb.append(String.format("\\u%04x", (int) c)); else sb.append(c); }
            }
        }
        return sb.append('"').toString();
    }
}
