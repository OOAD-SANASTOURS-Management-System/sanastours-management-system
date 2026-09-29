package com.sanastours.entity;
import jakarta.persistence.*;

@Entity @Table(name="User")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="user_id") private Integer userId;
    @Column(nullable=false, unique=true) private String username;
    @Column(nullable=false, unique=true) private String email;
    @Column(name="password_hash", nullable=false) private String passwordHash;
    @Column(nullable=false) private String role;
    @Column(name="account_status") private String accountStatus = "ACTIVE";

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getAccountStatus() { return accountStatus; }
    public void setAccountStatus(String accountStatus) { this.accountStatus = accountStatus; }
}