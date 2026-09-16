package me.janaka.assetcare.infrastructure.health;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.boot.health.contributor.Status;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Publishes the dependency health indicators as the gauge {@code assetcare_dependency_up{name}} (1 = UP, 0 = not),
 * evaluated every 30 seconds off the request path, so Prometheus can alert on a degraded dependency
 * (AssetCareDependencyDown) without scraping the health endpoint itself.
 */
@Component
public class DependencyHealthMetrics {

    private final Map<String, HealthIndicator> indicators;
    private final Map<String, AtomicInteger> values = new ConcurrentHashMap<>();

    public DependencyHealthMetrics(MeterRegistry registry, StorageHealthIndicator storage, IdentityProviderHealthIndicator idp) {
        this.indicators = Map.of("storage", storage, "identityProvider", idp);
        indicators.keySet().forEach(name -> {
            var value = values.computeIfAbsent(name, n -> new AtomicInteger(1));
            Gauge.builder("assetcare_dependency_up", value, AtomicInteger::get)
                    .description("1 when the dependency health indicator reports UP")
                    .tag("name", name)
                    .register(registry);
        });
    }

    @Scheduled(initialDelayString = "PT10S", fixedDelayString = "PT30S")
    public void refresh() {
        indicators.forEach((name, indicator) -> {
            int up;
            try {
                up = Status.UP.equals(indicator.health().getStatus()) ? 1 : 0;
            } catch (RuntimeException e) {
                up = 0;
            }
            values.get(name).set(up);
        });
    }
}
