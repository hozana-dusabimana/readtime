package com.readytime.repository;

import com.readytime.model.Business;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;

/** SQL for the "businesses" table. */
@Repository
public class BusinessRepository {

    private static final RowMapper<Business> MAPPER = (rs, rowNum) ->
            new Business(rs.getInt("id"), rs.getString("name"), rs.getString("address"), rs.getBoolean("active"));

    private final JdbcTemplate jdbc;

    public BusinessRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int insert(String name, String address) {
        return jdbc.queryForObject("INSERT INTO businesses (name, address) VALUES (?, ?) RETURNING id",
                Integer.class, name, address);
    }

    public Business findById(int id) {
        return UserRepository.first(jdbc.query("SELECT * FROM businesses WHERE id = ?", MAPPER, id));
    }

    public List<Business> findAll(boolean onlyActive) {
        return jdbc.query("SELECT * FROM businesses" + (onlyActive ? " WHERE active" : "") + " ORDER BY name", MAPPER);
    }

    public void update(int id, String name, String address) {
        jdbc.update("UPDATE businesses SET name = ?, address = ? WHERE id = ?", name, address, id);
    }

    public void setActive(int id, boolean active) {
        jdbc.update("UPDATE businesses SET active = ? WHERE id = ?", active, id);
    }
}
