package com.sanastours.entity;
import jakarta.persistence.*;

@Entity @Table(name="Destination")
public class Destination {
    // Fix 1.4: lengths now match the schema (varchar(10) / varchar(100)).
    @Id @Column(name="destination_id", length=10) private String destinationId;
    @Column(name="destination_name", length=100) private String destinationName;
    private String description;

    public String getDestinationId() { return destinationId; }
    public void setDestinationId(String destinationId) { this.destinationId = destinationId; }
    public String getDestinationName() { return destinationName; }
    public void setDestinationName(String destinationName) { this.destinationName = destinationName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}