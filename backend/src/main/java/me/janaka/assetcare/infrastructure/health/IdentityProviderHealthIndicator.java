package me.janaka.assetcare.infrastructure.health;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * Fetches the OIDC discovery document of the configured issuer. Informational (group "dependencies"): tokens already
 * issued keep validating from the cached JWK set, so an identity provider outage stops new logins, not the API.
 */
@Component("identityProvider")
public class IdentityProviderHealthIndicator implements HealthIndicator {

    private static final Duration TIMEOUT = Duration.ofSeconds(3);
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
    private final String issuer;

    public IdentityProviderHealthIndicator(@Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuer) {
        this.issuer = issuer;
    }

    @Override
    public Health health() {
        var url = issuer.replaceAll("/$", "") + "/.well-known/openid-configuration";
        try {
            var response = client.send(HttpRequest.newBuilder(URI.create(url)).timeout(TIMEOUT).GET().build(),
                    HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() == 200) {
                return Health.up().withDetail("issuer", issuer).build();
            }
            return Health.down().withDetail("issuer", issuer).withDetail("status", response.statusCode()).build();
        } catch (Exception e) {
            return Health.down(e).withDetail("issuer", issuer).build();
        }
    }
}
