package me.janaka.assetcare.infrastructure.health;

import java.nio.file.Files;
import java.nio.file.Path;
import me.janaka.assetcare.configuration.AssetCareProperties;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * Reports whether attachment storage is usable: the filesystem root is writable, or the S3 bucket answers.
 * Part of the "dependencies" health group, not of readiness: a storage outage breaks uploads, not the whole API,
 * and taking every pod out of service would turn a partial outage into a full one (see HEALTH-MONITORING.md).
 */
@Component("storage")
public class StorageHealthIndicator implements HealthIndicator {

    private final AssetCareProperties props;
    private final StorageProbe probe;

    public StorageHealthIndicator(AssetCareProperties props, StorageProbe probe) {
        this.props = props;
        this.probe = probe;
    }

    @Override
    public Health health() {
        var type = props.storage().type();
        try {
            if ("s3".equals(type)) {
                probe.headBucket();
                return Health.up().withDetail("type", "s3").withDetail("bucket", props.storage().s3().bucket()).build();
            }
            var root = Path.of(props.storage().filesystem().root());
            Files.createDirectories(root);
            if (!Files.isWritable(root)) {
                return Health.down().withDetail("type", "filesystem").withDetail("root", root.toAbsolutePath().toString())
                        .withDetail("reason", "not writable").build();
            }
            return Health.up().withDetail("type", "filesystem").withDetail("root", root.toAbsolutePath().toString()).build();
        } catch (Exception e) {
            return Health.down(e).withDetail("type", type).build();
        }
    }

    /** Narrow seam so the S3 client stays inside the storage adapter and the indicator is testable without one. */
    public interface StorageProbe {
        void headBucket();
    }
}
