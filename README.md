# ShowBook — Movie Ticket Booking Platform

ShowBook is a full-stack, BookMyShow-inspired movie ticket booking web application engineered for college Full Stack Development mini-project evaluation. Beyond a sleek, responsive dark-themed UI, ShowBook's core strength is its **robust backend engineering**, **race-condition-safe seat reservation engine**, **PostgreSQL transactional row-level locking**, **live shared seat availability synchronization**, **idempotent payment simulation**, and **role-based security**.

---

## 1. Key Engineering Highlights

### 🔒 Concurrency & Double-Booking Prevention
Two concurrent users can **never** book or hold the exact same seat for the same show:
1. **Deterministic Deadlock Prevention**: Requested seat IDs are lexicographically sorted (`seatIds.sort()`) before acquiring database locks, eliminating cyclic waits.
2. **Pessimistic Row-Level Locking (`FOR UPDATE`)**: Handled inside PostgreSQL interactive transactions (`prisma.$transaction`).
3. **Compound Database Constraints**: `ShowSeatAllocation` enforces `@@unique([showId, seatId])` at the database engine level.
4. **Temporary 5-Minute Hold with Automatic Expiration**: Seats are held for 5 minutes during checkout. If a user abandons checkout or the timer expires, an inline sweeper immediately resets seat allocations back to `AVAILABLE`.

### 🔄 Live Shared Seat Availability Across All Users
Seat availability is synchronized through the PostgreSQL database as the single source of truth:
- **No Stale Views**: When User 1 reserves or books a seat, that seat updates to `RESERVED` or `BOOKED` for User 2 as well.
- **4-Second Live Polling**: The interactive seat selection screen queries `GET /api/shows/:id` every 4 seconds in the background.
- **Active Deselection & Collision Guard**: If User 2 is highlighting a seat that User 1 just reserved, User 2's selection is automatically cleared with an on-screen conflict notification.
- **Manual Sync**: An animated "Sync" button provides instantaneous on-demand refresh.
- **Voluntary Release**: Users on the checkout screen can click "Cancel & Release Seats" to immediately release their temporary hold without waiting for the 5-minute timeout.

### 💳 Idempotent Payment Simulation
- The frontend attaches a unique `idempotencyKey` per checkout session. Retried requests or accidental double-clicks safely return the existing confirmed booking without duplicate charges or database inconsistencies.
- Supports toggling between **Simulate Payment Success** and **Simulate Payment Failure**.
- Failed payment attempts can be safely retried before reservation expiration without unique constraint collisions.

### 🎟️ Self-Service Cancellation & Seat Reclamation
- Users can cancel confirmed bookings up to **2 hours** prior to showtime (`CANCELLATION_DEADLINE_HOURS = 2`).
- Cancellation atomically updates the booking to `CANCELLED`, timestamps `cancelledAt`, and immediately returns all auditorium seats back to `AVAILABLE`.

### 🛠️ Comprehensive Admin Dashboard
- **Live Metrics**: Total Confirmed Bookings, Gross Revenue (₹), Active Movies, and Scheduled Shows.
- **Movie Catalog Management**:
  - Add new movies with duration, genre, language, age rating, release date, and poster preview.
  - Edit existing movie details and change status between `NOW_SHOWING`, `UPCOMING`, and `ARCHIVED`.
  - Safely archive movies without breaking or deleting historical booking records.
- **Show Scheduling Engine**:
  - Automatically derives show `endTime` from movie duration (`durationMins`).
  - Strict auditorium conflict validation: Prevents scheduling overlapping shows on the same screen.
  - Generates full auditorium seat allocations automatically upon show creation.
  - Emergency show cancellation with automated booking cascades.
- **Global Bookings Audit**: Real-time search across all system bookings by booking reference, customer name, and status filter.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, React Router v7, Axios, Lucide React |
| **Backend** | Node.js v24, Express.js 4, Prisma ORM 5, PostgreSQL Client |
| **Database** | PostgreSQL 16 (configured via Docker Compose) |
| **Authentication** | JWT (JSON Web Tokens) with secure HTTP-only cookies & Bearer headers, Bcrypt password hashing (10 salt rounds) |
| **Validation** | Zod schema validation for all API request bodies, queries, and parameters |
| **Security** | Helmet HTTP headers, CORS credentials whitelist, express-rate-limit, strict IDOR ownership checks |
| **Containerization** | Docker Compose (`postgres:16-alpine` on port `5432`) |

---

## 3. Quick Start & Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or v24 recommended)
- [Docker Desktop](https://www.docker.com/) (for running PostgreSQL) OR local PostgreSQL on port `5432`

---

### Step 1: Start PostgreSQL with Docker
In the project root directory:
```bash
docker compose up -d
```
*(This launches `showbook-postgres` on port `5432` with username `postgres`, password `postgres`, and database `showbook`).*

---

### Step 2: Configure & Start Backend
1. Open a terminal in `server/`:
   ```bash
   cd server
   npm install
   ```
2. Verify or create `server/.env`:
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
3. Initialize database schema and seed realistic sample data:
   ```bash
   npx prisma db push
   npm run seed
   ```
4. Start backend server:
   ```bash
   npm run dev
   # Backend runs at http://localhost:5000
   ```

---

### Step 3: Configure & Start Frontend
1. In a separate terminal in `client/`:
   ```bash
   cd client
   npm install
   npm run dev
   # Frontend runs at http://localhost:5173
   ```
2. Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 4. Default Demo Accounts

The database includes three pre-configured accounts. Convenient **1-click quick-fill buttons** are provided directly on the Login page:

| Account | Email | Password | Role | Permissions & Scope |
|---|---|---|---|---|
| **Demo User 1** | `user@showbook.com` | `User@12345` | `USER` | Movie discovery, seat reservations, checkout, personal tickets |
| **Demo User 2** | `user2@showbook.com` | `User2@12345` | `USER` | Independent session for verifying shared live seat availability |
| **Demo Admin** | `admin@showbook.com` | `Admin@12345` | `ADMIN` | Catalog manager (Add/Edit/Archive), show scheduler, global audits |

---

## 5. Manual Verification & Demonstration Guide

### Test 1: Real-Time Shared Seat Availability (Concurrent Users)
1. Open **[http://localhost:5173](http://localhost:5173)** in your primary browser and log in as **Demo User 1**.
2. Open an **Incognito / Private Window** and log in as **Demo User 2**.
3. Have both users navigate to the exact same movie and showtime (e.g. *Stree 2* or *Dune: Part Two*).
4. User 1 selects seat `A5` and clicks **Proceed to Checkout**.
5. Observe User 2's screen: within 4 seconds (or immediately on clicking **Sync**), seat `A5` updates to **RESERVED** (amber/orange). User 2 cannot select it.
6. When User 1 completes checkout, the seat updates to **BOOKED** (red/gray) for User 2.
7. If User 1 clicks **Cancel & Release Seats** on the checkout page, the seat immediately returns to **AVAILABLE** (white/green) for User 2.

### Test 2: Admin Movie & Show Management
1. Log in as **Demo Admin** (`admin@showbook.com`).
2. Go to **Admin Dashboard**:
   - Inspect live booking counts and revenue.
   - Use the **Add Movie** tab to add a new movie (with title, description, duration, genre, language, age rating, and poster URL).
   - Click **Edit** on an existing movie to modify its release date, age rating, or toggle status (`NOW_SHOWING` ↔ `UPCOMING` ↔ `ARCHIVED`).
   - Use the **Schedule Show** tab to schedule a screening. The end time is automatically calculated from the movie duration. Notice that scheduling an overlapping show on the same screen is blocked.

### Test 3: Simulated Payment & Retry
1. As a regular user, hold 2 seats and proceed to checkout.
2. Select **Simulate Payment Failure** and click **Simulate Payment**.
3. The server safely records the failed attempt without dropping the reservation.
4. Select **Simulate Successful Payment** and click **Retry Payment**. The booking is confirmed, e-ticket is generated with QR code, and seats become permanently booked.

---

## 6. Automated Concurrency & Security Test Suite

The codebase includes an automated test suite powered by **Vitest** and **Supertest** in `server/tests/`:
```bash
cd server
npm test
```

### Verified Test Cases (16 Passing Tests):
- `CRITICAL`: Prevention of double-booking when two users simultaneously attempt to reserve the exact same seat (race condition stress test).
- Rejection of reservation requests for seats already held.
- Automatic release of expired reservations back to `AVAILABLE`.
- User registration, duplicate email rejection, and input validation.
- User authentication, password verification, and session management.
- Authorization barrier: Regular users are forbidden from accessing admin endpoints (HTTP 403).
- Strict ownership barrier: Users cannot view or cancel another user's booking receipts (HTTP 403 / IDOR prevention).
- Payment simulation with retry capability on failure.
- Idempotency guard on booking confirmation preventing duplicate records.
- Booking cancellation and immediate seat release back to `AVAILABLE`.

---

## 7. REST API Reference Summary

### Authentication (`/api/auth`)
- `POST /register`: Register user account (`name`, `email`, `password`)
- `POST /login`: Authenticate and receive JWT cookie + token payload
- `POST /logout`: Clear session cookie
- `GET /me`: Get authenticated profile
- `PATCH /me`: Update display name
- `PATCH /me/password`: Change password

### Movies (`/api/movies`)
- `GET /`: List movies with genre, language, and search filters
- `GET /filters`: Retrieve distinct genres and languages
- `GET /:id`: Retrieve movie details, scheduled theatres, and showtimes

### Shows & Auditorium Seating (`/api/shows`)
- `GET /`: List scheduled shows (supports date and status filters)
- `GET /:id`: Retrieve show details and full live interactive seat allocation matrix

### Reservations (`/api/reservations`)
- `POST /`: Atomically hold seats for 5 minutes (`showId`, `seatIds`) with row-level locks
- `GET /:id`: Inspect active reservation and expiry countdown
- `POST /:id/cancel`: Voluntarily release held seats back to the available pool

### Bookings (`/api/bookings`)
- `POST /reservations/:id/confirm`: Idempotent payment simulation and ticket confirmation
- `GET /my`: View current user's upcoming, past, and cancelled bookings
- `GET /:id`: View complete booking receipt with E-Ticket and QR code (IDOR-protected)
- `POST /:id/cancel`: Cancel booking and release seats back to auditorium ($\ge$ 2h before show)

### Administrator Operations (`/api/admin`)
- `GET /dashboard`: Aggregate business metrics (Bookings, Revenue, Movies, Shows)
- `GET /bookings`: Global bookings table with search and status filtering
- `POST /movies`: Add new movie to catalog
- `PATCH /movies/:id`: Update existing movie details and status
- `DELETE /movies/:id`: Archive movie safely
- `POST /shows`: Schedule show with automated temporal overlap validation
- `POST /shows/:id/cancel`: Cancel show with cascade to affected bookings

---

## 8. Project Structure

```
ShowBook/
├── docker-compose.yml              # PostgreSQL 16 Alpine container configuration
├── ARCHITECTURE_AND_WORKFLOW.md    # In-depth technical architecture and workflow specification
├── README.md                       # Setup guide and project overview
│
├── client/                         # React 19 + Vite 8 + Tailwind CSS Frontend
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Authentication state & session management
│   │   ├── services/
│   │   │   └── api.js              # Centralized Axios client with interceptors
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Responsive header with role-based navigation
│   │   │   ├── Footer.jsx          # Application footer
│   │   │   └── ProtectedRoute.jsx  # Route guard for Authenticated & Admin roles
│   │   ├── pages/
│   │   │   ├── HomePage.jsx        # Movie discovery, search & filtering
│   │   │   ├── MovieDetailsPage.jsx# Movie synopsis, theatres & showtimes
│   │   │   ├── SeatSelectionPage.jsx # 4s-polling seat layout & collision guard
│   │   │   ├── CheckoutPage.jsx    # 5-min timer, payment simulation & cancel hold
│   │   │   ├── BookingConfirmationPage.jsx # E-Ticket with QR code
│   │   │   ├── MyBookingsPage.jsx  # User booking history & self-service cancel
│   │   │   ├── ProfilePage.jsx     # User profile & password update
│   │   │   ├── LoginPage.jsx       # Login with 1-click demo buttons
│   │   │   ├── RegisterPage.jsx    # User registration
│   │   │   └── AdminDashboardPage.jsx # Movie/show management & global audit
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
└── server/                         # Node.js + Express + Prisma Backend
    ├── prisma/
    │   ├── schema.prisma           # Relational PostgreSQL schema
    │   └── seed.js                 # Realistic seed data and demo accounts
    ├── src/
    │   ├── controllers/            # Route controllers
    │   ├── services/               # Business logic & transactional engines
    │   ├── middleware/             # Auth, RBAC, Zod validation, rate limiter, error handler
    │   ├── validators/             # Zod input schemas
    │   ├── routes/                 # Express REST endpoints
    │   └── index.js                # Express app initialization
    ├── tests/                      # Concurrency & security test suites
    └── package.json
```
