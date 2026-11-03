package com.readytime.dao;

import com.readytime.model.Appointment;
import com.readytime.model.AppointmentStatus;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** SQL for the "appointments" table. */
public class AppointmentDao {

    // Joins the other tables so we can show names instead of only ids.
    private static final String SELECT =
            "SELECT a.*, c.full_name AS client_name, p.full_name AS provider_name, s.name AS service_name "
            + "FROM appointments a "
            + "JOIN users c ON c.id = a.client_id "
            + "JOIN users p ON p.id = a.provider_id "
            + "JOIN services s ON s.id = a.service_id ";

    public int insert(Connection conn, int clientId, int providerId, int serviceId,
                      LocalDateTime startAt, LocalDateTime endAt) throws SQLException {
        String sql = "INSERT INTO appointments (client_id, provider_id, service_id, start_at, end_at) "
                + "VALUES (?, ?, ?, ?, ?)";
        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, clientId);
            ps.setInt(2, providerId);
            ps.setInt(3, serviceId);
            ps.setTimestamp(4, Timestamp.valueOf(startAt));
            ps.setTimestamp(5, Timestamp.valueOf(endAt));
            ps.executeUpdate();
            ResultSet keys = ps.getGeneratedKeys();
            keys.next();
            return keys.getInt(1);
        }
    }

    public Appointment findById(Connection conn, int id) throws SQLException {
        List<Appointment> list = query(conn, SELECT + "WHERE a.id = ?", id);
        return list.isEmpty() ? null : list.get(0);
    }

    public List<Appointment> findByClient(Connection conn, int clientId) throws SQLException {
        return query(conn, SELECT + "WHERE a.client_id = ? ORDER BY a.start_at DESC", clientId);
    }

    public List<Appointment> findByProvider(Connection conn, int providerId) throws SQLException {
        return query(conn, SELECT + "WHERE a.provider_id = ? ORDER BY a.start_at DESC", providerId);
    }

    public List<Appointment> findByBusiness(Connection conn, int businessId) throws SQLException {
        return query(conn, SELECT + "WHERE p.business_id = ? ORDER BY a.start_at DESC", businessId);
    }

    public List<Appointment> findAll(Connection conn) throws SQLException {
        return query(conn, SELECT + "ORDER BY a.start_at DESC");
    }

    /** BOOKED appointments of a provider that start in the future. */
    public List<Appointment> findFutureBooked(Connection conn, int providerId, LocalDateTime now) throws SQLException {
        return query(conn, SELECT + "WHERE a.provider_id = ? AND a.status = 'BOOKED' AND a.start_at > ? "
                + "ORDER BY a.start_at", providerId, Timestamp.valueOf(now));
    }

    /** BOOKED appointments of a provider between two moments (used to hide taken slots). */
    public List<Appointment> findBookedBetween(Connection conn, int providerId,
                                               LocalDateTime from, LocalDateTime to) throws SQLException {
        return query(conn, SELECT + "WHERE a.provider_id = ? AND a.status = 'BOOKED' "
                + "AND a.start_at < ? AND a.end_at > ?", providerId, Timestamp.valueOf(to), Timestamp.valueOf(from));
    }

    /** Active = BOOKED and not finished yet. */
    public int countActiveForClient(Connection conn, int clientId, LocalDateTime now) throws SQLException {
        String sql = "SELECT COUNT(*) FROM appointments WHERE client_id = ? AND status = 'BOOKED' AND end_at > ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, clientId);
            ps.setTimestamp(2, Timestamp.valueOf(now));
            ResultSet rs = ps.executeQuery();
            rs.next();
            return rs.getInt(1);
        }
    }

    /**
     * True if the provider already has a BOOKED appointment overlapping [start, end).
     * excludeId lets rescheduling ignore the appointment that is being moved (use 0 for none).
     */
    public boolean hasOverlap(Connection conn, int providerId, LocalDateTime start, LocalDateTime end,
                              int excludeId) throws SQLException {
        String sql = "SELECT 1 FROM appointments WHERE provider_id = ? AND status = 'BOOKED' "
                + "AND start_at < ? AND end_at > ? AND id <> ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, providerId);
            ps.setTimestamp(2, Timestamp.valueOf(end));
            ps.setTimestamp(3, Timestamp.valueOf(start));
            ps.setInt(4, excludeId);
            return ps.executeQuery().next();
        }
    }

    public void updateStatus(Connection conn, int id, AppointmentStatus status) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "UPDATE appointments SET status = ?, updated_at = NOW() WHERE id = ?")) {
            ps.setString(1, status.name());
            ps.setInt(2, id);
            ps.executeUpdate();
        }
    }

    public void updateTimes(Connection conn, int id, LocalDateTime startAt, LocalDateTime endAt) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "UPDATE appointments SET start_at = ?, end_at = ?, updated_at = NOW() WHERE id = ?")) {
            ps.setTimestamp(1, Timestamp.valueOf(startAt));
            ps.setTimestamp(2, Timestamp.valueOf(endAt));
            ps.setInt(3, id);
            ps.executeUpdate();
        }
    }

    private List<Appointment> query(Connection conn, String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                ps.setObject(i + 1, params[i]);
            }
            ResultSet rs = ps.executeQuery();
            List<Appointment> list = new ArrayList<>();
            while (rs.next()) {
                list.add(new Appointment(
                        rs.getInt("id"),
                        rs.getInt("client_id"),
                        rs.getString("client_name"),
                        rs.getInt("provider_id"),
                        rs.getString("provider_name"),
                        rs.getInt("service_id"),
                        rs.getString("service_name"),
                        rs.getTimestamp("start_at").toLocalDateTime(),
                        rs.getTimestamp("end_at").toLocalDateTime(),
                        AppointmentStatus.valueOf(rs.getString("status"))));
            }
            return list;
        }
    }
}
