package com.readytime.dao;

import com.readytime.model.WorkingHour;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Time;
import java.util.ArrayList;
import java.util.List;

/** SQL for the "working_hours" table. */
public class WorkingHourDao {

    public List<WorkingHour> findByProvider(Connection conn, int providerId) throws SQLException {
        String sql = "SELECT * FROM working_hours WHERE provider_id = ? ORDER BY day_of_week, start_time";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, providerId);
            ResultSet rs = ps.executeQuery();
            List<WorkingHour> list = new ArrayList<>();
            while (rs.next()) {
                list.add(new WorkingHour(
                        rs.getInt("day_of_week"),
                        rs.getTime("start_time").toLocalTime(),
                        rs.getTime("end_time").toLocalTime()));
            }
            return list;
        }
    }

    public void deleteByProvider(Connection conn, int providerId) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("DELETE FROM working_hours WHERE provider_id = ?")) {
            ps.setInt(1, providerId);
            ps.executeUpdate();
        }
    }

    public void insert(Connection conn, int providerId, WorkingHour hour) throws SQLException {
        String sql = "INSERT INTO working_hours (provider_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, providerId);
            ps.setInt(2, hour.dayOfWeek());
            ps.setTime(3, Time.valueOf(hour.startTime()));
            ps.setTime(4, Time.valueOf(hour.endTime()));
            ps.executeUpdate();
        }
    }
}
