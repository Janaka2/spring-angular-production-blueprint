package me.janaka.assetcare.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class MaintenanceItemTest {

    static final Instant NOW = Instant.parse("2026-09-16T10:00:00Z");
    static final Category VEHICLE = Category.create("VEHICLE", "Vehicle", null, 30, NOW);
    static final Asset CAR = Asset.create(new Asset.Details("Car", null, null, null, null, null, null, null, null, null, null),
            VEHICLE, "sub-alice", NOW);

    static MaintenanceItem.Details oilChange(String recurrence) {
        return new MaintenanceItem.Details(MaintenanceType.SERVICE, "Oil change", LocalDate.of(2026, 10, 1),
                Recurrence.orNull(recurrence), Money.of("180", "CHF"), "Garage Meier", null);
    }

    @Test
    void completingARecurringItemSchedulesTheNextOne() {
        var item = MaintenanceItem.plan(CAR, oilChange("P1Y"), "sub-alice", NOW);
        var next = item.complete(LocalDate.of(2026, 10, 3), "sub-alice", NOW);
        assertThat(item.status()).isEqualTo(MaintenanceStatus.DONE);
        assertThat(item.completedDate()).isEqualTo(LocalDate.of(2026, 10, 3));
        assertThat(next).isPresent();
        assertThat(next.get().dueDate()).isEqualTo(LocalDate.of(2027, 10, 1));
        assertThat(next.get().status()).isEqualTo(MaintenanceStatus.PLANNED);
    }

    @Test
    void completingAOneOffItemSchedulesNothingAndCannotRepeat() {
        var item = MaintenanceItem.plan(CAR, oilChange(null), "sub-alice", NOW);
        assertThat(item.complete(LocalDate.of(2026, 10, 3), "sub-alice", NOW)).isEmpty();
        assertThatThrownBy(() -> item.complete(LocalDate.of(2026, 10, 4), "sub-alice", NOW))
                .isInstanceOf(InvalidStateException.class);
        assertThatThrownBy(() -> item.cancel("sub-alice", NOW)).isInstanceOf(InvalidStateException.class);
    }

    @Test
    void urgencyIsDerivedFromTheDueDate() {
        var item = MaintenanceItem.plan(CAR, oilChange(null), "sub-alice", NOW);
        assertThat(item.urgency(LocalDate.of(2026, 9, 1))).isEqualTo(MaintenanceItem.Urgency.PLANNED);
        assertThat(item.urgency(LocalDate.of(2026, 9, 20))).isEqualTo(MaintenanceItem.Urgency.DUE);
        assertThat(item.urgency(LocalDate.of(2026, 10, 2))).isEqualTo(MaintenanceItem.Urgency.OVERDUE);
    }

    @Test
    void cannotPlanForAnArchivedAsset() {
        var scrapped = Asset.create(CAR.details(), VEHICLE, "sub-alice", NOW);
        scrapped.archive("sub-alice", NOW);
        assertThatThrownBy(() -> MaintenanceItem.plan(scrapped, oilChange(null), "sub-alice", NOW))
                .isInstanceOf(InvalidStateException.class);
    }
}
