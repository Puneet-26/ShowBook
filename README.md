# ShowBook — Movie Ticket Booking Platform

ShowBook is a full-stack, BookMyShow-inspired movie ticket booking web application built for college Full Stack Development mini-project evaluation. While featuring a clean, responsive UI, ShowBook's core strength is its **robust backend engineering**, **race-condition-safe seat reservation engine**, **PostgreSQL transactional row-level locking**, **idempotent payment simulation**, and **role-based security**.

---

## 1. Technology Stack

- **Frontend**: React.js 19 with Vite 8 & Tailwind CSS v4
- **Backend**: Node.js v24 with Express.js 4
- **Database**: PostgreSQL 18
- **ORM**: Prisma ORM 5
- **Authentication**: JWT (JSON Web Tokens) with secure HTTP-only cookies & Bcrypt password hashing
- **Validation**: Zod schema validation for all incoming API payloads
- **Security**: Helmet HTTP headers, CORS credentials whitelist, express-rate-limit
- **Testing**: Vitest & Supertest with automated concurrency stress testing

---

## 2. Key Architecture & Features

### A. Concurrency & Race-Condition-Proof Double-Booking Prevention
Two concurrent users can never book or reserve the same seat for the same show:
1. **Deadlock Prevention**: Selected seat IDs are sorted deterministically (`seatIds.sort()`) before acquiring locks.
2. **Pessimistic Row-Level Locking (`FOR UPDATE`)**: Handled inside PostgreSQL interactive transactions (`prisma.$transaction`).
3. **Compound Database Constraints**: `ShowSeatAllocation` enforces `@@unique([showId, seatId])`.
4. **Temporary 5-Minute Hold with Automatic Expiration**: Seats are held for 5 minutes. If a user leaves or the timer expires, the backend automatically sweeps expired holds and re-allocates seats to `AVAILABLE`.

### B. Idempotent Payment Simulation
- The frontend issues an `idempotencyKey` per checkout session. Retried requests or accidental double-clicks safely return the existing confirmed booking without duplicate charges or database inconsistencies.
- Supports simulating **Successful Payment** or **Failed Payment** (to demonstrate recovery and retry).

### C. Booking Cancellation & Seat Reclamation
- Users can cancel eligible bookings up to 2 hours prior to showtime.
- Cancellation atomically marks the booking as `CANCELLED`, records `cancelledAt`, and immediately frees the associated seat allocations in the auditorium.

### D. User Authentication & Authorization
- Salted bcrypt password hashing (10 rounds).
- HTTP-only cookie and Bearer header token support.
- Role-based authorization (`USER` vs `ADMIN`).
- Strict ownership checks: Users can never access or cancel another user's bookings.

### E. Admin Dashboard
- Live dashboard metrics: Movies, Theatres, Screens, Shows, Confirmed Bookings, and Total Revenue.
- Global bookings inspector with real-time search by booking reference, customer name, and status filter.
- Movie catalog manager (Add, View Details, Edit, and Safe Archive/Restore).
- Show scheduling with conflict validation (prevents scheduling overlapping shows on the same auditorium screen).
- Emergency show cancellation (automatically cascades cancellations to affected bookings).

---

## 3. Quick Start & Local Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL running on port `5432`

### Backend Setup
1. Open terminal in `server/`:
   ```bash
   cd server
   npm install
   ```
2. Configure `.env`:
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
3. Push database schema and seed realistic sample data:
   ```bash
   npx prisma db push
   npm run seed
   ```
4. Start backend server:
   ```bash
   npm run dev
   # Server runs at http://localhost:5000
   ```

### Frontend Setup
1. Open terminal in `client/`:
   ```bash
   cd client
   npm install
   npm run dev
   # Client runs at http://localhost:5173
   ```

---

## 4. Default Seed Accounts

The database seed (`npm run seed`) populates realistic movies, theatres, screens, shows, and default accounts:

| Role | Email | Password |
|---|---|---|
| **Demo User** | `user@showbook.com` | `User@12345` |
| **System Admin** | `admin@showbook.com` | `Admin@12345` |

*(Convenient one-click fill buttons are provided directly on the Login page for rapid demonstration).*

---

## 5. Automated Concurrency & Security Test Suite

Run the automated test suite in `server/`:
```bash
cd server
npm test
```

### Verified Test Cases (16 Passing Tests):
- `CRITICAL`: Prevention of double-booking when two users simultaneously attempt to reserve the exact same seat.
- Verification that seats already reserved cannot be acquired by another user.
- Automatic release of expired reservations and re-booking capability.
- User registration, input validation, and duplicate email prevention.
- User authentication, password verification, and session management.
- Authorization barrier: Regular users are forbidden from accessing admin endpoints (HTTP 403).
- Strict ownership barrier: Users cannot view or access another user's booking receipts (HTTP 403).
- Payment simulation with retry on failure.
- Idempotency guard on booking confirmation preventing duplicate records.
- Booking cancellation and immediate seat release back to `AVAILABLE`.

---

## 6. API Reference Summary

### Authentication (`/api/auth`)
- `POST /register`: Register user (`name`, `email`, `password`)
- `POST /login`: Log in and receive JWT token
- `POST /logout`: Clear session
- `GET /me`: Get authenticated profile
- `PATCH /me`: Update profile name
- `PATCH /me/password`: Change password

### Movies (`/api/movies`)
- `GET /`: List movies with genre, language, and title search filters
- `GET /filters`: Retrieve distinct genres and languages
- `GET /:id`: Get movie details with scheduled theatres and showtimes

### Shows & Seats (`/api/shows`)
- `GET /`: List scheduled shows
- `GET /:id`: Retrieve show details and real-time interactive auditorium seat layout

### Reservations (`/api/reservations`)
- `POST /`: Atomically hold seats for 5 minutes (`showId`, `seatIds`)
- `GET /:id`: Inspect active reservation & expiry countdown
- `POST /:id/cancel`: Manually release reservation

### Bookings (`/api/bookings`)
- `POST /reservations/:id/confirm`: Process simulated payment & generate confirmed booking
- `GET /my`: View user's upcoming, past, and cancelled bookings
- `GET /:id`: View complete booking receipt with E-Ticket & QR code
- `POST /:id/cancel`: Cancel booking and release seats back to auditorium

### Admin (`/api/admin`)
- `GET /dashboard`: Aggregate metrics & recent bookings
- `GET /bookings`: Global bookings table with search & status filters
- `POST /movies`: Add new movie
- `DELETE /movies/:id`: Archive movie
- `POST /shows`: Schedule show with automated conflict validation
- `POST /shows/:id/cancel`: Cancel show and refund bookings
