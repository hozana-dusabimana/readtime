package com.readytime.dao;

import com.readytime.model.Role;
import com.readytime.model.User;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

/**
 * All SQL for the "users" table.
 * Every method receives a Connection, so the caller (a service class) decides
 * when a transaction starts and ends.
 */
public class UserDao {

    private static final String COLUMNS =
            "id, full_name, email, role, business_id, no_show_count, blocked, active";

    public int insert(Connection conn, String fullName, String email, String passwordHash,
                      Role role, Integer businessId) throws SQLException {
        String sql = "INSERT INTO users (full_name, email, password_hash, role, business_id) VALUES (?, ?, ?, ?, ?)";
        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, fullName);
            ps.setString(2, email);
            ps.setString(3, passwordHash);
            ps.setString(4, role.name());
            if (businessId == null) {
                ps.setNull(5, Types.INTEGER);
            } else {
                ps.setInt(5, businessId);
            }
            ps.executeUpdate();
            ResultSet keys = ps.getGeneratedKeys();
            keys.next();
            return keys.getInt(1);
        }
    }

    public User findById(Connection conn, int id) throws SQLException {
        return findOne(conn, "SELECT " + COLUMNS + " FROM users WHERE id = ?", id);
    }

    /** Same as findById, but locks the row until the transaction ends (used when booking). */
    public User lockById(Connection conn, int id) throws SQLException {
        return findOne(conn, "SELECT " + COLUMNS + " FROM users WHERE id = ? FOR UPDATE", id);
    }

    public User findByEmail(Connection conn, String email) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("SELECT " + COLUMNS + " FROM users WHERE email = ?")) {
            ps.setString(1, email);
            ResultSet rs = ps.executeQuery();
            return rs.next() ? map(rs) : null;
        }
    }

    public String findPasswordHash(Connection conn, int userId) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("SELECT password_hash FROM users WHERE id = ?")) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            return rs.next() ? rs.getString(1) : null;
        }
    }

    public List<User> findAll(Connection conn) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("SELECT " + COLUMNS + " FROM users ORDER BY id")) {
            return mapAll(ps.executeQuery());
        }
    }

    public List<User> findByBusinessAndRole(Connection conn, int businessId, Role role) throws SQLException {
        String sql = "SELECT " + COLUMNS + " FROM users WHERE business_id = ? AND role = ? ORDER BY full_name";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, businessId);
            ps.setString(2, role.name());
            return mapAll(ps.executeQuery());
        }
    }

    public boolean existsWithRole(Connection conn, Role role) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("SELECT 1 FROM users WHERE role = ?")) {
            ps.setString(1, role.name());
            return ps.executeQuery().next();
        }
    }

    /** Adds one no-show. When the count reaches 3 the client becomes blocked. */
    public void addNoShow(Connection conn, int userId) throws SQLException {
        String sql = "UPDATE users SET no_show_count = no_show_count + 1, "
                + "blocked = (no_show_count + 1 >= 3) WHERE id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.executeUpdate();
        }
    }

    public void unblock(Connection conn, int userId) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "UPDATE users SET blocked = FALSE, no_show_count = 0 WHERE id = ?")) {
            ps.setInt(1, userId);
            ps.executeUpdate();
        }
    }

    public void setActive(Connection conn, int userId, boolean active) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("UPDATE users SET active = ? WHERE id = ?")) {
            ps.setBoolean(1, active);
            ps.setInt(2, userId);
            ps.executeUpdate();
        }
    }

    private User findOne(Connection conn, String sql, int id) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            return rs.next() ? map(rs) : null;
        }
    }

    private List<User> mapAll(ResultSet rs) throws SQLException {
        List<User> list = new ArrayList<>();
        while (rs.next()) {
            list.add(map(rs));
        }
        return list;
    }

    private User map(ResultSet rs) throws SQLException {
        int businessId = rs.getInt("business_id");
        return new User(
                rs.getInt("id"),
                rs.getString("full_name"),
                rs.getString("email"),
                Role.valueOf(rs.getString("role")),
                rs.wasNull() ? null : businessId,
                rs.getInt("no_show_count"),
                rs.getBoolean("blocked"),
                rs.getBoolean("active"));
    }
}
