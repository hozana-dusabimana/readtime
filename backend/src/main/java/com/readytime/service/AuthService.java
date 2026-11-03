package com.readytime.service;

import com.readytime.AppException;
import com.readytime.Database;
import com.readytime.TimeProvider;
import com.readytime.dao.BusinessDao;
import com.readytime.dao.SessionDao;
import com.readytime.dao.UserDao;
import com.readytime.model.Role;
import com.readytime.model.User;

import javax.crypto.SecretKeyFactory;
import java.sql.Connection;
import java.sql.SQLException;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/** Registration, login, logout and password hashing. */
public class AuthService {

    public static final int SESSION_HOURS = 8;

    /** What login returns: the session token and who logged in. */
    public record LoginResult(String token, User user) {
    }

    private final Database db;
    private final TimeProvider time;
    private final UserDao userDao = new UserDao();
    private final SessionDao sessionDao = new SessionDao();
    private final BusinessDao businessDao = new BusinessDao();
    private final SecureRandom random = new SecureRandom();

    public AuthService(Database db, TimeProvider time) {
        this.db = db;
        this.time = time;
    }

    /** Public sign-up: always creates a CLIENT account. */
    public User register(String fullName, String email, String password) {
        return createUser(fullName, email, password, Role.CLIENT, null);
    }

    /**
     * Public sign-up for a SERVICE PROVIDER: creates their business and their provider account
     * together. Both are saved in ONE transaction, so if anything fails nothing is saved.
     */
    public User registerProvider(String fullName, String email, String password,
                                 String businessName, String businessAddress) {
        String name = Validate.text(fullName, "Full name", 2, 100);
        String cleanEmail = Validate.email(email);
        Validate.password(password);
        String cleanBusinessName = Validate.text(businessName, "Business name", 2, 100);
        String cleanAddress = Validate.text(businessAddress, "Address", 2, 200);
        String hash = hashPassword(password);
        return db.transaction(conn -> {
            requireEmailFree(conn, cleanEmail, -1);
            int businessId = businessDao.insert(conn, cleanBusinessName, cleanAddress);
            int id = userDao.insert(conn, name, cleanEmail, hash, Role.PROVIDER, businessId);
            return userDao.findById(conn, id);
        });
    }

    /** Used by register() and by admins who create provider accounts. */
    public User createUser(String fullName, String email, String password, Role role, Integer businessId) {
        String name = Validate.text(fullName, "Full name", 2, 100);
        String cleanEmail = Validate.email(email);
        Validate.password(password);
        String hash = hashPassword(password);
        return db.run(conn -> {
            if (userDao.findByEmail(conn, cleanEmail) != null) {
                throw new AppException(409, "An account with this email already exists.");
            }
            int id = userDao.insert(conn, name, cleanEmail, hash, role, businessId);
            return userDao.findById(conn, id);
        });
    }

    public LoginResult login(String email, String password) {
        if (email == null || password == null) {
            throw new AppException(400, "Email and password are required.");
        }
        return db.run(conn -> {
            User user = userDao.findByEmail(conn, email.trim().toLowerCase());
            // Same message for "no such email" and "wrong password", so attackers
            // cannot find out which emails are registered.
            if (user == null || !checkPassword(password, userDao.findPasswordHash(conn, user.id()))) {
                throw new AppException(401, "Wrong email or password.");
            }
            if (!user.active()) {
                throw new AppException(403, "This account has been disabled. Contact the system admin.");
            }
            String token = newToken();
            sessionDao.insert(conn, token, user.id(), time.now().plusHours(SESSION_HOURS));
            return new LoginResult(token, user);
        });
    }

    public void logout(String token) {
        db.run(conn -> {
            sessionDao.delete(conn, token);
            return null;
        });
    }

    /** Returns the logged-in user for a session token, or null if not logged in. */
    public User findUserByToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        return db.run(conn -> {
            Integer userId = sessionDao.findUserId(conn, token, time.now());
            if (userId == null) {
                return null;
            }
            User user = userDao.findById(conn, userId);
            return (user != null && user.active()) ? user : null;
        });
    }

    // ---------- My Profile (every logged-in user) ----------

    /** Changes the logged-in user's own name and email. */
    public User updateProfile(User me, String fullName, String email) {
        String name = Validate.text(fullName, "Full name", 2, 100);
        String cleanEmail = Validate.email(email);
        return db.run(conn -> {
            requireEmailFree(conn, cleanEmail, me.id());
            userDao.updateNameAndEmail(conn, me.id(), name, cleanEmail);
            return userDao.findById(conn, me.id());
        });
    }

    /** Changes the logged-in user's own password. The current password must be given. */
    public void changePassword(User me, String currentPassword, String newPassword) {
        Validate.password(newPassword);
        db.run(conn -> {
            if (currentPassword == null || !checkPassword(currentPassword, userDao.findPasswordHash(conn, me.id()))) {
                throw new AppException(400, "Your current password is wrong.");
            }
            userDao.updatePasswordHash(conn, me.id(), hashPassword(newPassword));
            return null;
        });
    }

    /** Throws 409 if ANOTHER account already uses this email. */
    static void requireEmailFree(Connection conn, String email, int ownId) throws SQLException {
        User other = new UserDao().findByEmail(conn, email);
        if (other != null && other.id() != ownId) {
            throw new AppException(409, "An account with this email already exists.");
        }
    }

    /** Creates the first System Admin on the very first start, so someone can log in. */
    public void createFirstSystemAdmin(String email, String password) {
        boolean exists = db.run(conn -> userDao.existsWithRole(conn, Role.SYSTEM_ADMIN));
        if (!exists) {
            createUser("System Admin", email, password, Role.SYSTEM_ADMIN, null);
            System.out.println("Created first system admin: " + email + " / " + password);
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
