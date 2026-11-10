package com.readytime.service;

import com.readytime.AppException;
import com.readytime.TimeProvider;
import com.readytime.model.Appointment;
import com.readytime.model.AppointmentStatus;
import com.readytime.model.Business;
import com.readytime.model.Role;
import com.readytime.model.Service;
import com.readytime.model.User;
import com.readytime.model.WorkingHour;
import com.readytime.repository.AppointmentRepository;
import com.readytime.repository.BusinessRepository;
import com.readytime.repository.ServiceRepository;
import com.readytime.repository.UserRepository;
import com.readytime.repository.WorkingHourRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Free slots, booking, cancelling, rescheduling and status changes. */
@org.springframework.stereotype.Service   // full name: "Service" is also our model class
public class AppointmentService {

    public static final int MAX_ACTIVE_APPOINTMENTS = 2;
    public static final int CANCEL_CUTOFF_HOURS = 2;
    public static final int MAX_DAYS_AHEAD = 30;

    private final TimeProvider time;
    private final UserRepository userRepo;
    private final BusinessRepository businessRepo;
    private final ServiceRepository serviceRepo;
    private final WorkingHourRepository hourRepo;
    private final AppointmentRepository appointmentRepo;

    public AppointmentService(TimeProvider time, UserRepository userRepo, BusinessRepository businessRepo,
                              ServiceRepository serviceRepo, WorkingHourRepository hourRepo,
                              AppointmentRepository appointmentRepo) {
        this.time = time;
        this.userRepo = userRepo;
        this.businessRepo = businessRepo;
        this.serviceRepo = serviceRepo;
        this.hourRepo = hourRepo;
        this.appointmentRepo = appointmentRepo;
    }

    // ---------------- Free slots ----------------

    public List<LocalDateTime> getFreeSlots(int serviceId, LocalDate date) {
        Service service = findActiveService(serviceId);
        LocalDate today = time.now().toLocalDate();
        boolean outOfRange = date.isBefore(today) || date.isAfter(today.plusDays(MAX_DAYS_AHEAD));
        if (outOfRange || !isProviderBookable(userRepo.findById(service.providerId()))) {
            return List.of();
        }
        List<WorkingHour> hours = hourRepo.findByProvider(service.providerId());
        List<Appointment> booked = appointmentRepo.findBookedBetween(service.providerId(),
                date.atStartOfDay(), date.plusDays(1).atStartOfDay());
        return SlotCalculator.freeSlots(hours, date, service.durationMinutes(), booked, time.now());
    }

    // ---------------- Booking ----------------

    /**
     * Books an appointment for the logged-in client.
     *
     * Double-booking protection: everything runs in ONE transaction (@Transactional), and we lock the
     * client's row and the provider's row (SELECT ... FOR UPDATE). If two clients try to
     * book the same provider at the same moment, the second one waits until the first
     * one is finished, then sees the new booking and gets "already booked".
     * The database constraint no_overlapping_bookings is a second safety net.
     */
    @Transactional
    public Appointment book(User me, int serviceId, LocalDateTime start) {
        Access.requireRole(me, Role.CLIENT);
        LocalDateTime startAt = requireTime(start);
        User client = userRepo.lockById(me.id());
        if (client.blocked()) {
            throw new AppException(403, "You are blocked from booking because of 3 no-shows. "
                    + "Please contact the system admin.");
        }
        Service service = findActiveService(serviceId);
        User provider = userRepo.lockById(service.providerId());
        if (!isProviderBookable(provider)) {
            throw new AppException(409, "This provider is not taking bookings right now.");
        }
        checkValidSlot(service, startAt);

        int active = appointmentRepo.countActiveForClient(client.id(), time.now());
        if (active >= MAX_ACTIVE_APPOINTMENTS) {
            throw new AppException(409, "You already have " + MAX_ACTIVE_APPOINTMENTS
                    + " active appointments. Cancel one or wait until it is over.");
        }
        LocalDateTime endAt = startAt.plusMinutes(service.durationMinutes());
        if (appointmentRepo.hasOverlap(provider.id(), startAt, endAt, 0)) {
            throw new AppException(409, "This time slot is already booked.");
        }
        int id = appointmentRepo.insert(client.id(), provider.id(), service.id(), startAt, endAt);
        return appointmentRepo.findById(id);
    }

    // ---------------- Cancel ----------------

    @Transactional
    public Appointment cancel(User me, int appointmentId) {
        Appointment a = findAppointment(appointmentId);
        requireCanChange(me, a);
        requireBooked(a);
        if (me.role() == Role.CLIENT && !isBeforeCutoff(a.startAt(), time.now())) {
            throw new AppException(409, "Appointments can only be cancelled at least "
                    + CANCEL_CUTOFF_HOURS + " hours before they start.");
        }
        appointmentRepo.updateStatus(a.id(), AppointmentStatus.CANCELLED);
        return appointmentRepo.findById(a.id());
    }

    // ---------------- Reschedule ----------------

    /** Moves a BOOKED appointment to a new free slot of the same service and provider. */
    @Transactional
    public Appointment reschedule(User me, int appointmentId, LocalDateTime newStart) {
        LocalDateTime startAt = requireTime(newStart);
        Appointment a = findAppointment(appointmentId);
        requireCanChange(me, a);
        requireBooked(a);
        if (me.role() == Role.CLIENT && !isBeforeCutoff(a.startAt(), time.now())) {
            throw new AppException(409, "Appointments can only be rescheduled at least "
                    + CANCEL_CUTOFF_HOURS + " hours before they start.");
        }
        userRepo.lockById(a.providerId());   // same lock as booking
        Service service = serviceRepo.findById(a.serviceId());
        checkValidSlot(service, startAt);
        LocalDateTime endAt = startAt.plusMinutes(service.durationMinutes());
        if (appointmentRepo.hasOverlap(a.providerId(), startAt, endAt, a.id())) {
            throw new AppException(409, "This time slot is already booked.");
        }
        appointmentRepo.updateTimes(a.id(), startAt, endAt);
        return appointmentRepo.findById(a.id());
    }

    // ---------------- Completed / No-show ----------------

    /** The provider marks a BOOKED appointment as COMPLETED or NO_SHOW after it started. */
    @Transactional
    public Appointment markStatus(User me, int appointmentId, AppointmentStatus newStatus) {
        Access.requireRole(me, Role.PROVIDER);
        if (newStatus != AppointmentStatus.COMPLETED && newStatus != AppointmentStatus.NO_SHOW) {
            throw new AppException(400, "Status must be COMPLETED or NO_SHOW.");
        }
        Appointment a = findAppointment(appointmentId);
        requireCanChange(me, a);
        requireBooked(a);
        if (time.now().isBefore(a.startAt())) {
            throw new AppException(409, "You can only mark an appointment after its start time.");
        }
        appointmentRepo.updateStatus(a.id(), newStatus);
        if (newStatus == AppointmentStatus.NO_SHOW) {
            userRepo.addNoShow(a.clientId());   // 3rd no-show blocks the client
        }
        return appointmentRepo.findById(a.id());
    }

    // ---------------- Listing ----------------

    /** Each role sees a different list: clients and providers their own, the system admin all. */
    public List<Appointment> listFor(User me) {
        return switch (me.role()) {
            case CLIENT -> appointmentRepo.findByClient(me.id());
            case PROVIDER -> appointmentRepo.findByProvider(me.id());
            case SYSTEM_ADMIN -> appointmentRepo.findAll();
        };
    }

    // ---------------- Rules as small helper methods ----------------

    /** Cutoff rule (A2): allowed when now is AT LEAST 2 hours before the start (exactly 2:00 is allowed). */
    public static boolean isBeforeCutoff(LocalDateTime start, LocalDateTime now) {
        return !now.isAfter(start.minusHours(CANCEL_CUTOFF_HOURS));
    }

    private void checkValidSlot(Service service, LocalDateTime start) {
        LocalDateTime now = time.now();
        if (!start.isAfter(now)) {
            throw new AppException(400, "The appointment time must be in the future.");
        }
        if (start.toLocalDate().isAfter(now.toLocalDate().plusDays(MAX_DAYS_AHEAD))) {
            throw new AppException(400, "You can book at most " + MAX_DAYS_AHEAD + " days ahead.");
        }
        List<WorkingHour> hours = hourRepo.findByProvider(service.providerId());
        if (!SlotCalculator.allSlots(hours, start.toLocalDate(), service.durationMinutes()).contains(start)) {
            throw new AppException(400, "This is not a valid slot in the provider's working hours.");
        }
    }

    /** Client: only their own appointments. Provider: only appointments with them. */
    private void requireCanChange(User me, Appointment a) {
        boolean allowed = switch (me.role()) {
            case CLIENT -> a.clientId() == me.id();
            case PROVIDER -> Access.canManageProvider(me, userRepo.findById(a.providerId()));
            case SYSTEM_ADMIN -> false;
        };
        if (!allowed) {
            throw new AppException(403, "You are not allowed to change this appointment.");
        }
    }

    private void requireBooked(Appointment a) {
        if (a.status() != AppointmentStatus.BOOKED) {
            throw new AppException(409, "Only BOOKED appointments can be changed (this one is " + a.status() + ").");
        }
    }

    private boolean isProviderBookable(User provider) {
        if (provider == null || !provider.active() || provider.businessId() == null) {
            return false;
        }
        Business business = businessRepo.findById(provider.businessId());
        return business != null && business.active();
    }

    private Service findActiveService(int serviceId) {
        Service service = serviceRepo.findById(serviceId);
        if (service == null || !service.active()) {
            throw new AppException(404, "Service not found.");
        }
        return service;
    }

    private Appointment findAppointment(int id) {
        Appointment a = appointmentRepo.findById(id);
        if (a == null) {
            throw new AppException(404, "Appointment not found.");
        }
        return a;
    }

    private LocalDateTime requireTime(LocalDateTime t) {
        if (t == null) {
            throw new AppException(400, "Start time is required.");
        }
        return t.withSecond(0).withNano(0);
    }
}
