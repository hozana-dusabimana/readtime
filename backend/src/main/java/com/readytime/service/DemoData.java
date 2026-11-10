package com.readytime.service;

import com.readytime.model.Role;
import com.readytime.model.WorkingHour;
import com.readytime.repository.BusinessRepository;
import com.readytime.repository.ServiceRepository;
import com.readytime.repository.UserRepository;
import com.readytime.repository.WorkingHourRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalTime;

/**
 * Runs once when the backend starts (after schema.sql created the tables):
 *  - creates the first System Admin if there is none, so someone can log in;
 *  - creates demo accounts, so the app can be tried right away.
 * It is safe to run on every start: if the demo provider already exists, nothing is changed.
 *
 *   System Admin    admin@readytime.com     / Admin@1234
 *   Provider        provider@readytime.com  / Provider@1234
 *   Client          client@readytime.com    / Client@1234
 *
 * Turn the demo accounts off with seed.demo=false in config.properties (or SEED_DEMO=false).
 */
@Component
public class DemoData implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoData.class);

    public static final String ADMIN_EMAIL = "admin@readytime.com";
    public static final String ADMIN_PASSWORD = "Admin@1234";
    public static final String PROVIDER_EMAIL = "provider@readytime.com";
    public static final String PROVIDER_PASSWORD = "Provider@1234";
    public static final String CLIENT_EMAIL = "client@readytime.com";
    public static final String CLIENT_PASSWORD = "Client@1234";

    private final boolean seedDemo;
    private final AuthService authService;
    private final UserRepository userRepo;
    private final BusinessRepository businessRepo;
    private final ServiceRepository serviceRepo;
    private final WorkingHourRepository hourRepo;
    private final TransactionTemplate transaction;

    public DemoData(@Value("${readytime.seed-demo}") boolean seedDemo, AuthService authService,
                    UserRepository userRepo, BusinessRepository businessRepo, ServiceRepository serviceRepo,
                    WorkingHourRepository hourRepo, TransactionTemplate transaction) {
        this.seedDemo = seedDemo;
        this.authService = authService;
        this.userRepo = userRepo;
        this.businessRepo = businessRepo;
        this.serviceRepo = serviceRepo;
        this.hourRepo = hourRepo;
        this.transaction = transaction;
    }

    @Override
    public void run(ApplicationArguments args) {
        authService.createFirstSystemAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
        if (seedDemo) {
            transaction.executeWithoutResult(status -> seed());
        }
    }

    private void seed() {
        if (userRepo.findByEmail(PROVIDER_EMAIL) != null) {
            return;   // already seeded on an earlier start
        }

        int businessId = businessRepo.insert("ReadyTime Demo Clinic", "KG 7 Ave, Kigali");

        int providerId = userRepo.insert("Dr. Eric Provider", PROVIDER_EMAIL,
                AuthService.hashPassword(PROVIDER_PASSWORD), Role.PROVIDER, businessId);
        if (userRepo.findByEmail(CLIENT_EMAIL) == null) {
            userRepo.insert("Grace Client", CLIENT_EMAIL, AuthService.hashPassword(CLIENT_PASSWORD), Role.CLIENT, null);
        }

        serviceRepo.insert(providerId, "General Consultation", 30, new BigDecimal("10000"));
        serviceRepo.insert(providerId, "Full Check-up", 60, new BigDecimal("25000"));
        serviceRepo.insert(providerId, "Follow-up Visit", 15, new BigDecimal("5000"));

        // Monday to Friday 08:00-12:00 and 13:00-17:00 (lunch break 12:00-13:00), Saturday morning.
        for (int day = 1; day <= 5; day++) {
            hourRepo.insert(providerId, new WorkingHour(day, LocalTime.of(8, 0), LocalTime.of(12, 0)));
            hourRepo.insert(providerId, new WorkingHour(day, LocalTime.of(13, 0), LocalTime.of(17, 0)));
        }
        hourRepo.insert(providerId, new WorkingHour(6, LocalTime.of(9, 0), LocalTime.of(13, 0)));

        log.info("Created demo data: business, provider (3 services) and client.");
    }
}
