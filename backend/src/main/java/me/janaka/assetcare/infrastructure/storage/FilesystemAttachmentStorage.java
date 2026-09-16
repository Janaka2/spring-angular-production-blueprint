package me.janaka.assetcare.infrastructure.storage;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import me.janaka.assetcare.application.port.AttachmentStorage;
import me.janaka.assetcare.configuration.AssetCareProperties;
import me.janaka.assetcare.domain.NotFoundException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Development storage: a directory. Keys are validated so they cannot escape the root. */
@Component
@ConditionalOnProperty(name = "assetcare.storage.type", havingValue = "filesystem", matchIfMissing = true)
public class FilesystemAttachmentStorage implements AttachmentStorage {

    private final Path root;

    public FilesystemAttachmentStorage(AssetCareProperties props) {
        this.root = Path.of(props.storage().filesystem().root()).toAbsolutePath().normalize();
    }

    @Override
    public String store(String key, InputStream content, long sizeBytes, String contentType) {
        var target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            var digest = MessageDigest.getInstance("SHA-256");
            try (var in = new DigestInputStream(content, digest)) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @Override
    public InputStream open(String key) {
        try {
            return Files.newInputStream(resolve(key));
        } catch (IOException e) {
            throw new NotFoundException("Attachment content", java.util.UUID.nameUUIDFromBytes(key.getBytes()));
        }
    }

    @Override
    public void delete(String key) {
        try { Files.deleteIfExists(resolve(key)); } catch (IOException e) { throw new UncheckedIOException(e); }
    }

    private Path resolve(String key) {
        var p = root.resolve(key).normalize();
        if (!p.startsWith(root)) throw new IllegalArgumentException("storage key escapes the root");
        return p;
    }
}
