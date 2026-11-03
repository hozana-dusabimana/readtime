# ReadyTime — Smart Appointment Booking and Scheduling System

The project has two separate parts:

| Folder | What it is | Runs on |
|---|---|---|
| `backend/` | Java 24 REST API (plain Java, built-in `HttpServer`, JDBC + PostgreSQL). Only answers with JSON. | http://localhost:8080/api |
| `frontend/` | Plain HTML, CSS and JavaScript website that calls the API. | http://localhost:5500 |

```
Browser ──► frontend (index.html + app.js) ──fetch, JSON──► backend API (Java) ──JDBC──► PostgreSQL
```

## 1. One-time setup

1. PostgreSQL must be running. Create the database once:
   ```
   psql -U postgres -h localhost -c "CREATE DATABASE readytime;"
   ```
2. In `backend/`, copy `config.example.properties` to `config.properties` and fill in your database user/password.
   `config.properties` is in `.gitignore`, so your password never goes into Git.
   Environment variables `DB_URL`, `DB_USER`, `DB_PASSWORD`, `PORT` and `CORS_ORIGIN` override the file.

The tables are created automatically the first time the backend starts (`backend/src/main/resources/schema.sql`).

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
.\mvnw.cmd compile exec:java
```
Wait for `ReadyTime API is running: http://localhost:8080/api`.
`mvnw.cmd` is the Maven Wrapper: it downloads Maven by itself, so you do not need to install Maven.

**Terminal 2 — frontend website**
```
cd frontend
npx http-server -p 5500 -c-1
```
(Or open `frontend/index.html` with the VS Code "Live Server" extension.)

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

If the backend runs somewhere else, change `API_URL` in `frontend/js/config.js`.

## 3. Try it out (quick demo)

1. Log in as the **System Admin** → add a business → add a service provider to it.
2. Log in as that **Provider** → add a service (e.g. Haircut, 30 min) and working hours → Save hours.
3. Sign up as a **Client** → choose business, provider, service, date → click a time to book.

## 4. Project structure

```
backend/
  pom.xml, mvnw.cmd, config.example.properties
  src/main/java/com/readytime/
    Main.java            starts the API server
    Config.java          reads config.properties / environment variables
    Database.java        JDBC connections, run() and transaction() helpers
    TimeProvider.java    "what time is it?" (Africa/Kigali) - replaceable in tests
    AppException.java    expected errors with an HTTP status code
    model/               simple data records (User, Appointment, ...)
    dao/                 SQL for each table
    service/             ALL business rules + role checks
    web/                 Router (+ CORS), request helpers, list of API routes
  src/main/resources/schema.sql   database tables
frontend/                        ALL screens and design live here (the backend has none)
  index.html                     page shell: sidebar + top bar + <main id="app">
  css/style.css                  all styling (colors defined once at the top)
  js/
    config.js                    API_URL (where the backend runs)
    api.js                       the ONLY file that calls the backend (fetch + token header)
    session.js                   who is logged in + the saved token
    utils.js                     small helpers (escape HTML, dates, badges, stat cards)
    icons.js                     small SVG icons
    routes.js                    which sidebar pages each role has
    layout.js                    draws the sidebar, page title and clock
    main.js                      start: checks login, shows the page matching the address (#/...)
    pages/                       one file per page
      public/          home.js, how-it-works.js, for-business.js, login.js, signup.js
      client/          book.js, my-appointments.js
      provider/        schedule.js, hours.js, services.js
      system-admin/    overview.js, moderation.js, businesses.js, users.js
    components/                  reusable parts used by several pages
      modal.js, appointment-actions.js, appointments-table.js, services-manager.js, hours-editor.js
```

**Public pages (top menu, before login):** Home (`#/`), How it works (`#/how-it-works`),
For businesses (`#/for-business`), Log in (`#/login`) and Sign up in steps (`#/signup`):
client = name → email → password → review; service provider (`#/signup?as=provider`) = name → email →
password → business (name, address) → review. The new user is logged in automatically.
Photos are in `frontend/images/` (free Pexels photos, sources in `images/CREDITS.md`).
Form checks in `js/validation.js` use the same limits as the backend (`Validate.java`).

**Pages per role (sidebar):**

| Role | Pages |
|---|---|
| Client | Book Appointment (`#/book`), My Appointments (`#/appointments`) |
| Provider | Today's Schedule (`#/schedule`), Working Hours (`#/hours`), My Services (`#/services`) |
| System Admin | Overview, Client Moderation, Businesses (add businesses and their providers), User Accounts |

The part after `#` in the address picks the page, so each page has its own link and the browser's
Back button works. Every number on the screen is calculated from real API data.

The frontend uses JavaScript modules (`import` / `export`), so it must be opened through a web
server (http-server or Live Server), not by double-clicking `index.html`.

**Moving to React later:** only the `frontend/` folder changes. Each file in `pages/` and
`components/` becomes a React component, and `api.js` can be reused almost as it is.
The Java backend stays exactly the same.

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
