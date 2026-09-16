package me.janaka.assetcare.configuration;

import java.util.List;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Typed view of the assetcare.* block in application.yml. */
@ConfigurationProperties(prefix = "assetcare")
public record AssetCareProperties(Cors cors, Storage storage, Attachments attachments, Api api) {

    public record Cors(List<String> allowedOrigins) {}

    public record Storage(String type, Filesystem filesystem, S3 s3) {
        public record Filesystem(String root) {}
        public record S3(String endpoint, String region, String bucket, String accessKey, String secretKey, boolean pathStyle) {}
    }

    public record Attachments(long maxSizeBytes, Set<String> allowedContentTypes) {}

    public record Api(int maxPageSize) {}
}
