package com.readytime.repository;

import com.readytime.model.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

/** SQL for the "services" table. */
@Repository
public class ServiceRepository {

    private static final String SELECT =
            "SELECT s.*, u.full_name AS provider_name FROM services s JOIN users u ON u.id = s.provider_id ";

    private static final RowMapper<Service> MAPPER = (rs, rowNum) -> new Service(
            rs.getInt("id"),
            rs.getInt("provider_id"),
            rs.getString("provider_name"),
            rs.getString("name"),
            rs.getInt("duration_minutes"),
            rs.getBigDecimal("price"),
            rs.getBoolean("active"));

    private final JdbcTemplate jdbc;

    public ServiceRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int insert(int providerId, String name, int durationMinutes, BigDecimal price) {
        return jdbc.queryForObject(
                "INSERT INTO services (provider_id, name, duration_minutes, price) VALUES (?, ?, ?, ?) RETURNING id",
                Integer.class, providerId, name, durationMinutes, price);
    }

    public void update(int id, String name, int durationMinutes, BigDecimal price, boolean active) {
        jdbc.update("UPDATE services SET name = ?, duration_minutes = ?, price = ?, active = ? WHERE id = ?",
                name, durationMinutes, price, active, id);
    }

    public Service findById(int id) {
        return UserRepository.first(jdbc.query(SELECT + "WHERE s.id = ?", MAPPER, id));
    }

    public List<Service> findByProvider(int providerId, boolean onlyActive) {
        return jdbc.query(SELECT + "WHERE s.provider_id = ?" + (onlyActive ? " AND s.active" : "") + " ORDER BY s.name",
                MAPPER, providerId);
    }
}
