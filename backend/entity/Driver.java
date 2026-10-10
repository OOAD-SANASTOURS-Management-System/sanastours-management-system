package com.sanastours.entity;
import jakarta.persistence.*;

@Entity
@Table(name = "driver")
public class Driver {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer driverId;
    @OneToOne @JoinColumn(name = "user_id", nullable = false) private User user;
    private String driverName;
    private String nic;
    private String phone;
    private String licenseNumber;
    private java.time.LocalDate licenseExpiryDate;
    private Integer experienceYears;
    private String driverStatus;
    private String notes;

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
    public java.time.LocalDate getLicenseExpiryDate() { return licenseExpiryDate; }
    public void setLicenseExpiryDate(java.time.LocalDate licenseExpiryDate) { this.licenseExpiryDate = licenseExpiryDate; }
    public Integer getExperienceYears() { return experienceYears; }
    public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }
    public String getDriverStatus() { return driverStatus; }
    public void setDriverStatus(String driverStatus) { this.driverStatus = driverStatus; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
