package com.readytime.repository;

import com.readytime.model.Appointment;
import com.readytime.model.AppointmentStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/** SQL for the "appointments" table. */
@Repository
public class AppointmentRepository {

    // Joins the other tables so we can show names instead of only ids.
    private static final String SELECT =
            "SELECT a.*, c.full_name AS client_name, p.full_name AS provider_name, s.name AS service_name "
            + "FROM appointments a "
            + "JOIN users c ON c.id = a.client_id "
            + "JOIN users p ON p.id = a.provider_id "
            + "JOIN services s ON s.id = a.service_id ";

    private static final RowMapper<Appointment> MAPPER = (rs, rowNum) -> new Appointment(
            rs.getInt("id"),
            rs.getInt("client_id"),
            rs.getString("client_name"),
            rs.getInt("provider_id"),
            rs.getString("provider_name"),
            rs.getInt("service_id"),
            rs.getString("service_name"),
            rs.getObject("start_at", LocalDateTime.class),
            rs.getObject("end_at", LocalDateTime.class),
            AppointmentStatus.valueOf(rs.getString("status")));

    private final JdbcTemplate jdbc;

    public AppointmentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int insert(int clientId, int providerId, int serviceId, LocalDateTime startAt, LocalDateTime endAt) {
        return jdbc.queryForObject("INSERT INTO appointments (client_id, provider_id, service_id, start_at, end_at) "
                + "VALUES (?, ?, ?, ?, ?) RETURNING id", Integer.class, clientId, providerId, serviceId, startAt, endAt);
    }

    public Appointment findById(int id) {
        return UserRepository.first(jdbc.query(SELECT + "WHERE a.id = ?", MAPPER, id));
    }

    public List<Appointment> findByClient(int clientId) {
        return jdbc.query(SELECT + "WHERE a.client_id = ? ORDER BY a.start_at DESC", MAPPER, clientId);
    }

    public List<Appointment> findByProvider(int providerId) {
        return jdbc.query(SELECT + "WHERE a.provider_id = ? ORDER BY a.start_at DESC", MAPPER, providerId);
    }

    public List<Appointment> findAll() {
        return jdbc.query(SELECT + "ORDER BY a.start_at DESC", MAPPER);
    }

    /** BOOKED appointments of a provider that start in the future. */
    public List<Appointment> findFutureBooked(int providerId, LocalDateTime now) {
        return jdbc.query(SELECT + "WHERE a.provider_id = ? AND a.status = 'BOOKED' AND a.start_at > ? "
                + "ORDER BY a.start_at", MAPPER, providerId, now);
    }

    /** BOOKED appointments of a provider between two moments (used to hide taken slots). */
    public List<Appointment> findBookedBetween(int providerId, LocalDateTime from, LocalDateTime to) {
        return jdbc.query(SELECT + "WHERE a.provider_id = ? AND a.status = 'BOOKED' AND a.start_at < ? AND a.end_at > ?",
                MAPPER, providerId, to, from);
    }

    /** Active = BOOKED and not finished yet. */
    public int countActiveForClient(int clientId, LocalDateTime now) {
        return jdbc.queryForObject(
                "SELECT COUNT(*) FROM appointments WHERE client_id = ? AND status = 'BOOKED' AND end_at > ?",
                Integer.class, clientId, now);
    }

    /**
     * True if the provider already has a BOOKED appointment overlapping [start, end).
     * excludeId lets rescheduling ignore the appointment that is being moved (use 0 for none).
     */
    public boolean hasOverlap(int providerId, LocalDateTime start, LocalDateTime end, int excludeId) {
        return !jdbc.queryForList("SELECT 1 FROM appointments WHERE provider_id = ? AND status = 'BOOKED' "
                + "AND start_at < ? AND end_at > ? AND id <> ? LIMIT 1", Integer.class,
                providerId, end, start, excludeId).isEmpty();
    }

    public void updateStatus(int id, AppointmentStatus status) {
        jdbc.update("UPDATE appointments SET status = ?, updated_at = NOW() WHERE id = ?", status.name(), id);
    }

    public void updateTimes(int id, LocalDateTime startAt, LocalDateTime endAt) {
        jdbc.update("UPDATE appointments SET start_at = ?, end_at = ?, updated_at = NOW() WHERE id = ?",
                startAt, endAt, id);
    }
}
