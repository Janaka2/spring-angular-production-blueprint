package me.janaka.assetcare.adapter.in.web.dto;

import java.util.Set;
import me.janaka.assetcare.application.port.CurrentUser;

public record MeResponse(String subject, String displayName, Set<CurrentUser.Role> roles) {
    public static MeResponse from(CurrentUser u) { return new MeResponse(u.subject(), u.displayName(), u.roles()); }
}
