const prisma = require('../config/prisma');
const movieService = require('../services/movie.service');
const theatreService = require('../services/theatre.service');
const showService = require('../services/show.service');

class AdminController {
  async getDashboardStats(req, res, next) {
    try {
      const [
        movieCount,
        theatreCount,
        screenCount,
        activeShowsCount,
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        revenueAggregate,
        recentBookings,
      ] = await Promise.all([
        prisma.movie.count(),
        prisma.theatre.count(),
        prisma.screen.count(),
        prisma.show.count({ where: { status: 'OPEN', startTime: { gte: new Date() } } }),
        prisma.booking.count(),
        prisma.booking.count({ where: { status: 'CONFIRMED' } }),
        prisma.booking.count({ where: { status: 'CANCELLED' } }),
        prisma.booking.aggregate({
          where: { status: 'CONFIRMED' },
          _sum: { totalAmount: true },
        }),
        prisma.booking.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, email: true } },
            show: {
              include: {
                movie: { select: { title: true } },
                screen: { include: { theatre: { select: { name: true } } } },
              },
            },
            seats: true,
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          stats: {
            movies: movieCount,
            theatres: theatreCount,
            screens: screenCount,
            activeShows: activeShowsCount,
            totalBookings,
            confirmedBookings,
            cancelledBookings,
            totalRevenue: revenueAggregate._sum.totalAmount || 0,
          },
          recentBookings: recentBookings.map((b) => ({
            id: b.id,
            bookingRef: b.bookingRef,
            user: b.user.name,
            email: b.user.email,
            movie: b.show.movie.title,
            theatre: b.show.screen.theatre.name,
            seats: b.seats.map((s) => s.seatNumber),
            amount: b.totalAmount,
            status: b.status,
            createdAt: b.createdAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllBookings(req, res, next) {
    try {
      const { status, search } = req.query;
      const where = {};

      if (status && status !== 'ALL') {
        where.status = status;
      }

      if (search && search.trim() !== '') {
        const query = search.trim();
        where.OR = [
          { bookingRef: { contains: query, mode: 'insensitive' } },
          { user: { email: { contains: query, mode: 'insensitive' } } },
          { user: { name: { contains: query, mode: 'insensitive' } } },
          { show: { movie: { title: { contains: query, mode: 'insensitive' } } } },
        ];
      }

      const bookings = await prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          show: {
            include: {
              movie: { select: { id: true, title: true, posterUrl: true } },
              screen: {
                include: { theatre: { select: { id: true, name: true, location: true } } },
              },
            },
          },
          seats: true,
        },
      });

      res.status(200).json({
        success: true,
        count: bookings.length,
        data: {
          bookings: bookings.map((b) => ({
            id: b.id,
            bookingRef: b.bookingRef,
            status: b.status,
            totalAmount: b.totalAmount,
            createdAt: b.createdAt,
            cancelledAt: b.cancelledAt,
            user: b.user,
            movie: b.show.movie,
            theatre: b.show.screen.theatre,
            screen: b.show.screen.name,
            showTime: b.show.startTime,
            seats: b.seats.map((s) => s.seatNumber),
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async createMovie(req, res, next) {
    try {
      const movie = await movieService.createMovie(req.body);
      res.status(201).json({
        success: true,
        message: 'Movie added successfully.',
        data: { movie },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMovie(req, res, next) {
    try {
      const movie = await movieService.updateMovie(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Movie updated successfully.',
        data: { movie },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteMovie(req, res, next) {
    try {
      await movieService.deleteMovie(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Movie removed/archived successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  async createTheatre(req, res, next) {
    try {
      const theatre = await theatreService.createTheatre(req.body);
      res.status(201).json({
        success: true,
        message: 'Theatre created successfully.',
        data: { theatre },
      });
    } catch (error) {
      next(error);
    }
  }

  async createScreen(req, res, next) {
    try {
      const theatre = await theatreService.createScreen(req.params.theatreId, req.body);
      res.status(201).json({
        success: true,
        message: 'Screen added to theatre successfully.',
        data: { theatre },
      });
    } catch (error) {
      next(error);
    }
  }

  async createShow(req, res, next) {
    try {
      const show = await showService.createShow(req.body);
      res.status(201).json({
        success: true,
        message: 'Show scheduled successfully.',
        data: { show },
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelShow(req, res, next) {
    try {
      const result = await showService.cancelShow(req.params.id);
      res.status(200).json({
        success: true,
        message: `Show cancelled successfully. ${result.affectedBookingsCount} booking(s) marked cancelled.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
