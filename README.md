# SANAS TOURS — Member 1: Customer, User & Authentication, Inquiry

Web-Based Tour Booking and Operations Management System, built for SANAS TOURS (PVT) LTD.

**Module:** SE2012 — Object Oriented Design and Analysis  
**Group:** 31  
**Member:** Vithanage C.P. (IT25103203)  
**Component:** Customer, User & Authentication, Inquiry

---

## What is in this repository

This repository holds the shared project core plus the files this member was responsible for. The shared core is the application shell every component needs in order to run: the Spring Boot entry point, validation utility, build files, the React shell and layouts, the reusable table and status components, the API wrapper, the two dashboards, and the database script.

### Files owned by Member 1

| Layer | Files |
| :--- | :--- |
| **Backend Entities** | `backend/src/main/java/com/sanastours/entity/User.java`<br>`backend/src/main/java/com/sanastours/entity/Customer.java`<br>`backend/src/main/java/com/sanastours/entity/Inquiry.java` |
| **Backend Controllers** | `backend/src/main/java/com/sanastours/controller/AuthController.java`<br>`backend/src/main/java/com/sanastours/controller/CustomerController.java`<br>`backend/src/main/java/com/sanastours/controller/InquiryController.java` |
| **Backend Repositories** | `backend/src/main/java/com/sanastours/repository/UserRepository.java`<br>`backend/src/main/java/com/sanastours/repository/CustomerRepository.java`<br>`backend/src/main/java/com/sanastours/repository/InquiryRepository.java` |
| **Security & DTOs** | `backend/src/main/java/com/sanastours/security/SecurityConfig.java`<br>`backend/src/main/java/com/sanastours/security/JwtUtil.java`<br>`backend/src/main/java/com/sanastours/security/JwtFilter.java`<br>`backend/src/main/java/com/sanastours/security/CurrentUser.java`<br>`backend/src/main/java/com/sanastours/security/LoginAttemptService.java`<br>`backend/src/main/java/com/sanastours/dto/AuthRequest.java`<br>`backend/src/main/java/com/sanastours/dto/AuthResponse.java`<br>`backend/src/main/java/com/sanastours/dto/RegisterRequest.java` |
| **Frontend Authentication** | `frontend/src/pages/auth/Login.jsx`<br>`frontend/src/pages/auth/Register.jsx` |
| **Frontend Admin Pages** | `frontend/src/pages/Customers.jsx`<br>`frontend/src/pages/Inquiries.jsx` |
| **Frontend Customer Pages** | `frontend/src/pages/customer/MyInquiries.jsx`<br>`frontend/src/pages/customer/MyProfile.jsx` |
| **Database Tables** | `user`, `customer`, `inquiry` |

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
