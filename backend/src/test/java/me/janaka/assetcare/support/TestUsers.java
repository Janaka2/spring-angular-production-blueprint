package me.janaka.assetcare.support;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

import java.util.List;
import java.util.Map;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;

/** Signed test tokens with the same claims Keycloak issues: sub, preferred_username and realm_access.roles. */
public final class TestUsers {
    private TestUsers() {}

    public static JwtRequestPostProcessor as(String subject, String username, String... roles) {
        return jwt()
                .jwt(j -> j.subject(subject).claim("preferred_username", username)
                        .claim("realm_access", Map.of("roles", List.of(roles))).audience(List.of("assetcare-api")))
                .authorities(List.of(roles).stream().<GrantedAuthority>map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList());
    }

    public static JwtRequestPostProcessor alice() { return as("10000000-0000-0000-0000-000000000001", "alice", "USER"); }
    public static JwtRequestPostProcessor bob() { return as("10000000-0000-0000-0000-000000000002", "bob", "USER"); }
    public static JwtRequestPostProcessor admin() { return as("10000000-0000-0000-0000-000000000003", "admin", "USER", "ADMIN"); }
    public static JwtRequestPostProcessor audrey() { return as("10000000-0000-0000-0000-000000000004", "audrey", "AUDITOR"); }
}
