import Joi from 'joi';
import AppError from '../utils/AppError.js';

/**
 * Middleware generator to validate request fields using Joi schemas
 * @param {Object} schema - Joi validation schema containing keys like 'body', 'query', 'params'
 */
const validate = (schema) => (req, res, next) => {
  const validKeys = ['body', 'query', 'params'];
  
  const object = validKeys.reduce((obj, key) => {
    if (schema[key]) {
      obj[key] = req[key];
    }
    return obj;
  }, {});

  const { value, error } = Joi.compile(schema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new AppError(errorMessage, 400));
  }

  Object.assign(req, value);
  return next();
};

export default validate;
