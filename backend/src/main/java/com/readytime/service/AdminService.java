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

    public User createBusinessAdmin(User me, int businessId, String fullName, String email, String password) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        Business business = db.run(conn -> businessDao.findById(conn, businessId));
        if (business == null) {
            throw new AppException(404, "Business not found.");
        }
        return authService.createUser(fullName, email, password, Role.BUSINESS_ADMIN, businessId);
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
