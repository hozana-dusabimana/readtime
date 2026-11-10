package com.readytime;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Starts ReadyTime. Spring Boot connects to PostgreSQL, runs schema.sql,
 * creates the demo data (see StartupData) and starts the web server.
 * The backend only answers API requests with JSON; the React frontend is a separate website.
 */
@SpringBootApplication
public class ReadyTimeApplication {

    public static void main(String[] args) {
        SpringApplication.run(ReadyTimeApplication.class, args);
    }
}
