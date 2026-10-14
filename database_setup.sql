DROP DATABASE IF EXISTS sanastours_db;
CREATE DATABASE sanastours_db;
USE sanastours_db;

-- 1. USER
CREATE TABLE `user` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL,
  `account_status` varchar(20) DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. CUSTOMER
CREATE TABLE `customer` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `country` varchar(50) DEFAULT NULL,
  `account_status` varchar(20) DEFAULT 'Active',
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_customer_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. DRIVER
CREATE TABLE `driver` (
  `driver_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `driver_name` varchar(100) NOT NULL,
  `nic` varchar(20) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `license_number` varchar(50) NOT NULL,
  `license_expiry_date` date NOT NULL,
  `experience_years` int DEFAULT 0,
  `driver_status` varchar(20) DEFAULT 'Available',
  `notes` text,
  PRIMARY KEY (`driver_id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `nic` (`nic`),
  UNIQUE KEY `license_number` (`license_number`),
  CONSTRAINT `fk_driver_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. TOUR PACKAGE
CREATE TABLE `tour_package` (
  `package_id` varchar(10) NOT NULL,
  `package_name` varchar(100) NOT NULL,
  `description` text,
  `duration_days` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `package_status` varchar(20) DEFAULT 'Active',
  `image_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`package_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. DESTINATION
CREATE TABLE `destination` (
  `destination_id` varchar(10) NOT NULL,
  `destination_name` varchar(100) NOT NULL,
  `description` text,
  PRIMARY KEY (`destination_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. PACKAGE DESTINATION
CREATE TABLE `package_destination` (
  -- Fix 1.4: the PackageDestination entity uses a generated surrogate `id`;
  -- the table had a composite primary key and no `id` column. The pair is
  -- still unique, it is just no longer the primary key.
  `id` int NOT NULL AUTO_INCREMENT,
  `package_id` varchar(10) NOT NULL,
  `destination_id` varchar(10) NOT NULL,
  `day_order` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pkgdest` (`package_id`,`destination_id`),
  KEY `fk_pkgdest_destination` (`destination_id`),
  CONSTRAINT `fk_pkgdest_destination` FOREIGN KEY (`destination_id`) REFERENCES `destination` (`destination_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pkgdest_package` FOREIGN KEY (`package_id`) REFERENCES `tour_package` (`package_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. ITINERARY
CREATE TABLE `itinerary` (
  `itinerary_id` int NOT NULL AUTO_INCREMENT,
  `package_id` varchar(10) NOT NULL,
  `itinerary_name` varchar(255) NOT NULL,
  `duration_days` int NOT NULL,
  `itinerary_status` varchar(20) DEFAULT 'Active',
  PRIMARY KEY (`itinerary_id`),
  KEY `fk_itinerary_package` (`package_id`),
  CONSTRAINT `fk_itinerary_package` FOREIGN KEY (`package_id`) REFERENCES `tour_package` (`package_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. ITINERARY DAY
CREATE TABLE `itinerary_day` (
  `day_id` int NOT NULL AUTO_INCREMENT,
  `itinerary_id` int NOT NULL,
  `day_number` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `activities` text,
  PRIMARY KEY (`day_id`),
  KEY `fk_day_itinerary` (`itinerary_id`),
  CONSTRAINT `fk_day_itinerary` FOREIGN KEY (`itinerary_id`) REFERENCES `itinerary` (`itinerary_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. INQUIRY
CREATE TABLE `inquiry` (
  `inquiry_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  -- The package the customer was looking at when they enquired. The inquiry
  -- only recorded its name in `destination_area`, so the travel dates could
  -- not be checked against the package duration and the office had to work
  -- out which package to quote.
  `package_id` varchar(10) DEFAULT NULL,
  `travel_start_date` date DEFAULT NULL,
  `travel_end_date` date DEFAULT NULL,
  `number_of_travellers` int NOT NULL,
  `destination_area` varchar(255) DEFAULT NULL,
  `accommodation_requirement` varchar(255) DEFAULT NULL,
  `transportation_requirement` varchar(255) DEFAULT NULL,
  `additional_requests` text,
  -- Why the office turned the inquiry down. Kept apart from
  -- `additional_requests`, which is the customer's own words.
  `rejection_reason` text,
  `inquiry_status` varchar(20) DEFAULT 'New',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`inquiry_id`),
  KEY `fk_inquiry_customer` (`customer_id`),
  KEY `fk_inquiry_package` (`package_id`),
  CONSTRAINT `fk_inquiry_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inquiry_package` FOREIGN KEY (`package_id`) REFERENCES `tour_package` (`package_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 10. QUOTATION
CREATE TABLE `quotation` (
  `quotation_id` int NOT NULL AUTO_INCREMENT,
  `inquiry_id` int NOT NULL,
  `package_id` varchar(10) DEFAULT NULL,
  `itinerary_id` int DEFAULT NULL,
  `base_price` decimal(10,2) DEFAULT 0,
  `additional_charges` decimal(10,2) DEFAULT 0,
  `discount` decimal(10,2) DEFAULT 0,
  `total_amount` decimal(10,2) NOT NULL,
  `valid_until` date DEFAULT NULL,
  `notes` text,
  -- The covering message the office writes to the customer when sending the
  -- quotation. Kept apart from `notes`, which also carries internal trail
  -- entries such as a recorded rejection reason.
  `admin_message` text,
  `quotation_status` varchar(20) DEFAULT 'Draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`quotation_id`),
  KEY `fk_quotation_inquiry` (`inquiry_id`),
  KEY `fk_quotation_package` (`package_id`),
  KEY `fk_quotation_itinerary` (`itinerary_id`),
  CONSTRAINT `fk_quotation_inquiry` FOREIGN KEY (`inquiry_id`) REFERENCES `inquiry` (`inquiry_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_quotation_package` FOREIGN KEY (`package_id`) REFERENCES `tour_package` (`package_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_quotation_itinerary` FOREIGN KEY (`itinerary_id`) REFERENCES `itinerary` (`itinerary_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 11. VEHICLE
-- (Defined before `booking` because booking now carries an assigned vehicle.)
CREATE TABLE `vehicle` (
  `vehicle_id` int NOT NULL AUTO_INCREMENT,
  `registration_no` varchar(20) NOT NULL,
  `vehicle_type` varchar(50) NOT NULL,
  `model` varchar(50) NOT NULL,
  `capacity` int NOT NULL,
  `vehicle_status` varchar(20) NOT NULL DEFAULT 'Available',
  `notes` text,
  PRIMARY KEY (`vehicle_id`),
  UNIQUE KEY `registration_no` (`registration_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 12. BOOKING
CREATE TABLE `booking` (
  `booking_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `quotation_id` int DEFAULT NULL,
  `package_id` varchar(10) NOT NULL,
  `itinerary_id` int DEFAULT NULL,
  `travel_start_date` date DEFAULT NULL,
  `travel_end_date` date DEFAULT NULL,
  `number_of_people` int DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT NULL,
  `notes` text,
  `booking_status` varchar(50) DEFAULT 'Pending',
  -- Fix 1.1: the Booking entity maps an assigned driver, vehicle and the two
  -- trip locations; these columns were missing from the schema entirely.
  `driver_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `initial_location` varchar(255) DEFAULT NULL,
  `return_drop_off_location` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`booking_id`),
  KEY `fk_booking_customer` (`customer_id`),
  KEY `fk_booking_package` (`package_id`),
  KEY `fk_booking_quotation` (`quotation_id`),
  KEY `fk_booking_itinerary` (`itinerary_id`),
  KEY `fk_booking_driver` (`driver_id`),
  KEY `fk_booking_vehicle` (`vehicle_id`),
  CONSTRAINT `fk_booking_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_package` FOREIGN KEY (`package_id`) REFERENCES `tour_package` (`package_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotation` (`quotation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_itinerary` FOREIGN KEY (`itinerary_id`) REFERENCES `itinerary` (`itinerary_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`driver_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle` (`vehicle_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 13. TRIP
CREATE TABLE `trip` (
  `trip_id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `vehicle_id` int NOT NULL,
  `driver_id` int NOT NULL,
  -- Fix 5.3: the Trip entity maps departure_datetime as NOT NULL, and trip
  -- allocation requires both datetimes, so the schema now agrees.
  `departure_datetime` datetime NOT NULL,
  `return_datetime` datetime NOT NULL,
  `pickup_location` varchar(100) DEFAULT NULL,
  `dropoff_location` varchar(100) DEFAULT NULL,
  `trip_status` varchar(20) NOT NULL DEFAULT 'Scheduled',
  PRIMARY KEY (`trip_id`),
  UNIQUE KEY `booking_id` (`booking_id`),
  KEY `fk_trip_vehicle` (`vehicle_id`),
  KEY `fk_trip_driver` (`driver_id`),
  CONSTRAINT `fk_trip_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_trip_driver` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`driver_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_trip_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle` (`vehicle_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 14. PAYMENT
CREATE TABLE `payment` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_date` date DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `payment_status` varchar(20) DEFAULT 'Pending',
  -- Fix 1.2: the Payment entity maps paymentMethod; the column was missing.
  `payment_method` varchar(50) DEFAULT NULL,
  `notes` text,
  -- Why the office rejected this payment. Shown to the customer.
  `rejection_reason` text,
  PRIMARY KEY (`payment_id`),
  KEY `fk_payment_booking` (`booking_id`),
  CONSTRAINT `fk_payment_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 14b. PAYMENT SLIP
-- The bank slip evidencing a payment. A table of its own so that listing
-- payments never loads the stored PDFs.
CREATE TABLE `payment_slip` (
  `slip_id` int NOT NULL AUTO_INCREMENT,
  `payment_id` int NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `content_type` varchar(100) NOT NULL DEFAULT 'application/pdf',
  `file_size` int DEFAULT NULL,
  `uploaded_at` datetime DEFAULT NULL,
  `content` longblob NOT NULL,
  PRIMARY KEY (`slip_id`),
  UNIQUE KEY `uq_slip_payment` (`payment_id`),
  CONSTRAINT `fk_slip_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment` (`payment_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 15. FEEDBACK
CREATE TABLE `feedback` (
  `feedback_id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `rating` int DEFAULT NULL,
  `review_text` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  UNIQUE KEY `booking_id` (`booking_id`),
  CONSTRAINT `fk_feedback_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 16. TRIP UPDATE
-- Fix 1.3: the TripUpdate entity maps to `trip_update`, which did not exist.
CREATE TABLE `trip_update` (
  `update_id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `step_name` varchar(50) NOT NULL,
  `update_time` datetime DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `driver_note` text,
  PRIMARY KEY (`update_id`),
  KEY `fk_tripupdate_booking` (`booking_id`),
  -- Fix 5.10: a step can only be logged once per booking.
  UNIQUE KEY `uq_tripupdate_booking_step` (`booking_id`,`step_name`),
  CONSTRAINT `fk_tripupdate_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ==========================================
-- SAMPLE DATA
-- ==========================================

INSERT INTO user (username, email, password_hash, role, account_status) VALUES 
('sarah_smith', 'sarah@email.com', '$2a$10$xtuU2.yrByhYzkEfGgfy8ON6N/E5TpQSpTkjVo2mjElZC7T9ljERO', 'CUSTOMER', 'ACTIVE'),
('mike_jones', 'mike@email.com', '$2a$10$xtuU2.yrByhYzkEfGgfy8ON6N/E5TpQSpTkjVo2mjElZC7T9ljERO', 'CUSTOMER', 'ACTIVE'),
('admin', 'admin@sanastours.com', '$2a$10$xtuU2.yrByhYzkEfGgfy8ON6N/E5TpQSpTkjVo2mjElZC7T9ljERO', 'ADMIN', 'ACTIVE'),
('nimal', 'nimal@sanastours.com', '$2a$10$xtuU2.yrByhYzkEfGgfy8ON6N/E5TpQSpTkjVo2mjElZC7T9ljERO', 'DRIVER', 'ACTIVE');

INSERT INTO customer (user_id, first_name, last_name, phone, address, country, account_status) VALUES 
(1, 'Sarah', 'Smith', '+447700900111', 'London, UK', 'United Kingdom', 'Active'),
(2, 'Mike', 'Jones', '+12025550199', 'New York, USA', 'United States', 'Active');

INSERT INTO driver (user_id, driver_name, nic, phone, license_number, license_expiry_date, experience_years, driver_status) VALUES 
(4, 'Nimal Perera', '851234567v', '0771234567', 'B1234567', '2028-05-20', 8, 'Available');

INSERT INTO tour_package (package_id, package_name, description, duration_days, price, package_status) VALUES 
('TP-001', 'Sri Lanka Highlights', 'Explore the highlights of Sri Lanka', 5, 700.00, 'Active');

INSERT INTO itinerary (package_id, itinerary_name, duration_days, itinerary_status) VALUES 
('TP-001', 'Sri Lanka Highlights Itinerary', 5, 'Active');

INSERT INTO itinerary_day (itinerary_id, day_number, title, location, activities) VALUES 
(1, 1, 'Arrival and Colombo', 'Colombo', 'Airport pickup, hotel check-in, city tour.'),
(1, 2, 'Colombo to Sigiriya', 'Sigiriya', 'Travel to Sigiriya, visit Sigiriya Rock Fortress.');

-- The travel dates run start + (duration - 1): a 5-day package starting on
-- the 15th ends on the 19th, which is what the booking below records.
INSERT INTO inquiry (customer_id, package_id, travel_start_date, travel_end_date, number_of_travellers, destination_area, accommodation_requirement, transportation_requirement, inquiry_status) VALUES
(1, 'TP-001', '2027-09-15', '2027-09-19', 4, 'Sri Lanka Highlights', '4-Star Hotel', 'Private Van', 'Quotation Sent');

-- Fix 4.9: use the same status vocabulary the application writes
-- ('Sent to Customer'), not the old 'Sent'.
INSERT INTO quotation (inquiry_id, package_id, itinerary_id, base_price, additional_charges, discount, total_amount, valid_until, notes, admin_message, quotation_status) VALUES
(1, 'TP-001', 1, 700.00, 50.00, 0.00, 750.00, '2027-10-15', 'Special transportation',
 'Thank you for your enquiry. The price below includes the private van and 4-star accommodation you asked for. Do let us know if you would like anything adjusted.',
 'Sent to Customer');

INSERT INTO vehicle (registration_no, vehicle_type, model, capacity, vehicle_status) VALUES
('PF-3293', 'Van', 'Toyota Hiace', 10, 'Available');

INSERT INTO booking (customer_id, quotation_id, package_id, itinerary_id, travel_start_date, travel_end_date, number_of_people, total_amount, booking_status, driver_id, vehicle_id, initial_location, return_drop_off_location) VALUES
(1, 1, 'TP-001', 1, '2027-09-15', '2027-09-19', 4, 750.00, 'Confirmed', 1, 1, 'Bandaranaike International Airport', 'Colombo City Hotel');
