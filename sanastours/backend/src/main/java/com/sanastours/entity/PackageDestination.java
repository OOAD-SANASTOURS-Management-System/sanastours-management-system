package com.sanastours.entity;
import jakarta.persistence.*;

@Entity @Table(name="PackageDestination")
public class PackageDestination {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
    @ManyToOne @JoinColumn(name="package_id", nullable=false)
    private TourPackage tourPackage;
    @ManyToOne @JoinColumn(name="destination_id", nullable=false)
    private Destination destination;
    @Column(name="day_order") private Integer dayOrder;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public TourPackage getTourPackage() { return tourPackage; }
    public void setTourPackage(TourPackage tourPackage) { this.tourPackage = tourPackage; }
    public Destination getDestination() { return destination; }
    public void setDestination(Destination destination) { this.destination = destination; }
    public Integer getDayOrder() { return dayOrder; }
    public void setDayOrder(Integer dayOrder) { this.dayOrder = dayOrder; }
}