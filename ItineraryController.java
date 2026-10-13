package com.sanastours.sanastoursbackendnew.controller;

import com.sanastours.sanastoursbackendnew.model.Itinerary;
import com.sanastours.sanastoursbackendnew.service.ItineraryService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/itineraries")
@CrossOrigin(origins = "*")
public class ItineraryController {

    private final ItineraryService itineraryService;

    public ItineraryController(
            ItineraryService itineraryService) {

        this.itineraryService = itineraryService;
    }

    @PostMapping
    public Itinerary createItinerary(
            @RequestBody Itinerary itinerary) {

        return itineraryService
                .createItinerary(itinerary);
    }

    @GetMapping
    public List<Itinerary> getAllItineraries() {

        return itineraryService
                .getAllItineraries();
    }

    @GetMapping("/{itineraryId}")
    public ResponseEntity<Itinerary> getItineraryById(
            @PathVariable String itineraryId) {

        return itineraryService
                .getItineraryById(itineraryId)
                .map(ResponseEntity::ok)
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build());
    }

    @GetMapping("/package/{packageId}")
    public List<Itinerary> getByPackageId(
            @PathVariable String packageId) {

        return itineraryService
                .getItinerariesByPackageId(packageId);
    }

    @GetMapping("/status/{status}")
    public List<Itinerary> getByStatus(
            @PathVariable
            Itinerary.ItineraryStatus status) {

        return itineraryService
                .getItinerariesByStatus(status);
    }

    @PutMapping("/{itineraryId}")
    public ResponseEntity<Itinerary> updateItinerary(
            @PathVariable String itineraryId,
            @RequestBody Itinerary itinerary) {

        try {

            Itinerary updated =
                    itineraryService
                            .updateItinerary(
                                    itineraryId,
                                    itinerary);

            return ResponseEntity.ok(updated);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .notFound()
                    .build();
        }
    }

    @DeleteMapping("/{itineraryId}")
    public ResponseEntity<Void> deleteItinerary(
            @PathVariable String itineraryId) {

        try {

            itineraryService
                    .deleteItinerary(itineraryId);

            return ResponseEntity
                    .noContent()
                    .build();

        } catch (RuntimeException e) {

            return ResponseEntity
                    .notFound()
                    .build();
        }
    }
}