package com.readytime.service;

import com.readytime.Database;
import com.readytime.dao.BusinessDao;
import com.readytime.dao.UserDao;
import com.readytime.model.Business;
import com.readytime.model.Role;
import com.readytime.model.User;

import java.util.List;

/** Browsing businesses and their service providers. */
public class BusinessService {

    private final Database db;
    private final UserDao userDao = new UserDao();
    private final BusinessDao businessDao = new BusinessDao();

    public BusinessService(Database db) {
        this.db = db;
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
}
