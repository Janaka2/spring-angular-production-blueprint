package me.janaka.assetcare.application.port;

import java.util.Set;

/** Who is calling. Implemented from the JWT by the security infrastructure; faked in tests. */
public interface CurrentUser {
    String subject();
    String displayName();
    Set<Role> roles();

    enum Role { USER, ADMIN, AUDITOR }

    default boolean has(Role role) { return roles().contains(role); }
    default boolean isAdmin() { return has(Role.ADMIN); }
    default boolean isAuditor() { return has(Role.AUDITOR); }
}
