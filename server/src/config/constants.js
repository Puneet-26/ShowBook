require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_showbook_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  RESERVATION_EXPIRY_MINUTES: parseInt(process.env.RESERVATION_EXPIRY_MINUTES || '5', 10),
  CANCELLATION_DEADLINE_HOURS: parseInt(process.env.CANCELLATION_DEADLINE_HOURS || '2', 10),
};
