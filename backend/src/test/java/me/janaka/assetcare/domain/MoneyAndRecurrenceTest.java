package me.janaka.assetcare.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class MoneyAndRecurrenceTest {

    @Test
    void moneyIsScaledAndValidated() {
        assertThat(Money.of("12.345", "chf").amount()).isEqualByComparingTo("12.35");
        assertThat(Money.of("1", "chf").currency()).isEqualTo("CHF");
        assertThatThrownBy(() -> Money.of("-1", "CHF")).isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> Money.of("1", "XXX1")).isInstanceOf(ValidationException.class);
        assertThat(Money.orNull(null, null)).isNull();
        assertThatThrownBy(() -> Money.orNull(BigDecimal.ONE, null)).isInstanceOf(ValidationException.class);
    }

    @Test
    void recurrenceParsesIsoPeriodsAndSchedulesNext() {
        assertThat(new Recurrence("P3M").next(LocalDate.of(2026, 1, 31))).isEqualTo(LocalDate.of(2026, 4, 30));
        assertThat(new Recurrence("P1Y").next(LocalDate.of(2026, 2, 28))).isEqualTo(LocalDate.of(2027, 2, 28));
        assertThatThrownBy(() -> new Recurrence("monthly")).isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> new Recurrence("P0D")).isInstanceOf(ValidationException.class);
        assertThat(Recurrence.orNull("  ")).isNull();
    }
}
