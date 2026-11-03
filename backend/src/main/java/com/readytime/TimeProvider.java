package com.readytime;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * The single place where the app asks "what time is it now?".
 * The whole system uses Africa/Kigali time.
 * Tests can pass a fixed Clock to pretend it is any moment they like.
 */
public class TimeProvider {

    public static final ZoneId ZONE = ZoneId.of("Africa/Kigali");

    private final Clock clock;

    public TimeProvider(Clock clock) {
        this.clock = clock;
    }

    public static TimeProvider system() {
        return new TimeProvider(Clock.system(ZONE));
    }

    public LocalDateTime now() {
        return LocalDateTime.now(clock).withNano(0);
    }
}
