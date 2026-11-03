package com.readytime.service;

import com.readytime.AppException;
import com.readytime.Database;
import com.readytime.dao.ReportDao;
import com.readytime.model.Role;
import com.readytime.model.User;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Appointment report for a date range.
 * System admin: every appointment. Service provider: only appointments with them.
 */
public class ReportService {

    public static final int MAX_DAYS = 366;

    /** Counts for one group of appointments (the whole report, one provider or one service). */
    public record Summary(String name, int total, int booked, int completed, int cancelled, int noShow,
                          double noShowRate, BigDecimal revenue) {
    }

    /** The full report returned to the frontend. */
    public record Report(LocalDate from, LocalDate to, Summary totals, List<Summary> byProvider,
                         List<Summary> byService, List<ReportDao.Row> rows) {
    }

    private final Database db;
    private final ReportDao reportDao = new ReportDao();

    public ReportService(Database db) {
        this.db = db;
    }

    public Report appointmentReport(User me, LocalDate from, LocalDate to) {
        Access.requireRole(me, Role.SYSTEM_ADMIN, Role.PROVIDER);
        if (to.isBefore(from)) {
            throw new AppException(400, "The end date must be on or after the start date.");
        }
        if (ChronoUnit.DAYS.between(from, to) >= MAX_DAYS) {
            throw new AppException(400, "A report can cover at most " + MAX_DAYS + " days.");
        }
        Integer providerId = me.role() == Role.PROVIDER ? me.id() : null;
        List<ReportDao.Row> rows = db.run(conn ->
                reportDao.findRows(conn, from.atStartOfDay(), to.plusDays(1).atStartOfDay(), providerId));

        return new Report(from, to, summarise("All appointments", rows),
                groupBy(rows, ReportDao.Row::providerName),
                groupBy(rows, r -> r.serviceName() + " (" + r.providerName() + ")"),
                rows);
    }

    private static List<Summary> groupBy(List<ReportDao.Row> rows, Function<ReportDao.Row, String> key) {
        Map<String, List<ReportDao.Row>> groups = new LinkedHashMap<>();
        for (ReportDao.Row r : rows) {
            groups.computeIfAbsent(key.apply(r), k -> new java.util.ArrayList<>()).add(r);
        }
        return groups.entrySet().stream()
                .map(e -> summarise(e.getKey(), e.getValue()))
                .sorted((a, b) -> Integer.compare(b.total(), a.total()))
                .toList();
    }

    /**
     * Revenue = price of COMPLETED appointments only.
     * No-show rate = no-shows / (completed + no-shows), as a percentage with 1 decimal.
     */
    static Summary summarise(String name, List<ReportDao.Row> rows) {
        int booked = 0, completed = 0, cancelled = 0, noShow = 0;
        BigDecimal revenue = BigDecimal.ZERO;
        for (ReportDao.Row r : rows) {
            switch (r.status()) {
                case "BOOKED" -> booked++;
                case "COMPLETED" -> {
                    completed++;
                    revenue = revenue.add(r.price());
                }
                case "CANCELLED" -> cancelled++;
                case "NO_SHOW" -> noShow++;
                default -> { }
            }
        }
        int attended = completed + noShow;
        double rate = attended == 0 ? 0 : BigDecimal.valueOf(noShow * 100.0 / attended)
                .setScale(1, RoundingMode.HALF_UP).doubleValue();
        return new Summary(name, rows.size(), booked, completed, cancelled, noShow, rate, revenue);
    }
}
