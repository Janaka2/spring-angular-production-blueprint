package me.janaka.assetcare.infrastructure.web;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * A per-caller request budget per minute, in memory. It is the last line against a runaway client, not a DDoS
 * defence: that belongs at the ingress. Keyed by the bearer token's subject when present, else the client address.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class RateLimitFilter extends OncePerRequestFilter {

    static final int REQUESTS_PER_MINUTE = 300;

    private final Cache<String, AtomicInteger> buckets = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(1)).maximumSize(100_000).build();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) { return !request.getRequestURI().startsWith("/api/"); }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var key = keyFor(request);
        var count = buckets.get(key, k -> new AtomicInteger()).incrementAndGet();
        if (count > REQUESTS_PER_MINUTE) {
            response.setStatus(429);
            response.setContentType("application/problem+json");
            response.setHeader("Retry-After", "60");
            response.getWriter().write("{\"type\":\"https://assetcare.janaka.me/problems/rate-limit\",\"title\":\"Too many requests\","
                    + "\"status\":429,\"detail\":\"More than " + REQUESTS_PER_MINUTE + " requests in a minute. Slow down and retry.\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    /** The token's sub claim without validating it: a forged sub only limits the forger. */
    private static String keyFor(HttpServletRequest request) {
        var auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            var parts = auth.substring(7).split("\\.");
            if (parts.length == 3) return "t:" + Integer.toHexString(parts[1].hashCode());
        }
        return "ip:" + request.getRemoteAddr();
    }
}
