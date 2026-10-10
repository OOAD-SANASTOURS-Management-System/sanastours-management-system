package com.sanastours.sanastoursbackendnew.controller;

import com.sanastours.sanastoursbackendnew.model.ItineraryDay;
import com.sanastours.sanastoursbackendnew.service.ItineraryDayService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/itinerary-days")
@CrossOrigin(origins = "*")
public class ItineraryDayController {

    private final ItineraryDayService itineraryDayService;

    public ItineraryDayController(
            ItineraryDayService itineraryDayService) {

        this.itineraryDayService =
                itineraryDayService;
    }

    @PostMapping
    public ItineraryDay createItineraryDay(
            @RequestBody ItineraryDay itineraryDay) {

        return itineraryDayService
                .createItineraryDay(itineraryDay);
    }

    @GetMapping
    public List<ItineraryDay> getAllItineraryDays() {

        return itineraryDayService
                .getAllItineraryDays();
    }

    @GetMapping("/{itineraryDayId}")
    public ResponseEntity<ItineraryDay>
    getItineraryDayById(
            @PathVariable Long itineraryDayId) {

        return itineraryDayService
                .getItineraryDayById(itineraryDayId)
                .map(ResponseEntity::ok)
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build());
    }

    @GetMapping("/itinerary/{itineraryId}")
    public List<ItineraryDay> getDaysByItinerary(
            @PathVariable String itineraryId) {

        return itineraryDayService
                .getDaysByItineraryId(itineraryId);
    }

    @PutMapping("/{itineraryDayId}")
    public ResponseEntity<ItineraryDay>
    updateItineraryDay(
            @PathVariable Long itineraryDayId,
            @RequestBody ItineraryDay itineraryDay) {

        try {

            ItineraryDay updated =
                    itineraryDayService
                            .updateItineraryDay(
                                    itineraryDayId,
                                    itineraryDay);

            return ResponseEntity.ok(updated);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .notFound()
                    .build();
        }
    }

    @DeleteMapping("/{itineraryDayId}")
    public ResponseEntity<Void> deleteItineraryDay(
            @PathVariable Long itineraryDayId) {

        try {

            itineraryDayService
                    .deleteItineraryDay(itineraryDayId);

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