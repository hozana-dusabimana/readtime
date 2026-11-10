package com.readytime.web;

import com.readytime.AppException;
import com.readytime.model.Appointment;
import com.readytime.model.AppointmentStatus;
import com.readytime.model.User;
import com.readytime.service.AppointmentService;
import com.readytime.service.ReportService;
import com.readytime.web.dto.Requests;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;

/** Free slots, booking, cancelling, rescheduling, attendance and reports. */
@RestController
@RequestMapping("/api")
public class AppointmentController {

    private final AppointmentService appointments;
    private final ReportService reports;

    public AppointmentController(AppointmentService appointments, ReportService reports) {
        this.appointments = appointments;
        this.reports = reports;
    }

    @GetMapping("/services/{id}/slots")
    public List<LocalDateTime> freeSlots(@CurrentUser User me, @PathVariable int id,
                                         @RequestParam(required = false) String date) {
        return appointments.getFreeSlots(id, parseDate(date, "date"));
    }

    @GetMapping("/appointments")
    public List<Appointment> list(@CurrentUser User me) {
        return appointments.listFor(me);
    }

    @PostMapping("/appointments")
    public Appointment book(@CurrentUser User me, @RequestBody Requests.Book body) {
        if (body.serviceId() == null) {
            throw new AppException(400, "serviceId is required.");
        }
        return appointments.book(me, body.serviceId(), body.startAt());
    }

    @PostMapping("/appointments/{id}/cancel")
    public Appointment cancel(@CurrentUser User me, @PathVariable int id) {
        return appointments.cancel(me, id);
    }

    @PostMapping("/appointments/{id}/reschedule")
    public Appointment reschedule(@CurrentUser User me, @PathVariable int id,
                                  @RequestBody Requests.Reschedule body) {
        return appointments.reschedule(me, id, body.startAt());
    }

    /** The provider marks a visit as COMPLETED or NO_SHOW. */
    @PostMapping("/appointments/{id}/status")
    public Appointment markStatus(@CurrentUser User me, @PathVariable int id, @RequestBody Requests.Status body) {
        AppointmentStatus status;
        try {
            status = AppointmentStatus.valueOf(body.status());
        } catch (RuntimeException e) {
            throw new AppException(400, "Status must be COMPLETED or NO_SHOW.");
        }
        return appointments.markStatus(me, id, status);
    }

    /** System admin: every appointment. Provider: only their own. */
    @GetMapping("/reports/appointments")
    public ReportService.Report report(@CurrentUser User me, @RequestParam(required = false) String from,
                                       @RequestParam(required = false) String to) {
        return reports.appointmentReport(me, parseDate(from, "from"), parseDate(to, "to"));
    }

    private static LocalDate parseDate(String value, String name) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException | NullPointerException e) {
            throw new AppException(400, name + " must be a date like 2026-11-05.");
        }
    }
}
