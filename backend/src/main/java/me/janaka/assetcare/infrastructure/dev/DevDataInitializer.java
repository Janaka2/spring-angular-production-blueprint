package me.janaka.assetcare.infrastructure.dev;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import me.janaka.assetcare.application.port.AssetRepository;
import me.janaka.assetcare.application.port.CategoryRepository;
import me.janaka.assetcare.application.port.MaintenanceItemRepository;
import me.janaka.assetcare.domain.Asset;
import me.janaka.assetcare.domain.MaintenanceItem;
import me.janaka.assetcare.domain.MaintenanceType;
import me.janaka.assetcare.domain.Money;
import me.janaka.assetcare.domain.Recurrence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Demo assets for local development, owned by the development realm's users (their ids are fixed in the realm export).
 * Enabled with assetcare.demo-data=true (the default profile in application.yml); never in production.
 */
@Component
@ConditionalOnProperty(name = "assetcare.demo-data", havingValue = "true")
public class DevDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataInitializer.class);
    static final String ALICE = "10000000-0000-0000-0000-000000000001";
    static final String BOB = "10000000-0000-0000-0000-000000000002";

    private final AssetRepository assets;
    private final CategoryRepository categories;
    private final MaintenanceItemRepository items;
    private final Clock clock;

    public DevDataInitializer(AssetRepository assets, CategoryRepository categories, MaintenanceItemRepository items, Clock clock) {
        this.assets = assets; this.categories = categories; this.items = items; this.clock = clock;
    }

    @Override
    @Transactional
    public void run(org.springframework.boot.ApplicationArguments args) {
        if (assets.countByOwnerAndNotArchived(ALICE) > 0) return;
        var now = Instant.now(clock);
        var computer = categories.findByCode("COMPUTER").orElseThrow();
        var vehicle = categories.findByCode("VEHICLE").orElseThrow();
        var appliance = categories.findByCode("APPLIANCE").orElseThrow();

        var laptop = assets.save(Asset.create(new Asset.Details("MacBook Pro 14", "Work laptop", "LAPTOP-1", "C02XK1", "Apple", "M4 Pro",
                LocalDate.of(2025, 1, 15), Money.of("2499", "CHF"), LocalDate.of(2027, 1, 15), "Zug office", null), computer, ALICE, now));
        var car = assets.save(Asset.create(new Asset.Details("Family car", null, "CAR-1", "WVWZZZ1KZ", "Volkswagen", "Golf",
                LocalDate.of(2022, 5, 3), Money.of("28900", "CHF"), LocalDate.of(2025, 5, 3), "Garage", "Winter tyres in the cellar"), vehicle, ALICE, now));
        assets.save(Asset.create(new Asset.Details("Boiler", "Gas boiler, cellar", "BOILER-1", null, "Vaillant", "ecoTEC",
                LocalDate.of(2019, 10, 1), null, null, "Cellar", null), appliance, ALICE, now));
        assets.save(Asset.create(new Asset.Details("E-bike", null, "BIKE-1", null, "Flyer", "Upstreet", LocalDate.of(2024, 4, 12),
                Money.of("3990", "CHF"), LocalDate.of(2026, 10, 12), "Basement", null), vehicle, BOB, now));

        items.save(MaintenanceItem.plan(car, new MaintenanceItem.Details(MaintenanceType.SERVICE, "Annual service", LocalDate.now(clock).plusDays(12),
                new Recurrence("P1Y"), Money.of("450", "CHF"), "Garage Meier", null), ALICE, now));
        items.save(MaintenanceItem.plan(laptop, new MaintenanceItem.Details(MaintenanceType.INSPECTION, "Battery health check", LocalDate.now(clock).minusDays(3),
                null, null, null, null), ALICE, now));
        log.atInfo().addKeyValue("event", "DEMO_DATA_LOADED").addKeyValue("assets", Set.of("LAPTOP-1", "CAR-1", "BOILER-1", "BIKE-1")).log("demo data loaded");
    }
}
