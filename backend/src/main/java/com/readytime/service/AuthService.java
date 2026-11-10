package com.readytime.service;

import com.readytime.AppException;
import com.readytime.TimeProvider;
import com.readytime.model.Role;
import com.readytime.model.User;
import com.readytime.repository.BusinessRepository;
import com.readytime.repository.SessionRepository;
import com.readytime.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/** Registration, login, logout and password hashing. */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    public static final int SESSION_HOURS = 8;

    /** What login returns: the session token and who logged in. */
    public record LoginResult(String token, User user) {
    }

    private final TimeProvider time;
    private final UserRepository userRepo;
    private final SessionRepository sessionRepo;
    private final BusinessRepository businessRepo;
    private final SecureRandom random = new SecureRandom();

    public AuthService(TimeProvider time, UserRepository userRepo, SessionRepository sessionRepo,
                       BusinessRepository businessRepo) {
        this.time = time;
        this.userRepo = userRepo;
        this.sessionRepo = sessionRepo;
        this.businessRepo = businessRepo;
    }

    /** Public sign-up: always creates a CLIENT account. */
    public User register(String fullName, String email, String password) {
        return createUser(fullName, email, password, Role.CLIENT, null);
    }

    /**
     * Public sign-up for a SERVICE PROVIDER: creates their business and their provider account
     * together. Both are saved in ONE transaction, so if anything fails nothing is saved.
     */
    @Transactional
    public User registerProvider(String fullName, String email, String password,
                                 String businessName, String businessAddress) {
        String name = Validate.text(fullName, "Full name", 2, 100);
        String cleanEmail = Validate.email(email);
        Validate.password(password);
        String cleanBusinessName = Validate.text(businessName, "Business name", 2, 100);
        String cleanAddress = Validate.text(businessAddress, "Address", 2, 200);
        requireEmailFree(cleanEmail, -1);
        int businessId = businessRepo.insert(cleanBusinessName, cleanAddress);
        int id = userRepo.insert(name, cleanEmail, hashPassword(password), Role.PROVIDER, businessId);
        return userRepo.findById(id);
    }

    /** Used by register() and by the system admin who creates accounts. */
    @Transactional
    public User createUser(String fullName, String email, String password, Role role, Integer businessId) {
        String name = Validate.text(fullName, "Full name", 2, 100);
        String cleanEmail = Validate.email(email);
        Validate.password(password);
        requireEmailFree(cleanEmail, -1);
        int id = userRepo.insert(name, cleanEmail, hashPassword(password), role, businessId);
        return userRepo.findById(id);
    }

    @Transactional
    public LoginResult login(String email, String password) {
        if (email == null || password == null) {
            throw new AppException(400, "Email and password are required.");
        }
        User user = userRepo.findByEmail(email.trim().toLowerCase());
        // Same message for "no such email" and "wrong password", so attackers
        // cannot find out which emails are registered.
        if (user == null || !checkPassword(password, userRepo.findPasswordHash(user.id()))) {
            throw new AppException(401, "Wrong email or password.");
        }
        if (!user.active()) {
            throw new AppException(403, "This account has been disabled. Contact the system admin.");
        }
        String token = newToken();
        sessionRepo.insert(token, user.id(), time.now().plusHours(SESSION_HOURS));
        return new LoginResult(token, user);
    }

    public void logout(String token) {
        if (token != null) {
            sessionRepo.delete(token);
        }
    }

    /** Returns the logged-in user for a session token, or null if not logged in. */
    public User findUserByToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        Integer userId = sessionRepo.findUserId(token, time.now());
        if (userId == null) {
            return null;
        }
        User user = userRepo.findById(userId);
        return (user != null && user.active()) ? user : null;
    }

    // ---------- My Profile (every logged-in user) ----------

    /** Changes the logged-in user's own name and email. */
    @Transactional
    public User updateProfile(User me, String fullName, String email) {
        String name = Validate.text(fullName, "Full name", 2, 100);
        String cleanEmail = Validate.email(email);
        requireEmailFree(cleanEmail, me.id());
        userRepo.updateNameAndEmail(me.id(), name, cleanEmail);
        return userRepo.findById(me.id());
    }

    /** Changes the logged-in user's own password. The current password must be given. */
    @Transactional
    public void changePassword(User me, String currentPassword, String newPassword) {
        Validate.password(newPassword);
        if (currentPassword == null || !checkPassword(currentPassword, userRepo.findPasswordHash(me.id()))) {
            throw new AppException(400, "Your current password is wrong.");
        }
        userRepo.updatePasswordHash(me.id(), hashPassword(newPassword));
    }

    /** Throws 409 if ANOTHER account already uses this email. */
    public void requireEmailFree(String email, int ownId) {
        User other = userRepo.findByEmail(email);
        if (other != null && other.id() != ownId) {
            throw new AppException(409, "An account with this email already exists.");
        }
    }

    /** Creates the first System Admin on the very first start, so someone can log in. */
    public void createFirstSystemAdmin(String email, String password) {
        if (!userRepo.existsWithRole(Role.SYSTEM_ADMIN)) {
            createUser("System Admin", email, password, Role.SYSTEM_ADMIN, null);
            log.info("Created first system admin: {} / {}", email, password);
        }
    }

    // ---------- Password hashing (PBKDF2, built into Java) ----------
    // We never store the real password. We store "salt:hash". To check a login we
    // hash the typed password with the same salt and compare the results.

    private static final int ITERATIONS = 65_536;

    static String hashPassword(String password) {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        byte[] hash = pbkdf2(password, salt);
        return Base64.getEncoder().encodeToString(salt) + ":" + Base64.getEncoder().encodeToString(hash);
    }

    static boolean checkPassword(String password, String stored) {
        if (stored == null || !stored.contains(":")) {
            return false;
        }
        String[] parts = stored.split(":");
        byte[] salt = Base64.getDecoder().decode(parts[0]);
        byte[] expected = Base64.getDecoder().decode(parts[1]);
        return MessageDigest.isEqual(expected, pbkdf2(password, salt));
    }

    private static byte[] pbkdf2(String password, byte[] salt) {
        try {
            PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, ITERATIONS, 256);
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } catch (Exception e) {
            throw new RuntimeException("Password hashing failed", e);
        }
    }

    private String newToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
