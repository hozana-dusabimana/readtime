package com.readytime.model;

import java.time.LocalDateTime;

/** A booking. The *Name fields are filled in from other tables for display. */
public record Appointment(
        int id,
        int clientId,
        String clientName,
        int providerId,
        String providerName,
        int serviceId,
        String serviceName,
        LocalDateTime startAt,
        LocalDateTime endAt,
        AppointmentStatus status) {
}
