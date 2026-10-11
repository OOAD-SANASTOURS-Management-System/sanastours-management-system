package com.sanastours.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @org.springframework.beans.factory.annotation.Autowired
    private JwtFilter jwtFilter;

    /**
     * Fix: CORS used to allow every origin, method and header. The allowed
     * origins are now an explicit list, overridable with the
     * app.cors.allowed-origins property for deployment.
     */
    @Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://localhost:3000}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // The API is stateless; it authenticates from the bearer token on
            // every request and should not be creating sessions.
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/error").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // ---- Packages & Destinations: public to read, staff to change ----
                .requestMatchers(HttpMethod.GET, "/api/packages", "/api/packages/**", "/api/destinations", "/api/destinations/**").permitAll()
                .requestMatchers("/api/packages", "/api/packages/**", "/api/destinations", "/api/destinations/**").hasAnyRole("ADMIN", "COORDINATOR")

                // ---- Itineraries ----
                // Fix 2.2: no rule matched /api/itineraries at all, so it fell
                // through to anyRequest().authenticated() and any logged-in
                // customer or driver could create, edit and DELETE itineraries.
                .requestMatchers(HttpMethod.GET, "/api/itineraries", "/api/itineraries/**").hasAnyRole("CUSTOMER", "DRIVER", "ADMIN", "COORDINATOR")
                .requestMatchers("/api/itineraries", "/api/itineraries/**").hasAnyRole("ADMIN", "COORDINATOR")

                // ---- Quotations ----
                .requestMatchers(HttpMethod.GET, "/api/quotations", "/api/quotations/**").hasAnyRole("CUSTOMER", "ADMIN", "COORDINATOR")
                // Fix 2.7: the customer's "Reject Quotation" button had no
                // endpoint it was allowed to call. This narrow one only lets
                // them respond to their own quotation.
                .requestMatchers(HttpMethod.PUT, "/api/quotations/*/respond").hasAnyRole("CUSTOMER", "ADMIN", "COORDINATOR")
                .requestMatchers("/api/quotations", "/api/quotations/**").hasAnyRole("ADMIN", "COORDINATOR")

                // ---- Inquiries ----
                .requestMatchers(HttpMethod.POST, "/api/inquiries").hasAnyRole("CUSTOMER", "ADMIN", "COORDINATOR")
                .requestMatchers(HttpMethod.GET, "/api/inquiries", "/api/inquiries/**").hasAnyRole("CUSTOMER", "ADMIN", "COORDINATOR")
                // Fix 2.8: a customer may edit their own inquiry while it is
                // still New; the controller enforces ownership and status.
                .requestMatchers(HttpMethod.PUT, "/api/inquiries/*").hasAnyRole("CUSTOMER", "ADMIN", "COORDINATOR")
                .requestMatchers("/api/inquiries/**").hasAnyRole("ADMIN", "COORDINATOR")

                // ---- Bookings ----
                .requestMatchers(HttpMethod.POST, "/api/bookings/convert").hasAnyRole("CUSTOMER", "ADMIN", "COORDINATOR")
                .requestMatchers(HttpMethod.GET, "/api/bookings", "/api/bookings/**").hasAnyRole("CUSTOMER", "ADMIN", "COORDINATOR", "DRIVER")
                // Fix 2.6 and 2.4: customers cancel and drivers progress a tour
                // through this narrow status endpoint. A full booking update is
                // staff-only, so a driver can no longer rewrite the customer,
                // package, dates or amount of any booking in the system.
                .requestMatchers(HttpMethod.PUT, "/api/bookings/*/status").hasAnyRole("CUSTOMER", "DRIVER", "ADMIN", "COORDINATOR")
                .requestMatchers("/api/bookings", "/api/bookings/**").hasAnyRole("ADMIN", "COORDINATOR")

                // ---- Payments ----
                .requestMatchers(HttpMethod.POST, "/api/payments").hasAnyRole("CUSTOMER", "ADMIN", "COORDINATOR")
                .requestMatchers(HttpMethod.GET, "/api/payments", "/api/payments/**").hasAnyRole("CUSTOMER", "ADMIN", "COORDINATOR")
                .requestMatchers("/api/payments/**").hasAnyRole("ADMIN", "COORDINATOR")

                // ---- Trips ----
                .requestMatchers(HttpMethod.GET, "/api/trips").hasAnyRole("DRIVER", "ADMIN", "COORDINATOR")
                // A driver may read their own trips; the controller checks that
                // the driverId in the path is theirs.
                .requestMatchers(HttpMethod.GET, "/api/trips/driver/*").hasAnyRole("DRIVER", "ADMIN", "COORDINATOR")
                .requestMatchers(HttpMethod.PUT, "/api/trips/*/status").hasAnyRole("DRIVER", "ADMIN", "COORDINATOR")
                .requestMatchers("/api/trips/**").hasAnyRole("ADMIN", "COORDINATOR")

                // ---- Trip updates ----
                // Fix 2.3: nothing matched /api/trip-updates either, so any
                // logged-in user could post fake progress against any booking.
                .requestMatchers(HttpMethod.GET, "/api/trip-updates/recent").hasAnyRole("ADMIN", "COORDINATOR")
                .requestMatchers(HttpMethod.GET, "/api/trip-updates/**").hasAnyRole("CUSTOMER", "DRIVER", "ADMIN", "COORDINATOR")
                .requestMatchers(HttpMethod.POST, "/api/trip-updates").hasAnyRole("DRIVER", "ADMIN", "COORDINATOR")
                .requestMatchers("/api/trip-updates/**").hasAnyRole("ADMIN", "COORDINATOR")

                // ---- Feedback ----
                .requestMatchers(HttpMethod.POST, "/api/feedback").hasAnyRole("CUSTOMER", "ADMIN", "COORDINATOR")
                // Fix 5.6: a customer can now read back their own feedback; the
                // controller filters the list to their own bookings.
                .requestMatchers(HttpMethod.GET, "/api/feedback", "/api/feedback/**").hasAnyRole("CUSTOMER", "ADMIN", "COORDINATOR")
                .requestMatchers("/api/feedback/**").hasAnyRole("ADMIN", "COORDINATOR")

                // ---- Drivers / Vehicles / Customers ----
                .requestMatchers(HttpMethod.GET, "/api/drivers/me").hasAnyRole("DRIVER", "ADMIN")
                .requestMatchers("/api/drivers", "/api/drivers/**", "/api/vehicles", "/api/vehicles/**").hasAnyRole("ADMIN", "COORDINATOR")
                // Fix 2.1: a customer keeps access to /api/customers/{id} for
                // their own profile only - CustomerController now checks that -
                // while the list and the delete are staff-only in both layers.
                .requestMatchers(HttpMethod.GET, "/api/customers").hasAnyRole("ADMIN", "COORDINATOR")
                .requestMatchers(HttpMethod.DELETE, "/api/customers/**").hasAnyRole("ADMIN", "COORDINATOR")
                .requestMatchers(HttpMethod.POST, "/api/customers").hasAnyRole("ADMIN", "COORDINATOR")
                .requestMatchers(HttpMethod.GET, "/api/customers/*").hasAnyRole("CUSTOMER", "ADMIN", "COORDINATOR")
                .requestMatchers(HttpMethod.PUT, "/api/customers/*").hasAnyRole("CUSTOMER", "ADMIN", "COORDINATOR")
                .requestMatchers("/api/customers/**").hasAnyRole("ADMIN", "COORDINATOR")

                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
