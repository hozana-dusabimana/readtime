package com.readytime.service;

import com.readytime.AppException;
import com.readytime.model.Business;
import com.readytime.model.Role;
import com.readytime.model.User;
import com.readytime.repository.BusinessRepository;
import com.readytime.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Platform management. Everything here is for the SYSTEM_ADMIN only. */
@Service
public class AdminService {

    private final AuthService authService;
    private final UserRepository userRepo;
    private final BusinessRepository businessRepo;

    public AdminService(AuthService authService, UserRepository userRepo, BusinessRepository businessRepo) {
        this.authService = authService;
        this.userRepo = userRepo;
        this.businessRepo = businessRepo;
    }

    public List<User> listUsers(User me) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        return userRepo.findAll();
    }

    @Transactional
    public Business createBusiness(User me, String name, String address) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        String cleanName = Validate.text(name, "Business name", 2, 100);
        String cleanAddress = Validate.text(address, "Address", 2, 200);
        return businessRepo.findById(businessRepo.insert(cleanName, cleanAddress));
    }

    @Transactional
    public void setBusinessActive(User me, int businessId, boolean active) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        requireBusiness(businessId);
        businessRepo.setActive(businessId, active);
    }

    /** Adds a service provider account to a business. */
    @Transactional
    public User createProvider(User me, int businessId, String fullName, String email, String password) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        requireBusiness(businessId);
        return authService.createUser(fullName, email, password, Role.PROVIDER, businessId);
    }

    /** Edits a business's name and address. */
    @Transactional
    public Business updateBusiness(User me, int businessId, String name, String address) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        String cleanName = Validate.text(name, "Business name", 2, 100);
        String cleanAddress = Validate.text(address, "Address", 2, 200);
        requireBusiness(businessId);
        businessRepo.update(businessId, cleanName, cleanAddress);
        return businessRepo.findById(businessId);
    }

    /**
     * Registers an account of any role. A service provider must belong to an existing business;
     * clients and system admins belong to no business.
     */
    @Transactional
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
    @Transactional
    public User updateUser(User me, int userId, String fullName, String email, Integer businessId, String newPassword) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        String name = Validate.text(fullName, "Full name", 2, 100);
        String cleanEmail = Validate.email(email);
        boolean changePassword = newPassword != null && !newPassword.isEmpty();
        if (changePassword) {
            Validate.password(newPassword);
        }
        User user = userRepo.findById(userId);
        if (user == null) {
            throw new AppException(404, "User not found.");
        }
        Integer business = user.role() == Role.PROVIDER ? checkBusinessForRole(Role.PROVIDER, businessId) : null;
        authService.requireEmailFree(cleanEmail, userId);
        userRepo.updateNameAndEmail(userId, name, cleanEmail);
        if (user.role() == Role.PROVIDER) {
            userRepo.updateBusiness(userId, business);
        }
        if (changePassword) {
            userRepo.updatePasswordHash(userId, AuthService.hashPassword(newPassword));
        }
        return userRepo.findById(userId);
    }

    /** Lets a blocked client book again and resets their no-show count to 0. */
    @Transactional
    public void unblockClient(User me, int userId) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        User user = userRepo.findById(userId);
        if (user == null || user.role() != Role.CLIENT) {
            throw new AppException(404, "Client not found.");
        }
        userRepo.unblock(userId);
    }

    /** Disables (or re-enables) any account. A disabled user cannot log in. */
    @Transactional
    public void setUserActive(User me, int userId, boolean active) {
        Access.requireRole(me, Role.SYSTEM_ADMIN);
        if (me.id() == userId && !active) {
            throw new AppException(400, "You cannot disable your own account.");
        }
        if (userRepo.findById(userId) == null) {
            throw new AppException(404, "User not found.");
        }
        userRepo.setActive(userId, active);
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
        requireBusiness(businessId);
        return businessId;
    }

    private void requireBusiness(int businessId) {
        if (businessRepo.findById(businessId) == null) {
            throw new AppException(404, "Business not found.");
        }
    }
}
