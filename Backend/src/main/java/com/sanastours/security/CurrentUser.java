package com.sanastours.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Reads the authenticated caller out of the security context.
 *
 * Added while fixing the access-control defects: the controllers each repeated
 * the same long SecurityContextHolder expression, and the one place that forgot
 * to (CustomerController) was the hole that let any customer read, edit and
 * delete every other customer.
 */
@Component
public class CurrentUser {

    private Authentication auth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    public boolean isAuthenticated() {
        Authentication a = auth();
        return a != null && a.isAuthenticated();
    }

    public boolean hasRole(String role) {
        Authentication a = auth();
        if (a == null) return false;
        return a.getAuthorities().stream().anyMatch(x -> x.getAuthority().equals("ROLE_" + role));
    }

    public boolean isCustomer() { return hasRole("CUSTOMER"); }

    public boolean isDriver() { return hasRole("DRIVER"); }

    public boolean isStaff() { return hasRole("ADMIN") || hasRole("COORDINATOR"); }

    /**
     * The caller's customer_id or driver_id, as put into the JWT at login.
     * Null for a caller with no such profile.
     */
    public Integer roleId() {
        Authentication a = auth();
        if (a == null) return null;
        Object details = a.getDetails();
        return (details instanceof Integer) ? (Integer) details : null;
    }

    public String username() {
        Authentication a = auth();
        return a == null ? null : String.valueOf(a.getPrincipal());
    }

    /** True when this customer owns the record identified by customerId. */
    public boolean ownsCustomer(Integer customerId) {
        Integer mine = roleId();
        return mine != null && mine.equals(customerId);
    }

    /** True when this driver is the driver identified by driverId. */
    public boolean ownsDriver(Integer driverId) {
        Integer mine = roleId();
        return mine != null && mine.equals(driverId);
    }
}
