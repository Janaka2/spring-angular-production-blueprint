package me.janaka.assetcare.application;

import static me.janaka.assetcare.support.Fakes.ADMIN;
import static me.janaka.assetcare.support.Fakes.ALICE;
import static me.janaka.assetcare.support.Fakes.AUDREY;
import static me.janaka.assetcare.support.Fakes.BOB;
import static me.janaka.assetcare.support.Fakes.CLOCK;
import static me.janaka.assetcare.support.Fakes.REQUEST;
import static me.janaka.assetcare.support.Fakes.details;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import me.janaka.assetcare.application.query.AssetQuery;
import me.janaka.assetcare.domain.AssetStatus;
import me.janaka.assetcare.domain.AuditOperation;
import me.janaka.assetcare.domain.Category;
import me.janaka.assetcare.domain.ForbiddenException;
import me.janaka.assetcare.domain.InvalidStateException;
import me.janaka.assetcare.domain.NotFoundException;
import me.janaka.assetcare.support.Fakes;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AssetServiceTest {

    Fakes.Assets assets = new Fakes.Assets();
    Fakes.Categories categories = new Fakes.Categories();
    Fakes.Records records = new Fakes.Records();
    Fakes.Audit audit = new Fakes.Audit();
    Fakes.Idempotency idempotency = new Fakes.Idempotency();
    Category computer;
    AssetService service;

    @BeforeEach
    void setUp() {
        computer = categories.add("COMPUTER");
        service = new AssetService(assets, categories, records, idempotency, new AuthorizationPolicy(),
                new AuditRecorder(audit, REQUEST, CLOCK), CLOCK);
    }

    @Test
    void createWritesAnAuditEventWithRequestAndTraceIds() {
        var asset = service.create(ALICE, details("Laptop"), computer.id(), null, "h1");
        assertThat(asset.owner()).isEqualTo("sub-alice");
        assertThat(audit.rows).singleElement().satisfies(e -> {
            assertThat(e.operation()).isEqualTo(AuditOperation.CREATE);
            assertThat(e.requestId()).isEqualTo("req-1");
            assertThat(e.traceId()).isEqualTo("trace-1");
            assertThat(e.changedFields()).contains("\"name\":{\"from\":\"(new)\",\"to\":\"Laptop\"}");
        });
    }

    @Test
    void idempotencyKeyReturnsTheSameAssetAndRejectsADifferentBody() {
        var first = service.create(ALICE, details("Laptop"), computer.id(), "key-12345678", "hash-a");
        var again = service.create(ALICE, details("Laptop"), computer.id(), "key-12345678", "hash-a");
        assertThat(again.id()).isEqualTo(first.id());
        assertThat(assets.rows).hasSize(1);
        assertThatThrownBy(() -> service.create(ALICE, details("Other"), computer.id(), "key-12345678", "hash-b"))
                .isInstanceOf(InvalidStateException.class).hasMessageContaining("Idempotency-Key");
    }

    @Test
    void anotherUsersAssetIs404AndAnAuditorMayReadButNotWrite() {
        var asset = service.create(ALICE, details("Laptop"), computer.id(), null, "h");
        assertThatThrownBy(() -> service.get(BOB, asset.id())).isInstanceOf(NotFoundException.class);
        assertThat(service.get(AUDREY, asset.id()).id()).isEqualTo(asset.id());
        assertThatThrownBy(() -> service.update(AUDREY, asset.id(), 0, details("Renamed"), computer.id()))
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.create(AUDREY, details("x"), computer.id(), null, "h"))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void staleVersionIsRejectedBeforeAnyChange() {
        var asset = service.create(ALICE, details("Laptop"), computer.id(), null, "h");
        assertThatThrownBy(() -> service.update(ALICE, asset.id(), 7, details("Renamed"), computer.id()))
                .isInstanceOf(StaleVersionException.class)
                .satisfies(e -> assertThat(((StaleVersionException) e).changedBy()).isEqualTo("sub-alice"));
        assertThat(assets.rows.get(asset.id()).name()).isEqualTo("Laptop");
    }

    @Test
    void usersSeeOnlyTheirOwnAssetsInLists() {
        service.create(ALICE, details("A1"), computer.id(), null, "h1");
        service.create(BOB, details("B1"), computer.id(), null, "h2");
        var q = new AssetQuery(null, null, null, null, false, 0, 10, AssetQuery.Sort.DEFAULT);
        assertThat(service.search(ALICE, q).items()).extracting("name").containsExactly("A1");
        assertThat(service.search(ADMIN, q).items()).extracting("name").containsExactly("A1", "B1");
        assertThat(service.search(AUDREY, q).items()).hasSize(2);
    }

    @Test
    void archiveIsIdempotentRestoreIsAdminOnlyAndHardDeleteNeedsNoHistory() {
        var asset = service.create(ALICE, details("Laptop"), computer.id(), null, "h");
        service.archive(ALICE, asset.id());
        service.archive(ALICE, asset.id());
        assertThat(assets.rows.get(asset.id()).status()).isEqualTo(AssetStatus.ARCHIVED);
        assertThat(audit.rows).extracting("operation").containsExactly(AuditOperation.CREATE, AuditOperation.ARCHIVE);
        assertThatThrownBy(() -> service.restore(ALICE, asset.id())).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.hardDelete(ADMIN, UUID.randomUUID())).isInstanceOf(NotFoundException.class);
        service.hardDelete(ADMIN, asset.id());
        assertThat(assets.rows).isEmpty();
        assertThat(audit.rows).extracting("operation").last().isEqualTo(AuditOperation.DELETE);
    }
}
