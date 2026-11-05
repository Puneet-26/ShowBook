# ShowBook — Architecture, Workflows & Technical Deep Dive

> **Comprehensive Technical Reference, System Design, Concurrency Engine, and Operational Documentation for the ShowBook Movie Ticket Booking Platform.**

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Database Architecture & Entity-Relationship Model](#3-database-architecture--entity-relationship-model)
4. [Concurrency Engine & Double-Booking Prevention](#4-concurrency-engine--double-booking-prevention)
5. [Seat Reservation Lifecycle & State Machine](#5-seat-reservation-lifecycle--state-machine)
6. [Idempotent Payment Simulation Engine](#6-idempotent-payment-simulation-engine)
7. [Cancellation & Seat Reclamation Engine](#7-cancellation--seat-reclamation-engine)
8. [Security & Role-Based Access Control (RBAC)](#8-security--role-based-access-control-rbac)
9. [End-to-End System Workflows](#9-end-to-end-system-workflows)
10. [Automated Concurrency & Security Test Suite](#10-automated-concurrency--security-test-suite)
11. [Complete REST API Specification](#11-complete-rest-api-specification)
12. [Frontend Architecture & Component Hierarchy](#12-frontend-architecture--component-hierarchy)
13. [Local Development & Operations Runbook](#13-local-development--operations-runbook)

---

## 1. Executive Summary

**ShowBook** is an enterprise-grade, full-stack movie ticket booking web platform engineered to demonstrate robust distributed-system principles, transactional integrity, and production-ready security. 

While offering an intuitive, high-performance user experience inspired by platforms like BookMyShow, ShowBook is fundamentally built around solves to hard distributed data challenges:
- **Zero Double-Bookings**: Pessimistic row-level locking (`SELECT ... FOR UPDATE`) guarantees race-condition immunity under extreme concurrent checkout spikes.
- **Deadlock Avoidance**: Deterministic resource sorting algorithms eliminate distributed deadlocks during simultaneous multi-seat selections.
- **Idempotent Financial Simulation**: Client-generated idempotency keys ensure retried or dropped network requests never cause duplicate charges or redundant database records.
- **Strict Data Ownership (IDOR Prevention)**: Object-level authorization guards guarantee users can never view, tamper with, or cancel bookings belonging to other accounts.
- **Auditorium Scheduling Conflict Engine**: Automatic temporal overlap detection prevents scheduling conflicting shows within the same screen.

---

## 2. High-Level Architecture

The platform follows a decoupled, three-tier architecture:

```
+---------------------------------------------------------------------------------+
|                                 CLIENT TIER                                     |
|  React 19 (SPA) + Vite 8 + Tailwind CSS v4 + React Router v7 + Axios + Lucide   |
+---------------------------------------------------------------------------------+
                                      |  HTTPS / JSON / JWT Cookie & Bearer
                                      v
+---------------------------------------------------------------------------------+
|                                SERVER TIER                                      |
|                       Node.js v24 + Express.js 4                                |
|                                                                                 |
|   [Middleware Layer]                                                            |
|     ├── Helmet (Security HTTP Headers)                                          |
|     ├── CORS (Origin Whitelist & Credentials)                                   |
|     ├── Express Rate Limiting (Brute Force / DoS Guard)                         |
|     ├── Cookie Parser (HTTP-Only Session Token Extractor)                       |
|     ├── Zod Schema Validator (Strict Payload Verification)                      |
|     ├── Authentication & RBAC Guard (JWT Verification & Role Checking)          |
|     └── Centralized Error Handling & AppError Normalization                     |
|                                                                                 |
|   [Service & Business Logic Layer]                                              |
|     ├── AuthService (Bcrypt Hashing, JWT Token Generation)                      |
|     ├── MovieService (Catalog Filtering & Search)                               |
|     ├── TheatreService (Auditorium & Seating Layouts)                           |
|     ├── ShowService (Screen Overlap Conflict Engine)                            |
|     ├── ReservationService (Pessimistic Locking & Expiry Sweeper)               |
|     ├── BookingService (Idempotent Payment, Confirmation & Cancellation)        |
|     └── AdminService (Metrics Aggregation & Global Booking Audits)              |
+---------------------------------------------------------------------------------+
                                      |  Prisma Client ORM + PostgreSQL Wire
                                      v
+---------------------------------------------------------------------------------+
|                               DATABASE TIER                                     |
|                           PostgreSQL 18 RDBMS                                   |
|                                                                                 |
|     ├── ACID Transactions (prisma.$transaction)                                 |
|     ├── Row-Level Pessimistic Locks (SELECT ... FOR UPDATE)                     |
|     ├── Unique Compound Indexes (ShowSeatAllocation: [showId, seatId])          |
|     └── Foreign Key Cascades & Strict Referential Integrity                     |
+---------------------------------------------------------------------------------+
```

---

## 3. Database Architecture & Entity-Relationship Model

The PostgreSQL database schema is defined in [schema.prisma](file:///E:/FSD-MiniProject/server/prisma/schema.prisma) and enforces complete referential integrity.

```mermaid
erDiagram
    User ||--o{ Reservation : "creates"
    User ||--o{ Booking : "owns"
    Movie ||--o{ Show : "scheduled for"
    Theatre ||--o{ Screen : "contains"
    Screen ||--o{ Seat : "has"
    Screen ||--o{ Show : "hosts"
    Show ||--o{ ShowSeatAllocation : "allocates"
    Seat ||--o{ ShowSeatAllocation : "allocated in"
    Show ||--o{ Reservation : "holds"
    Show ||--o{ Booking : "ticketed for"
    Reservation ||--o{ ReservationSeat : "contains"
    Seat ||--o{ ReservationSeat : "referenced by"
    Reservation ||--o| Booking : "transitions into"
    Reservation ||--o{ PaymentAttempt : "records"
    Booking ||--o{ BookingSeat : "issues"
    Seat ||--o{ BookingSeat : "referenced by"

    User {
        string id PK
        string email UK
        string passwordHash
        string name
        enum role "USER | ADMIN"
        datetime createdAt
    }

    Movie {
        string id PK
        string title
        string genre
        string language
        int durationMins
        datetime releaseDate
        string posterUrl
        string ageRating
        enum status "NOW_SHOWING | UPCOMING | ARCHIVED"
    }

    Theatre {
        string id PK
        string name
        string location
        string address
        string city
    }

    Screen {
        string id PK
        string theatreId FK
        string screenNumber
        string name
        int totalSeats
    }

    Seat {
        string id PK
        string screenId FK
        string rowLabel
        int seatNumber
        enum seatType "REGULAR | PREMIUM | VIP"
        float priceMultiplier
    }

    Show {
        string id PK
        string movieId FK
        string screenId FK
        datetime startTime
        datetime endTime
        float basePrice
        enum status "OPEN | CANCELLED | COMPLETED"
    }

    ShowSeatAllocation {
        string id PK
        string showId FK
        string seatId FK
        enum status "AVAILABLE | RESERVED | BOOKED"
        string reservationId FK
        string bookingId FK
        datetime reservedUntil
    }

    Reservation {
        string id PK
        string reservationRef UK
        string userId FK
        string showId FK
        float totalAmount
        datetime expiresAt
        enum status "PENDING | CONFIRMED | EXPIRED | CANCELLED"
    }

    Booking {
        string id PK
        string bookingRef UK
        string userId FK
        string showId FK
        string reservationId FK
        float totalAmount
        enum status "CONFIRMED | CANCELLED"
        datetime cancelledAt
    }

    PaymentAttempt {
        string id PK
        string reservationId FK
        string idempotencyKey UK
        float amount
        enum status "PENDING | SUCCESS | FAILED"
        string transactionRef
    }
```

### Table Breakdown

| Table | Description | Critical Constraints & Indexes |
|---|---|---|
| `User` | Stores registered users and system administrators. | Unique index on `email`. |
| `Movie` | Catalog of cinematic titles with genres, languages, and durations. | Indexes on `status`, `genre`, `language`. |
| `Theatre` | Physical venue records across cities. | Index on `city`. |
| `Screen` | Physical auditoriums within a theatre. | Unique compound key `[theatreId, screenNumber]`. |
| `Seat` | Physical seat templates for a screen (Row, Number, Tier). | Unique compound key `[screenId, rowLabel, seatNumber]`. |
| `Show` | Scheduled movie projection on a specific screen and time slot. | Indexes on `movieId`, `screenId`, `startTime`. |
| `ShowSeatAllocation` | **The core concurrency control table**. Represents the live occupancy state of a physical seat for a specific show. | **Unique compound key `[showId, seatId]`** prevents duplicate slots. Indexes on `[showId, status]`. |
| `Reservation` | Temporary 5-minute hold issued during checkout. | Unique `reservationRef`. Index on `[status, expiresAt]`. |
| `ReservationSeat` | Junction table capturing seats held in a reservation with locked prices. | Unique compound key `[reservationId, seatId]`. |
| `Booking` | Confirmed ticket purchase. | Unique `bookingRef`. Foreign key to `User` and `Show`. |
| `BookingSeat` | Immutable snapshot of seat numbers, tiers, and prices at time of purchase. | Unique compound key `[bookingId, seatId]`. |
| `PaymentAttempt` | Audit log of checkout payment simulations guarding idempotency. | **Unique `idempotencyKey`** preventing duplicate payment charges. |

---

## 4. Concurrency Engine & Double-Booking Prevention

### The Problem
In high-demand ticketing platforms, hundreds of users may attempt to click "Book Seat" on the exact same VIP or recliner seat at the same millisecond. 
A naive implementation reads the seat status (`AVAILABLE`), verifies it in application memory, and writes `BOOKED`. Under concurrency, two requests pass the read check before either writes, resulting in **double booking**.

### The Solution in ShowBook
ShowBook employs a five-layer defense strategy:

```
[Incoming Concurrent Requests for Seat A1 & A2]
                      │
                      ▼
 1. Deadlock Prevention: Deterministic Seat Sorting
    const sortedIds = [...new Set(seatIds)].sort();
                      │
                      ▼
 2. PostgreSQL Transaction Initialization
    await prisma.$transaction(async (tx) => { ... })
                      │
                      ▼
 3. Pessimistic Row-Level Locking
    SELECT ... FROM "ShowSeatAllocation"
    WHERE "showId" = $1 AND "seatId" IN ($2, $3)
    ORDER BY "seatId" ASC
    FOR UPDATE;
                      │
                      ├─────────────────────────────────────────┐
                      │ First User Acquired Lock                │ Second User Blocked by PostgreSQL
                      ▼                                         │ (Waits on Row Lock until Commit)
 4. Strict Availability Verification                           │
    if (alloc.status !== 'AVAILABLE') throw 409;                │
                      │                                         │
                      ▼                                         │
 5. Atomic Reservation Creation & Allocation Update             │
    Update allocations to 'RESERVED' with 5-min expiry.         │
                      │                                         │
                      ▼ (Transaction Commits)                   ▼
    Returns 201 Created                                  Lock Released to Second User:
                                                         Re-reads row -> status is now RESERVED!
                                                         Throws HTTP 409 Conflict!
```

### Deterministic Deadlock Prevention
When multiple transactions lock multiple rows, they can create a cyclical wait (Deadlock) if they acquire locks in opposing orders:
- User 1 locks `Seat A`, then requests `Seat B`.
- User 2 locks `Seat B`, then requests `Seat A`.
- Both threads freeze forever until database deadlock detection terminates one.

ShowBook completely eliminates this by sorting all requested seat IDs lexicographically prior to lock acquisition:
```javascript
// server/src/services/reservation.service.js
const uniqueSortedSeatIds = [...new Set(seatIds)].sort();
```
Because both transactions always acquire locks in the exact same ascending sequence, cyclic dependencies cannot form.

---

## 5. Seat Reservation Lifecycle & State Machine

Every seat allocation moves through a deterministic finite state machine (FSM):

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE : Show Created (Seeded)
    AVAILABLE --> RESERVED : User Holds Seats (5-Min Lock)
    RESERVED --> AVAILABLE : 5-Minute Timer Expires (Auto Sweeper)
    RESERVED --> AVAILABLE : User Manually Aborts Checkout
    RESERVED --> BOOKED : Payment Succeeded & Confirmed
    BOOKED --> AVAILABLE : Booking Cancelled (>= 2h Before Show)
    BOOKED --> [*] : Show Completed
```

### 1. The 5-Minute Reservation Hold
When a user selects seats and clicks "Proceed to Checkout":
1. A `Reservation` record is created in status `PENDING`.
2. An expiry timestamp is set: `expiresAt = now + 5 minutes`.
3. The corresponding `ShowSeatAllocation` rows are flagged as `RESERVED` with `reservedUntil = expiresAt`.
4. The client starts a live visual countdown timer.

### 2. Automatic Expiration Sweeping
ShowBook does not require fragile external cron jobs to reclaim expired seats. Every reservation query or seat lookup performs an inline transactional sweep:
```sql
UPDATE "ShowSeatAllocation"
SET "status" = 'AVAILABLE', "reservationId" = NULL, "reservedUntil" = NULL
WHERE "showId" = $showId AND "status" = 'RESERVED' AND "reservedUntil" <= NOW();

UPDATE "Reservation"
SET "status" = 'EXPIRED'
WHERE "showId" = $showId AND "status" = 'PENDING' AND "expiresAt" <= NOW();
```
This guarantees that any seat whose timer ran out is instantly returned to the available pool for all other users.

### 3. Live Shared Seat Synchronization Across Users
To maintain single-source-of-truth consistency across multiple active users without relying solely on manual reloads or heavy external dependencies (such as Redis or WebSockets):
1. **Database as Single Source of Truth**: All seat occupancy statuses (`AVAILABLE`, `RESERVED`, `BOOKED`) are stored and enforced at the PostgreSQL row level.
2. **Periodic Background Polling**: While viewing `SeatSelectionPage`, the frontend polls `GET /api/shows/:id` at a 4-second cadence to fetch real-time seat allocations from PostgreSQL.
3. **Collision Detection & Deselection**: If User 2 is viewing a seat that User 1 just reserved or booked, the polling cycle automatically detects the change, marks the seat as unavailable on User 2's screen, deselects it if highlighted, and displays an informative notification.
4. **Manual Sync Action**: A dedicated "Sync" button with animation enables immediate on-demand refresh.
5. **Immediate Voluntary Release**: Users in the checkout session can click "Cancel & Release Seats" to immediately release their temporary hold back to `AVAILABLE` without waiting for the 5-minute timeout.

---

## 6. Idempotent Payment Simulation Engine

Network connections on mobile and web are inherently unreliable. If a user clicks "Pay Now" and the network stutters, they will click "Pay Now" a second time. Without idempotency guards, this triggers double billing and duplicate booking records.

### How ShowBook Guarantees Idempotency:

```
Frontend Checkout
       │
       ▼
Generate Unique Idempotency Key (e.g., IDEMP-res123-1730000000000)
       │
       ▼
POST /api/bookings/reservations/:id/confirm { idempotencyKey, simulatePaymentStatus }
       │
       ├──> Check PaymentAttempt Table for existing `idempotencyKey`
       │         │
       │         ├─► [Key Found with SUCCESS status]:
       │         │   Return existing confirmed booking immediately (HTTP 200).
       │         │   Zero duplicate charges, zero duplicate tickets.
       │         │
       │         └─► [Key Not Found]:
       │             Proceed into PostgreSQL interactive transaction.
       │
       ├──> Lock Reservation Row exclusively (`FOR UPDATE`)
       ├──> Validate:
       │      - reservation.userId === req.user.id (Strict Ownership)
       │      - reservation.status === 'PENDING'
       │      - reservation.expiresAt > NOW()
       │
       ├──> Process Payment Simulation:
       │      ├─► If simulatePaymentStatus === 'FAILED':
       │      │   - Save PaymentAttempt with status FAILED
       │      │   - Keep reservation alive so user can retry before 5-minute timeout
       │      │   - Return HTTP 402 Payment Required
       │      │
       │      └─► If simulatePaymentStatus === 'SUCCESS':
       │          - Create permanent Booking record
       │          - Create BookingSeat snapshot records
       │          - Update ShowSeatAllocation rows to BOOKED
       │          - Update Reservation status to CONFIRMED
       │          - Record PaymentAttempt with status SUCCESS and transactionRef
       │          - Commit Transaction & Return HTTP 201 Created with E-Ticket
```

---

## 7. Cancellation & Seat Reclamation Engine

ShowBook provides a seamless, self-service cancellation workflow with strict business policy validation:

### Business Rules:
1. **Cancellation Deadline**: Bookings can only be cancelled up to **2 hours** before the scheduled showtime (`CANCELLATION_DEADLINE_HOURS = 2`). Past or imminent shows cannot be cancelled.
2. **Ownership Validation**: Only the user who placed the booking (or a System Administrator) can cancel it.
3. **Atomic Reclamation**: When cancelled:
   - `Booking.status` transitions from `CONFIRMED` to `CANCELLED`.
   - `Booking.cancelledAt` is stamped with `now()`.
   - All associated `ShowSeatAllocation` rows are atomically unlocked and reset to `AVAILABLE`.
   - Other users viewing the seat layout can instantly book those freed seats.

---

## 8. Security & Role-Based Access Control (RBAC)

ShowBook enforces a defense-in-depth security model:

```
[Inbound Request]
       │
       ▼
 [Helmet Middleware]  ─── Adds X-Content-Type-Options, X-Frame-Options, CSP
       │
       ▼
 [CORS Middleware]    ─── Strict origin matching + credentials allowlist
       │
       ▼
 [Rate Limiter]       ─── IP-based request throttling (100 req / 15 min; 30 req / 15 min for auth)
       │
       ▼
 [Zod Validator]      ─── Schema validation on req.body, req.query, req.params
       │
       ▼
 [Auth Middleware]   ─── Reads JWT from HTTP-only Cookie or Bearer Header
       │                   Validates signature and expiration
       │                   Attaches req.user = { id, email, role }
       │
       ▼
 [RBAC Middleware]    ─── Checks req.user.role (e.g. role === 'ADMIN')
       │
       ▼
 [Controller Layer]   ─── Strict IDOR ownership check: (record.userId === req.user.id)
       │
       ▼
 [Database Action]
```

### Key Security Safeguards
1. **Password Security**: Passwords hashed using `bcryptjs` with 10 salt rounds. Plaintext passwords never touch logs or persistent storage.
2. **JWT Dual Authentication**: Supports secure HTTP-only cookies (immune to XSS token theft) as well as `Authorization: Bearer <token>` headers (for headless and automated testing).
3. **Insecure Direct Object Reference (IDOR) Protection**: In endpoints such as `GET /api/bookings/:id` or `POST /api/bookings/:id/cancel`, the server explicitly verifies that `booking.userId === req.user.id`. A malicious user cannot view another user's booking details by guessing or enumerating IDs.
4. **Input Sanitization**: Every input (registration, login, seat selection, movie creation) is parsed through Zod schemas before reaching service controllers.

---

## 9. End-to-End System Workflows

### Workflow A: Customer Discovery to Ticket Purchase
1. **Movie Catalog**: User lands on `/` and browses films filtered by Genre and Language.
2. **Showtime Selection**: User clicks on a film to view `/movies/:id`, selects a preferred Date and Theatre, and chooses a Showtime slot.
3. **Interactive Auditorium Map**: User navigates to `/shows/:id/seats`. The page renders real-time color-coded seats:
   - Green / White: Available (Regular ₹200, Premium ₹300, VIP ₹450)
   - Orange / Yellow: Held in active reservation
   - Gray / Red: Already booked
4. **Reserve Seats**: User selects desired seats and clicks "Proceed to Checkout". The backend locks the seats and issues a 5-minute reservation.
5. **Checkout & Payment Simulation**: User is routed to `/checkout/:reservationId`. A countdown timer counts down from 05:00. The user selects "Simulate Successful Payment" or "Simulate Payment Failure" to test edge cases.
6. **E-Ticket & QR Code**: Upon payment success, user is redirected to `/booking-confirmed/:id`, displaying an interactive digital ticket with reference code, seats, and a scannable QR code.

### Workflow B: Administrator Management
1. **Dashboard Overview**: Admin logs into `/admin` to view live business metrics:
   - Total Confirmed Bookings
   - Gross Revenue (₹)
   - Active Shows and Movies
2. **Global Bookings Audit**: Admin searches all system bookings by customer name, booking reference, or status.
3. **Movie Management**: Admin can add new movies to the catalog or archive existing titles.
4. **Show Scheduling Conflict Engine**: Admin schedules a show by selecting Movie, Screen, Start Time, and Base Price. The backend automatically computes the end time (`startTime + movie.durationMins`) and verifies no other show is scheduled on that screen during that interval.
5. **Emergency Show Cancellation**: Admin cancels a show, automatically cancelling all associated bookings and releasing seats.

---

## 10. Automated Concurrency & Security Test Suite

The automated test suite is powered by **Vitest** and **Supertest** located in `server/tests/`:

```
server/tests/
  ├── auth.test.js                      # 9 tests: Auth, RBAC, Password verification
  ├── booking.test.js                   # 4 tests: Payment simulation, Idempotency, IDOR, Cancellation
  └── reservation_concurrency.test.js   # 3 tests: Parallel race conditions, double booking, expiration sweep
```

### Verified Test Cases (16 Passing Tests):

```
✓ tests/booking.test.js (4)
  ✓ should reserve a seat, simulate payment failure, and allow retry
  ✓ should enforce idempotency on payment confirmation to avoid duplicate bookings
  ✓ CRITICAL: Should prevent User 2 from accessing or viewing User 1 booking by ID
  ✓ should successfully cancel a confirmed booking and release seats back to AVAILABLE

✓ tests/reservation_concurrency.test.js (3)
  ✓ CRITICAL: Should prevent double booking when two users simultaneously try to reserve the exact same seat
  ✓ should reject reservation if a seat is already reserved
  ✓ should automatically release expired reservations and allow re-booking

✓ tests/auth.test.js (9)
  ✓ should successfully register a new user with valid inputs
  ✓ should reject registration if email is already taken
  ✓ should reject registration with invalid email or short password
  ✓ should login an existing user with valid credentials
  ✓ should reject login with wrong password
  ✓ should deny access to protected profile without token
  ✓ should allow access to profile with valid bearer token
  ✓ should forbid a regular USER from accessing ADMIN endpoints
  ✓ should allow an ADMIN user to access ADMIN endpoints
```

#### How the Concurrency Stress Test Works
In `reservation_concurrency.test.js`, two simultaneous HTTP POST requests are fired across parallel asynchronous threads targeting the exact same `showId` and `seatId`:
```javascript
const [res1, res2] = await Promise.all([
  request(app).post('/api/reservations').set('Authorization', `Bearer ${token1}`).send({ showId, seatIds: [seatId] }),
  request(app).post('/api/reservations').set('Authorization', `Bearer ${token2}`).send({ showId, seatIds: [seatId] }),
]);
```
**Verification**: Exactly one request receives `HTTP 201 Created`, while the other receives `HTTP 409 Conflict`. Zero double-bookings are mathematically possible.

---

## 11. Complete REST API Specification

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new account (`name`, `email`, `password`). |
| `POST` | `/api/auth/login` | Public | Authenticate user; returns JWT cookie + token payload. |
| `POST` | `/api/auth/logout` | Public | Clears session cookie. |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile. |
| `PATCH` | `/api/auth/me` | Authenticated | Update user display name. |
| `PATCH` | `/api/auth/me/password` | Authenticated | Update account password. |

### Movies (`/api/movies`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/movies` | Public | List movies with optional `search`, `genre`, `language` filters. |
| `GET` | `/api/movies/filters` | Public | Get distinct list of genres and languages in catalog. |
| `GET` | `/api/movies/:id` | Public | Get movie details with scheduled theatres, screens, and shows. |

### Theatres & Screens (`/api/theatres`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/theatres` | Public | List all theatres grouped by city. |
| `GET` | `/api/theatres/:id` | Public | Get theatre details with screens and active shows. |

### Shows & Auditorium Seating (`/api/shows`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/shows` | Public | List scheduled shows with date/theatre filters. |
| `GET` | `/api/shows/:id` | Public | Retrieve show details and full real-time interactive seat layout with allocation statuses (`AVAILABLE`, `RESERVED`, `BOOKED`). |

### Reservations (`/api/reservations`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/reservations` | Authenticated | Atomically acquire 5-minute hold on requested `seatIds`. Row-level locked. |
| `GET` | `/api/reservations/:id` | Authenticated | Inspect reservation status, seat breakdown, and countdown timer. |
| `POST` | `/api/reservations/:id/cancel` | Authenticated | Manually release held seats back to available pool. |

### Bookings (`/api/bookings`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/bookings/reservations/:id/confirm` | Authenticated | Idempotent checkout. Confirms booking and simulates payment (`SUCCESS` or `FAILED`). |
| `GET` | `/api/bookings/my` | Authenticated | List all upcoming, past, and cancelled bookings for current user. |
| `GET` | `/api/bookings/:id` | Authenticated | Get full booking receipt, ticket details, and QR payload (Strict IDOR guarded). |
| `POST` | `/api/bookings/:id/cancel` | Authenticated | Cancel booking and release seats back to auditorium (must be $\ge$ 2h before show). |

### Administrator Control (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | Admin Only | Global metrics: Total Bookings, Revenue, Active Movies, Shows. |
| `GET` | `/api/admin/bookings` | Admin Only | Search and inspect all system bookings with status filtering. |
| `POST` | `/api/admin/movies` | Admin Only | Add a new movie to the global catalog. |
| `DELETE` | `/api/admin/movies/:id` | Admin Only | Archive a movie from active listings. |
| `POST` | `/api/admin/shows` | Admin Only | Schedule a new show with automated auditorium time-conflict validation. |
| `POST` | `/api/admin/shows/:id/cancel`| Admin Only | Emergency show cancellation with automatic booking cascade. |

---

## 12. Frontend Architecture & Component Hierarchy

The frontend is a single-page application built with React 19, Vite, and Tailwind CSS:

```
client/src/
  ├── main.jsx                     # Application entry point
  ├── App.jsx                      # Route definitions & layout wrappers
  ├── index.css                    # Tailwind CSS v4 styling rules
  ├── services/
  │     └── api.js                 # Centralized Axios client with baseURL & credentials
  ├── context/
  │     └── AuthContext.jsx        # Global authentication state, login, register, logout
  ├── components/
  │     ├── Navbar.jsx             # Responsive navigation bar with role-based links
  │     ├── Footer.jsx             # Application footer
  │     └── ProtectedRoute.jsx     # Route guard for Authenticated & Admin roles
  └── pages/
        ├── HomePage.jsx           # Movie discovery with live search & filters
        ├── MovieDetailsPage.jsx   # Movie overview, trailer info, and showtime picker
        ├── SeatSelectionPage.jsx  # Interactive auditorium seat map with live status
        ├── CheckoutPage.jsx       # 5-min timer, order breakdown, simulated payment
        ├── BookingConfirmationPage.jsx # Digital ticket receipt with scannable QR code
        ├── MyBookingsPage.jsx     # User ticket history with self-service cancellation
        ├── ProfilePage.jsx        # Account details & password manager
        ├── LoginPage.jsx          # User & Admin login with 1-click demo buttons
        ├── RegisterPage.jsx       # User registration
        └── AdminDashboardPage.jsx # Analytics dashboard, booking inspector, show scheduler
```

---

## 13. Local Development & Operations Runbook

### Prerequisites
- Node.js (v18+ or v24 recommended)
- PostgreSQL 18 running on port `5432`

### Backend Configuration (`server/.env`)
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/showbook?schema=public"
JWT_SECRET=showbook_super_secret_jwt_key_2026_secure
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
RESERVATION_EXPIRY_MINUTES=5
CANCELLATION_DEADLINE_HOURS=2
```

### 1. Database Setup & Seeding
From the `server/` directory:
```bash
# Push schema migrations
npx prisma db push

# Populate initial movies, theatres, screens, shows, and default accounts
npm run seed
```

### 2. Default Demo Credentials
| Role | Email | Password | Purpose |
|---|---|---|---|
| **Demo User 1** | `user@showbook.com` | `User@12345` | Independent booking flow and personal tickets |
| **Demo User 2** | `user2@showbook.com` | `User2@12345` | Verifying shared concurrent seat synchronization |
| **System Admin** | `admin@showbook.com` | `Admin@12345` | Catalog manager, show scheduling & global audit |

*(Note: One-click demo credential fill buttons are built directly into the Login page for instant demonstration).*

### 3. Running Development Servers
```bash
# In Terminal 1 (Backend API):
cd server
npm run dev
# Server listening at http://localhost:5000

# In Terminal 2 (Frontend Client):
cd client
npm run dev
# Vite client listening at http://localhost:5173
```

### 4. Running the Automated Test Suite
```bash
cd server
npm test
```
All 16 tests covering concurrency, race conditions, idempotency, authorization, and cancellation will execute and verify the system's resilience.

