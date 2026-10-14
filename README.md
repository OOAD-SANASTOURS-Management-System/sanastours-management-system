# SANAS TOURS — Member 2: Tour Package, Package Destination, Destination, Quotation

Web-Based Tour Booking and Operations Management System, built for SANAS TOURS (PVT) LTD.

**Module:** SE2012 — Object Oriented Design and Analysis  
**Group:** 31  
**Member:** Heshan I.H.Y (IT25104075)  
**Component:** Tour Package, Package Destination, Destination, Quotation

---

## What is in this repository

This repository holds the shared project core plus the files this member was responsible for. The shared core is the application shell every component needs in order to run: the Spring Boot entry point, validation utility, build files, the React shell and layouts, the reusable table and status components, the API wrapper, the two dashboards, and the database script.

### Files owned by Member 2

| Layer | Files |
| :--- | :--- |
| **Backend Entities** | `backend/src/main/java/com/sanastours/entity/TourPackage.java`<br>`backend/src/main/java/com/sanastours/entity/Destination.java`<br>`backend/src/main/java/com/sanastours/entity/PackageDestination.java`<br>`backend/src/main/java/com/sanastours/entity/Itinerary.java`<br>`backend/src/main/java/com/sanastours/entity/ItineraryDay.java`<br>`backend/src/main/java/com/sanastours/entity/Quotation.java` |
| **Backend Controllers** | `backend/src/main/java/com/sanastours/controller/TourPackageController.java`<br>`backend/src/main/java/com/sanastours/controller/ItineraryController.java`<br>`backend/src/main/java/com/sanastours/controller/QuotationController.java` |
| **Backend Repositories** | `backend/src/main/java/com/sanastours/repository/TourPackageRepository.java`<br>`backend/src/main/java/com/sanastours/repository/DestinationRepository.java`<br>`backend/src/main/java/com/sanastours/repository/PackageDestinationRepository.java`<br>`backend/src/main/java/com/sanastours/repository/ItineraryRepository.java`<br>`backend/src/main/java/com/sanastours/repository/ItineraryDayRepository.java`<br>`backend/src/main/java/com/sanastours/repository/QuotationRepository.java` |
| **Frontend Admin Pages** | `frontend/src/pages/TourPackages.jsx`<br>`frontend/src/pages/Quotations.jsx` |
| **Frontend Customer Pages** | `frontend/src/pages/customer/CustomerTourPackages.jsx`<br>`frontend/src/pages/customer/MyQuotations.jsx` |
| **Frontend Components** | `frontend/src/components/ItineraryModal.jsx` |
| **Database Tables** | `tour_package`, `destination`, `package_destination`, `itinerary`, `itinerary_day`, `quotation` |

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
