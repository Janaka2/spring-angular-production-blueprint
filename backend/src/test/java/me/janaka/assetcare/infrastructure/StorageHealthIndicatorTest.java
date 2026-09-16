package me.janaka.assetcare.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import me.janaka.assetcare.configuration.AssetCareProperties;
import me.janaka.assetcare.infrastructure.health.StorageHealthIndicator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.health.contributor.Status;

class StorageHealthIndicatorTest {

    private static AssetCareProperties props(String type, String root) {
        return new AssetCareProperties(new AssetCareProperties.Cors(List.of()),
                new AssetCareProperties.Storage(type, new AssetCareProperties.Storage.Filesystem(root),
                        new AssetCareProperties.Storage.S3("http://localhost:9002", "eu", "b", "k", "s", true)),
                new AssetCareProperties.Attachments(1, Set.of()), new AssetCareProperties.Api(100));
    }

    @Test
    void filesystemRootThatCanBeCreatedIsUp(@TempDir Path dir) {
        var health = new StorageHealthIndicator(props("filesystem", dir.resolve("attachments").toString()), () -> {}).health();
        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails()).containsEntry("type", "filesystem");
    }

    @Test
    void s3BucketThatAnswersIsUpAndOneThatThrowsIsDown() {
        assertThat(new StorageHealthIndicator(props("s3", ""), () -> {}).health().getStatus()).isEqualTo(Status.UP);
        var down = new StorageHealthIndicator(props("s3", ""), () -> { throw new IllegalStateException("no route to bucket"); }).health();
        assertThat(down.getStatus()).isEqualTo(Status.DOWN);
        assertThat(down.getDetails().get("error").toString()).contains("no route to bucket");
    }
}
