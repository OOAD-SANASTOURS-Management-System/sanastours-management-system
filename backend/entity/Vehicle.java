package com.sanastours.entity;
import jakarta.persistence.*;

@Entity @Table(name="Vehicle")
public class Vehicle {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="vehicle_id") private Integer vehicleId;
    @Column(name="registration_no", nullable=false, unique=true) private String registrationNo;
    @Column(nullable=false) private String brand;
    @Column(nullable=false) private String model;
    @Column(name="vehicle_type", nullable=false) private String vehicleType;
    @Column(nullable=false) private Integer capacity;
    @Column(name="vehicle_status", nullable=false) private String vehicleStatus = "Available";

    public Integer getVehicleId() { return vehicleId; }
    public void setVehicleId(Integer vehicleId) { this.vehicleId = vehicleId; }
    public String getRegistrationNo() { return registrationNo; }
    public void setRegistrationNo(String registrationNo) { this.registrationNo = registrationNo; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public String getVehicleStatus() { return vehicleStatus; }
    public void setVehicleStatus(String vehicleStatus) { this.vehicleStatus = vehicleStatus; }
}