package com.readytime.service;

import com.readytime.AppException;
import com.readytime.TimeProvider;
import com.readytime.model.Appointment;
import com.readytime.model.Service;
import com.readytime.model.User;
import com.readytime.model.WorkingHour;
import com.readytime.repository.AppointmentRepository;
import com.readytime.repository.ServiceRepository;
import com.readytime.repository.UserRepository;
import com.readytime.repository.WorkingHourRepository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** A provider's services and working hours. */
@org.springframework.stereotype.Service   // full name: "Service" is also our model class
public class CatalogService {

    private final TimeProvider time;
    private final UserRepository userRepo;
    private final ServiceRepository serviceRepo;
    private final WorkingHourRepository hourRepo;
    private final AppointmentRepository appointmentRepo;

    public CatalogService(TimeProvider time, UserRepository userRepo, ServiceRepository serviceRepo,
                          WorkingHourRepository hourRepo, AppointmentRepository appointmentRepo) {
        this.time = time;
        this.userRepo = userRepo;
        this.serviceRepo = serviceRepo;
        this.hourRepo = hourRepo;
        this.appointmentRepo = appointmentRepo;
    }

    // ---------------- Services ----------------

    /** People who manage the provider see inactive services too; everyone else only active ones. */
    public List<Service> listServices(User me, int providerId) {
        User provider = userRepo.findById(providerId);
        boolean manager = provider != null && Access.canManageProvider(me, provider);
        return serviceRepo.findByProvider(providerId, !manager);
    }

    @Transactional
    public Service createService(User me, int providerId, String name, Integer durationMinutes, BigDecimal price) {
        String cleanName = Validate.text(name, "Service name", 2, 100);
        int duration = Validate.duration(durationMinutes);
        BigDecimal cleanPrice = Validate.price(price);
        Access.requireCanManageProvider(me, userRepo.findById(providerId));
        int id = serviceRepo.insert(providerId, cleanName, duration, cleanPrice);
        return serviceRepo.findById(id);
    }

    @Transactional
    public Service updateService(User me, int serviceId, String name, Integer durationMinutes,
                                 BigDecimal price, boolean active) {
        String cleanName = Validate.text(name, "Service name", 2, 100);
        int duration = Validate.duration(durationMinutes);
        BigDecimal cleanPrice = Validate.price(price);
        Service service = serviceRepo.findById(serviceId);
        if (service == null) {
            throw new AppException(404, "Service not found.");
        }
        Access.requireCanManageProvider(me, userRepo.findById(service.providerId()));
        serviceRepo.update(serviceId, cleanName, duration, cleanPrice, active);
        return serviceRepo.findById(serviceId);
    }

    // ---------------- Working hours ----------------

    public List<WorkingHour> getHours(int providerId) {
        return hourRepo.findByProvider(providerId);
    }

    /**
     * Replaces ALL working hours of a provider with the new list.
     * Existing bookings are kept (assumption A9). The method returns the future
     * bookings that are now outside working hours, so the provider can decide what to do.
     */
    @Transactional
    public List<Appointment> setHours(User me, int providerId, List<WorkingHour> hours) {
        validateHours(hours);
        Access.requireCanManageProvider(me, userRepo.findById(providerId));
        hourRepo.deleteByProvider(providerId);
        for (WorkingHour hour : hours) {
            hourRepo.insert(providerId, hour);
        }
        List<Appointment> outside = new ArrayList<>();
        for (Appointment a : appointmentRepo.findFutureBooked(providerId, time.now())) {
            if (!SlotCalculator.isInsideWorkingHours(hours, a.startAt(), a.endAt())) {
                outside.add(a);
            }
        }
        return outside;
    }

    /** Each period: valid day, start before end, and no overlap with another period on the same day. */
    static void validateHours(List<WorkingHour> hours) {
        if (hours == null) {
            throw new AppException(400, "Working hours are required.");
        }
        for (WorkingHour h : hours) {
            if (h == null || h.dayOfWeek() < 1 || h.dayOfWeek() > 7) {
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
