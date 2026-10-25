const { z } = require('zod');

const createShowSchema = z.object({
  movieId: z.string().uuid('Invalid movie ID'),
  screenId: z.string().uuid('Invalid screen ID'),
  startTime: z.string().or(z.date()).transform((val) => new Date(val)),
  endTime: z.string().or(z.date()).transform((val) => new Date(val)),
  basePrice: z.coerce.number().positive('Base price must be greater than 0'),
}).refine((data) => data.endTime > data.startTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

const updateShowStatusSchema = z.object({
  status: z.enum(['OPEN', 'CANCELLED', 'COMPLETED']),
});

module.exports = {
  createShowSchema,
  updateShowStatusSchema,
};
