package com.readytime.dao;

import com.readytime.model.Business;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/** SQL for the "businesses" table. */
public class BusinessDao {

    public int insert(Connection conn, String name, String address) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO businesses (name, address) VALUES (?, ?)", Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, name);
            ps.setString(2, address);
            ps.executeUpdate();
            ResultSet keys = ps.getGeneratedKeys();
            keys.next();
            return keys.getInt(1);
        }
    }

    public Business findById(Connection conn, int id) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("SELECT * FROM businesses WHERE id = ?")) {
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            return rs.next() ? map(rs) : null;
        }
    }

    public List<Business> findAll(Connection conn, boolean onlyActive) throws SQLException {
        String sql = "SELECT * FROM businesses" + (onlyActive ? " WHERE active" : "") + " ORDER BY name";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ResultSet rs = ps.executeQuery();
            List<Business> list = new ArrayList<>();
            while (rs.next()) {
                list.add(map(rs));
            }
            return list;
        }
    }

    public void setActive(Connection conn, int id, boolean active) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("UPDATE businesses SET active = ? WHERE id = ?")) {
            ps.setBoolean(1, active);
            ps.setInt(2, id);
            ps.executeUpdate();
        }
    }

    private Business map(ResultSet rs) throws SQLException {
        return new Business(rs.getInt("id"), rs.getString("name"), rs.getString("address"), rs.getBoolean("active"));
    }
}
