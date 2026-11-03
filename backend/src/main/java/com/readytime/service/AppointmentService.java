package com.readytime.service;

import com.readytime.AppException;
import com.readytime.Database;
import com.readytime.TimeProvider;
import com.readytime.dao.AppointmentDao;
import com.readytime.dao.BusinessDao;
import com.readytime.dao.ServiceDao;
import com.readytime.dao.UserDao;
import com.readytime.dao.WorkingHourDao;
import com.readytime.model.Appointment;
import com.readytime.model.AppointmentStatus;
import com.readytime.model.Business;
import com.readytime.model.Role;
import com.readytime.model.Service;
import com.readytime.model.User;
import com.readytime.model.WorkingHour;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Free slots, booking, cancelling, rescheduling and status changes. */
public class AppointmentService {

    public static final int MAX_ACTIVE_APPOINTMENTS = 2;
    public static final int CANCEL_CUTOFF_HOURS = 2;
    public static final int MAX_DAYS_AHEAD = 30;

    private final Database db;
    private final TimeProvider time;
    private final UserDao userDao = new UserDao();
    private final BusinessDao businessDao = new BusinessDao();
    private final ServiceDao serviceDao = new ServiceDao();
    private final WorkingHourDao hourDao = new WorkingHourDao();
    private final AppointmentDao appointmentDao = new AppointmentDao();

    public AppointmentService(Database db, TimeProvider time) {
        this.db = db;
        this.time = time;
    }

    // ---------------- Free slots ----------------

    public List<LocalDateTime> getFreeSlots(int serviceId, LocalDate date) {
        return db.run(conn -> {
            Service service = findActiveService(conn, serviceId);
            LocalDate today = time.now().toLocalDate();
            boolean outOfRange = date.isBefore(today) || date.isAfter(today.plusDays(MAX_DAYS_AHEAD));
            if (outOfRange || !isProviderBookable(conn, userDao.findById(conn, service.providerId()))) {
                return List.of();
            }
            List<WorkingHour> hours = hourDao.findByProvider(conn, service.providerId());
            List<Appointment> booked = appointmentDao.findBookedBetween(conn, service.providerId(),
                    date.atStartOfDay(), date.plusDays(1).atStartOfDay());
            return SlotCalculator.freeSlots(hours, date, service.durationMinutes(), booked, time.now());
        });
    }

    // ---------------- Booking ----------------

    /**
     * Books an appointment for the logged-in client.
     *
     * Double-booking protection: everything runs in ONE transaction, and we lock the
     * client's row and the provider's row (SELECT ... FOR UPDATE). If two clients try to
     * book the same provider at the same moment, the second one waits until the first
     * one is finished, then sees the new booking and gets "already booked".
     * The database constraint no_overlapping_bookings is a second safety net.
     */
    public Appointment book(User me, int serviceId, LocalDateTime start) {
        Access.requireRole(me, Role.CLIENT);
        LocalDateTime startAt = requireTime(start);
        return db.transaction(conn -> {
            User client = userDao.lockById(conn, me.id());
            if (client.blocked()) {
                throw new AppException(403, "You are blocked from booking because of 3 no-shows. "
                        + "Please contact the system admin.");
            }
            Service service = findActiveService(conn, serviceId);
            User provider = userDao.lockById(conn, service.providerId());
            if (!isProviderBookable(conn, provider)) {
                throw new AppException(409, "This provider is not taking bookings right now.");
            }
            checkValidSlot(conn, service, startAt);

            int active = appointmentDao.countActiveForClient(conn, client.id(), time.now());
            if (active >= MAX_ACTIVE_APPOINTMENTS) {
                throw new AppException(409, "You already have " + MAX_ACTIVE_APPOINTMENTS
                        + " active appointments. Cancel one or wait until it is over.");
            }
            LocalDateTime endAt = startAt.plusMinutes(service.durationMinutes());
            if (appointmentDao.hasOverlap(conn, provider.id(), startAt, endAt, 0)) {
                throw new AppException(409, "This time slot is already booked.");
            }
            int id = appointmentDao.insert(conn, client.id(), provider.id(), service.id(), startAt, endAt);
            return appointmentDao.findById(conn, id);
        });
    }

    // ---------------- Cancel ----------------

    public Appointment cancel(User me, int appointmentId) {
        return db.transaction(conn -> {
            Appointment a = findAppointment(conn, appointmentId);
            requireCanChange(conn, me, a);
            requireBooked(a);
            if (me.role() == Role.CLIENT && !isBeforeCutoff(a.startAt(), time.now())) {
                throw new AppException(409, "Appointments can only be cancelled at least "
                        + CANCEL_CUTOFF_HOURS + " hours before they start.");
            }
            appointmentDao.updateStatus(conn, a.id(), AppointmentStatus.CANCELLED);
            return appointmentDao.findById(conn, a.id());
        });
    }

    // ---------------- Reschedule ----------------

    /** Moves a BOOKED appointment to a new free slot of the same service and provider. */
    public Appointment reschedule(User me, int appointmentId, LocalDateTime newStart) {
        LocalDateTime startAt = requireTime(newStart);
        return db.transaction(conn -> {
            Appointment a = findAppointment(conn, appointmentId);
            requireCanChange(conn, me, a);
            requireBooked(a);
            if (me.role() == Role.CLIENT && !isBeforeCutoff(a.startAt(), time.now())) {
                throw new AppException(409, "Appointments can only be rescheduled at least "
                        + CANCEL_CUTOFF_HOURS + " hours before they start.");
            }
            userDao.lockById(conn, a.providerId());   // same lock as booking
            Service service = serviceDao.findById(conn, a.serviceId());
            checkValidSlot(conn, service, startAt);
            LocalDateTime endAt = startAt.plusMinutes(service.durationMinutes());
            if (appointmentDao.hasOverlap(conn, a.providerId(), startAt, endAt, a.id())) {
                throw new AppException(409, "This time slot is already booked.");
            }
            appointmentDao.updateTimes(conn, a.id(), startAt, endAt);
            return appointmentDao.findById(conn, a.id());
        });
    }

    // ---------------- Completed / No-show ----------------

    /** Provider or business admin marks a BOOKED appointment as COMPLETED or NO_SHOW after it started. */
    public Appointment markStatus(User me, int appointmentId, AppointmentStatus newStatus) {
        Access.requireRole(me, Role.PROVIDER, Role.BUSINESS_ADMIN);
        if (newStatus != AppointmentStatus.COMPLETED && newStatus != AppointmentStatus.NO_SHOW) {
            throw new AppException(400, "Status must be COMPLETED or NO_SHOW.");
        }
        return db.transaction(conn -> {
            Appointment a = findAppointment(conn, appointmentId);
            requireCanChange(conn, me, a);
            requireBooked(a);
            if (time.now().isBefore(a.startAt())) {
                throw new AppException(409, "You can only mark an appointment after its start time.");
            }
            appointmentDao.updateStatus(conn, a.id(), newStatus);
            if (newStatus == AppointmentStatus.NO_SHOW) {
                userDao.addNoShow(conn, a.clientId());   // 3rd no-show blocks the client
            }
            return appointmentDao.findById(conn, a.id());
        });
    }

    // ---------------- Listing ----------------

    /** Each role sees a different list: their own, their business's, or (system admin) all. */
    public List<Appointment> listFor(User me) {
        return db.run(conn -> switch (me.role()) {
            case CLIENT -> appointmentDao.findByClient(conn, me.id());
            case PROVIDER -> appointmentDao.findByProvider(conn, me.id());
            case BUSINESS_ADMIN -> appointmentDao.findByBusiness(conn, me.businessId());
            case SYSTEM_ADMIN -> appointmentDao.findAll(conn);
        });
    }

    // ---------------- Rules as small helper methods ----------------

    /** Cutoff rule (A2): allowed when now is AT LEAST 2 hours before the start (exactly 2:00 is allowed). */
    public static boolean isBeforeCutoff(LocalDateTime start, LocalDateTime now) {
        return !now.isAfter(start.minusHours(CANCEL_CUTOFF_HOURS));
    }

    private void checkValidSlot(Connection conn, Service service, LocalDateTime start) throws SQLException {
        LocalDateTime now = time.now();
        if (!start.isAfter(now)) {
            throw new AppException(400, "The appointment time must be in the future.");
        }
        if (start.toLocalDate().isAfter(now.toLocalDate().plusDays(MAX_DAYS_AHEAD))) {
            throw new AppException(400, "You can book at most " + MAX_DAYS_AHEAD + " days ahead.");
        }
        List<WorkingHour> hours = hourDao.findByProvider(conn, service.providerId());
        if (!SlotCalculator.allSlots(hours, start.toLocalDate(), service.durationMinutes()).contains(start)) {
            throw new AppException(400, "This is not a valid slot in the provider's working hours.");
        }
    }

    /** Client: only their own appointments. Provider / business admin: appointments they manage. */
    private void requireCanChange(Connection conn, User me, Appointment a) throws SQLException {
        boolean allowed = switch (me.role()) {
            case CLIENT -> a.clientId() == me.id();
            case PROVIDER, BUSINESS_ADMIN -> Access.canManageProvider(me, userDao.findById(conn, a.providerId()));
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

    private boolean isProviderBookable(Connection conn, User provider) throws SQLException {
        if (provider == null || !provider.active() || provider.businessId() == null) {
            return false;
        }
        Business business = businessDao.findById(conn, provider.businessId());
        return business != null && business.active();
    }

    private Service findActiveService(Connection conn, int serviceId) throws SQLException {
        Service service = serviceDao.findById(conn, serviceId);
        if (service == null || !service.active()) {
            throw new AppException(404, "Service not found.");
        }
        return service;
    }

    private Appointment findAppointment(Connection conn, int id) throws SQLException {
        Appointment a = appointmentDao.findById(conn, id);
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
