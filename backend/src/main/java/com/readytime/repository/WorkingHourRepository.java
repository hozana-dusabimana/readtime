package com.readytime.repository;

import com.readytime.model.WorkingHour;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;

/** SQL for the "working_hours" table. */
@Repository
public class WorkingHourRepository {

    private final JdbcTemplate jdbc;

    public WorkingHourRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<WorkingHour> findByProvider(int providerId) {
        return jdbc.query("SELECT * FROM working_hours WHERE provider_id = ? ORDER BY day_of_week, start_time",
                (rs, rowNum) -> new WorkingHour(
                        rs.getInt("day_of_week"),
                        rs.getObject("start_time", LocalTime.class),
                        rs.getObject("end_time", LocalTime.class)),
                providerId);
    }

    public void deleteByProvider(int providerId) {
        jdbc.update("DELETE FROM working_hours WHERE provider_id = ?", providerId);
    }

    public void insert(int providerId, WorkingHour hour) {
        jdbc.update("INSERT INTO working_hours (provider_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)",
                providerId, hour.dayOfWeek(), hour.startTime(), hour.endTime());
    }
}
