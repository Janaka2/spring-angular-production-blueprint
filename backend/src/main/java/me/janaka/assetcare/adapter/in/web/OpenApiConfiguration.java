package me.janaka.assetcare.adapter.in.web;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The OpenAPI document is generated from the controllers; this adds the title and the bearer scheme. */
@Configuration
public class OpenApiConfiguration {

    @Bean
    OpenAPI assetCareOpenApi() {
        return new OpenAPI()
                .info(new Info().title("AssetCare API").version("v1")
                        .description("Personal and enterprise asset maintenance. Errors are RFC 9457 Problem Details. "
                                + "Updates require If-Match with the ETag; creates accept an Idempotency-Key.")
                        .license(new License().name("Apache-2.0")))
                .components(new Components().addSecuritySchemes("bearer", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
                        .description("Access token from Keycloak (realm assetcare)")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }
}
