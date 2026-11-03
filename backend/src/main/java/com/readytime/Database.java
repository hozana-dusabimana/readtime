package com.readytime;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

/** Opens JDBC connections to PostgreSQL. */
public class Database {

    /** A piece of database work that receives an open connection. */
    public interface SqlWork<T> {
        T run(Connection conn) throws SQLException;
    }

    private final String url;
    private final String user;
    private final String password;

    public Database(String url, String user, String password) {
        this.url = url;
        this.user = user;
        this.password = password;
    }

    public Connection getConnection() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }

    /**
     * Runs simple work (each SQL statement is saved immediately).
     * Example: db.run(conn -> userDao.findAll(conn));
     */
    public <T> T run(SqlWork<T> work) {
        try (Connection conn = getConnection()) {
            return work.run(conn);
        } catch (SQLException e) {
            throw translate(e);
        }
    }

    /**
     * Runs work inside a transaction: either ALL statements are saved (commit)
     * or, if anything fails, NONE of them are (rollback).
     */
    public <T> T transaction(SqlWork<T> work) {
        try (Connection conn = getConnection()) {
            conn.setAutoCommit(false);
            try {
                T result = work.run(conn);
                conn.commit();
                return result;
            } catch (SQLException | RuntimeException e) {
                conn.rollback();
                throw e;
            }
        } catch (SQLException e) {
            throw translate(e);
        }
    }

    /** Turns known database errors into friendly messages. */
    private RuntimeException translate(SQLException e) {
        String state = e.getSQLState();
        if ("23P01".equals(state)) {   // our no_overlapping_bookings rule was broken
            return new AppException(409, "This time slot is already booked.");
        }
        if ("23505".equals(state)) {   // UNIQUE rule broken (e.g. same email twice)
            return new AppException(409, "This record already exists (for example, the email is taken).");
        }
        return new RuntimeException("Database error: " + e.getMessage(), e);
    }

    /** Creates the tables (if they do not exist yet) by running schema.sql. */
    public void createTables() {
        try (InputStream in = Database.class.getResourceAsStream("/schema.sql");
             Connection conn = getConnection();
             Statement st = conn.createStatement()) {
            String sql = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            st.execute(sql);
        } catch (IOException | SQLException e) {
            throw new RuntimeException("Could not create tables: " + e.getMessage(), e);
        }
    }
}
