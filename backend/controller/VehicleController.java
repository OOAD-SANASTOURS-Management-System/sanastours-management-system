package com.sanastours.controller;

import com.sanastours.entity.Vehicle;
import com.sanastours.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@CrossOrigin(origins = "http://localhost:5173")
public class VehicleController {

    @Autowired
    private VehicleRepository vehicleRepository;

    @GetMapping
    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    @PostMapping
    public Vehicle addVehicle(@RequestBody Vehicle vehicle) {
        return vehicleRepository.save(vehicle);
    }
}
