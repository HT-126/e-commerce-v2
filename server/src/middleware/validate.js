// Usage: router.post('/', validate({ body: createReviewSchema }), controller.create)
// Validated values are put on req.valid, because req.query is read-only in Express 5.
export const validate = (schemas) => (req, res, next) => {
  req.valid = {};
  for (const part of ['body', 'query', 'params']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part]);
    if (!result.success) {
      return res.status(400).json({
        error: {
          message: 'Invalid input',
          code: 'VALIDATION_ERROR',
          details: result.error.issues,
        },
      });
    }
    req.valid[part] = result.data;
  }
  next();
};
