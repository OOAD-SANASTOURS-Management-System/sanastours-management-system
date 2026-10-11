package com.sanastours.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.validateToken(token)) {
                String username = jwtUtil.extractClaims(token).getSubject();
                String role = jwtUtil.extractClaims(token).get("role", String.class);
                Integer roleId = jwtUtil.extractClaims(token).get("roleId", Integer.class);

                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        username, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role)));
                auth.setDetails(roleId);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } else {
                // Fix 3.12: an expired or tampered token used to be ignored in
                // silence, so the request carried on as anonymous and came back
                // as a generic 403. The browser could not tell "your session has
                // expired" from "you are not allowed to do that", which is why a
                // stale session showed empty tables instead of the login screen
                // (fix 3.9). Say 401 and stop here.
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Your session has expired. Please sign in again.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
