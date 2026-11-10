package com.readytime.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** SQL for the appointment report: one row per appointment, with names and the service price. */
@Repository
public class ReportRepository {

    /** One appointment as it appears in a report. */
    public record Row(int id, LocalDateTime startAt, LocalDateTime endAt, String status,
                      String clientName, int providerId, String providerName, String businessName,
                      String serviceName, BigDecimal price) {
    }

    private final JdbcTemplate jdbc;

    public ReportRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Appointments that START in [from, to). providerId = null means all providers. */
    public List<Row> findRows(LocalDateTime from, LocalDateTime to, Integer providerId) {
        String sql = "SELECT a.id, a.start_at, a.end_at, a.status, c.full_name AS client_name, "
                + "a.provider_id, p.full_name AS provider_name, b.name AS business_name, "
                + "s.name AS service_name, s.price "
                + "FROM appointments a "
                + "JOIN users c ON c.id = a.client_id "
                + "JOIN users p ON p.id = a.provider_id "
                + "JOIN services s ON s.id = a.service_id "
                + "LEFT JOIN businesses b ON b.id = p.business_id "
                + "WHERE a.start_at >= ? AND a.start_at < ? "
                + (providerId == null ? "" : "AND a.provider_id = ? ")
                + "ORDER BY a.start_at";
        List<Object> params = new ArrayList<>(List.of(from, to));
        if (providerId != null) {
            params.add(providerId);
        }
        return jdbc.query(sql, (rs, rowNum) -> new Row(
                rs.getInt("id"),
                rs.getObject("start_at", LocalDateTime.class),
                rs.getObject("end_at", LocalDateTime.class),
                rs.getString("status"),
                rs.getString("client_name"),
                rs.getInt("provider_id"),
                rs.getString("provider_name"),
                rs.getString("business_name"),
                rs.getString("service_name"),
                rs.getBigDecimal("price")), params.toArray());
    }
}
