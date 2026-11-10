# ReadyTime — Smart Appointment Booking and Scheduling System

The project has two separate parts:

| Folder | What it is | Runs on |
|---|---|---|
| `backend/` | Java 24 **Spring Boot 3.5** REST API (Spring MVC, JdbcTemplate + PostgreSQL). Only answers with JSON. | http://localhost:8080/api |
| `frontend/` | **React 18** single-page app (Vite, React Router) that calls the API. | http://localhost:5500 |

```
Browser ──► frontend (React) ──fetch, JSON──► backend API (Spring Boot) ──JdbcTemplate──► PostgreSQL
```

## 1. One-time setup

1. PostgreSQL must be running. Create the database once:
   ```
   psql -U postgres -h localhost -c "CREATE DATABASE readytime;"
   ```
2. In `backend/`, copy `config.example.properties` to `config.properties` and fill in your database user/password.
   `config.properties` is in `.gitignore`, so your password never goes into Git.
   Spring Boot reads it on start (`spring.config.import` in `backend/src/main/resources/application.properties`).
   Environment variables `DB_URL`, `DB_USER`, `DB_PASSWORD`, `PORT`, `CORS_ORIGIN` and `SEED_DEMO` override the file.

The tables are created automatically when the backend starts (Spring runs `backend/src/main/resources/schema.sql`).

## 2. Run everything with one command

From the project folder:
```
.\run.ps1
```
If Windows says "running scripts is disabled", use
`powershell -ExecutionPolicy Bypass -File .\run.ps1`.

It checks Java 24+, Node.js and PostgreSQL, creates `backend\config.properties` and the
database if they are missing, starts the backend and the frontend in two new windows, and
opens the browser. To stop, close those two windows.

## 2b. Or run it by hand (two terminals)

**Terminal 1 — backend API**
```
cd backend
.\mvnw.cmd spring-boot:run
```
Wait for `Started ReadyTimeApplication`. (Or build a single runnable jar with `.\mvnw.cmd package`
and start it with `java -jar targeteadytime-1.0.jar`.)
`mvnw.cmd` is the Maven Wrapper: it downloads Maven by itself, so you do not need to install Maven.

**Terminal 2 — frontend website (React + Vite)**
```
cd frontend
npm install      (first time only)
npm run dev
```

Open **http://localhost:5500**. Stop either server with `Ctrl + C`.

**The system has 3 roles: System Admin, Service Provider and Client.**

**Demo accounts (created automatically when the backend starts):**

| Role | Email | Password | What you can try |
|---|---|---|---|
| System Admin | `admin@readytime.com` | `Admin@1234` | Businesses, user accounts, unblocking clients |
| Service Provider | `provider@readytime.com` | `Provider@1234` | Schedule, attendance, working hours, services |
| Client (books services) | `client@readytime.com` | `Client@1234` | Book, reschedule and cancel appointments |

The demo provider *Dr. Eric Provider* works at *ReadyTime Demo Clinic* (KG 7 Ave, Kigali) and has
3 services (General Consultation 30 min, Full Check-up 60 min, Follow-up Visit 15 min) and working
hours Monday-Friday 08:00-12:00 and 13:00-17:00 (lunch break), Saturday 09:00-13:00 - so the
client can book straight away.

The demo data is only created once (it is skipped if `provider@readytime.com` already exists).
To turn it off, set `seed.demo=false` in `backend/config.properties` (or `SEED_DEMO=false`).
These passwords are public - change them on any server other people can reach.

If the backend runs somewhere else, copy `frontend/.env.example` to `frontend/.env` and change `VITE_API_URL`.

## 3. Try it out (quick demo)

1. Log in as the **System Admin** → add a business → add a service provider to it.
2. Log in as that **Provider** → add a service (e.g. Haircut, 30 min) and working hours → Save hours.
3. Sign up as a **Client** → choose business, provider, service, date → click a time to book.

## 4. Project structure

```
backend/
  pom.xml (Spring Boot parent), mvnw.cmd, config.example.properties
  src/main/java/com/readytime/
    ReadyTimeApplication.java  starts Spring Boot (embedded Tomcat on port 8080)
    TimeProvider.java    "what time is it?" (Africa/Kigali) - replaceable in tests
    AppException.java    expected errors with an HTTP status code
    config/AppConfig.java   CORS, @CurrentUser support, JSON date format, clock bean
    model/               simple data records (User, Appointment, ...)
    repository/          SQL for each table (@Repository classes using JdbcTemplate)
    service/             ALL business rules + role checks (@Service, @Transactional);
                         DemoData.java creates the first admin + demo accounts on start
    web/                 @RestController classes (Auth, Admin, Catalog, Appointment),
                         dto/Requests.java (JSON request bodies), CurrentUser + CurrentUserResolver
                         (reads the Bearer token), ApiExceptionHandler (errors -> {"error": "..."})
  src/main/resources/
    application.properties  Spring Boot settings (database, port, CORS, demo data)
    schema.sql              database tables (run on every start)
frontend/                        ALL screens and design live here (the backend has none)
  package.json, vite.config.js   React + Vite (npm run dev / build / preview), dev server on port 5500
  index.html                     page shell that loads src/main.jsx
  .env.example                   VITE_API_URL (where the backend runs)
  public/images/                 photos (sources in CREDITS.md)
  src/
    main.jsx, App.jsx            start: HashRouter, checks login, picks the public or app layout
    routes.jsx                   public pages + which sidebar pages each role has
    api.js                       the ONLY file that calls the backend (fetch + token header)
    config.js                    API_URL (from VITE_API_URL)
    auth/                        SessionContext.jsx (who is logged in), token.js (saved token)
    layouts/                     PublicLayout.jsx (top menu), AppLayout.jsx (sidebar, title, clock)
    utils.js, validation.js      helpers (dates, money, badges) and form checks
    style.css                    all styling (colors defined once at the top)
    pages/                       one component per page
      public/          Home, HowItWorks, ForBusiness, Login, Signup
      client/          Book, MyAppointments
      provider/        Schedule, Hours, Services
      account/         Profile, Reports
      system-admin/    Overview, Moderation, Businesses, Users
    components/                  reusable parts used by several pages
      Modal, Message, AppointmentActions, AppointmentsTable, ServicesManager, HoursEditor, Icon, ...
```

**Public pages (top menu, before login):** Home (`#/`), How it works (`#/how-it-works`),
For businesses (`#/for-business`), Log in (`#/login`) and Sign up in steps (`#/signup`):
client = name → email → password → review; service provider (`#/signup?as=provider`) = name → email →
password → business (name, address) → review. The new user is logged in automatically.
Photos are in `frontend/public/images/` (free Pexels photos, sources in `CREDITS.md`).
Form checks in `src/validation.js` use the same limits as the backend (`Validate.java`).

**Pages per role (sidebar):**

| Role | Pages |
|---|---|
| Client | Book Appointment (`#/book`), My Appointments (`#/appointments`) |
| Provider | Today's Schedule (`#/schedule`), Working Hours (`#/hours`), My Services (`#/services`) |
| System Admin | Overview, Client Moderation, Businesses (add businesses and their providers), User Accounts |

The part after `#` in the address picks the page, so each page has its own link and the browser's
Back button works. Every number on the screen is calculated from real API data.

`npm run build` creates a static production version in `frontend/dist/` that any web server can host.

## 5. How login works

1. `POST /api/login` returns `{"token": "...", "user": {...}}`.
2. The frontend saves the token in `localStorage` and sends it with every request in the header
   `Authorization: Bearer <token>`. Postman works the same way.
3. The backend looks the token up in the `sessions` table (valid 8 hours) and checks the user's role
   for every request. Hiding buttons in the frontend is NOT the security — the backend is.

## 6. Business rules (agreed assumptions)

| # | Rule |
|---|------|
| A1 | Active appointment = status BOOKED and its end time has not passed. Max 2 per client. |
| A2 | Clients can cancel only if now is at least 2 hours before the start (exactly 2:00 is allowed). Providers may cancel any time. |
| A3 | Rescheduling = moving the same appointment to another free slot; same 2-hour rule for clients. |
| A4 | The provider marks COMPLETED or NO_SHOW, only after the start time. These are final. |
| A5 | The 3rd no-show blocks the client from new bookings. Existing bookings stay. |
| A6 | Only the System Admin can unblock; this resets the no-show count to 0. |
| A7 | Slots start at each working period's start and step by the service duration; a slot must fit in one period (breaks = gaps between periods). Booking up to 30 days ahead. |
| A8 | The whole system uses Africa/Kigali time. |
| A9 | Changing working hours keeps existing bookings; the API lists the ones now outside the hours. |
| A10 | A business has many providers and one address. |
| A11 | Each provider owns and manages their own services, working hours and appointments. |
| A12 | Clients and service providers can register themselves. A provider registers together with their business (one business per sign-up). The system admin can also create businesses, add providers to them and register any account. |
| A13 | Status changes: BOOKED → CANCELLED / COMPLETED / NO_SHOW only. |

## 7. Double-booking protection

Booking runs in one transaction that locks the client's and the provider's rows
(`SELECT ... FOR UPDATE`), so two simultaneous bookings for the same provider are
handled one after the other. A PostgreSQL exclusion constraint
(`no_overlapping_bookings`) also makes overlapping BOOKED appointments impossible.

## 8. API overview (for Postman)

All requests except register/login need the header `Authorization: Bearer <token>`.

| Method | Path | Who |
|---|---|---|
| POST | /api/register (client), /api/register/provider (provider + business), /api/login | anyone |
| POST | /api/logout | logged in |
| GET | /api/me | logged in |
| PUT | /api/me (name, email), /api/me/password (currentPassword, newPassword) | logged in (own profile) |
| GET | /api/reports/appointments?from=2026-11-01&to=2026-11-30 | System Admin (all), Service Provider (own) |
| GET | /api/admin/users | System Admin |
| POST / PUT | /api/admin/users, /api/admin/users/{id} (register / edit an account) | System Admin |
| PUT | /api/admin/businesses/{id} (edit name, address) | System Admin |
| POST | /api/admin/users/{id}/unblock, /api/admin/users/{id}/active | System Admin |
| POST | /api/admin/businesses, /api/admin/businesses/{id}/active, /api/admin/businesses/{id}/providers | System Admin |
| GET | /api/businesses, /api/businesses/{id}/providers | logged in |
| GET / POST | /api/providers/{id}/services | view: logged in / add: that provider |
| PUT | /api/services/{id} | the provider who owns it |
| GET / PUT | /api/providers/{id}/hours | view: logged in / change: that provider |
| GET | /api/services/{id}/slots?date=2026-11-05 | logged in |
| GET / POST | /api/appointments | list: everyone sees their own / book: Client |
| POST | /api/appointments/{id}/cancel, /api/appointments/{id}/reschedule | owner client, the provider |
| POST | /api/appointments/{id}/status  (`{"status":"COMPLETED"}` or `NO_SHOW`) | the provider |

Error answers look like `{"error": "This time slot is already booked."}` with status
400 (bad input), 401 (not logged in), 403 (not allowed), 404 (not found) or 409 (rule broken).


### run hint
How to use it
From the project folder:


.\run.ps1
If Windows says "running scripts is disabled", use:


powershell -ExecutionPolicy Bypass -File .\run.ps1
