class AppError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorHandler(err, req, res, next) {
  // Log unexpected errors
  if (!err.isOperational && process.env.NODE_ENV !== 'test') {
    console.error('Unhandled Error:', err);
  }

  // Handle known operational AppError
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Handle Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    const target = err.meta?.target ? err.meta.target.join(', ') : 'field';
    return res.status(409).json({
      success: false,
      error: `A record with this ${target} already exists.`,
    });
  }

  // Handle Prisma not found error (P2025)
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Requested record was not found.',
    });
  }

  // Fallback for internal errors
  const isDev = process.env.NODE_ENV === 'development';
  return res.status(500).json({
    success: false,
    error: 'Internal server error. Please try again later.',
    ...(isDev ? { stack: err.stack, rawMessage: err.message } : {}),
  });
}

module.exports = {
  AppError,
  errorHandler,
};
