package com.readytime.model;

/**
 * Allowed changes (everything else is rejected):
 *   BOOKED -> CANCELLED
 *   BOOKED -> COMPLETED
 *   BOOKED -> NO_SHOW
 * CANCELLED, COMPLETED and NO_SHOW are final.
 */
public enum AppointmentStatus {
    BOOKED,
    CANCELLED,
    COMPLETED,
    NO_SHOW
}
