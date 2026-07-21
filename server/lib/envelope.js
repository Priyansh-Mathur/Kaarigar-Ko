// Standard response envelope { data, error, meta } + HTTP error helpers
// (mirrors src/common/http/envelope.ts + the NestJS HttpExceptions).

function ok(data, meta = null) {
  return { data, error: null, meta };
}

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const BadRequest = (m, d) => new HttpError(400, m || 'Bad request', d);
const Unauthorized = (m) => new HttpError(401, m || 'Unauthorized');
const Forbidden = (m) => new HttpError(403, m || 'Forbidden');
const NotFound = (m) => new HttpError(404, m || 'Not found');
const Conflict = (m) => new HttpError(409, m || 'Conflict');

module.exports = { ok, HttpError, BadRequest, Unauthorized, Forbidden, NotFound, Conflict };
