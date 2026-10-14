package com.sanastours.dto;

public class AuthResponse {
    private String token;
    private String role;
    private Integer roleId; // Customer ID, Driver ID, etc.
    private String username;

    public AuthResponse(String token, String role, Integer roleId, String username) {
        this.token = token;
        this.role = role;
        this.roleId = roleId;
        this.username = username;
    }

    public String getToken() { return token; }
    public String getRole() { return role; }
    public Integer getRoleId() { return roleId; }
    public String getUsername() { return username; }
}
