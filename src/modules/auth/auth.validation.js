import Joi from 'joi';

export const register = {
  body: Joi.object().keys({
    name: Joi.string().required().max(100),
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6).max(200),
  }),
};

export const login = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

export const googleAuth = {
  body: Joi.object().keys({
    idToken: Joi.string().required(),
  }),
};

export const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
  }),
};

export const verifyOtp = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    otp: Joi.string().required().length(6).message('OTP must be a 6-digit number'),
  }),
};

export const resetPassword = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6).max(200),
  }),
};

export const refresh = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};
