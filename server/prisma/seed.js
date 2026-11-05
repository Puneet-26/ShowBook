require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data in reverse order of dependencies
  await prisma.paymentAttempt.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.reservationSeat.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.showSeatAllocation.deleteMany();
  await prisma.show.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.screen.deleteMany();
  await prisma.theatre.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing tables.');

  // 1. Seed Users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@12345', salt);
  const userPasswordHash = await bcrypt.hash('User@12345', salt);

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@showbook.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      name: 'Demo User 1',
      email: 'user@showbook.com',
      passwordHash: userPasswordHash,
      role: 'USER',
    },
  });

  const user2PasswordHash = await bcrypt.hash('User2@12345', salt);
  const demoUser2 = await prisma.user.create({
    data: {
      name: 'Demo User 2',
      email: 'user2@showbook.com',
      passwordHash: user2PasswordHash,
      role: 'USER',
    },
  });

  console.log(`👤 Created users: Admin (${admin.email}), Demo User 1 (${demoUser.email}), Demo User 2 (${demoUser2.email})`);

  // 2. Seed Movies
  const movies = await Promise.all([
    prisma.movie.create({
      data: {
        title: 'Inception',
        description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
        genre: 'Sci-Fi',
        language: 'English',
        durationMins: 148,
        releaseDate: new Date('2024-01-15T00:00:00Z'),
        posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
        ageRating: 'UA',
        status: 'NOW_SHOWING',
      },
    }),
    prisma.movie.create({
      data: {
        title: 'Interstellar',
        description: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft along with a team of researchers.',
        genre: 'Sci-Fi',
        language: 'English',
        durationMins: 169,
        releaseDate: new Date('2024-02-10T00:00:00Z'),
        posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
        ageRating: 'UA',
        status: 'NOW_SHOWING',
      },
    }),
    prisma.movie.create({
      data: {
        title: 'Oppenheimer',
        description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
        genre: 'Biography',
        language: 'English',
        durationMins: 180,
        releaseDate: new Date('2024-03-01T00:00:00Z'),
        posterUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80',
        ageRating: 'A',
        status: 'NOW_SHOWING',
      },
    }),
    prisma.movie.create({
      data: {
        title: 'Dune: Part Two',
        description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
        genre: 'Action',
        language: 'English',
        durationMins: 166,
        releaseDate: new Date('2024-03-15T00:00:00Z'),
        posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        ageRating: 'UA',
        status: 'NOW_SHOWING',
      },
    }),
    prisma.movie.create({
      data: {
        title: 'Kalki 2898 AD',
        description: 'A modern-day avatar of Vishnu, a Hindu god, who is believed to have descended to earth to protect the world from evil forces.',
        genre: 'Action',
        language: 'Hindi',
        durationMins: 181,
        releaseDate: new Date('2024-06-27T00:00:00Z'),
        posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
        ageRating: 'UA',
        status: 'NOW_SHOWING',
      },
    }),
    prisma.movie.create({
      data: {
        title: 'Stree 2',
        description: 'The town of Chanderi is being haunted again, this time by a headless entity named Sarkata that is abducting modern and progressive women.',
        genre: 'Comedy',
        language: 'Hindi',
        durationMins: 147,
        releaseDate: new Date('2024-08-15T00:00:00Z'),
        posterUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80',
        ageRating: 'UA',
        status: 'NOW_SHOWING',
      },
    }),
  ]);

  console.log(`🎬 Seeded ${movies.length} movies.`);

  // 3. Seed Theatres
  const pvr = await prisma.theatre.create({
    data: {
      name: 'PVR ICON: Infiniti Mall',
      location: 'Andheri West',
      address: 'Link Road, Oshiwara, Andheri West',
      city: 'Mumbai',
    },
  });

  const inox = await prisma.theatre.create({
    data: {
      name: 'INOX: Megaplex',
      location: 'Inorbit Mall',
      address: 'New Link Rd, Malad West',
      city: 'Mumbai',
    },
  });

  console.log('🏛️ Seeded Theatres.');

  // 4. Seed Screens & Seats
  const screens = [];
  for (const theatre of [pvr, inox]) {
    for (let s = 1; s <= 2; s++) {
      const screen = await prisma.screen.create({
        data: {
          theatreId: theatre.id,
          screenNumber: `Audi ${s}`,
          name: s === 1 ? 'IMAX Laser 4K' : 'Dolby Atmos Prime',
          totalSeats: 48, // 6 rows x 8 seats
        },
      });
      screens.push(screen);

      // Create Seats for screen: Rows A to F, Seats 1 to 8
      const seatRows = [
        { row: 'A', type: 'REGULAR', multiplier: 1.0 },
        { row: 'B', type: 'REGULAR', multiplier: 1.0 },
        { row: 'C', type: 'PREMIUM', multiplier: 1.4 },
        { row: 'D', type: 'PREMIUM', multiplier: 1.4 },
        { row: 'E', type: 'VIP', multiplier: 1.8 },
        { row: 'F', type: 'VIP', multiplier: 1.8 },
      ];

      const seatInserts = [];
      for (const r of seatRows) {
        for (let num = 1; num <= 8; num++) {
          seatInserts.push({
            screenId: screen.id,
            rowLabel: r.row,
            seatNumber: num,
            seatType: r.type,
            priceMultiplier: r.multiplier,
          });
        }
      }
      await prisma.seat.createMany({ data: seatInserts });
    }
  }

  console.log(`📺 Seeded ${screens.length} screens and their seating layouts.`);

  // 5. Seed Shows for Today and Tomorrow
  const now = new Date();
  const todayShow1 = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  const todayShow2 = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours from now
  const tomorrowShow1 = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow same time
  const tomorrowShow2 = new Date(now.getTime() + 28 * 60 * 60 * 1000); // tomorrow evening

  const showTimes = [
    { start: todayShow1, end: new Date(todayShow1.getTime() + 3 * 3600000) },
    { start: todayShow2, end: new Date(todayShow2.getTime() + 3 * 3600000) },
    { start: tomorrowShow1, end: new Date(tomorrowShow1.getTime() + 3 * 3600000) },
    { start: tomorrowShow2, end: new Date(tomorrowShow2.getTime() + 3 * 3600000) },
  ];

  let totalShowsCreated = 0;
  for (let i = 0; i < screens.length; i++) {
    const screen = screens[i];
    const movie = movies[i % movies.length];
    const screenSeats = await prisma.seat.findMany({ where: { screenId: screen.id } });

    for (let t = 0; t < showTimes.length; t++) {
      const show = await prisma.show.create({
        data: {
          movieId: movie.id,
          screenId: screen.id,
          startTime: showTimes[t].start,
          endTime: showTimes[t].end,
          basePrice: 250,
          status: 'OPEN',
        },
      });
      totalShowsCreated++;

      // Create ShowSeatAllocation records for every seat in this screen
      const allocations = screenSeats.map((seat) => ({
        showId: show.id,
        seatId: seat.id,
        status: 'AVAILABLE',
      }));

      await prisma.showSeatAllocation.createMany({ data: allocations });
    }
  }

  console.log(`🎟️ Seeded ${totalShowsCreated} shows and all seat allocation states.`);
  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
