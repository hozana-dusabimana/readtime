package com.readytime.web;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.readytime.AppException;
import com.readytime.model.User;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;

/** Easy access to one HTTP request: path values, query values, JSON body and the logged-in user. */
public class Request {

    private final HttpExchange exchange;
    private final Map<String, String> pathParams;
    private final User user;
    private JsonObject body;

    public Request(HttpExchange exchange, Map<String, String> pathParams, User user) {
        this.exchange = exchange;
        this.pathParams = pathParams;
        this.user = user;
    }

    /** The logged-in user. Throws 401 if nobody is logged in. */
    public User user() {
        if (user == null) {
            throw new AppException(401, "Please log in first.");
        }
        return user;
    }

    public HttpExchange exchange() {
        return exchange;
    }

    /** A number from the URL, e.g. {id} in /api/appointments/{id}/cancel. */
    public int pathInt(String name) {
        try {
            return Integer.parseInt(pathParams.get(name));
        } catch (NumberFormatException e) {
            throw new AppException(400, name + " must be a number.");
        }
    }

    /** A value after "?" in the URL, e.g. date in /slots?date=2026-11-05. */
    public String query(String name) {
        String raw = exchange.getRequestURI().getRawQuery();
        Map<String, String> values = new HashMap<>();
        if (raw != null) {
            for (String pair : raw.split("&")) {
                String[] kv = pair.split("=", 2);
                values.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8),
                        kv.length > 1 ? URLDecoder.decode(kv[1], StandardCharsets.UTF_8) : "");
            }
        }
        return values.get(name);
    }

    public LocalDate queryDate(String name) {
        try {
            return LocalDate.parse(query(name));
        } catch (DateTimeParseException | NullPointerException e) {
            throw new AppException(400, name + " must be a date like 2026-11-05.");
        }
    }

    /** The JSON body sent by the browser (read only once). */
    public JsonObject body() {
        if (body == null) {
            try {
                String text = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                body = text.isBlank() ? new JsonObject() : JsonParser.parseString(text).getAsJsonObject();
            } catch (IOException | RuntimeException e) {
                throw new AppException(400, "The request body must be valid JSON.");
            }
        }
        return body;
    }

    public JsonElement bodyElement(String name) {
        JsonElement e = body().get(name);
        return (e == null || e.isJsonNull()) ? null : e;
    }

    public String bodyString(String name) {
        JsonElement e = bodyElement(name);
        return e == null ? null : e.getAsString();
    }

    public Integer bodyInt(String name) {
        try {
            JsonElement e = bodyElement(name);
            return e == null ? null : e.getAsInt();
        } catch (RuntimeException ex) {
            throw new AppException(400, name + " must be a whole number.");
        }
    }

    public BigDecimal bodyDecimal(String name) {
        try {
            JsonElement e = bodyElement(name);
            return e == null ? null : e.getAsBigDecimal();
        } catch (RuntimeException ex) {
            throw new AppException(400, name + " must be a number.");
        }
    }

    public boolean bodyBoolean(String name, boolean defaultValue) {
        JsonElement e = bodyElement(name);
        return e == null ? defaultValue : e.getAsBoolean();
    }

    public LocalDateTime bodyDateTime(String name) {
        try {
            String s = bodyString(name);
            return s == null ? null : LocalDateTime.parse(s);
        } catch (DateTimeParseException e) {
            throw new AppException(400, name + " must look like 2026-11-05T09:30.");
        }
    }
}
