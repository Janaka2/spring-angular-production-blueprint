package me.janaka.assetcare.infrastructure.storage;

import java.io.InputStream;
import java.net.URI;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import me.janaka.assetcare.application.port.AttachmentStorage;
import me.janaka.assetcare.configuration.AssetCareProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * S3-compatible storage: MinIO in compose and K3s, OCI Object Storage (S3 compatibility API) in the cloud.
 * One adapter, three deployments; only the endpoint, region and credentials differ.
 */
@Component
@ConditionalOnProperty(name = "assetcare.storage.type", havingValue = "s3")
public class S3AttachmentStorage implements AttachmentStorage {

    private final S3Client s3;
    private final String bucket;

    public S3AttachmentStorage(AssetCareProperties props) {
        var s = props.storage().s3();
        this.bucket = s.bucket();
        this.s3 = S3Client.builder()
                .endpointOverride(URI.create(s.endpoint()))
                .region(Region.of(s.region()))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(s.accessKey(), s.secretKey())))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(s.pathStyle()).build())
                .build();
    }

    @Override
    public String store(String key, InputStream content, long sizeBytes, String contentType) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            var in = new DigestInputStream(content, digest);
            s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).contentLength(sizeBytes).build(),
                    RequestBody.fromInputStream(in, sizeBytes));
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @Override
    public InputStream open(String key) {
        return s3.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build());
    }

    @Override
    public void delete(String key) {
        s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }
}
