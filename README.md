# SANAS TOURS — Member 3: Booking, Driver, Vehicle, Trip

Web-Based Tour Booking and Operations Management System, built for SANAS TOURS (PVT) LTD.

**Module:** SE2012 — Object Oriented Design and Analysis  
**Group:** 31  
**Member:** Rajakaruna R.P.D.I (IT25104073)  
**Component:** Booking, Driver, Vehicle, Trip

---

## What is in this repository

This repository holds the shared project core plus the files this member was responsible for. The shared core is the application shell every component needs in order to run: the Spring Boot entry point, validation utility, build files, the React shell and layouts, the reusable table and status components, the API wrapper, the two dashboards, and the database script.

### Files owned by Member 3

| Layer | Files |
| :--- | :--- |
| **Backend Entities** | `backend/src/main/java/com/sanastours/entity/Booking.java`<br>`backend/src/main/java/com/sanastours/entity/Driver.java`<br>`backend/src/main/java/com/sanastours/entity/Vehicle.java`<br>`backend/src/main/java/com/sanastours/entity/Trip.java`<br>`backend/src/main/java/com/sanastours/entity/TripUpdate.java` |
| **Backend Controllers** | `backend/src/main/java/com/sanastours/controller/BookingController.java`<br>`backend/src/main/java/com/sanastours/controller/DriverController.java`<br>`backend/src/main/java/com/sanastours/controller/VehicleController.java`<br>`backend/src/main/java/com/sanastours/controller/TripController.java`<br>`backend/src/main/java/com/sanastours/controller/TripUpdateController.java` |
| **Backend Repositories** | `backend/src/main/java/com/sanastours/repository/BookingRepository.java`<br>`backend/src/main/java/com/sanastours/repository/DriverRepository.java`<br>`backend/src/main/java/com/sanastours/repository/VehicleRepository.java`<br>`backend/src/main/java/com/sanastours/repository/TripRepository.java`<br>`backend/src/main/java/com/sanastours/repository/TripUpdateRepository.java` |
| **DTOs & Services** | `backend/src/main/java/com/sanastours/dto/BookingRequest.java`<br>`backend/src/main/java/com/sanastours/dto/DriverRegisterRequest.java`<br>`backend/src/main/java/com/sanastours/dto/TripRequest.java`<br>`backend/src/main/java/com/sanastours/service/TripService.java` |
| **Frontend Admin Pages** | `frontend/src/pages/Bookings.jsx`<br>`frontend/src/pages/Drivers.jsx`<br>`frontend/src/pages/Vehicles.jsx` |
| **Frontend Customer Pages** | `frontend/src/pages/customer/MyBookings.jsx` |
| **Frontend Driver Portal** | `frontend/src/driver/DriverDashboard.jsx`<br>`frontend/src/driver/DriverLayout.jsx`<br>`frontend/src/driver/DriverProfile.jsx`<br>`frontend/src/driver/MyTours.jsx`<br>`frontend/src/driver/TourDetails.jsx`<br>`frontend/src/driver/tourState.js` |
| **Components & Utils** | `frontend/src/components/TripProgress.jsx`<br>`frontend/src/utils/tourSteps.js`<br>`frontend/src/utils/useLiveData.js` |
| **Database Tables** | `booking`, `driver`, `vehicle`, `trip`, `trip_update` |

### Shared core (maintained by all four members)

`SanastoursApplication.java`, `util/Validation.java`, `application.properties`, `pom.xml`, Maven wrapper, `App.jsx`, `main.jsx`, `Layout.jsx`, `CustomerLayout.jsx`, `Sidebar.jsx`, `CustomerSidebar.jsx`, `Topbar.jsx`, `GenericTable.jsx`, `StatusBadge.jsx`, `api.js`, `utils/filters.js`, `index.css`, `tailwind.config.js`, `Dashboard.jsx`, `CustomerDashboard.jsx`, `database_setup.sql`.

---

## Running the system

> **Note:** this repository is one member's slice of the project. It will not compile on its own, because the components reference each other across the domain model. Use the complete project repository to build and run the system; this repository records one member's contribution.

### 1. Database

```sql
source database_setup.sql;
```

Creates `sanastours_db` with the full schema and sample data. All demonstration accounts use the password `password123`.

### 2. Backend

```bash
cd backend
set DB_PASSWORD=your_mysql_password
mvnw.cmd spring-boot:run
```

Runs on http://localhost:8081

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173

---

## Technology

| Layer | Technology |
| :--- | :--- |
| Backend | Java 17, Spring Boot 3.2.4, Spring Security + JWT, JPA / Hibernate |
| Frontend | React 18, Vite 5, Tailwind CSS |
| Database | MySQL 8 |
| Build | Maven wrapper, npm |

## Client

SANAS TOURS (PVT) LTD (PV00329489), Galle, Sri Lanka — represented by Mr. Miyuru Malshan Indikatiya Hewage.
