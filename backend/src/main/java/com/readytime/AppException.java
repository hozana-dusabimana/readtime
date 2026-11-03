package com.readytime;

/**
 * An error we expect and want to show to the user, e.g. "Slot already taken".
 * The status is the HTTP status code sent back to the browser:
 * 400 = bad input, 401 = not logged in, 403 = not allowed, 404 = not found, 409 = conflict.
 */
public class AppException extends RuntimeException {

    private final int status;

    public AppException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}
