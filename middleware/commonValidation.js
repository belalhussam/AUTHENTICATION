const validator = (schema) => {
  return (req, res, next) => {
    const validationResult = schema.body.validate(req.body);
    const validation = [];
    if (validationResult.error) {
      validation.push(validationResult.error.details[0].message);
    }

    if (validation.length) {
      return res.status(400).json({ message: validation.join() });
    }
    next();
  };
};
module.exports = validator;
