const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');

class ShowService {
  async listShows({ movieId, theatreId, date, status }) {
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    } else if (!status) {
      where.status = 'OPEN';
      where.startTime = { gte: new Date() };
    }
    // If status === 'ALL', admin sees all scheduled, past, and cancelled shows

    if (movieId) {
      where.movieId = movieId;
    }

    if (theatreId) {
      where.screen = { theatreId };
    }

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      where.startTime = {
        gte: startOfDay > new Date() ? startOfDay : new Date(),
        lte: endOfDay,
      };
    }

    return prisma.show.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            posterUrl: true,
            language: true,
            genre: true,
            ageRating: true,
          },
        },
        screen: {
          include: {
            theatre: true,
          },
        },
      },
    });
  }

  async getShowById(showId) {
    // 1. First, automatically sweep any expired reservations for this show
    await this.sweepExpiredReservations(showId);

    // 2. Fetch show with seat allocations
    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: {
        movie: true,
        screen: {
          include: {
            theatre: true,
            seats: {
              orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
            },
          },
        },
        allocations: {
          select: {
            seatId: true,
            status: true,
            reservedUntil: true,
          },
        },
      },
    });

    if (!show) {
      throw new AppError('Show not found.', 404);
    }

    // Map allocations by seatId for instant lookup
    const allocationMap = new Map();
    for (const alloc of show.allocations) {
      allocationMap.set(alloc.seatId, alloc);
    }

    // Build the interactive seat layout grid
    const seatsWithStatus = show.screen.seats.map((seat) => {
      const alloc = allocationMap.get(seat.id);
      let status = 'AVAILABLE';

      if (alloc) {
        if (alloc.status === 'BOOKED') {
          status = 'BOOKED';
        } else if (alloc.status === 'RESERVED') {
          if (alloc.reservedUntil && new Date(alloc.reservedUntil) > new Date()) {
            status = 'RESERVED';
          } else {
            status = 'AVAILABLE';
          }
        }
      }

      const calculatedPrice = Math.round(show.basePrice * seat.priceMultiplier);

      return {
        id: seat.id,
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
        seatType: seat.seatType,
        priceMultiplier: seat.priceMultiplier,
        price: calculatedPrice,
        status,
      };
    });

    // Group seats by row for intuitive UI layout rendering
    const rowsMap = new Map();
    for (const seat of seatsWithStatus) {
      if (!rowsMap.has(seat.rowLabel)) {
        rowsMap.set(seat.rowLabel, []);
      }
      rowsMap.get(seat.rowLabel).push(seat);
    }

    const rows = Array.from(rowsMap.entries()).map(([rowLabel, seats]) => ({
      rowLabel,
      seats,
    }));

    return {
      id: show.id,
      startTime: show.startTime,
      endTime: show.endTime,
      basePrice: show.basePrice,
      status: show.status,
      movie: show.movie,
      theatre: show.screen.theatre,
      screen: {
        id: show.screen.id,
        name: show.screen.name,
        screenNumber: show.screen.screenNumber,
        totalSeats: show.screen.totalSeats,
      },
      rows,
      summary: {
        totalSeats: show.screen.totalSeats,
        availableSeats: seatsWithStatus.filter((s) => s.status === 'AVAILABLE').length,
        bookedSeats: seatsWithStatus.filter((s) => s.status === 'BOOKED').length,
        reservedSeats: seatsWithStatus.filter((s) => s.status === 'RESERVED').length,
      },
    };
  }

  async sweepExpiredReservations(showId) {
    const now = new Date();
    // Update expired reservations to EXPIRED
    await prisma.reservation.updateMany({
      where: {
        showId,
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // Release seat allocations
    await prisma.showSeatAllocation.updateMany({
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
  }

  async createShow({ movieId, screenId, startTime, endTime, basePrice }) {
    // 1. Verify movie exists in catalog
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movie) {
      throw new AppError('Movie not found. Please add the movie to the catalog first.', 404);
    }

    if (movie.status === 'ARCHIVED') {
      throw new AppError('Cannot schedule shows for an archived movie. Please change its status first.', 400);
    }

    const start = new Date(startTime);
    let end = endTime ? new Date(endTime) : new Date(start.getTime() + (movie.durationMins || 120) * 60 * 1000);

    if (start <= new Date()) {
      throw new AppError('Show start time must be in the future.', 400);
    }

    if (end <= start) {
      throw new AppError('Show end time must be after start time.', 400);
    }

    // 2. Verify screen exists
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      include: { seats: true },
    });

    if (!screen) {
      throw new AppError('Screen not found.', 404);
    }

    // Check for conflicting shows on the same screen
    const conflict = await prisma.show.findFirst({
      where: {
        screenId,
        status: 'OPEN',
        OR: [
          {
            startTime: { lte: start },
            endTime: { gt: start },
          },
          {
            startTime: { lt: end },
            endTime: { gte: end },
          },
          {
            startTime: { gte: start },
            endTime: { lte: end },
          },
        ],
      },
    });

    if (conflict) {
      throw new AppError(
        `Scheduling conflict: Another show is already scheduled on this screen between ${conflict.startTime.toISOString()} and ${conflict.endTime.toISOString()}.`,
        409
      );
    }

    // Create Show and initialize ShowSeatAllocation for all seats in screen
    return prisma.$transaction(async (tx) => {
      const show = await tx.show.create({
        data: {
          movieId,
          screenId,
          startTime: start,
          endTime: end,
          basePrice,
          status: 'OPEN',
        },
      });

      if (screen.seats.length > 0) {
        const allocations = screen.seats.map((seat) => ({
          showId: show.id,
          seatId: seat.id,
          status: 'AVAILABLE',
        }));
        await tx.showSeatAllocation.createMany({ data: allocations });
      }

      return show;
    });
  }

  async cancelShow(showId) {
    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: { bookings: true },
    });

    if (!show) {
      throw new AppError('Show not found.', 404);
    }

    return prisma.$transaction(async (tx) => {
      // Mark show as CANCELLED
      const updatedShow = await tx.show.update({
        where: { id: showId },
        data: { status: 'CANCELLED' },
      });

      // Mark all confirmed bookings for this show as CANCELLED
      await tx.booking.updateMany({
        where: { showId, status: 'CONFIRMED' },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      // Free all seat allocations
      await tx.showSeatAllocation.updateMany({
        where: { showId },
        data: {
          status: 'AVAILABLE',
          bookingId: null,
          reservationId: null,
          reservedUntil: null,
        },
      });

      return {
        show: updatedShow,
        affectedBookingsCount: show.bookings.length,
      };
    });
  }
}

module.exports = new ShowService();
