package me.janaka.assetcare.configuration;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Clock;
import java.time.Duration;
import me.janaka.assetcare.application.AttachmentService;
import me.janaka.assetcare.application.CategoryService;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling   // dependency health gauges (DependencyHealthMetrics); jobs would live in infrastructure/jobs
@EnableCaching
@EnableConfigurationProperties(AssetCareProperties.class)
public class CoreConfiguration {

    /** Injectable so tests can freeze time. UTC everywhere; the UI converts for display. */
    @Bean
    Clock clock() { return Clock.systemUTC(); }

    /** Local Caffeine cache for reference data. Redis only when several replicas need shared invalidation (SCALING.md). */
    @Bean
    CacheManager cacheManager() {
        var manager = new CaffeineCacheManager(CategoryService.CACHE);
        manager.setCaffeine(Caffeine.newBuilder().expireAfterWrite(Duration.ofMinutes(5)).maximumSize(100));
        return manager;
    }

    @Bean
    AttachmentService.Limits attachmentLimits(AssetCareProperties props) {
        return new AttachmentService.Limits(props.attachments().maxSizeBytes(), props.attachments().allowedContentTypes());
    }
}
