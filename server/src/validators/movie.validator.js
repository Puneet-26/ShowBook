const { z } = require('zod');

const movieSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().trim().min(5, 'Description must be at least 5 characters long'),
  genre: z.string().trim().min(2, 'Genre is required'),
  language: z.string().trim().min(2, 'Language is required'),
  durationMins: z.coerce.number().int().positive('Duration must be a positive integer in minutes'),
  releaseDate: z
    .union([z.string(), z.date()])
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Release date must be a valid date',
    })
    .transform((val) => new Date(val)),
  posterUrl: z
    .string()
    .trim()
    .min(1, 'Poster URL is required')
    .refine((val) => {
      try {
        new URL(val);
        return true;
      } catch {
        // Allow relative paths like /images/... or simple web URLs
        return val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://');
      }
    }, 'Poster must be a valid web URL (http/https) or relative path'),
  ageRating: z.string().trim().min(1, 'Age rating is required').default('UA'),
  status: z.enum(['NOW_SHOWING', 'UPCOMING', 'ARCHIVED']).default('NOW_SHOWING'),
});

const updateMovieSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100).optional(),
  description: z.string().trim().min(5, 'Description must be at least 5 characters long').optional(),
  genre: z.string().trim().min(2, 'Genre is required').optional(),
  language: z.string().trim().min(2, 'Language is required').optional(),
  durationMins: z.coerce.number().int().positive('Duration must be a positive integer in minutes').optional(),
  releaseDate: z
    .union([z.string(), z.date()])
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Release date must be a valid date',
    })
    .transform((val) => new Date(val))
    .optional(),
  posterUrl: z
    .string()
    .trim()
    .min(1)
    .refine((val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://');
      }
    }, 'Poster must be a valid web URL (http/https) or relative path')
    .optional(),
  ageRating: z.string().trim().min(1).optional(),
  status: z.enum(['NOW_SHOWING', 'UPCOMING', 'ARCHIVED']).optional(),
});

module.exports = {
  movieSchema,
  updateMovieSchema,
};
