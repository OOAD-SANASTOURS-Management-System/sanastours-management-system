package com.sanastours.security;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Throttles repeated failed logins.
 *
 * Fix 3.11: the login endpoint had no rate limiting or lockout of any kind, so
 * passwords could be guessed as fast as requests could be sent.
 *
 * Deliberately simple and in-memory: it resets when the application restarts
 * and does not coordinate across instances, which is appropriate for a single
 * deployment and is a large improvement on no limit at all.
 */
@Component
public class LoginAttemptService {

    private static final int MAX_FAILURES = 5;
    private static final Duration LOCKOUT = Duration.ofMinutes(15);
    private static final Duration FORGET_AFTER = Duration.ofHours(1);

    private static class Attempts {
        int failures;
        Instant lastFailure = Instant.now();
        Instant lockedUntil;
    }

    private final Map<String, Attempts> byIdentifier = new ConcurrentHashMap<>();

    private String key(String identifier) {
        return identifier == null ? "" : identifier.trim().toLowerCase();
    }

    /** Seconds left on the lockout, or 0 when the caller may try again. */
    public long lockedForSeconds(String identifier) {
        Attempts a = byIdentifier.get(key(identifier));
        if (a == null || a.lockedUntil == null) return 0;
        long left = Duration.between(Instant.now(), a.lockedUntil).getSeconds();
        if (left <= 0) {
            // Lockout served; start again with a clean slate.
            byIdentifier.remove(key(identifier));
            return 0;
        }
        return left;
    }

    public void recordFailure(String identifier) {
        String k = key(identifier);
        Attempts a = byIdentifier.computeIfAbsent(k, x -> new Attempts());
        // An isolated typo an hour ago should not count towards a lockout.
        if (Duration.between(a.lastFailure, Instant.now()).compareTo(FORGET_AFTER) > 0) {
            a.failures = 0;
        }
        a.failures++;
        a.lastFailure = Instant.now();
        if (a.failures >= MAX_FAILURES) {
            a.lockedUntil = Instant.now().plus(LOCKOUT);
            a.failures = 0;
        }
    }

    public void recordSuccess(String identifier) {
        byIdentifier.remove(key(identifier));
    }
}
