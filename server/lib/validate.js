// Zod validation (mirrors src/common/pipes/zod-validation.pipe.ts).
// Throws a 400 with { message: 'Validation failed', details: [{path, message}] }.
const { HttpError } = require('./envelope');

function validate(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError(
      400,
      'Validation failed',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return result.data;
}

module.exports = { validate };
