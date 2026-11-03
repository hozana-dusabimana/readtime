package com.readytime;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

/**
 * Reads settings from config.properties (kept out of Git).
 * An environment variable with the same meaning wins over the file,
 * e.g. DB_PASSWORD overrides db.password.
 */
public class Config {

    private final Properties props = new Properties();

    public Config(String fileName) {
        Path file = Path.of(fileName);
        if (Files.exists(file)) {
            try (FileInputStream in = new FileInputStream(file.toFile())) {
                props.load(in);
            } catch (IOException e) {
                throw new RuntimeException("Could not read " + fileName, e);
            }
        }
    }

    public String get(String key, String envName, String defaultValue) {
        String fromEnv = System.getenv(envName);
        if (fromEnv != null) {
            return fromEnv;
        }
        return props.getProperty(key, defaultValue);
    }

    public String dbUrl()      { return get("db.url", "DB_URL", "jdbc:postgresql://localhost:5432/readytime"); }
    public String dbUser()     { return get("db.user", "DB_USER", "postgres"); }
    public String dbPassword() { return get("db.password", "DB_PASSWORD", ""); }
    public int port()          { return Integer.parseInt(get("port", "PORT", "8080")); }
    public String corsOrigin() { return get("cors.origin", "CORS_ORIGIN", "*"); }
    public boolean seedDemo()  { return Boolean.parseBoolean(get("seed.demo", "SEED_DEMO", "true")); }
}
