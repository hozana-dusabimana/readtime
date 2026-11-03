package com.readytime.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;

/** SQL for the "sessions" table (who is logged in). */
public class SessionDao {

    public void insert(Connection conn, String token, int userId, LocalDateTime expiresAt) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")) {
            ps.setString(1, token);
            ps.setInt(2, userId);
            ps.setTimestamp(3, Timestamp.valueOf(expiresAt));
            ps.executeUpdate();
        }
    }

    /** Returns the user id for a token that has not expired yet, or null. */
    public Integer findUserId(Connection conn, String token, LocalDateTime now) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?")) {
            ps.setString(1, token);
            ps.setTimestamp(2, Timestamp.valueOf(now));
            ResultSet rs = ps.executeQuery();
            return rs.next() ? rs.getInt(1) : null;
        }
    }

    public void delete(Connection conn, String token) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("DELETE FROM sessions WHERE token = ?")) {
            ps.setString(1, token);
            ps.executeUpdate();
        }
    }
}
