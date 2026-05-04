const { AppError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (err.isOperational) {
    // Operational, trusted error: send message to client
    res.status(err.statusCode).json({
      status: err.status,
      error: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      error: 'Something went very wrong!'
    });
  }
};

module.exports = errorHandler;
