package me.janaka.assetcare.infrastructure.security;

import java.util.Set;
import java.util.stream.Collectors;
import me.janaka.assetcare.application.port.CurrentUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/** The caller, read from the JWT of the current request. Singleton: it looks up the security context on each call. */
@Component
public class JwtCurrentUser implements CurrentUser {

    @Override public String subject() { return token().getToken().getSubject(); }

    @Override public String displayName() {
        Jwt jwt = token().getToken();
        var name = jwt.getClaimAsString("preferred_username");
        return name != null ? name : jwt.getSubject();
    }

    @Override public Set<Role> roles() {
        return token().getAuthorities().stream()
                .map(a -> a.getAuthority())
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5))
                .filter(r -> { try { Role.valueOf(r); return true; } catch (IllegalArgumentException e) { return false; } })
                .map(Role::valueOf)
                .collect(Collectors.toUnmodifiableSet());
    }

    private static JwtAuthenticationToken token() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwt) return jwt;
        throw new IllegalStateException("no authenticated JWT in the security context");
    }
}
