package com.readytime.service;

import com.readytime.model.Appointment;
import com.readytime.model.WorkingHour;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure calculations for appointment slots (no database here, so it is easy to unit test).
 *
 * Rules (assumption A7):
 *  - Slots start at the beginning of each working period and step by the service duration.
 *    Example: period 09:00-12:00, 45-minute service -> 09:00, 09:45, 10:30, 11:15.
 *  - A slot must fit completely inside ONE period, so it never runs into a break.
 *  - Free slots also must be in the future and must not overlap a BOOKED appointment.
 */
public class SlotCalculator {

    /** All possible slot start times on a date, ignoring existing bookings. */
    public static List<LocalDateTime> allSlots(List<WorkingHour> hours, LocalDate date, int durationMinutes) {
        int day = date.getDayOfWeek().getValue();   // 1 = Monday ... 7 = Sunday
        List<LocalDateTime> slots = new ArrayList<>();
        for (WorkingHour period : hours) {
            if (period.dayOfWeek() != day) {
                continue;
            }
            LocalDateTime start = date.atTime(period.startTime());
            LocalDateTime periodEnd = date.atTime(period.endTime());
            while (!start.plusMinutes(durationMinutes).isAfter(periodEnd)) {
                slots.add(start);
                start = start.plusMinutes(durationMinutes);
            }
        }
        slots.sort(null);   // natural order: earliest first
        return slots;
    }

    /** Slots a client can actually book: in the future and not overlapping a booking. */
    public static List<LocalDateTime> freeSlots(List<WorkingHour> hours, LocalDate date, int durationMinutes,
                                                List<Appointment> booked, LocalDateTime now) {
        List<LocalDateTime> free = new ArrayList<>();
        for (LocalDateTime start : allSlots(hours, date, durationMinutes)) {
            LocalDateTime end = start.plusMinutes(durationMinutes);
            if (start.isAfter(now) && !overlapsAny(start, end, booked)) {
                free.add(start);
            }
        }
        return free;
    }

    /** Two time ranges overlap when each one starts before the other one ends. */
    public static boolean overlaps(LocalDateTime start1, LocalDateTime end1,
                                   LocalDateTime start2, LocalDateTime end2) {
        return start1.isBefore(end2) && start2.isBefore(end1);
    }

    private static boolean overlapsAny(LocalDateTime start, LocalDateTime end, List<Appointment> booked) {
        for (Appointment a : booked) {
            if (overlaps(start, end, a.startAt(), a.endAt())) {
                return true;
            }
        }
        return false;
    }

    /** True if [start, end) lies completely inside one working period. */
    public static boolean isInsideWorkingHours(List<WorkingHour> hours, LocalDateTime start, LocalDateTime end) {
        if (!start.toLocalDate().equals(end.toLocalDate())) {
            return false;
        }
        int day = start.getDayOfWeek().getValue();
        for (WorkingHour period : hours) {
            if (period.dayOfWeek() == day
                    && !start.toLocalTime().isBefore(period.startTime())
                    && !end.toLocalTime().isAfter(period.endTime())) {
                return true;
            }
        }
        return false;
    }
}
