package com.readytime.repository;

import com.readytime.model.Role;
import com.readytime.model.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.SqlParameterValue;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.List;

/** All SQL for the "users" table. Transactions are started by the service classes (@Transactional). */
@Repository
public class UserRepository {

    private static final String COLUMNS =
            "id, full_name, email, role, business_id, no_show_count, blocked, active";

    private static final RowMapper<User> MAPPER = (rs, rowNum) -> new User(
            rs.getInt("id"),
            rs.getString("full_name"),
            rs.getString("email"),
            Role.valueOf(rs.getString("role")),
            rs.getObject("business_id", Integer.class),
            rs.getInt("no_show_count"),
            rs.getBoolean("blocked"),
            rs.getBoolean("active"));

    private final JdbcTemplate jdbc;

    public UserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int insert(String fullName, String email, String passwordHash, Role role, Integer businessId) {
        return jdbc.queryForObject(
                "INSERT INTO users (full_name, email, password_hash, role, business_id) VALUES (?, ?, ?, ?, ?) "
                        + "RETURNING id",
                Integer.class, fullName, email, passwordHash, role.name(), nullableInt(businessId));
    }

    public User findById(int id) {
        return first(jdbc.query("SELECT " + COLUMNS + " FROM users WHERE id = ?", MAPPER, id));
    }

    /** Same as findById, but locks the row until the transaction ends (used when booking). */
    public User lockById(int id) {
        return first(jdbc.query("SELECT " + COLUMNS + " FROM users WHERE id = ? FOR UPDATE", MAPPER, id));
    }

    public User findByEmail(String email) {
        return first(jdbc.query("SELECT " + COLUMNS + " FROM users WHERE email = ?", MAPPER, email));
    }

    public String findPasswordHash(int userId) {
        return first(jdbc.queryForList("SELECT password_hash FROM users WHERE id = ?", String.class, userId));
    }

    public List<User> findAll() {
        return jdbc.query("SELECT " + COLUMNS + " FROM users ORDER BY id", MAPPER);
    }

    public List<User> findByBusinessAndRole(int businessId, Role role) {
        return jdbc.query("SELECT " + COLUMNS + " FROM users WHERE business_id = ? AND role = ? ORDER BY full_name",
                MAPPER, businessId, role.name());
    }

    public boolean existsWithRole(Role role) {
        return !jdbc.queryForList("SELECT 1 FROM users WHERE role = ? LIMIT 1", Integer.class, role.name()).isEmpty();
    }

    /** Adds one no-show. When the count reaches 3 the client becomes blocked. */
    public void addNoShow(int userId) {
        jdbc.update("UPDATE users SET no_show_count = no_show_count + 1, blocked = (no_show_count + 1 >= 3) "
                + "WHERE id = ?", userId);
    }

    public void unblock(int userId) {
        jdbc.update("UPDATE users SET blocked = FALSE, no_show_count = 0 WHERE id = ?", userId);
    }

    /** Changes name and email (used by "My Profile" and by the system admin). */
    public void updateNameAndEmail(int userId, String fullName, String email) {
        jdbc.update("UPDATE users SET full_name = ?, email = ? WHERE id = ?", fullName, email, userId);
    }

    public void updateBusiness(int userId, Integer businessId) {
        jdbc.update("UPDATE users SET business_id = ? WHERE id = ?", nullableInt(businessId), userId);
    }

    public void updatePasswordHash(int userId, String passwordHash) {
        jdbc.update("UPDATE users SET password_hash = ? WHERE id = ?", passwordHash, userId);
    }

    public void setActive(int userId, boolean active) {
        jdbc.update("UPDATE users SET active = ? WHERE id = ?", active, userId);
    }

    private static SqlParameterValue nullableInt(Integer value) {
        return new SqlParameterValue(Types.INTEGER, value);
    }

    static <T> T first(List<T> list) {
        return list.isEmpty() ? null : list.get(0);
    }
}
