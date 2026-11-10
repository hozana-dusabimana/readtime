package com.readytime.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/** SQL for the "sessions" table (who is logged in). */
@Repository
public class SessionRepository {

    private final JdbcTemplate jdbc;

    public SessionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(String token, int userId, LocalDateTime expiresAt) {
        jdbc.update("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", token, userId, expiresAt);
    }

    /** Returns the user id for a token that has not expired yet, or null. */
    public Integer findUserId(String token, LocalDateTime now) {
        return UserRepository.first(jdbc.queryForList(
                "SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?", Integer.class, token, now));
    }

    public void delete(String token) {
        jdbc.update("DELETE FROM sessions WHERE token = ?", token);
    }
}
