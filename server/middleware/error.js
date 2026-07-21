// Global error handler → { data, error, meta } envelope (mirrors AllExceptionsFilter).
module.exports = function errorHandler(err, req, res, _next) {
  const status = err && err.status ? err.status : 500;
  let error;
  if (status >= 500) {
    console.error(err);
    error = { code: status, message: 'Internal server error' };
  } else {
    error = { code: status, message: err.message, details: err.details };
  }
  res.status(status).json({ data: null, error, meta: null });
};
