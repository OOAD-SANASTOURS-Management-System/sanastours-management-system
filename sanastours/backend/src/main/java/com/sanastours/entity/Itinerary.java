package com.sanastours.entity;
import jakarta.persistence.*;

@Entity
@Table(name = "itinerary")
public class Itinerary {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer itineraryId;
    @ManyToOne @JoinColumn(name = "package_id", nullable = false) private TourPackage tourPackage;
    private String itineraryName;
    private Integer durationDays;
    private String itineraryStatus;

    public Integer getItineraryId() { return itineraryId; }
    public void setItineraryId(Integer itineraryId) { this.itineraryId = itineraryId; }
    public TourPackage getTourPackage() { return tourPackage; }
    public void setTourPackage(TourPackage tourPackage) { this.tourPackage = tourPackage; }
    public String getItineraryName() { return itineraryName; }
    public void setItineraryName(String itineraryName) { this.itineraryName = itineraryName; }
    public Integer getDurationDays() { return durationDays; }
    public void setDurationDays(Integer durationDays) { this.durationDays = durationDays; }
    public String getItineraryStatus() { return itineraryStatus; }
    public void setItineraryStatus(String itineraryStatus) { this.itineraryStatus = itineraryStatus; }
}
