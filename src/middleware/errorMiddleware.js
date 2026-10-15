const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
      error: 'VALIDATION_ERROR',
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource ID',
      error: 'INVALID_ID',
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate record found',
      error: 'DUPLICATE_RECORD',
    });
  }

  const status = err.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    error: err.errorCode || 'SERVER_ERROR',
  });
};

module.exports = { errorHandler };
