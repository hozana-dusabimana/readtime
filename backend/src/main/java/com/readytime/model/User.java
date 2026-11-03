package com.readytime.model;

/**
 * A person who can log in. The password hash is deliberately NOT stored here,
 * so it can never be sent to the browser by accident.
 * businessId is null for clients and system admins.
 */
public record User(
        int id,
        String fullName,
        String email,
        Role role,
        Integer businessId,
        int noShowCount,
        boolean blocked,
        boolean active) {
}
