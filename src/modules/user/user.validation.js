import Joi from 'joi';

export const updateProfile = {
  body: Joi.object().keys({
    name: Joi.string().max(100),
    gender: Joi.string().valid('Male', 'Female', 'Other'),
    dob: Joi.date(),
    zodiac: Joi.string().max(100),
    occupation: Joi.string().max(200),
    isStudent: Joi.string().valid('Yes', 'No'),
    college: Joi.string().allow('', null).max(200),
    location: Joi.string().max(200),
    height: Joi.string().max(20),
    weight: Joi.string().max(20),
    heightUnit: Joi.string().valid('ft', 'cm'),
    weightUnit: Joi.string().valid('kg', 'lbs'),
    music: Joi.string().max(200),
    movies: Joi.string().max(200),
    date: Joi.string().max(500),
    food: Joi.string().max(200),
    relationshipType: Joi.string().valid('Long-term', 'Short-term', 'Friendship', 'Still exploring'),
    photos: Joi.array().items(Joi.string().uri()),
    bio: Joi.string().allow('', null).max(1000),
    isProfileComplete: Joi.boolean(),
  }),
};

