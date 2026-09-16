package me.janaka.assetcare.domain;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeParseException;
import org.jspecify.annotations.Nullable;

/** How often a maintenance item repeats, as an ISO-8601 period such as P1M, P3M or P1Y. */
public record Recurrence(String period) {
    public Recurrence {
        try {
            var p = Period.parse(period);
            if (p.isNegative() || p.isZero()) throw new ValidationException("recurrence must be a positive period");
        } catch (DateTimeParseException e) {
            throw new ValidationException("recurrence must be an ISO-8601 period such as P1M, P3M or P1Y");
        }
    }

    public LocalDate next(LocalDate from) { return from.plus(Period.parse(period)); }

    public static @Nullable Recurrence orNull(@Nullable String period) {
        return period == null || period.isBlank() ? null : new Recurrence(period);
    }
}
