const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');

class MovieService {
  async listMovies({ search, genre, language, status }) {
    const where = {};

    if (status) {
      where.status = status;
    } else {
      // By default return active movies
      where.status = { in: ['NOW_SHOWING', 'UPCOMING'] };
    }

    if (genre && genre !== 'ALL') {
      where.genre = { equals: genre, mode: 'insensitive' };
    }

    if (language && language !== 'ALL') {
      where.language = { equals: language, mode: 'insensitive' };
    }

    if (search && search.trim() !== '') {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const movies = await prisma.movie.findMany({
      where,
      orderBy: { releaseDate: 'desc' },
      include: {
        shows: {
          where: {
            status: 'OPEN',
            startTime: { gte: new Date() },
          },
          select: { id: true },
        },
      },
    });

    return movies.map((movie) => ({
      ...movie,
      activeShowsCount: movie.shows.length,
      shows: undefined,
    }));
  }

  async getMovieById(id) {
    const movie = await prisma.movie.findUnique({
      where: { id },
      include: {
        shows: {
          where: {
            status: 'OPEN',
            startTime: { gte: new Date() },
          },
          orderBy: { startTime: 'asc' },
          include: {
            screen: {
              include: {
                theatre: true,
              },
            },
          },
        },
      },
    });

    if (!movie) {
      throw new AppError('Movie not found.', 404);
    }

    // Group shows by Theatre for easy UI presentation
    const theatreMap = new Map();
    for (const show of movie.shows) {
      const theatre = show.screen.theatre;
      if (!theatreMap.has(theatre.id)) {
        theatreMap.set(theatre.id, {
          id: theatre.id,
          name: theatre.name,
          location: theatre.location,
          address: theatre.address,
          city: theatre.city,
          shows: [],
        });
      }
      theatreMap.get(theatre.id).shows.push({
        id: show.id,
        screenId: show.screenId,
        screenName: show.screen.name,
        screenNumber: show.screen.screenNumber,
        startTime: show.startTime,
        endTime: show.endTime,
        basePrice: show.basePrice,
        status: show.status,
      });
    }

    return {
      ...movie,
      theatres: Array.from(theatreMap.values()),
    };
  }

  async createMovie(data) {
    return prisma.movie.create({
      data: {
        title: data.title,
        description: data.description,
        genre: data.genre,
        language: data.language,
        durationMins: data.durationMins,
        releaseDate: new Date(data.releaseDate),
        posterUrl: data.posterUrl,
        ageRating: data.ageRating,
        status: data.status || 'NOW_SHOWING',
      },
    });
  }

  async updateMovie(id, data) {
    const existing = await prisma.movie.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Movie not found.', 404);
    }

    return prisma.movie.update({
      where: { id },
      data: {
        ...data,
        ...(data.releaseDate ? { releaseDate: new Date(data.releaseDate) } : {}),
      },
    });
  }

  async deleteMovie(id) {
    const existing = await prisma.movie.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Movie not found.', 404);
    }

    // Soft archive or cascade delete if no bookings
    const activeShows = await prisma.show.count({
      where: {
        movieId: id,
        status: 'OPEN',
        startTime: { gte: new Date() },
      },
    });

    if (activeShows > 0) {
      return prisma.movie.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });
    }

    return prisma.movie.delete({ where: { id } });
  }

  async getFilterOptions() {
    const genres = await prisma.movie.findMany({
      distinct: ['genre'],
      select: { genre: true },
      where: { status: { in: ['NOW_SHOWING', 'UPCOMING'] } },
    });

    const languages = await prisma.movie.findMany({
      distinct: ['language'],
      select: { language: true },
      where: { status: { in: ['NOW_SHOWING', 'UPCOMING'] } },
    });

    return {
      genres: genres.map((g) => g.genre),
      languages: languages.map((l) => l.language),
    };
  }
}

module.exports = new MovieService();
