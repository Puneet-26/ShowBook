const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const { RESERVATION_EXPIRY_MINUTES } = require('../config/constants');
const { AppError } = require('../middleware/errorHandler');

class ReservationService {
  /**
   * Concurrency-safe seat reservation using PostgreSQL row-level locks
   */
  async createReservation({ userId, showId, seatIds }) {
    if (!seatIds || seatIds.length === 0) {
      throw new AppError('At least one seat must be selected.', 400);
    }

    // 1. Deadlock prevention: sort seat IDs deterministically and deduplicate
    const uniqueSortedSeatIds = [...new Set(seatIds)].sort();

    return prisma.$transaction(
      async (tx) => {
        // 2. Validate show exists, is OPEN, and start time is in the future
        const show = await tx.show.findUnique({
          where: { id: showId },
          include: {
            movie: { select: { title: true } },
            screen: { select: { name: true, theatre: { select: { name: true } } } },
          },
        });

        if (!show) {
          throw new AppError('Show not found.', 404);
        }

        if (show.status !== 'OPEN') {
          throw new AppError('This show is no longer open for booking.', 400);
        }

        if (new Date(show.startTime) <= new Date()) {
          throw new AppError('Bookings are closed for past or ongoing shows.', 400);
        }

        const now = new Date();

        // 3. Clear any expired reservations for this show within the transaction
        await tx.showSeatAllocation.updateMany({
          where: {
            showId,
            status: 'RESERVED',
            reservedUntil: { lte: now },
          },
          data: {
            status: 'AVAILABLE',
            reservationId: null,
            reservedUntil: null,
          },
        });

        await tx.reservation.updateMany({
          where: {
            showId,
            status: 'PENDING',
            expiresAt: { lte: now },
          },
          data: {
            status: 'EXPIRED',
          },
        });

        // 4. Lock the selected seat allocation rows using PostgreSQL FOR UPDATE
        // This guarantees that concurrent transactions for the same seats will queue up
        // and only the first one to acquire the lock will succeed.
        const lockedAllocations = await tx.$queryRaw`
          SELECT ssa."id", ssa."seatId", ssa."status", ssa."reservedUntil",
                 s."rowLabel", s."seatNumber", s."seatType", s."priceMultiplier"
          FROM "ShowSeatAllocation" ssa
          JOIN "Seat" s ON s."id" = ssa."seatId"
          WHERE ssa."showId" = ${showId}
            AND ssa."seatId" IN (${Prisma.join(uniqueSortedSeatIds)})
          ORDER BY ssa."seatId" ASC
          FOR UPDATE
        `;

        if (lockedAllocations.length !== uniqueSortedSeatIds.length) {
          throw new AppError(
            'One or more requested seats do not exist in this auditorium.',
            400
          );
        }

        // 5. Inspect seat statuses strictly
        const unavailable = [];
        let totalAmount = 0;
        const seatBreakdown = [];

        for (const alloc of lockedAllocations) {
          if (alloc.status !== 'AVAILABLE') {
            unavailable.push(`${alloc.rowLabel}${alloc.seatNumber}`);
          }

          const price = Math.round(show.basePrice * alloc.priceMultiplier);
          totalAmount += price;
          seatBreakdown.push({
            seatId: alloc.seatId,
            label: `${alloc.rowLabel}${alloc.seatNumber}`,
            type: alloc.seatType,
            price,
          });
        }

        if (unavailable.length > 0) {
          throw new AppError(
            `Seat(s) ${unavailable.join(', ')} are currently unavailable. Please select different seats.`,
            409,
            { unavailableSeats: unavailable }
          );
        }

        // 6. Generate reservation details and expiry window
        const reservationRef = `RES-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const expiresAt = new Date(now.getTime() + RESERVATION_EXPIRY_MINUTES * 60 * 1000);

        const reservation = await tx.reservation.create({
          data: {
            reservationRef,
            userId,
            showId,
            totalAmount,
            expiresAt,
            status: 'PENDING',
          },
        });

        // 7. Create ReservationSeat records
        const reservationSeatInserts = seatBreakdown.map((s) => ({
          reservationId: reservation.id,
          seatId: s.seatId,
          price: s.price,
        }));

        await tx.reservationSeat.createMany({
          data: reservationSeatInserts,
        });

        // 8. Update locked allocations to RESERVED
        await tx.showSeatAllocation.updateMany({
          where: {
            showId,
            seatId: { in: uniqueSortedSeatIds },
          },
          data: {
            status: 'RESERVED',
            reservationId: reservation.id,
            reservedUntil: expiresAt,
          },
        });

        return {
          id: reservation.id,
          reservationRef: reservation.reservationRef,
          expiresAt: reservation.expiresAt,
          totalAmount: reservation.totalAmount,
          status: reservation.status,
          movieTitle: show.movie.title,
          theatreName: show.screen.theatre.name,
          screenName: show.screen.name,
          startTime: show.startTime,
          seats: seatBreakdown,
        };
      },
      {
        // Set PostgreSQL transaction timeout to 10 seconds
        timeout: 10000,
      }
    );
  }

  async getReservationById({ reservationId, userId }) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        show: {
          include: {
            movie: true,
            screen: {
              include: {
                theatre: true,
              },
            },
          },
        },
        seats: {
          include: {
            seat: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new AppError('Reservation not found.', 404);
    }

    if (reservation.userId !== userId) {
      throw new AppError('Unauthorized access to this reservation.', 403);
    }

    // Check if expired
    const isExpired = reservation.status === 'PENDING' && new Date(reservation.expiresAt) <= new Date();
    if (isExpired) {
      await prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: 'EXPIRED' },
        });
        await tx.showSeatAllocation.updateMany({
          where: { reservationId, status: 'RESERVED' },
          data: {
            status: 'AVAILABLE',
            reservationId: null,
            reservedUntil: null,
          },
        });
      });
      reservation.status = 'EXPIRED';
    }

    return {
      id: reservation.id,
      reservationRef: reservation.reservationRef,
      status: reservation.status,
      totalAmount: reservation.totalAmount,
      expiresAt: reservation.expiresAt,
      isExpired: reservation.status === 'EXPIRED',
      movie: {
        title: reservation.show.movie.title,
        posterUrl: reservation.show.movie.posterUrl,
        language: reservation.show.movie.language,
      },
      theatre: {
        name: reservation.show.screen.theatre.name,
        location: reservation.show.screen.theatre.location,
      },
      screen: reservation.show.screen.name,
      startTime: reservation.show.startTime,
      seats: reservation.seats.map((s) => ({
        seatId: s.seatId,
        label: `${s.seat.rowLabel}${s.seat.seatNumber}`,
        seatType: s.seat.seatType,
        price: s.price,
      })),
    };
  }

  async cancelReservation({ reservationId, userId }) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new AppError('Reservation not found.', 404);
    }

    if (reservation.userId !== userId) {
      throw new AppError('Unauthorized.', 403);
    }

    if (reservation.status !== 'PENDING') {
      return { message: 'Reservation is not active.' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED' },
      });

      await tx.showSeatAllocation.updateMany({
        where: { reservationId, status: 'RESERVED' },
        data: {
          status: 'AVAILABLE',
          reservationId: null,
          reservedUntil: null,
        },
      });
    });

    return { message: 'Reservation released successfully.' };
  }
}

module.exports = new ReservationService();
