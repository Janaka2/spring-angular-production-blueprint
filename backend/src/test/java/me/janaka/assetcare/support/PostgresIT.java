package me.janaka.assetcare.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base class for integration tests: a real PostgreSQL 18 in a container, Liquibase applied, Hibernate validating the
 * schema against the entities. One container per JVM. Security is exercised with signed test JWTs (spring-security-test),
 * so Keycloak is not needed for API tests.
 */
@SpringBootTest
@Testcontainers
@TestPropertySource(properties = {
        "spring.liquibase.contexts=test",
        "assetcare.demo-data=false",          // tests create their own data; the demo LAPTOP-1 would collide
        "assetcare.storage.type=filesystem",
        "assetcare.storage.filesystem.root=${java.io.tmpdir}/assetcare-it-attachments",
        "management.tracing.enabled=false",
        "management.opentelemetry.tracing.export.otlp.endpoint=http://localhost:1/v1/traces"
})
public abstract class PostgresIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18.6-alpine3.24");
}
