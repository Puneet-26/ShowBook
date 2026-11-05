const prisma = require('../config/prisma');
const { CANCELLATION_DEADLINE_HOURS } = require('../config/constants');
const { AppError } = require('../middleware/errorHandler');

class BookingService {
  /**
   * Confirms a reservation with simulated payment and idempotency guard
   */
  async confirmBookingAndSimulatePayment({
    userId,
    reservationId,
    idempotencyKey,
    simulatePaymentStatus = 'SUCCESS',
  }) {
    // 1. Check idempotency: If this exact request already succeeded, return the confirmed booking
    const existingPayment = await prisma.paymentAttempt.findUnique({
      where: { idempotencyKey },
    });

    if (existingPayment && existingPayment.status === 'SUCCESS') {
      const existingBooking = await prisma.booking.findFirst({
        where: { reservationId },
        include: {
          show: {
            include: {
              movie: true,
              screen: { include: { theatre: true } },
            },
          },
          seats: true,
        },
      });
      if (existingBooking) {
        return this.formatBookingResponse(existingBooking);
      }
    }

    return prisma.$transaction(
      async (tx) => {
        // 2. Lock the Reservation row exclusively
        const [reservation] = await tx.$queryRaw`
          SELECT * FROM "Reservation"
          WHERE "id" = ${reservationId}
          FOR UPDATE
        `;

        if (!reservation) {
          throw new AppError('Reservation not found.', 404);
        }

        if (reservation.userId !== userId) {
          throw new AppError('Unauthorized access to this reservation.', 403);
        }

        if (reservation.status === 'CONFIRMED') {
          // Already confirmed, return existing booking
          const confirmedBooking = await tx.booking.findFirst({
            where: { reservationId },
            include: {
              show: {
                include: {
                  movie: true,
                  screen: { include: { theatre: true } },
                },
              },
              seats: true,
            },
          });
          return this.formatBookingResponse(confirmedBooking);
        }

        if (reservation.status !== 'PENDING') {
          throw new AppError(
            `Cannot confirm this reservation because its status is ${reservation.status}.`,
            400
          );
        }

        // 3. Verify reservation has not expired
        const now = new Date();
        if (new Date(reservation.expiresAt) <= now) {
          // Mark expired and release seats
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

          throw new AppError(
            'Your reservation has expired (5-minute limit exceeded). Seats have been released.',
            410
          );
        }

        // 4. Record or handle simulated payment
        if (simulatePaymentStatus === 'FAILED') {
          await tx.paymentAttempt.upsert({
            where: { idempotencyKey },
            update: {
              status: 'FAILED',
              transactionRef: `FAIL-${Date.now()}`,
            },
            create: {
              reservationId,
              idempotencyKey,
              amount: reservation.totalAmount,
              status: 'FAILED',
              provider: 'SIMULATED',
              transactionRef: `FAIL-${Date.now()}`,
            },
          });

          throw new AppError(
            'Simulated payment failed. Your reservation is still valid until the timer expires. Please retry payment.',
            402
          );
        }

        // 5. Successful payment: Transition to confirmed Booking
        const bookingRef = `SB-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const booking = await tx.booking.create({
          data: {
            bookingRef,
            userId,
            showId: reservation.showId,
            reservationId: reservation.id,
            totalAmount: reservation.totalAmount,
            status: 'CONFIRMED',
          },
        });

        // 6. Fetch reservation seats to snapshot into BookingSeat
        const reservationSeats = await tx.reservationSeat.findMany({
          where: { reservationId },
          include: { seat: true },
        });

        const bookingSeatsData = reservationSeats.map((rs) => ({
          bookingId: booking.id,
          seatId: rs.seatId,
          seatNumber: `${rs.seat.rowLabel}${rs.seat.seatNumber}`,
          seatType: rs.seat.seatType,
          price: rs.price,
        }));

        await tx.bookingSeat.createMany({
          data: bookingSeatsData,
        });

        // 7. Make seats permanently BOOKED for this show
        await tx.showSeatAllocation.updateMany({
          where: {
            showId: reservation.showId,
            reservationId: reservation.id,
          },
          data: {
            status: 'BOOKED',
            bookingId: booking.id,
            reservationId: null,
            reservedUntil: null,
          },
        });

        // 8. Update Reservation status to CONFIRMED
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'CONFIRMED' },
        });

        // 9. Record Payment Attempt
        const transactionRef = `SIM-TXN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        await tx.paymentAttempt.upsert({
          where: { idempotencyKey },
          update: {
            status: 'SUCCESS',
            transactionRef,
          },
          create: {
            reservationId: reservation.id,
            idempotencyKey,
            amount: reservation.totalAmount,
            status: 'SUCCESS',
            provider: 'SIMULATED',
            transactionRef,
          },
        });

        // 10. Fetch complete booking with relations for response
        const fullBooking = await tx.booking.findUnique({
          where: { id: booking.id },
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
            seats: true,
          },
        });

        return this.formatBookingResponse(fullBooking, transactionRef);
      },
      { timeout: 12000 }
    );
  }

  async getUserBookings(userId) {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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
        seats: true,
      },
    });

    const now = new Date();

    return bookings.map((b) => {
      const showStartTime = new Date(b.show.startTime);
      const isPast = showStartTime < now;
      const cancellationCutoff = new Date(
        showStartTime.getTime() - CANCELLATION_DEADLINE_HOURS * 3600000
      );
      const isCancellable = b.status === 'CONFIRMED' && now < cancellationCutoff;

      return {
        id: b.id,
        bookingRef: b.bookingRef,
        status: b.status,
        totalAmount: b.totalAmount,
        createdAt: b.createdAt,
        cancelledAt: b.cancelledAt,
        isPast,
        isCancellable,
        movie: {
          id: b.show.movie.id,
          title: b.show.movie.title,
          posterUrl: b.show.movie.posterUrl,
          language: b.show.movie.language,
          ageRating: b.show.movie.ageRating,
        },
        theatre: {
          name: b.show.screen.theatre.name,
          location: b.show.screen.theatre.location,
          city: b.show.screen.theatre.city,
        },
        screen: b.show.screen.name,
        showTime: b.show.startTime,
        seats: b.seats.map((s) => s.seatNumber),
        ticketCount: b.seats.length,
      };
    });
  }

  async getBookingById({ bookingId, userId, isAdmin = false }) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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
        seats: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    // Strict ownership validation: only booking owner or admin can view
    if (!isAdmin && booking.userId !== userId) {
      throw new AppError('Unauthorized access. You do not own this booking.', 403);
    }

    return this.formatBookingResponse(booking);
  }

  async cancelBooking({ bookingId, userId }) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        show: true,
        seats: true,
      },
    });

    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    // Verify ownership
    if (booking.userId !== userId) {
      throw new AppError('Unauthorized access.', 403);
    }

    if (booking.status === 'CANCELLED') {
      throw new AppError('This booking is already cancelled.', 400);
    }

    // Verify cancellation policy (at least 2 hours before show)
    const now = new Date();
    const showStartTime = new Date(booking.show.startTime);
    const cancellationDeadline = new Date(
      showStartTime.getTime() - CANCELLATION_DEADLINE_HOURS * 3600000
    );

    if (now >= cancellationDeadline) {
      throw new AppError(
        `Bookings can only be cancelled up to ${CANCELLATION_DEADLINE_HOURS} hours before showtime.`,
        400
      );
    }

    return prisma.$transaction(async (tx) => {
      // 1. Mark booking as CANCELLED
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
        },
      });

      // 2. Release allocated seats back to AVAILABLE for this show
      const seatIds = booking.seats.map((s) => s.seatId);

      await tx.showSeatAllocation.updateMany({
        where: {
          showId: booking.showId,
          seatId: { in: seatIds },
        },
        data: {
          status: 'AVAILABLE',
          bookingId: null,
          reservationId: null,
          reservedUntil: null,
        },
      });

      return {
        message: 'Booking successfully cancelled. Refund of simulated payment initiated.',
        bookingRef: updatedBooking.bookingRef,
        cancelledAt: updatedBooking.cancelledAt,
        status: updatedBooking.status,
      };
    });
  }

  formatBookingResponse(b, transactionRef = null) {
    const showStartTime = new Date(b.show.startTime);
    const now = new Date();
    const isCancellable =
      b.status === 'CONFIRMED' &&
      now < new Date(showStartTime.getTime() - CANCELLATION_DEADLINE_HOURS * 3600000);

    // QR payload contains verification details without exposing sensitive passwords or tokens
    const qrData = JSON.stringify({
      ref: b.bookingRef,
      showId: b.show.id,
      seats: b.seats.map((s) => s.seatNumber),
      verified: true,
    });

    return {
      id: b.id,
      bookingRef: b.bookingRef,
      status: b.status,
      totalAmount: b.totalAmount,
      createdAt: b.createdAt,
      cancelledAt: b.cancelledAt,
      isCancellable,
      transactionRef: transactionRef || 'SIM-PAY-PROCESSED',
      qrData,
      movie: {
        id: b.show.movie.id,
        title: b.show.movie.title,
        posterUrl: b.show.movie.posterUrl,
        genre: b.show.movie.genre,
        language: b.show.movie.language,
        durationMins: b.show.movie.durationMins,
        ageRating: b.show.movie.ageRating,
      },
      theatre: {
        name: b.show.screen.theatre.name,
        location: b.show.screen.theatre.location,
        address: b.show.screen.theatre.address,
        city: b.show.screen.theatre.city,
      },
      screen: {
        name: b.show.screen.name,
        screenNumber: b.show.screen.screenNumber,
      },
      showTime: b.show.startTime,
      seats: b.seats.map((s) => ({
        seatNumber: s.seatNumber,
        seatType: s.seatType,
        price: s.price,
      })),
      user: b.user
        ? {
            name: b.user.name,
            email: b.user.email,
          }
        : undefined,
    };
  }
}

module.exports = new BookingService();
