# SANAS TOURS — Tour Management System

A web application for a tour operator. Customers browse tour packages, send an
inquiry, receive a quotation, accept it, pay, follow their tour as it runs and
leave feedback afterwards. The office (admin) answers inquiries, confirms
payments, allocates drivers and vehicles, watches each tour's progress and
reads the feedback. Drivers see the tours assigned to them and report progress
from the road.

Built for the OOAD module — Spring Boot REST backend, React single-page
frontend, MySQL database.

---

## 1. Technology

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.2.4, Spring Security + JWT, Spring Data JPA / Hibernate |
| Database | MySQL 8 |
| Frontend | React 18, Vite 5, Tailwind CSS, React Router (driver section) |
| Build | Maven wrapper (`mvnw`), npm |

Three roles, one login screen: **CUSTOMER**, **ADMIN**, **DRIVER**. The role on
the JWT decides which dashboard loads and which API endpoints are permitted.

---

## 2. Running it locally (Windows / PowerShell)

### 2.1 Create the database

`database_setup.sql` is the only SQL file in the project. It creates
`sanastours_db`, every table and the sample data, so there is nothing else to
run and no order to get right.

```powershell
mysql -u root -p
```

```sql
source C:/full/path/to/sanastours/database_setup.sql;
```

> **Warning:** the script starts with `DROP DATABASE IF EXISTS sanastours_db;`.
> Running it again erases everything and restores the original sample data.

### 2.2 Start the backend

```powershell
cd sanastours\backend
$env:DB_PASSWORD = "your_mysql_root_password"
.\mvnw.cmd spring-boot:run
```

The API listens on **http://localhost:8081**. `DB_PASSWORD` must be set in the
same PowerShell window each time — without it the first login fails with a 500
and the log shows `Access denied for user 'root'@'localhost'`.

Keep the project in a folder path with no round brackets in it. `mvnw.cmd` is a
Windows batch script, and a path like `sanastours-final (1)` makes cmd fail with
`"}" was unexpected at this time.`

### 2.3 Start the frontend

In a second window:

```powershell
cd sanastours\frontend
npm install
npm run dev
```

Open the address Vite prints (usually **http://localhost:5173**).

### 2.4 Demo logins

All sample accounts use the password **`password123`**.

| Role | Username |
|---|---|
| Admin | `admin` |
| Customer | `sarah_smith` |
| Customer | `mike_jones` |
| Driver | `nimal` |

---

## 3. The main workflow

This is the path worth demonstrating, end to end:

1. **Customer** — *Tour Packages* → **Send Inquiry**. Only travellers,
   accommodation and transport are editable; the end date is derived from the
   package duration and locked. Status: **New**.
2. **Admin** — *Inquiries* → **Send Quotation**. The customer's own details and
   request are read-only, the base price is the package price, and the Admin
   Message is optional. Status becomes **Quotation Sent**, which is final.
   **Reject Inquiry** instead ends the inquiry with a reason the customer reads.
3. **Customer** — *My Quotations* shows it as **Awaiting your response** →
   **Accept**. This creates a **Pending** booking.
4. **Customer** — *My Bookings* → **Pay Now** opens *Submit Payment Details*
   with the booking preselected, the amount calculated from base price plus
   additional charges less discount, Bank Transfer as the method, and the two
   bank accounts shown as text. A payment slip (PDF) is uploaded with it. The
   booking cannot be opened yet — **View** explains that payment is needed first.
5. **Admin** — *Payments* → open the payment, **Open slip (PDF)** to check it,
   then **Confirm Payment** or **Reject Payment** (which demands a reason).
   Confirming promotes the booking from **Pending** to **Confirmed**; the
   customer's payment then reads *Payment confirmed*, or *Payment rejected*
   with the reason shown.
6. **Admin** — *Bookings* → allocate a driver and vehicle for the confirmed
   booking.
7. **Driver** — *My Tours* → open the tour, advance the trip stages and post
   updates. The same **Trip Progress** view appears on the admin dashboard for
   every ongoing tour, so the office sees what the driver reports.
8. **Customer** — once the tour is complete, *My Bookings* → **Give Feedback**
   (star rating and review), which the office reads under *Feedback*.

Every dashboard refreshes itself every 30 seconds, and again whenever its tab
regains focus, so two browser windows side by side stay in step during a demo.

---

## 4. Project structure

```
sanastours/
├─ backend/
│  └─ src/main/java/com/sanastours/
│     ├─ controller/   REST endpoints, one per subsystem
│     ├─ entity/       JPA entities, one per table
│     ├─ repository/   Spring Data repositories
│     ├─ dto/          request shapes for auth, bookings, payments, feedback…
│     ├─ security/     JWT issuing and filtering, role rules, login throttling
│     ├─ service/      TripService (trip allocation rules)
│     └─ util/         Validation (shared status vocabularies and checks)
├─ frontend/src/
│  ├─ pages/           admin screens
│  ├─ pages/customer/  customer screens
│  ├─ pages/auth/      login and registration
│  ├─ driver/          driver screens (React Router)
│  ├─ components/      shared UI (StatusBadge, GenericTable, TripProgress…)
│  └─ utils/           filters, live refresh, trip stages, feedback helpers
└─ database_setup.sql  full schema + sample data
```
