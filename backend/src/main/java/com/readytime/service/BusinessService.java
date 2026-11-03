package com.readytime.service;

import com.readytime.AppException;
import com.readytime.Database;
import com.readytime.dao.BusinessDao;
import com.readytime.dao.UserDao;
import com.readytime.model.Business;
import com.readytime.model.Role;
import com.readytime.model.User;

import java.util.List;

/** Browsing businesses and providers, and business admins adding providers. */
public class BusinessService {

    private final Database db;
    private final AuthService authService;
    private final UserDao userDao = new UserDao();
    private final BusinessDao businessDao = new BusinessDao();

    public BusinessService(Database db, AuthService authService) {
        this.db = db;
        this.authService = authService;
    }

    /** System admins see every business; everyone else only sees active ones. */
    public List<Business> listBusinesses(User me) {
        boolean onlyActive = me.role() != Role.SYSTEM_ADMIN;
        return db.run(conn -> businessDao.findAll(conn, onlyActive));
    }

    /** Providers of a business. Disabled provider accounts are hidden. */
    public List<User> listProviders(int businessId) {
        return db.run(conn -> userDao.findByBusinessAndRole(conn, businessId, Role.PROVIDER)
                .stream().filter(User::active).toList());
    }

    /** A business admin adds a provider to their OWN business. */
    public User createProvider(User me, String fullName, String email, String password) {
        Access.requireRole(me, Role.BUSINESS_ADMIN);
        if (me.businessId() == null) {
            throw new AppException(400, "Your account is not linked to a business.");
        }
        return authService.createUser(fullName, email, password, Role.PROVIDER, me.businessId());
    }
}
