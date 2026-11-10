package com.readytime.web.dto;

import com.readytime.model.WorkingHour;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * The JSON bodies the API accepts. Spring (Jackson) fills these records from the request body.
 * Missing fields become null; the services check them and answer 400 with a clear message.
 */
public final class Requests {

    private Requests() {
    }

    public record Register(String fullName, String email, String password) {
    }

    public record RegisterProvider(String fullName, String email, String password,
                                   String businessName, String businessAddress) {
    }

    public record Login(String email, String password) {
    }

    public record Profile(String fullName, String email) {
    }

    public record ChangePassword(String currentPassword, String newPassword) {
    }

    public record CreateUser(String fullName, String email, String password, String role, Integer businessId) {
    }

    public record UpdateUser(String fullName, String email, Integer businessId, String newPassword) {
    }

    /** {"active": true/false}. A missing value means true. */
    public record Active(Boolean active) {
        public boolean activeOrTrue() {
            return active == null || active;
        }
    }

    public record BusinessDetails(String name, String address) {
    }

    /** {"name", "durationMinutes", "price", "active"}. A missing "active" means true. */
    public record ServiceDetails(String name, Integer durationMinutes, BigDecimal price, Boolean active) {
        public boolean activeOrTrue() {
            return active == null || active;
        }
    }

    /** {"hours": [{"dayOfWeek": 1, "startTime": "09:00", "endTime": "12:00"}, ...]} */
    public record Hours(List<WorkingHour> hours) {
    }

    public record Book(Integer serviceId, LocalDateTime startAt) {
    }

    public record Reschedule(LocalDateTime startAt) {
    }

    public record Status(String status) {
    }
}
