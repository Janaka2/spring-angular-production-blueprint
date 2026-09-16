package me.janaka.assetcare.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class AssetTest {

    static final Instant NOW = Instant.parse("2026-09-16T10:00:00Z");
    static final Category COMPUTER = Category.create("COMPUTER", "Computer", null, 10, NOW);

    static Asset.Details laptop() {
        return new Asset.Details("MacBook Pro 14", "work laptop", "LAPTOP-1", "C02XYZ", "Apple", "M4 Pro",
                LocalDate.of(2025, 1, 15), Money.of("2499.00", "CHF"), LocalDate.of(2027, 1, 15), "Zug office", null);
    }

    @Test
    void createStartsActiveWithAuditAndVersionZero() {
        var asset = Asset.create(laptop(), COMPUTER, "sub-alice", NOW);
        assertThat(asset.status()).isEqualTo(AssetStatus.ACTIVE);
        assertThat(asset.owner()).isEqualTo("sub-alice");
        assertThat(asset.version()).isZero();
        assertThat(asset.audit().createdBy()).isEqualTo("sub-alice");
        assertThat(asset.details().purchasePrice()).isEqualTo(Money.of("2499", "CHF"));
    }

    @Test
    void nameIsRequiredAndWarrantyCannotPrecedePurchase() {
        assertThatThrownBy(() -> new Asset.Details(" ", null, null, null, null, null, null, null, null, null, null))
                .isInstanceOf(ValidationException.class).hasMessageContaining("name");
        assertThatThrownBy(() -> new Asset.Details("x", null, null, null, null, null,
                LocalDate.of(2026, 1, 1), null, LocalDate.of(2025, 1, 1), null, null))
                .isInstanceOf(ValidationException.class).hasMessageContaining("warrantyUntil");
    }

    @Test
    void archiveKeepsTheRecordAndBlocksEdits() {
        var asset = Asset.create(laptop(), COMPUTER, "sub-alice", NOW);
        asset.archive("sub-alice", NOW.plusSeconds(60));
        assertThat(asset.isArchived()).isTrue();
        assertThat(asset.archivedAt()).isEqualTo(NOW.plusSeconds(60));
        assertThatThrownBy(() -> asset.update(laptop(), COMPUTER, "sub-alice", NOW))
                .isInstanceOf(InvalidStateException.class).hasMessageContaining("archived");
        asset.restore("sub-admin", NOW.plusSeconds(120));
        assertThat(asset.status()).isEqualTo(AssetStatus.ACTIVE);
        assertThat(asset.archivedAt()).isNull();
    }

    @Test
    void lifecycleTransitionsAreEnforced() {
        var asset = Asset.create(laptop(), COMPUTER, "sub-alice", NOW);
        asset.changeStatus(AssetStatus.IN_REPAIR, "sub-alice", NOW);
        asset.changeStatus(AssetStatus.ACTIVE, "sub-alice", NOW);
        asset.changeStatus(AssetStatus.RETIRED, "sub-alice", NOW);
        assertThatThrownBy(() -> asset.changeStatus(AssetStatus.ACTIVE, "sub-alice", NOW))
                .isInstanceOf(InvalidStateException.class);
        assertThatThrownBy(() -> asset.changeStatus(AssetStatus.ARCHIVED, "sub-alice", NOW))
                .isInstanceOf(InvalidStateException.class).hasMessageContaining("archive()");
    }

    @Test
    void warrantyWindow() {
        var asset = Asset.create(laptop(), COMPUTER, "sub-alice", NOW);
        assertThat(asset.warrantyExpiresWithin(LocalDate.of(2026, 12, 20), 30)).isTrue();
        assertThat(asset.warrantyExpiresWithin(LocalDate.of(2026, 6, 1), 30)).isFalse();
        assertThat(asset.warrantyExpiresWithin(LocalDate.of(2027, 2, 1), 30)).isFalse();
    }
}
