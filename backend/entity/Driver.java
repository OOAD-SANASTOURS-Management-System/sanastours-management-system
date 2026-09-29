package com.sanastours.entity;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity @Table(name="Driver")
public class Driver {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="driver_id") private Integer driverId;
    @OneToOne @JoinColumn(name="user_id", referencedColumnName="user_id", nullable=false, unique=true)
    private User user;
    @Column(name="driver_name", nullable=false) private String driverName;
    @Column(nullable=false, unique=true) private String nic;
    @Column(nullable=false) private String phone;
    @Column(name="license_number", nullable=false, unique=true) private String licenseNumber;
    @Column(name="license_expiry_date", nullable=false) private LocalDate licenseExpiryDate;
    @Column(name="driver_status", nullable=false) private String driverStatus = "Active";

    public Integer getDriverId() { return driverId; }
    public void setDriverId(Integer driverId) { this.driverId = driverId; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }
    public String getNic() { return nic; }
    public void setNic(String nic) { this.nic = nic; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }
    public LocalDate getLicenseExpiryDate() { return licenseExpiryDate; }
    public void setLicenseExpiryDate(LocalDate licenseExpiryDate) { this.licenseExpiryDate = licenseExpiryDate; }
    public String getDriverStatus() { return driverStatus; }
    public void setDriverStatus(String driverStatus) { this.driverStatus = driverStatus; }
}