package com.readytime.dao;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** SQL for the appointment report: one row per appointment, with names and the service price. */
public class ReportDao {

    /** One appointment as it appears in a report. */
    public record Row(int id, LocalDateTime startAt, LocalDateTime endAt, String status,
                      String clientName, int providerId, String providerName, String businessName,
                      String serviceName, BigDecimal price) {
    }

    /**
     * Appointments that START in [from, to). providerId = null means all providers.
     */
    public List<Row> findRows(Connection conn, LocalDateTime from, LocalDateTime to, Integer providerId)
            throws SQLException {
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
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setTimestamp(1, Timestamp.valueOf(from));
            ps.setTimestamp(2, Timestamp.valueOf(to));
            if (providerId != null) {
                ps.setInt(3, providerId);
            }
            ResultSet rs = ps.executeQuery();
            List<Row> rows = new ArrayList<>();
            while (rs.next()) {
                rows.add(new Row(rs.getInt("id"), rs.getTimestamp("start_at").toLocalDateTime(),
                        rs.getTimestamp("end_at").toLocalDateTime(), rs.getString("status"),
                        rs.getString("client_name"), rs.getInt("provider_id"), rs.getString("provider_name"),
                        rs.getString("business_name"), rs.getString("service_name"), rs.getBigDecimal("price")));
            }
            return rows;
        }
    }
}
