package com.readytime.service;

import com.readytime.AppException;
import com.readytime.Database;
import com.readytime.TimeProvider;
import com.readytime.dao.AppointmentDao;
import com.readytime.dao.ServiceDao;
import com.readytime.dao.UserDao;
import com.readytime.dao.WorkingHourDao;
import com.readytime.model.Appointment;
import com.readytime.model.Service;
import com.readytime.model.User;
import com.readytime.model.WorkingHour;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** A provider's services and working hours. */
public class CatalogService {

    private final Database db;
    private final TimeProvider time;
    private final UserDao userDao = new UserDao();
    private final ServiceDao serviceDao = new ServiceDao();
    private final WorkingHourDao hourDao = new WorkingHourDao();
    private final AppointmentDao appointmentDao = new AppointmentDao();

    public CatalogService(Database db, TimeProvider time) {
        this.db = db;
        this.time = time;
    }

    // ---------------- Services ----------------

    /** People who manage the provider see inactive services too; everyone else only active ones. */
    public List<Service> listServices(User me, int providerId) {
        return db.run(conn -> {
            User provider = userDao.findById(conn, providerId);
            boolean manager = provider != null && Access.canManageProvider(me, provider);
            return serviceDao.findByProvider(conn, providerId, !manager);
        });
    }

    public Service createService(User me, int providerId, String name, Integer durationMinutes, BigDecimal price) {
        String cleanName = Validate.text(name, "Service name", 2, 100);
        int duration = Validate.duration(durationMinutes);
        BigDecimal cleanPrice = Validate.price(price);
        return db.run(conn -> {
            Access.requireCanManageProvider(me, userDao.findById(conn, providerId));
            int id = serviceDao.insert(conn, providerId, cleanName, duration, cleanPrice);
            return serviceDao.findById(conn, id);
        });
    }

    public Service updateService(User me, int serviceId, String name, Integer durationMinutes,
                                 BigDecimal price, boolean active) {
        String cleanName = Validate.text(name, "Service name", 2, 100);
        int duration = Validate.duration(durationMinutes);
        BigDecimal cleanPrice = Validate.price(price);
        return db.run(conn -> {
            Service service = serviceDao.findById(conn, serviceId);
            if (service == null) {
                throw new AppException(404, "Service not found.");
            }
            Access.requireCanManageProvider(me, userDao.findById(conn, service.providerId()));
            serviceDao.update(conn, serviceId, cleanName, duration, cleanPrice, active);
            return serviceDao.findById(conn, serviceId);
        });
    }

    // ---------------- Working hours ----------------

    public List<WorkingHour> getHours(int providerId) {
        return db.run(conn -> hourDao.findByProvider(conn, providerId));
    }

    /**
     * Replaces ALL working hours of a provider with the new list.
     * Existing bookings are kept (assumption A9). The method returns the future
     * bookings that are now outside working hours, so the provider can decide what to do.
     */
    public List<Appointment> setHours(User me, int providerId, List<WorkingHour> hours) {
        validateHours(hours);
        return db.transaction(conn -> {
            Access.requireCanManageProvider(me, userDao.findById(conn, providerId));
            hourDao.deleteByProvider(conn, providerId);
            for (WorkingHour hour : hours) {
                hourDao.insert(conn, providerId, hour);
            }
            List<Appointment> outside = new ArrayList<>();
            for (Appointment a : appointmentDao.findFutureBooked(conn, providerId, time.now())) {
                if (!SlotCalculator.isInsideWorkingHours(hours, a.startAt(), a.endAt())) {
                    outside.add(a);
                }
            }
            return outside;
        });
    }

    /** Each period: valid day, start before end, and no overlap with another period on the same day. */
    static void validateHours(List<WorkingHour> hours) {
        if (hours == null) {
            throw new AppException(400, "Working hours are required.");
        }
        for (WorkingHour h : hours) {
            if (h.dayOfWeek() < 1 || h.dayOfWeek() > 7) {
                throw new AppException(400, "Day of week must be 1 (Monday) to 7 (Sunday).");
            }
            if (h.startTime() == null || h.endTime() == null || !h.startTime().isBefore(h.endTime())) {
                throw new AppException(400, "Each period must start before it ends.");
            }
        }
        for (int i = 0; i < hours.size(); i++) {
            for (int j = i + 1; j < hours.size(); j++) {
                WorkingHour a = hours.get(i);
                WorkingHour b = hours.get(j);
                boolean sameDay = a.dayOfWeek() == b.dayOfWeek();
                boolean overlap = a.startTime().isBefore(b.endTime()) && b.startTime().isBefore(a.endTime());
                if (sameDay && overlap) {
                    throw new AppException(400, "Working periods on the same day must not overlap.");
                }
            }
        }
    }
}
