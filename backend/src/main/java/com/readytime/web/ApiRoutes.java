package com.readytime.web;

import com.readytime.AppException;
import com.readytime.model.AppointmentStatus;
import com.readytime.model.User;
import com.readytime.model.WorkingHour;
import com.readytime.service.AdminService;
import com.readytime.service.AppointmentService;
import com.readytime.service.AuthService;
import com.readytime.service.BusinessService;
import com.readytime.service.CatalogService;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * The full list of API addresses. Each one is a short lambda that reads the
 * request and calls a service. The role checks happen inside the services.
 */
public class ApiRoutes {

    public static void register(Router r, AuthService auth, AdminService admin, BusinessService business,
                                CatalogService catalog, AppointmentService appointments) {

        // ---------- Login / register (no login needed) ----------
        r.add("POST", "/api/register", req ->
                auth.register(req.bodyString("fullName"), req.bodyString("email"), req.bodyString("password")));

        // Returns {"token": "...", "user": {...}}. The frontend keeps the token and sends it
        // back with every request in the header "Authorization: Bearer <token>".
        r.add("POST", "/api/login", req -> auth.login(req.bodyString("email"), req.bodyString("password")));

        r.add("POST", "/api/logout", req -> {
            auth.logout(Router.tokenOf(req.exchange()));
            return null;
        });

        r.add("GET", "/api/me", req -> req.user());

        // ---------- System admin ----------
        r.add("GET", "/api/admin/users", req -> admin.listUsers(req.user()));

        r.add("POST", "/api/admin/users/{id}/unblock", req -> {
            admin.unblockClient(req.user(), req.pathInt("id"));
            return null;
        });

        r.add("POST", "/api/admin/users/{id}/active", req -> {
            admin.setUserActive(req.user(), req.pathInt("id"), req.bodyBoolean("active", true));
            return null;
        });

        r.add("POST", "/api/admin/businesses", req ->
                admin.createBusiness(req.user(), req.bodyString("name"), req.bodyString("address")));

        r.add("POST", "/api/admin/businesses/{id}/active", req -> {
            admin.setBusinessActive(req.user(), req.pathInt("id"), req.bodyBoolean("active", true));
            return null;
        });

        r.add("POST", "/api/admin/businesses/{id}/admins", req ->
                admin.createBusinessAdmin(req.user(), req.pathInt("id"),
                        req.bodyString("fullName"), req.bodyString("email"), req.bodyString("password")));

        // ---------- Businesses and providers ----------
        r.add("GET", "/api/businesses", req -> business.listBusinesses(req.user()));

        r.add("GET", "/api/businesses/{id}/providers", req -> {
            req.user();   // must be logged in
            return business.listProviders(req.pathInt("id"));
        });

        r.add("POST", "/api/providers", req ->
                business.createProvider(req.user(),
                        req.bodyString("fullName"), req.bodyString("email"), req.bodyString("password")));

        // ---------- Services ----------
        r.add("GET", "/api/providers/{id}/services", req -> catalog.listServices(req.user(), req.pathInt("id")));

        r.add("POST", "/api/providers/{id}/services", req ->
                catalog.createService(req.user(), req.pathInt("id"), req.bodyString("name"),
                        req.bodyInt("durationMinutes"), req.bodyDecimal("price")));

        r.add("PUT", "/api/services/{id}", req ->
                catalog.updateService(req.user(), req.pathInt("id"), req.bodyString("name"),
                        req.bodyInt("durationMinutes"), req.bodyDecimal("price"), req.bodyBoolean("active", true)));

        // ---------- Working hours ----------
        r.add("GET", "/api/providers/{id}/hours", req -> {
            req.user();
            return catalog.getHours(req.pathInt("id"));
        });

        // Body: {"hours": [{"dayOfWeek": 1, "startTime": "09:00", "endTime": "12:00"}, ...]}
        r.add("PUT", "/api/providers/{id}/hours", req -> {
            List<WorkingHour> hours;
            try {
                hours = Arrays.asList(Json.GSON.fromJson(req.bodyElement("hours"), WorkingHour[].class));
            } catch (RuntimeException e) {
                throw new AppException(400, "Hours must be a list like [{dayOfWeek, startTime, endTime}].");
            }
            return Map.of("outsideNewHours", catalog.setHours(req.user(), req.pathInt("id"), hours));
        });

        // ---------- Slots and appointments ----------
        r.add("GET", "/api/services/{id}/slots", req -> {
            req.user();
            return appointments.getFreeSlots(req.pathInt("id"), req.queryDate("date"));
        });

        r.add("GET", "/api/appointments", req -> appointments.listFor(req.user()));

        r.add("POST", "/api/appointments", req ->
                appointments.book(req.user(), requireInt(req, "serviceId"), req.bodyDateTime("startAt")));

        r.add("POST", "/api/appointments/{id}/cancel", req ->
                appointments.cancel(req.user(), req.pathInt("id")));

        r.add("POST", "/api/appointments/{id}/reschedule", req ->
                appointments.reschedule(req.user(), req.pathInt("id"), req.bodyDateTime("startAt")));

        r.add("POST", "/api/appointments/{id}/status", req -> {
            User me = req.user();
            AppointmentStatus status;
            try {
                status = AppointmentStatus.valueOf(req.bodyString("status"));
            } catch (RuntimeException e) {
                throw new AppException(400, "Status must be COMPLETED or NO_SHOW.");
            }
            return appointments.markStatus(me, req.pathInt("id"), status);
        });
    }

    private static int requireInt(Request req, String name) {
        Integer value = req.bodyInt(name);
        if (value == null) {
            throw new AppException(400, name + " is required.");
        }
        return value;
    }
}
