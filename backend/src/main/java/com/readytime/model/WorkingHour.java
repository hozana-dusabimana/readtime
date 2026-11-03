package com.readytime.model;

import java.time.LocalTime;

/** One working period, e.g. Monday 09:00-12:00. dayOfWeek: 1 = Monday ... 7 = Sunday. */
public record WorkingHour(int dayOfWeek, LocalTime startTime, LocalTime endTime) {
}
