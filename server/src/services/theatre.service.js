const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');

class TheatreService {
  async listTheatres() {
    return prisma.theatre.findMany({
      include: {
        screens: {
          select: {
            id: true,
            screenNumber: true,
            name: true,
            totalSeats: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getTheatreById(id) {
    const theatre = await prisma.theatre.findUnique({
      where: { id },
      include: {
        screens: {
          include: {
            seats: {
              orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
            },
          },
        },
      },
    });

    if (!theatre) {
      throw new AppError('Theatre not found.', 404);
    }

    return theatre;
  }

  async createTheatre(data) {
    return prisma.theatre.create({
      data: {
        name: data.name,
        location: data.location,
        address: data.address,
        city: data.city,
      },
    });
  }

  async createScreen(theatreId, { screenNumber, name, seatRows = 6, seatsPerRow = 8 }) {
    const theatre = await prisma.theatre.findUnique({ where: { id: theatreId } });
    if (!theatre) {
      throw new AppError('Theatre not found.', 404);
    }

    const totalSeats = seatRows * seatsPerRow;
    const screen = await prisma.screen.create({
      data: {
        theatreId,
        screenNumber,
        name,
        totalSeats,
      },
    });

    // Auto-generate standard seats for the screen
    const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const seatInserts = [];

    for (let r = 0; r < Math.min(seatRows, rowLetters.length); r++) {
      const rowLabel = rowLetters[r];
      let seatType = 'REGULAR';
      let priceMultiplier = 1.0;

      if (r >= 2 && r <= 3) {
        seatType = 'PREMIUM';
        priceMultiplier = 1.4;
      } else if (r >= 4) {
        seatType = 'VIP';
        priceMultiplier = 1.8;
      }

      for (let s = 1; s <= seatsPerRow; s++) {
        seatInserts.push({
          screenId: screen.id,
          rowLabel,
          seatNumber: s,
          seatType,
          priceMultiplier,
        });
      }
    }

    await prisma.seat.createMany({ data: seatInserts });

    return this.getTheatreById(theatreId);
  }
}

module.exports = new TheatreService();
