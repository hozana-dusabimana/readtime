package com.readytime.service;

import com.readytime.AppException;
import com.readytime.Database;
import com.readytime.dao.BusinessDao;
import com.readytime.dao.UserDao;
import com.readytime.model.Business;
import com.readytime.model.Role;
import com.readytime.model.User;

import java.util.List;

/** Platform management. Everything here is for the SYSTEM_ADMIN only. */
public class AdminService {

    private final Database db;
    private final AuthService authService;
    private final UserDao userDao = new UserDao();
    private final BusinessDao businessDao = new BusinessDao();

    public AdminService(Database db, AuthService authService) {
        this.db = db;
        this.authService = authService;
    }

    public List<User> listUsers(User me) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        return db.run(conn -> userDao.findAll(conn));
    }

    public Business createBusiness(User me, String name, String address) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        String cleanName = Validate.text(name, "Business name", 2, 100);
        String cleanAddress = Validate.text(address, "Address", 2, 200);
        return db.run(conn -> businessDao.findById(conn, businessDao.insert(conn, cleanName, cleanAddress)));
    }

    public void setBusinessActive(User me, int businessId, boolean active) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        db.run(conn -> {
            if (businessDao.findById(conn, businessId) == null) {
                throw new AppException(404, "Business not found.");
            }
            businessDao.setActive(conn, businessId, active);
            return null;
        });
    }

    /** Adds a service provider account to a business. */
    public User createProvider(User me, int businessId, String fullName, String email, String password) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        Business business = db.run(conn -> businessDao.findById(conn, businessId));
        if (business == null) {
            throw new AppException(404, "Business not found.");
        }
        return authService.createUser(fullName, email, password, Role.PROVIDER, businessId);
    }

    /** Edits a business's name and address. */
    public Business updateBusiness(User me, int businessId, String name, String address) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        String cleanName = Validate.text(name, "Business name", 2, 100);
        String cleanAddress = Validate.text(address, "Address", 2, 200);
        return db.run(conn -> {
            if (businessDao.findById(conn, businessId) == null) {
                throw new AppException(404, "Business not found.");
            }
            businessDao.update(conn, businessId, cleanName, cleanAddress);
            return businessDao.findById(conn, businessId);
        });
    }

    /**
     * Registers an account of any role. A service provider must belong to an existing business;
     * clients and system admins belong to no business.
     */
    public User createUser(User me, String fullName, String email, String password, String role, Integer businessId) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        Role cleanRole = parseRole(role);
        Integer business = checkBusinessForRole(cleanRole, businessId);
        return authService.createUser(fullName, email, password, cleanRole, business);
    }

    /**
     * Edits an account: name, email, business (providers only) and, if given, a new password.
     * The role of an account is fixed when it is created.
     */
    public User updateUser(User me, int userId, String fullName, String email, Integer businessId, String newPassword) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        String name = Validate.text(fullName, "Full name", 2, 100);
        String cleanEmail = Validate.email(email);
        boolean changePassword = newPassword != null && !newPassword.isEmpty();
        if (changePassword) {
            Validate.password(newPassword);
        }
        User user = db.run(conn -> userDao.findById(conn, userId));
        if (user == null) {
            throw new AppException(404, "User not found.");
        }
        Integer business = user.role() == Role.PROVIDER ? checkBusinessForRole(Role.PROVIDER, businessId) : null;
        return db.run(conn -> {
            AuthService.requireEmailFree(conn, cleanEmail, userId);
            userDao.updateNameAndEmail(conn, userId, name, cleanEmail);
            if (user.role() == Role.PROVIDER) {
                userDao.updateBusiness(conn, userId, business);
            }
            if (changePassword) {
                userDao.updatePasswordHash(conn, userId, AuthService.hashPassword(newPassword));
            }
            return userDao.findById(conn, userId);
        });
    }

    private static Role parseRole(String role) {
        try {
            return Role.valueOf(role);
        } catch (RuntimeException e) {
            throw new AppException(400, "Role must be CLIENT, PROVIDER or SYSTEM_ADMIN.");
        }
    }

    /** Providers need an existing business; every other role gets no business. */
    private Integer checkBusinessForRole(Role role, Integer businessId) {
        if (role != Role.PROVIDER) {
            return null;
        }
        if (businessId == null) {
            throw new AppException(400, "A service provider must belong to a business.");
        }
        if (db.run(conn -> businessDao.findById(conn, businessId)) == null) {
            throw new AppException(404, "Business not found.");
        }
        return businessId;
    }

    /** Lets a blocked client book again and resets their no-show count to 0. */
    public void unblockClient(User me, int userId) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        db.run(conn -> {
            User user = userDao.findById(conn, userId);
            if (user == null || user.role() != Role.CLIENT) {
                throw new AppException(404, "Client not found.");
            }
            userDao.unblock(conn, userId);
            return null;
        });
    }

    /** Disables (or re-enables) any account. A disabled user cannot log in. */
    public void setUserActive(User me, int userId, boolean active) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        if (me.id() == userId && !active) {
            throw new AppException(400, "You cannot disable your own account.");
        }
        db.run(conn -> {
            if (userDao.findById(conn, userId) == null) {
                throw new AppException(404, "User not found.");
            }
            userDao.setActive(conn, userId, active);
            return null;
        });
    }
}
