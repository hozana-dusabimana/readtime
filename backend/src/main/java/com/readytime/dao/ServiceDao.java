package com.readytime.dao;

import com.readytime.model.Service;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/** SQL for the "services" table. */
public class ServiceDao {

    private static final String SELECT =
            "SELECT s.*, u.full_name AS provider_name FROM services s JOIN users u ON u.id = s.provider_id ";

    public int insert(Connection conn, int providerId, String name, int durationMinutes, BigDecimal price)
            throws SQLException {
        String sql = "INSERT INTO services (provider_id, name, duration_minutes, price) VALUES (?, ?, ?, ?)";
        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, providerId);
            ps.setString(2, name);
            ps.setInt(3, durationMinutes);
            ps.setBigDecimal(4, price);
            ps.executeUpdate();
            ResultSet keys = ps.getGeneratedKeys();
            keys.next();
            return keys.getInt(1);
        }
    }

    public void update(Connection conn, int id, String name, int durationMinutes, BigDecimal price, boolean active)
            throws SQLException {
        String sql = "UPDATE services SET name = ?, duration_minutes = ?, price = ?, active = ? WHERE id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, name);
            ps.setInt(2, durationMinutes);
            ps.setBigDecimal(3, price);
            ps.setBoolean(4, active);
            ps.setInt(5, id);
            ps.executeUpdate();
        }
    }

    public Service findById(Connection conn, int id) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(SELECT + "WHERE s.id = ?")) {
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            return rs.next() ? map(rs) : null;
        }
    }

    public List<Service> findByProvider(Connection conn, int providerId, boolean onlyActive) throws SQLException {
        String sql = SELECT + "WHERE s.provider_id = ?" + (onlyActive ? " AND s.active" : "") + " ORDER BY s.name";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, providerId);
            ResultSet rs = ps.executeQuery();
            List<Service> list = new ArrayList<>();
            while (rs.next()) {
                list.add(map(rs));
            }
            return list;
        }
    }

    private Service map(ResultSet rs) throws SQLException {
        return new Service(
                rs.getInt("id"),
                rs.getInt("provider_id"),
                rs.getString("provider_name"),
                rs.getString("name"),
                rs.getInt("duration_minutes"),
                rs.getBigDecimal("price"),
                rs.getBoolean("active"));
    }
}
