package me.janaka.assetcare.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import me.janaka.assetcare.support.PostgresIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/** The Liquibase changelog applies on PostgreSQL 18 and Hibernate's validate step accepts the result (the context started). */
class SchemaIT extends PostgresIT {

    @Autowired JdbcTemplate jdbc;

    @Test
    void migrationsAppliedAndReferenceDataLoaded() {
        List<Map<String, Object>> changesets = jdbc.queryForList("select id from databasechangelog order by orderexecuted");
        assertThat(changesets).extracting(m -> m.get("id"))
                .contains("001-category", "002-asset", "006-audit-event", "007-idempotency-key", "100-categories")
                .doesNotContain("900-dev-demo-assets");
        assertThat(jdbc.queryForObject("select count(*) from category", Long.class)).isEqualTo(7L);
        assertThat(jdbc.queryForObject(
                "select count(*) from pg_indexes where tablename = 'asset' and indexname = 'ix_asset_owner_status_updated'", Long.class))
                .isEqualTo(1L);
        assertThat(jdbc.queryForObject("select obj_description('ix_asset_owner_status_updated'::regclass)", String.class))
                .contains("GET /api/v1/assets");
    }
}
