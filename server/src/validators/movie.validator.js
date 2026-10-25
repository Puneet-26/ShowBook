const { z } = require('zod');

const movieSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100),
  description: z.string().trim().min(5, 'Description must be at least 5 characters long'),
  genre: z.string().trim().min(2, 'Genre is required'),
  language: z.string().trim().min(2, 'Language is required'),
  durationMins: z.coerce.number().int().positive('Duration must be a positive integer'),
  releaseDate: z.string().or(z.date()).transform((val) => new Date(val)),
  posterUrl: z.string().url('Poster must be a valid URL'),
  ageRating: z.string().trim().min(1, 'Age rating is required'),
  status: z.enum(['NOW_SHOWING', 'UPCOMING', 'ARCHIVED']).default('NOW_SHOWING'),
});

const updateMovieSchema = movieSchema.partial();

module.exports = {
  movieSchema,
  updateMovieSchema,
};
