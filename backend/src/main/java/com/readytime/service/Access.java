package com.readytime.service;

import com.readytime.AppException;
import com.readytime.model.Role;
import com.readytime.model.User;

/**
 * Role-based access checks. These run on the SERVER for every request,
 * so hiding a button in the browser is never the only protection.
 */
public class Access {

    /** Throws 403 unless the user has one of the given roles. */
    public static void requireRole(User user, Role... allowed) {
        for (Role role : allowed) {
            if (user.role() == role) {
                return;
            }
        }
        throw new AppException(403, "You are not allowed to do this.");
    }

    /** A provider's data (services, hours, appointments) can only be managed by that provider. */
    public static boolean canManageProvider(User user, User provider) {
        return user.role() == Role.PROVIDER && user.id() == provider.id();
    }

    public static void requireCanManageProvider(User user, User provider) {
        if (provider == null || provider.role() != Role.PROVIDER) {
            throw new AppException(404, "Provider not found.");
        }
        if (!canManageProvider(user, provider)) {
            throw new AppException(403, "You can only manage your own services, hours and appointments.");
        }
    }
}
