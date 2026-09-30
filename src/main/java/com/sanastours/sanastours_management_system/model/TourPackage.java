package com.sanastours.sanastours_management_system.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "tourpackage")
public class TourPackage {

    @Id
    @Column(name = "package_id", length = 3)
    private String packageId;

    @Column(name = "package_name", nullable = false, length = 25)
    private String packageName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    public TourPackage() {
    }

    public TourPackage(String packageId, String packageName,
                       String description, BigDecimal price,
                       Integer durationDays) {
        this.packageId = packageId;
        this.packageName = packageName;
        this.description = description;
        this.price = price;
        this.durationDays = durationDays;
    }

    public String getPackageId() {
        return packageId;
    }

    public void setPackageId(String packageId) {
        this.packageId = packageId;
    }

    public String getPackageName() {
        return packageName;
    }

    public void setPackageName(String packageName) {
        this.packageName = packageName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getDurationDays() {
        return durationDays;
    }

    public void setDurationDays(Integer durationDays) {
        this.durationDays = durationDays;
    }
}