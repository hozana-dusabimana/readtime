package com.readytime.web;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import com.readytime.AppException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;

/**
 * Turns every error into a JSON answer like {"error": "This time slot is already booked."}
 * with a fitting HTTP status code.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    /** Errors we expect and want to show to the user (400, 401, 403, 404, 409). */
    @ExceptionHandler(AppException.class)
    public ResponseEntity<Map<String, String>> app(AppException e) {
        return error(e.getStatus(), e.getMessage());
    }

    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class,
            HttpRequestMethodNotSupportedException.class})
    public ResponseEntity<Map<String, String>> unknownAddress(HttpServletRequest request) {
        return error(404, "Unknown API address: " + request.getMethod() + " " + request.getRequestURI());
    }

    /** A number in the URL that is not a number, e.g. /api/appointments/abc/cancel. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> badPathValue(MethodArgumentTypeMismatchException e) {
        return error(400, e.getName() + " must be a number.");
    }

    /** The JSON body could not be read, or a field has the wrong type. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> badBody(HttpMessageNotReadableException e) {
        if (e.getCause() instanceof MismatchedInputException m && !m.getPath().isEmpty()) {
            String field = fieldName(m);
            if ("hours".equals(m.getPath().get(0).getFieldName())) {
                return error(400, "Hours must be a list like [{dayOfWeek, startTime, endTime}].");
            }
            Class<?> type = m.getTargetType();
            if (type == LocalDateTime.class) {
                return error(400, field + " must look like 2026-11-05T09:30.");
            }
            if (type == LocalTime.class) {
                return error(400, field + " must look like 09:30.");
            }
            if (type == Integer.class || type == int.class) {
                return error(400, field + " must be a whole number.");
            }
            if (type == BigDecimal.class) {
                return error(400, field + " must be a number.");
            }
            return error(400, field + " has a wrong value.");
        }
        return error(400, "The request body must be valid JSON.");
    }

    /** Database rules that protect the data even if a check in Java was missed. */
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> database(DataAccessException e) {
        String state = sqlState(e);
        if ("23P01".equals(state)) {   // our no_overlapping_bookings rule was broken
            return error(409, "This time slot is already booked.");
        }
        if ("23505".equals(state)) {   // UNIQUE rule broken (e.g. same email twice)
            return error(409, "This record already exists (for example, the email is taken).");
        }
        return unexpected(e);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> unexpected(Exception e) {
        log.error("Unexpected error", e);   // show the full problem in the server console
        return error(500, "Something went wrong on the server.");
    }

    private static String fieldName(JsonMappingException e) {
        String name = null;
        for (JsonMappingException.Reference ref : e.getPath()) {
            if (ref.getFieldName() != null) {
                name = ref.getFieldName();
            }
        }
        return name == null ? "A value" : name;
    }

    private static String sqlState(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof SQLException sql && sql.getSQLState() != null) {
                return sql.getSQLState();
            }
        }
        return null;
    }

    private static ResponseEntity<Map<String, String>> error(int status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }
}
