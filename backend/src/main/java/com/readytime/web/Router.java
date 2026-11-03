package com.readytime.web;

import com.readytime.AppException;
import com.readytime.model.User;
import com.readytime.service.AuthService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Sends each API request to the right piece of code, based on the HTTP method and the path.
 *
 *   router.add("GET", "/api/appointments/{id}", req -> ...);
 *
 * Whatever the action returns is sent back as JSON. An AppException becomes an
 * error response like {"error": "Slot already booked."} with its status code.
 */
public class Router implements HttpHandler {

    /** The code that runs for one route. */
    public interface Action {
        Object handle(Request req) throws Exception;
    }

    private record Route(String method, Pattern pattern, List<String> paramNames, Action action) {
    }

    private final List<Route> routes = new ArrayList<>();
    private final AuthService authService;
    private final String allowedOrigin;

    /** allowedOrigin: which website may call this API, e.g. "http://localhost:5500" or "*" for any. */
    public Router(AuthService authService, String allowedOrigin) {
        this.authService = authService;
        this.allowedOrigin = allowedOrigin;
    }

    public void add(String method, String path, Action action) {
        // Turn "/api/appointments/{id}/cancel" into the regex "/api/appointments/([^/]+)/cancel"
        List<String> names = new ArrayList<>();
        Matcher m = Pattern.compile("\\{(\\w+)}").matcher(path);
        while (m.find()) {
            names.add(m.group(1));
        }
        String regex = path.replaceAll("\\{\\w+}", "([^/]+)");
        routes.add(new Route(method, Pattern.compile("^" + regex + "$"), names, action));
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        try {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();

            // CORS: the frontend runs on a different address (e.g. port 5500), so the
            // browser asks the API for permission first. These headers give that permission.
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", allowedOrigin);
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
            if (method.equals("OPTIONS")) {   // the browser's "may I?" question - answer yes, no body
                exchange.sendResponseHeaders(204, -1);
                exchange.close();
                return;
            }

            for (Route route : routes) {
                Matcher m = route.pattern().matcher(path);
                if (route.method().equals(method) && m.matches()) {
                    Map<String, String> params = new HashMap<>();
                    for (int i = 0; i < route.paramNames().size(); i++) {
                        params.put(route.paramNames().get(i), m.group(i + 1));
                    }
                    User user = authService.findUserByToken(tokenOf(exchange));
                    Object result = route.action().handle(new Request(exchange, params, user));
                    send(exchange, 200, result == null ? Map.of("ok", true) : result);
                    return;
                }
            }
            send(exchange, 404, Map.of("error", "Unknown API address: " + method + " " + path));
        } catch (AppException e) {
            send(exchange, e.getStatus(), Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();   // show the full problem in the server console
            send(exchange, 500, Map.of("error", "Something went wrong on the server."));
        }
    }

    /** The session token is sent in the header "Authorization: Bearer <token>" (by the frontend and by Postman). */
    public static String tokenOf(HttpExchange exchange) {
        String auth = exchange.getRequestHeaders().getFirst("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            return auth.substring(7).trim();
        }
        return null;
    }

    private static void send(HttpExchange exchange, int status, Object body) throws IOException {
        byte[] bytes = Json.GSON.toJson(body).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }
}
