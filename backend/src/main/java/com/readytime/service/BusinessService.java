package com.readytime.service;

import com.readytime.model.Business;
import com.readytime.model.Role;
import com.readytime.model.User;
import com.readytime.repository.BusinessRepository;
import com.readytime.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/** Browsing businesses and their service providers. */
@Service
public class BusinessService {

    private final UserRepository userRepo;
    private final BusinessRepository businessRepo;

    public BusinessService(UserRepository userRepo, BusinessRepository businessRepo) {
        this.userRepo = userRepo;
        this.businessRepo = businessRepo;
    }

    /** System admins see every business; everyone else only sees active ones. */
    public List<Business> listBusinesses(User me) {
        return businessRepo.findAll(me.role() != Role.SYSTEM_ADMIN);
    }

    /** Providers of a business. Disabled provider accounts are hidden. */
    public List<User> listProviders(int businessId) {
        return userRepo.findByBusinessAndRole(businessId, Role.PROVIDER).stream().filter(User::active).toList();
    }
}
