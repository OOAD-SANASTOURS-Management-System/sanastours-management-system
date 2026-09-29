package com.sanastours.entity;
import jakarta.persistence.*;

@Entity @Table(name="Customer")
public class Customer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="customer_id") private Integer customerId;
    @OneToOne @JoinColumn(name="user_id", referencedColumnName="user_id", nullable=false, unique=true)
    private User user;
    @Column(name="first_name", nullable=false) private String firstName;
    @Column(name="last_name", nullable=false) private String lastName;
    private String phone;
    private String address;
    private String country;

    public Integer getCustomerId() { return customerId; }
    public void setCustomerId(Integer customerId) { this.customerId = customerId; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
}