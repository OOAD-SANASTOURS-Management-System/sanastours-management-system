package com.sanastours.util;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Small shared validation helpers.
 *
 * Added while fixing the "missing validation" defects: the project depends on
 * spring-boot-starter-validation but no DTO carried a single constraint, so
 * bad input reached the database and surfaced as a 500.
 */
public final class Validation {

    private Validation() {}

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s.]+(\\.[^@\\s.]+)+$");
    private static final Pattern PHONE = Pattern.compile("^\\+?[0-9 ()-]{7,20}$");
    private static final SecureRandom RANDOM = new SecureRandom();

    public static boolean isEmail(String value) {
        return value != null && EMAIL.matcher(value.trim()).matches();
    }

    public static boolean isPhone(String value) {
        return value != null && PHONE.matcher(value.trim()).matches();
    }

    /** Fix 3.6: a minimum standard for a password, applied on register and on driver creation. */
    public static String checkPassword(String password) {
        if (password == null || password.length() < 8) {
            return "Password must be at least 8 characters long.";
        }
        boolean letter = password.chars().anyMatch(Character::isLetter);
        boolean digit = password.chars().anyMatch(Character::isDigit);
        if (!letter || !digit) {
            return "Password must contain at least one letter and one number.";
        }
        return null;
    }

    public static String randomPassword() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder("St-");
        for (int i = 0; i < 9; i++) {
            sb.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        }
        return sb.append("1").toString();
    }

    public static boolean isPositive(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) > 0;
    }

    public static boolean isZeroOrMore(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) >= 0;
    }

    /**
     * Fix 7.1 / 7.2: travel dates must be present, in order, and not in the
     * past. Returns an error message, or null when the range is acceptable.
     */
    public static String checkTravelDates(LocalDate start, LocalDate end, boolean requirePresent, boolean mustBeFuture) {
        if (start == null || end == null) {
            return requirePresent ? "Travel start and end dates are both required." : null;
        }
        if (end.isBefore(start)) {
            return "The travel end date cannot be before the travel start date.";
        }
        if (mustBeFuture && start.isBefore(LocalDate.now())) {
            return "The travel start date cannot be in the past.";
        }
        return null;
    }

    /** Fix 7.3: traveller counts must be a sensible positive number. */
    public static String checkTravellers(Integer count) {
        if (count == null || count < 1) {
            return "Number of travellers must be at least 1.";
        }
        if (count > 100) {
            return "Number of travellers looks too high; please contact the office for groups over 100.";
        }
        return null;
    }

    /** Fix 7.13: statuses are checked against the one list the app actually uses. */
    public static boolean isOneOf(String value, List<String> allowed) {
        if (value == null) return false;
        return allowed.stream().anyMatch(a -> a.equalsIgnoreCase(value));
    }

    public static String normalizeAccountStatus(String value) {
        return "Suspended".equalsIgnoreCase(value) ? "Suspended" : "Active";
    }

    // ---- the status vocabularies, in one place (fix 4.9 / 7.13) ----

    /**
     * "Quotation Sent" replaced "Quoted" when sending a quotation became a
     * single action with its own screen. "Quoted" is still accepted so rows
     * written before the change keep working; nothing writes it any more.
     */
    public static final String INQUIRY_QUOTATION_SENT = "Quotation Sent";

    public static final List<String> INQUIRY_STATUSES =
            List.of("New", "Reviewing", INQUIRY_QUOTATION_SENT, "Quoted", "Booked", "Rejected", "Cancelled");

    /** True for either spelling of "a quotation is out with the customer". */
    public static boolean isQuotationSent(String inquiryStatus) {
        return INQUIRY_QUOTATION_SENT.equalsIgnoreCase(inquiryStatus)
                || "Quoted".equalsIgnoreCase(inquiryStatus);
    }

    public static final List<String> QUOTATION_STATUSES =
            List.of("Draft", "Sent to Customer", "Accepted", "Rejected", "Expired");

    public static final List<String> BOOKING_STATUSES =
            List.of("Pending", "Confirmed", "Ongoing", "Completed", "Cancelled");

    public static final List<String> PAYMENT_STATUSES =
            List.of("Pending", "Paid", "Partial", "Refunded", "Rejected");

    public static final List<String> TRIP_STATUSES =
            List.of("Scheduled", "Allocated", "Ongoing", "Completed", "Cancelled");

    public static final List<String> DRIVER_STATUSES =
            List.of("Available", "Assigned", "Inactive");

    public static final List<String> VEHICLE_STATUSES =
            List.of("Available", "Assigned", "Maintenance", "Inactive");

    public static final List<String> PAYMENT_METHODS =
            List.of("Bank Transfer", "Credit Card", "PayPal", "Cash");
}
