package com.readytime.service;

import com.readytime.AppException;

import java.math.BigDecimal;

/** Small input checks shared by the services. Each one throws a 400 error if the input is bad. */
public class Validate {

    public static final int PASSWORD_MIN = 8;
    public static final int PASSWORD_MAX = 64;

    /** Text must not be empty and its length must be between min and max (after trimming spaces). */
    public static String text(String value, String fieldName, int min, int max) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.length() < min || trimmed.length() > max) {
            throw new AppException(400, fieldName + " must be " + min + " to " + max + " characters.");
        }
        return trimmed;
    }

    /** Simple email check: something@something.something, at most 100 characters. Returned in lower case. */
    public static String email(String email) {
        String e = email == null ? "" : email.trim().toLowerCase();
        if (e.length() > 100 || !e.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new AppException(400, "Please enter a valid email address.");
        }
        return e;
    }

    public static void password(String password) {
        if (password == null || password.length() < PASSWORD_MIN || password.length() > PASSWORD_MAX) {
            throw new AppException(400, "Password must be " + PASSWORD_MIN + " to " + PASSWORD_MAX + " characters.");
        }
    }

    public static int duration(Integer minutes) {
        if (minutes == null || minutes < 5 || minutes > 480) {
            throw new AppException(400, "Duration must be between 5 and 480 minutes.");
        }
        return minutes;
    }

    public static BigDecimal price(BigDecimal price) {
        if (price == null || price.signum() < 0) {
            throw new AppException(400, "Price must be 0 or more.");
        }
        return price;
    }
}
