package com.readytime.service;

import com.readytime.Database;
import com.readytime.dao.BusinessDao;
import com.readytime.dao.ServiceDao;
import com.readytime.dao.UserDao;
import com.readytime.dao.WorkingHourDao;
import com.readytime.model.Role;
import com.readytime.model.WorkingHour;

import java.math.BigDecimal;
import java.time.LocalTime;

/**
 * Creates demo accounts when the backend starts, so the app can be tried right away.
 * It is safe to run on every start: if the demo provider already exists, nothing is changed.
 *
 *   System Admin    admin@readytime.com     / Admin@1234
 *   Provider        provider@readytime.com  / Provider@1234
 *   Client          client@readytime.com    / Client@1234
 *
 * Turn it off with seed.demo=false in config.properties (or SEED_DEMO=false).
 */
public class DemoData {

    public static final String ADMIN_EMAIL = "admin@readytime.com";
    public static final String ADMIN_PASSWORD = "Admin@1234";
    public static final String PROVIDER_EMAIL = "provider@readytime.com";
    public static final String PROVIDER_PASSWORD = "Provider@1234";
    public static final String CLIENT_EMAIL = "client@readytime.com";
    public static final String CLIENT_PASSWORD = "Client@1234";

    private final UserDao userDao = new UserDao();
    private final BusinessDao businessDao = new BusinessDao();
    private final ServiceDao serviceDao = new ServiceDao();
    private final WorkingHourDao hourDao = new WorkingHourDao();

    public void seed(Database db) {
        db.transaction(conn -> {
            if (userDao.findByEmail(conn, PROVIDER_EMAIL) != null) {
                return null;   // already seeded on an earlier start
            }

            int businessId = businessDao.insert(conn, "ReadyTime Demo Clinic", "KG 7 Ave, Kigali");

            int providerId = userDao.insert(conn, "Dr. Eric Provider", PROVIDER_EMAIL,
                    AuthService.hashPassword(PROVIDER_PASSWORD), Role.PROVIDER, businessId);
            if (userDao.findByEmail(conn, CLIENT_EMAIL) == null) {
                userDao.insert(conn, "Grace Client", CLIENT_EMAIL,
                        AuthService.hashPassword(CLIENT_PASSWORD), Role.CLIENT, null);
            }

            serviceDao.insert(conn, providerId, "General Consultation", 30, new BigDecimal("10000"));
            serviceDao.insert(conn, providerId, "Full Check-up", 60, new BigDecimal("25000"));
            serviceDao.insert(conn, providerId, "Follow-up Visit", 15, new BigDecimal("5000"));

            // Monday to Friday 08:00-12:00 and 13:00-17:00 (lunch break 12:00-13:00), Saturday morning.
            for (int day = 1; day <= 5; day++) {
                hourDao.insert(conn, providerId, new WorkingHour(day, LocalTime.of(8, 0), LocalTime.of(12, 0)));
                hourDao.insert(conn, providerId, new WorkingHour(day, LocalTime.of(13, 0), LocalTime.of(17, 0)));
            }
            hourDao.insert(conn, providerId, new WorkingHour(6, LocalTime.of(9, 0), LocalTime.of(13, 0)));

            System.out.println("Created demo data: business, provider (3 services) and client.");
            return null;
        });
    }
}
