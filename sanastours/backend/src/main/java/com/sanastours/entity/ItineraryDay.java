package com.sanastours.entity;
import jakarta.persistence.*;

@Entity
@Table(name = "itinerary_day")
public class ItineraryDay {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer dayId;
    @ManyToOne @JoinColumn(name = "itinerary_id", nullable = false) private Itinerary itinerary;
    private Integer dayNumber;
    private String title;
    private String location;
    private String activities;

    public Integer getDayId() { return dayId; }
    public void setDayId(Integer dayId) { this.dayId = dayId; }
    public Itinerary getItinerary() { return itinerary; }
    public void setItinerary(Itinerary itinerary) { this.itinerary = itinerary; }
    public Integer getDayNumber() { return dayNumber; }
    public void setDayNumber(Integer dayNumber) { this.dayNumber = dayNumber; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getActivities() { return activities; }
    public void setActivities(String activities) { this.activities = activities; }
}
